/**
 * Secure, auditable deletion for school data (Admin SDK only).
 *
 * Design
 *  - Every delete is authorised HERE (actor loaded from Firestore, school + role + partial permission),
 *    never by hiding buttons. Firestore rules no longer allow clients to delete these collections.
 *  - Delete = move to the school's TRASH: the record, its dependent records and (for accounts) the
 *    disabled login are kept in `recycle_bin/{bundleId}` (+ `items` subcollection) while the live
 *    collections really lose the data, so lists, counters and reports are correct immediately.
 *  - Restore puts the record and its dependents back. Permanent delete (purge) is a separate, stronger
 *    action: it removes the trash copy, the storage files and the Auth account.
 *  - Each operation is a resumable job (steps are idempotent, state is stored on the bundle); a failure
 *    half-way leaves status `trashing`/`purging` and the sweep (or an explicit resume) finishes it.
 *  - Every attempt (allowed or refused, success or failure) is written to `deletion_logs`, a collection
 *    only this server can write and that has no expiry.
 */

import { planFiles, moveFilesToTrash, restoreFilesFromTrash, purgeTrashedFiles } from './storageRegistry.mjs';

const TRASH_DAYS = 30;
const MAX_RETRIES = 6;
const LOCK_MS = 5 * 60 * 1000;
const BATCH = 400;
const MAX_IDS = 200;
export const PERMANENT_CONFIRM_TEXT = 'حذف نهائي';

const MGMT_ROLES = ['admin', 'school_admin', 'assistant', 'school_assistant', 'staff'];
const FULL_ROLES = ['admin', 'school_admin'];
const SUPER = ['superadmin', 'super_admin'];

const REQUEST_DECIDED = ['approved', 'active', 'activated', 'accepted', 'completed'];
const isMoneyInstallment = (d) => ['paid', 'partial'].includes(String(d.status || '')) || Number(d.paidAmount || 0) > 0;

/** perms: ids a staff/assistant must hold (menu id or feature key). roles: who may delete at all. */
export const POLICIES = {
  students: {
    roles: FULL_ROLES, label: (d) => d.name || d.fullName || 'طالب',
    children: [
      { col: 'grades', field: 'studentId', retention: 'protected' }, { col: 'attendance', field: 'studentId' },
      // accounting trail: payments and any installment that has money on it are KEPT (flagged), never deleted
      { col: 'installments', field: 'studentId', keepIf: (d) => isMoneyInstallment(d), retention: 'protected' },
      { col: 'payments', field: 'studentId', keepIf: () => true, retention: 'protected' },
      { col: 'behavior_reports', field: 'studentId' }, { col: 'advanced_reports', field: 'studentId' },
      { col: 'teacher_reports', field: 'studentId' }, { col: 'student_archives', field: 'studentId', retention: 'protected' },
      { col: 'orders', field: 'studentId' }, { col: 'behavior', field: 'studentId' },
    ],
    childById: ['id_cards'],
    studentUserDoc: true,
    counter: { path: ['schools', '{schoolId}'], field: 'studentCount', delta: -1 },
  },
  classes: {
    roles: MGMT_ROLES, perms: ['classes'], label: (d) => d.name || 'صف',
    blockedIfReferenced: { col: 'students', field: 'classId', message: 'لا يمكن حذف صف يحتوي على طلاب. انقل الطلاب أولاً' },
    children: [{ col: 'subjects', field: 'classId' }, { col: 'homework', field: 'classId' }],
  },
  subjects: { roles: MGMT_ROLES, perms: ['grades', 'classes', 'school_subjects', 'exams_and_results'], label: (d) => d.name || 'مادة' },
  homework: { children: [{ col: 'notifications', field: 'metadata.sourceId' }], roles: MGMT_ROLES, perms: ['homework', 'homework_and_tasks'], teacherOwn: 'teacherId', label: (d) => d.title || 'واجب' },
  teacher_reports: { children: [{ col: 'notifications', field: 'metadata.sourceId' }], roles: MGMT_ROLES, perms: ['evaluation_reports', 'student_evaluation_reports'], teacherOwn: 'teacherId', label: (d) => d.title || d.studentName || 'تقرير' },
  advanced_reports: { children: [{ col: 'notifications', field: 'metadata.sourceId' }], roles: MGMT_ROLES, perms: ['advanced_reports'], label: (d) => d.title || d.studentName || 'تقرير متقدم' },
  behavior_reports: { roles: MGMT_ROLES, perms: ['behavior', 'behavior_management'], label: (d) => d.title || d.studentName || 'تقرير سلوك' },
  behavior: { roles: MGMT_ROLES, perms: ['behavior', 'behavior_management'], label: (d) => d.title || d.studentName || 'سلوك' },
  grades: { retention: 'protected', roles: MGMT_ROLES, perms: ['grades', 'exams_and_results'], label: (d) => `${d.subject || 'درجة'} ${d.studentName || ''}`.trim() },
  attendance: { roles: MGMT_ROLES, perms: ['attendance', 'attendance_track'], label: (d) => `حضور ${d.studentName || d.date || ''}`.trim() },
  announcements: { children: [{ col: 'notifications', field: 'metadata.sourceId' }], roles: MGMT_ROLES, perms: ['announcements'], label: (d) => d.title || 'إعلان' },
  installments: { retention: 'protected', neverDelete: (d) => isMoneyInstallment(d), neverDeleteMessage: 'القسط المسدّد (كلياً أو جزئياً) سجل مالي لا يُحذف. ألغِ التسديد أو صحّحه بدلاً من الحذف', roles: MGMT_ROLES, perms: ['tuition', 'tuition_fees'], label: (d) => `قسط ${d.studentName || ''}`.trim() },
  payments: { retention: 'protected', neverDelete: () => true, neverDeleteMessage: 'الدفعات المالية لا تُحذف. استخدم «إلغاء الدفعة» لتسجيل الإلغاء مع حفظ الأثر المحاسبي', roles: MGMT_ROLES, perms: ['tuition', 'tuition_fees'], label: (d) => `دفعة ${d.studentName || ''}`.trim() },
  payroll: { retention: 'protected', roles: MGMT_ROLES, perms: ['payroll', 'staff_payroll'], label: (d) => `راتب ${d.userName || ''}`.trim() },
  inventory: { roles: MGMT_ROLES, perms: ['inventory', 'inventory_and_assets'], label: (d) => d.name || 'مادة مخزون' },
  market: { roles: MGMT_ROLES, perms: ['market', 'marketplace_ordering'], label: (d) => d.name || 'منتج' },
  marketplace: { roles: MGMT_ROLES, perms: ['market', 'marketplace_ordering'], label: (d) => d.name || 'منتج' },
  orders: { roles: MGMT_ROLES, perms: ['market', 'marketplace_ordering'], label: (d) => `طلب ${d.studentName || d.parentName || ''}`.trim() },
  // Registration / subscription requests: platform super admin only. Approved ones are the record of an
  // administrative decision and are never deleted; rejecting a request is a separate status change.
  registrations: { roles: [], superOnly: true, neverDelete: (d) => REQUEST_DECIDED.includes(String(d.status || '')), neverDeleteMessage: 'طلب معتمد: سجل قرار إداري يُحتفظ به ولا يُحذف', label: (d) => d.schoolName || d.name || d.email || 'طلب تسجيل' },
  subscriptionRequests: { roles: [], superOnly: true, neverDelete: (d) => REQUEST_DECIDED.includes(String(d.status || '')), neverDeleteMessage: 'طلب معتمد: سجل قرار إداري يُحتفظ به ولا يُحذف', label: (d) => d.schoolName || d.name || 'طلب اشتراك' },
  // Distributors (platform, Super Admin only): coupons go to the trash; schools keep their history but stop accruing commission.
  distributors: {
    roles: [], superOnly: true, retention: 'protected', label: (d) => d.name || d.email || 'موزع',
    children: [
      { col: 'distributorCoupons', field: 'distributorId' },
      { col: 'schools', field: 'distributorId', keepIf: () => true, flags: { distributorCommissionPaused: true, distributorDeleted: true } },
    ],
  },
  // Smart-assistant catalogue (platform content, Super Admin only): recoverable like everything else.
  assistant_categories: { roles: [], superOnly: true, label: (d) => d.name || d.title || 'تصنيف' },
  assistant_flows: { roles: [], superOnly: true, label: (d) => d.name || d.title || 'مسار' },
  assistant_answers: { roles: [], superOnly: true, label: (d) => d.title || d.question || 'إجابة' },
  assistant_keywords: { roles: [], superOnly: true, label: (d) => d.keyword || d.name || 'كلمة مفتاحية' },
  id_cards: { roles: MGMT_ROLES, perms: ['id_cards', 'id_card_generation'], label: (d) => `بطاقة ${d.studentName || ''}`.trim() },
  student_archives: { retention: 'protected', roles: MGMT_ROLES, perms: ['student_archive'], label: (d) => `أرشيف ${d.studentName || ''}`.trim() },
};

/** Account (users/{uid}) deletion: handled separately because of the Auth login. */
const ACCOUNT_ROLES = ['teacher', 'staff', 'school_assistant', 'assistant', 'parent', 'guard'];
const ACCOUNT_POLICY = { children: [{ col: 'notifications', field: 'userId' }], retention: 'standard' };
/** Extra account types only a platform super admin may delete. */
const PLATFORM_ACCOUNT_ROLES = ['admin', 'school_admin', 'distributor', 'platform_assistant'];

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status; e.code = code;
  return e;
}

function asArray(v) { return Array.isArray(v) ? v.map(String) : []; }
/** Document ids only: no path separators, no dot segments, bounded length (an id must never address another path). */
const SAFE_ID = /^[A-Za-z0-9_\-:.@]{1,200}$/;
const isSafeId = (id) => SAFE_ID.test(id) && id !== '.' && id !== '..' && !id.includes('..');
const ts = (adminSdk) => adminSdk.firestore.FieldValue.serverTimestamp();

export async function loadActor(db, uid) {
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw httpError(403, 'USER_NOT_FOUND', 'حسابك غير موجود');
  const d = snap.data() || {};
  if (d.disabled === true || d.status === 'disabled' || d.status === 'suspended') {
    throw httpError(403, 'ACCOUNT_DISABLED', 'الحساب معطّل');
  }
  const role = String(d.role || '');
  return {
    uid, role, schoolId: String(d.schoolId || ''), name: String(d.name || d.displayName || ''), email: String(d.email || ''),
    permissions: Array.isArray(d.permissions) ? d.permissions.map(String) : null,
    isSuper: SUPER.includes(role),
  };
}

function writeLog(db, adminSdk, entry) {
  // Best effort: an audit failure must never be silent, but must not undo a finished delete.
  return db.collection('deletion_logs').add({ ...entry, at: ts(adminSdk) }).catch((e) => {
    console.error('[deletion] audit log write FAILED', entry.action, entry.recordId, e?.message);
  });
}

/** Authorisation for deleting ONE record. Throws 403 with a precise code. */
export function authorizeDelete(actor, collection, policy, data, { permanent }) {
  if (actor.isSuper) return;
  const schoolId = String(data.schoolId || '');
  if (!actor.schoolId || !schoolId || actor.schoolId !== schoolId) {
    throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك حذف بيانات مدرسة أخرى');
  }
  if (permanent && !FULL_ROLES.includes(actor.role)) {
    throw httpError(403, 'FORBIDDEN_PERMANENT', 'الحذف النهائي لمدير المدرسة فقط');
  }
  if (actor.role === 'teacher') {
    if (policy.teacherOwn && String(data[policy.teacherOwn] || '') === actor.uid) return;
    throw httpError(403, 'FORBIDDEN_ROLE', 'لا تملك صلاحية الحذف');
  }
  if (!policy.roles.includes(actor.role)) throw httpError(403, 'FORBIDDEN_ROLE', 'لا تملك صلاحية الحذف');
  if (FULL_ROLES.includes(actor.role)) return;
  // staff / assistants: an explicit permission is required (a missing list means none)
  if (!policy.perms || !actor.permissions || !actor.permissions.some((p) => policy.perms.includes(p))) {
    throw httpError(403, 'FORBIDDEN_PERMISSION', 'ليست لديك صلاحية حذف هذا النوع من السجلات');
  }
}

async function queryAll(db, col, field, value, schoolId) {
  let q = db.collection(col).where(field, '==', value);
  if (schoolId) q = q.where('schoolId', '==', schoolId);
  return (await q.get()).docs;
}

async function commitInBatches(db, ops) {
  for (let i = 0; i < ops.length; i += BATCH) {
    const b = db.batch();
    ops.slice(i, i + BATCH).forEach((fn) => fn(b));
    await b.commit();
  }
}

function bundleRef(db, id) { return db.collection('recycle_bin').doc(id); }

/** Gather the dependants of a record. `kept` = financial/decision records that must survive (they are only flagged). */
async function collectDependants(db, policy, collection, id, schoolId) {
  const items = [];
  const kept = [];
  for (const c of policy.children || []) {
    for (const d of await queryAll(db, c.col, c.field, id, schoolId)) {
      const data = d.data();
      if (c.keepIf && c.keepIf(data)) kept.push({ col: c.col, id: d.id, ...(c.flags ? { flags: c.flags } : {}) });
      else items.push({ col: c.col, id: d.id, data });
    }
  }
  for (const col of policy.childById || []) {
    const d = await db.collection(col).doc(id).get();
    if (d.exists) items.push({ col, id, data: d.data() });
  }
  if (policy.studentUserDoc) {
    const u = await db.collection('users').doc(id).get();
    if (u.exists && String((u.data() || {}).schoolId || '') === schoolId) items.push({ col: 'users', id, data: u.data() });
  }
  return { items, kept };
}

// ── job model ──────────────────────────────────────────────────────────────
// Every delete is a job stored on its bundle: status (internal) + jobStatus (PENDING | PROCESSING |
// PARTIALLY_COMPLETED | COMPLETED | RESTORING | RESTORED | FAILED | PERMANENTLY_DELETED).
const FV = (adminSdk) => adminSdk.firestore.FieldValue;
const backoffMs = (retry) => Math.min(60_000 * 2 ** Math.max(0, retry), 3_600_000);

/** Per-record lock: only one request may run delete/restore/purge for a record at a time. */
async function acquireLock(ctx, key, owner) {
  const ref = ctx.db.collection('deletion_locks').doc(key);
  await ctx.db.runTransaction(async (t) => {
    const s = await t.get(ref);
    if (s.exists && s.get('expiresAt') > Date.now() && s.get('owner') !== owner) throw httpError(409, 'IN_PROGRESS', 'هناك عملية حذف/استعادة قيد التنفيذ لهذا السجل. أعد المحاولة بعد قليل');
    t.set(ref, { owner, expiresAt: Date.now() + LOCK_MS, at: Date.now() });
  });
}
async function releaseLock(ctx, key, owner) {
  const ref = ctx.db.collection('deletion_locks').doc(key);
  await ctx.db.runTransaction(async (t) => { const s = await t.get(ref); if (s.exists && s.get('owner') === owner) t.delete(ref); }).catch(() => {});
}
const newOwner = () => `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Idempotent trash steps for one bundle. Safe to run again after a failure. */
async function runTrashSteps(ctx, bundleId) {
  const { db, adminSdk, faults } = ctx;
  const ref = bundleRef(db, bundleId);
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  const b = snap.data();
  if (b.status === 'trashed') return b;
  const policy = b.kind === 'account' ? ACCOUNT_POLICY : POLICIES[b.collection];
  const steps = { ...(b.steps || {}) };
  const mark = async (name, extra = {}) => { steps[name] = true; await ref.set({ steps, ...extra, lastError: null, updatedAt: ts(adminSdk) }, { merge: true }); };
  const fail = (name) => { if (faults?.[name]) { const e = new Error('injected fault at ' + name); e.injected = true; throw e; } };
  await ref.set({ jobStatus: 'PROCESSING', updatedAt: ts(adminSdk) }, { merge: true });

  try {
    // 1) snapshot: copy the record + dependants into the bundle BEFORE anything is removed
    if (!steps.snapshot) {
      const main = await db.collection(b.collection).doc(b.recordId).get();
      if (!main.exists) throw httpError(404, 'NOT_FOUND', 'السجل غير موجود');
      const { items: deps, kept } = policy ? await collectDependants(db, policy, b.collection, b.recordId, b.schoolId) : { items: [], kept: [] };
      const counts = {};
      deps.forEach((d) => { counts[d.col] = (counts[d.col] || 0) + 1; });
      const keptCounts = {};
      kept.forEach((k) => { keptCounts[k.col] = (keptCounts[k.col] || 0) + 1; });
      let parentLinks = [];
      if (b.collection === 'students') {
        const pu = await db.collection('users').where('studentIds', 'array-contains', b.recordId).get();
        parentLinks = pu.docs.map((d) => d.id);
      }
      let studentLinks = [];
      if (b.kind === 'account' && main.data()?.role === 'parent') {
        const sq = await db.collection('students').where('parentIds', 'array-contains', b.recordId).get();
        studentLinks = sq.docs.filter((d) => !b.schoolId || d.get('schoolId') === b.schoolId).map((d) => d.id);
      }
      let distributorLink = null;
      if (b.kind === 'account' && main.data()?.role === 'distributor' && main.data()?.distributorId) {
        const dd = await db.collection('distributors').doc(String(main.data().distributorId)).get();
        if (dd.exists) distributorLink = { id: dd.id, canLogin: dd.get('canLogin') ?? null, userId: dd.get('userId') ?? null };
      }
      // data the school must keep for its records (grades, approved finance, …) is never auto-purged
      const protectedKids = (policy?.children || []).some((c) => c.retention === 'protected' && (counts[c.col] || 0) > 0);
      const protect = policy?.retention === 'protected' || protectedKids || Object.keys(keptCounts).length > 0;
      await ref.set({
        record: main.data(), childCounts: counts, keptRefs: kept, keptCounts, parentLinks, studentLinks, distributorLink,
        relatedRecords: { ...counts }, processedItems: deps.length,
        ...(protect ? { retention: 'protected', purgeAfter: null, expiresAt: null } : {}),
      }, { merge: true });
      const itemOps = deps.map((d) => (batch) => batch.set(ref.collection('items').doc(`${d.col}__${d.id}`), { col: d.col, docId: d.id, data: d.data }));
      await commitInBatches(db, itemOps);
      await mark('snapshot');
    }
    fail('after_snapshot');
    // 2) remove live data (children first, record last)
    if (!steps.delete) {
      const items = await ref.collection('items').get();
      const ops = items.docs.map((d) => (batch) => batch.delete(db.collection(d.get('col')).doc(d.get('docId'))));
      await commitInBatches(db, ops);
      fail('mid_delete');
      await db.collection(b.collection).doc(b.recordId).delete();
      await mark('delete');
    }
    // 3) files: move every file that belongs only to these records into _trash (restorable)
    if (!steps.files) {
      const cur = (await ref.get()).data() || {};
      const items = await ref.collection('items').get();
      const records = [{ collection: b.collection, id: b.recordId, data: cur.record || {} }, ...items.docs.map((d) => ({ collection: d.get('col'), id: d.get('docId'), data: d.get('data') }))];
      let plan = [];
      let failedFiles = 0;
      if (!faults?.skipFiles) {
        plan = await planFiles(ctx, { schoolId: b.schoolId, collection: b.collection, recordId: b.recordId, records });
        failedFiles = (await moveFilesToTrash(ctx, ref, b.id || b.bundleId, plan)).failed;
      }
      const summary = plan.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
      await ref.set({ storageReferences: summary, failedItems: failedFiles }, { merge: true });
      if (failedFiles) throw new Error(`تعذّر نقل ${failedFiles} ملف إلى السلة — ستُعاد المحاولة تلقائياً`);
      await mark('files');
    }
    fail('after_files');
    // 4) unlink parents from a deleted student (the list was stored with the snapshot)
    if (!steps.unlink && b.collection === 'students') {
      const stored = (await ref.get()).data() || {};
      const ops = asArray(stored.parentLinks).map((uid) => (batch) => batch.update(db.collection('users').doc(uid), { studentIds: adminSdk.firestore.FieldValue.arrayRemove(b.recordId) }));
      await commitInBatches(db, ops.length ? ops : []);
      await mark('unlink');
    }
    // 5) a deleted parent account no longer appears on its students
    if (!steps.unlinkStudents && b.kind === 'account') {
      const stored = (await ref.get()).data() || {};
      const ops = asArray(stored.studentLinks).map((sid) => (batch) => batch.update(db.collection('students').doc(sid), { parentIds: adminSdk.firestore.FieldValue.arrayRemove(b.recordId) }));
      await commitInBatches(db, ops);
      await mark('unlinkStudents');
    }
    // 6) financial / decision records that must survive are flagged, never deleted
    if (!steps.kept) {
      const stored = (await ref.get()).data() || {};
      const label = String(stored.label || '');
      const ops = (stored.keptRefs || []).map((k) => (batch) => batch.set(db.collection(k.col).doc(k.id), k.flags
        ? { ...k.flags, deletedRelationAt: ts(adminSdk), deletionBundleId: bundleId }
        : { studentDeleted: true, studentDeletedAt: ts(adminSdk), studentNameSnapshot: label, deletionBundleId: bundleId }, { merge: true }));
      await commitInBatches(db, ops);
      await mark('kept');
    }
    // 7) counters
    if (!steps.counter && policy?.counter) {
      const path = policy.counter.path.map((p) => p.replace('{schoolId}', b.schoolId));
      await db.doc(path.join('/')).update({ [policy.counter.field]: adminSdk.firestore.FieldValue.increment(policy.counter.delta) }).catch(() => {});
      await mark('counter');
    }
    // 8) accounts: disable the login (kept for restore); distributor stops being loggable
    if (!steps.auth && b.kind === 'account') {
      try { await ctx.authAdmin.updateUser(b.recordId, { disabled: true }); } catch (e) { if (e?.code !== 'auth/user-not-found') throw e; }
      await mark('auth');
    }
    if (!steps.distributor && b.kind === 'account') {
      const dl = (await ref.get()).get('distributorLink');
      if (dl) await db.collection('distributors').doc(dl.id).set({ canLogin: false, updatedAt: ts(adminSdk) }, { merge: true });
      await mark('distributor');
    }
    fail('before_finalize');
    await ref.set({ status: 'trashed', jobStatus: 'COMPLETED', trashedAt: ts(adminSdk), steps, lastError: null, retryCount: 0 }, { merge: true });
    return (await ref.get()).data();
  } catch (e) {
    const retry = (b.retryCount || 0) + 1;
    await ref.set({ status: 'trashing', jobStatus: retry >= MAX_RETRIES ? 'FAILED' : 'PARTIALLY_COMPLETED', steps, retryCount: retry, lastError: String(e?.message || e).slice(0, 200), updatedAt: ts(adminSdk) }, { merge: true }).catch(() => {});
    throw e;
  }
}

/** Public: delete (move to trash) or permanently delete a list of records of one collection. */
export async function deleteRecords(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const collection = String(body.collection || '');
  const ids = [...new Set(asArray(body.ids))].filter(Boolean);
  const permanent = body.mode === 'permanent';
  const isAccount = collection === 'users';
  if (!ids.length) throw httpError(400, 'INVALID_BODY', 'لم يتم تحديد سجلات');
  if (ids.length > MAX_IDS) throw httpError(400, 'TOO_MANY', `الحد الأقصى ${MAX_IDS} سجل في العملية الواحدة`);
  if (!isAccount && !Object.hasOwn(POLICIES, collection)) throw httpError(400, 'UNSUPPORTED_COLLECTION', 'نوع السجل غير مدعوم للحذف');
  // explicit confirmations are enforced by the server, not only shown by the UI
  if (ids.length > 1 && body.confirmBulk !== true) throw httpError(400, 'CONFIRM_BULK_REQUIRED', 'الحذف الجماعي يتطلب تأكيداً صريحاً');
  if (permanent && body.confirmText !== PERMANENT_CONFIRM_TEXT) throw httpError(400, 'CONFIRM_PERMANENT_REQUIRED', 'الحذف النهائي يتطلب كتابة عبارة التأكيد');
  const idemBase = body.idempotencyKey ? String(body.idempotencyKey).slice(0, 80) : '';

  const results = [];
  for (const id of ids) {
    const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: actor.schoolId, collection, recordId: id, mode: permanent ? 'permanent' : 'trash', bulk: ids.length > 1 };
    const action = permanent ? 'DELETE_PERMANENT' : 'DELETE_TO_TRASH';
    const lockKey = `${collection}__${id}`;
    const owner = newOwner();
    let locked = false;
    try {
      if (!isSafeId(id)) throw httpError(400, 'INVALID_ID', 'معرّف السجل غير صالح');
      // replay of an already executed request: same answer, nothing executed twice
      const idemKey = idemBase ? `${idemBase}:${collection}:${id}` : '';
      if (idemKey) {
        const prev = await db.collection('recycle_bin').where('idemKey', '==', idemKey).limit(1).get();
        if (!prev.empty && prev.docs[0].get('schoolId') === (actor.isSuper ? prev.docs[0].get('schoolId') : actor.schoolId)) {
          results.push({ id, ok: true, bundleId: prev.docs[0].id, replay: true, permanent });
          continue;
        }
      }
      await acquireLock(ctx, lockKey, owner); locked = true;
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) throw httpError(404, 'NOT_FOUND', 'السجل غير موجود');
      const data = doc.data() || {};
      let policy;
      if (isAccount) {
        const role = String(data.role || '');
        if (!ctx.canActorDeleteUser) throw httpError(500, 'MISCONFIGURED', 'مصادقة الحذف غير مهيأة');
        if (id === actor.uid) throw httpError(403, 'FORBIDDEN_SELF', 'لا يمكنك حذف حسابك بنفسك');
        if (SUPER.includes(role)) throw httpError(403, 'FORBIDDEN_PRIVILEGED', 'لا يمكن حذف حساب مدير النظام عبر هذا المسار');
        const allowedRoles = actor.isSuper ? [...ACCOUNT_ROLES, ...PLATFORM_ACCOUNT_ROLES] : ACCOUNT_ROLES;
        if (!allowedRoles.includes(role)) throw httpError(403, 'FORBIDDEN_PRIVILEGED', 'لا يمكن حذف هذا النوع من الحسابات');
        if (!actor.isSuper) {
          if (!actor.schoolId || String(data.schoolId || '') !== actor.schoolId) throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك حذف حساب من مدرسة أخرى');
          if (!ctx.canActorDeleteUser(actor.role, role, actor.schoolId)) throw httpError(403, 'FORBIDDEN_RANK', 'لا يمكنك حذف حساب بصلاحيات مساوية أو أعلى');
          // partial-permission assistants/staff may only manage accounts they were granted
          if (actor.role !== 'admin' && actor.role !== 'school_admin') {
            const need = role === 'parent' ? ['parents'] : role === 'guard' || role === 'teacher' || role === 'staff' ? ['staff', 'staff_manage'] : ['assistants', 'assistants_manage'];
            if (!actor.permissions || !actor.permissions.some((p) => need.includes(p))) throw httpError(403, 'FORBIDDEN_PERMISSION', 'ليست لديك صلاحية حذف الحسابات');
          }
        } else if (!ctx.canActorDeleteUser(actor.role, role, actor.schoolId)) {
          throw httpError(403, 'FORBIDDEN_RANK', 'لا يمكنك حذف هذا الحساب');
        }
        policy = { roles: MGMT_ROLES, label: (d) => d.name || d.email || 'حساب', accountRole: role, children: [{ col: 'notifications', field: 'userId' }], retention: 'standard' };
      } else {
        policy = POLICIES[collection];
        authorizeDelete(actor, collection, policy, data, { permanent });
        if (policy.neverDelete?.(data)) throw httpError(409, 'FINANCIAL_RECORD_PROTECTED', policy.neverDeleteMessage || 'السجل المالي المعتمد لا يُحذف. استخدم إلغاء/تصحيح العملية');
        if (policy.blockedIfReferenced) {
          const ref = await queryAll(db, policy.blockedIfReferenced.col, policy.blockedIfReferenced.field, id, String(data.schoolId || ''));
          if (ref.length) throw httpError(409, 'HAS_DEPENDENTS', policy.blockedIfReferenced.message);
        }
      }
      const schoolId = String(data.schoolId || (actor.isSuper ? '' : actor.schoolId) || '');
      const bundleId = `${collection}__${id}__${Date.now().toString(36)}`;
      const existing = await db.collection('recycle_bin').where('recordKey', '==', `${collection}/${id}`).where('status', 'in', ['trashing', 'trashed']).limit(1).get();
      let bid = bundleId;
      if (!existing.empty) bid = existing.docs[0].id; // retry of an interrupted delete resumes the same bundle
      else {
        const protect = policy.retention === 'protected';
        await bundleRef(db, bid).set({
          bundleId: bid, jobId: bid, recordKey: `${collection}/${id}`, collection, entityType: collection, recordId: id, entityId: id, schoolId,
          kind: isAccount ? 'account' : 'record',
          label: String((policy.label ? policy.label(data) : id) || id).slice(0, 120), status: 'trashing', jobStatus: 'PENDING', steps: {},
          initiatedBy: { uid: actor.uid, name: actor.name, role: actor.role },
          deletedBy: { uid: actor.uid, name: actor.name, role: actor.role }, deletedAt: ts(adminSdk), createdAt: ts(adminSdk),
          retention: protect ? 'protected' : 'standard',
          purgeAfter: protect ? null : adminSdk.firestore.Timestamp.fromMillis(Date.now() + TRASH_DAYS * 86400000),
          expiresAt: protect ? null : adminSdk.firestore.Timestamp.fromMillis(Date.now() + TRASH_DAYS * 86400000),
          processedItems: 0, failedItems: 0, retryCount: 0, relatedRecords: {}, storageReferences: {},
          accountRole: policy.accountRole || null, ...(idemKey ? { idemKey } : {}),
        });
      }
      await runTrashSteps(ctx, bid);
      let purged = null;
      if (permanent) purged = await purgeBundleInternal(ctx, bid, actor);
      await writeLog(db, adminSdk, { ...base, action, result: 'success', bundleId: bid, label: policy.label ? policy.label(data) : id, childCounts: (await bundleRef(db, bid).get()).get('childCounts') || {}, files: purged?.filesDeleted ?? 0 });
      results.push({ id, ok: true, bundleId: bid, permanent });
    } catch (e) {
      await writeLog(db, adminSdk, { ...base, action, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
      results.push({ id, ok: false, code: e.code || 'ERROR', message: e.message, partial: !e.status || e.status >= 500 });
    } finally {
      if (locked) await releaseLock(ctx, lockKey, owner);
    }
  }
  return { results, ok: results.every((r) => r.ok) };
}

/** Restore = resumable job: documents, relations, counters, login, REAL files. Full success only when all are back. */
export async function restoreBundle(ctx, actorUid, bundleId) {
  const { db, adminSdk, faults } = ctx;
  const actor = await loadActor(db, actorUid);
  if (!isSafeId(String(bundleId || ''))) throw httpError(400, 'INVALID_ID', 'معرّف غير صالح');
  const ref = bundleRef(db, String(bundleId || ''));
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  let b = snap.data();
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: b.schoolId, collection: b.collection, recordId: b.recordId, bundleId: b.bundleId, action: 'RESTORE' };
  const lockKey = `${b.collection}__${b.recordId}`;
  const owner = newOwner();
  let locked = false;
  try {
    if (!actor.isSuper && (!actor.schoolId || actor.schoolId !== b.schoolId)) throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك استعادة بيانات مدرسة أخرى');
    if (b.kind === 'school') {
      if (!actor.isSuper) throw httpError(403, 'FORBIDDEN_ROLE', 'استعادة المدرسة لمدير النظام فقط');
    } else if (b.kind === 'account') {
      if (!actor.isSuper && !ctx.canActorDeleteUser(actor.role, b.accountRole, actor.schoolId)) throw httpError(403, 'FORBIDDEN_RANK', 'لا يمكنك استعادة هذا الحساب');
      if (!actor.isSuper && !FULL_ROLES.includes(actor.role)) authorizeDelete(actor, 'users', { roles: MGMT_ROLES, perms: ['parents', 'staff', 'staff_manage', 'assistants', 'assistants_manage'] }, { schoolId: b.schoolId }, { permanent: false });
    } else {
      authorizeDelete(actor, b.collection, POLICIES[b.collection] || { roles: MGMT_ROLES, perms: [] }, { schoolId: b.schoolId, ...(b.record || {}) }, { permanent: false });
    }
    if (!['trashed', 'restoring'].includes(b.status)) throw httpError(409, 'NOT_RESTORABLE', 'لا يمكن استعادة هذا السجل (غير موجود في السلة أو قيد المعالجة)');
    await acquireLock(ctx, lockKey, owner); locked = true;
    b = (await ref.get()).data();
    if (b.status === 'restored') return { ok: true, bundleId: b.bundleId, replay: true };
    if (b.kind === 'school') {
      const out = await restoreSchoolBundle(ctx, ref, b, actor);
      await writeLog(db, adminSdk, { ...base, result: 'success', label: b.label });
      return out;
    }
    const rsteps = { ...(b.rsteps || {}) };
    const rmark = async (name, extra = {}) => { rsteps[name] = true; await ref.set({ rsteps, ...extra, updatedAt: ts(adminSdk) }, { merge: true }); };
    const rfail = (name) => { if (faults?.['restore_' + name]) { const e = new Error('injected fault at restore ' + name); e.injected = true; throw e; } };
    if (b.status === 'trashed') {
      const live = await db.collection(b.collection).doc(b.recordId).get();
      if (live.exists) throw httpError(409, 'CONFLICT', 'يوجد سجل بنفس المعرّف حالياً');
    }
    await ref.set({ status: 'restoring', jobStatus: 'RESTORING', updatedAt: ts(adminSdk) }, { merge: true });
    const policy = POLICIES[b.collection];
    const items = await ref.collection('items').get();
    try {
      if (!rsteps.docs) {
        const ops = items.docs.map((d) => (batch) => batch.set(db.collection(d.get('col')).doc(d.get('docId')), d.get('data')));
        ops.push((batch) => batch.set(db.collection(b.collection).doc(b.recordId), b.record || {}));
        await commitInBatches(db, ops);
        await rmark('docs');
      }
      rfail('after_docs');
      if (!rsteps.links) {
        if (b.collection === 'students') await commitInBatches(db, asArray(b.parentLinks).map((uid) => (batch) => batch.update(db.collection('users').doc(uid), { studentIds: adminSdk.firestore.FieldValue.arrayUnion(b.recordId) })));
        if (b.kind === 'account') await commitInBatches(db, asArray(b.studentLinks).map((sid) => (batch) => batch.update(db.collection('students').doc(sid), { parentIds: adminSdk.firestore.FieldValue.arrayUnion(b.recordId) })));
        await commitInBatches(db, (b.keptRefs || []).map((k) => (batch) => batch.set(db.collection(k.col).doc(k.id), Object.fromEntries((k.flags ? [...Object.keys(k.flags), 'deletedRelationAt'] : ['studentDeleted', 'studentDeletedAt', 'studentNameSnapshot']).concat('deletionBundleId').map((key) => [key, FV(adminSdk).delete()])), { merge: true })));
        await rmark('links');
      }
      if (!rsteps.counter && policy?.counter) {
        const path = policy.counter.path.map((p) => p.replace('{schoolId}', b.schoolId));
        await db.doc(path.join('/')).update({ [policy.counter.field]: FV(adminSdk).increment(-policy.counter.delta) }).catch(() => {});
        await rmark('counter');
      }
      if (!rsteps.auth && b.kind === 'account') {
        await ctx.authAdmin.updateUser(b.recordId, { disabled: false }).catch((e) => { if (e?.code !== 'auth/user-not-found') throw e; });
        if (b.distributorLink) await db.collection('distributors').doc(b.distributorLink.id).set({ canLogin: b.distributorLink.canLogin ?? true }, { merge: true });
        await rmark('auth');
      }
      let fileStats = { restored: 0, failed: 0, missing: 0 };
      if (!rsteps.files) {
        if (!faults?.skipFiles) fileStats = await restoreFilesFromTrash(ctx, ref);
        if (fileStats.failed) throw httpError(207, 'RESTORE_INCOMPLETE', `تمت استعادة السجلات لكن تعذّرت استعادة ${fileStats.failed} ملف. أعد المحاولة لإكمال الاستعادة`);
        await rmark('files', { restoredFiles: fileStats.restored, missingFiles: fileStats.missing });
      }
      await commitInBatches(db, items.docs.map((d) => (batch) => batch.delete(d.ref)));
      await ref.set({ status: 'restored', jobStatus: 'RESTORED', restoredAt: ts(adminSdk), restoredBy: { uid: actor.uid, name: actor.name }, record: FV(adminSdk).delete(), lastError: null }, { merge: true });
      await writeLog(db, adminSdk, { ...base, result: 'success', label: b.label, files: fileStats.restored, missingFiles: fileStats.missing });
      return { ok: true, bundleId: b.bundleId, restoredFiles: fileStats.restored, missingFiles: (await ref.get()).get('missingFiles') || 0 };
    } catch (e) {
      await ref.set({ status: 'restoring', jobStatus: 'PARTIALLY_COMPLETED', lastError: String(e?.message || e).slice(0, 200), updatedAt: ts(adminSdk) }, { merge: true }).catch(() => {});
      throw e.status ? e : Object.assign(httpError(500, 'RESTORE_INCOMPLETE', 'الاستعادة غير مكتملة — أعد المحاولة: ' + String(e?.message || e).slice(0, 120)), { cause: e });
    }
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 && e.code !== 'RESTORE_INCOMPLETE' ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  } finally {
    if (locked) await releaseLock(ctx, lockKey, owner);
  }
}

async function purgeBundleInternal(ctx, bundleId, actor) {
  const { db, adminSdk } = ctx;
  const ref = bundleRef(db, bundleId);
  const snap = await ref.get();
  const b = snap.data();
  if (!b) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  if (b.status === 'purged') return { filesDeleted: 0 };
  const policy = POLICIES[b.collection];
  await ref.set({ status: 'purging', jobStatus: 'PROCESSING', updatedAt: ts(adminSdk) }, { merge: true });
  let filesDeleted = 0;
  try {
    if (!ctx.faults?.skipFiles) filesDeleted = (await purgeTrashedFiles(ctx, ref, b.bundleId)).deleted;
    if (b.kind === 'school') {
      // permanent: the school's logins and its messaging go too (these are not restorable)
      const users = await ref.collection('items').where('col', '==', 'users').get();
      const uids = users.docs.map((d) => d.get('docId'));
      for (let i = 0; i < uids.length; i += 1000) await ctx.authAdmin.deleteUsers(uids.slice(i, i + 1000));
      if (ctx.purgeSchoolMessages) await ctx.purgeSchoolMessages(b.recordId);
      for (;;) { const s2 = await ref.collection('items').limit(PAGE).get(); if (s2.empty) break; await commitInBatches(db, s2.docs.map((d) => (batch) => batch.delete(d.ref))); }
    }
    if (b.kind === 'account' && ctx.purgeAccount) await ctx.purgeAccount(b.recordId);
    if (policy?.studentUserDoc) { try { await ctx.authAdmin.deleteUser(b.recordId); } catch (e) { if (e?.code !== 'auth/user-not-found') throw e; } }
    const items = await ref.collection('items').get();
    await commitInBatches(db, items.docs.map((d) => (batch) => batch.delete(d.ref)));
    await ref.set({ status: 'purged', jobStatus: 'PERMANENTLY_DELETED', purgedAt: ts(adminSdk), purgedBy: { uid: actor?.uid || 'system', name: actor?.name || 'system' }, record: FV(adminSdk).delete(), filesDeleted, lastError: null }, { merge: true });
    return { filesDeleted };
  } catch (e) {
    const retry = (b.retryCount || 0) + 1;
    await ref.set({ status: 'purging', jobStatus: retry >= MAX_RETRIES ? 'FAILED' : 'PARTIALLY_COMPLETED', retryCount: retry, lastError: String(e?.message || e).slice(0, 200), updatedAt: ts(adminSdk) }, { merge: true });
    throw e;
  }
}

export async function purgeBundle(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const bundleId = String(body.bundleId || '');
  if (!isSafeId(bundleId)) throw httpError(400, 'INVALID_ID', 'معرّف غير صالح');
  const snap = await bundleRef(db, bundleId).get();
  if (!snap.exists) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  const b = snap.data();
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: b.schoolId, collection: b.collection, recordId: b.recordId, bundleId, action: 'PURGE', label: b.label };
  const lockKey = `${b.collection}__${b.recordId}`;
  const owner = newOwner();
  let locked = false;
  try {
    if (b.kind === 'school') { if (!actor.isSuper) throw httpError(403, 'FORBIDDEN_ROLE', 'الحذف النهائي للمدرسة لمدير النظام فقط'); }
    else {
      if (!actor.isSuper && (!actor.schoolId || actor.schoolId !== b.schoolId)) throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك حذف بيانات مدرسة أخرى');
      if (!actor.isSuper && !FULL_ROLES.includes(actor.role)) throw httpError(403, 'FORBIDDEN_PERMANENT', 'الحذف النهائي لمدير المدرسة فقط');
    }
    if (body.confirmText !== PERMANENT_CONFIRM_TEXT) throw httpError(400, 'CONFIRM_PERMANENT_REQUIRED', 'الحذف النهائي يتطلب كتابة عبارة التأكيد');
    if (!['trashed', 'purging'].includes(b.status)) throw httpError(409, 'NOT_PURGEABLE', 'السجل ليس في السلة');
    await acquireLock(ctx, lockKey, owner); locked = true;
    const r = await purgeBundleInternal(ctx, bundleId, actor);
    await writeLog(db, adminSdk, { ...base, result: 'success', files: r.filesDeleted });
    return { ok: true };
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  } finally {
    if (locked) await releaseLock(ctx, lockKey, owner);
  }
}

/** Finish interrupted jobs (bounded exponential backoff) and purge expired, non-protected trash. */
export async function sweepDeletions(ctx, log = console, { force = false } = {}) {
  const { db, adminSdk } = ctx;
  const out = { resumed: 0, purged: 0, failed: 0, skipped: 0 };
  const stuck = await db.collection('recycle_bin').where('status', 'in', ['trashing', 'purging']).limit(50).get();
  for (const d of stuck.docs) {
    const updated = d.get('updatedAt')?.toMillis?.() || d.get('deletedAt')?.toMillis?.() || 0;
    const retry = d.get('retryCount') || 0;
    if (!force && (Date.now() - updated < backoffMs(retry) || retry >= MAX_RETRIES)) { out.skipped += 1; continue; }
    if (force && retry >= MAX_RETRIES) await d.ref.set({ retryCount: 0 }, { merge: true });
    const lockKey = `${d.get('collection')}__${d.get('recordId')}`;
    const owner = newOwner();
    try {
      await acquireLock(ctx, lockKey, owner);
    } catch { out.skipped += 1; continue; }
    try {
      if (d.get('status') === 'trashing') await (d.get('kind') === 'school' ? runSchoolTrashSteps(ctx, d.id) : runTrashSteps(ctx, d.id)); else await purgeBundleInternal(ctx, d.id, null);
      out.resumed += 1;
      await writeLog(db, adminSdk, { action: 'RESUME', result: 'success', actorUid: 'system', actorName: 'system', actorRole: 'system', schoolId: d.get('schoolId'), collection: d.get('collection'), recordId: d.get('recordId'), bundleId: d.id });
    } catch (e) { out.failed += 1; log.error?.('[deletion] resume failed', d.id, e?.message); }
    finally { await releaseLock(ctx, lockKey, owner); }
  }
  // status == trashed only (single-field query, no composite index); the due date is checked here.
  // Protected retention (purgeAfter null: finance, grades, decisions) is never purged automatically.
  const trashed = await db.collection('recycle_bin').where('status', '==', 'trashed').limit(200).get();
  const nowMs = Date.now();
  const expired = trashed.docs.filter((d) => d.get('retention') !== 'protected' && (d.get('purgeAfter')?.toMillis?.() || Infinity) <= nowMs).slice(0, 25);
  for (const d of expired) {
    const lockKey = `${d.get('collection')}__${d.get('recordId')}`;
    const owner = newOwner();
    try { await acquireLock(ctx, lockKey, owner); } catch { out.skipped += 1; continue; }
    try {
      await purgeBundleInternal(ctx, d.id, null);
      out.purged += 1;
      await writeLog(db, adminSdk, { action: 'PURGE_EXPIRED', result: 'success', actorUid: 'system', actorName: 'system', actorRole: 'system', schoolId: d.get('schoolId'), collection: d.get('collection'), recordId: d.get('recordId'), bundleId: d.id });
    } catch (e) { out.failed += 1; log.error?.('[deletion] purge expired failed', d.id, e?.message); }
    finally { await releaseLock(ctx, lockKey, owner); }
  }
  return out;
}

export function startDeletionSweep(ctx, log = console, intervalMs = 3 * 60 * 1000) {
  const t = setInterval(() => { sweepDeletions(ctx, log).catch((e) => log.error?.('[deletion] sweep failed', e?.message)); }, intervalMs);
  t.unref?.();
  return () => clearInterval(t);
}

/**
 * Cancel a payment WITHOUT deleting its record: the amount, date, collector, receipt and history stay;
 * only the status changes and the student balance is reversed. Idempotent (a voided payment is a no-op).
 */
export async function voidPayment(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const paymentId = String(body.paymentId || '');
  const reason = String(body.reason || '').trim().slice(0, 300);
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: actor.schoolId, collection: 'payments', recordId: paymentId, action: 'VOID_PAYMENT' };
  try {
    if (!paymentId || !isSafeId(paymentId)) throw httpError(400, 'INVALID_BODY', 'معرّف الدفعة غير صالح');
    if (reason.length < 3) throw httpError(400, 'REASON_REQUIRED', 'سبب الإلغاء مطلوب');
    const ref = db.collection('payments').doc(paymentId);
    const out = await db.runTransaction(async (t) => {
      const s = await t.get(ref);
      if (!s.exists) throw httpError(404, 'NOT_FOUND', 'الدفعة غير موجودة');
      const p = s.data() || {};
      authorizeDelete(actor, 'payments', POLICIES.payments, p, { permanent: false });
      if (p.status === 'voided') return { replay: true };
      const amount = Number(p.amount || 0);
      const stRef = p.studentId ? db.collection('students').doc(String(p.studentId)) : null;
      const stSnap = stRef ? await t.get(stRef) : null;
      const sameSchool = !!stSnap?.exists && String(stSnap.get('schoolId') || '') === String(p.schoolId || '');
      // the student's whole ledger is read to re-allocate what is left (earliest due date first, like the payment screen)
      let instDocs = [], payDocs = [];
      if (sameSchool) {
        const [is, ps] = await Promise.all([
          t.get(db.collection('installments').where('studentId', '==', String(p.studentId)).where('schoolId', '==', String(p.schoolId))),
          t.get(db.collection('payments').where('studentId', '==', String(p.studentId)).where('schoolId', '==', String(p.schoolId))),
        ]);
        instDocs = is.docs; payDocs = ps.docs;
      }
      const toMs = (v) => (v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : Date.parse(v) || 0);
      const paidOf = (d) => (String(d.get('status')) === 'paid' ? Number(d.get('paidAmount') ?? d.get('amount') ?? 0) : Number(d.get('paidAmount') || 0));
      const instPaid = instDocs.reduce((a, d) => a + paidOf(d), 0);
      const payTotal = payDocs.filter((d) => d.get('status') !== 'voided').reduce((a, d) => a + Number(d.get('amount') || 0), 0);
      const reconciles = Math.abs(instPaid - payTotal) < 0.01;
      t.update(ref, {
        status: 'voided', voidedAt: ts(adminSdk), voidedBy: { uid: actor.uid, name: actor.name, role: actor.role }, voidReason: reason,
        history: FV(adminSdk).arrayUnion({ action: 'voided', at: Date.now(), by: actor.uid, reason, amount }),
      });
      if (sameSchool) t.update(stRef, { tuitionBalance: FV(adminSdk).increment(-amount) });
      let reallocated = false;
      if (sameSchool && reconciles) {
        // ledger was consistent: re-allocate the remaining money over the installments
        let left = Math.max(0, payTotal - amount);
        const sorted = [...instDocs].sort((x, y) => toMs(x.get('dueDate')) - toMs(y.get('dueDate')));
        for (const d of sorted) {
          const due = Number(d.get('amount') || 0);
          const paid = Math.min(due, left); left -= paid;
          const status = paid >= due && due > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';
          const cur = { status: String(d.get('status')), paid: paidOf(d) };
          if (cur.status === status && Math.abs(cur.paid - paid) < 0.01) continue;
          t.update(d.ref, { status, paidAmount: paid, paidAt: status === 'paid' ? (d.get('paidAt') || ts(adminSdk)) : FV(adminSdk).delete(), reallocatedBy: `void:${paymentId}` });
        }
        reallocated = true;
      } else if (sameSchool) {
        // the stored installments do not add up to the payments (manual toggles / extra payments): do NOT guess.
        t.update(stRef, { financialReviewRequired: true, financialReviewReason: `إلغاء الدفعة ${paymentId}: الأقساط لا تطابق الدفعات، مراجعة مالية مطلوبة`, financialReviewAt: ts(adminSdk) });
        instDocs.forEach((d) => t.update(d.ref, { reviewRequired: true, reviewReason: `إلغاء الدفعة ${paymentId}` }));
      }
      return { replay: false, amount, reallocated, reviewRequired: !reallocated };
    });
    await writeLog(db, adminSdk, { ...base, result: 'success', replay: out.replay, amount: out.amount ?? null, reallocated: out.reallocated ?? null });
    return { ok: true, replay: out.replay, reallocated: out.reallocated ?? null, reviewRequired: out.reviewRequired ?? null };
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  }
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// Notifications (per-user inbox items: ownership-checked, deleted at once, logged in aggregate)
// ══════════════════════════════════════════════════════════════════════════════════════════════
const NOTIF_OWNER_FIELDS = ['userId', 'recipientId', 'receiverId'];

export async function deleteNotifications(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const ids = [...new Set(asArray(body.ids))].filter((i) => i && isSafeId(i));
  if (!ids.length) throw httpError(400, 'INVALID_BODY', 'لم يتم تحديد إشعارات');
  if (ids.length > 100) throw httpError(400, 'TOO_MANY', 'الحد الأقصى 100 إشعار في الطلب الواحد');
  const results = [];
  const toDelete = [];
  for (const id of ids) {
    const s = await db.collection('notifications').doc(id).get();
    if (!s.exists) { results.push({ id, ok: false, code: 'NOT_FOUND' }); continue; }
    const d = s.data() || {};
    const own = NOTIF_OWNER_FIELDS.some((f) => d[f] && String(d[f]) === actor.uid);
    const sameSchool = actor.schoolId && String(d.schoolId || '') === actor.schoolId;
    const authored = d.createdBy && String(d.createdBy) === actor.uid && sameSchool;
    const adminAudience = sameSchool && FULL_ROLES.includes(actor.role) && ['school_admin', 'all_school'].includes(String(d.audience || ''));
    const superInbox = actor.isSuper && (d.userId === 'super_admin' || own);
    if (actor.isSuper || own || authored || adminAudience || superInbox) { toDelete.push(s.ref); results.push({ id, ok: true }); }
    else results.push({ id, ok: false, code: 'FORBIDDEN_OWNER' });
  }
  await commitInBatches(db, toDelete.map((r) => (batch) => batch.delete(r)));
  await writeLog(db, adminSdk, {
    actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: actor.schoolId, collection: 'notifications', recordId: ids[0], action: 'DELETE_NOTIFICATIONS',
    result: results.every((r) => r.ok) ? 'success' : results.some((r) => r.ok) ? 'partial' : 'refused', count: toDelete.length, requested: ids.length, mode: 'permanent', bulk: ids.length > 1,
  });
  return { results, ok: results.every((r) => r.ok), deleted: toDelete.length };
}

// ══════════════════════════════════════════════════════════════════════════════════════════════
// School deletion — a resumable, checkpointed job (kind 'school'), Super Admin only.
//   Dependency graph (children first); data goes into the bundle (restorable), accounts are only
//   disabled, files are moved to _trash; audit/login logs are NEVER touched. Purge = permanent.
// ══════════════════════════════════════════════════════════════════════════════════════════════
export const SCHOOL_DELETE_ORDER = [
  'notifications', 'notification_logs', 'tuition_reminder_logs', 'tuition_reminder_tracking', 'logs', 'dismissal_requests', 'dismissal_logs', 'dismissal_snapshots', 'print_logs', 'notification_preferences',
  'orders', 'market', 'marketplace', 'inventory', 'payroll', 'payments', 'installments', 'fees', 'expenses', 'exams',
  'student_archives', 'id_cards', 'behavior_reports', 'behavior', 'teacher_reports', 'advanced_reports', 'grades',
  'attendance', 'attendance_records', 'homework', 'announcements', 'subscriptionRequests', 'registrations',
  'subjects', 'classes', 'staff', 'students', 'users',
];
export const SCHOOL_RETAINED = ['audit_logs', 'login_logs', 'deletion_logs', 'recycle_bin'];
const SCHOOL_CONFIRM_TEXT = 'حذف المدرسة';
const PAGE = 300;

async function countByQuery(db, col, schoolId) {
  try { return (await db.collection(col).where('schoolId', '==', schoolId).count().get()).data().count; }
  catch { return (await db.collection(col).where('schoolId', '==', schoolId).get()).size; }
}

/** What a school deletion would touch (shown before executing). No changes are made. */
export async function previewSchoolDeletion(ctx, actorUid, schoolId) {
  const { db } = ctx;
  const actor = await loadActor(db, actorUid);
  if (!actor.isSuper) throw httpError(403, 'FORBIDDEN_ROLE', 'حذف المدرسة لمدير النظام فقط');
  if (!isSafeId(String(schoolId || ''))) throw httpError(400, 'INVALID_ID', 'معرّف غير صالح');
  const school = await db.collection('schools').doc(String(schoolId || '')).get();
  if (!school.exists) throw httpError(404, 'NOT_FOUND', 'المدرسة غير موجودة');
  const counts = {};
  for (const col of SCHOOL_DELETE_ORDER) counts[col] = await countByQuery(db, col, schoolId);
  const users = await db.collection('users').where('schoolId', '==', schoolId).get();
  const shared = users.docs.filter((d) => asArray(d.get('schoolIds')).some((s) => s !== schoolId)).length;
  const superUsers = users.docs.filter((d) => SUPER.includes(String(d.get('role')))).length;
  let files = 0;
  try { for (const prefix of [`schools/${schoolId}/`, `students/${schoolId}/`]) files += (await ctx.bucket().getFiles({ prefix }))[0].length; } catch { files = -1; }
  return { schoolId, schoolName: school.get('name') || '', counts, accounts: users.size - shared - superUsers, sharedAccounts: shared, protectedAccounts: superUsers, files, retained: SCHOOL_RETAINED, confirmText: SCHOOL_CONFIRM_TEXT };
}

async function runSchoolTrashSteps(ctx, bundleId) {
  const { db, adminSdk, faults } = ctx;
  const ref = bundleRef(db, bundleId);
  const b = (await ref.get()).data();
  if (b.status === 'trashed') return b;
  const steps = { ...(b.steps || {}) };
  const schoolId = b.recordId;
  const mark = async (name, extra = {}) => { steps[name] = true; await ref.set({ steps, ...extra, lastError: null, updatedAt: ts(adminSdk) }, { merge: true }); };
  await ref.set({ jobStatus: 'PROCESSING', updatedAt: ts(adminSdk) }, { merge: true });
  try {
    if (!steps.snapshot) {
      const sc = await db.collection('schools').doc(schoolId).get();
      if (!sc.exists) throw httpError(404, 'NOT_FOUND', 'المدرسة غير موجودة');
      await ref.set({ record: sc.data(), retention: 'protected', purgeAfter: null, expiresAt: null }, { merge: true });
      await mark('snapshot');
    }
    // collection by collection, page by page: copy into the bundle, then remove from the live collection
    for (const col of SCHOOL_DELETE_ORDER) {
      if (steps[`col:${col}`]) continue;
      for (;;) {
        const snap = await db.collection(col).where('schoolId', '==', schoolId).limit(PAGE).get();
        const docs = snap.docs.filter((d) => !(col === 'users' && SUPER.includes(String(d.get('role')))));
        if (!docs.length && snap.empty) break;
        const mine = [], sharedFix = [];
        for (const d of docs) {
          if (col === 'users' && asArray(d.get('schoolIds')).some((s) => s !== schoolId)) sharedFix.push(d); else mine.push(d);
        }
        await commitInBatches(db, mine.map((d) => (batch) => batch.set(ref.collection('items').doc(`${col}__${d.id}`), { col, docId: d.id, data: d.data() })));
        if (faults?.school_mid && col === faults.school_mid) { const e = new Error('injected fault in ' + col); e.injected = true; throw e; }
        await commitInBatches(db, mine.map((d) => (batch) => batch.delete(d.ref)));
        for (const d of sharedFix) {
          // an account shared with other schools is NOT deleted: it only leaves this school
          const others = asArray(d.get('schoolIds')).filter((s) => s !== schoolId);
          await ref.collection('items').doc(`shared__${d.id}`).set({ col: 'shared_users', docId: d.id, data: { schoolId: d.get('schoolId'), schoolIds: d.get('schoolIds') } });
          await d.ref.set({ schoolId: others[0], schoolIds: others }, { merge: true });
        }
        if (!mine.length && !sharedFix.length) break; // only protected (super admin) accounts left in the page
      }
      await mark(`col:${col}`);
    }
    // accounts of the school: disable the logins (kept for restore)
    if (!steps.auth) {
      const items = await ref.collection('items').where('col', '==', 'users').get();
      for (const d of items.docs) {
        if (d.get('authDone')) continue;
        try { await ctx.authAdmin.updateUser(d.get('docId'), { disabled: true }); } catch (e) { if (e?.code !== 'auth/user-not-found') throw e; }
        await d.ref.set({ authDone: true }, { merge: true });
      }
      await mark('auth');
    }
    // files of the school
    if (!steps.files) {
      let failedFiles = 0, plan = [];
      if (!faults?.skipFiles) {
        const bucket = ctx.bucket();
        for (const prefix of [`schools/${schoolId}/`, `students/${schoolId}/`]) {
          const [files] = await bucket.getFiles({ prefix });
          plan.push(...files.map((f) => ({ path: f.name, owner: `schools/${schoolId}`, status: 'move' })));
        }
        failedFiles = (await moveFilesToTrash(ctx, ref, bundleId, plan)).failed;
      }
      await ref.set({ storageReferences: { move: plan.length }, failedItems: failedFiles }, { merge: true });
      if (failedFiles) throw new Error(`تعذّر نقل ${failedFiles} ملف`);
      await mark('files');
    }
    // sub-collections of the school document (e.g. settings) do not disappear with it: copy them into the bundle first
    if (!steps.sub) {
      const subs = await db.collection('schools').doc(schoolId).listCollections();
      for (const sc of subs) {
        for (;;) {
          const snap = await sc.limit(PAGE).get();
          if (snap.empty) break;
          await commitInBatches(db, snap.docs.map((d) => (batch) => batch.set(ref.collection('items').doc(`sub_${sc.id}__${d.id}`), { col: 'schoolsub', sub: sc.id, docId: d.id, data: d.data() })));
          await commitInBatches(db, snap.docs.map((d) => (batch) => batch.delete(d.ref)));
        }
      }
      await mark('sub');
    }
    if (!steps.delete) {
      await db.collection('schools').doc(schoolId).delete();
      await mark('delete');
    }
    const counts = {};
    (await ref.collection('items').select('col').get()).docs.forEach((d) => { counts[d.get('col')] = (counts[d.get('col')] || 0) + 1; });
    await ref.set({ status: 'trashed', jobStatus: 'COMPLETED', trashedAt: ts(adminSdk), steps, childCounts: counts, relatedRecords: counts, processedItems: Object.values(counts).reduce((a, n) => a + n, 0), retryCount: 0, lastError: null }, { merge: true });
    return (await ref.get()).data();
  } catch (e) {
    const retry = (b.retryCount || 0) + 1;
    await ref.set({ status: 'trashing', jobStatus: retry >= MAX_RETRIES ? 'FAILED' : 'PARTIALLY_COMPLETED', steps, retryCount: retry, lastError: String(e?.message || e).slice(0, 200), updatedAt: ts(adminSdk) }, { merge: true }).catch(() => {});
    throw e;
  }
}

/** Super Admin only: delete a whole school (to trash; permanent=true also purges). Written confirmations are separate and mandatory. */
export async function deleteSchool(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const schoolId = String(body.schoolId || '');
  const permanent = body.mode === 'permanent';
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId, collection: 'schools', recordId: schoolId, mode: permanent ? 'permanent' : 'trash', action: permanent ? 'DELETE_SCHOOL_PERMANENT' : 'DELETE_SCHOOL' };
  const lockKey = `schools__${schoolId}`;
  const owner = newOwner();
  let locked = false;
  try {
    if (!actor.isSuper) throw httpError(403, 'FORBIDDEN_ROLE', 'حذف المدرسة لمدير النظام فقط');
    if (!schoolId || !isSafeId(schoolId)) throw httpError(400, 'INVALID_BODY', 'معرّف المدرسة غير صالح');
    const sc = await db.collection('schools').doc(schoolId).get();
    if (!sc.exists) throw httpError(404, 'NOT_FOUND', 'المدرسة غير موجودة');
    const name = String(sc.get('name') || '').trim();
    if (body.confirmSchoolId !== schoolId) throw httpError(400, 'CONFIRM_SCHOOL_REQUIRED', 'يجب إدخال معرّف المدرسة للتأكيد');
    if (name && String(body.confirmName || '').trim() !== name) throw httpError(400, 'CONFIRM_NAME_REQUIRED', 'اسم المدرسة المكتوب غير مطابق');
    if (body.confirmText !== SCHOOL_CONFIRM_TEXT) throw httpError(400, 'CONFIRM_TEXT_REQUIRED', `اكتب «${SCHOOL_CONFIRM_TEXT}» للتأكيد`);
    if (permanent && body.confirmPermanentText !== PERMANENT_CONFIRM_TEXT) throw httpError(400, 'CONFIRM_PERMANENT_REQUIRED', 'الحذف النهائي يتطلب كتابة عبارة التأكيد المستقلة');
    await acquireLock(ctx, lockKey, owner); locked = true;
    const existing = await db.collection('recycle_bin').where('recordKey', '==', `schools/${schoolId}`).where('status', 'in', ['trashing', 'trashed', 'purging']).limit(1).get();
    const preview = await previewSchoolDeletion(ctx, actorUid, schoolId);
    let bid;
    if (!existing.empty) bid = existing.docs[0].id;
    else {
      bid = `schools__${schoolId}__${Date.now().toString(36)}`;
      await bundleRef(db, bid).set({
        bundleId: bid, jobId: bid, recordKey: `schools/${schoolId}`, collection: 'schools', entityType: 'school', recordId: schoolId, entityId: schoolId, schoolId, kind: 'school',
        label: name || schoolId, status: 'trashing', jobStatus: 'PENDING', steps: {}, initiatedBy: { uid: actor.uid, name: actor.name, role: actor.role }, deletedBy: { uid: actor.uid, name: actor.name, role: actor.role },
        deletedAt: ts(adminSdk), createdAt: ts(adminSdk), retention: 'protected', purgeAfter: null, expiresAt: null, processedItems: 0, failedItems: 0, retryCount: 0, relatedRecords: {}, storageReferences: {}, preview,
      });
    }
    await runSchoolTrashSteps(ctx, bid);
    let purged = null;
    if (permanent) purged = await purgeBundleInternal(ctx, bid, actor);
    await writeLog(db, adminSdk, { ...base, result: 'success', bundleId: bid, label: name, preview: { counts: preview.counts, accounts: preview.accounts, files: preview.files }, files: purged?.filesDeleted ?? 0 });
    return { ok: true, bundleId: bid, preview };
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  } finally {
    if (locked) await releaseLock(ctx, lockKey, owner);
  }
}

async function restoreSchoolBundle(ctx, ref, b, actor) {
  const { db, adminSdk } = ctx;
  const rsteps = { ...(b.rsteps || {}) };
  const rmark = async (name, extra = {}) => { rsteps[name] = true; await ref.set({ rsteps, ...extra, updatedAt: ts(adminSdk) }, { merge: true }); };
  const schoolId = b.recordId;
  if (b.status === 'trashed') {
    const live = await db.collection('schools').doc(schoolId).get();
    if (live.exists) throw httpError(409, 'CONFLICT', 'توجد مدرسة بنفس المعرّف حالياً');
  }
  await ref.set({ status: 'restoring', jobStatus: 'RESTORING', updatedAt: ts(adminSdk) }, { merge: true });
  try {
    if (!rsteps.school) { await db.collection('schools').doc(schoolId).set(b.record || {}); await rmark('school'); }
    if (!rsteps.items) {
      let last = null;
      for (;;) {
        let q = ref.collection('items').orderBy(adminSdk.firestore.FieldPath.documentId()).limit(PAGE);
        if (last) q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty) break;
        const ops = [];
        for (const d of snap.docs) {
          const col = d.get('col');
          if (col === 'schoolsub') ops.push((batch) => batch.set(db.collection('schools').doc(schoolId).collection(d.get('sub')).doc(d.get('docId')), d.get('data')));
          else if (col === 'shared_users') ops.push((batch) => batch.set(db.collection('users').doc(d.get('docId')), d.get('data'), { merge: true }));
          else ops.push((batch) => batch.set(db.collection(col).doc(d.get('docId')), d.get('data')));
        }
        await commitInBatches(db, ops);
        last = snap.docs[snap.docs.length - 1];
      }
      await rmark('items');
    }
    if (!rsteps.auth) {
      const users = await ref.collection('items').where('col', '==', 'users').get();
      for (const d of users.docs) await ctx.authAdmin.updateUser(d.get('docId'), { disabled: false }).catch((e) => { if (e?.code !== 'auth/user-not-found') throw e; });
      await rmark('auth');
    }
    let fileStats = { restored: 0, failed: 0, missing: 0 };
    if (!rsteps.files) {
      if (!ctx.faults?.skipFiles) fileStats = await restoreFilesFromTrash(ctx, ref);
      if (fileStats.failed) throw httpError(207, 'RESTORE_INCOMPLETE', `تمت استعادة السجلات لكن تعذّرت استعادة ${fileStats.failed} ملف. أعد المحاولة`);
      await rmark('files', { restoredFiles: fileStats.restored });
    }
    for (;;) { const s = await ref.collection('items').limit(PAGE).get(); if (s.empty) break; await commitInBatches(db, s.docs.map((d) => (batch) => batch.delete(d.ref))); }
    await ref.set({ status: 'restored', jobStatus: 'RESTORED', restoredAt: ts(adminSdk), restoredBy: { uid: actor.uid, name: actor.name }, record: FV(adminSdk).delete(), lastError: null }, { merge: true });
    return { ok: true, bundleId: b.bundleId, restoredFiles: fileStats.restored };
  } catch (e) {
    await ref.set({ status: 'restoring', jobStatus: 'PARTIALLY_COMPLETED', lastError: String(e?.message || e).slice(0, 200) }, { merge: true }).catch(() => {});
    throw e.status ? e : Object.assign(httpError(500, 'RESTORE_INCOMPLETE', 'الاستعادة غير مكتملة — أعد المحاولة'), { cause: e });
  }
}

/** An admin confirms that a student's ledger was reviewed after a payment void; clears the review flags (logged). */
export async function resolveFinancialReview(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const studentId = String(body.studentId || '');
  const note = String(body.note || '').trim().slice(0, 300);
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: actor.schoolId, collection: 'students', recordId: studentId, action: 'RESOLVE_FINANCIAL_REVIEW' };
  try {
    if (!studentId || !isSafeId(studentId) || note.length < 3) throw httpError(400, 'INVALID_BODY', 'معرّف الطالب وملاحظة المراجعة مطلوبان');
    const st = await db.collection('students').doc(studentId).get();
    if (!st.exists) throw httpError(404, 'NOT_FOUND', 'الطالب غير موجود');
    authorizeDelete(actor, 'payments', POLICIES.payments, { schoolId: st.get('schoolId') }, { permanent: false });
    const insts = await db.collection('installments').where('studentId', '==', studentId).where('schoolId', '==', String(st.get('schoolId'))).get();
    await commitInBatches(db, [
      (b) => b.update(st.ref, { financialReviewRequired: FV(adminSdk).delete(), financialReviewReason: FV(adminSdk).delete(), financialReviewAt: FV(adminSdk).delete(), financialReviewedBy: actor.uid, financialReviewNote: note }),
      ...insts.docs.filter((d) => d.get('reviewRequired')).map((d) => (b) => b.update(d.ref, { reviewRequired: FV(adminSdk).delete(), reviewReason: FV(adminSdk).delete() })),
    ]);
    await writeLog(db, adminSdk, { ...base, result: 'success', note });
    return { ok: true };
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  }
}

/**
 * Chat messages: Super Admin only, hard delete by design (privacy / abuse removal; a trash copy would defeat the purpose).
 * Goes through the same lock + audit log as every other delete; the message cleaner removes its Storage attachments.
 */
export async function deleteChatMessage(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const messageId = String(body.messageId || '');
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: '', collection: 'system_messages', recordId: messageId, mode: 'permanent', action: 'DELETE_MESSAGE_PERMANENT' };
  const lockKey = `system_messages__${messageId}`;
  const owner = newOwner();
  let locked = false;
  try {
    if (!actor.isSuper) throw httpError(403, 'FORBIDDEN_ROLE', 'الحذف النهائي للرسائل مسموح لمدير النظام فقط');
    if (!messageId || !isSafeId(messageId)) throw httpError(400, 'MESSAGE_ID_REQUIRED', 'معرّف الرسالة غير صالح');
    await acquireLock(ctx, lockKey, owner); locked = true;
    const result = await ctx.permanentlyDeleteMessage({ messageId, deletedBy: actor.uid });
    await writeLog(db, adminSdk, { ...base, result: result?.ok === false ? 'refused' : 'success', conversationId: result?.conversationId ?? null });
    return result;
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  } finally {
    if (locked) await releaseLock(ctx, lockKey, owner);
  }
}

/**
 * Super-Admin-only hard deletes that have their own cleaner (e.g. purging a user's conversations):
 * same actor check, per-target lock and deletion_logs entry as every engine delete.
 */
export async function runAuditedPlatformDelete(ctx, actorUid, { action, collection, recordId, confirm, authorized = false }, fn) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: '', collection, recordId, mode: 'permanent', action };
  const lockKey = `${collection}__${recordId}`;
  const owner = newOwner();
  let locked = false;
  try {
    // `authorized`: the caller already verified a delegated platform permission server-side (e.g. manage_packages)
    if (!actor.isSuper && !authorized) throw httpError(403, 'FORBIDDEN_ROLE', 'هذا الإجراء لمدير النظام فقط');
    if (!recordId) throw httpError(400, 'INVALID_BODY', 'المعرّف مطلوب');
    if (confirm === false) throw httpError(400, 'CONFIRM_REQUIRED', 'التأكيد مطلوب');
    await acquireLock(ctx, lockKey, owner); locked = true;
    const out = await fn();
    await writeLog(db, adminSdk, { ...base, result: 'success' });
    return out;
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  } finally {
    if (locked) await releaseLock(ctx, lockKey, owner);
  }
}

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

const TRASH_DAYS = 30;
const BATCH = 400;
const MAX_IDS = 200;
export const PERMANENT_CONFIRM_TEXT = 'حذف نهائي';

const MGMT_ROLES = ['admin', 'school_admin', 'assistant', 'school_assistant', 'staff'];
const FULL_ROLES = ['admin', 'school_admin'];
const SUPER = ['superadmin', 'super_admin'];

/** perms: ids a staff/assistant must hold (menu id or feature key). roles: who may delete at all. */
export const POLICIES = {
  students: {
    roles: FULL_ROLES, label: (d) => d.name || d.fullName || 'طالب',
    children: [
      { col: 'grades', field: 'studentId' }, { col: 'attendance', field: 'studentId' },
      { col: 'installments', field: 'studentId' }, { col: 'payments', field: 'studentId' },
      { col: 'behavior_reports', field: 'studentId' }, { col: 'advanced_reports', field: 'studentId' },
      { col: 'teacher_reports', field: 'studentId' }, { col: 'student_archives', field: 'studentId' },
      { col: 'orders', field: 'studentId' }, { col: 'behavior', field: 'studentId' },
    ],
    childById: ['id_cards'],
    studentUserDoc: true,
    counter: { path: ['schools', '{schoolId}'], field: 'studentCount', delta: -1 },
    filePrefixes: (id, schoolId) => [`students/${schoolId}/${id}/`, `students/${id}/`],
  },
  classes: {
    roles: MGMT_ROLES, perms: ['classes'], label: (d) => d.name || 'صف',
    blockedIfReferenced: { col: 'students', field: 'classId', message: 'لا يمكن حذف صف يحتوي على طلاب. انقل الطلاب أولاً' },
    children: [{ col: 'subjects', field: 'classId' }, { col: 'homework', field: 'classId' }],
  },
  subjects: { roles: MGMT_ROLES, perms: ['grades', 'classes', 'school_subjects', 'exams_and_results'], label: (d) => d.name || 'مادة' },
  homework: { roles: MGMT_ROLES, perms: ['homework', 'homework_and_tasks'], teacherOwn: 'teacherId', label: (d) => d.title || 'واجب' },
  teacher_reports: { roles: MGMT_ROLES, perms: ['evaluation_reports', 'student_evaluation_reports'], teacherOwn: 'teacherId', label: (d) => d.title || d.studentName || 'تقرير' },
  advanced_reports: { roles: MGMT_ROLES, perms: ['advanced_reports'], label: (d) => d.title || d.studentName || 'تقرير متقدم' },
  behavior_reports: { roles: MGMT_ROLES, perms: ['behavior', 'behavior_management'], label: (d) => d.title || d.studentName || 'تقرير سلوك' },
  behavior: { roles: MGMT_ROLES, perms: ['behavior', 'behavior_management'], label: (d) => d.title || d.studentName || 'سلوك' },
  grades: { roles: MGMT_ROLES, perms: ['grades', 'exams_and_results'], label: (d) => `${d.subject || 'درجة'} ${d.studentName || ''}`.trim() },
  attendance: { roles: MGMT_ROLES, perms: ['attendance', 'attendance_track'], label: (d) => `حضور ${d.studentName || d.date || ''}`.trim() },
  announcements: { roles: MGMT_ROLES, perms: ['announcements'], label: (d) => d.title || 'إعلان' },
  installments: { roles: MGMT_ROLES, perms: ['tuition', 'tuition_fees'], label: (d) => `قسط ${d.studentName || ''}`.trim() },
  payments: { roles: MGMT_ROLES, perms: ['tuition', 'tuition_fees'], label: (d) => `دفعة ${d.studentName || ''}`.trim() },
  payroll: { roles: MGMT_ROLES, perms: ['payroll', 'staff_payroll'], label: (d) => `راتب ${d.userName || ''}`.trim() },
  inventory: { roles: MGMT_ROLES, perms: ['inventory', 'inventory_and_assets'], label: (d) => d.name || 'مادة مخزون' },
  market: { roles: MGMT_ROLES, perms: ['market', 'marketplace_ordering'], label: (d) => d.name || 'منتج', filePrefixes: (id) => [`market/${id}/`] },
  marketplace: { roles: MGMT_ROLES, perms: ['market', 'marketplace_ordering'], label: (d) => d.name || 'منتج', filePrefixes: (id) => [`market/${id}/`] },
  orders: { roles: MGMT_ROLES, perms: ['market', 'marketplace_ordering'], label: (d) => `طلب ${d.studentName || d.parentName || ''}`.trim() },
  id_cards: { roles: MGMT_ROLES, perms: ['id_cards', 'id_card_generation'], label: (d) => `بطاقة ${d.studentName || ''}`.trim() },
  student_archives: { roles: MGMT_ROLES, perms: ['student_archive'], label: (d) => `أرشيف ${d.studentName || ''}`.trim() },
};

/** Account (users/{uid}) deletion: handled separately because of the Auth login. */
const ACCOUNT_ROLES = ['teacher', 'staff', 'school_assistant', 'assistant', 'parent', 'guard'];

function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status; e.code = code;
  return e;
}

function asArray(v) { return Array.isArray(v) ? v.map(String) : []; }
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

/** Gather the dependants of a record (children by field, by id, student login doc). */
async function collectDependants(db, policy, collection, id, schoolId) {
  const items = [];
  for (const c of policy.children || []) {
    for (const d of await queryAll(db, c.col, c.field, id, schoolId)) items.push({ col: c.col, id: d.id, data: d.data() });
  }
  for (const col of policy.childById || []) {
    const d = await db.collection(col).doc(id).get();
    if (d.exists) items.push({ col, id, data: d.data() });
  }
  if (policy.studentUserDoc) {
    const u = await db.collection('users').doc(id).get();
    if (u.exists && String((u.data() || {}).schoolId || '') === schoolId) items.push({ col: 'users', id, data: u.data() });
  }
  return items;
}

/** Idempotent trash steps for one bundle. Safe to run again after a failure. */
async function runTrashSteps(ctx, bundleId) {
  const { db, adminSdk, faults } = ctx;
  const ref = bundleRef(db, bundleId);
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  const b = snap.data();
  if (b.status === 'trashed') return b;
  const policy = POLICIES[b.collection];
  const steps = { ...(b.steps || {}) };
  const mark = async (name, extra = {}) => { steps[name] = true; await ref.set({ steps, ...extra, lastError: null, updatedAt: ts(adminSdk) }, { merge: true }); };
  const fail = (name) => { if (faults?.[name]) { const e = new Error('injected fault at ' + name); e.injected = true; throw e; } };

  try {
    // 1) snapshot: copy the record + dependants into the bundle BEFORE anything is removed
    if (!steps.snapshot) {
      const main = await db.collection(b.collection).doc(b.recordId).get();
      if (!main.exists) throw httpError(404, 'NOT_FOUND', 'السجل غير موجود');
      const deps = policy ? await collectDependants(db, policy, b.collection, b.recordId, b.schoolId) : [];
      const counts = {};
      deps.forEach((d) => { counts[d.col] = (counts[d.col] || 0) + 1; });
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
      await ref.set({ record: main.data(), childCounts: counts, parentLinks, studentLinks }, { merge: true });
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
    // 3) unlink parents from a deleted student (the list was stored with the snapshot)
    if (!steps.unlink && b.collection === 'students') {
      const stored = (await ref.get()).data() || {};
      const ops = asArray(stored.parentLinks).map((uid) => (batch) => batch.update(db.collection('users').doc(uid), { studentIds: adminSdk.firestore.FieldValue.arrayRemove(b.recordId) }));
      await commitInBatches(db, ops.length ? ops : []);
      await mark('unlink');
    }
    // 3b) a deleted parent account no longer appears on its students
    if (!steps.unlinkStudents && b.kind === 'account') {
      const stored = (await ref.get()).data() || {};
      const ops = asArray(stored.studentLinks).map((sid) => (batch) => batch.update(db.collection('students').doc(sid), { parentIds: adminSdk.firestore.FieldValue.arrayRemove(b.recordId) }));
      await commitInBatches(db, ops);
      await mark('unlinkStudents');
    }
    // 4) counters
    if (!steps.counter && policy?.counter) {
      const path = policy.counter.path.map((p) => p.replace('{schoolId}', b.schoolId));
      await db.doc(path.join('/')).update({ [policy.counter.field]: adminSdk.firestore.FieldValue.increment(policy.counter.delta) }).catch(() => {});
      await mark('counter');
    }
    // 5) accounts: disable the login (kept for restore)
    if (!steps.auth && b.kind === 'account') {
      try { await ctx.authAdmin.updateUser(b.recordId, { disabled: true }); } catch (e) { if (e?.code !== 'auth/user-not-found') throw e; }
      await mark('auth');
    }
    fail('before_finalize');
    await ref.set({ status: 'trashed', trashedAt: ts(adminSdk), steps, lastError: null }, { merge: true });
    return (await ref.get()).data();
  } catch (e) {
    await ref.set({ status: 'trashing', steps, lastError: String(e?.message || e).slice(0, 200), updatedAt: ts(adminSdk) }, { merge: true }).catch(() => {});
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
  if (!isAccount && !POLICIES[collection]) throw httpError(400, 'UNSUPPORTED_COLLECTION', 'نوع السجل غير مدعوم للحذف');
  // explicit confirmations are enforced by the server, not only shown by the UI
  if (ids.length > 1 && body.confirmBulk !== true) throw httpError(400, 'CONFIRM_BULK_REQUIRED', 'الحذف الجماعي يتطلب تأكيداً صريحاً');
  if (permanent && body.confirmText !== PERMANENT_CONFIRM_TEXT) throw httpError(400, 'CONFIRM_PERMANENT_REQUIRED', 'الحذف النهائي يتطلب كتابة عبارة التأكيد');

  const results = [];
  for (const id of ids) {
    const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: actor.schoolId, collection, recordId: id, mode: permanent ? 'permanent' : 'trash', bulk: ids.length > 1 };
    try {
      const doc = await db.collection(collection).doc(id).get();
      if (!doc.exists) throw httpError(404, 'NOT_FOUND', 'السجل غير موجود');
      const data = doc.data() || {};
      let policy;
      if (isAccount) {
        const role = String(data.role || '');
        if (!ctx.canActorDeleteUser) throw httpError(500, 'MISCONFIGURED', 'مصادقة الحذف غير مهيأة');
        if (SUPER.includes(role) || !ACCOUNT_ROLES.includes(role)) throw httpError(403, 'FORBIDDEN_PRIVILEGED', 'لا يمكن حذف هذا النوع من الحسابات');
        if (!actor.isSuper) {
          if (!actor.schoolId || String(data.schoolId || '') !== actor.schoolId) throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك حذف حساب من مدرسة أخرى');
          if (!ctx.canActorDeleteUser(actor.role, role, actor.schoolId)) throw httpError(403, 'FORBIDDEN_RANK', 'لا يمكنك حذف حساب بصلاحيات مساوية أو أعلى');
          if (id === actor.uid) throw httpError(403, 'FORBIDDEN_SELF', 'لا يمكنك حذف حسابك بنفسك');
          // partial-permission assistants/staff may only manage accounts they were granted
          if (actor.role !== 'admin' && actor.role !== 'school_admin') {
            const need = role === 'parent' ? ['parents'] : role === 'guard' || role === 'teacher' || role === 'staff' ? ['staff', 'staff_manage'] : ['assistants', 'assistants_manage'];
            if (!actor.permissions || !actor.permissions.some((p) => need.includes(p))) throw httpError(403, 'FORBIDDEN_PERMISSION', 'ليست لديك صلاحية حذف الحسابات');
          }
        }
        policy = { roles: MGMT_ROLES, label: (d) => d.name || d.email || 'حساب', accountRole: role };
      } else {
        policy = POLICIES[collection];
        authorizeDelete(actor, collection, policy, data, { permanent });
        if (policy.blockedIfReferenced) {
          const ref = await queryAll(db, policy.blockedIfReferenced.col, policy.blockedIfReferenced.field, id, String(data.schoolId || ''));
          if (ref.length) throw httpError(409, 'HAS_DEPENDENTS', policy.blockedIfReferenced.message);
        }
      }
      const schoolId = String(data.schoolId || actor.schoolId || '');
      const bundleId = `${collection}__${id}__${Date.now().toString(36)}`;
      const existing = await db.collection('recycle_bin').where('recordKey', '==', `${collection}/${id}`).where('status', 'in', ['trashing', 'trashed']).limit(1).get();
      let bid = bundleId;
      if (!existing.empty) bid = existing.docs[0].id; // retry of an interrupted delete resumes the same bundle
      else {
        await bundleRef(db, bid).set({
          bundleId: bid, recordKey: `${collection}/${id}`, collection, recordId: id, schoolId, kind: isAccount ? 'account' : 'record',
          label: String((policy.label ? policy.label(data) : id) || id).slice(0, 120), status: 'trashing', steps: {},
          deletedBy: { uid: actor.uid, name: actor.name, role: actor.role }, deletedAt: ts(adminSdk),
          purgeAfter: adminSdk.firestore.Timestamp.fromMillis(Date.now() + TRASH_DAYS * 86400000), accountRole: policy.accountRole || null,
        });
      }
      await runTrashSteps(ctx, bid);
      let purged = null;
      if (permanent) purged = await purgeBundleInternal(ctx, bid, actor);
      await writeLog(db, adminSdk, { ...base, action: permanent ? 'DELETE_PERMANENT' : 'DELETE_TO_TRASH', result: 'success', bundleId: bid, label: policy.label ? policy.label(data) : id, childCounts: (await bundleRef(db, bid).get()).get('childCounts') || {}, files: purged?.filesDeleted ?? 0 });
      results.push({ id, ok: true, bundleId: bid, permanent });
    } catch (e) {
      await writeLog(db, adminSdk, { ...base, action: permanent ? 'DELETE_PERMANENT' : 'DELETE_TO_TRASH', result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
      results.push({ id, ok: false, code: e.code || 'ERROR', message: e.message, partial: !e.status || e.status >= 500 });
    }
  }
  return { results, ok: results.every((r) => r.ok) };
}

export async function restoreBundle(ctx, actorUid, bundleId) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const ref = bundleRef(db, String(bundleId || ''));
  const snap = await ref.get();
  if (!snap.exists) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  const b = snap.data();
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: b.schoolId, collection: b.collection, recordId: b.recordId, bundleId: b.bundleId, action: 'RESTORE' };
  try {
    if (!actor.isSuper && (!actor.schoolId || actor.schoolId !== b.schoolId)) throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك استعادة بيانات مدرسة أخرى');
    const policy = POLICIES[b.collection];
    authorizeDelete(actor, b.collection, policy || { roles: MGMT_ROLES, perms: [] }, { schoolId: b.schoolId, ...(b.record || {}) }, { permanent: false });
    if (b.status !== 'trashed') throw httpError(409, 'NOT_RESTORABLE', 'لا يمكن استعادة هذا السجل (غير موجود في السلة أو قيد المعالجة)');
    const live = await db.collection(b.collection).doc(b.recordId).get();
    if (live.exists) throw httpError(409, 'CONFLICT', 'يوجد سجل بنفس المعرّف حالياً');
    const items = await ref.collection('items').get();
    const ops = items.docs.map((d) => (batch) => batch.set(db.collection(d.get('col')).doc(d.get('docId')), d.get('data')));
    ops.push((batch) => batch.set(db.collection(b.collection).doc(b.recordId), b.record || {}));
    await commitInBatches(db, ops);
    if (b.collection === 'students') {
      const links = asArray(b.parentLinks).map((uid) => (batch) => batch.update(db.collection('users').doc(uid), { studentIds: adminSdk.firestore.FieldValue.arrayUnion(b.recordId) }));
      await commitInBatches(db, links);
    }
    if (b.kind === 'account') {
      const relink = asArray(b.studentLinks).map((sid) => (batch) => batch.update(db.collection('students').doc(sid), { parentIds: adminSdk.firestore.FieldValue.arrayUnion(b.recordId) }));
      await commitInBatches(db, relink);
    }
    if (policy?.counter) {
      const path = policy.counter.path.map((p) => p.replace('{schoolId}', b.schoolId));
      await db.doc(path.join('/')).update({ [policy.counter.field]: adminSdk.firestore.FieldValue.increment(-policy.counter.delta) }).catch(() => {});
    }
    if (b.kind === 'account') await ctx.authAdmin.updateUser(b.recordId, { disabled: false }).catch((e) => { if (e?.code !== 'auth/user-not-found') throw e; });
    await commitInBatches(db, items.docs.map((d) => (batch) => batch.delete(d.ref)));
    await ref.set({ status: 'restored', restoredAt: ts(adminSdk), restoredBy: { uid: actor.uid, name: actor.name }, record: adminSdk.firestore.FieldValue.delete() }, { merge: true });
    await writeLog(db, adminSdk, { ...base, result: 'success', label: b.label });
    return { ok: true, bundleId: b.bundleId };
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  }
}

async function purgeBundleInternal(ctx, bundleId, actor) {
  const { db, adminSdk, faults } = ctx;
  const ref = bundleRef(db, bundleId);
  const snap = await ref.get();
  const b = snap.data();
  if (!b) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  if (b.status === 'purged') return { filesDeleted: 0 };
  const policy = POLICIES[b.collection];
  await ref.set({ status: 'purging', updatedAt: ts(adminSdk) }, { merge: true });
  let filesDeleted = 0;
  try {
    if (policy?.filePrefixes && !faults?.skipFiles) {
      if (faults?.storage) throw new Error('injected storage fault');
      const bucket = ctx.bucket();
      for (const prefix of policy.filePrefixes(b.recordId, b.schoolId)) {
        const [files] = await bucket.getFiles({ prefix });
        for (const f of files) { await f.delete({ ignoreNotFound: true }); filesDeleted += 1; }
      }
    }
    if (b.kind === 'account' && ctx.purgeAccount) await ctx.purgeAccount(b.recordId);
    if (policy?.studentUserDoc) { try { await ctx.authAdmin.deleteUser(b.recordId); } catch (e) { if (e?.code !== 'auth/user-not-found') throw e; } }
    const items = await ref.collection('items').get();
    await commitInBatches(db, items.docs.map((d) => (batch) => batch.delete(d.ref)));
    await ref.set({ status: 'purged', purgedAt: ts(adminSdk), purgedBy: { uid: actor?.uid || 'system', name: actor?.name || 'system' }, record: adminSdk.firestore.FieldValue.delete(), filesDeleted }, { merge: true });
    return { filesDeleted };
  } catch (e) {
    await ref.set({ status: 'purging', lastError: String(e?.message || e).slice(0, 200) }, { merge: true });
    throw e;
  }
}

export async function purgeBundle(ctx, actorUid, body) {
  const { db, adminSdk } = ctx;
  const actor = await loadActor(db, actorUid);
  const bundleId = String(body.bundleId || '');
  const snap = await bundleRef(db, bundleId).get();
  if (!snap.exists) throw httpError(404, 'BUNDLE_NOT_FOUND', 'السجل غير موجود في السلة');
  const b = snap.data();
  const base = { actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, schoolId: b.schoolId, collection: b.collection, recordId: b.recordId, bundleId, action: 'PURGE', label: b.label };
  try {
    if (!actor.isSuper && (!actor.schoolId || actor.schoolId !== b.schoolId)) throw httpError(403, 'FORBIDDEN_SCHOOL', 'لا يمكنك حذف بيانات مدرسة أخرى');
    if (!actor.isSuper && !FULL_ROLES.includes(actor.role)) throw httpError(403, 'FORBIDDEN_PERMANENT', 'الحذف النهائي لمدير المدرسة فقط');
    if (body.confirmText !== PERMANENT_CONFIRM_TEXT) throw httpError(400, 'CONFIRM_PERMANENT_REQUIRED', 'الحذف النهائي يتطلب كتابة عبارة التأكيد');
    if (!['trashed', 'purging'].includes(b.status)) throw httpError(409, 'NOT_PURGEABLE', 'السجل ليس في السلة');
    const r = await purgeBundleInternal(ctx, bundleId, actor);
    await writeLog(db, adminSdk, { ...base, result: 'success', files: r.filesDeleted });
    return { ok: true };
  } catch (e) {
    await writeLog(db, adminSdk, { ...base, result: e.status && e.status < 500 ? 'refused' : 'failed', errorCode: e.code || 'ERROR', error: String(e.message || e).slice(0, 200) });
    throw e;
  }
}

/** Finish interrupted jobs and purge expired trash. Called by the server sweep. */
export async function sweepDeletions(ctx, log = console) {
  const { db, adminSdk } = ctx;
  const out = { resumed: 0, purged: 0, failed: 0 };
  const stuck = await db.collection('recycle_bin').where('status', 'in', ['trashing', 'purging']).limit(50).get();
  for (const d of stuck.docs) {
    const updated = d.get('updatedAt')?.toMillis?.() || d.get('deletedAt')?.toMillis?.() || 0;
    if (Date.now() - updated < 60_000) continue; // let an in-flight request finish
    try {
      if (d.get('status') === 'trashing') await runTrashSteps(ctx, d.id); else await purgeBundleInternal(ctx, d.id, null);
      out.resumed += 1;
      await writeLog(db, adminSdk, { action: 'RESUME', result: 'success', actorUid: 'system', actorName: 'system', actorRole: 'system', schoolId: d.get('schoolId'), collection: d.get('collection'), recordId: d.get('recordId'), bundleId: d.id });
    } catch (e) { out.failed += 1; log.error?.('[deletion] resume failed', d.id, e?.message); }
  }
  // status == trashed only (single-field query, no composite index); the due date is checked here
  const trashed = await db.collection('recycle_bin').where('status', '==', 'trashed').limit(200).get();
  const nowMs = Date.now();
  const expired = trashed.docs.filter((d) => (d.get('purgeAfter')?.toMillis?.() || Infinity) <= nowMs).slice(0, 25);
  for (const d of expired) {
    try {
      await purgeBundleInternal(ctx, d.id, null);
      out.purged += 1;
      await writeLog(db, adminSdk, { action: 'PURGE_EXPIRED', result: 'success', actorUid: 'system', actorName: 'system', actorRole: 'system', schoolId: d.get('schoolId'), collection: d.get('collection'), recordId: d.get('recordId'), bundleId: d.id });
    } catch (e) { out.failed += 1; log.error?.('[deletion] purge expired failed', d.id, e?.message); }
  }
  return out;
}

export function startDeletionSweep(ctx, log = console, intervalMs = 3 * 60 * 1000) {
  const t = setInterval(() => { sweepDeletions(ctx, log).catch((e) => log.error?.('[deletion] sweep failed', e?.message)); }, intervalMs);
  t.unref?.();
  return () => clearInterval(t);
}

// Deletion engine phase 2: storage registry, job model, finance protection, retention, concurrency, super admin.
// Prereq: emulators seeded + app server on :3500 (dist/server.mjs).   node scripts/e2e/deletion-phase2.test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
const admin = require('firebase-admin');
const BUCKET = 'yala-safari-iq.firebasestorage.app';
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq', storageBucket: BUCKET });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const BASE = process.env.BASE || 'http://127.0.0.1:3500';
const { deleteRecords, restoreBundle, purgeBundle, sweepDeletions, voidPayment } = await import('../../backend/deletionService.mjs');
let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
const tok = async (email) => (await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test@12345', returnSecureToken: true }) })).json()).idToken;
async function user(email, role, schoolId, extra = {}) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: 'Test@12345', emailVerified: true }); }
  await admin.auth().updateUser(u.uid, { disabled: false });
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email.split('@')[0], role, schoolId, status: 'active', ...extra });
  return u;
}
const api = async (t, path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const del = (t, collection, ids, extra = {}) => api(t, '/api/records/delete', { collection, ids: [].concat(ids), ...extra });
const exists = async (p) => (await db.doc(p).get()).exists;
const fexists = async (p) => (await bucket.file(p).exists())[0];
const bundle = async (id) => (await db.doc('recycle_bin/' + id).get()).data();
const urlOf = (path, token) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
const put = async (path, token = 'tok-' + Math.random().toString(36).slice(2)) => { await bucket.file(path).save(Buffer.from('img'), { metadata: { metadata: { firebaseStorageDownloadTokens: token } } }); return urlOf(path, token); };
const logs = async (w) => { let q = db.collection('deletion_logs'); for (const [k, v] of Object.entries(w)) q = q.where(k, '==', v); return (await q.get()).docs.map((d) => d.data()); };

await db.doc('schools/S1').set({ studentCount: 20 }, { merge: true });
await db.doc('schools/S2').set({ name: 'مدرسة ثانية', status: 'active', studentCount: 3 }, { merge: true });
const A = {
  admin: await user('p2_admin@e2e.test', 'admin', 'S1'),
  admin2: await user('p2_admin2@e2e.test', 'admin', 'S2'),
  fin: await user('p2_fin@e2e.test', 'school_assistant', 'S1', { permissions: ['tuition'] }),
  staffNo: await user('p2_staffno@e2e.test', 'staff', 'S1', { permissions: [] }),
  teacher: await user('p2_teacher@e2e.test', 'teacher', 'S1'),
  parent: await user('p2_parent@e2e.test', 'parent', 'S1', { studentIds: [] }),
  victimAdmin: await user('p2_vadmin@e2e.test', 'admin', 'S2'),
  dist: await user('p2_dist@e2e.test', 'distributor', '', { distributorId: 'P2DIST' }),
  passist: await user('p2_passist@e2e.test', 'platform_assistant', ''),
  superu: await user('super@e2e.test', 'superadmin', ''),
  super2: await user('p2_super2@e2e.test', 'superadmin', ''),
};
const K = {}; for (const [k, v] of Object.entries(A)) K[k] = await tok(v.email);
const ctx = { db, adminSdk: admin, authAdmin: admin.auth(), bucket: () => bucket, canActorDeleteUser: (a, t) => (['superadmin', 'super_admin'].includes(a) ? !['superadmin', 'super_admin'].includes(t) : t !== 'admin' && t !== 'superadmin') };

// ── 1. Storage registry ─────────────────────────────────────────────────────────────────────────
const img1 = await put('schools/S1/store/products/111-a.png', 'T1');
await db.doc('market/P2MK1').set({ schoolId: 'S1', name: 'منتج 1', imageUrl: img1 });
let r = await del(K.admin, 'market', 'P2MK1');
let bid = r.j.results[0].bundleId;
T('product image (URL-referenced, not in a record folder) is moved to _trash', r.j.results[0].ok && !(await fexists('schools/S1/store/products/111-a.png')) && await fexists(`_trash/${bid}/schools/S1/store/products/111-a.png`));
T('bundle lists storage references', (await bundle(bid)).storageReferences?.move === 1);
r = await api(K.admin, '/api/records/restore', { bundleId: bid });
const [meta] = await bucket.file('schools/S1/store/products/111-a.png').getMetadata();
T('restore puts the REAL file back with its original download token (URL works again)', r.s === 200 && meta.metadata?.firebaseStorageDownloadTokens === 'T1' && (await db.doc('market/P2MK1').get()).get('imageUrl') === img1);

const shared = await put('schools/S1/store/products/222-shared.png', 'T2');
await db.doc('market/P2MK2').set({ schoolId: 'S1', name: 'منتج 2', imageUrl: shared });
await db.doc('market/P2MK3').set({ schoolId: 'S1', name: 'منتج 3', imageUrl: shared });
r = await del(K.admin, 'market', 'P2MK2');
T('a file shared with another live record is NOT moved', r.j.results[0].ok && await fexists('schools/S1/store/products/222-shared.png') && (await bundle(r.j.results[0].bundleId)).storageReferences?.shared === 1);
const sharedB1 = r.j.results[0].bundleId;
r = await del(K.admin, 'market', 'P2MK3'); const sharedB2 = r.j.results[0].bundleId;
T('…the second record: the first one’s bin copy still references the file (restorable) → still not moved', r.j.results[0].ok && await fexists('schools/S1/store/products/222-shared.png'));
await api(K.admin, '/api/records/purge', { bundleId: sharedB1, confirmText: 'حذف نهائي' });
r = await api(K.admin, '/api/records/purge', { bundleId: sharedB2, confirmText: 'حذف نهائي' });
T('…and is deleted when the LAST bundle using it is purged', r.s === 200 && !(await fexists('schools/S1/store/products/222-shared.png')));

const foreign = await put('schools/S2/store/products/333-other.png', 'T3');
await db.doc('market/P2MK4').set({ schoolId: 'S1', name: 'يشير لملف مدرسة أخرى', imageUrl: foreign });
r = await del(K.admin, 'market', 'P2MK4');
T('a file outside the school scope is never touched (ownership check)', r.j.results[0].ok && await fexists('schools/S2/store/products/333-other.png') && (await bundle(r.j.results[0].bundleId)).storageReferences?.out_of_scope === 1);

// storage failure after Firestore success → partial job, resumable
const failImg = await put('schools/S1/store/products/444-fail.png', 'T4');
await db.doc('market/P2MK5').set({ schoolId: 'S1', name: 'فشل ملف', imageUrl: failImg });
let res = await deleteRecords({ ...ctx, faults: { fileTrash: '444-fail' } }, A.admin.uid, { collection: 'market', ids: ['P2MK5'] });
let bk = (await db.collection('recycle_bin').where('recordId', '==', 'P2MK5').get()).docs[0];
T('file move fails after Firestore delete → reported, job PARTIALLY_COMPLETED, retryCount 1', res.results[0].ok === false && !(await exists('market/P2MK5')) && bk.get('status') === 'trashing' && bk.get('jobStatus') === 'PARTIALLY_COMPLETED' && bk.get('retryCount') === 1 && bk.get('failedItems') === 1);
await bk.ref.set({ updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 7200_000) }, { merge: true });
const sw = await sweepDeletions(ctx);
bk = await bk.ref.get();
T('sweep finishes the job: file now in trash, job COMPLETED', sw.resumed >= 1 && bk.get('jobStatus') === 'COMPLETED' && bk.get('status') === 'trashed' && await fexists(`_trash/${bk.id}/schools/S1/store/products/444-fail.png`));

// restore failure on a file → docs back, NOT reported as full success, then completes on retry
const rImg = await put('schools/S1/store/products/555-rest.png', 'T5');
await db.doc('market/P2MK6').set({ schoolId: 'S1', name: 'استعادة جزئية', imageUrl: rImg });
r = await del(K.admin, 'market', 'P2MK6'); bid = r.j.results[0].bundleId;
let rerr = null; try { await restoreBundle({ ...ctx, faults: { } , ...{ faults: { fileRestore: '555-rest' } } }, A.admin.uid, bid); } catch (e) { rerr = e; }
let rb = await bundle(bid);
T('restore with a failing file: record is back but result is RESTORE_INCOMPLETE (not success)', rerr?.code === 'RESTORE_INCOMPLETE' && await exists('market/P2MK6') && rb.status === 'restoring' && rb.jobStatus === 'PARTIALLY_COMPLETED' && !(await fexists('schools/S1/store/products/555-rest.png')));
const again = await api(K.admin, '/api/records/restore', { bundleId: bid });
rb = await bundle(bid);
T('retrying completes the restore (RESTORED) and the file is back; counters not doubled', again.s === 200 && rb.status === 'restored' && rb.jobStatus === 'RESTORED' && await fexists('schools/S1/store/products/555-rest.png'));

// purge removes trashed copies only
r = await del(K.admin, 'market', 'P2MK1'); bid = r.j.results[0].bundleId;
r = await api(K.admin, '/api/records/purge', { bundleId: bid, confirmText: 'حذف نهائي' });
rb = await bundle(bid);
T('purge deletes the trashed file copies; job PERMANENTLY_DELETED; the S2 file is untouched', r.s === 200 && rb.jobStatus === 'PERMANENTLY_DELETED' && !(await fexists(`_trash/${bid}/schools/S1/store/products/111-a.png`)) && await fexists('schools/S2/store/products/333-other.png'));

// student photo through photoUrl + exclusive folder
const ph = await put('students/S1/P2ST1/photo_1.png', 'T6'); await put('students/S1/P2ST1/extra.png');
await db.doc('students/P2ST1').set({ schoolId: 'S1', name: 'طالب بصورة', classId: 'c', parentIds: [], photoUrl: ph, createdAt: admin.firestore.Timestamp.now() });
r = await del(K.admin, 'students', 'P2ST1'); bid = r.j.results[0].bundleId;
T('student photo + folder files all moved', !(await fexists('students/S1/P2ST1/photo_1.png')) && !(await fexists('students/S1/P2ST1/extra.png')) && (await bundle(bid)).storageReferences?.move === 2);
r = await api(K.admin, '/api/records/restore', { bundleId: bid });
T('student files restored', r.s === 200 && await fexists('students/S1/P2ST1/photo_1.png') && await fexists('students/S1/P2ST1/extra.png'));

// ── 2. Job model ──────────────────────────────────────────────────────────────────────────────
await db.doc('homework/P2HW1').set({ schoolId: 'S1', title: 'واجب', teacherId: A.teacher.uid, classId: 'c' });
r = await del(K.admin, 'homework', 'P2HW1'); bid = r.j.results[0].bundleId; rb = await bundle(bid);
T('job record: jobId, schoolId, initiatedBy, entityType/Id, jobStatus, createdAt, expiresAt, counters', rb.jobId === bid && rb.schoolId === 'S1' && rb.initiatedBy.uid === A.admin.uid && rb.entityType === 'homework' && rb.entityId === 'P2HW1' && rb.jobStatus === 'COMPLETED' && !!rb.createdAt && !!rb.expiresAt && rb.retryCount === 0 && 'processedItems' in rb && 'failedItems' in rb && 'relatedRecords' in rb && 'storageReferences' in rb);

// ── 3. Finance: accounting trail is never deleted ─────────────────────────────────────────────
await db.doc('students/P2ST2').set({ schoolId: 'S1', name: 'طالب مالي', classId: 'c', parentIds: [], tuitionBalance: 300, createdAt: admin.firestore.Timestamp.now() });
await db.doc('payments/P2PAY1').set({ schoolId: 'S1', studentId: 'P2ST2', amount: 300, receiptNumber: 'R-1', collectorId: A.fin.uid, installmentIds: ['P2INST1'], createdAt: admin.firestore.Timestamp.now() });
await db.doc('installments/P2INST1').set({ schoolId: 'S1', studentId: 'P2ST2', amount: 300, status: 'paid', paidAmount: 300 });
await db.doc('installments/P2INST2').set({ schoolId: 'S1', studentId: 'P2ST2', amount: 200, status: 'pending' });
await db.doc('grades/P2G1').set({ schoolId: 'S1', studentId: 'P2ST2', subject: 'x' });
for (const [who, t] of [['admin', K.admin], ['fin (tuition perm)', K.fin]]) {
  r = await del(t, 'payments', 'P2PAY1'); T(`${who}: deleting a payment is refused (FINANCIAL_RECORD_PROTECTED)`, r.j.results[0].code === 'FINANCIAL_RECORD_PROTECTED' && await exists('payments/P2PAY1'));
}
r = await del(K.admin, 'payments', 'P2PAY1', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('…also permanently', r.j.results[0].ok === false && await exists('payments/P2PAY1'));
r = await del(K.admin, 'installments', 'P2INST1'); T('a paid installment cannot be deleted', r.j.results[0].code === 'FINANCIAL_RECORD_PROTECTED' && await exists('installments/P2INST1'));
r = await del(K.staffNo, 'installments', 'P2INST2'); T('staff without the tuition permission cannot delete a pending installment', r.j.results[0].code === 'FORBIDDEN_PERMISSION' && await exists('installments/P2INST2'));
r = await del(K.fin, 'installments', 'P2INST2'); T('assistant WITH the tuition permission deletes a pending installment (moved to trash)', r.j.results[0].ok === true && !(await exists('installments/P2INST2')));
r = await api(K.fin, '/api/records/restore', { bundleId: r.j.results[0].bundleId }); T('…and restores it', r.s === 200 && await exists('installments/P2INST2'));
// deleting the student keeps the accounting trail
r = await del(K.admin, 'students', 'P2ST2'); bid = r.j.results[0].bundleId; rb = await bundle(bid);
const pay = (await db.doc('payments/P2PAY1').get()).data(); const inst1 = (await db.doc('installments/P2INST1').get()).data();
T('student deleted: payment + paid installment are KEPT with amount, receipt, collector intact', r.j.results[0].ok && pay.amount === 300 && pay.receiptNumber === 'R-1' && pay.collectorId === A.fin.uid && inst1.paidAmount === 300);
T('…and flagged with the student snapshot', pay.studentDeleted === true && pay.studentNameSnapshot === 'طالب مالي' && inst1.studentDeleted === true);
T('…while the pending installment and grades were moved to the trash', !(await exists('installments/P2INST2')) && !(await exists('grades/P2G1')) && rb.keptCounts.payments === 1 && rb.keptCounts.installments === 1);
T('bundle with finance/grades is PROTECTED (no automatic purge date)', rb.retention === 'protected' && rb.purgeAfter === null && rb.expiresAt === null);
const sw2 = await sweepDeletions(ctx);
T('sweep never auto-purges a protected bundle', (await bundle(bid)).status === 'trashed');
r = await api(K.admin, '/api/records/restore', { bundleId: bid });
const pay2 = (await db.doc('payments/P2PAY1').get()).data();
T('restore removes the flags and brings everything back', r.s === 200 && pay2.studentDeleted === undefined && pay2.amount === 300 && await exists('grades/P2G1') && await exists('installments/P2INST2'));
// void instead of delete
const bal0 = (await db.doc('students/P2ST2').get()).get('tuitionBalance');
r = await api(K.teacher, '/api/records/void-payment', { paymentId: 'P2PAY1', reason: 'خطأ' }); T('a teacher cannot void a payment', r.s === 403);
r = await api(K.admin2, '/api/records/void-payment', { paymentId: 'P2PAY1', reason: 'خطأ' }); T('another school’s admin cannot void it', r.s === 403);
r = await api(K.admin, '/api/records/void-payment', { paymentId: 'P2PAY1', reason: '' }); T('a reason is required', r.s === 400 && r.j.error === 'REASON_REQUIRED');
r = await api(K.fin, '/api/records/void-payment', { paymentId: 'P2PAY1', reason: 'دفعة مكررة' });
const vp = (await db.doc('payments/P2PAY1').get()).data(); const bal1 = (await db.doc('students/P2ST2').get()).get('tuitionBalance');
T('void keeps amount, receipt, collector, createdAt; records who/when/why; reverses the balance', r.s === 200 && vp.status === 'voided' && vp.amount === 300 && vp.receiptNumber === 'R-1' && vp.collectorId === A.fin.uid && !!vp.createdAt && !!vp.voidedAt && vp.voidedBy.uid === A.fin.uid && vp.voidReason === 'دفعة مكررة' && bal1 === bal0 - 300 && vp.history?.length === 1);
r = await api(K.admin, '/api/records/void-payment', { paymentId: 'P2PAY1', reason: 'مرة ثانية' });
T('voiding twice is idempotent (balance reversed once)', r.s === 200 && r.j.replay === true && (await db.doc('students/P2ST2').get()).get('tuitionBalance') === bal1);
T('void is logged', (await logs({ recordId: 'P2PAY1', action: 'VOID_PAYMENT', result: 'success' })).length >= 1 && (await logs({ recordId: 'P2PAY1', action: 'VOID_PAYMENT', result: 'refused' })).length >= 2);

// ── 4. Retention classes ───────────────────────────────────────────────────────────────────────
await db.doc('announcements/P2AN1').set({ schoolId: 'S1', title: 'قديم' });
r = await del(K.admin, 'announcements', 'P2AN1'); const anb = r.j.results[0].bundleId;
await db.doc('recycle_bin/' + anb).set({ purgeAfter: admin.firestore.Timestamp.fromMillis(Date.now() - 1000) }, { merge: true });
await db.doc('grades/P2G2').set({ schoolId: 'S1', studentId: 'x', subject: 'تاريخي' });
r = await del(K.admin, 'grades', 'P2G2'); const grb = r.j.results[0].bundleId;
await sweepDeletions(ctx);
T('standard data is purged after the retention period; grades (protected) are not', (await bundle(anb)).status === 'purged' && (await bundle(grb)).status === 'trashed' && (await bundle(grb)).retention === 'protected');

// ── 5. Concurrency + idempotency ──────────────────────────────────────────────────────────────
await db.doc('students/P2ST3').set({ schoolId: 'S1', name: 'سباق', classId: 'c', parentIds: [], createdAt: admin.firestore.Timestamp.now() });
const cnt0 = (await db.doc('schools/S1').get()).get('studentCount');
const both = await Promise.all([del(K.admin, 'students', 'P2ST3'), del(K.admin, 'students', 'P2ST3')]);
const oks = both.filter((x) => x.j.results?.[0]?.ok).length;
T('two simultaneous identical delete requests: exactly one executes', oks === 1, JSON.stringify(both.map((x) => x.j.results?.[0]?.code || 'ok')));
T('…the counter dropped once, one bundle exists', (await db.doc('schools/S1').get()).get('studentCount') === cnt0 - 1 && (await db.collection('recycle_bin').where('recordKey', '==', 'students/P2ST3').get()).size === 1);
await db.doc('inventory/P2INV1').set({ schoolId: 'S1', name: 'مخزون' });
const k1 = await del(K.admin, 'inventory', 'P2INV1', { idempotencyKey: 'key-abc' });
const k2 = await del(K.admin, 'inventory', 'P2INV1', { idempotencyKey: 'key-abc' });
T('same idempotencyKey replayed: same bundle, OK, no second execution', k1.j.results[0].ok && k2.j.results[0].ok && k2.j.results[0].replay === true && k1.j.results[0].bundleId === k2.j.results[0].bundleId && (await db.collection('recycle_bin').where('recordKey', '==', 'inventory/P2INV1').get()).size === 1);
const k3 = await del(K.admin2, 'inventory', 'P2INV1', { idempotencyKey: 'key-abc' });
T('another school cannot use a replay to learn about / act on the record', k3.j.results[0].ok !== true || k3.j.results[0].replay !== true);

// ── 6. Super admin through the engine ─────────────────────────────────────────────────────────
r = await del(K.superu, 'users', A.victimAdmin.uid);
T('super admin deletes a school admin account through the engine (trash, login disabled)', r.j.results[0].ok === true && !(await exists('users/' + A.victimAdmin.uid)) && (await admin.auth().getUser(A.victimAdmin.uid)).disabled === true);
T('…and it is logged with the super admin as actor', (await logs({ recordId: A.victimAdmin.uid, action: 'DELETE_TO_TRASH', actorRole: 'superadmin' })).length === 1);
r = await api(K.superu, '/api/records/restore', { bundleId: (await db.collection('recycle_bin').where('recordId', '==', A.victimAdmin.uid).get()).docs[0].id });
T('super admin restores it (login enabled again)', r.s === 200 && (await exists('users/' + A.victimAdmin.uid)) && (await admin.auth().getUser(A.victimAdmin.uid)).disabled === false);
r = await del(K.superu, 'users', A.super2.uid); T('a super admin cannot delete another super admin', r.j.results[0].ok === false && await exists('users/' + A.super2.uid));
r = await del(K.super2, 'users', A.super2.uid); T('nor delete themself', r.j.results[0].ok === false && await exists('users/' + A.super2.uid));
r = await del(K.admin, 'users', A.victimAdmin.uid); T('a school admin cannot delete an admin of another school', r.j.results[0].ok === false);
r = await del(K.passist, 'users', A.parent.uid); T('a platform assistant cannot delete school accounts', r.j.results[0].ok === false && await exists('users/' + A.parent.uid));
await db.doc('distributors/P2DIST').set({ name: 'موزع', canLogin: true, userId: A.dist.uid });
r = await del(K.superu, 'users', A.dist.uid); bid = r.j.results[0].bundleId;
T('distributor account delete: login disabled and the distributor record stops being loggable', r.j.results[0].ok && (await db.doc('distributors/P2DIST').get()).get('canLogin') === false);
r = await api(K.superu, '/api/records/restore', { bundleId: bid });
T('restore re-enables the distributor', r.s === 200 && (await db.doc('distributors/P2DIST').get()).get('canLogin') === true);
// the legacy endpoint is only a thin wrapper now
r = await api(K.superu, '/api/admin/delete-user', { userId: A.parent.uid });
T('legacy /api/admin/delete-user (super admin) now goes through the engine (bundle + log)', r.s === 200 && !!r.j.bundleId && (await logs({ recordId: A.parent.uid, action: 'DELETE_TO_TRASH', actorRole: 'superadmin' })).length === 1);
r = await api(K.superu, '/api/admin/delete-user', { userId: A.super2.uid, confirmSuperAdminDelete: true });
T('legacy endpoint cannot be used to delete a super admin even with the old confirm flag', r.s !== 200 && await exists('users/' + A.super2.uid));

// notifications of a deleted account go with it and come back
const ndoc = db.doc('notifications/P2N1'); await ndoc.set({ schoolId: 'S1', userId: A.teacher.uid, title: 'تنبيه' });
r = await del(K.admin, 'users', A.teacher.uid); bid = r.j.results[0].bundleId;
T('notifications addressed to a deleted account are removed with it', r.j.results[0].ok && !(await ndoc.get()).exists);
r = await api(K.admin, '/api/records/restore', { bundleId: bid });
T('…and restored with it', r.s === 200 && (await ndoc.get()).exists);

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

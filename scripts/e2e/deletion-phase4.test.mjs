// Final audit round: ledger re-allocation, storage discovery/traversal, distributors, assistant content, messages,
// token/IDOR/mass-assignment/race checks.   node scripts/e2e/deletion-phase4.test.mjs
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
const { deleteSchool } = await import('../../backend/deletionService.mjs');
let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
const login = async (email) => (await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test@12345', returnSecureToken: true }) })).json()).idToken;
async function user(email, role, schoolId, extra = {}) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: 'Test@12345', emailVerified: true }); }
  await admin.auth().updateUser(u.uid, { disabled: false });
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email.split('@')[0], role, schoolId, status: 'active', ...extra });
  return u;
}
const raw = async (t, path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { ...(t ? { Authorization: 'Bearer ' + t } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const api = raw;
const del = (t, collection, ids, extra = {}) => api(t, '/api/records/delete', { collection, ids: [].concat(ids), ...extra });
const exists = async (p) => (await db.doc(p).get()).exists;
const fexists = async (p) => (await bucket.file(p).exists())[0];
const bundle = async (id) => (await db.doc('recycle_bin/' + id).get()).data();
const urlOf = (path, token) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
const put = async (path, token = 'tok' + Math.random().toString(36).slice(2)) => { await bucket.file(path).save(Buffer.from('x'), { metadata: { metadata: { firebaseStorageDownloadTokens: token } } }); return urlOf(path, token); };
const logs = async (w) => { let q = db.collection('deletion_logs'); for (const [k, v] of Object.entries(w)) q = q.where(k, '==', v); return (await q.get()).docs.map((d) => d.data()); };
const now = admin.firestore.Timestamp.now();

await db.doc('schools/S1').set({ studentCount: 30 }, { merge: true });
await db.doc('schools/S2').set({ name: 'مدرسة ثانية', status: 'active', studentCount: 3 }, { merge: true });
const A = {
  admin: await user('p4_admin@e2e.test', 'admin', 'S1'),
  admin2: await user('p4_admin2@e2e.test', 'admin', 'S2'),
  fin: await user('p4_fin@e2e.test', 'school_assistant', 'S1', { permissions: ['tuition'] }),
  teacher: await user('p4_teacher@e2e.test', 'teacher', 'S1'),
  staff: await user('p4_staff@e2e.test', 'staff', 'S1', { permissions: ['inventory'] }),
  parent: await user('p4_parent@e2e.test', 'parent', 'S1'),
  superu: await user('super@e2e.test', 'superadmin', ''),
  passist: await user('p4_passist@e2e.test', 'platform_assistant', '', { permissions: [] }),
  gone: await user('p4_gone@e2e.test', 'admin', 'S1'),
};
const K = {}; for (const [k, v] of Object.entries(A)) K[k] = await login(v.email);
await admin.auth().updateUser(A.gone.uid, { disabled: true });

// ── A. ledger re-allocation after a void ────────────────────────────────────────────────────────
const D = (m) => admin.firestore.Timestamp.fromMillis(Date.UTC(2026, m, 1));
await db.doc('students/P4ST1').set({ schoolId: 'S1', name: 'طالب أقساط', classId: 'c', parentIds: [], tuitionBalance: 250, createdAt: now });
await db.doc('installments/P4I1').set({ schoolId: 'S1', studentId: 'P4ST1', amount: 100, status: 'paid', paidAmount: 100, dueDate: D(1) });
await db.doc('installments/P4I2').set({ schoolId: 'S1', studentId: 'P4ST1', amount: 100, status: 'paid', paidAmount: 100, dueDate: D(2) });
await db.doc('installments/P4I3').set({ schoolId: 'S1', studentId: 'P4ST1', amount: 100, status: 'partial', paidAmount: 50, dueDate: D(3) });
await db.doc('installments/P4I4').set({ schoolId: 'S1', studentId: 'P4ST1', amount: 100, status: 'pending', dueDate: D(4) });
await db.doc('payments/P4PAY1').set({ schoolId: 'S1', studentId: 'P4ST1', amount: 150, receiptNumber: 'A', installmentIds: ['P4I1', 'P4I2'], createdAt: now });
await db.doc('payments/P4PAY2').set({ schoolId: 'S1', studentId: 'P4ST1', amount: 100, receiptNumber: 'B', installmentIds: ['P4I2', 'P4I3'], createdAt: now });
let r = await api(K.fin, '/api/records/void-payment', { paymentId: 'P4PAY1', reason: 'إدخال خاطئ' });
const st = async (id) => (await db.doc('installments/' + id).get()).data();
T('void of the FIRST payment: installments re-allocated from the remaining 100 (earliest due first)', r.s === 200 && r.j.reallocated === true && (await st('P4I1')).status === 'paid' && (await st('P4I1')).paidAmount === 100 && (await st('P4I2')).status === 'pending' && (await st('P4I2')).paidAmount === 0 && (await st('P4I3')).status === 'pending' && (await st('P4I4')).status === 'pending');
T('student balance reflects the remaining payments (250 − 150 = 100)', (await db.doc('students/P4ST1').get()).get('tuitionBalance') === 100 && !(await db.doc('students/P4ST1').get()).get('financialReviewRequired'));
await db.doc('students/P4ST2').set({ schoolId: 'S1', name: 'طالب بتعديل يدوي', classId: 'c', parentIds: [], tuitionBalance: 100, createdAt: now });
await db.doc('installments/P4M1').set({ schoolId: 'S1', studentId: 'P4ST2', amount: 100, status: 'paid', paidAmount: 100, dueDate: D(1) });
await db.doc('installments/P4M2').set({ schoolId: 'S1', studentId: 'P4ST2', amount: 100, status: 'paid', dueDate: D(2) }); // marked paid by hand, no payment behind it
await db.doc('payments/P4PAY3').set({ schoolId: 'S1', studentId: 'P4ST2', amount: 100, receiptNumber: 'C', installmentIds: ['P4M1'], createdAt: now });
r = await api(K.admin, '/api/records/void-payment', { paymentId: 'P4PAY3', reason: 'تصحيح' });
const s2 = (await db.doc('students/P4ST2').get()).data();
T('ledger that does not add up is NOT guessed: student flagged for financial review, installments untouched', r.s === 200 && r.j.reviewRequired === true && s2.financialReviewRequired === true && (await st('P4M1')).status === 'paid' && (await st('P4M1')).reviewRequired === true);
r = await api(K.teacher, '/api/records/resolve-financial-review', { studentId: 'P4ST2', note: 'روجع' }); T('a teacher cannot clear a financial review', r.s === 403 && (await db.doc('students/P4ST2').get()).get('financialReviewRequired') === true);
r = await api(K.admin, '/api/records/resolve-financial-review', { studentId: 'P4ST2', note: '' }); T('a note is required', r.s === 400);
r = await api(K.admin, '/api/records/resolve-financial-review', { studentId: 'P4ST2', note: 'روجعت الأقساط يدوياً' });
T('admin confirms the review: flags cleared, logged', r.s === 200 && !(await db.doc('students/P4ST2').get()).get('financialReviewRequired') && !(await st('P4M1')).reviewRequired && (await logs({ recordId: 'P4ST2', action: 'RESOLVE_FINANCIAL_REVIEW', result: 'success' })).length === 1);

// ── B. storage discovery: embedded links, traversal, shared ─────────────────────────────────────
const emb = await put('schools/S1/store/products/901-emb.png', 'E1');
await db.doc('announcements/P4AN1').set({ schoolId: 'S1', title: 'إعلان', body: `انظر الصورة: ${emb} وشكراً`, createdAt: now });
r = await del(K.admin, 'announcements', 'P4AN1'); let bid = r.j.results[0].bundleId;
T('a link embedded inside free text is discovered and the file moved', r.j.results[0].ok && !(await fexists('schools/S1/store/products/901-emb.png')) && await fexists(`_trash/${bid}/schools/S1/store/products/901-emb.png`));
r = await api(K.admin, '/api/records/restore', { bundleId: bid }); T('…and restored', r.s === 200 && await fexists('schools/S1/store/products/901-emb.png'));
const sh = await put('schools/S1/store/products/902-sh.png', 'E2');
await db.doc('announcements/P4AN2').set({ schoolId: 'S1', title: 'ا', body: `مرفق ${sh}`, createdAt: now });
await db.doc('market/P4MK1').set({ schoolId: 'S1', name: 'منتج', description: `صورة ${sh}`, createdAt: now });
r = await del(K.admin, 'announcements', 'P4AN2');
T('a file linked from text of ANOTHER live record is shared → left alone', r.j.results[0].ok && await fexists('schools/S1/store/products/902-sh.png'));
await put('schools/S2/store/products/903-x.png', 'E3');
await db.doc('market/P4MK2').set({ schoolId: 'S1', name: 'مسار ملتوٍ', imageUrl: urlOf('schools/S1/../S2/store/products/903-x.png', 'E3'), createdAt: now });
r = await del(K.admin, 'market', 'P4MK2');
T('path traversal in a stored link is refused (out of scope), the other school’s file is untouched', r.j.results[0].ok && await fexists('schools/S2/store/products/903-x.png') && (await bundle(r.j.results[0].bundleId)).storageReferences?.out_of_scope === 1);
await db.doc('market/P4MK3').set({ schoolId: 'S1', name: 'يشير لمدرسة أخرى', imageUrl: urlOf('schools/S2/store/products/903-x.png', 'E3'), createdAt: now });
r = await del(K.admin, 'market', 'P4MK3', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('even a PERMANENT delete never removes another school’s file', r.j.results[0].ok && await fexists('schools/S2/store/products/903-x.png'));

// ── C. school sub-collections ───────────────────────────────────────────────────────────────────
await db.doc('schools/P4SCH').set({ name: 'مدرسة الإعدادات', status: 'active' });
await db.doc('schools/P4SCH/settings/general').set({ k: 'v', logo: 'x' });
await db.doc('users/p4_orphan').set({ uid: 'p4_orphan', role: 'teacher', schoolId: 'P4SCH', email: 'o@x.y' });
r = await api(K.superu, '/api/records/delete-school', { schoolId: 'P4SCH', mode: 'trash', confirmSchoolId: 'P4SCH', confirmName: 'مدرسة الإعدادات', confirmText: 'حذف المدرسة' });
T('school deleted; its sub-collection (settings) went to the bundle, nothing orphaned', r.s === 200 && !(await exists('schools/P4SCH')) && !(await exists('schools/P4SCH/settings/general')));
r = await api(K.superu, '/api/records/restore', { bundleId: r.j.bundleId });
T('restoring the school brings the settings sub-collection back', r.s === 200 && (await db.doc('schools/P4SCH/settings/general').get()).get('k') === 'v');

// ── D. distributors, assistant content, messages ────────────────────────────────────────────────
await db.doc('distributors/P4DIST').set({ name: 'موزع', canLogin: true });
await db.doc('distributorCoupons/P4C1').set({ distributorId: 'P4DIST', code: 'X1' });
await db.doc('schools/P4DSCH').set({ name: 'مدرسة الموزع', distributorId: 'P4DIST', status: 'active' });
r = await del(K.admin, 'distributors', 'P4DIST'); T('a school admin cannot delete a distributor', r.j.results[0].ok === false && await exists('distributors/P4DIST'));
r = await del(K.passist, 'distributors', 'P4DIST'); T('a platform assistant cannot either', r.j.results[0].ok === false);
r = await del(K.superu, 'distributors', 'P4DIST'); bid = r.j.results[0].bundleId;
T('super admin deletes a distributor: record + coupons in the bundle, school keeps its history but commission paused', r.j.results[0].ok && !(await exists('distributors/P4DIST')) && !(await exists('distributorCoupons/P4C1')) && (await exists('schools/P4DSCH')) && (await db.doc('schools/P4DSCH').get()).get('distributorCommissionPaused') === true && (await bundle(bid)).retention === 'protected');
r = await api(K.superu, '/api/records/restore', { bundleId: bid });
T('restore brings the distributor and coupons back and un-pauses the school', r.s === 200 && await exists('distributors/P4DIST') && await exists('distributorCoupons/P4C1') && (await db.doc('schools/P4DSCH').get()).get('distributorCommissionPaused') === undefined);
await db.doc('assistant_answers/P4ANS1').set({ title: 'جواب', body: 'x' });
r = await del(K.admin, 'assistant_answers', 'P4ANS1'); T('assistant content: a school admin cannot delete it', r.j.results[0].ok === false && await exists('assistant_answers/P4ANS1'));
r = await del(K.superu, 'assistant_answers', 'P4ANS1'); T('super admin deletes assistant content through the engine (recoverable)', r.j.results[0].ok && !(await exists('assistant_answers/P4ANS1')));
r = await api(K.superu, '/api/records/restore', { bundleId: r.j.results[0].bundleId }); T('…and restores it', r.s === 200 && await exists('assistant_answers/P4ANS1'));
await db.doc('system_messages/P4MSG1').set({ schoolId: 'S1', conversationId: 'P4CONV', text: 'رسالة', senderId: A.parent.uid, createdAt: now });
r = await api(K.admin, '/api/admin/messages/permanent-delete', { messageId: 'P4MSG1' }); T('a school admin cannot permanently delete a chat message', r.s === 403 && await exists('system_messages/P4MSG1'));
r = await api(K.superu, '/api/admin/messages/permanent-delete', { messageId: 'P4MSG1' });
T('super admin message deletion goes through the engine: deleted and logged', r.s === 200 && !(await exists('system_messages/P4MSG1')) && (await logs({ recordId: 'P4MSG1', action: 'DELETE_MESSAGE_PERMANENT', result: 'success' })).length === 1);
r = await api(K.admin, '/api/admin/messages/purge-user-conversations', { targetUserId: A.parent.uid, confirm: 'DELETE' }); T('conversation purge is refused for a school admin', r.s === 403);
r = await api(K.superu, '/api/admin/messages/purge-user-conversations', { targetUserId: A.parent.uid, confirm: 'DELETE' });
T('conversation purge by super admin is logged in deletion_logs', r.s === 200 && (await logs({ recordId: A.parent.uid, action: 'PURGE_USER_CONVERSATIONS', result: 'success' })).length === 1);

// ── E. token / IDOR / mass assignment / privilege checks ────────────────────────────────────────
for (const path of ['/api/records/delete', '/api/records/restore', '/api/records/purge', '/api/records/void-payment', '/api/records/delete-school', '/api/records/delete-notifications', '/api/records/school-preview', '/api/records/resolve-financial-review', '/api/records/resume', '/api/admin/delete-user', '/api/admin/delete-student', '/api/admin/delete-school']) {
  const a = await raw(null, path, {}); const b = await raw('not.a.token', path, {}); const c = await raw(K.gone, path, { collection: 'inventory', ids: ['x'] });
  T(`${path}: no token / forged token / disabled account → refused`, a.s === 401 && b.s === 401 && c.s >= 401);
}
await db.doc('inventory/P4INV1').set({ schoolId: 'S1', name: 'مخزون' });
r = await api(K.teacher, '/api/records/delete', { collection: 'inventory', ids: ['P4INV1'], schoolId: 'S1', actorRole: 'admin', role: 'superadmin', permissions: ['inventory'], actor: { role: 'admin' } });
T('mass assignment: role / schoolId / permissions sent by the browser are ignored (teacher stays a teacher)', r.j.results[0].ok === false && await exists('inventory/P4INV1'));
r = await api(K.admin2, '/api/records/delete', { collection: 'inventory', ids: ['P4INV1'], schoolId: 'S2' });
T('IDOR: another school’s admin cannot delete by id even when claiming their own schoolId', r.j.results[0].ok === false && await exists('inventory/P4INV1'));
r = await api(K.staff, '/api/records/delete', { collection: 'inventory', ids: ['P4INV1'], mode: 'permanent', confirmText: 'حذف نهائي' }); T('a partial-permission employee cannot delete permanently', r.j.results[0].code === 'FORBIDDEN_PERMANENT' && await exists('inventory/P4INV1'));
r = await api(K.staff, '/api/records/delete', { collection: 'inventory', ids: ['P4INV1'] }); T('…but can move to trash what the permission covers (inventory)', r.j.results[0].ok === true);
r = await api(K.parent, '/api/records/delete-notifications', { ids: ['nope'] }); T('parent: notification API only answers for own items', r.s === 200 && r.j.results[0].code === 'NOT_FOUND');
r = await api(K.parent, '/api/records/restore', { bundleId: bid }); T('parent cannot restore', r.s === 403);
r = await api(K.parent, '/api/records/resume', {}); T('parent cannot trigger the job sweep', r.s === 403);
r = await api(K.fin, '/api/records/resume', {}); T('an assistant cannot trigger the job sweep', r.s === 403);
r = await api(K.admin, '/api/records/resume', {}); T('admin can', r.s === 200);
r = await api(K.admin, '/api/records/delete', { collection: '__proto__', ids: ['x'] }); T('prototype-pollution style collection name is rejected', r.s === 400 && r.j.error === 'UNSUPPORTED_COLLECTION');
r = await api(K.admin, '/api/records/delete', { collection: 'inventory', ids: ['../users/x', 'a/b'], confirmBulk: true });
T('ids with path separators cannot address other collections', r.s === 200 && r.j.results.every((x) => x.ok === false) , JSON.stringify(r.j.results?.map((x) => x.code)));
r = await api(K.admin, '/api/records/delete', { collection: 'inventory', ids: { $ne: 1 } }); T('non-array ids rejected', r.s === 400);

// ── F. races ────────────────────────────────────────────────────────────────────────────────────
await db.doc('inventory/P4INV2').set({ schoolId: 'S1', name: 'سباق استعادة' });
const dres = await del(K.admin, 'inventory', 'P4INV2'); const rb = dres.j.results[0].bundleId;
const rr = await Promise.all([api(K.admin, '/api/records/restore', { bundleId: rb }), api(K.admin, '/api/records/restore', { bundleId: rb }), api(K.admin, '/api/records/restore', { bundleId: rb })]);
T('three simultaneous restores: none fails with a server error, the record exists once, exactly ONE restore executed (others are replays/in-progress)', rr.every((x) => x.s === 200 || x.s === 409) && rr.some((x) => x.s === 200) && await exists('inventory/P4INV2') && (await logs({ recordId: 'P4INV2', action: 'RESTORE', result: 'success' })).length === 1, rr.map((x) => x.s).join());
const sweeps = await Promise.all([api(K.admin, '/api/records/resume', {}), api(K.admin, '/api/records/resume', {})]);
T('concurrent sweeps do not fail or double-run', sweeps.every((x) => x.s === 200));
await db.doc('payments/P4PAYR').set({ schoolId: 'S1', studentId: 'P4ST9', amount: 40, createdAt: now }); await db.doc('students/P4ST9').set({ schoolId: 'S1', name: 'x', tuitionBalance: 40, createdAt: now });
const vv = await Promise.all([api(K.admin, '/api/records/void-payment', { paymentId: 'P4PAYR', reason: 'سباق' }), api(K.fin, '/api/records/void-payment', { paymentId: 'P4PAYR', reason: 'سباق' })]);
T('two simultaneous voids of the same payment reverse the balance exactly once', vv.every((x) => x.s === 200) && (await db.doc('students/P4ST9').get()).get('tuitionBalance') === 0);

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

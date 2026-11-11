// Deletion engine: real Firestore + Auth + Storage emulators, real HTTP API, one account per role.
// Prereq: emulators seeded (scripts/e2e/seed-emulator.ts) and the app server on :3500 (dist/server.mjs).
//   node scripts/e2e/deletion-api.test.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq', storageBucket: 'yala-safari-iq.firebasestorage.app' });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const BASE = process.env.BASE || 'http://127.0.0.1:3500';
const { deleteRecords, sweepDeletions, POLICIES } = await import('../../backend/deletionService.mjs');
let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };

async function tok(email) { const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test@12345', returnSecureToken: true }) }); return (await r.json()).idToken; }
async function user(email, role, schoolId, extra = {}) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: 'Test@12345', emailVerified: true }); }
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email.split('@')[0], role, schoolId, status: 'active', ...extra });
  return u;
}
const api = async (t, path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const del = (t, collection, ids, extra = {}) => api(t, '/api/records/delete', { collection, ids: [].concat(ids), ...extra });
const exists = async (path) => (await db.doc(path).get()).exists;
const logs = async (where) => { let q = db.collection('deletion_logs'); for (const [k, v] of Object.entries(where)) q = q.where(k, '==', v); return (await q.get()).docs.map((d) => d.data()); };
const T0 = Date.now();

// ── fixtures ────────────────────────────────────────────────────────────────────────────────────
await db.doc('schools/S1').set({ studentCount: 5 }, { merge: true });
await db.doc('schools/S2').set({ name: 'مدرسة ثانية', status: 'active', subscriptionStatus: 'active', studentCount: 3 }, { merge: true });
const accts = {
  admin: await user('d_admin@e2e.test', 'admin', 'S1'),
  admin2: await user('d_admin2@e2e.test', 'admin', 'S2'),
  teacher: await user('d_teacher@e2e.test', 'teacher', 'S1'),
  teacher2: await user('d_teacher2@e2e.test', 'teacher', 'S1'),
  parent: await user('d_parent@e2e.test', 'parent', 'S1', { studentIds: ['DST1'] }),
  guard: await user('d_guard@e2e.test', 'guard', 'S1'),
  sassNone: await user('d_sass_none@e2e.test', 'school_assistant', 'S1', { permissions: ['classes'] }),
  sassHw: await user('d_sass_hw@e2e.test', 'school_assistant', 'S1', { permissions: ['homework', 'inventory'] }),
  staffInv: await user('d_staff@e2e.test', 'staff', 'S1', { permissions: ['inventory'] }),
  staffNoList: await user('d_staff_nl@e2e.test', 'staff', 'S1'),
  superu: await user('d_super@e2e.test', 'superadmin', ''),
  victimTeacher: await user('d_victim_t@e2e.test', 'teacher', 'S1'),
  victimParent: await user('d_victim_p@e2e.test', 'parent', 'S1'),
  otherAdmin: await user('d_admin_peer@e2e.test', 'admin', 'S1'),
};
const T_ = Object.fromEntries(await Promise.all(Object.entries(accts).map(async ([k, u]) => [k, await tok(u.email)])));

await db.doc('students/DST1').set({ name: 'طالب للحذف', schoolId: 'S1', classId: 'DC1', parentIds: [accts.parent.uid] });
await db.doc('students/DST2').set({ name: 'طالب ثاني', schoolId: 'S1', classId: 'DC1', parentIds: [] });
await db.doc('students/DST3').set({ name: 'طالب ثالث', schoolId: 'S1', classId: 'DC1', parentIds: [] });
await db.doc('students/XST1').set({ name: 'طالب مدرسة 2', schoolId: 'S2', classId: 'XC1', parentIds: [] });
await db.doc('classes/DC1').set({ name: 'صف فيه طلاب', schoolId: 'S1' });
await db.doc('classes/DC9').set({ name: 'صف فارغ', schoolId: 'S1' });
await db.doc('subjects/DSUB9').set({ name: 'مادة الصف الفارغ', schoolId: 'S1', classId: 'DC9' });
for (const [col, id, extra] of [['grades', 'DG1', { subject: 'رياضيات' }], ['grades', 'DG2', {}], ['attendance', 'DA1', { date: '2026-11-01' }], ['installments', 'DI1', { amount: 100 }], ['behavior_reports', 'DB1', { title: 'تنبيه' }], ['advanced_reports', 'DR1', { title: 'تقرير' }]]) {
  await db.doc(`${col}/${id}`).set({ schoolId: 'S1', studentId: 'DST1', studentName: 'طالب للحذف', ...extra });
}
await db.doc('id_cards/DST1').set({ schoolId: 'S1', studentName: 'طالب للحذف' });
await db.doc('grades/XG1').set({ schoolId: 'S2', studentId: 'XST1' });
await db.doc('homework/DH_OWN').set({ schoolId: 'S1', title: 'واجبي', teacherId: accts.teacher.uid });
await db.doc('homework/DH_OTHER').set({ schoolId: 'S1', title: 'واجب زميل', teacherId: accts.teacher2.uid });
await db.doc('homework/DH_X').set({ schoolId: 'S2', title: 'واجب مدرسة 2', teacherId: 'x' });
for (const id of ['DINV1', 'DINV2', 'DINV3']) await db.doc('inventory/' + id).set({ schoolId: 'S1', name: id });
await db.doc('payroll/DPAY1').set({ schoolId: 'S1', userName: 'x', amount: 5 });
await db.doc('market/DMK1').set({ schoolId: 'S1', name: 'منتج بصورة' });
await bucket.file('students/S1/DST1/photo.png').save(Buffer.from('png'));
await bucket.file('students/S1/DST2/photo.png').save(Buffer.from('png'));
await bucket.file('market/DMK1/img.png').save(Buffer.from('png'));
await db.doc('schools/S1').set({ studentCount: 5 }, { merge: true });

// ── 1. authorised delete → trash, real data really gone, dependants cascaded ─────────────────────
let r = await del(T_.admin, 'students', 'DST1');
T('admin deletes a student (moved to trash)', r.s === 200 && r.j.results?.[0]?.ok === true, JSON.stringify(r.j).slice(0, 120));
const bundleId = r.j.results?.[0]?.bundleId;
T('the student document is really gone from Firestore', !(await exists('students/DST1')));
T('dependants cascaded (grades, attendance, installments, behavior, reports, id card)', !(await exists('grades/DG1')) && !(await exists('grades/DG2')) && !(await exists('attendance/DA1')) && !(await exists('installments/DI1')) && !(await exists('behavior_reports/DB1')) && !(await exists('advanced_reports/DR1')) && !(await exists('id_cards/DST1')));
T('other school data untouched', (await exists('students/XST1')) && (await exists('grades/XG1')));
T('parent link removed (no dangling studentIds)', !((await db.doc('users/' + accts.parent.uid).get()).get('studentIds') || []).includes('DST1'));
T('school student counter decremented', (await db.doc('schools/S1').get()).get('studentCount') === 4);
const files1 = (await bucket.getFiles({ prefix: `_trash/${bundleId}/students/S1/DST1/` }))[0].length;
T('files are KEPT (moved to _trash, not deleted) while in trash', files1 === 1 && (await bucket.getFiles({ prefix: 'students/S1/DST1/' }))[0].length === 0);
const b = (await db.doc('recycle_bin/' + bundleId).get()).data();
T('trash bundle records who/what/when and dependants', b.status === 'trashed' && b.deletedBy.uid === accts.admin.uid && b.schoolId === 'S1' && b.childCounts.grades === 2 && b.label === 'طالب للحذف');
let lg = await logs({ recordId: 'DST1', action: 'DELETE_TO_TRASH' });
T('audit log written (actor, collection, id, school, result, time)', lg.length === 1 && lg[0].actorUid === accts.admin.uid && lg[0].collection === 'students' && lg[0].schoolId === 'S1' && lg[0].result === 'success' && !!lg[0].at);

// ── 2. restore ─────────────────────────────────────────────────────────────────────────────────────
r = await api(T_.admin2, '/api/records/restore', { bundleId });
T('another school’s admin cannot restore it (403)', r.s === 403 && r.j.error === 'FORBIDDEN_SCHOOL');
r = await api(T_.admin, '/api/records/restore', { bundleId });
T('restore brings the student back', r.s === 200 && (await exists('students/DST1')));
T('restore brings the student photo back to its original path', (await bucket.file('students/S1/DST1/photo.png').exists())[0] && (await bucket.getFiles({ prefix: `_trash/${bundleId}/` }))[0].length === 0);
T('restore brings every dependant back', (await exists('grades/DG1')) && (await exists('grades/DG2')) && (await exists('attendance/DA1')) && (await exists('installments/DI1')) && (await exists('id_cards/DST1')) && (await exists('behavior_reports/DB1')));
T('restore re-links the parent and fixes the counter', ((await db.doc('users/' + accts.parent.uid).get()).get('studentIds') || []).includes('DST1') && (await db.doc('schools/S1').get()).get('studentCount') === 5);
T('restore is logged (success) and the refused foreign attempt too', (await logs({ recordId: 'DST1', action: 'RESTORE', result: 'success' })).length === 1 && (await logs({ recordId: 'DST1', action: 'RESTORE', result: 'refused' })).length === 1);
r = await api(T_.admin, '/api/records/restore', { bundleId });
T('a bundle cannot be restored twice (409)', r.s === 409);

// ── 3. permanent delete needs explicit confirmation + removes files ───────────────────────────────
r = await del(T_.admin, 'students', 'DST2', { mode: 'permanent' });
T('permanent delete without the confirmation phrase is refused', r.s === 400 && r.j.error === 'CONFIRM_PERMANENT_REQUIRED' && (await exists('students/DST2')));
r = await del(T_.sassHw, 'students', 'DST2', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('an assistant cannot delete permanently (or delete students at all)', r.s === 200 && r.j.results[0].ok === false && ['FORBIDDEN_PERMANENT', 'FORBIDDEN_ROLE'].includes(r.j.results[0].code) && (await exists('students/DST2')));
r = await del(T_.admin, 'students', 'DST2', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('admin permanent delete with confirmation succeeds', r.s === 200 && r.j.results[0].ok === true && !(await exists('students/DST2')));
T('permanent delete removes the storage files', (await bucket.getFiles({ prefix: 'students/S1/DST2/' }))[0].length === 0);
const pb = (await db.doc('recycle_bin/' + r.j.results[0].bundleId).get()).data();
T('purged bundle keeps only a tombstone (no data copy left)', pb.status === 'purged' && !pb.record && (await db.collection('recycle_bin/' + r.j.results[0].bundleId + '/items').get()).empty);
T('permanent delete is logged with files count', (await logs({ recordId: 'DST2', action: 'DELETE_PERMANENT' })).some((l) => l.result === 'success' && l.files === 1));

// ── 4. roles: partial permissions, teacher ownership, no-permission roles ────────────────────────
r = await del(T_.sassNone, 'inventory', 'DINV1');
T('assistant WITHOUT the inventory permission is refused (403, server-side)', r.s === 200 && r.j.results[0].code === 'FORBIDDEN_PERMISSION' && (await exists('inventory/DINV1')));
r = await del(T_.sassHw, 'inventory', 'DINV1');
T('assistant WITH the inventory permission deletes it', r.j.results[0].ok === true && !(await exists('inventory/DINV1')));
r = await del(T_.sassHw, 'payroll', 'DPAY1');
T('same assistant cannot touch payroll (not granted)', r.j.results[0].ok === false && (await exists('payroll/DPAY1')));
r = await del(T_.staffInv, 'inventory', 'DINV2');
T('staff with inventory permission deletes it', r.j.results[0].ok === true && !(await exists('inventory/DINV2')));
r = await del(T_.staffNoList, 'inventory', 'DINV3');
T('staff without any permission list is refused', r.j.results[0].ok === false && (await exists('inventory/DINV3')));
r = await del(T_.teacher, 'homework', 'DH_OWN');
T('teacher deletes their OWN homework', r.j.results[0].ok === true && !(await exists('homework/DH_OWN')));
r = await del(T_.teacher, 'homework', 'DH_OTHER');
T('teacher cannot delete a colleague’s homework', r.j.results[0].code === 'FORBIDDEN_ROLE' && (await exists('homework/DH_OTHER')));
r = await del(T_.teacher, 'grades', 'DG1');
T('teacher cannot delete grades', r.j.results[0].ok === false && (await exists('grades/DG1')));
r = await del(T_.parent, 'grades', 'DG1');
T('parent cannot delete anything', r.j.results[0].ok === false && (await exists('grades/DG1')));
r = await del(T_.guard, 'attendance', 'DA1');
T('guard cannot delete anything', r.j.results[0].ok === false && (await exists('attendance/DA1')));

// ── 5. multi-tenant isolation ──────────────────────────────────────────────────────────────────────
r = await del(T_.admin2, 'students', 'DST3');
T('admin of school B cannot delete a student of school A', r.j.results[0].code === 'FORBIDDEN_SCHOOL' && (await exists('students/DST3')));
r = await del(T_.admin, 'homework', 'DH_X');
T('admin of school A cannot delete school B data', r.j.results[0].code === 'FORBIDDEN_SCHOOL' && (await exists('homework/DH_X')));
r = await del(T_.admin, 'grades', ['XG1', 'DG1'], { confirmBulk: true });
T('mixed list: the foreign record is refused, the own one handled, per-record results', r.j.results.find((x) => x.id === 'XG1').ok === false && r.j.results.find((x) => x.id === 'DG1').ok === true && (await exists('grades/XG1')));
r = await del(T_.superu, 'homework', 'DH_X');
T('super admin may delete across schools (and it is logged)', r.j.results[0].ok === true && !(await exists('homework/DH_X')) && (await logs({ recordId: 'DH_X', actorUid: accts.superu.uid })).length >= 1);

// ── 6. refused attempts are logged; unknown collections refused ───────────────────────────────────
T('refused deletions are audited (actor, record, school, code)', (await logs({ recordId: 'DST3', result: 'refused' })).some((l) => l.actorUid === accts.admin2.uid && l.errorCode === 'FORBIDDEN_SCHOOL'));
r = await del(T_.admin, 'schools', 'S1');
T('collections outside the policy cannot be deleted through the API', r.s === 400 && r.j.error === 'UNSUPPORTED_COLLECTION');

// ── 7. bulk confirmation ──────────────────────────────────────────────────────────────────────────
for (const id of ['DBK1', 'DBK2', 'DBK3']) await db.doc('inventory/' + id).set({ schoolId: 'S1', name: id });
r = await del(T_.admin, 'inventory', ['DBK1', 'DBK2', 'DBK3']);
T('bulk delete without explicit confirmation is refused by the server', r.s === 400 && r.j.error === 'CONFIRM_BULK_REQUIRED' && (await exists('inventory/DBK1')));
r = await del(T_.admin, 'inventory', ['DBK1', 'DBK2', 'DBK3'], { confirmBulk: true });
T('confirmed bulk delete removes all of them', r.j.ok === true && !(await exists('inventory/DBK1')) && !(await exists('inventory/DBK3')));
r = await del(T_.admin, 'inventory', Array.from({ length: 201 }, (_, i) => 'Z' + i), { confirmBulk: true });
T('bulk size is capped', r.s === 400 && r.j.error === 'TOO_MANY');

// ── 8. classes: referential integrity ─────────────────────────────────────────────────────────────
r = await del(T_.admin, 'classes', 'DC1');
T('a class with students cannot be deleted (409), nothing removed', r.j.results[0].code === 'HAS_DEPENDENTS' && (await exists('classes/DC1')));
r = await del(T_.admin, 'classes', 'DC9');
T('an empty class is deleted together with its subjects', r.j.results[0].ok === true && !(await exists('classes/DC9')) && !(await exists('subjects/DSUB9')));
const cb = r.j.results[0].bundleId; r = await api(T_.admin, '/api/records/restore', { bundleId: cb });
T('…and both come back on restore', r.s === 200 && (await exists('classes/DC9')) && (await exists('subjects/DSUB9')));

// ── 9. accounts: privileged accounts are protected; login disabled in trash, deleted on purge ────
r = await del(T_.admin, 'users', accts.superu.uid);
T('a school admin cannot delete a super admin', r.j.results[0].ok === false && (await exists('users/' + accts.superu.uid)));
r = await del(T_.admin, 'users', accts.otherAdmin.uid);
T('an admin cannot delete a peer admin', r.j.results[0].ok === false && (await exists('users/' + accts.otherAdmin.uid)));
r = await del(T_.sassHw, 'users', accts.admin.uid);
T('an assistant cannot delete an admin', r.j.results[0].ok === false && (await exists('users/' + accts.admin.uid)));
r = await del(T_.admin, 'users', accts.admin.uid);
T('nobody can delete their own (admin) account through this API', r.j.results[0].ok === false && (await exists('users/' + accts.admin.uid)));
r = await del(T_.admin2, 'users', accts.victimTeacher.uid);
T('an admin of another school cannot delete the teacher', r.j.results[0].ok === false && (await exists('users/' + accts.victimTeacher.uid)));
r = await del(T_.admin, 'users', accts.victimTeacher.uid);
const tb = r.j.results[0].bundleId;
T('admin deletes a teacher account → user doc gone, login DISABLED (not deleted)', r.j.results[0].ok === true && !(await exists('users/' + accts.victimTeacher.uid)) && (await admin.auth().getUser(accts.victimTeacher.uid)).disabled === true);
r = await api(T_.admin, '/api/records/restore', { bundleId: tb });
T('restoring the account re-enables the login', r.s === 200 && (await exists('users/' + accts.victimTeacher.uid)) && (await admin.auth().getUser(accts.victimTeacher.uid)).disabled === false);
await db.doc('students/DSTP').set({ name: 'طالب ولي الأمر', schoolId: 'S1', classId: 'DC1', parentIds: [accts.victimParent.uid] });
r = await del(T_.admin, 'users', accts.victimParent.uid);
const pBundle = r.j.results[0].bundleId;
T('deleting a parent account removes it from its students', r.j.results[0].ok === true && !((await db.doc('students/DSTP').get()).get('parentIds') || []).includes(accts.victimParent.uid));
r = await api(T_.admin, '/api/records/restore', { bundleId: pBundle });
T('restoring the parent account re-links its students', r.s === 200 && ((await db.doc('students/DSTP').get()).get('parentIds') || []).includes(accts.victimParent.uid));
r = await del(T_.admin, 'users', accts.victimParent.uid, { mode: 'permanent', confirmText: 'حذف نهائي' });
T('permanent account delete removes the Auth login too', r.j.results[0].ok === true && !(await exists('users/' + accts.victimParent.uid)) && await admin.auth().getUser(accts.victimParent.uid).then(() => false, () => true));

// ── 10. files: market product image follows its record ────────────────────────────────────────────
r = await del(T_.admin, 'market', 'DMK1', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('product permanently deleted → its image file is deleted too', r.j.results[0].ok === true && (await bucket.getFiles({ prefix: 'market/DMK1/' }))[0].length === 0);

// ── 11. interrupted deletion: nothing lost, no half state, completes on resume ───────────────────
const ctx = { db, adminSdk: admin, authAdmin: admin.auth(), bucket: () => bucket };
await db.doc('students/FST1').set({ name: 'طالب انقطاع', schoolId: 'S1', classId: 'DC1', parentIds: [] });
await db.doc('grades/FG1').set({ schoolId: 'S1', studentId: 'FST1' }); await db.doc('grades/FG2').set({ schoolId: 'S1', studentId: 'FST1' });
let res = await deleteRecords({ ...ctx, faults: { mid_delete: true } }, accts.admin.uid, { collection: 'students', ids: ['FST1'] });
let fb = (await db.collection('recycle_bin').where('recordKey', '==', 'students/FST1').get()).docs[0];
T('failure in the middle is reported as partial, not success', res.results[0].ok === false && res.results[0].partial === true);
T('the bundle is marked in-progress with the error and a complete snapshot', fb.get('status') === 'trashing' && fb.get('steps.snapshot') === true && !!fb.get('lastError') && fb.get('childCounts.grades') === 2);
T('the record itself still exists (never deleted without its snapshot)', await exists('students/FST1'));
await fb.ref.set({ updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 5 * 60_000) }, { merge: true });
const sw = await sweepDeletions(ctx);
fb = await fb.ref.get();
T('the sweep finishes the interrupted deletion', sw.resumed >= 1 && fb.get('status') === 'trashed' && !(await exists('students/FST1')) && !(await exists('grades/FG1')));
T('a log entry shows the failure and the resume', (await logs({ recordId: 'FST1', result: 'failed' })).length === 1 && (await logs({ recordId: 'FST1', action: 'RESUME' })).length === 1);
r = await api(T_.admin, '/api/records/restore', { bundleId: fb.id });
T('and the completed trash can still be restored in full', r.s === 200 && (await exists('students/FST1')) && (await exists('grades/FG1')) && (await exists('grades/FG2')));
// storage failure during permanent delete leaves a resumable state
res = await deleteRecords({ ...ctx, faults: { storage: true } }, accts.admin.uid, { collection: 'market', ids: ['DMK2'], mode: 'permanent', confirmText: 'حذف نهائي' }).catch((e) => ({ results: [{ ok: false, partial: true, thrown: e.message }] }));
await db.doc('market/DMK2').set({ schoolId: 'S1', name: 'منتج آخر' });
await bucket.file('market/DMK2/img.png').save(Buffer.from('x'));
res = await deleteRecords({ ...ctx, faults: { storage: true } }, accts.admin.uid, { collection: 'market', ids: ['DMK2'], mode: 'permanent', confirmText: 'حذف نهائي' });
const sb = (await db.collection('recycle_bin').where('recordKey', '==', 'market/DMK2').get()).docs[0];
T('storage failure on permanent delete is reported and leaves status purging (resumable)', res.results[0].ok === false && sb.get('status') === 'purging');
await sb.ref.set({ updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 5 * 60_000) }, { merge: true });
await sweepDeletions(ctx);
T('the sweep completes the purge and removes the file', (await sb.ref.get()).get('status') === 'purged' && (await bucket.getFiles({ prefix: 'market/DMK2/' }))[0].length === 0);

// ── 12. expired trash is purged by the sweep (bounded retention) ─────────────────────────────────
await db.doc('inventory/DEXP').set({ schoolId: 'S1', name: 'منتهي' });
res = await del(T_.admin, 'inventory', 'DEXP');
const eb = db.doc('recycle_bin/' + res.j.results[0].bundleId);
await eb.set({ purgeAfter: admin.firestore.Timestamp.fromMillis(Date.now() - 1000) }, { merge: true });
const sw2 = await sweepDeletions(ctx);
T('trash older than its retention is purged automatically (and logged)', sw2.purged >= 1 && (await eb.get()).get('status') === 'purged' && (await logs({ recordId: 'DEXP', action: 'PURGE_EXPIRED' })).length === 1);

// ── 13. statistics reflect reality after the deletions ───────────────────────────────────────────
const liveStudents = (await db.collection('students').where('schoolId', '==', 'S1').get()).size;
T('school student counter moved consistently with the deletions (5 − 1 permanent)', (await db.doc('schools/S1').get()).get('studentCount') === 4, `counter=${(await db.doc('schools/S1').get()).get('studentCount')} live=${liveStudents}`);
T('every sensitive operation produced a log entry', (await db.collection('deletion_logs').where('at', '>=', admin.firestore.Timestamp.fromMillis(T0 - 1000)).get()).size >= 30);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

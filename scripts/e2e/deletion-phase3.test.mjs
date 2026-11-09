// School deletion job, registrations/requests, notifications, storage rules.   node scripts/e2e/deletion-phase3.test.mjs
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
const { deleteSchool, restoreBundle, sweepDeletions } = await import('../../backend/deletionService.mjs');
let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
const login = async (email) => (await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test@12345', returnSecureToken: true }) })).json()).idToken;
async function user(email, role, schoolId, extra = {}) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: 'Test@12345', emailVerified: true }); }
  await admin.auth().updateUser(u.uid, { disabled: false });
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email.split('@')[0], role, schoolId, status: 'active', ...extra });
  return u;
}
const api = async (t, path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const exists = async (p) => (await db.doc(p).get()).exists;
const fexists = async (p) => (await bucket.file(p).exists())[0];
const bundle = async (id) => (await db.doc('recycle_bin/' + id).get()).data();
const count = async (col, sid) => (await db.collection(col).where('schoolId', '==', sid).get()).size;
const ctx = { db, adminSdk: admin, authAdmin: admin.auth(), bucket: () => bucket, canActorDeleteUser: () => true };

const SID = 'SCH_DEL', OID = 'SCH_OTHER';
await db.doc(`schools/${SID}`).set({ name: 'مدرسة للحذف', status: 'active', studentCount: 2 });
await db.doc(`schools/${OID}`).set({ name: 'مدرسة أخرى', status: 'active', studentCount: 1 });
const U = {
  superu: await user('super@e2e.test', 'superadmin', ''),
  admin: await user('p3_admin@e2e.test', 'admin', SID),
  adminO: await user('p3_adminO@e2e.test', 'admin', OID),
  teacher: await user('p3_teacher@e2e.test', 'teacher', SID),
  parent: await user('p3_parent@e2e.test', 'parent', SID),
  shared: await user('p3_shared@e2e.test', 'teacher', SID, { schoolIds: [SID, OID] }),
  otherParent: await user('p3_oparent@e2e.test', 'parent', OID),
  platformSuper: await user('p3_super3@e2e.test', 'superadmin', SID), // a super admin account that happens to carry the schoolId
};
await admin.auth().setCustomUserClaims(U.adminO.uid, { role: 'admin', schoolId: OID });
await admin.auth().setCustomUserClaims(U.superu.uid, { role: 'superadmin' });
await admin.auth().setCustomUserClaims(U.otherParent.uid, { role: 'parent', schoolId: OID });
const K = {}; for (const [k, v] of Object.entries(U)) K[k] = await login(v.email);
const now = admin.firestore.Timestamp.now();
for (const [col, n] of [['students', 3], ['classes', 2], ['grades', 4], ['attendance', 5], ['payments', 2], ['installments', 2], ['homework', 2], ['inventory', 1], ['notifications', 3]]) {
  for (let i = 0; i < n; i++) await db.doc(`${col}/D_${col}_${i}`).set({ schoolId: SID, name: `${col}${i}`, studentId: 'D_students_0', createdAt: now, userId: U.parent.uid });
}
await db.doc('students/O_STUDENT').set({ schoolId: OID, name: 'طالب مدرسة أخرى', createdAt: now });
await db.doc('grades/O_GRADE').set({ schoolId: OID, studentId: 'O_STUDENT' });
await db.doc('audit_logs/D_AUDIT1').set({ schoolId: SID, action: 'x', actorId: 'a' });
await bucket.file(`schools/${SID}/logo/logo_1.png`).save(Buffer.from('l'));
await bucket.file(`students/${SID}/D_students_0/photo_1.png`).save(Buffer.from('p'));
await bucket.file(`schools/${OID}/logo/logo_2.png`).save(Buffer.from('o'));
const full = (extra = {}) => ({ schoolId: SID, confirmSchoolId: SID, confirmName: 'مدرسة للحذف', confirmText: 'حذف المدرسة', ...extra });

// ── authorisation + confirmations ─────────────────────────────────────────────────────────────
let r = await api(K.admin, '/api/records/delete-school', full());
T('a school admin cannot delete their own school', r.s === 403 && await exists(`schools/${SID}`));
r = await api(K.teacher, '/api/records/delete-school', full()); T('teacher refused', r.s === 403);
r = await api(K.adminO, '/api/records/school-preview', { schoolId: SID }); T('preview is super-admin only', r.s === 403);
r = await api(K.superu, '/api/records/delete-school', full({ confirmName: 'اسم خاطئ' })); T('wrong school name → refused, nothing deleted', r.s === 400 && r.j.error === 'CONFIRM_NAME_REQUIRED' && await exists(`schools/${SID}`) && (await count('students', SID)) === 3);
r = await api(K.superu, '/api/records/delete-school', full({ confirmText: '' })); T('missing confirmation phrase → refused', r.s === 400 && r.j.error === 'CONFIRM_TEXT_REQUIRED');
r = await api(K.superu, '/api/records/delete-school', full({ confirmSchoolId: 'x' })); T('wrong school id confirmation → refused', r.s === 400 && r.j.error === 'CONFIRM_SCHOOL_REQUIRED');
r = await api(K.superu, '/api/records/delete-school', full({ mode: 'permanent' })); T('permanent mode needs its own separate written confirmation', r.s === 400 && r.j.error === 'CONFIRM_PERMANENT_REQUIRED' && await exists(`schools/${SID}`));
const pv = await api(K.superu, '/api/records/school-preview', { schoolId: SID });
T('preview reports counts, accounts, shared accounts, files — before anything runs', pv.s === 200 && pv.j.counts.students === 3 && pv.j.counts.grades === 4 && pv.j.counts.payments === 2 && pv.j.sharedAccounts === 1 && pv.j.protectedAccounts === 1 && pv.j.accounts >= 3 && pv.j.files === 2 && (await count('students', SID)) === 3);

// ── interrupted job → resumed ─────────────────────────────────────────────────────────────────
let err = null;
try { await deleteSchool({ ...ctx, faults: { school_mid: 'grades' } }, U.superu.uid, full()); } catch (e) { err = e; }
let bk = (await db.collection('recycle_bin').where('recordKey', '==', `schools/${SID}`).get()).docs[0];
T('server interruption mid-job: partial state recorded (PARTIALLY_COMPLETED), school record still present', !!err && bk.get('jobStatus') === 'PARTIALLY_COMPLETED' && bk.get('status') === 'trashing' && await exists(`schools/${SID}`) && (await count('payments', SID)) === 0 && (await count('grades', SID)) === 4);
await bk.ref.set({ updatedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 7200_000) }, { merge: true });
const sw = await sweepDeletions(ctx);
bk = await bk.ref.get();
T('the sweep resumes from the checkpoints and completes the job', sw.resumed === 1 && bk.get('status') === 'trashed' && bk.get('jobStatus') === 'COMPLETED');
T('every school-scoped collection is empty for that school', (await Promise.all(['students', 'classes', 'grades', 'attendance', 'payments', 'installments', 'homework', 'inventory', 'notifications'].map((c) => count(c, SID)))).every((n) => n === 0) && !(await exists(`schools/${SID}`)));
T('bundle counts match the preview (nothing lost, nothing double counted)', bk.get('childCounts.students') === 3 && bk.get('childCounts.grades') === 4 && bk.get('childCounts.payments') === 2 && bk.get('childCounts.attendance') === 5);
T('the OTHER school is completely untouched', (await exists(`schools/${OID}`)) && (await exists('students/O_STUDENT')) && (await exists('grades/O_GRADE')) && (await fexists(`schools/${OID}/logo/logo_2.png`)));
T('audit logs of the school are retained (never deleted)', await exists('audit_logs/D_AUDIT1'));
T('school logins disabled (not deleted); super admin account carrying the school id untouched', (await admin.auth().getUser(U.teacher.uid)).disabled === true && (await admin.auth().getUser(U.parent.uid)).disabled === true && (await admin.auth().getUser(U.platformSuper.uid)).disabled === false && await exists('users/' + U.platformSuper.uid));
const sh = await db.doc('users/' + U.shared.uid).get();
T('an account shared with another school is NOT deleted: it only leaves this school', sh.exists && sh.get('schoolId') === OID && (sh.get('schoolIds') || []).join() === OID && (await admin.auth().getUser(U.shared.uid)).disabled === false);
T('files moved to _trash, school files gone from live paths, other school’s file kept', !(await fexists(`schools/${SID}/logo/logo_1.png`)) && !(await fexists(`students/${SID}/D_students_0/photo_1.png`)) && await fexists(`_trash/${bk.id}/schools/${SID}/logo/logo_1.png`));
T('the interrupted request is logged as failed and the resume as success (system actor); nothing is silent', (await db.collection('deletion_logs').where('recordId', '==', SID).where('action', '==', 'DELETE_SCHOOL').where('result', '==', 'failed').get()).size === 1 && (await db.collection('deletion_logs').where('recordId', '==', SID).where('action', '==', 'RESUME').where('result', '==', 'success').get()).size === 1 && (await db.collection('deletion_logs').where('recordId', '==', SID).where('action', '==', 'DELETE_SCHOOL').where('actorUid', '==', U.superu.uid).get()).size >= 1);
r = await api(K.superu, '/api/records/delete-school', full());
T('repeating the request does not run twice (school no longer exists → 404)', r.s === 404);

// ── restore (resumable, with files) ───────────────────────────────────────────────────────────
r = await api(K.adminO, '/api/records/restore', { bundleId: bk.id }); T('only a super admin can restore a school', r.s === 403);
let rerr = null; try { await restoreBundle({ ...ctx, faults: { fileRestore: 'logo_1' } }, U.superu.uid, bk.id); } catch (e) { rerr = e; }
T('restore with a failing file is reported INCOMPLETE (not success), data already back', rerr?.code === 'RESTORE_INCOMPLETE' && (await bundle(bk.id)).status === 'restoring' && await exists(`schools/${SID}`) && (await count('grades', SID)) === 4);
r = await api(K.superu, '/api/records/restore', { bundleId: bk.id });
T('retry completes the restore: all records, accounts enabled, files back', r.s === 200 && (await bundle(bk.id)).jobStatus === 'RESTORED' && (await count('students', SID)) === 3 && (await count('payments', SID)) === 2 && (await count('attendance', SID)) === 5 && (await admin.auth().getUser(U.teacher.uid)).disabled === false && await fexists(`schools/${SID}/logo/logo_1.png`) && await fexists(`students/${SID}/D_students_0/photo_1.png`));
T('the shared account is back in both schools', (await db.doc('users/' + U.shared.uid).get()).get('schoolIds').sort().join() === [OID, SID].sort().join() && (await db.doc('users/' + U.shared.uid).get()).get('schoolId') === SID);
T('restored counts equal the originals', (await count('grades', SID)) === 4 && (await count('classes', SID)) === 2 && (await count('homework', SID)) === 2 && (await count('notifications', SID)) === 3);

// ── permanent ─────────────────────────────────────────────────────────────────────────────────
r = await api(K.superu, '/api/records/delete-school', full({ mode: 'permanent', confirmPermanentText: 'حذف نهائي' }));
const pb = r.j.bundleId && await bundle(r.j.bundleId);
T('permanent school deletion (separate confirmation): purged, accounts and files really gone', r.s === 200 && pb.jobStatus === 'PERMANENTLY_DELETED' && !(await exists(`schools/${SID}`)) && await admin.auth().getUser(U.teacher.uid).then(() => false, () => true) && !(await fexists(`_trash/${r.j.bundleId}/schools/${SID}/logo/logo_1.png`)));
T('…while the other school and the shared account survive', (await exists(`schools/${OID}`)) && (await exists('users/' + U.shared.uid)) && (await exists('users/' + U.otherParent.uid)) && (await exists('audit_logs/D_AUDIT1')));

// ── registrations / subscription requests ─────────────────────────────────────────────────────
await db.doc('registrations/REG_PENDING').set({ status: 'pending', schoolName: 'تحت المراجعة' });
await db.doc('registrations/REG_REJECTED').set({ status: 'rejected', schoolName: 'مرفوض' });
await db.doc('registrations/REG_APPROVED').set({ status: 'approved', schoolName: 'معتمد' });
await db.doc('subscriptionRequests/SUB_APPROVED').set({ status: 'approved', schoolName: 'اشتراك معتمد' });
const del = (t, col, id, x = {}) => api(t, '/api/records/delete', { collection: col, ids: [id], ...x });
r = await del(K.superu, 'registrations', 'REG_APPROVED'); T('an APPROVED registration is a decision record: never deleted', r.j.results[0].code === 'FINANCIAL_RECORD_PROTECTED' && await exists('registrations/REG_APPROVED'));
r = await del(K.superu, 'subscriptionRequests', 'SUB_APPROVED', { mode: 'permanent', confirmText: 'حذف نهائي' }); T('…also approved subscription requests, even permanently', r.j.results[0].ok === false && await exists('subscriptionRequests/SUB_APPROVED'));
r = await del(K.adminO, 'registrations', 'REG_REJECTED'); T('a school admin cannot delete registration requests', r.j.results[0].ok === false && await exists('registrations/REG_REJECTED'));
r = await del(K.superu, 'registrations', 'REG_REJECTED'); T('super admin deletes a REJECTED request (to trash, logged)', r.j.results[0].ok === true && !(await exists('registrations/REG_REJECTED')));
r = await api(K.superu, '/api/records/restore', { bundleId: r.j.results[0].bundleId }); T('…and can restore it', r.s === 200 && await exists('registrations/REG_REJECTED'));

// ── notifications ─────────────────────────────────────────────────────────────────────────────
await db.doc('notifications/N_OWN').set({ schoolId: OID, userId: U.otherParent.uid, title: 'لي' });
await db.doc('notifications/N_OTHER').set({ schoolId: OID, userId: 'someone-else', title: 'لغيري' });
await db.doc('notifications/N_FOREIGN_SCHOOL').set({ schoolId: SID, userId: 'x', title: 'مدرسة أخرى' });
r = await api(K.otherParent, '/api/records/delete-notifications', { ids: ['N_OWN', 'N_OTHER', 'N_FOREIGN_SCHOOL', 'N_MISSING'] });
const byId = Object.fromEntries(r.j.results.map((x) => [x.id, x]));
T('a user deletes only their OWN notification; others’ and other schools’ are refused', byId.N_OWN.ok && !(await exists('notifications/N_OWN')) && byId.N_OTHER.code === 'FORBIDDEN_OWNER' && byId.N_FOREIGN_SCHOOL.code === 'FORBIDDEN_OWNER' && byId.N_MISSING.code === 'NOT_FOUND' && await exists('notifications/N_OTHER') && await exists('notifications/N_FOREIGN_SCHOOL'));
T('notification deletion is logged', (await db.collection('deletion_logs').where('action', '==', 'DELETE_NOTIFICATIONS').where('actorUid', '==', U.otherParent.uid).get()).size === 1);
await db.doc('homework/HW_N').set({ schoolId: OID, title: 'واجب', classId: 'c', teacherId: U.adminO.uid });
await db.doc('notifications/N_HW').set({ schoolId: OID, userId: U.otherParent.uid, metadata: { sourceId: 'HW_N' } });
r = await del(K.adminO, 'homework', 'HW_N'); const hb = r.j.results[0].bundleId;
T('deleting a homework removes the notifications that point at it', r.j.results[0].ok && !(await exists('notifications/N_HW')));
r = await api(K.adminO, '/api/records/restore', { bundleId: hb }); T('…and restores them with it', r.s === 200 && await exists('notifications/N_HW') && await exists('homework/HW_N'));

// ── storage rules: a signed-in client can write but never delete ─────────────────────────────
const sObj = (p) => `http://127.0.0.1:9199/v0/b/${BUCKET}/o/${encodeURIComponent(p)}`;
await bucket.file(`students/${OID}/O_STUDENT/photo_9.png`).save(Buffer.from('x'));
await bucket.file(`schools/${OID}/store/products/9-a.png`).save(Buffer.from('x'));
for (const [who, t] of [['school admin', K.adminO], ['super admin', K.superu], ['teacher/parent', K.otherParent]]) {
  const a = await fetch(sObj(`students/${OID}/O_STUDENT/photo_9.png`), { method: 'DELETE', headers: { Authorization: 'Firebase ' + t } });
  const b = await fetch(sObj(`schools/${OID}/store/products/9-a.png`), { method: 'DELETE', headers: { Authorization: 'Firebase ' + t } });
  T(`${who}: direct Storage DELETE is refused (files only leave through the server engine)`, a.status >= 400 && b.status >= 400 && await fexists(`students/${OID}/O_STUDENT/photo_9.png`) && await fexists(`schools/${OID}/store/products/9-a.png`), `${a.status}/${b.status}`);
}
const up = await fetch(`http://127.0.0.1:9199/v0/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(`schools/${OID}/store/products/10-new.png`)}`, { method: 'POST', headers: { Authorization: 'Firebase ' + K.adminO, 'Content-Type': 'image/png' }, body: Buffer.from('new') });
T('…while uploading still works for the school admin (no regression)', up.status === 200 && await fexists(`schools/${OID}/store/products/10-new.png`), String(up.status));
const trashRead = await fetch(sObj(`_trash/${hb}/x`), { headers: { Authorization: 'Firebase ' + K.superu } });
T('the _trash area is not readable by any client', trashRead.status >= 400);

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

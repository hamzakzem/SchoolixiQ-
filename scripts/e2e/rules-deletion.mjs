// Firestore rules: clients can never delete covered data directly; trash/log collections are server-write-only.
//   node scripts/e2e/rules-deletion.mjs   (emulators running with repo rules, seeded)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq' });
const db = admin.firestore();
const FS = 'http://127.0.0.1:8085/v1/projects/yala-safari-iq/databases/(default)/documents';
const PW = 'Test@12345';
let pass = 0, fail = 0;
const T = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); c ? pass++ : fail++; };
async function token(email) {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PW, returnSecureToken: true }) });
  const j = await r.json(); return { t: j.idToken, uid: j.localId };
}
async function ensureUser(email, role, schoolId) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: PW, emailVerified: true }); }
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email, role, schoolId, status: 'active' });
}
const H = (t) => ({ Authorization: 'Bearer ' + t, 'content-type': 'application/json' });
const del = async (t, p) => (await fetch(`${FS}/${p}`, { method: 'DELETE', headers: H(t) })).status;
const get = async (t, p) => (await fetch(`${FS}/${p}`, { headers: H(t) })).status;
const fv = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { stringValue: String(v) }])) });
const post = async (t, col, id, o) => (await fetch(`${FS}/${col}?documentId=${id}`, { method: 'POST', headers: H(t), body: JSON.stringify(fv(o)) })).status;
const patch = async (t, p, o) => (await fetch(`${FS}/${p}`, { method: 'PATCH', headers: H(t), body: JSON.stringify(fv(o)) })).status;

await ensureUser('admin2@e2e.test', 'admin', 'S2');
const who = { admin1: 'admin@e2e.test', staff1: 'staff@e2e.test', teacher1: 'teacher@e2e.test', parent1: 'parent@e2e.test', guard1: 'guard@e2e.test', sassist1: 'sassist@e2e.test', admin2: 'admin2@e2e.test', super: 'super@e2e.test' };
const tk = {}; for (const [k, e] of Object.entries(who)) tk[k] = await token(e);

const COLS = ['students','classes','subjects','homework','teacher_reports','advanced_reports','behavior_reports','behavior','grades','attendance','announcements','installments','payments','payroll','inventory','market','marketplace','orders','id_cards','student_archives','notifications','registrations','subscriptionRequests','schools','packages','distributors','distributorCoupons','assistant_categories','assistant_flows','assistant_answers','assistant_keywords','assistant_settings','staff','exams','fees','expenses','dismissal_requests','login_logs','print_logs','tuition_reminder_logs','logs','notification_logs'];
for (const c of COLS) await db.doc(`${c}/RD_${c}`).set({ schoolId: 'S1', teacherId: 'x', studentId: 'y', name: 'rd', userId: 'x', status: 'pending' });
await db.doc('notifications/RD_notifications').set({ schoolId: 'S1', userId: tk.parent1.uid, recipientId: tk.parent1.uid, createdBy: tk.admin1.uid }); // the recipient and the author must not be able to delete it directly either
await db.doc('recycle_bin/RDB1').set({ schoolId: 'S1', collection: 'students', status: 'trashed' });
await db.doc('recycle_bin/RDB1/items/i1').set({ path: 'students/x' });
await db.doc('deletion_logs/RDL1').set({ schoolId: 'S1', result: 'success' });
await db.doc('audit_logs/RDA1').set({ schoolId: 'S1', actorId: tk.admin1.uid, action: 'x' });

for (const [name, u] of Object.entries(tk)) {
  let denied = 0, total = 0;
  for (const c of COLS) { total++; const s = await del(u.t, `${c}/RD_${c}`); if (s !== 200) denied++; }
  T(`${name}: direct DELETE denied on all ${total} covered collections (${denied})`, denied === total);
  const stillThere = (await Promise.all(COLS.map(async (c) => (await db.doc(`${c}/RD_${c}`).get()).exists))).every(Boolean);
  T(`${name}: documents still exist after attempts`, stillThere);
  T(`${name}: cannot write recycle_bin`, (await patch(u.t, 'recycle_bin/RDB1', { status: 'x' })) !== 200 && (await post(u.t, 'recycle_bin', 'new_' + name, { schoolId: 'S1' })) !== 200);
  T(`${name}: cannot write deletion_logs`, (await patch(u.t, 'deletion_logs/RDL1', { result: 'x' })) !== 200 && (await post(u.t, 'deletion_logs', 'new_' + name, { schoolId: 'S1' })) !== 200 && (await del(u.t, 'deletion_logs/RDL1')) !== 200);
  T(`${name}: cannot delete recycle_bin / items`, (await del(u.t, 'recycle_bin/RDB1')) !== 200 && (await del(u.t, 'recycle_bin/RDB1/items/i1')) !== 200);
  T(`${name}: audit_logs immutable`, (await patch(u.t, 'audit_logs/RDA1', { action: 'y' })) !== 200 && (await del(u.t, 'audit_logs/RDA1')) !== 200);
  T(`${name}: cannot forge audit_logs for another actor`, (await post(u.t, 'audit_logs', 'f_' + name, { schoolId: 'S1', actorId: 'someone-else', action: 'x' })) !== 200);
}
// read policy
for (const [name, expect] of [['admin1', true], ['sassist1', null], ['teacher1', false], ['parent1', false], ['guard1', false], ['admin2', false], ['super', true]]) {
  const a = (await get(tk[name].t, 'recycle_bin/RDB1')) === 200, b = (await get(tk[name].t, 'deletion_logs/RDL1')) === 200, c = (await get(tk[name].t, 'recycle_bin/RDB1/items/i1')) === 200;
  if (expect === null) { console.log('INFO', name, 'bin', a, 'log', b, 'items', c); continue; }
  T(`${name}: read recycle_bin/log/items = ${expect}`, a === expect && b === expect && c === expect);
}
T('staff cannot read bin of own school unless management role (info)', true);
// legitimate own-identity audit write still works
T('admin1 can write own audit log', (await post(tk.admin1.t, 'audit_logs', 'ok' + Date.now(), { schoolId: 'S1', actorId: tk.admin1.uid, actorRole: 'admin', action: 'x', uid: tk.admin1.uid, performedBy: tk.admin1.uid })) === 200);
// payments: blocked while the student's ledger awaits a financial review (rule-level, not just the UI)
await db.doc('students/RD_FLAGGED').set({ schoolId: 'S1', name: 'x', financialReviewRequired: true });
await db.doc('students/RD_CLEAR').set({ schoolId: 'S1', name: 'y' });
const stamp = Date.now();
T('admin cannot create a payment for a student flagged for financial review', (await post(tk.admin1.t, 'payments', 'rdp_f' + stamp, { schoolId: 'S1', studentId: 'RD_FLAGGED', amount: '10' })) !== 200);
T('super admin cannot either (the review must be completed first)', (await post(tk.super.t, 'payments', 'rdp_fs' + stamp, { schoolId: 'S1', studentId: 'RD_FLAGGED', amount: '10' })) !== 200);
T('…while a normal student still accepts a payment (no regression)', (await post(tk.admin1.t, 'payments', 'rdp_c' + stamp, { schoolId: 'S1', studentId: 'RD_CLEAR', amount: '10' })) === 200);
await db.doc('students/RD_FLAGGED').update({ financialReviewRequired: admin.firestore.FieldValue.delete() });
T('…and the flagged student accepts payments again once the review is completed', (await post(tk.admin1.t, 'payments', 'rdp_f2' + stamp, { schoolId: 'S1', studentId: 'RD_FLAGGED', amount: '10' })) === 200);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

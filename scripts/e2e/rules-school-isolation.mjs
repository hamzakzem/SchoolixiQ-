// Firestore rules test for school isolation. Real ID tokens against the emulator (rules enforced).
// Prereq: emulators running with the repo rules + `scripts/e2e/seed-emulator.ts` seeded.
//   node scripts/e2e/rules-school-isolation.mjs
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
const T = (name, cond) => { console.log(cond ? 'PASS' : 'FAIL', name); cond ? pass++ : fail++; };

async function token(email) {
  const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PW, returnSecureToken: true }) });
  return (await r.json()).idToken;
}
async function ensureUser(email, role, schoolId, extra = {}) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: PW, emailVerified: true }); }
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email, role, schoolId, status: 'active', ...extra });
  return u;
}
const H = (t) => (t ? { Authorization: 'Bearer ' + t, 'content-type': 'application/json' } : { 'content-type': 'application/json' });
const get = async (t, path) => (await fetch(`${FS}/${path}`, { headers: H(t) })).status;
const list = async (t, col, where) => {
  const sq = { from: [{ collectionId: col }], limit: 5 };
  if (where) sq.where = { fieldFilter: { field: { fieldPath: where[0] }, op: 'EQUAL', value: { stringValue: where[1] } } };
  const r = await fetch(`${FS}:runQuery`, { method: 'POST', headers: H(t), body: JSON.stringify({ structuredQuery: sq }) });
  const j = await r.json();
  return Array.isArray(j) ? j.filter((x) => x.document).length : -1; // -1 = request denied
};
const fv = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { stringValue: String(v) }])) });
const write = async (t, method, path, o) => (await fetch(`${FS}/${path}`, { method, headers: H(t), body: method === 'DELETE' ? undefined : JSON.stringify(fv(o)) })).status;

const future = admin.firestore.Timestamp.fromMillis(Date.now() + 9e9);
await db.doc('schools/S2').set({ name: 'مدرسة ثانية', status: 'active', subscriptionStatus: 'active', planId: 'pro', adminEmail: 'admin2@e2e.test', subscriptionExpiresAt: future, featured: true, logoUrl: 'x' }, { merge: true });
await db.doc('schools/S1').set({ featured: true }, { merge: true });
await db.doc('schools/S1/settings/general').set({ k: 'v1' });
await db.doc('schools/S2/settings/general').set({ k: 'v2' });
await db.doc('students/S2ST1').set({ name: 'طالب 2', schoolId: 'S2', classId: 'S2C1', parentIds: [] });
await ensureUser('admin2@e2e.test', 'admin', 'S2');
await ensureUser('teacher2@e2e.test', 'teacher', 'S2');
await ensureUser('loner@e2e.test', 'parent', '');
// an admin who owns a school that is still being activated (no schoolId on the profile yet)
await db.doc('schools/PENDING1').set({ name: 'قيد التفعيل', status: 'pending_subscription', adminEmail: 'newadmin@e2e.test', ownerUid: 'x' });
await ensureUser('newadmin@e2e.test', 'admin', '');

const tk = Object.fromEntries(await Promise.all(Object.entries({
  admin1: 'admin@e2e.test', staff1: 'staff@e2e.test', teacher1: 'teacher@e2e.test', parent1: 'parent@e2e.test', guard1: 'guard@e2e.test', sassist1: 'sassist@e2e.test',
  admin2: 'admin2@e2e.test', teacher2: 'teacher2@e2e.test', loner: 'loner@e2e.test', newadmin: 'newadmin@e2e.test',
  super: 'super@e2e.test', passist: 'passist@e2e.test', dist: 'dist@e2e.test',
}).map(async ([k, e]) => [k, await token(e)])));

// ── cross-school: school A principals cannot read school B (get / list / subcollection / write)
for (const [who, t, own, other] of [['admin1', tk.admin1, 'S1', 'S2'], ['staff1', tk.staff1, 'S1', 'S2'], ['teacher1', tk.teacher1, 'S1', 'S2'], ['parent1', tk.parent1, 'S1', 'S2'], ['guard1', tk.guard1, 'S1', 'S2'], ['sassist1', tk.sassist1, 'S1', 'S2'], ['admin2', tk.admin2, 'S2', 'S1'], ['teacher2', tk.teacher2, 'S2', 'S1']]) {
  T(`${who}: cannot GET school ${other}`, (await get(t, `schools/${other}`)) !== 200);
  T(`${who}: cannot read ${other} settings`, (await get(t, `schools/${other}/settings/general`)) !== 200);
  T(`${who}: cannot LIST schools of ${other} (query by id fields)`, (await list(t, 'schools', ['name', other === 'S2' ? 'مدرسة ثانية' : 'مدرسة الاختبار'])) <= 0);
  T(`${who}: cannot LIST all schools`, (await list(t, 'schools')) <= 0);
  T(`${who}: cannot UPDATE school ${other}`, (await write(t, 'PATCH', `schools/${other}?updateMask.fieldPaths=name`, { name: 'hacked' })) !== 200);
  T(`${who}: cannot DELETE school ${other}`, (await write(t, 'DELETE', `schools/${other}`, {})) !== 200);
  T(`${who}: can GET own school ${own} (needed by the app)`, (await get(t, `schools/${own}`)) === 200);
}
// ── users with no school, and unauthenticated callers
T('unlinked user: cannot GET any school', (await get(tk.loner, 'schools/S1')) !== 200 && (await get(tk.loner, 'schools/S2')) !== 200);
T('unlinked user: cannot LIST schools', (await list(tk.loner, 'schools')) <= 0);
T('anonymous: cannot GET a school', (await get(null, 'schools/S1')) !== 200);
T('anonymous: cannot LIST schools (incl. featured)', (await list(null, 'schools', ['featured', 'true'])) <= 0);
T('anonymous: cannot read school settings', (await get(null, 'schools/S1/settings/general')) !== 200);
T('signed-in: cannot LIST featured schools directly (public API is used instead)', (await list(tk.loner, 'schools', ['status', 'active'])) <= 0);
// ── legitimate access
T('super admin: GET + LIST schools', (await get(tk.super, 'schools/S2')) === 200 && (await list(tk.super, 'schools')) > 0);
T('platform assistant: GET + LIST schools', (await get(tk.passist, 'schools/S2')) === 200 && (await list(tk.passist, 'schools')) > 0);
T('new school admin (adminEmail match): can find the school being activated', (await list(tk.newadmin, 'schools', ['adminEmail', 'newadmin@e2e.test'])) === 1);
T('new school admin: cannot find someone else\'s school by their adminEmail', (await list(tk.newadmin, 'schools', ['adminEmail', 'admin2@e2e.test'])) <= 0);
T('own-school settings readable by members (ID-card template path unchanged)', (await get(tk.parent1, 'schools/S1/settings/general')) === 200 && (await get(tk.teacher1, 'schools/S1/settings/general')) === 200);
// ── registration still works for a new parent (no school yet) and cannot touch schools
T('new parent can create a registration request', (await write(tk.loner, 'POST', 'registrations?documentId=iso_reg_1', { type: 'subscription_request', status: 'pending' })) === 200);
T('anonymous can create a registration request (signup page)', (await write(null, 'POST', 'registrations?documentId=iso_reg_2', { type: 'subscription_request', status: 'pending' })) === 200);
T('new parent cannot read other registrations', (await get(tk.loner, 'registrations/iso_reg_2')) !== 200);
// ── escalation attempts
const me = await admin.auth().getUserByEmail('teacher@e2e.test');
T('teacher cannot move self to S2', (await write(tk.teacher1, 'PATCH', `users/${me.uid}?updateMask.fieldPaths=schoolId`, { schoolId: 'S2' })) !== 200);
T('teacher still sees only S1 afterwards', (await get(tk.teacher1, 'schools/S2')) !== 200);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

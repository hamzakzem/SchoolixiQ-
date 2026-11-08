// Dismissal pickup-code lifecycle against the real server API (server clock, renewal, single use).
// Prereq: emulators seeded + server on :3500 (dist/server.mjs).  node scripts/e2e/dismissal-token-api.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq' });
const db = admin.firestore();
const BASE = process.env.BASE || 'http://127.0.0.1:3500';
let pass = 0, fail = 0;
const T = (n, c, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
async function tok(email) { const r = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test@12345', returnSecureToken: true }) }); return (await r.json()).idToken; }
const call = async (t, p, b) => { const r = await fetch(BASE + p, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: JSON.stringify(b) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

const par = await admin.auth().getUserByEmail('parent@e2e.test');
const sid = (await db.doc('users/' + par.uid).get()).data().studentIds[0];
const stu = (await db.doc('students/' + sid).get()).data();
for (const d of (await db.collection('dismissal_requests').where('studentId', '==', sid).get()).docs) await d.ref.delete();
await db.doc('students/' + sid).update({ gateDismissalStatus: admin.firestore.FieldValue.delete() }).catch(() => {});
let other; try { other = await admin.auth().getUserByEmail('parent2@e2e.test'); } catch { other = await admin.auth().createUser({ email: 'parent2@e2e.test', password: 'Test@12345', emailVerified: true }); }
await db.doc('users/' + other.uid).set({ uid: other.uid, email: 'parent2@e2e.test', name: 'ولي أمر آخر', role: 'parent', schoolId: stu.schoolId, status: 'active', studentIds: [] });
const [P, P2, G, A] = await Promise.all(['parent@e2e.test', 'parent2@e2e.test', 'guard@e2e.test', 'admin@e2e.test'].map(tok));

let r = await call(P, '/api/dismissal/request', { schoolId: stu.schoolId, studentId: sid });
const id = r.j.id, tok1 = r.j.token;
T('request created with a code', r.s === 200 && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(tok1), tok1);
let doc = (await db.doc('dismissal_requests/' + id).get()).data();
const ttl = doc.tokenExpiresAt.toMillis() - Date.now();
T('expiry is set by the server (~10 min ahead)', ttl > 9 * 60e3 && ttl <= 10 * 60e3 + 5e3, Math.round(ttl / 1000) + 's');

// expire it using only stored (server-side) data
await db.doc('dismissal_requests/' + id).update({ tokenExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() - 60e3) });
r = await call(G, '/api/dismissal/guard-verify', { requestId: id, token: tok1 });
T('expired code refused even when the correct code is typed (410)', r.s === 410 && r.j.error === 'TOKEN_EXPIRED', r.j.error);
r = await call(G, '/api/dismissal/guard-verify', { requestId: id });
T('expired code refused even without typing a code (410)', r.s === 410 && r.j.error === 'TOKEN_EXPIRED');
doc = (await db.doc('dismissal_requests/' + id).get()).data();
T('active request NOT closed or altered by expiry (still REQUESTED, not processing)', doc.status === 'REQUESTED' && !doc.isProcessing && !doc.guardVerifiedAt);

// renewal permissions
r = await call(G, '/api/dismissal/refresh-token', { requestId: id }); T('guard cannot renew a parent code (403)', r.s === 403);
r = await call(A, '/api/dismissal/refresh-token', { requestId: id }); T('admin cannot renew a parent code (403)', r.s === 403);
r = await call(P2, '/api/dismissal/refresh-token', { requestId: id }); T('an unrelated parent cannot renew (403)', r.s === 403, r.j.error);
r = await call(P, '/api/dismissal/refresh-token', { requestId: 'missing' }); T('renew unknown request → 404', r.s === 404);
r = await call(P, '/api/dismissal/refresh-token', { requestId: id });
const tok2 = r.j.token;
T('owner parent renews: new code, future expiry from server clock', r.s === 200 && tok2 && tok2 !== tok1 && r.j.tokenExpiresAtMs > Date.now() + 9 * 60e3, tok2);
r = await call(G, '/api/dismissal/guard-verify', { requestId: id, token: tok1 });
T('old (replaced) code no longer accepted', r.s === 400 && r.j.error === 'TOKEN_MISMATCH', r.j.error);
r = await call(G, '/api/dismissal/guard-verify', { requestId: id, token: tok2, idempotencyKey: 'tk-v1' });
T('renewed code verifies the same request (no new request needed)', r.s === 200, r.j.error);
doc = (await db.doc('dismissal_requests/' + id).get()).data();
T('code consumed after verification', !!doc.tokenConsumedAt);
r = await call(P, '/api/dismissal/refresh-token', { requestId: id }); T('cannot renew after verification (409)', r.s === 409, r.j.error);
r = await call(G, '/api/dismissal/guard-verify', { requestId: id, token: tok2, idempotencyKey: 'tk-v2' });
T('same code cannot be reused (rejected)', r.s >= 400, r.j.error);
r = await call(A, '/api/dismissal/manager-approve', { requestId: id, idempotencyKey: 'tk-a1' }); T('flow still completes for the admin after a renewed code', r.s === 200, r.j.error);

// new request for the same student gets a different code; the old one cannot verify it
r = await call(P, '/api/dismissal/request', { schoolId: stu.schoolId, studentId: sid });
// (student already dismissed today -> server may refuse; both outcomes are acceptable, only code reuse matters)
if (r.s === 200) {
  T('new request has a fresh code', r.j.token !== tok1 && r.j.token !== tok2);
  const x = await call(G, '/api/dismissal/guard-verify', { requestId: r.j.id, token: tok2 });
  T('previous request\'s code cannot verify a new request', x.s === 400 && x.j.error === 'TOKEN_MISMATCH', x.j.error);
} else T('(new request after completion refused by server: ' + r.j.error + ')', true);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

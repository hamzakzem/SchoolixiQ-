// Financial integrity of payment cancellation.   node scripts/e2e/deletion-phase6-finance.test.mjs  (emulators + server :3500)
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
const login = async (email) => (await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'Test@12345', returnSecureToken: true }) })).json()).idToken;
async function user(email, role, schoolId, extra = {}) {
  let u; try { u = await admin.auth().getUserByEmail(email); } catch { u = await admin.auth().createUser({ email, password: 'Test@12345', emailVerified: true }); }
  await admin.auth().updateUser(u.uid, { disabled: false });
  await db.doc('users/' + u.uid).set({ uid: u.uid, email, name: email.split('@')[0], role, schoolId, status: 'active', ...extra });
  return u;
}
const api = async (t, path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const now = admin.firestore.Timestamp.now();
const D = (m, d = 1) => admin.firestore.Timestamp.fromMillis(Date.UTC(2026, m, d));
await db.doc('schools/S1').set({ studentCount: 40 }, { merge: true });
const adm = await user('p6_admin@e2e.test', 'admin', 'S1'), fin = await user('p6_fin@e2e.test', 'school_assistant', 'S1', { permissions: ['tuition'] }), noperm = await user('p6_noperm@e2e.test', 'staff', 'S1', { permissions: [] });
const KA = await login(adm.email), KF = await login(fin.email), KN = await login(noperm.email);
const getI = async (id) => (await db.doc('installments/' + id).get()).data();
const bal = async (id) => (await db.doc('students/' + id).get()).get('tuitionBalance');

async function ledger(prefix, name) {
  const sid = prefix + 'ST';
  await db.doc('students/' + sid).set({ schoolId: 'S1', name, classId: 'c', parentIds: [], tuitionBalance: 300, createdAt: now });
  // three installments of 100, two payments: 150 (covers #1 and half of #2) and 150 (rest of #2 and #3)
  for (const [i, m] of [[1, 1], [2, 2], [3, 3]]) await db.doc(`installments/${prefix}I${i}`).set({ schoolId: 'S1', studentId: sid, amount: 100, status: 'paid', paidAmount: 100, dueDate: D(m), legacyField: 'keep-me-' + i });
  await db.doc(`payments/${prefix}PA`).set({ schoolId: 'S1', studentId: sid, studentName: name, amount: 150, receiptNumber: prefix + '-A', collectorId: fin.uid, installmentIds: [`${prefix}I1`, `${prefix}I2`], note: 'ملاحظة قديمة', createdAt: D(1, 5) });
  await db.doc(`payments/${prefix}PB`).set({ schoolId: 'S1', studentId: sid, studentName: name, amount: 150, receiptNumber: prefix + '-B', collectorId: fin.uid, installmentIds: [`${prefix}I2`, `${prefix}I3`], createdAt: D(2, 5) });
  return sid;
}
// ── determinism: identical ledgers produce identical results ───────────────────────────────────
await ledger('P6X', 'طالب س'); await ledger('P6Y', 'طالب ص');
let r1 = await api(KF, '/api/records/void-payment', { paymentId: 'P6XPA', reason: 'تكرار' });
let r2 = await api(KA, '/api/records/void-payment', { paymentId: 'P6YPA', reason: 'تكرار' });
const snap = async (p) => Promise.all([1, 2, 3].map(async (i) => { const d = await getI(`${p}I${i}`); return `${d.status}/${d.paidAmount}`; }));
const sx = await snap('P6X'), sy = await snap('P6Y');
T('allocation is deterministic: identical ledgers → identical installment states', r1.s === 200 && r2.s === 200 && JSON.stringify(sx) === JSON.stringify(sy), JSON.stringify(sx));
T('…and correct: 150 left → #1 paid 100, #2 partial 50, #3 pending', sx.join() === 'paid/100,partial/50,pending/0');
T('balance reversed exactly once (300 − 150)', (await bal('P6XST')) === 150 && (await bal('P6YST')) === 150);
T('historical data is not rewritten: unrelated installment fields and the payment’s own data survive', (await getI('P6XI1')).legacyField === 'keep-me-1' && (await getI('P6XI3')).legacyField === 'keep-me-3');
const p = (await db.doc('payments/P6XPA').get()).data();
T('cancelled payment stays in the ledger with amount/receipt/note/collector/date intact + who/when/why/history', p.status === 'voided' && p.amount === 150 && p.receiptNumber === 'P6X-A' && p.note === 'ملاحظة قديمة' && p.collectorId === fin.uid && p.createdAt.toMillis() === D(1, 5).toMillis() && p.voidedBy.uid === fin.uid && p.voidReason === 'تكرار' && p.history.length === 1 && p.history[0].action === 'voided' && p.history[0].amount === 150);
T('the OTHER payment of the student is untouched', (await db.doc('payments/P6XPB').get()).get('status') === undefined);
// second void on the same student uses only the non-voided payments
r1 = await api(KA, '/api/records/void-payment', { paymentId: 'P6XPB', reason: 'تصحيح' });
const sx2 = await snap('P6X');
T('voiding the remaining payment: everything back to pending, balance 0 (voided payments are not counted twice)', r1.s === 200 && sx2.join() === 'pending/0,pending/0,pending/0' && (await bal('P6XST')) === 0);
// ── idempotency + concurrency ───────────────────────────────────────────────────────────────────
await ledger('P6Z', 'طالب ع');
const burst = await Promise.all([...Array(6)].map((_, i) => api(i % 2 ? KA : KF, '/api/records/void-payment', { paymentId: 'P6ZPA', reason: 'سباق ' + i })));
T('six simultaneous cancellations: all answered without error, balance reversed exactly once, one history entry', burst.every((x) => x.s === 200) && (await bal('P6ZST')) === 150 && (await db.doc('payments/P6ZPA').get()).get('history').length === 1, burst.map((x) => x.s + (x.j.replay ? 'r' : '')).join());
const rep = await api(KA, '/api/records/void-payment', { paymentId: 'P6ZPA', reason: 'مرة أخرى' });
T('repeating later is a no-op replay (idempotent): balance and installments unchanged', rep.s === 200 && rep.j.replay === true && (await bal('P6ZST')) === 150 && (await snap('P6Z')).join() === 'paid/100,partial/50,pending/0');
const concurrentTwoPayments = await Promise.all([api(KA, '/api/records/void-payment', { paymentId: 'P6ZPB', reason: 'سبب أول' }), api(KF, '/api/records/void-payment', { paymentId: 'P6ZPB', reason: 'سبب ثان' })]);
T('concurrent cancellations of the second payment too: ledger ends consistent (all pending, balance 0)', concurrentTwoPayments.every((x) => x.s === 200) && (await snap('P6Z')).join() === 'pending/0,pending/0,pending/0' && (await bal('P6ZST')) === 0, JSON.stringify([concurrentTwoPayments.map((x) => x.j), await snap('P6Z'), await bal('P6ZST')]));
// ── authorisation ───────────────────────────────────────────────────────────────────────────────
await ledger('P6W', 'طالب ك');
const deny = await api(KN, '/api/records/void-payment', { paymentId: 'P6WPA', reason: 'ليس لي صلاحية' });
T('an employee without the tuition permission cannot cancel a payment (and nothing changes)', deny.s === 403 && (await db.doc('payments/P6WPA').get()).get('status') === undefined && (await bal('P6WST')) === 300);
// ── mismatch → review path, blocked payments until review ─────────────────────────────────────
await db.doc('students/P6MST').set({ schoolId: 'S1', name: 'طالب م', classId: 'c', parentIds: [], tuitionBalance: 100, createdAt: now });
await db.doc('installments/P6MI1').set({ schoolId: 'S1', studentId: 'P6MST', amount: 100, status: 'paid', paidAmount: 100, dueDate: D(1) });
await db.doc('installments/P6MI2').set({ schoolId: 'S1', studentId: 'P6MST', amount: 100, status: 'paid', dueDate: D(2) }); // marked paid by hand
await db.doc('payments/P6MPA').set({ schoolId: 'S1', studentId: 'P6MST', amount: 100, receiptNumber: 'M-A', installmentIds: ['P6MI1'], createdAt: now });
const mm = await api(KA, '/api/records/void-payment', { paymentId: 'P6MPA', reason: 'تعارض' });
const m1 = await getI('P6MI1'), m2 = await getI('P6MI2');
T('a ledger that does not add up: nothing is re-allocated, reviewRequired set on installments, student flagged', mm.s === 200 && mm.j.reallocated === false && mm.j.reviewRequired === true && m1.status === 'paid' && m1.paidAmount === 100 && m2.status === 'paid' && m1.reviewRequired === true && m2.reviewRequired === true && (await db.doc('students/P6MST').get()).get('financialReviewRequired') === true);
const blocked = await api(KA, '/api/records/resolve-financial-review', { studentId: 'P6MST', note: '' });
T('review cannot be closed without a documented note', blocked.s === 400 && (await db.doc('students/P6MST').get()).get('financialReviewRequired') === true);
const denyReview = await api(KN, '/api/records/resolve-financial-review', { studentId: 'P6MST', note: 'ملاحظة كافية' });
T('only an authorised manager can complete the review', denyReview.s === 403 && (await db.doc('students/P6MST').get()).get('financialReviewRequired') === true);
const ok = await api(KF, '/api/records/resolve-financial-review', { studentId: 'P6MST', note: 'تمت مطابقة الأقساط مع الإيصالات يدوياً' });
const st = (await db.doc('students/P6MST').get()).data();
T('authorised manager completes it: flags cleared, reviewer + note recorded, installments no longer flagged', ok.s === 200 && st.financialReviewRequired === undefined && st.financialReviewedBy === fin.uid && st.financialReviewNote.includes('مطابقة') && (await getI('P6MI1')).reviewRequired === undefined);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

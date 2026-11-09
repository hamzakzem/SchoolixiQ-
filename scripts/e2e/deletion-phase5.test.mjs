// Cross-tenant Storage reference protection.   node scripts/e2e/deletion-phase5.test.mjs  (emulators + server on :3500)
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
const { deleteRecords, restoreBundle, purgeBundle, sweepDeletions } = await import('../../backend/deletionService.mjs');
const reg = await import('../../backend/storageRegistry.mjs');
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
const del = (t, collection, ids, extra = {}) => api(t, '/api/records/delete', { collection, ids: [].concat(ids), ...extra });
const fexists = async (p) => (await bucket.file(p).exists())[0];
const exists = async (p) => (await db.doc(p).get()).exists;
const bundle = async (id) => (await db.doc('recycle_bin/' + id).get()).data();
const urlOf = (path, token) => `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
const put = async (path, token = 'tk' + Math.random().toString(36).slice(2)) => { await bucket.file(path).save(Buffer.from('x'), { metadata: { metadata: { firebaseStorageDownloadTokens: token } } }); return urlOf(path, token); };
const now = admin.firestore.Timestamp.now();

await db.doc('schools/XA').set({ name: 'مدرسة أ', status: 'active' });
await db.doc('schools/XB').set({ name: 'مدرسة ب', status: 'active' });
const A = await user('p5_adminA@e2e.test', 'admin', 'XA');
const B = await user('p5_adminB@e2e.test', 'admin', 'XB');
const KA = await login(A.email), KB = await login(B.email);
const ctx = { db, adminSdk: admin, authAdmin: admin.auth(), bucket: () => bucket, canActorDeleteUser: () => true };

// 1–3. the same file referenced by School A and School B
const shared = await put('schools/XA/store/products/1-shared.png', 'S1');
await db.doc('market/XA_P1').set({ schoolId: 'XA', name: 'منتج أ', imageUrl: shared, createdAt: now });
await db.doc('market/XB_P1').set({ schoolId: 'XB', name: 'منتج ب', imageUrl: shared, createdAt: now });
let r = await del(KA, 'market', 'XA_P1'); let bid = r.j.results[0].bundleId;
T('School A deletes its record: the file referenced by School B is NOT moved', r.j.results[0].ok && await fexists('schools/XA/store/products/1-shared.png') && !(await fexists(`_trash/${bid}/schools/XA/store/products/1-shared.png`)));
T('…and the job records why (shared with the other school’s record, not just "shared")', (await bundle(bid)).storageReferences?.shared === 1);
r = await api(KA, '/api/records/restore', { bundleId: bid });
r = await del(KA, 'market', 'XA_P1', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('School A PERMANENTLY deletes its record: the shared file is still there, School B’s record intact', r.j.results[0].ok && await fexists('schools/XA/store/products/1-shared.png') && await exists('market/XB_P1'));
const filesOf = async (id) => (await db.collection(`recycle_bin/${id}/files`).get()).docs.map((d) => d.data());
// the other tenant's identifiers must never be written into data School A can reach
const sharedBundle = (await db.collection('recycle_bin').where('recordKey', '==', 'market/XA_P1').get()).docs.map((d) => d.id);
const leak = (await Promise.all(sharedBundle.map(filesOf))).flat().some((f) => JSON.stringify(f).includes('XB_P1'));
T('no identifier of the OTHER school’s record is stored in the job data (no cross-tenant leakage)', !leak);

// 4. same school, two records, same file: kept until the LAST one is deleted
const two = await put('schools/XA/store/products/2-two.png', 'S2');
await db.doc('market/XA_P2').set({ schoolId: 'XA', name: 'أ2', imageUrl: two, createdAt: now });
await db.doc('market/XA_P3').set({ schoolId: 'XA', name: 'أ3', description: `صورة ${two}`, createdAt: now });
r = await del(KA, 'market', 'XA_P2');
T('first of two records using a file: file stays', r.j.results[0].ok && await fexists('schools/XA/store/products/2-two.png'));
const b2 = (await db.collection('recycle_bin').where('recordId', '==', 'XA_P2').get()).docs[0].id;
r = await del(KA, 'market', 'XA_P3'); bid = r.j.results[0].bundleId;
T('the second record: the file is still referenced by the first record’s BIN copy (restorable) → stays', r.j.results[0].ok && await fexists('schools/XA/store/products/2-two.png'));
r = await api(KA, '/api/records/purge', { bundleId: b2, confirmText: 'حذف نهائي' });
T('purging the first bundle: the second record’s bin copy still references the file → stays', r.s === 200 && await fexists('schools/XA/store/products/2-two.png'));
r = await api(KA, '/api/records/purge', { bundleId: bid, confirmText: 'حذف نهائي' });
T('purging the LAST bundle that used it: nothing references the file any more → it is deleted (retention policy honoured)', r.s === 200 && !(await fexists('schools/XA/store/products/2-two.png')));
// cross-tenant: after A's record is gone, B (the only remaining user) cannot remove a file that lives in A's scope
const orphan = await put('schools/XA/store/products/3-orph.png', 'S3');
await db.doc('market/XB_P2').set({ schoolId: 'XB', name: 'ب2', imageUrl: orphan, createdAt: now });
r = await del(KB, 'market', 'XB_P2', { mode: 'permanent', confirmText: 'حذف نهائي' });
T('School B can never move/delete a file that lives in School A’s scope, even permanently', r.j.results[0].ok && await fexists('schools/XA/store/products/3-orph.png') && (await bundle(r.j.results[0].bundleId)).storageReferences?.out_of_scope === 1);

// 5. nested + free text across schools
const nested = await put('schools/XA/store/products/4-nested.png', 'S4');
await db.doc('market/XA_P4').set({ schoolId: 'XA', name: 'أ4', imageUrl: nested, createdAt: now });
await db.doc('announcements/XB_AN1').set({ schoolId: 'XB', title: 'إعلان', gallery: [{ caption: 'x', media: { url: nested } }], notes: `انظر ${nested} أيضاً`, createdAt: now });
r = await del(KA, 'market', 'XA_P4');
T('a reference nested in arrays/objects of ANOTHER school’s record protects the file', r.j.results[0].ok && await fexists('schools/XA/store/products/4-nested.png'));
const free = await put('schools/XA/store/products/5-free.png', 'S5');
await db.doc('market/XA_P5').set({ schoolId: 'XA', name: 'أ5', imageUrl: free, createdAt: now });
await db.doc('announcements/XB_AN2').set({ schoolId: 'XB', title: 'ن', body: `نص حر فيه رابط ${free}، وشكراً`, createdAt: now });
r = await del(KA, 'market', 'XA_P5');
T('a link inside FREE TEXT of another school’s record protects the file', r.j.results[0].ok && await fexists('schools/XA/store/products/5-free.png'));
// a record of another school that is itself in the TRASH still counts (its restore must find the file)
const trashed = await put('schools/XA/store/products/6-trashed.png', 'S6');
await db.doc('market/XA_P6').set({ schoolId: 'XA', name: 'أ6', imageUrl: trashed, createdAt: now });
await db.doc('market/XB_P6').set({ schoolId: 'XB', name: 'ب6', imageUrl: trashed, createdAt: now });
await del(KB, 'market', 'XB_P6');
r = await del(KA, 'market', 'XA_P6');
T('a reference held by another school’s record that sits in the recycle bin also protects the file', r.j.results[0].ok && await fexists('schools/XA/store/products/6-trashed.png'));

// 6. malformed / traversal / cross-tenant
await put('schools/XB/store/products/7-b.png', 'S7');
const evil = [
  ['traversal into B', urlOf('schools/XA/../XB/store/products/7-b.png', 'S7')],
  ['absolute path', urlOf('/schools/XB/store/products/7-b.png', 'S7')],
  ['direct cross-tenant path', urlOf('schools/XB/store/products/7-b.png', 'S7')],
  ['double slash', urlOf('schools/XA//..//XB/store/products/7-b.png', 'S7')],
  ['malformed percent-encoding', 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/%E0%A4%A?alt=media'],
  ['other bucket', `https://firebasestorage.googleapis.com/v0/b/some-other-bucket/o/schools%2FXB%2Fstore%2Fproducts%2F7-b.png?alt=media`],
  ['gs:// other bucket', 'gs://some-other-bucket/schools/XB/store/products/7-b.png'],
  ['backslashes', urlOf('schools\\XB\\store\\products\\7-b.png', 'S7')],
];
let k = 0;
for (const [label, url] of evil) {
  const id = 'XA_EVIL' + (k++);
  await db.doc('market/' + id).set({ schoolId: 'XA', name: label, imageUrl: url, createdAt: now });
  r = await del(KA, 'market', id, { mode: 'permanent', confirmText: 'حذف نهائي' });
  T(`hostile reference "${label}": delete succeeds, School B's file untouched`, r.j.results?.[0]?.ok === true && await fexists('schools/XB/store/products/7-b.png'));
}

// 7. fail closed when the global reference scan cannot be completed
const unver = await put('schools/XA/store/products/8-unver.png', 'S8');
await db.doc('market/XA_P8').set({ schoolId: 'XA', name: 'أ8', imageUrl: unver, createdAt: now });
let res = await deleteRecords({ ...ctx, maxRefScan: 1 }, A.uid, { collection: 'market', ids: ['XA_P8'] });
let b8 = (await db.collection('recycle_bin').where('recordId', '==', 'XA_P8').get()).docs[0];
T('scan cannot be completed (cap) → FAIL CLOSED: file left in place, reason recorded, job still completes for the record', res.results[0].ok && await fexists('schools/XA/store/products/8-unver.png') && b8.get('storageReferences.unverified') === 1 && b8.get('storageWarnings')?.[0]?.code === 'REFERENCE_SCAN_INCOMPLETE');
T('…and the audit log says so', (await db.collection('deletion_logs').where('recordId', '==', 'XA_P8').where('action', '==', 'DELETE_TO_TRASH').get()).docs.some((d) => d.get('storage.unverified') === 1));
res = await restoreBundle(ctx, A.uid, b8.id);
T('restore of a bundle with unverified (never moved) files still works and nothing is lost', res.ok && await exists('market/XA_P8') && await fexists('schools/XA/store/products/8-unver.png'));

// 8. purge re-verifies: a reference created AFTER the delete rescues the file
const late = await put('schools/XA/store/products/9-late.png', 'S9');
await db.doc('market/XA_P9').set({ schoolId: 'XA', name: 'أ9', imageUrl: late, createdAt: now });
r = await del(KA, 'market', 'XA_P9'); bid = r.j.results[0].bundleId;
const movedAway = !(await fexists('schools/XA/store/products/9-late.png'));
await db.doc('market/XB_P9').set({ schoolId: 'XB', name: 'ب9 (نسخ لاحق)', imageUrl: late, createdAt: now });
r = await api(KA, '/api/records/purge', { bundleId: bid, confirmText: 'حذف نهائي' });
T('a reference to the file appeared after the delete: PURGE rescues it back instead of destroying it', movedAway && r.s === 200 && await fexists('schools/XA/store/products/9-late.png') && !(await fexists(`_trash/${bid}/schools/XA/store/products/9-late.png`)) && (await bundle(bid)).filesRescued === 1);
// purge with an unverifiable scan keeps the trashed copy
const keep = await put('schools/XA/store/products/10-keep.png', 'S10');
await db.doc('market/XA_P10').set({ schoolId: 'XA', name: 'أ10', imageUrl: keep, createdAt: now });
r = await del(KA, 'market', 'XA_P10'); bid = r.j.results[0].bundleId;
let perr = null; try { await purgeBundle({ ...ctx, maxRefScan: 1 }, A.uid, { bundleId: bid, confirmText: 'حذف نهائي' }); } catch (e) { perr = e; }
T('purge whose reference scan is incomplete does NOT delete the file (kept in _trash, reason recorded)', !perr && await fexists(`_trash/${bid}/schools/XA/store/products/10-keep.png`) && (await bundle(bid)).filesRetained === 1);

// 9. school deletion honours references from other schools
const sfile = await put('schools/XC/store/products/11-s.png', 'S11');
await db.doc('schools/XC').set({ name: 'مدرسة ج', status: 'active' });
await db.doc('market/XC_P1').set({ schoolId: 'XC', name: 'ج1', imageUrl: sfile, createdAt: now });
await db.doc('announcements/XB_AN3').set({ schoolId: 'XB', title: 'ن', body: `يستخدم صورة من مدرسة أخرى ${sfile}`, createdAt: now });
const SU = await user('super@e2e.test', 'superadmin', ''); const KS = await login(SU.email);
r = await api(KS, '/api/records/delete-school', { schoolId: 'XC', mode: 'trash', confirmSchoolId: 'XC', confirmName: 'مدرسة ج', confirmText: 'حذف المدرسة' });
T('whole-school deletion: a file of that school still referenced by another school is NOT moved', r.s === 200 && await fexists('schools/XC/store/products/11-s.png'));

// 10. registry unit checks
const names = [...reg.extractStoragePaths({ a: [{ b: `x ${urlOf('schools/XA/a.png', 't')} y` }], c: 'gs://' + BUCKET + '/schools/XA/z.png' }, BUCKET)];
T('registry extracts nested + embedded + gs:// references', names.includes('schools/XA/a.png') && names.includes('schools/XA/z.png'));
T('registry refuses traversal/absolute/double-slash/control characters', ['schools/XA/../XB/x', '/schools/XA/x', 'schools//XA/x', 'schools/XA/x\u0000', '', '.'].every((p) => !reg.isSafeObjectPath(p)) && reg.isSafeObjectPath('schools/XA/store/products/1-a.png'));

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

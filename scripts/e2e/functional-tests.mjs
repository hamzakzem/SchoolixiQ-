/**
 * Functional checks of the main write flows against the Firebase emulators and
 * the local server (seed with scripts/e2e/seed-emulator.ts first).
 * Usage: node scripts/e2e/functional-tests.mjs [baseUrl]
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, query, where, serverTimestamp,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadString } from 'firebase/storage';
import fs from 'fs';

const BASE = process.argv[2] || 'http://localhost:3500';
const PASSWORD = 'Test@12345';
const config = JSON.parse(fs.readFileSync(new URL('../../firebase-applet-config.json', import.meta.url)));

const sessions = {};
async function as(role, email) {
  if (sessions[role]) return sessions[role];
  const app = initializeApp(config, role);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8085);
  const storage = getStorage(app, `gs://${config.storageBucket}`);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  const cred = await signInWithEmailAndPassword(auth, email, PASSWORD);
  const api = async (path, method = 'GET', body) => {
    const token = await cred.user.getIdToken();
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${json.message || json.error || ''}`);
    return json;
  };
  sessions[role] = { uid: cred.user.uid, db, storage, api };
  return sessions[role];
}

const results = [];
async function test(name, fn) {
  try {
    const info = await fn();
    results.push({ name, ok: true, info: info || '' });
  } catch (e) {
    results.push({ name, ok: false, info: String(e.message || e).slice(0, 300) });
  }
}

const admin = () => as('admin', 'admin@e2e.test');
const teacher = () => as('teacher', 'teacher@e2e.test');
const parent = () => as('parent', 'parent@e2e.test');
const guard = () => as('guard', 'guard@e2e.test');
const dist = () => as('distributor', 'dist@e2e.test');
const superadmin = () => as('superadmin', 'super@e2e.test');

// --- School admin -----------------------------------------------------------
await test('admin: add class', async () => {
  const { db } = await admin();
  const r = await addDoc(collection(db, 'classes'), { name: 'صف اختبار', schoolId: 'S1', createdAt: serverTimestamp() });
  return r.id;
});
await test('admin: add student', async () => {
  const { db } = await admin();
  await setDoc(doc(db, 'students', 'ST_NEW'), {
    name: 'طالب جديد', schoolId: 'S1', classId: 'C1', registrationNumber: '2001', parentIds: [],
    tuitionBalance: 0, createdAt: serverTimestamp(),
  });
});
await test('admin: edit student keeps other fields', async () => {
  const { db } = await admin();
  await updateDoc(doc(db, 'students', 'ST_NEW'), { address: 'الكرادة' });
  const snap = await getDoc(doc(db, 'students', 'ST_NEW'));
  if (snap.data().name !== 'طالب جديد') throw new Error('name lost');
});
await test('admin: record attendance', async () => {
  const { db } = await admin();
  await setDoc(doc(db, 'attendance', 'S1_C1_2026-10-27'), {
    schoolId: 'S1', classId: 'C1', date: '2026-10-27', records: { ST1: 'present', ST2: 'absent' },
    createdAt: serverTimestamp(),
  });
});
await test('admin: post announcement', async () => {
  const { db } = await admin();
  await addDoc(collection(db, 'announcements'), {
    schoolId: 'S1', title: 'تبليغ اختبار', content: 'محتوى', audience: 'all', createdAt: serverTimestamp(),
    createdBy: (await admin()).uid,
  });
});
await test('admin: cannot extend own subscription', async () => {
  const { db } = await admin();
  try {
    await updateDoc(doc(db, 'schools', 'S1'), { subscriptionExpiresAt: '2099-01-01' });
  } catch { return 'denied as expected'; }
  throw new Error('subscription change was allowed');
});
await test('admin API: create teacher account', async () => {
  const { api } = await admin();
  const r = await api('/api/admin/create-user', 'POST', {
    email: `t${Date.now()}@e2e.test`, password: 'Teach@12345', displayName: 'معلم جديد',
    role: 'teacher', schoolId: 'S1', additionalData: { subject: 'العلوم' },
  });
  return r.uid || r.userId || 'ok';
});

// --- Teacher ----------------------------------------------------------------
await test('teacher: add homework', async () => {
  const { db, uid } = await teacher();
  await addDoc(collection(db, 'homework'), {
    schoolId: 'S1', classId: 'C1', title: 'واجب اختبار', description: 'حل التمارين', subject: 'الرياضيات',
    teacherId: uid, dueDate: '2026-10-30', createdAt: serverTimestamp(),
  });
});
await test('teacher: list own class students', async () => {
  const { db } = await teacher();
  const snap = await getDocs(query(collection(db, 'students'), where('schoolId', '==', 'S1'), where('classId', 'in', ['C1', 'C2'])));
  return `${snap.size} students`;
});
await test('teacher: list school classes', async () => {
  const { db } = await teacher();
  const snap = await getDocs(query(collection(db, 'classes'), where('schoolId', '==', 'S1')));
  return `${snap.size} classes`;
});

// --- Chat -------------------------------------------------------------------
await test('chat: parent → admin message', async () => {
  const { db, uid } = await parent();
  await addDoc(collection(db, 'system_messages'), {
    schoolId: 'S1', conversationId: `S1_${uid}`, senderId: uid, senderRole: 'parent', senderName: 'ولي الأمر',
    receiverId: 'admin', text: 'مرحبا', read: false, createdAt: serverTimestamp(),
  });
});
await test('chat: parent reads own thread', async () => {
  const { db, uid } = await parent();
  const snap = await getDocs(query(collection(db, 'system_messages'), where('schoolId', '==', 'S1'), where('conversationId', '==', `S1_${uid}`)));
  if (snap.size < 1) throw new Error('no messages');
  return `${snap.size} messages`;
});
await test('chat: admin reads parent thread', async () => {
  const { db } = await admin();
  const p = await parent();
  const snap = await getDocs(query(collection(db, 'system_messages'), where('schoolId', '==', 'S1'), where('conversationId', '==', `S1_${p.uid}`)));
  if (snap.size < 1) throw new Error('no messages');
  return `${snap.size} messages`;
});
await test('chat: parent cannot read another parent thread', async () => {
  const { db } = await parent();
  try {
    await getDocs(query(collection(db, 'system_messages'), where('schoolId', '==', 'S1'), where('conversationId', '==', 'S1_someoneElse')));
  } catch { return 'denied as expected'; }
  throw new Error('read another thread');
});
await test('chat: parent uploads attachment', async () => {
  const { storage, uid } = await parent();
  await uploadString(ref(storage, `chat_files/S1_${uid}/${Date.now()}_a.txt`), 'hello');
});

// --- Safe dismissal (parent → guard → admin) --------------------------------
let dismissalId = '';
await test('dismissal: parent creates request', async () => {
  const { api } = await parent();
  const r = await api('/api/dismissal/request', 'POST', { schoolId: 'S1', studentId: 'ST1', idempotencyKey: `e2e:${Date.now()}` });
  dismissalId = r.id;
  return r.status;
});
await test('dismissal: guard verifies', async () => {
  if (!dismissalId) throw new Error('no request');
  const { api } = await guard();
  const r = await api('/api/dismissal/guard-verify', 'POST', { requestId: dismissalId, idempotencyKey: `gv:${Date.now()}` });
  return r.status || 'ok';
});
await test('dismissal: admin approves', async () => {
  if (!dismissalId) throw new Error('no request');
  const { api } = await admin();
  const r = await api('/api/dismissal/manager-approve', 'POST', { requestId: dismissalId, idempotencyKey: `ma:${Date.now()}` });
  return r.status || 'ok';
});

// --- Distributor / super admin ---------------------------------------------
await test('distributor API: dashboard', async () => {
  const { api } = await dist();
  const r = await api('/api/distributor/dashboard');
  return `schools=${(r.schools || []).length}`;
});
await test('distributor: open support chat', async () => {
  const { db, uid } = await dist();
  const id = 'dist_D1';
  const snap = await getDoc(doc(db, 'distributor_support_conversations', id));
  if (!snap.exists()) {
    await setDoc(doc(db, 'distributor_support_conversations', id), {
      conversationId: id, conversationType: 'distributor_support', distributorId: 'D1', distributorUserId: uid,
      distributorName: 'موزع', participants: [uid, 'super_admin'], lastMessage: '', updatedAt: serverTimestamp(),
      unreadForSuperAdmin: 0, unreadForDistributor: 0, schoolId: null,
    });
  }
  const msgs = await getDocs(query(collection(db, 'distributor_support_messages'), where('conversationId', '==', id)));
  return `${msgs.size} messages`;
});
await test('superadmin: extend subscription', async () => {
  const { db } = await superadmin();
  await updateDoc(doc(db, 'schools', 'S1'), { subscriptionExpiresAt: new Date(Date.now() + 400 * 86400_000).toISOString() });
});

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.info ? `  — ${r.info}` : ''}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

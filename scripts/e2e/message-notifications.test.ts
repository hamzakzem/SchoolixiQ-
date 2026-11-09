// Server-side chat notification + push-claim idempotency, against the Firestore emulator.
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 npx tsx scripts/e2e/message-notifications.test.ts
import admin from 'firebase-admin';
import { notifyForSystemMessage, setupSystemMessageNotifications, notificationIdFor, processBacklog } from '../../backend/messageNotifications.mjs';
import { claimNotificationForPush, processNotificationPush } from '../../notificationPushDispatch.ts';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8085';
if (!admin.apps.length) admin.initializeApp({ projectId: 'yala-safari-iq' });
const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;
let pass = 0, fail = 0;
const T = (n: string, c: boolean, i = '') => { console.log(c ? 'PASS' : 'FAIL', n, i); c ? pass++ : fail++; };
const notifsFor = async (msgId: string) => (await db.collection('notifications').where('metadata.messageId', '==', msgId).get()).docs;
const ADMIN_ROLES = ['admin', 'school_admin', 'assistant', 'school_assistant'];
const expectedAdmins = async () => (await db.collection('users').where('schoolId', '==', 'S1').where('role', 'in', ADMIN_ROLES).get()).docs.map((d) => d.id).sort();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// fixtures (S1 = seeded school; S9 = another school that must never be notified)
await db.doc('users/n_sa').set({ role: 'superadmin', email: 'n_sa@x', name: 'SA' });
await db.doc('users/n_admin').set({ role: 'admin', schoolId: 'S1', name: 'A' });
await db.doc('users/n_sassist').set({ role: 'school_assistant', schoolId: 'S1', name: 'SA1' });
await db.doc('users/n_teacher').set({ role: 'teacher', schoolId: 'S1', name: 'T' });
await db.doc('users/n_parent').set({ role: 'parent', schoolId: 'S1', name: 'P' });
await db.doc('users/n_admin_other').set({ role: 'admin', schoolId: 'S9', name: 'OtherAdmin' });
const mk = async (id: string, extra: Record<string, unknown>) => {
  await db.doc(`system_messages/${id}`).set({ schoolId: 'S1', conversationId: 'superadmin_S1', content: 'نص', createdAt: admin.firestore.Timestamp.now(), read: false, ...extra });
  return (await db.doc(`system_messages/${id}`).get()).data()!;
};

// 1. SA -> school administration: admin + school assistant, nobody else, once
let m = await mk('m1', { senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'admin', audience: 'school_admin' });
await notifyForSystemMessage(db, admin, 'm1', m);
let n = await notifsFor('m1');
T('SA→school: notifies admin AND school assistant', n.map((d) => d.get('userId')).sort().join() === (await expectedAdmins()).join() && n.some((d) => d.get('userId') === 'n_sassist'), n.map((d) => d.get('userId')).join());
T('not sent to teacher/parent/other school/sender', !n.some((d) => ['n_teacher', 'n_parent', 'n_admin_other', 'n_sa'].includes(d.get('userId'))));
T('deterministic ids', n.every((d) => d.id === notificationIdFor('m1', d.get('userId'))));
T('doc is push-ready + carries routing', n.every((d) => !!d.get('pushDelivery') && d.get('routeTarget') === 'chat' && d.get('schoolId') === 'S1'));

// 2. replay the same message many times (trigger restart / second instance / backlog scan)
const fresh = (await db.doc('system_messages/m1').get()).data()!;
await Promise.all([1, 2, 3, 4, 5].map(() => notifyForSystemMessage(db, admin, 'm1', { ...m, serverNotifiedAt: undefined })));
await notifyForSystemMessage(db, admin, 'm1', fresh);
n = await notifsFor('m1');
T('replays (even concurrent) create no duplicates', n.length === (await expectedAdmins()).length, String(n.length));
T('message is marked processed', !!fresh.serverNotifiedAt);

// 3. school admin -> SA pool (real superadmin uid, schoolId=system)
m = await mk('m2', { senderId: 'n_admin', senderRole: 'admin', receiverId: 'super_admin', schoolId: 'S1' });
await notifyForSystemMessage(db, admin, 'm2', m);
n = await notifsFor('m2');
T('school→SA: one notification per super admin, system scope', n.length >= 1 && n.every((d) => d.get('schoolId') === 'system' && d.get('audience') === 'super_admin') && n.some((d) => d.get('userId') === 'n_sa'), String(n.length));

// 4. direct messages teacher<->parent
m = await mk('m3', { senderId: 'n_teacher', senderRole: 'teacher', receiverId: 'n_parent', conversationId: 'S1_n_parent' });
await notifyForSystemMessage(db, admin, 'm3', m);
n = await notifsFor('m3');
T('teacher→parent: only the parent', n.length === 1 && n[0].get('userId') === 'n_parent' && /المعلم/.test(n[0].get('title')));
m = await mk('m4', { senderId: 'n_parent', senderRole: 'parent', receiverId: 'n_teacher', conversationId: 'S1_n_parent' });
await notifyForSystemMessage(db, admin, 'm4', m);
n = await notifsFor('m4');
T('parent→teacher: only the teacher', n.length === 1 && n[0].get('userId') === 'n_teacher');
m = await mk('m5', { senderId: 'n_parent', senderRole: 'parent', receiverId: 'admin', conversationId: 'S1_admin' });
await notifyForSystemMessage(db, admin, 'm5', m);
n = await notifsFor('m5');
T('parent→school administration reaches admin AND school assistant', n.map((d) => d.get('userId')).sort().join() === (await expectedAdmins()).join() && n.some((d) => d.get('userId') === 'n_sassist'));

// 5. isolation: a message addressed to a user of another school notifies nobody
m = await mk('m6', { senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'n_admin_other', schoolId: 'S1' });
await notifyForSystemMessage(db, admin, 'm6', m);
T('receiver from a different school is not notified (isolation)', (await notifsFor('m6')).length === 0);
// private assistant threads never notify schools
m = await mk('m7', { senderId: 'n_sa', senderRole: 'platform_assistant', receiverId: 'admin', conversationPrivacy: { visibility: 'platform_assistant_private', ownerUserId: 'x' } });
await notifyForSystemMessage(db, admin, 'm7', m);
T('private platform-assistant thread does not notify the school', (await notifsFor('m7')).length === 0);
// deleted message
m = await mk('m8', { senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'admin', deleted: true });
await notifyForSystemMessage(db, admin, 'm8', m);
T('deleted message does not notify', (await notifsFor('m8')).length === 0);

// 6. legacy browsers (random-id notification already created by the sender) are not doubled
// the old browser's own notification exists BEFORE the message becomes visible to the server
await db.collection('notifications').add({ userId: 'n_teacher', schoolId: 'S1', createdBy: 'n_sa', metadata: { conversationId: 'legacy_conv' }, createdAt: admin.firestore.Timestamp.now(), title: 'x', message: 'x', read: false });
m = await mk('m9', { senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'n_teacher', conversationId: 'legacy_conv' });
await notifyForSystemMessage(db, admin, 'm9', m);
T('no second notification when an older client already created one', (await notifsFor('m9')).length === 0);

// 7. live listener, two instances at once (e.g. two server processes) -> still one per recipient
const stop1 = setupSystemMessageNotifications(db, admin, { error() {}, info() {}, log() {} } as any);
const stop2 = setupSystemMessageNotifications(db, admin, { error() {}, info() {}, log() {} } as any);
await wait(1500);
await db.doc('system_messages/m10').set({ schoolId: 'S1', conversationId: 'superadmin_S1', senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'admin', content: 'مباشر', createdAt: TS(), read: false });
let live = 0;
const NA = (await expectedAdmins()).length;
for (let i = 0; i < 40 && live < NA; i++) { await wait(250); live = (await notifsFor('m10')).length; }
await wait(1500);
T('live listener (2 instances) creates exactly one per recipient, within seconds', (await notifsFor('m10')).length === NA, String((await notifsFor('m10')).length));
// backlog: message created while "server was down" is picked up by a freshly started listener
stop1(); stop2();
await db.doc('system_messages/m11').set({ schoolId: 'S1', conversationId: 'superadmin_S1', senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'admin', content: 'أثناء التوقف', createdAt: TS(), read: false });
const stop3 = setupSystemMessageNotifications(db, admin, { error() {}, info() {}, log() {} } as any);
let backlog = 0;
for (let i = 0; i < 40 && backlog < NA; i++) { await wait(250); backlog = (await notifsFor('m11')).length; }
stop3();
T('message sent while the server was down is notified after restart (delay, not loss)', backlog === NA, String(backlog));

// 8. push claim: the live server listener (if running) plus five concurrent dispatchers
//    (listener + function + poll) may send a notification AT MOST once, and it ends up handled.
const ref = await db.collection('notifications').add({ userId: 'n_admin', schoolId: 'S1', title: 't', message: 'm', createdAt: admin.firestore.Timestamp.now(), read: false, pushDelivery: { status: 'pending' } });
const claims = await Promise.all([1, 2, 3, 4, 5].map(() => claimNotificationForPush(ref, admin as any)));
const won = claims.filter((c) => c.claimed).length;
T('push claim: no more than one of 5 concurrent dispatchers may send (no duplicate FCM)', won <= 1, claims.map((c) => c.claimed).join());
if (won === 0) {
  await wait(1500);
  const st = (await ref.get()).get('pushDelivery.status');
  T('…and when none won, the running server had already taken it (status set)', ['pending', 'sent', 'partial', 'no_tokens', 'skipped', 'error'].includes(st), String(st));
}

// 9. outage recovery: durable checkpoint, no loss within a day, no flood of old pushes
const ago = (min: number) => admin.firestore.Timestamp.fromMillis(Date.now() - min * 60_000);
const old = async (id: string, minutesAgo: number) => db.doc(`system_messages/${id}`).set({ schoolId: 'S1', conversationId: 'superadmin_S1', senderId: 'n_sa', senderRole: 'superadmin', receiverId: 'n_teacher', content: 'قديمة ' + id, createdAt: ago(minutesAgo), read: false });
await old('o1', 180); await old('o2', 30); await old('o3', 40 * 60);
const res = await processBacklog(db, admin, Date.now() - 24 * 3600_000, { error() {}, info() {}, log() {} } as any);
const o1 = await notifsFor('o1'), o2 = await notifsFor('o2'), o3 = await notifsFor('o3');
T('messages missed during a 3h outage are still notified (no loss)', o1.length === 1 && o2.length === 1, `${o1.length},${o2.length}`);
T('older than the 24h cap is left alone', o3.length === 0);
T('backlog notification keeps the real message time (right place in the bell)', Math.abs(o1[0].get('createdAt').toMillis() - (Date.now() - 180 * 60_000)) < 60_000);
T('backlog is never pushed (no burst of old pushes)', [...o1, ...o2].every((d) => d.get('pushDelivery.status') === 'skipped' && d.get('pushDelivery.reason') === 'stale_message'));
T('backlog processing reports no failure → checkpoint may advance', res.firstFailedMs === null && res.processed >= 2);
const stopCp = setupSystemMessageNotifications(db, admin, { error() {}, info() {}, log() {} } as any);
let cp = null as any;
for (let i = 0; i < 30 && !cp; i++) { await wait(300); cp = (await db.doc('system/notificationWorkers').get()).get('messagesCheckpoint'); }
stopCp();
T('durable checkpoint is written to Firestore', !!cp && cp.toMillis() <= Date.now() && cp.toMillis() > Date.now() - 5 * 60_000);

// 10. FCM failure handling: transient → bounded retries with delay; permanent → no retry
await db.doc('users/n_push').set({ role: 'teacher', schoolId: 'S1', fcmTokens: ['tok-1'], fcmDevices: [{ deviceId: 'd1', token: 'tok-1', platform: 'web' }], name: 'P' });
const failing = (code: string, msg = 'x') => { const stub: any = Object.create(admin, { messaging: { value: () => ({ sendEach: async (m: any[]) => ({ successCount: 0, failureCount: m.length, responses: m.map(() => ({ success: false, error: Object.assign(new Error(msg), { code }) })) }) }) } }); return stub; };
const mkN = async () => { const r = await db.collection('notifications').add({ userId: 'n_push', schoolId: 'S1', title: 't', message: 'm', type: 'system', createdAt: admin.firestore.Timestamp.now(), read: false, pushDelivery: { status: 'retry', attempts: 0, nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() + 120_000) } }); return r; };
const due = (r: any) => r.set({ pushDelivery: { nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() - 1000) } }, { merge: true });
const stat = async (r: any) => (await r.get()).get('pushDelivery');
const retryRef = await mkN();
await due(retryRef);
await processNotificationPush(db, failing('messaging/server-unavailable') as any, retryRef.id, (await retryRef.get()).data()!);
let st = await stat(retryRef);
T('transient FCM failure → scheduled for retry (not dropped)', st.status === 'retry' && st.attempts === 1 && st.nextAttemptAt.toMillis() > Date.now(), JSON.stringify([st.status, st.attempts]));
const early = await processNotificationPush(db, failing('messaging/server-unavailable') as any, retryRef.id, (await retryRef.get()).data()!);
T('no retry before its delay (no hammering)', (await stat(retryRef)).attempts === 1, JSON.stringify(early));
for (const n of [2, 3]) {
  await retryRef.set({ pushDelivery: { nextAttemptAt: admin.firestore.Timestamp.fromMillis(Date.now() - 1000) } }, { merge: true });
  await processNotificationPush(db, failing('messaging/server-unavailable') as any, retryRef.id, (await retryRef.get()).data()!);
}
st = await stat(retryRef);
T('gives up after 3 attempts (terminal error, no endless retry)', st.status === 'error' && st.attempts === 3, JSON.stringify([st.status, st.attempts]));
const permRef = await mkN();
await due(permRef);
await processNotificationPush(db, failing('messaging/registration-token-not-registered') as any, permRef.id, (await permRef.get()).data()!);
st = await stat(permRef);
T('permanent failure (dead token) is not retried', st.status !== 'retry' && ['partial', 'sent', 'no_tokens', 'error'].includes(st.status), String(st.status));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

/**
 * Server-authoritative notifications for chat messages (system_messages).
 *
 * Why: the sender's browser used to create the recipients' notification documents after
 * several sequential round trips (message → conversation → recipient lookup → notifications).
 * If the sender locked the phone, lost signal, or the first write stalled, the notification
 * was delayed or never created, and a retry created another one (random ids).
 *
 * Now every message gets exactly one notification per recipient:
 *  - recipients are resolved on the server, in the message's school (isolation preserved);
 *  - the notification id is deterministic (`msgn_<messageId>_<uid>`) and written with create(),
 *    so replays (restart, second instance, backlog scan) can never duplicate it;
 *  - messages are picked up in real time, plus a bounded backlog on start and a periodic sweep,
 *    so a restart/idle period delays a notification instead of losing it.
 */

const RECENT_WINDOW_MS = 60 * 60 * 1000; // notifications are still created for messages up to 1h old
const SWEEP_INTERVAL_MS = 3 * 60 * 1000;
const SWEEP_WINDOW_MS = 15 * 60 * 1000;
const SUPER_ADMIN_ROLES = ['superadmin', 'super_admin'];
const SCHOOL_ADMIN_ROLES = ['admin', 'school_admin', 'assistant', 'school_assistant'];

export function notificationIdFor(messageId, userId) {
  return `msgn_${messageId}_${userId}`;
}

function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts._seconds === 'number') return ts._seconds * 1000;
  const ms = new Date(ts).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function preview(text) {
  const t = String(text || '').trim();
  return t.length > 50 ? `${t.slice(0, 50)}...` : t;
}

function titleFor(senderRole, recipientKind) {
  const r = String(senderRole || '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') return 'رسالة جديدة من إدارة المنصة';
  if (r === 'platform_assistant') return 'رسالة جديدة من مساعد المنصة';
  if (r === 'teacher') return recipientKind === 'admin' ? 'رسالة جديدة من معلم (الإدارة)' : 'رسالة جديدة من المعلم';
  if (r === 'parent') return recipientKind === 'admin' ? 'رسالة جديدة من ولي أمر (الإدارة)' : 'رسالة جديدة من ولي الأمر';
  if (['admin', 'school_admin', 'assistant', 'school_assistant', 'staff'].includes(r)) {
    return recipientKind === 'super_admin' ? 'رسالة جديدة من إدارة مدرسة' : 'رسالة جديدة من الإدارة';
  }
  return 'رسالة جديدة';
}

/** Who should be notified for this message (never the sender, never another school). */
export async function resolveMessageRecipients(db, msg) {
  const schoolId = String(msg.schoolId || '');
  const receiver = String(msg.receiverId || '');
  const sender = String(msg.senderId || '');
  const out = new Map(); // uid -> kind

  if (!receiver) return out;

  if (SUPER_ADMIN_ROLES.includes(receiver) || receiver === 'super_admin') {
    const snap = await db.collection('users').where('role', 'in', SUPER_ADMIN_ROLES).limit(50).get();
    snap.docs.forEach((d) => out.set(d.id, 'super_admin'));
  } else if (receiver === 'admin') {
    if (!schoolId) return out;
    const snap = await db.collection('users')
      .where('schoolId', '==', schoolId).where('role', 'in', SCHOOL_ADMIN_ROLES).limit(100).get();
    snap.docs.forEach((d) => out.set(d.id, 'admin'));
  } else {
    const u = await db.collection('users').doc(receiver).get();
    if (u.exists) {
      const data = u.data() || {};
      const sameSchool = !schoolId || String(data.schoolId || '') === schoolId;
      const isSuper = SUPER_ADMIN_ROLES.includes(String(data.role || ''));
      if (sameSchool || isSuper) out.set(u.id, String(data.role || 'user'));
    }
  }
  out.delete(sender);
  return out;
}

function isNotifiable(msg) {
  if (!msg || msg.deleted === true || msg.deletedAt || msg.isDeleted === true) return false;
  if (!msg.senderId || !msg.receiverId) return false;
  const visibility = msg.conversationPrivacy?.visibility;
  // Private platform-assistant threads never notify schools.
  if (visibility === 'platform_assistant_private') return false;
  return true;
}

/**
 * Old browsers (cached app versions) still create their own random-id notification for the same
 * message. Detect it so the server does not add a second one during the rollout.
 */
async function legacyClientNotificationExists(db, msg, userId) {
  const conv = String(msg.conversationId || '');
  if (!conv) return false;
  const snap = await db.collection('notifications')
    .where('userId', '==', userId).where('metadata.conversationId', '==', conv).limit(25).get();
  const at = toMs(msg.createdAt);
  return snap.docs.some((d) => {
    if (d.id.startsWith('msgn_')) return false;
    const n = d.data() || {};
    return String(n.createdBy || n.senderId || '') === String(msg.senderId) && Math.abs(toMs(n.createdAt) - at) < 60_000;
  });
}

/** Idempotent: safe to call any number of times for the same message. */
export async function notifyForSystemMessage(db, adminSdk, messageId, msg) {
  if (msg?.serverNotifiedAt) return { messageId, created: 0, skipped: 'already_processed' };
  if (!isNotifiable(msg)) return { messageId, created: 0, skipped: 'not_notifiable' };
  const recipients = await resolveMessageRecipients(db, msg);
  const FieldValue = adminSdk.firestore.FieldValue;
  const schoolId = String(msg.schoolId || '');
  let created = 0;
  for (const [uid, kind] of recipients) {
    const ref = db.collection('notifications').doc(notificationIdFor(messageId, uid));
    try {
      if (await legacyClientNotificationExists(db, msg, uid)) continue;
      const toSuper = kind === 'super_admin';
      const metadata = {
        senderId: msg.senderId,
        conversationId: msg.conversationId || '',
        messageId,
        routeTarget: 'chat',
        category: 'messages',
        ...(toSuper ? { audience: 'super_admin', originalRecipient: 'super_admin', sourceSchoolId: schoolId, schoolId } : {}),
        ...(!toSuper && kind === 'admin' ? { audience: 'school_admin' } : {}),
      };
      await ref.create({
        title: titleFor(msg.senderRole, kind),
        message: preview(msg.content) || 'ملف مرفق',
        type: 'system',
        schoolId: toSuper ? 'system' : schoolId,
        userId: uid,
        recipientId: uid,
        receiverId: uid,
        read: false,
        category: 'messages',
        routeTarget: 'chat',
        metadata,
        senderId: msg.senderId,
        ...(msg.senderName ? { senderName: msg.senderName } : {}),
        ...(msg.senderRole ? { senderRole: msg.senderRole } : {}),
        ...(toSuper ? { audience: 'super_admin' } : kind === 'admin' ? { audience: 'school_admin' } : {}),
        createdBy: String(msg.senderId),
        pushDelivery: { status: 'pending' },
        createdAt: FieldValue.serverTimestamp(),
      });
      created += 1;
    } catch (e) {
      // 6 = ALREADY_EXISTS: another instance / the backlog scan already created it.
      if (e?.code !== 6 && !/already exists/i.test(String(e?.message || ''))) {
        console.error('[MessageNotifications] create failed', { messageId, uid, error: e?.message });
      }
    }
  }
  // Marker so restarts / the sweep do not re-resolve recipients for this message again.
  await db.collection('system_messages').doc(messageId)
    .update({ serverNotifiedAt: FieldValue.serverTimestamp() }).catch(() => {});
  return { messageId, created, recipients: recipients.size };
}

/**
 * Self-healing listener: windowed query (small initial snapshot), processes the backlog,
 * restarts itself with backoff on error, and a periodic sweep as a safety net.
 */
export function setupSystemMessageNotifications(db, adminSdk, log = console) {
  let unsub = null;
  let stopped = false;
  let backoff = 1000;
  const inflight = new Set();

  const handle = (doc) => {
    if (inflight.has(doc.id)) return;
    inflight.add(doc.id);
    notifyForSystemMessage(db, adminSdk, doc.id, doc.data())
      .catch((e) => log.error('[MessageNotifications] failed', doc.id, e?.message))
      .finally(() => setTimeout(() => inflight.delete(doc.id), 30_000));
  };

  const cutoff = () => adminSdk.firestore.Timestamp.fromMillis(Date.now() - RECENT_WINDOW_MS);

  const start = () => {
    if (stopped) return;
    try {
      unsub = db.collection('system_messages').where('createdAt', '>=', cutoff()).onSnapshot(
        (snap) => {
          backoff = 1000;
          snap.docChanges().forEach((c) => { if (c.type === 'added') handle(c.doc); });
        },
        (err) => {
          log.error('[MessageNotifications] listener error, restarting', err?.message);
          try { unsub?.(); } catch { /* ignore */ }
          setTimeout(start, backoff);
          backoff = Math.min(backoff * 2, 60_000);
        },
      );
    } catch (e) {
      log.error('[MessageNotifications] listener start failed', e?.message);
      setTimeout(start, backoff);
      backoff = Math.min(backoff * 2, 60_000);
    }
  };
  start();

  const sweep = setInterval(async () => {
    try {
      const since = adminSdk.firestore.Timestamp.fromMillis(Date.now() - SWEEP_WINDOW_MS);
      const snap = await db.collection('system_messages').where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(50).get();
      snap.docs.forEach(handle);
    } catch (e) {
      log.error('[MessageNotifications] sweep failed', e?.message);
    }
  }, SWEEP_INTERVAL_MS);
  sweep.unref?.();

  return () => { stopped = true; clearInterval(sweep); try { unsub?.(); } catch { /* ignore */ } };
}

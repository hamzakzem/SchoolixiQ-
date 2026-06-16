const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const PUSH_MAX_AGE_MS = 10 * 60 * 1000;
const TERMINAL = new Set(['sent', 'partial', 'skipped', 'no_tokens', 'failed', 'error']);

function log(event, meta) {
  console.info(`[Notifications] ${event}`, meta);
}

function createdAtMs(notif) {
  const ca = notif.createdAt;
  if (!ca) return null;
  if (typeof ca.toMillis === 'function') return ca.toMillis();
  if (typeof ca.seconds === 'number') return ca.seconds * 1000;
  return null;
}

function isTerminal(notif) {
  if (notif.pushDispatched === true) return true;
  const s = notif.pushDelivery?.status;
  return Boolean(s && TERMINAL.has(s));
}

function withinWindow(notif) {
  const ms = createdAtMs(notif);
  if (ms === null) return true;
  return Date.now() - ms <= PUSH_MAX_AGE_MS;
}

async function dispatchPush(notifId, notif) {
  const db = admin.firestore();
  const docRef = db.collection('notifications').doc(notifId);
  const userId = notif.userId;
  if (!userId) {
    await docRef.set({ pushDelivery: { status: 'skipped', reason: 'no_userId', at: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
    return;
  }

  let tokens = [];
  if (userId === 'super_admin') {
    const snap = await db.collection('users').where('role', '==', 'superadmin').get();
    snap.docs.forEach((d) => {
      const t = d.data().fcmTokens;
      if (Array.isArray(t)) tokens.push(...t);
    });
  } else {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      await docRef.set({ pushDelivery: { status: 'no_tokens', at: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
      return;
    }
    const userData = userDoc.data() || {};
    const schoolId = String(notif.schoolId || '');
    if (schoolId && schoolId !== 'system' && userData.schoolId && userData.schoolId !== schoolId) {
      log('PUSH_SEND_SKIPPED', { notifId, reason: 'school_mismatch' });
      return;
    }
    if (Array.isArray(userData.fcmTokens)) tokens = userData.fcmTokens;
  }

  tokens = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim()))];
  if (tokens.length === 0) {
    await docRef.set({ pushDelivery: { status: 'no_tokens', at: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
    log('PUSH_SEND_SKIPPED', { notifId, reason: 'no_tokens' });
    return;
  }

  const title = String(notif.title || 'إشعار جديد');
  const message = String(notif.message || notif.content || '');
  const type = String(notif.type || 'system');
  const routeTarget = String(notif.routeTarget || notif.metadata?.routeTarget || notif.metadata?.route || type);
  const appUrl = (process.env.APP_URL || functions.config().app?.url || '').replace(/\/$/, '');
  const clickUrl = appUrl ? `${appUrl}/?tab=${encodeURIComponent(routeTarget)}` : `/?tab=${encodeURIComponent(routeTarget)}`;

  log('PUSH_SEND_START', { notifId, userId, type });

  const messages = tokens.map((token) => ({
    token,
    notification: { title, body: message },
    data: {
      type,
      schoolId: String(notif.schoolId || ''),
      userId: String(userId),
      notificationId: notifId,
      routeTarget,
      route: routeTarget,
      url: clickUrl,
    },
    webpush: appUrl ? { fcmOptions: { link: clickUrl } } : undefined,
    android: { priority: 'high', notification: { sound: 'default' } },
    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
  }));

  const response = await admin.messaging().sendEach(messages);
  const invalid = [];
  response.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
      invalid.push(tokens[i]);
    }
  });

  if (invalid.length && userId !== 'super_admin') {
    await db.collection('users').doc(userId).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalid),
    });
  }

  const status = response.failureCount === 0 ? 'sent' : 'partial';
  await docRef.set({
    pushDispatched: status === 'sent' || status === 'partial',
    pushDispatchedAt: admin.firestore.FieldValue.serverTimestamp(),
    pushDelivery: {
      status,
      successCount: response.successCount,
      failureCount: response.failureCount,
      at: admin.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });

  log('PUSH_SEND_SUCCESS', { notifId, successCount: response.successCount, failureCount: response.failureCount });
}

exports.dispatchNotificationPush = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notifId = context.params.notificationId;
    const notif = snap.data();
    if (isTerminal(notif)) return null;
    if (!withinWindow(notif)) {
      await snap.ref.set({ pushDelivery: { status: 'skipped', reason: 'too_old', at: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
      log('PUSH_SEND_SKIPPED', { notifId, reason: 'too_old' });
      return null;
    }

    const claim = await admin.firestore().runTransaction(async (tx) => {
      const fresh = await tx.get(snap.ref);
      const data = fresh.data() || {};
      if (isTerminal(data)) return false;
      tx.set(snap.ref, { pushDelivery: { status: 'pending', lockedAt: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
      return true;
    });

    if (!claim) {
      log('PUSH_SEND_SKIPPED', { notifId, reason: 'claim_failed' });
      return null;
    }

    try {
      await dispatchPush(notifId, notif);
    } catch (err) {
      log('PUSH_SEND_ERROR', { notifId, error: String(err.message || err) });
      await snap.ref.set({ pushDelivery: { status: 'error', error: String(err.message || err), at: admin.firestore.FieldValue.serverTimestamp() } }, { merge: true });
    }
    return null;
  });

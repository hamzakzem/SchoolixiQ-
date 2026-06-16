const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp, getApps, getApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

/** Must match firebase-applet-config.json firestoreDatabaseId — NOT (default). */
const DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-5b7cdad3-1c88-4eed-9aca-523fba814a76';

const PUSH_MAX_AGE_MS = 10 * 60 * 1000;
const TERMINAL = new Set(['sent', 'partial', 'skipped', 'no_tokens', 'failed', 'error']);

function pushLog(event, meta = {}) {
  console.info(`[NotificationsPush] ${event}`, { databaseId: DATABASE_ID, ...meta });
}

function getAdminApp() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getApp();
}

function getDb() {
  getAdminApp();
  return getFirestore(getAdminApp(), DATABASE_ID);
}

function getMessagingService() {
  getAdminApp();
  return getMessaging(getAdminApp());
}

function getAdminContext() {
  getAdminApp();
  return {
    db: getDb(),
    FieldValue,
    messaging: getMessagingService(),
  };
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

function resolveAppUrl() {
  return String(process.env.APP_URL || 'https://schoolixiq.com').replace(/\/$/, '');
}

async function writeDelivery(docRef, payload) {
  await docRef.set(
    {
      pushDispatched: payload.status === 'sent' || payload.status === 'partial',
      pushDispatchedAt: FieldValue.serverTimestamp(),
      pushDelivery: {
        ...payload,
        at: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
  pushLog('STATUS_WRITTEN', {
    notifId: docRef.id,
    status: payload.status,
    reason: payload.reason,
    successCount: payload.successCount,
    failureCount: payload.failureCount,
  });
}

async function dispatchPush(notifId, notif, ctx) {
  const { db, messaging } = ctx;
  const docRef = db.collection('notifications').doc(notifId);
  const userId = notif.userId;

  if (!userId) {
    await writeDelivery(docRef, { status: 'skipped', reason: 'no_userId' });
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
      pushLog('NO_TOKENS', { notifId, userId, reason: 'user_missing' });
      await writeDelivery(docRef, { status: 'no_tokens', reason: 'user_missing' });
      return;
    }
    const userData = userDoc.data() || {};
    const schoolId = String(notif.schoolId || '');
    if (schoolId && schoolId !== 'system' && userData.schoolId && userData.schoolId !== schoolId) {
      pushLog('PUSH_SEND_SKIPPED', { notifId, userId, reason: 'school_mismatch' });
      await writeDelivery(docRef, { status: 'skipped', reason: 'school_mismatch' });
      return;
    }
    if (Array.isArray(userData.fcmTokens)) tokens = userData.fcmTokens;
  }

  tokens = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim()))];
  pushLog('TOKEN_COUNT', { notifId, userId, tokenCount: tokens.length });

  if (tokens.length === 0) {
    pushLog('NO_TOKENS', { notifId, userId });
    await writeDelivery(docRef, { status: 'no_tokens' });
    return;
  }

  const title = String(notif.title || 'إشعار جديد');
  const message = String(notif.message || notif.content || '');
  const type = String(notif.type || 'system');
  const routeTarget = String(
    notif.routeTarget || notif.metadata?.routeTarget || notif.metadata?.route || type,
  );
  const appUrl = resolveAppUrl();
  const clickUrl = appUrl
    ? `${appUrl}/?tab=${encodeURIComponent(routeTarget)}`
    : `/?tab=${encodeURIComponent(routeTarget)}`;

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

  const response = await messaging.sendEach(messages);
  const invalid = [];
  const fcmErrors = [];
  response.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code || 'unknown';
    fcmErrors.push({ code, index: i });
    if (
      code.includes('registration-token-not-registered') ||
      code.includes('invalid-registration-token')
    ) {
      invalid.push(tokens[i]);
    }
  });

  if (fcmErrors.length) {
    pushLog('FCM_ERROR', { notifId, userId, errors: fcmErrors.slice(0, 5) });
  }

  if (invalid.length && userId !== 'super_admin') {
    await db
      .collection('users')
      .doc(userId)
      .update({ fcmTokens: FieldValue.arrayRemove(...invalid) });
  }

  const status = response.failureCount === 0 ? 'sent' : 'partial';
  pushLog('SEND_RESULT', {
    notifId,
    userId,
    status,
    successCount: response.successCount,
    failureCount: response.failureCount,
  });

  await writeDelivery(docRef, {
    status,
    successCount: response.successCount,
    failureCount: response.failureCount,
    errorMessage: fcmErrors.length ? fcmErrors.map((e) => e.code).join(', ') : undefined,
  });
}

exports.dispatchNotificationPush = onDocumentCreated(
  {
    document: 'notifications/{notificationId}',
    database: DATABASE_ID,
    region: 'europe-west2',
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const ctx = getAdminContext();
    const { db } = ctx;
    const notifId = event.params.notificationId;
    const notif = snap.data();
    const docRef = db.collection('notifications').doc(notifId);

    pushLog('FUNCTION_TRIGGERED', {
      notificationId: notifId,
      userId: notif.userId,
      type: notif.type,
      schoolId: notif.schoolId,
      pushStatus: notif.pushDelivery?.status,
    });

    if (isTerminal(notif)) {
      pushLog('PUSH_SEND_SKIPPED', { notifId, reason: 'terminal_at_entry' });
      return;
    }

    if (!withinWindow(notif)) {
      await writeDelivery(docRef, { status: 'skipped', reason: 'too_old' });
      pushLog('PUSH_SEND_SKIPPED', { notifId, reason: 'too_old' });
      return;
    }

    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(docRef);
      const data = fresh.data() || {};
      if (isTerminal(data)) return false;

      const delivery = data.pushDelivery || {};
      if (delivery.status === 'pending' && delivery.lockedAt?.toMillis) {
        if (Date.now() - delivery.lockedAt.toMillis() < 90_000) return false;
      }

      tx.set(
        docRef,
        {
          pushDelivery: {
            status: 'pending',
            lockedAt: FieldValue.serverTimestamp(),
            lockedBy: 'dispatchNotificationPush',
          },
        },
        { merge: true },
      );
      return true;
    });

    if (!claimed) {
      pushLog('PUSH_SEND_SKIPPED', { notifId, reason: 'claim_failed' });
      return;
    }

    try {
      await dispatchPush(notifId, notif, ctx);
    } catch (err) {
      const msg = String(err.message || err);
      pushLog('FCM_ERROR', { notifId, error: msg });
      await writeDelivery(docRef, { status: 'error', errorMessage: msg });
    }
  },
);

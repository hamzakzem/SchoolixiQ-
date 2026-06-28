const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, getApps, getApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

const firebaseAppletConfig = require('./firebase-applet-config.json');

/** Matches firebase-applet-config.json; omit or "(default)" uses the standard database. */
const DATABASE_ID = (() => {
  const id =
    process.env.FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId;
  if (!id || id === '(default)') return '(default)';
  return id;
})();

const PUSH_MAX_AGE_MS = 10 * 60 * 1000;
const TERMINAL = new Set(['sent', 'partial', 'skipped', 'no_tokens', 'failed', 'error']);
const POLL_DEFAULT_LIMIT = 50;

function pushLog(event, meta = {}) {
  console.info(`[NotificationsPush] ${event}`, { databaseId: DATABASE_ID, ...meta });
}

function pollLog(event, meta = {}) {
  console.info(`[NotificationsPushPoll] ${event}`, { databaseId: DATABASE_ID, ...meta });
}

function getAdminApp() {
  try {
    return getApp();
  } catch {
    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      undefined;
    return initializeApp(projectId ? { projectId } : undefined);
  }
}

function getDb() {
  return getFirestore(getAdminApp(), DATABASE_ID);
}

function getMessagingService() {
  return getMessaging(getAdminApp());
}

function getAdminContext() {
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

function isPending(notif) {
  if (isTerminal(notif)) return false;
  const s = notif.pushDelivery?.status;
  return !s || s === 'pending';
}

function withinWindow(notif) {
  const ms = createdAtMs(notif);
  if (ms === null) return true;
  return Date.now() - ms <= PUSH_MAX_AGE_MS;
}

function resolveAppUrl() {
  return String(process.env.APP_URL || 'https://schoolixiq.com').replace(/\/$/, '');
}

function isInvalidFcmTokenError(code) {
  if (!code) return false;
  if (
    code.includes('registration-token-not-registered') ||
    code.includes('invalid-registration-token')
  ) {
    return true;
  }
  // sendEach returns one response per token — invalid-argument here is token-specific.
  if (code.includes('invalid-argument')) {
    return true;
  }
  return false;
}

async function removeInvalidFcmTokens(db, userId, invalidTokens, userData = {}) {
  const uniqueInvalid = [...new Set(invalidTokens.filter((t) => typeof t === 'string' && t.trim()))];
  if (uniqueInvalid.length === 0) return;

  pushLog('TOKEN_CLEANUP_START', { userId, count: uniqueInvalid.length });

  const update = {
    fcmTokens: FieldValue.arrayRemove(...uniqueInvalid),
  };

  if (Array.isArray(userData.fcmDevices) && userData.fcmDevices.length > 0) {
    const invalidSet = new Set(uniqueInvalid);
    const filteredDevices = userData.fcmDevices.filter((device) => {
      if (!device || typeof device !== 'object') return true;
      const token = device.token;
      return typeof token !== 'string' || !invalidSet.has(token);
    });
    if (filteredDevices.length !== userData.fcmDevices.length) {
      update.fcmDevices = filteredDevices;
    }
  }

  try {
    await db.collection('users').doc(userId).update(update);
    pushLog('TOKEN_CLEANUP_REMOVED', { userId, count: uniqueInvalid.length });
  } catch (err) {
    pushLog('TOKEN_CLEANUP_ERROR', {
      userId,
      count: uniqueInvalid.length,
      error: String(err.message || err),
    });
  }
}

function resolvePushDeliveryStatus(successCount, failureCount) {
  if (successCount > 0 && failureCount === 0) return 'sent';
  if (successCount > 0 && failureCount > 0) return 'partial';
  if (successCount === 0 && failureCount > 0) return 'error';
  return 'error';
}

function omitUndefinedFields(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function formatFcmErrorCodes(fcmErrors) {
  if (!Array.isArray(fcmErrors) || fcmErrors.length === 0) return null;
  const codes = [...new Set(fcmErrors.map((e) => e.code).filter((c) => typeof c === 'string' && c.trim()))];
  return codes.length ? codes.join(', ') : null;
}

async function writeDelivery(docRef, payload) {
  const status = payload.status;
  const pushDelivery = omitUndefinedFields({
    status,
    reason: typeof payload.reason === 'string' ? payload.reason : undefined,
    successCount: typeof payload.successCount === 'number' ? payload.successCount : undefined,
    failureCount: typeof payload.failureCount === 'number' ? payload.failureCount : undefined,
  });
  pushDelivery.at = FieldValue.serverTimestamp();

  const explicitError =
    typeof payload.errorMessage === 'string' && payload.errorMessage.trim()
      ? payload.errorMessage.trim()
      : null;

  if (status === 'sent') {
    pushDelivery.errorMessage = FieldValue.delete();
  } else if (status === 'partial' || status === 'error') {
    pushDelivery.errorMessage = explicitError || 'unknown_fcm_error';
  } else if (explicitError) {
    pushDelivery.errorMessage = explicitError;
  }

  await docRef.set(
    {
      pushDispatched: status === 'sent' || status === 'partial',
      pushDispatchedAt: FieldValue.serverTimestamp(),
      pushDelivery,
    },
    { merge: true },
  );
  pushLog('STATUS_WRITTEN', {
    notifId: docRef.id,
    status,
    reason: pushDelivery.reason,
    successCount: pushDelivery.successCount,
    failureCount: pushDelivery.failureCount,
  });
}

async function dispatchPush(notifId, notif, ctx) {
  const { db, messaging } = ctx;
  const docRef = db.collection('notifications').doc(notifId);
  const userId = notif.userId;

  if (!userId) {
    await writeDelivery(docRef, { status: 'skipped', reason: 'no_userId' });
    return { notifId, status: 'skipped', reason: 'no_userId' };
  }

  if (userId === 'super_admin') {
    pushLog('INVALID_RECIPIENT_POOL', { notifId, userId, reason: 'legacy_pool_recipient' });
    await writeDelivery(docRef, { status: 'skipped', reason: 'invalid_recipient_pool' });
    return { notifId, status: 'skipped', reason: 'invalid_recipient_pool' };
  }

  let tokens = [];
  let userData = {};
  {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      pushLog('NO_TOKENS', { notifId, userId, reason: 'user_missing' });
      await writeDelivery(docRef, { status: 'no_tokens', reason: 'user_missing' });
      return { notifId, status: 'no_tokens', reason: 'user_missing' };
    }
    userData = userDoc.data() || {};
    const schoolId = String(notif.schoolId || '');
    if (schoolId && schoolId !== 'system' && userData.schoolId && userData.schoolId !== schoolId) {
      pushLog('PUSH_SEND_SKIPPED', { notifId, userId, reason: 'school_mismatch' });
      await writeDelivery(docRef, { status: 'skipped', reason: 'school_mismatch' });
      return { notifId, status: 'skipped', reason: 'school_mismatch' };
    }
    if (Array.isArray(userData.fcmTokens)) tokens = userData.fcmTokens;
  }

  tokens = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim()))];
  pushLog('TOKEN_COUNT', { notifId, userId, tokenCount: tokens.length });

  if (tokens.length === 0) {
    pushLog('NO_TOKENS', { notifId, userId });
    await writeDelivery(docRef, { status: 'no_tokens' });
    return { notifId, status: 'no_tokens' };
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
    if (isInvalidFcmTokenError(code)) {
      invalid.push(tokens[i]);
    }
  });

  if (fcmErrors.length) {
    pushLog('FCM_ERROR', { notifId, userId, errors: fcmErrors.slice(0, 5) });
  }

  if (invalid.length) {
    await removeInvalidFcmTokens(db, userId, invalid, userData);
  }

  const status = resolvePushDeliveryStatus(response.successCount, response.failureCount);
  pushLog('SEND_RESULT', {
    notifId,
    userId,
    status,
    successCount: response.successCount,
    failureCount: response.failureCount,
  });

  await writeDelivery(docRef, omitUndefinedFields({
    status,
    successCount: response.successCount,
    failureCount: response.failureCount,
    ...(response.failureCount > 0
      ? { errorMessage: formatFcmErrorCodes(fcmErrors) || 'unknown_fcm_error' }
      : {}),
  }));

  return {
    notifId,
    status,
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}

async function claimNotification(docRef, lockedBy) {
  return docRef.firestore.runTransaction(async (tx) => {
    const fresh = await tx.get(docRef);
    if (!fresh.exists) return { claimed: false, notif: null, reason: 'missing' };

    const data = fresh.data() || {};
    if (isTerminal(data)) return { claimed: false, notif: data, reason: 'terminal' };

    if (!withinWindow(data)) {
      tx.set(
        docRef,
        {
          pushDelivery: {
            status: 'skipped',
            reason: 'too_old',
            at: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
      return { claimed: false, notif: data, reason: 'too_old' };
    }

    const delivery = data.pushDelivery || {};
    if (delivery.status === 'pending' && delivery.lockedAt?.toMillis) {
      if (Date.now() - delivery.lockedAt.toMillis() < 90_000) {
        return { claimed: false, notif: data, reason: 'locked' };
      }
    }

    tx.set(
      docRef,
      {
        pushDelivery: {
          status: 'pending',
          lockedAt: FieldValue.serverTimestamp(),
          lockedBy,
        },
      },
      { merge: true },
    );
    return { claimed: true, notif: data };
  });
}

async function processNotificationDocument(notifId, notif, ctx, lockedBy) {
  const { db } = ctx;
  const docRef = db.collection('notifications').doc(notifId);

  if (isTerminal(notif)) {
    pushLog('PUSH_SEND_SKIPPED', { notifId, reason: 'terminal_at_entry' });
    return null;
  }

  if (!withinWindow(notif)) {
    await writeDelivery(docRef, { status: 'skipped', reason: 'too_old' });
    pushLog('PUSH_SEND_SKIPPED', { notifId, reason: 'too_old' });
    return { notifId, status: 'skipped', reason: 'too_old' };
  }

  const claim = await claimNotification(docRef, lockedBy);
  if (!claim.claimed) {
    if (claim.reason && claim.reason !== 'locked') {
      pushLog('PUSH_SEND_SKIPPED', { notifId, reason: claim.reason });
    }
    return claim.reason ? { notifId, status: 'skipped', reason: claim.reason } : null;
  }

  try {
    return await dispatchPush(notifId, claim.notif || notif, ctx);
  } catch (err) {
    const msg = String(err.message || err);
    pushLog('FCM_ERROR', { notifId, error: msg });
    await writeDelivery(docRef, { status: 'error', errorMessage: msg });
    return { notifId, status: 'error', errorMessage: msg };
  }
}

async function pollPendingNotificationPushes(ctx, limit = POLL_DEFAULT_LIMIT) {
  const { db } = ctx;
  const cutoff = Timestamp.fromMillis(Date.now() - PUSH_MAX_AGE_MS);
  const snap = await db
    .collection('notifications')
    .where('createdAt', '>=', cutoff)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(limit, 100))
    .get();

  const pending = snap.docs.filter((d) => isPending(d.data()));
  pollLog('FOUND_PENDING', { scanned: snap.size, pending: pending.length });

  const results = [];
  for (const docSnap of pending) {
    const result = await processNotificationDocument(
      docSnap.id,
      docSnap.data(),
      ctx,
      'dispatchPendingNotificationPushes',
    );
    if (result) {
      pollLog('DISPATCHED', result);
      results.push(result);
    }
  }
  return results;
}

function verifyCronSecret(req) {
  const secret = process.env.NOTIFICATION_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return { ok: false, error: 'NOTIFICATION_CRON_SECRET not configured' };
  if (req.headers['x-cron-secret'] !== secret) return { ok: false, error: 'Unauthorized' };
  return { ok: true };
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
    const notifId = event.params.notificationId;
    const notif = snap.data();

    pushLog('FUNCTION_TRIGGERED', {
      notificationId: notifId,
      userId: notif.userId,
      type: notif.type,
      schoolId: notif.schoolId,
      pushStatus: notif.pushDelivery?.status,
    });

    await processNotificationDocument(notifId, notif, ctx, 'dispatchNotificationPush');
  },
);

exports.dispatchPendingNotificationPushes = onRequest(
  {
    region: 'europe-west2',
    cors: false,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      return;
    }

    const auth = verifyCronSecret(req);
    if (!auth.ok) {
      res.status(auth.error === 'Unauthorized' ? 401 : 503).json({ success: false, error: auth.error });
      return;
    }

    pollLog('START', { limit: req.body?.limit || POLL_DEFAULT_LIMIT });

    try {
      const ctx = getAdminContext();
      const limit = Math.min(Number(req.body?.limit) || POLL_DEFAULT_LIMIT, 100);
      const results = await pollPendingNotificationPushes(ctx, limit);
      pollLog('DONE', { processed: results.length });
      res.json({ success: true, processed: results.length, results });
    } catch (err) {
      const msg = String(err.message || err);
      pollLog('DONE', { error: msg });
      res.status(500).json({ success: false, error: msg });
    }
  },
);

const { onSchedule } = require('firebase-functions/v2/scheduler');

const CLEANUP_BATCH_SIZE = 400;
const RETENTION_MS = {
  audit_logs: 90 * 24 * 60 * 60 * 1000,
  login_logs: 60 * 24 * 60 * 60 * 1000,
  print_logs: 30 * 24 * 60 * 60 * 1000,
};

function cleanupLog(event, meta = {}) {
  console.info(`[CleanupOldFirestoreData] ${event}`, { databaseId: DATABASE_ID, ...meta });
}

async function deleteQueryBatch(db, queryRef, filterFn) {
  const snap = await queryRef.limit(CLEANUP_BATCH_SIZE).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  let count = 0;
  for (const docSnap of snap.docs) {
    if (filterFn && !filterFn(docSnap)) continue;
    batch.delete(docSnap.ref);
    count += 1;
  }
  if (count === 0) return 0;
  await batch.commit();
  return count;
}

async function deleteExpiredByField(db, collectionName, fieldName, filterFn) {
  const now = Timestamp.now();
  return deleteQueryBatch(
    db,
    db.collection(collectionName).where(fieldName, '<=', now),
    filterFn,
  );
}

async function deleteOlderThanCreatedAt(db, collectionName, maxAgeMs) {
  const cutoff = Timestamp.fromMillis(Date.now() - maxAgeMs);
  return deleteQueryBatch(
    db,
    db.collection(collectionName).where('createdAt', '<', cutoff),
  );
}

async function runCleanupOldFirestoreData() {
  const db = getDb();
  const stats = {};

  stats.audit_logs_expires = await deleteExpiredByField(db, 'audit_logs', 'expiresAt');
  stats.audit_logs_created = await deleteOlderThanCreatedAt(db, 'audit_logs', RETENTION_MS.audit_logs);

  stats.login_logs_expires = await deleteExpiredByField(db, 'login_logs', 'expiresAt');
  stats.login_logs_created = await deleteOlderThanCreatedAt(db, 'login_logs', RETENTION_MS.login_logs);

  stats.print_logs_expires = await deleteExpiredByField(db, 'print_logs', 'expiresAt');
  stats.print_logs_created = await deleteOlderThanCreatedAt(db, 'print_logs', RETENTION_MS.print_logs);

  stats.tuition_reminder_logs = await deleteExpiredByField(db, 'tuition_reminder_logs', 'expiresAt');

  stats.notifications = await deleteExpiredByField(db, 'notifications', 'expiresAt');
  stats.notifications_seen = await deleteExpiredByField(
    db,
    'notifications',
    'deleteAfter',
    (docSnap) => {
      const data = docSnap.data() || {};
      const type = String(data.type ?? '').toLowerCase();
      const criticalTypes = new Set(['security', 'billing', 'subscription', 'system_critical']);
      if (criticalTypes.has(type)) return false;
      const meta = data.metadata || {};
      if (meta.critical === true || meta.systemCritical === true || meta.retainOnOpen === true) {
        return false;
      }
      return true;
    },
  );

  stats.system_messages = await deleteQueryBatch(
    db,
    db.collection('system_messages').where('expiresAt', '<=', Timestamp.now()),
    (docSnap) => {
      const data = docSnap.data() || {};
      return data.pinned !== true && data.archived !== true && data.legalHold !== true;
    },
  );

  const softDeleteCutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  stats.system_messages_soft_deleted = await deleteQueryBatch(
    db,
    db.collection('system_messages').where('deleted', '==', true),
    (docSnap) => {
      const data = docSnap.data() || {};
      if (data.pinned === true || data.archived === true || data.legalHold === true) {
        return false;
      }
      const deletedAt = data.deletedAt;
      if (!deletedAt || typeof deletedAt.toMillis !== 'function') return false;
      return deletedAt.toMillis() <= softDeleteCutoffMs;
    },
  );

  return stats;
}

exports.cleanupOldFirestoreData = onSchedule(
  {
    schedule: '0 3 1 * *',
    timeZone: 'Asia/Baghdad',
    region: 'europe-west2',
  },
  async () => {
    cleanupLog('START');
    try {
      const stats = await runCleanupOldFirestoreData();
      cleanupLog('DONE', { stats });
    } catch (err) {
      cleanupLog('ERROR', { message: String(err.message || err) });
      throw err;
    }
  },
);

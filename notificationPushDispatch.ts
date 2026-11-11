/**
 * Server-side FCM push dispatch for Firestore `notifications` documents.
 * Used by server.ts (dev) and bundled into backend/server.mjs (production).
 */
import type admin from 'firebase-admin';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';

/** Only push notifications created within this window (prevents resending old docs on listener restart). */
export const PUSH_MAX_AGE_MS = 10 * 60 * 1000;

const TERMINAL_STATUSES = new Set(['sent', 'partial', 'skipped', 'no_tokens', 'failed', 'error']);

/** A failed push is retried a few times (only while the notification is still fresh). */
export const PUSH_MAX_ATTEMPTS = 3;
const PUSH_RETRY_DELAYS_MS = [30_000, 90_000];

const TRANSIENT_CODES = new Set([
  'messaging/server-unavailable', 'messaging/internal-error', 'messaging/unknown-error',
  'messaging/quota-exceeded', 'app/network-error', 'app/network-timeout',
]);

export function isTransientPushError(err: unknown): boolean {
  const e = err as { code?: unknown; errorInfo?: { code?: string }; message?: unknown } | undefined;
  const code = String(e?.errorInfo?.code ?? e?.code ?? '');
  if (TRANSIENT_CODES.has(code)) return true;
  if (['4', '8', '13', '14'].includes(code)) return true; // gRPC DEADLINE / RESOURCE_EXHAUSTED / INTERNAL / UNAVAILABLE
  return /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|fetch failed|UNAVAILABLE|DEADLINE_EXCEEDED|timed? ?out/i.test(String(e?.message ?? ''));
}

export type PushDispatchResult = {
  notifId: string;
  status: 'sent' | 'partial' | 'skipped' | 'no_tokens' | 'failed' | 'error' | 'retry';
  reason?: string;
  successCount?: number;
  failureCount?: number;
};

function logPush(event: string, meta: Record<string, unknown>) {
  console.info(`[Notifications] ${event}`, meta);
}

function getCreatedAtMs(notif: Record<string, unknown>): number | null {
  const ca = notif.createdAt as
    | { toMillis?: () => number; seconds?: number }
    | Date
    | undefined;
  if (!ca) return null;
  if (typeof (ca as { toMillis?: () => number }).toMillis === 'function') {
    return (ca as { toMillis: () => number }).toMillis();
  }
  if (typeof (ca as { seconds?: number }).seconds === 'number') {
    return (ca as { seconds: number }).seconds * 1000;
  }
  if (ca instanceof Date) return ca.getTime();
  return null;
}

export function isPushTerminal(notif: Record<string, unknown>): boolean {
  if (notif.pushDispatched === true) return true;
  const status = (notif.pushDelivery as { status?: string } | undefined)?.status;
  return Boolean(status && TERMINAL_STATUSES.has(status));
}

export function isWithinPushAgeWindow(
  notif: Record<string, unknown>,
  maxAgeMs = PUSH_MAX_AGE_MS,
): boolean {
  const ms = getCreatedAtMs(notif);
  if (ms === null) return true;
  return Date.now() - ms <= maxAgeMs;
}

/** Schedule another attempt, or give up (terminal 'error') after PUSH_MAX_ATTEMPTS. */
async function scheduleRetryOrFail(
  docRef: DocumentReference,
  adminSdk: typeof admin,
  notif: Record<string, unknown>,
  reason: string,
): Promise<PushDispatchResult> {
  const prev = Number((notif.pushDelivery as { attempts?: number } | undefined)?.attempts || 0);
  const attempts = prev + 1;
  const notifId = docRef.id;
  if (attempts >= PUSH_MAX_ATTEMPTS) {
    await writePushDelivery(docRef, adminSdk, { status: 'error', error: reason, attempts });
    logPush('PUSH_SEND_ERROR', { notifId, error: reason, attempts, final: true });
    return { notifId, status: 'error', reason };
  }
  const delay = PUSH_RETRY_DELAYS_MS[Math.min(prev, PUSH_RETRY_DELAYS_MS.length - 1)];
  await docRef.set(
    {
      pushDelivery: {
        status: 'retry',
        attempts,
        lastError: reason.slice(0, 120),
        nextAttemptAt: adminSdk.firestore.Timestamp.fromMillis(Date.now() + delay),
      },
    },
    { merge: true },
  );
  logPush('PUSH_SEND_RETRY', { notifId, attempts, inMs: delay, reason: reason.slice(0, 120) });
  return { notifId, status: 'retry', reason };
}

async function writePushDelivery(
  docRef: DocumentReference,
  adminSdk: typeof admin,
  payload: Record<string, unknown>,
): Promise<void> {
  await docRef.set(
    {
      pushDispatched: payload.status === 'sent' || payload.status === 'partial',
      pushDispatchedAt: adminSdk.firestore.FieldValue.serverTimestamp(),
      pushDelivery: {
        ...payload,
        at: adminSdk.firestore.FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
}

/** Atomically claim a notification for push send (prevents duplicate FCM). */
export async function claimNotificationForPush(
  docRef: DocumentReference,
  adminSdk: typeof admin,
): Promise<{ claimed: boolean; notif: Record<string, unknown> | null; skipReason?: string }> {
  return docRef.firestore.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return { claimed: false, notif: null, skipReason: 'missing' };

    const notif = snap.data() as Record<string, unknown>;
    if (isPushTerminal(notif)) {
      return { claimed: false, notif, skipReason: 'already_handled' };
    }

    if (!isWithinPushAgeWindow(notif)) {
      tx.set(
        docRef,
        {
          pushDelivery: {
            status: 'skipped',
            reason: 'too_old',
            at: adminSdk.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
      return { claimed: false, notif, skipReason: 'too_old' };
    }

    const delivery = notif.pushDelivery as {
      status?: string;
      lockedAt?: { toMillis?: () => number };
      nextAttemptAt?: { toMillis?: () => number };
    } | undefined;
    if (delivery?.status === 'retry' && delivery.nextAttemptAt?.toMillis && delivery.nextAttemptAt.toMillis() > Date.now()) {
      return { claimed: false, notif, skipReason: 'locked' }; // waiting for its retry time
    }
    if (delivery?.status === 'pending' && delivery.lockedAt?.toMillis) {
      const lockedMs = delivery.lockedAt.toMillis();
      if (Date.now() - lockedMs < 60_000) {
        return { claimed: false, notif, skipReason: 'locked' };
      }
    }

    tx.set(
      docRef,
      {
        pushDelivery: {
          status: 'pending',
          lockedAt: adminSdk.firestore.FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    return { claimed: true, notif };
  });
}

async function resolveUserTokens(
  db: Firestore,
  userId: string,
  notifSchoolId: string,
): Promise<{ tokens: string[]; skipReason?: string; userData?: Record<string, unknown> }> {
  let userTokens: string[] = [];
  let userData: Record<string, unknown> | undefined;

  if (userId === 'super_admin') {
    const superAdminsSnap = await db.collection('users').where('role', '==', 'superadmin').get();
    superAdminsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      userTokens.push(...collectTokensFromUserDoc(data));
    });
    return { tokens: Array.from(new Set(userTokens.filter(Boolean))) };
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return { tokens: [], skipReason: 'user_missing' };
  userData = (userDoc.data() || {}) as Record<string, unknown>;
  if (
    notifSchoolId &&
    notifSchoolId !== 'system' &&
    userData.schoolId &&
    userData.schoolId !== notifSchoolId
  ) {
    logPush('PUSH_SEND_SKIPPED', { userId, reason: 'school_mismatch', schoolId: notifSchoolId });
    return { tokens: [], skipReason: 'school_mismatch', userData };
  }

  userTokens = collectTokensFromUserDoc(userData);
  return {
    tokens: Array.from(new Set(userTokens.filter((t) => typeof t === 'string' && t.trim().length > 0))),
    userData,
  };
}

function collectTokensFromUserDoc(userData: Record<string, unknown>): string[] {
  const out: string[] = [];
  const flat = userData.fcmTokens;
  if (Array.isArray(flat)) {
    for (const t of flat) {
      if (typeof t === 'string' && t.trim()) out.push(t.trim());
    }
  }
  const devices = userData.fcmDevices;
  if (Array.isArray(devices)) {
    for (const d of devices) {
      if (d && typeof d === 'object' && typeof (d as { token?: string }).token === 'string') {
        const token = (d as { token: string }).token.trim();
        if (token) out.push(token);
      }
    }
  }
  return out;
}

function preferenceAllowsPush(userData: Record<string, unknown> | undefined, type: string): boolean {
  if (!userData) return true;
  const prefs = (userData.notificationPreferences || {}) as Record<string, unknown>;
  if (prefs.externalPush === false) return false;

  const t = type.toLowerCase();
  const map: Record<string, string[]> = {
    messages: ['chat', 'message'],
    chat: ['chat', 'message'],
    tuition: ['tuition', 'payment', 'payroll'],
    payments: ['tuition', 'payment', 'payroll'],
    homework: ['homework'],
    attendance: ['attendance'],
    behavior: ['behavior', 'grade', 'report'],
    announcements: ['announcement'],
    system: ['system', 'security', 'login', 'password', 'maintenance'],
    marketing: ['marketing', 'promo'],
  };

  for (const [key, types] of Object.entries(map)) {
    if (types.includes(t) && prefs[key] === false) return false;
  }
  return true;
}

async function writeNotificationAuditLog(
  db: Firestore,
  adminSdk: typeof admin,
  entry: {
    sender?: string;
    receiver: string;
    type: string;
    status: string;
    notificationId: string;
    schoolId?: string;
    title?: string;
  },
): Promise<void> {
  try {
    await db.collection('notification_logs').add({
      ...entry,
      createdAt: adminSdk.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Notifications] AUDIT_LOG_WRITE_FAILED', err);
  }
}

export async function dispatchPushForNotificationDoc(
  db: Firestore,
  adminSdk: typeof admin,
  notifId: string,
  notif: Record<string, unknown>,
): Promise<PushDispatchResult> {
  const docRef = db.collection('notifications').doc(notifId);
  const userId = String(notif.userId || '');
  const notifSchoolId = String(notif.schoolId || '');
  const title = String(notif.title || 'إشعار جديد');
  const message = String(notif.message || notif.content || '');
  const type = String(notif.type || 'system');
  const routeTarget =
    String(
      notif.routeTarget ||
        (notif.metadata as Record<string, unknown> | undefined)?.routeTarget ||
        (notif.metadata as Record<string, unknown> | undefined)?.route ||
        type,
    );

  if (!userId) {
    await writePushDelivery(docRef, adminSdk, { status: 'skipped', reason: 'no_userId' });
    logPush('PUSH_SEND_SKIPPED', { notifId, reason: 'no_userId' });
    return { notifId, status: 'skipped', reason: 'no_userId' };
  }

  logPush('PUSH_SEND_START', { notifId, userId, type, schoolId: notifSchoolId });

  try {
    const resolved = await resolveUserTokens(db, userId, notifSchoolId);
    const userTokens = resolved.tokens;

    if (!preferenceAllowsPush(resolved.userData, type)) {
      await writePushDelivery(docRef, adminSdk, {
        status: 'skipped',
        reason: 'preference_disabled',
      });
      await writeNotificationAuditLog(db, adminSdk, {
        sender: String(notif.senderId || 'system'),
        receiver: userId,
        type,
        status: 'skipped_preference',
        notificationId: notifId,
        schoolId: notifSchoolId,
        title,
      });
      logPush('PUSH_SEND_SKIPPED', { notifId, userId, reason: 'preference_disabled' });
      return { notifId, status: 'skipped', reason: 'preference_disabled' };
    }

    if (userTokens.length === 0) {
      await writePushDelivery(docRef, adminSdk, {
        status: 'no_tokens',
        successCount: 0,
        failureCount: 0,
      });
      await writeNotificationAuditLog(db, adminSdk, {
        sender: String(notif.senderId || 'system'),
        receiver: userId,
        type,
        status: 'no_tokens',
        notificationId: notifId,
        schoolId: notifSchoolId,
        title,
      });
      logPush('PUSH_SEND_SKIPPED', { notifId, userId, reason: 'no_tokens' });
      return { notifId, status: 'no_tokens', reason: 'no_tokens' };
    }

    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    const clickUrl = appUrl
      ? `${appUrl}/?tab=${encodeURIComponent(routeTarget)}`
      : `/?tab=${encodeURIComponent(routeTarget)}`;

    const metadata = (notif.metadata as Record<string, unknown> | undefined) || {};
    const dedupKey = typeof metadata.dedupKey === 'string' ? metadata.dedupKey : '';
    const imageUrl =
      typeof metadata.imageUrl === 'string'
        ? metadata.imageUrl
        : typeof notif.imageUrl === 'string'
          ? notif.imageUrl
          : '';
    const actionUrl =
      typeof metadata.actionUrl === 'string'
        ? metadata.actionUrl
        : typeof notif.actionUrl === 'string'
          ? notif.actionUrl
          : clickUrl;

    const prefs = (resolved.userData?.notificationPreferences || {}) as Record<string, unknown>;
    const soundEnabled = prefs.sound !== false;
    const vibrationEnabled = prefs.vibration !== false;

    const messages = userTokens.map((token) => ({
      token,
      notification: {
        title,
        body: message,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: {
        type,
        schoolId: notifSchoolId,
        userId,
        notificationId: notifId,
        routeTarget,
        route: routeTarget,
        url: actionUrl,
        ...(dedupKey ? { dedupKey } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        sound: soundEnabled ? '1' : '0',
        vibration: vibrationEnabled ? '1' : '0',
      },
      webpush: {
        ...(appUrl ? { fcmOptions: { link: actionUrl } } : {}),
        notification: {
          title,
          body: message,
          icon: '/brand/schoolixiq-logo.png',
          badge: '/favicon.ico',
          ...(imageUrl ? { image: imageUrl } : {}),
          ...(vibrationEnabled ? { vibrate: [120, 60, 120] } : {}),
          ...(soundEnabled ? {} : { silent: true }),
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: soundEnabled ? 'default' : undefined,
          channelId: 'schoolix_default',
          ...(imageUrl ? { imageUrl } : {}),
          ...(vibrationEnabled ? { defaultVibrateTimings: true } : { defaultVibrateTimings: false }),
        },
      },
      apns: {
        payload: {
          aps: {
            sound: soundEnabled ? 'default' : undefined,
            badge: 1,
            ...(vibrationEnabled ? {} : {}),
          },
        },
        ...(imageUrl
          ? {
              fcmOptions: { imageUrl },
            }
          : {}),
      },
    }));

    const response = await adminSdk.messaging().sendEach(messages);

    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (res.success) return;
      const code = res.error?.code || '';
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token')
      ) {
        invalidTokens.push(userTokens[idx]);
      }
    });

    if (invalidTokens.length > 0 && userId !== 'super_admin') {
      await pruneInvalidTokens(db, adminSdk, userId, invalidTokens);
      logPush('PUSH_SEND_SUCCESS', {
        notifId,
        prunedTokens: invalidTokens.length,
      });
    }

    if (
      response.successCount === 0 &&
      response.failureCount > 0 &&
      invalidTokens.length < response.failureCount &&
      response.responses.some((r) => !r.success && isTransientPushError(r.error))
    ) {
      return await scheduleRetryOrFail(docRef, adminSdk, notif, 'fcm_transient_failure');
    }

    const status = response.failureCount === 0 ? 'sent' : 'partial';
    await writePushDelivery(docRef, adminSdk, {
      status,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    await writeNotificationAuditLog(db, adminSdk, {
      sender: String(notif.senderId || 'system'),
      receiver: userId,
      type,
      status,
      notificationId: notifId,
      schoolId: notifSchoolId,
      title,
    });

    logPush('PUSH_SEND_SUCCESS', {
      notifId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      notifId,
      status,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (isTransientPushError(err)) {
      const r = await scheduleRetryOrFail(docRef, adminSdk, notif, message).catch(() => null);
      if (r) return r;
    }
    await writePushDelivery(docRef, adminSdk, { status: 'error', error: message }).catch(() => {});
    await writeNotificationAuditLog(db, adminSdk, {
      sender: String(notif.senderId || 'system'),
      receiver: userId,
      type,
      status: 'error',
      notificationId: notifId,
      schoolId: notifSchoolId,
      title,
    }).catch(() => {});
    logPush('PUSH_SEND_ERROR', { notifId, error: message });
    return { notifId, status: 'error', reason: message };
  }
}

async function pruneInvalidTokens(
  db: Firestore,
  adminSdk: typeof admin,
  userId: string,
  invalidTokens: string[],
): Promise<void> {
  try {
    const ref = db.collection('users').doc(userId);
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = snap.data() || {};
    const invalid = new Set(invalidTokens);
    const nextTokens = (Array.isArray(data.fcmTokens) ? data.fcmTokens : []).filter(
      (t: unknown) => typeof t === 'string' && !invalid.has(t),
    );
    const nextDevices = (Array.isArray(data.fcmDevices) ? data.fcmDevices : []).filter(
      (d: { token?: string }) => !(d && typeof d.token === 'string' && invalid.has(d.token)),
    );
    await ref.update({
      fcmTokens: nextTokens,
      fcmDevices: nextDevices,
      fcmTokenUpdatedAt: adminSdk.firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    await db
      .collection('users')
      .doc(userId)
      .update({
        fcmTokens: adminSdk.firestore.FieldValue.arrayRemove(...invalidTokens),
      })
      .catch(() => {});
  }
}

export async function processNotificationPush(
  db: Firestore,
  adminSdk: typeof admin,
  notifId: string,
  notif: Record<string, unknown>,
): Promise<PushDispatchResult | null> {
  const docRef = db.collection('notifications').doc(notifId);

  if (isPushTerminal(notif)) {
    logPush('PUSH_SEND_SKIPPED', { notifId, reason: 'terminal_status' });
    return null;
  }

  if (!isWithinPushAgeWindow(notif)) {
    await writePushDelivery(docRef, adminSdk, { status: 'skipped', reason: 'too_old' });
    logPush('PUSH_SEND_SKIPPED', { notifId, reason: 'too_old' });
    return { notifId, status: 'skipped', reason: 'too_old' };
  }

  const claim = await claimNotificationForPush(docRef, adminSdk);
  if (!claim.claimed) {
    if (claim.skipReason && claim.skipReason !== 'locked') {
      logPush('PUSH_SEND_SKIPPED', { notifId, reason: claim.skipReason });
    }
    return claim.skipReason ? { notifId, status: 'skipped', reason: claim.skipReason } : null;
  }

  return dispatchPushForNotificationDoc(db, adminSdk, notifId, claim.notif || notif);
}

/** Coarse runtime status for /api/public/status (no secrets, no data). */
export const pushListenerStatus: {
  startedAt: string | null; listenerAttached: boolean; restarts: number;
  lastErrorAt: string | null; lastError: string | null; lastSweepAt: string | null; lastSweepOk: boolean | null;
  /** 0 or 1: how many retry timers are pending right now (must never exceed 1). */
  pendingRetryTimers: number;
  /** how many times a Firestore listener was actually attached (success or failure). */
  attachAttempts: number;
} = { startedAt: null, listenerAttached: false, restarts: 0, lastErrorAt: null, lastError: null, lastSweepAt: null, lastSweepOk: null, pendingRetryTimers: 0, attachAttempts: 0 };

/**
 * Real-time push listener. Self-healing:
 *  - listens only to notifications from the last PUSH_MAX_AGE_MS (small initial snapshot, instead of
 *    reading the whole collection on every start) and ALSO pushes that recent backlog, so a restart
 *    or an idle/sleeping host delays a push instead of losing it (the claim transaction makes
 *    re-processing safe: a notification is sent at most once);
 *  - restarts itself with backoff if the stream fails (it used to die silently);
 *  - re-creates the query periodically so the window does not grow forever;
 *  - a periodic sweep covers anything a dropped event may have missed.
 *
 * Lifecycle invariants (a previous version multiplied retry chains while credentials were missing: the periodic
 * re-creation started a new listener without cancelling the pending error-retry, so every cycle added one more chain):
 *  - there is at most ONE retry timer at any time (`retryTimer`); scheduling is a no-op while one is pending;
 *  - a new listener is never attached while one is running or a retry is pending;
 *  - the periodic re-creation only touches a HEALTHY listener (never during an error/retry state);
 *  - callbacks of a replaced listener are ignored (generation check), so a late error cannot start another chain;
 *  - recovery is automatic: the single retry keeps going (back-off capped at 60 s) until the listener attaches, then the
 *    back-off resets.
 */
export function setupNotificationPushListener(db: Firestore, adminSdk: typeof admin): () => void {
  let unsub: (() => void) | null = null;       // the live listener (null when none is running)
  let stopped = false;
  let backoff = 1000;
  let generation = 0;                          // identifies the current listener; stale callbacks are ignored
  let retryTimer: ReturnType<typeof setTimeout> | null = null;  // THE one and only pending retry
  let recycleTimer: ReturnType<typeof setInterval> | null = null;
  const inflight = new Set<string>();
  pushListenerStatus.startedAt = new Date().toISOString();
  pushListenerStatus.pendingRetryTimers = 0;

  const syncRetryStatus = () => { pushListenerStatus.pendingRetryTimers = retryTimer ? 1 : 0; };
  const cancelRetry = () => { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } syncRetryStatus(); };
  const detach = () => { const u = unsub; unsub = null; try { u?.(); } catch { /* ignore */ } };

  const handle = (notifId: string, notif: Record<string, unknown>) => {
    if (inflight.has(notifId) || isPushTerminal(notif)) return;
    inflight.add(notifId);
    void processNotificationPush(db, adminSdk, notifId, notif).finally(() => {
      setTimeout(() => inflight.delete(notifId), 30_000);
    });
  };

  const scheduleRetry = () => {
    if (stopped || retryTimer) return;         // exactly one pending retry, ever
    const delay = backoff;
    backoff = Math.min(backoff * 2, 60_000);
    retryTimer = setTimeout(() => { retryTimer = null; syncRetryStatus(); attach(); }, delay);
    retryTimer.unref?.();
    syncRetryStatus();
  };

  const recordFailure = (err: unknown) => {
    pushListenerStatus.listenerAttached = false;
    pushListenerStatus.restarts += 1;
    pushListenerStatus.lastErrorAt = new Date().toISOString();
    const e = err as { code?: unknown; message?: unknown } | null;
    pushListenerStatus.lastError = String(e?.code ?? e?.message ?? 'error').slice(0, 80);
    logPush('PUSH_SEND_ERROR', { event: 'listener_restart', error: String(e?.message ?? err) });
  };

  const attach = () => {
    if (stopped) return;
    if (unsub || retryTimer) return;           // a listener is running or a retry is pending: never start a second one
    const mine = ++generation;
    pushListenerStatus.attachAttempts += 1;
    let failedImmediately = false;
    try {
      const cutoff = adminSdk.firestore.Timestamp.fromMillis(Date.now() - PUSH_MAX_AGE_MS);
      const stop = db.collection('notifications').where('createdAt', '>=', cutoff).onSnapshot(
        (snapshot) => {
          if (mine !== generation) return;     // replaced listener
          backoff = 1000;
          pushListenerStatus.listenerAttached = true;
          for (const change of snapshot.docChanges()) {
            if (change.type !== 'added') continue;
            handle(change.doc.id, change.doc.data() as Record<string, unknown>);
          }
        },
        (err) => {
          if (mine !== generation) return;     // a replaced listener's late error must not start another chain
          failedImmediately = true;
          if (unsub) detach();
          recordFailure(err);
          scheduleRetry();
        },
      );
      if (failedImmediately) { try { stop(); } catch { /* ignore */ } }
      else unsub = stop;
    } catch (e) {
      recordFailure(e);
      scheduleRetry();
      return;
    }
    if (!failedImmediately) logPush('PUSH_SEND_START', { event: 'listener_ready', windowMs: PUSH_MAX_AGE_MS });
  };

  attach();
  // refresh the query window every 30 min — only while the listener is healthy; never during an error/retry state
  recycleTimer = setInterval(() => {
    if (stopped || retryTimer || !unsub) return;
    generation += 1;                           // invalidate the old listener's callbacks
    detach();
    attach();
  }, 30 * 60 * 1000);
  recycleTimer.unref?.();

  const sweep = setInterval(() => {
    void pollRecentNotificationsForPush(db, adminSdk, 30)
      .then(() => { pushListenerStatus.lastSweepAt = new Date().toISOString(); pushListenerStatus.lastSweepOk = true; })
      .catch((e) => {
        pushListenerStatus.lastSweepAt = new Date().toISOString();
        pushListenerStatus.lastSweepOk = false;
        logPush('PUSH_SEND_ERROR', { event: 'sweep', error: e instanceof Error ? e.message : String(e) });
      });
  }, 2 * 60 * 1000);
  sweep.unref?.();

  logPush('PUSH_SEND_START', { event: 'fcm_gateway_initialized' });
  return () => {
    stopped = true;
    clearInterval(sweep);
    if (recycleTimer) clearInterval(recycleTimer);
    cancelRetry();
    generation += 1;
    detach();
  };
}

/** Poll endpoint for Cloud Scheduler when Firestore trigger is unavailable. */
export async function pollRecentNotificationsForPush(
  db: Firestore,
  adminSdk: typeof admin,
  limit = 50,
): Promise<PushDispatchResult[]> {
  const cutoff = adminSdk.firestore.Timestamp.fromMillis(Date.now() - PUSH_MAX_AGE_MS);
  const snap = await db
    .collection('notifications')
    .where('createdAt', '>=', cutoff)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const results: PushDispatchResult[] = [];

  for (const docSnap of snap.docs) {
    const notif = docSnap.data() as Record<string, unknown>;
    if (isPushTerminal(notif)) continue;
    const result = await processNotificationPush(db, adminSdk, docSnap.id, notif);
    if (result) results.push(result);
  }

  return results;
}

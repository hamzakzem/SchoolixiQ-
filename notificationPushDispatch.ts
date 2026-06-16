/**
 * Server-side FCM push dispatch for Firestore `notifications` documents.
 * Used by server.ts (dev) and bundled into backend/server.mjs (production).
 */
import type admin from 'firebase-admin';
import type { Firestore, DocumentReference } from 'firebase-admin/firestore';

/** Only push notifications created within this window (prevents resending old docs on listener restart). */
export const PUSH_MAX_AGE_MS = 10 * 60 * 1000;

const TERMINAL_STATUSES = new Set(['sent', 'partial', 'skipped', 'no_tokens', 'failed', 'error']);

export type PushDispatchResult = {
  notifId: string;
  status: 'sent' | 'partial' | 'skipped' | 'no_tokens' | 'failed' | 'error';
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

    const delivery = notif.pushDelivery as { status?: string; lockedAt?: { toMillis?: () => number } } | undefined;
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
): Promise<string[]> {
  let userTokens: string[] = [];

  if (userId === 'super_admin') {
    const superAdminsSnap = await db.collection('users').where('role', '==', 'superadmin').get();
    superAdminsSnap.docs.forEach((docSnap) => {
      const tokens = docSnap.data().fcmTokens;
      if (Array.isArray(tokens)) userTokens.push(...tokens);
    });
  } else {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return [];
    const userData = userDoc.data() || {};
    if (
      notifSchoolId &&
      notifSchoolId !== 'system' &&
      userData.schoolId &&
      userData.schoolId !== notifSchoolId
    ) {
      logPush('PUSH_SEND_SKIPPED', { userId, reason: 'school_mismatch', schoolId: notifSchoolId });
      return [];
    }
    const tokens = userData.fcmTokens;
    if (Array.isArray(tokens)) userTokens.push(...tokens);
  }

  return Array.from(new Set(userTokens.filter((t) => typeof t === 'string' && t.trim().length > 0)));
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
    const userTokens = await resolveUserTokens(db, userId, notifSchoolId);

    if (userTokens.length === 0) {
      await writePushDelivery(docRef, adminSdk, {
        status: 'no_tokens',
        successCount: 0,
        failureCount: 0,
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

    const messages = userTokens.map((token) => ({
      token,
      notification: { title, body: message },
      data: {
        type,
        schoolId: notifSchoolId,
        userId,
        notificationId: notifId,
        routeTarget,
        route: routeTarget,
        url: clickUrl,
        ...(dedupKey ? { dedupKey } : {}),
      },
      webpush: appUrl ? { fcmOptions: { link: clickUrl } } : undefined,
      android: {
        priority: 'high' as const,
        notification: { sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
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
      await db
        .collection('users')
        .doc(userId)
        .update({
          fcmTokens: adminSdk.firestore.FieldValue.arrayRemove(...invalidTokens),
        })
        .catch(() => {});
      logPush('PUSH_SEND_SUCCESS', {
        notifId,
        prunedTokens: invalidTokens.length,
      });
    }

    const status = response.failureCount === 0 ? 'sent' : 'partial';
    await writePushDelivery(docRef, adminSdk, {
      status,
      successCount: response.successCount,
      failureCount: response.failureCount,
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
    await writePushDelivery(docRef, adminSdk, { status: 'error', error: message }).catch(() => {});
    logPush('PUSH_SEND_ERROR', { notifId, error: message });
    return { notifId, status: 'error', reason: message };
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

/** Real-time listener — skips initial snapshot to avoid mass-resend of historical docs. */
export function setupNotificationPushListener(db: Firestore, adminSdk: typeof admin): void {
  let isInitialSnapshot = true;

  db.collection('notifications').onSnapshot(
    (snapshot) => {
      if (!snapshot) return;

      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        logPush('PUSH_SEND_START', { event: 'listener_ready', skippedInitial: snapshot.size });
        return;
      }

      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;
        const notifId = change.doc.id;
        const notif = change.doc.data() as Record<string, unknown>;
        void processNotificationPush(db, adminSdk, notifId, notif);
      }
    },
    (err) => {
      logPush('PUSH_SEND_ERROR', { event: 'listener', error: err.message });
    },
  );

  logPush('PUSH_SEND_START', { event: 'fcm_gateway_initialized' });
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

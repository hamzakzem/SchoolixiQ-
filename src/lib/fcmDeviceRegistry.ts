/**
 * Multi-device FCM registry for users/{uid}.fcmDevices + fcmTokens.
 * Upserts by deviceId; logout removes the current device only.
 */
import {
  doc,
  getDocFromServer,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { auth, db } from './firebase';
import { isLogoutInProgress } from './logoutGuard';
import {
  handleResourceExhausted,
  isQuotaWritePaused,
  isResourceExhaustedError,
} from './firestoreQuota';

export type FcmPlatform = 'web' | 'android' | 'ios' | 'unknown';

export type FcmDeviceRecord = {
  deviceId: string;
  token: string;
  platform: FcmPlatform | string;
  browser?: string;
  deviceName?: string;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
  notificationPermission?: string;
};

const DEVICE_ID_KEY = 'schoolix_device_id';

export function getOrCreateDeviceId(): string {
  if (typeof localStorage === 'undefined') {
    return `tmp_${Date.now()}`;
  }
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'}_${
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    }`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function detectBrowserLabel(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  return 'Web';
}

export function detectPlatformLabel(): FcmPlatform {
  if (!Capacitor.isNativePlatform()) return 'web';
  const p = Capacitor.getPlatform();
  if (p === 'android') return 'android';
  if (p === 'ios') return 'ios';
  return 'unknown';
}

function canWrite(userId: string): boolean {
  if (isLogoutInProgress()) return false;
  const uid = auth.currentUser?.uid;
  return Boolean(uid && uid === userId);
}

function normalizeDevices(raw: unknown): FcmDeviceRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is FcmDeviceRecord =>
      Boolean(d && typeof d === 'object' && typeof (d as FcmDeviceRecord).token === 'string'),
  );
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 0)));
}

/** Register or refresh the current device token (upsert by deviceId). */
export async function registerDevice(
  userId: string,
  input: {
    token: string;
    platform?: FcmPlatform | string;
    deviceId?: string;
    browser?: string;
    deviceName?: string;
    notificationPermission?: string;
  },
): Promise<{ ok: boolean; deviceId: string; reason?: string }> {
  const deviceId = input.deviceId || getOrCreateDeviceId();
  if (!userId || !input.token) {
    return { ok: false, deviceId, reason: 'missing_input' };
  }
  if (!canWrite(userId)) {
    return { ok: false, deviceId, reason: 'not_authorized' };
  }
  if (isQuotaWritePaused()) {
    return { ok: false, deviceId, reason: 'quota_paused' };
  }

  const now = new Date().toISOString();
  const platform = input.platform || detectPlatformLabel();
  const path = `users/${userId}`;

  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDocFromServer(ref);
    if (!snap.exists()) {
      return { ok: false, deviceId, reason: 'user_missing' };
    }

    const data = snap.data() || {};
    const devices = normalizeDevices(data.fcmDevices);
    const existingIdx = devices.findIndex(
      (d) => d.deviceId === deviceId || d.token === input.token,
    );

    const nextDevice: FcmDeviceRecord = {
      deviceId,
      token: input.token,
      platform,
      browser: input.browser || (platform === 'web' ? detectBrowserLabel() : undefined),
      deviceName:
        input.deviceName ||
        (platform === 'web'
          ? `${detectBrowserLabel()} · ${typeof navigator !== 'undefined' ? navigator.platform || 'Web' : 'Web'}`
          : String(platform)),
      lastActive: now,
      createdAt: existingIdx >= 0 ? devices[existingIdx].createdAt || now : now,
      updatedAt: now,
      notificationPermission:
        input.notificationPermission ||
        (typeof Notification !== 'undefined' ? Notification.permission : undefined),
    };

    if (existingIdx >= 0) {
      const prevToken = devices[existingIdx].token;
      devices[existingIdx] = { ...devices[existingIdx], ...nextDevice };
      // Drop previous token for this device from the flat list if it changed
      let tokens = uniqueTokens([
        ...(Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : []),
        input.token,
      ]);
      if (prevToken && prevToken !== input.token) {
        tokens = tokens.filter((t) => t !== prevToken);
      }
      await updateDoc(ref, {
        fcmDevices: devices,
        fcmTokens: tokens,
        fcmTokenUpdatedAt: serverTimestamp(),
        updatedAt: now,
      });
    } else {
      devices.push(nextDevice);
      const tokens = uniqueTokens([
        ...(Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : []),
        input.token,
      ]);
      await updateDoc(ref, {
        fcmDevices: devices,
        fcmTokens: tokens,
        fcmTokenUpdatedAt: serverTimestamp(),
        updatedAt: now,
      });
    }

    console.info('[FCM] DEVICE_REGISTERED', {
      userId,
      path,
      deviceId,
      platform,
      tokenPrefix: input.token.slice(0, 12),
    });
    return { ok: true, deviceId };
  } catch (err) {
    if (isResourceExhaustedError(err)) {
      handleResourceExhausted('fcm_device_register');
    }
    console.error('[FCM] DEVICE_REGISTER_ERROR', {
      userId,
      deviceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, deviceId, reason: 'write_failed' };
  }
}

/** Remove only the current device (by deviceId and/or token). */
export async function removeDevice(
  userId: string,
  opts: { deviceId?: string; token?: string } = {},
): Promise<{ ok: boolean; reason?: string }> {
  const deviceId = opts.deviceId || (typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_ID_KEY) || undefined : undefined);
  const token = opts.token;

  if (!userId || (!deviceId && !token)) {
    return { ok: false, reason: 'missing_input' };
  }

  // Allow removal during logout while still authenticated
  const uid = auth.currentUser?.uid;
  if (!uid || uid !== userId) {
    return { ok: false, reason: 'not_authorized' };
  }

  try {
    const ref = doc(db, 'users', userId);
    const snap = await getDocFromServer(ref);
    if (!snap.exists()) return { ok: true, reason: 'user_missing' };

    const data = snap.data() || {};
    const devices = normalizeDevices(data.fcmDevices);
    const removedTokens = new Set<string>();
    const nextDevices = devices.filter((d) => {
      const match =
        (deviceId && d.deviceId === deviceId) || (token && d.token === token);
      if (match && d.token) removedTokens.add(d.token);
      return !match;
    });

    if (token) removedTokens.add(token);

    const prevTokens = Array.isArray(data.fcmTokens) ? (data.fcmTokens as string[]) : [];
    const nextTokens = prevTokens.filter((t) => !removedTokens.has(t));

    await updateDoc(ref, {
      fcmDevices: nextDevices,
      fcmTokens: nextTokens,
      fcmTokenUpdatedAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    console.info('[FCM] DEVICE_REMOVED', {
      userId,
      deviceId,
      removed: removedTokens.size,
    });
    return { ok: true };
  } catch (err) {
    if (isResourceExhaustedError(err)) {
      handleResourceExhausted('fcm_device_remove');
    }
    console.error('[FCM] DEVICE_REMOVE_ERROR', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: 'write_failed' };
  }
}

export async function listDevices(userId: string): Promise<FcmDeviceRecord[]> {
  try {
    const snap = await getDocFromServer(doc(db, 'users', userId));
    if (!snap.exists()) return [];
    return normalizeDevices(snap.data()?.fcmDevices);
  } catch {
    return [];
  }
}

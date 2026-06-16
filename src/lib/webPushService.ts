import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import { getServiceWorkerUrl } from './serviceWorkerRegistration';
import { notificationDiag } from './notificationDiagnostics';

let webMessaging: ReturnType<typeof getMessaging> | null = null;
let currentWebToken: string | null = null;
let messageListenerAttached = false;
let lastRegistrationError: string | null = null;

export type WebPushRegistrationResult = {
  ok: boolean;
  token?: string;
  tokenPrefix?: string;
  error?: string;
  reason?:
    | 'native'
    | 'unsupported'
    | 'permission_denied'
    | 'permission_default'
    | 'vapid_key_missing'
    | 'no_token'
    | 'no_user'
    | 'save_failed'
    | 'sw_failed';
};

export type WebPushDiagnosticState = {
  vapidConfigured: boolean;
  permission: NotificationPermission | 'unsupported';
  serviceWorkerActive: boolean;
  fcmTokenGenerated: boolean;
  tokenSavedToFirestore: boolean;
  tokenPrefix: string | null;
  lastError: string | null;
};

function readVapidKey(): string | undefined {
  const env = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return (
    env.env?.VITE_FCM_VAPID_KEY ||
    env.env?.VITE_FIREBASE_VAPID_KEY ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_FCM_VAPID_KEY') : null) ||
    undefined
  )?.trim() || undefined;
}

export function isWebPushConfigured(): boolean {
  return Boolean(readVapidKey());
}

export function getWebPushConfigWarning(isArabic: boolean): string | null {
  if (isWebPushConfigured()) return null;
  return isArabic
    ? 'مفتاح VITE_FCM_VAPID_KEY غير مُعد — الإشعارات داخل التطبيق تعمل، لكن push خارج المتصفح لن يعمل حتى إضافة المفتاح في إعدادات البناء.'
    : 'VITE_FCM_VAPID_KEY is not configured — in-app notifications work, but background web push requires the VAPID key in build env.';
}

export function getLastWebPushRegistrationError(): string | null {
  return lastRegistrationError;
}

function getDeviceId(): string {
  const key = 'schoolix_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'web_' + crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function isServiceWorkerActive(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.some((r) => r.active?.state === 'activated');
  } catch {
    return false;
  }
}

async function isTokenSavedInFirestore(userId: string, token: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return false;
    const tokens = snap.data()?.fcmTokens;
    return Array.isArray(tokens) && tokens.includes(token);
  } catch {
    return false;
  }
}

export async function getWebPushDiagnostics(userId?: string): Promise<WebPushDiagnosticState> {
  const localToken = getStoredWebPushToken();
  const permission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  let tokenSavedToFirestore = false;
  if (userId && localToken) {
    tokenSavedToFirestore = await isTokenSavedInFirestore(userId, localToken);
  }

  return {
    vapidConfigured: isWebPushConfigured(),
    permission,
    serviceWorkerActive: await isServiceWorkerActive(),
    fcmTokenGenerated: Boolean(localToken),
    tokenSavedToFirestore,
    tokenPrefix: localToken ? `${localToken.slice(0, 12)}…` : null,
    lastError: lastRegistrationError,
  };
}

function attachForegroundMessageListener() {
  if (messageListenerAttached || !webMessaging) return;
  messageListenerAttached = true;
  onMessage(webMessaging, (payload) => {
    console.info('[Notifications] FCM foreground', payload?.data?.type || payload?.notification?.title);
    if (payload.notification?.title) {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/favicon.ico',
        data: payload.data,
      });
    }
  });
}

async function saveTokenToFirestore(userId: string, token: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    fcmTokens: arrayUnion(token),
    fcmTokenUpdatedAt: serverTimestamp(),
    fcmDevices: arrayUnion({
      token,
      platform: 'web',
      deviceId: getDeviceId(),
      updatedAt: new Date().toISOString(),
    }),
  });
}

export async function registerWebPushDevice(
  userId: string,
  options: { requestPermission?: boolean } = {},
): Promise<WebPushRegistrationResult> {
  const requestPermission = options.requestPermission ?? false;
  lastRegistrationError = null;

  console.info('[Notifications] REGISTER_DEVICE_START', {
    userId,
    requestPermission,
    platform: Capacitor.isNativePlatform() ? 'native' : 'web',
  });

  if (Capacitor.isNativePlatform()) {
    lastRegistrationError = 'native_platform';
    return { ok: false, reason: 'native', error: 'Use native push on Capacitor' };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    lastRegistrationError = 'unsupported_browser';
    return { ok: false, reason: 'unsupported', error: 'Notifications not supported' };
  }

  if (!userId) {
    lastRegistrationError = 'no_user';
    return { ok: false, reason: 'no_user', error: 'Not signed in' };
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      lastRegistrationError = 'fcm_not_supported';
      notificationDiag.tokenMissing({ platform: 'web', reason: 'unsupported' });
      return { ok: false, reason: 'unsupported', error: 'FCM not supported in this browser' };
    }

    let permission = Notification.permission;
    console.info('[Notifications] PERMISSION_STATUS', { permission, requestPermission });

    if (permission === 'default') {
      if (requestPermission) {
        permission = await Notification.requestPermission();
        console.info('[Notifications] PERMISSION_STATUS', { permission, afterRequest: true });
      } else {
        lastRegistrationError = 'permission_default';
        notificationDiag.tokenMissing({ platform: 'web', reason: 'permission_default', permission });
        return { ok: false, reason: 'permission_default', error: 'Notification permission not granted yet' };
      }
    }

    if (permission !== 'granted') {
      lastRegistrationError = 'permission_denied';
      notificationDiag.tokenMissing({ platform: 'web', reason: 'permission_denied', permission });
      return { ok: false, reason: 'permission_denied', error: 'Notification permission denied' };
    }

    const vapidKey = readVapidKey();
    if (!vapidKey) {
      lastRegistrationError = 'vapid_key_missing';
      notificationDiag.tokenMissing({ platform: 'web', reason: 'vapid_key_missing' });
      return { ok: false, reason: 'vapid_key_missing', error: 'VAPID key not configured in build' };
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await navigator.serviceWorker.register(getServiceWorkerUrl());
      await navigator.serviceWorker.ready;
      console.info('[Notifications] SW_READY', {
        scope: registration.scope,
        active: Boolean(registration.active),
      });
    } catch (swErr) {
      const msg = swErr instanceof Error ? swErr.message : String(swErr);
      lastRegistrationError = `sw_failed: ${msg}`;
      console.error('[Notifications] SW_READY', { error: msg });
      return { ok: false, reason: 'sw_failed', error: msg };
    }

    const { getApp } = await import('firebase/app');
    webMessaging = getMessaging(getApp());
    const token = await getToken(webMessaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      lastRegistrationError = 'no_token_from_fcm';
      notificationDiag.tokenMissing({ platform: 'web', reason: 'no_token' });
      return { ok: false, reason: 'no_token', error: 'FCM returned no token' };
    }

    console.info('[Notifications] GET_TOKEN_SUCCESS', {
      userId,
      tokenPrefix: token.slice(0, 12),
    });

    currentWebToken = token;
    localStorage.setItem('schoolix_fcm_token_web', token);

    try {
      await saveTokenToFirestore(userId, token);
      console.info('[Notifications] TOKEN_SAVE_SUCCESS', {
        userId,
        tokenPrefix: token.slice(0, 12),
      });
    } catch (saveErr) {
      const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
      lastRegistrationError = `save_failed: ${msg}`;
      console.error('[Notifications] TOKEN_SAVE_ERROR', { userId, error: msg });
      return { ok: false, reason: 'save_failed', error: msg, token, tokenPrefix: token.slice(0, 12) };
    }

    notificationDiag.tokenRegistered({
      platform: 'web',
      userId,
      tokenPrefix: token.slice(0, 12),
    });

    attachForegroundMessageListener();

    return { ok: true, token, tokenPrefix: token.slice(0, 12) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastRegistrationError = msg;
    console.error('[Notifications] TOKEN_SAVE_ERROR', { userId, error: msg });
    return { ok: false, error: msg };
  }
}

/** Silent refresh on login when permission already granted — never prompts. */
export async function refreshWebPushTokenIfGranted(userId: string): Promise<WebPushRegistrationResult | null> {
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') {
    console.info('[Notifications] PERMISSION_STATUS', {
      permission: Notification.permission,
      action: 'skip_silent_refresh',
    });
    return null;
  }
  return registerWebPushDevice(userId, { requestPermission: false });
}

/** @deprecated Use registerWebPushDevice with requestPermission option. */
export async function registerWebPushNotifications(userId: string): Promise<string | null> {
  const result = await registerWebPushDevice(userId, { requestPermission: true });
  return result.ok && result.token ? result.token : null;
}

export async function unregisterWebPushToken(userId: string): Promise<void> {
  if (!userId || !currentWebToken) {
    const stored = localStorage.getItem('schoolix_fcm_token_web');
    if (stored) currentWebToken = stored;
  }
  if (!userId || !currentWebToken) return;

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(currentWebToken),
    });
    localStorage.removeItem('schoolix_fcm_token_web');
    currentWebToken = null;
    console.info('[Notifications] TOKEN_REGISTERED removed', { platform: 'web', userId });
  } catch (err) {
    console.error('[Notifications] TOKEN_REGISTERED remove failed', err);
  }
}

export function getStoredWebPushToken(): string | null {
  return currentWebToken || localStorage.getItem('schoolix_fcm_token_web');
}

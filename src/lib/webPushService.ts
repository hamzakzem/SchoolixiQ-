import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, updateDoc, getDocFromServer, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { db, auth } from './firebase';
import { getServiceWorkerUrl } from './serviceWorkerRegistration';
import { notificationDiag } from './notificationDiagnostics';
import firebaseConfig from '../../firebase-applet-config.json';
import { isLogoutInProgress, setLogoutInProgress } from './logoutGuard';

let webMessaging: ReturnType<typeof getMessaging> | null = null;
let currentWebToken: string | null = null;
let messageListenerAttached = false;
let lastRegistrationError: string | null = null;

export function setPushLogoutInProgress(value: boolean): void {
  setLogoutInProgress(value);
}

export function isPushLogoutInProgress(): boolean {
  return isLogoutInProgress();
}

function canWritePushTokensForUser(userId: string): { ok: true } | { ok: false; reason: string } {
  if (isLogoutInProgress()) {
    return { ok: false, reason: 'logging_out' };
  }
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    return { ok: false, reason: 'signed_out' };
  }
  if (currentUid !== userId) {
    return { ok: false, reason: 'uid_mismatch' };
  }
  return { ok: true };
}

function logTokenSaveSkipped(userId: string, reason: string): void {
  console.info('[FCM] TOKEN_SAVE_SKIPPED', { userId, reason });
}

function logTokenRemoveSkipped(userId: string, reason: string): void {
  console.info('[FCM] TOKEN_REMOVE_SKIPPED', { userId, reason });
}

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

export type VapidKeySource = 'env_fcm' | 'env_firebase' | 'localStorage' | 'runtime_json' | 'none';

export type WebPushDiagnosticState = {
  vapidConfigured: boolean;
  vapidSource: VapidKeySource;
  vapidKeyLength: number;
  vapidKeyPrefix: string | null;
  permission: NotificationPermission | 'unsupported';
  serviceWorkerActive: boolean;
  fcmTokenGenerated: boolean;
  tokenSavedToFirestore: boolean;
  firestoreUserHasTokens: boolean;
  firestoreTokenCount: number;
  databaseId: string;
  tokenPrefix: string | null;
  lastError: string | null;
};

let cachedVapidKey: string | undefined | null = null;
let cachedVapidSource: VapidKeySource = 'none';

function readSyncVapidKey(): { key?: string; source: VapidKeySource } {
  const fromFcm = import.meta.env.VITE_FCM_VAPID_KEY?.trim();
  if (fromFcm) {
    return { key: fromFcm, source: 'env_fcm' };
  }

  const fromFirebase = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
  if (fromFirebase) {
    return { key: fromFirebase, source: 'env_firebase' };
  }

  const fromStorage =
    typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_FCM_VAPID_KEY')?.trim() : undefined;
  if (fromStorage) {
    return { key: fromStorage, source: 'localStorage' };
  }

  return { source: 'none' };
}

function logVapidResolution(source: VapidKeySource, key: string | undefined): void {
  console.info('[FCM] VAPID_SOURCE', source);
  console.info('[FCM] VAPID_LENGTH', key?.length ?? 0);
}

async function fetchRuntimeVapidKey(): Promise<string | undefined> {
  try {
    const response = await fetch('/firebase-vapid.json', { cache: 'no-store' });
    if (!response.ok) {
      return undefined;
    }
    const data = (await response.json()) as { vapidKey?: string };
    const key = data.vapidKey?.trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

export async function resolveVapidKey(): Promise<{ key: string | undefined; source: VapidKeySource }> {
  if (cachedVapidKey !== null) {
    return { key: cachedVapidKey || undefined, source: cachedVapidSource };
  }

  const sync = readSyncVapidKey();
  if (sync.key) {
    cachedVapidKey = sync.key;
    cachedVapidSource = sync.source;
    logVapidResolution(cachedVapidSource, cachedVapidKey);
    return { key: sync.key, source: sync.source };
  }

  const runtimeKey = await fetchRuntimeVapidKey();
  if (runtimeKey) {
    cachedVapidKey = runtimeKey;
    cachedVapidSource = 'runtime_json';
    logVapidResolution(cachedVapidSource, cachedVapidKey);
    return { key: runtimeKey, source: 'runtime_json' };
  }

  cachedVapidKey = undefined;
  cachedVapidSource = 'none';
  logVapidResolution('none', undefined);
  return { key: undefined, source: 'none' };
}

export function isWebPushConfigured(): boolean {
  if (cachedVapidKey) {
    return true;
  }
  return Boolean(readSyncVapidKey().key);
}

export function getRuntimeVapidDiagnostics(): {
  source: VapidKeySource;
  keyLength: number;
  keyPrefix: string | null;
  configured: boolean;
} {
  if (cachedVapidKey !== null) {
    return {
      source: cachedVapidSource,
      keyLength: cachedVapidKey?.length ?? 0,
      keyPrefix: cachedVapidKey ? `${cachedVapidKey.slice(0, 8)}…` : null,
      configured: Boolean(cachedVapidKey),
    };
  }

  const sync = readSyncVapidKey();
  return {
    source: sync.source,
    keyLength: sync.key?.length ?? 0,
    keyPrefix: sync.key ? `${sync.key.slice(0, 8)}…` : null,
    configured: Boolean(sync.key),
  };
}

export function getPermissionDeniedGuidance(isArabic: boolean): string {
  if (typeof navigator === 'undefined') {
    return isArabic ? 'فعّل الإشعارات من إعدادات المتصفح.' : 'Enable notifications in browser settings.';
  }
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) {
    return isArabic
      ? 'Edge: ⋯ → الإعدادات → ملفات تعريف الارتباط → schoolixiq.com → الإشعارات → السماح'
      : 'Edge: ⋯ → Settings → Cookies → schoolixiq.com → Notifications → Allow';
  }
  if (/Firefox/i.test(ua)) {
    return isArabic
      ? 'Firefox: ☰ → الإعدادات → الخصوصية → الأذونات → الإشعارات → السماح لـ schoolixiq.com'
      : 'Firefox: ☰ → Settings → Privacy → Permissions → Notifications → Allow schoolixiq.com';
  }
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    return isArabic
      ? 'Safari: Safari → الإعدادات → مواقع الويب → الإشعارات → schoolixiq.com → السماح'
      : 'Safari: Safari → Settings → Websites → Notifications → schoolixiq.com → Allow';
  }
  return isArabic
    ? 'Chrome: ⋮ → الإعدادات → الخصوصية → إعدادات الموقع → الإشعارات → schoolixiq.com → السماح'
    : 'Chrome: ⋮ → Settings → Privacy → Site settings → Notifications → schoolixiq.com → Allow';
}

export function getVapidMissingMessage(isArabic: boolean): string {
  return isArabic
    ? 'VAPID غير موجود في نسخة الإنتاج الحالية'
    : 'VAPID is missing from the current production build';
}

export function getWebPushConfigWarning(isArabic: boolean): string | null {
  if (isWebPushConfigured()) return null;
  return getVapidMissingMessage(isArabic);
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

async function readUserTokensFromServer(userId: string): Promise<string[]> {
  try {
    const snap = await getDocFromServer(doc(db, 'users', userId));
    if (!snap.exists()) return [];
    const tokens = snap.data()?.fcmTokens;
    return Array.isArray(tokens) ? tokens.filter((t) => typeof t === 'string') : [];
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Notifications] TOKEN_READ_ERROR', {
      userId,
      path: `users/${userId}`,
      databaseId: firebaseConfig.firestoreDatabaseId,
      code: code ?? 'unknown',
      error: msg,
      likelyRulesBlock: code === 'permission-denied',
    });
    throw err;
  }
}

async function isTokenSavedInFirestore(userId: string, token: string): Promise<boolean> {
  try {
    const tokens = await readUserTokensFromServer(userId);
    return tokens.includes(token);
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
  const vapidResolved = await resolveVapidKey();
  const vapidRuntime = {
    source: vapidResolved.source,
    keyLength: vapidResolved.key?.length ?? 0,
    keyPrefix: vapidResolved.key ? `${vapidResolved.key.slice(0, 8)}…` : null,
    configured: Boolean(vapidResolved.key),
  };

  let tokenSavedToFirestore = false;
  let firestoreUserHasTokens = false;
  let firestoreTokenCount = 0;

  if (userId) {
    try {
      const tokens = await readUserTokensFromServer(userId);
      firestoreTokenCount = tokens.length;
      firestoreUserHasTokens = tokens.length > 0;
      if (localToken) {
        tokenSavedToFirestore = tokens.includes(localToken);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      if (!lastRegistrationError) {
        lastRegistrationError = code === 'permission-denied'
          ? `firestore_read_denied: users/${userId}`
          : `firestore_read: ${msg}`;
      }
    }
  }

  return {
    vapidConfigured: vapidRuntime.configured,
    vapidSource: vapidRuntime.source,
    vapidKeyLength: vapidRuntime.keyLength,
    vapidKeyPrefix: vapidRuntime.keyPrefix,
    permission,
    serviceWorkerActive: await isServiceWorkerActive(),
    fcmTokenGenerated: Boolean(localToken),
    tokenSavedToFirestore,
    firestoreUserHasTokens,
    firestoreTokenCount,
    databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
    tokenPrefix: localToken ? `${localToken.slice(0, 12)}…` : null,
    lastError: lastRegistrationError,
  };
}

export async function runPushRegistrationDiagnostics(userId: string): Promise<WebPushDiagnosticState> {
  const diag = await getWebPushDiagnostics(userId);
  console.info('[NotificationsDiag] uid', userId);
  console.info('[NotificationsDiag] vapidConfigured', diag.vapidConfigured);
  console.info('[NotificationsDiag] vapidSource', diag.vapidSource);
  console.info('[NotificationsDiag] vapidKeyLength', diag.vapidKeyLength);
  console.info('[NotificationsDiag] permission', diag.permission);
  console.info('[NotificationsDiag] serviceWorkerReady', diag.serviceWorkerActive);
  console.info('[NotificationsDiag] tokenGenerated', diag.fcmTokenGenerated);
  console.info('[NotificationsDiag] tokenSaved', diag.tokenSavedToFirestore);
  console.info('[NotificationsDiag] firestoreUserHasTokens', diag.firestoreUserHasTokens);
  console.info('[NotificationsDiag] firestoreTokenCount', diag.firestoreTokenCount);
  console.info('[NotificationsDiag] databaseId', diag.databaseId);
  if (diag.lastError) {
    console.info('[NotificationsDiag] lastError', diag.lastError);
  }
  return diag;
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
  const gate = canWritePushTokensForUser(userId);
  if (!gate.ok) {
    logTokenSaveSkipped(userId, gate.reason);
    return;
  }

  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  console.info('[FCM] SAVE_TOKEN_START', {
    userId,
    path,
    databaseId: firebaseConfig.firestoreDatabaseId,
    tokenPrefix: token.slice(0, 12),
  });
  try {
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
    console.info('[FCM] SAVE_TOKEN_SUCCESS', {
      userId,
      path,
      databaseId: firebaseConfig.firestoreDatabaseId,
      tokenPrefix: token.slice(0, 12),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code ?? 'unknown';
    console.error('[FCM] SAVE_TOKEN_ERROR', {
      userId,
      path,
      databaseId: firebaseConfig.firestoreDatabaseId,
      code,
      error: msg,
    });
    console.error('[Notifications] TOKEN_SAVE_ERROR', {
      userId,
      path,
      databaseId: firebaseConfig.firestoreDatabaseId,
      code,
      error: msg,
      fields: ['fcmTokens', 'fcmTokenUpdatedAt', 'fcmDevices'],
      likelyRulesBlock: code === 'permission-denied',
      hint:
        code === 'permission-denied'
          ? 'Check firestore.rules canWriteUserInSchool / isOwner / canOwnerUpdatePushTokens for users/{uid}'
          : undefined,
    });
    throw err;
  }
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

  const authGate = canWritePushTokensForUser(userId);
  if (!authGate.ok) {
    logTokenSaveSkipped(userId, authGate.reason);
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
    console.info('[FCM] PERMISSION_STATUS', { permission, requestPermission });
    console.info('[Notifications] PERMISSION_STATUS', { permission, requestPermission });

    if (permission === 'default') {
      if (requestPermission) {
        permission = await Notification.requestPermission();
        console.info('[FCM] PERMISSION_STATUS', { permission, afterRequest: true });
        console.info('[Notifications] PERMISSION_STATUS', { permission, afterRequest: true });
      } else {
        lastRegistrationError = 'permission_default';
        notificationDiag.tokenMissing({ platform: 'web', reason: 'permission_default', permission });
        return { ok: false, reason: 'permission_default', error: 'Notification permission not granted yet' };
      }
    }

    if (permission !== 'granted') {
      lastRegistrationError = 'permission_denied';
      console.info('[FCM] PERMISSION_STATUS', { permission, action: 'skip_registration' });
      notificationDiag.tokenMissing({ platform: 'web', reason: 'permission_denied', permission });
      return { ok: false, reason: 'permission_denied', error: 'Notification permission denied' };
    }

    const { key: vapidKey, source: vapidSource } = await resolveVapidKey();
    if (!vapidKey) {
      lastRegistrationError = 'vapid_key_missing';
      notificationDiag.tokenMissing({ platform: 'web', reason: 'vapid_key_missing' });
      return { ok: false, reason: 'vapid_key_missing', error: getVapidMissingMessage(false) };
    }
    console.info('[Notifications] VAPID_READY', {
      source: vapidSource,
      keyLength: vapidKey.length,
    });

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
    console.info('[FCM] GET_TOKEN_START', {
      userId,
      vapidSource,
      swScope: registration.scope,
    });
    let token: string | null = null;
    try {
      token = await getToken(webMessaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
    } catch (tokenErr) {
      const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      const code = (tokenErr as { code?: string })?.code ?? 'unknown';
      lastRegistrationError = `get_token: ${msg}`;
      console.error('[FCM] GET_TOKEN_ERROR', { userId, code, error: msg });
      notificationDiag.tokenMissing({ platform: 'web', reason: 'no_token', error: msg });
      return { ok: false, reason: 'no_token', error: msg };
    }

    if (!token) {
      lastRegistrationError = 'no_token_from_fcm';
      console.error('[FCM] GET_TOKEN_ERROR', { userId, error: 'FCM returned empty token' });
      notificationDiag.tokenMissing({ platform: 'web', reason: 'no_token' });
      return { ok: false, reason: 'no_token', error: 'FCM returned no token' };
    }

    console.info('[FCM] GET_TOKEN_SUCCESS', {
      userId,
      tokenPrefix: token.slice(0, 12),
    });
    console.info('[Notifications] GET_TOKEN_SUCCESS', {
      userId,
      tokenPrefix: token.slice(0, 12),
    });

    currentWebToken = token;
    localStorage.setItem('schoolix_fcm_token_web', token);

    try {
      await saveTokenToFirestore(userId, token);
      const verified = await isTokenSavedInFirestore(userId, token);
      if (!verified) {
        lastRegistrationError = 'save_verify_failed';
        console.error('[Notifications] TOKEN_SAVE_ERROR', {
          userId,
          error: 'Token write could not be verified in Firestore',
          databaseId: firebaseConfig.firestoreDatabaseId,
        });
        return {
          ok: false,
          reason: 'save_failed',
          error: 'Token write could not be verified in Firestore',
          token,
          tokenPrefix: token.slice(0, 12),
        };
      }
      console.info('[Notifications] TOKEN_SAVE_SUCCESS', {
        userId,
        tokenPrefix: token.slice(0, 12),
        databaseId: firebaseConfig.firestoreDatabaseId,
        verified: true,
      });
    } catch (saveErr) {
      const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
      const code = (saveErr as { code?: string })?.code ?? 'unknown';
      lastRegistrationError = `save_failed: ${msg}`;
      console.error('[Notifications] TOKEN_SAVE_ERROR', {
        userId,
        path: `users/${userId}`,
        error: msg,
        code,
        databaseId: firebaseConfig.firestoreDatabaseId,
        likelyRulesBlock: code === 'permission-denied',
      });
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
      const code = (err as { code?: string })?.code ?? 'unknown';
      lastRegistrationError = msg;
      console.error('[Notifications] TOKEN_SAVE_ERROR', {
        userId,
        path: `users/${userId}`,
        error: msg,
        code,
        databaseId: firebaseConfig.firestoreDatabaseId,
        likelyRulesBlock: code === 'permission-denied',
      });
      return { ok: false, error: msg };
    }
}

/**
 * Automatic web push registration after login / page load.
 * Requests permission when still "default"; skips only when "denied".
 */
export async function autoRegisterWebPushToken(
  userId: string,
): Promise<WebPushRegistrationResult | null> {
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (!userId) return null;

  const permission = Notification.permission;
  console.info('[FCM] PERMISSION_STATUS', { permission, userId, auto: true });

  if (permission === 'denied') {
    return { ok: false, reason: 'permission_denied', error: 'Notification permission denied' };
  }

  await resolveVapidKey();

  return registerWebPushDevice(userId, {
    requestPermission: permission === 'default',
  });
}

/** Silent refresh when permission already granted — never prompts. */
export async function refreshWebPushTokenIfGranted(userId: string): Promise<WebPushRegistrationResult | null> {
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') {
    console.info('[FCM] PERMISSION_STATUS', {
      permission: Notification.permission,
      action: 'skip_silent_refresh',
    });
    return null;
  }
  return registerWebPushDevice(userId, { requestPermission: false });
}

let webPushAutoRegistrationStop: (() => void) | null = null;

export type WebPushAutoRegistrationOptions = {
  onSettled?: (result: WebPushRegistrationResult | null) => void;
};

/** Start automatic registration + retries when permission becomes granted later. */
export function startWebPushAutoRegistration(
  userId: string,
  options: WebPushAutoRegistrationOptions = {},
): () => void {
  console.info('[FCM] AUTO_REGISTRATION_ENTRY', { uid: userId });

  if (Capacitor.isNativePlatform()) {
    console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'native_platform' });
    options.onSettled?.(null);
    return () => {};
  }
  if (typeof window === 'undefined') {
    console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'no_window' });
    options.onSettled?.(null);
    return () => {};
  }
  if (!('Notification' in window)) {
    console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'notification_api_missing' });
    options.onSettled?.(null);
    return () => {};
  }
  if (!userId) {
    console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'no_user_id' });
    options.onSettled?.(null);
    return () => {};
  }

  if (isLogoutInProgress()) {
    console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'logging_out' });
    options.onSettled?.(null);
    return () => {};
  }

  if (webPushAutoRegistrationStop) {
    webPushAutoRegistrationStop();
    webPushAutoRegistrationStop = null;
  }

  let stopped = false;
  let registered = false;

  const attempt = async (reason: string) => {
    if (stopped || registered || !userId || isLogoutInProgress()) return;

    const currentUid = auth.currentUser?.uid;
    if (!currentUid || currentUid !== userId) {
      console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'signed_out' });
      return;
    }

    if (Notification.permission === 'denied') {
      registered = true;
      const denied: WebPushRegistrationResult = {
        ok: false,
        reason: 'permission_denied',
        error: 'Notification permission denied',
      };
      console.info('[FCM] AUTO_REGISTRATION_SKIPPED', { uid: userId, reason: 'permission_denied' });
      options.onSettled?.(denied);
      return;
    }

    const result = await autoRegisterWebPushToken(userId);
    if (result?.ok) {
      registered = true;
      console.info('[FCM] AUTO_REGISTRATION_COMPLETE', { userId, reason });
      options.onSettled?.(result);
    } else if (result?.reason === 'permission_denied') {
      registered = true;
      options.onSettled?.(result);
    }
    // permission_default / transient errors: do not mark registered — retries continue
  };

  void (async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.ready;
      } catch {
        /* registerWebPushDevice registers SW if needed */
      }
    }
    await attempt('initial');
  })();

  const onRetry = () => {
    if (stopped || registered) return;
    if (Notification.permission === 'granted' || Notification.permission === 'default') {
      void attempt('retry');
    }
  };

  document.addEventListener('visibilitychange', onRetry);
  window.addEventListener('focus', onRetry);

  const intervalId = window.setInterval(() => {
    if (registered || stopped) {
      window.clearInterval(intervalId);
      return;
    }
    if (Notification.permission === 'granted' || Notification.permission === 'default') {
      void attempt('poll');
    }
  }, 3000);

  const stop = () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onRetry);
    window.removeEventListener('focus', onRetry);
    window.clearInterval(intervalId);
  };

  webPushAutoRegistrationStop = stop;
  return stop;
}

export function stopWebPushAutoRegistration(reason: 'logout' | 'restart' = 'logout'): void {
  if (webPushAutoRegistrationStop) {
    webPushAutoRegistrationStop();
    webPushAutoRegistrationStop = null;
  }
  if (reason === 'logout') {
    console.info('[FCM] AUTO_REGISTRATION_STOPPED', { reason: 'logout' });
  }
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

  const gate = canWritePushTokensForUser(userId);
  if (!gate.ok) {
    logTokenRemoveSkipped(userId, gate.reason === 'logging_out' ? 'signed_out' : gate.reason);
    localStorage.removeItem('schoolix_fcm_token_web');
    currentWebToken = null;
    return;
  }

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

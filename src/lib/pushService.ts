import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { auth } from './firebase';
import { toast } from 'react-hot-toast';
import { isLogoutInProgress } from './logoutGuard';
import {
  handleResourceExhausted,
  isQuotaWritePaused,
  isResourceExhaustedError,
} from './firestoreQuota';
import {
  getOrCreateDeviceId,
  registerDevice,
  removeDevice,
  detectPlatformLabel,
} from './fcmDeviceRegistry';

let currentPushToken: string | null = null;
let pendingToken: string | null = null;
let activeUserId: string | null = null;
let listenersReady = false;
let registerPromise: Promise<void> | null = null;

function logPlatformDetected(): void {
  console.info('[NativePush] PLATFORM_DETECTED', {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  });
}

function canSaveTokenForUser(userId: string): boolean {
  if (isLogoutInProgress()) return false;
  const currentUid = auth.currentUser?.uid;
  return Boolean(currentUid && currentUid === userId);
}

async function saveNativeTokenToFirestore(userId: string, token: string): Promise<boolean> {
  const path = `users/${userId}`;
  if (!canSaveTokenForUser(userId)) {
    console.info('[NativePush] TOKEN_SAVE_SKIPPED', {
      userId,
      path,
      reason: 'signed_out_or_logout',
    });
    return false;
  }

  if (isQuotaWritePaused()) {
    console.info('[NativePush] TOKEN_SAVE_SKIPPED', { userId, path, reason: 'quota_paused' });
    return false;
  }

  try {
    const result = await registerDevice(userId, {
      token,
      platform: detectPlatformLabel(),
      deviceId: getOrCreateDeviceId(),
      deviceName: `Capacitor ${Capacitor.getPlatform()}`,
    });
    if (!result.ok) {
      console.error('[NativePush] TOKEN_SAVE_ERROR', { userId, path, reason: result.reason });
      return false;
    }
    currentPushToken = token;
    console.info('[NativePush] TOKEN_SAVE_SUCCESS', {
      userId,
      path,
      tokenPrefix: token.slice(0, 12),
      deviceId: result.deviceId,
    });
    return true;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (isResourceExhaustedError(error)) {
      handleResourceExhausted('native_fcm_token');
    }
    console.error('[NativePush] TOKEN_SAVE_ERROR', {
      userId,
      path,
      code: err?.code ?? 'unknown',
      message: err?.message ?? String(error),
    });
    return false;
  }
}

async function handleTokenReceived(tokenValue: string): Promise<void> {
  console.info('[NativePush] TOKEN_RECEIVED', {
    tokenPrefix: tokenValue.slice(0, 12),
    platform: Capacitor.getPlatform(),
  });
  currentPushToken = tokenValue;
  pendingToken = tokenValue;

  const userId = activeUserId ?? auth.currentUser?.uid ?? null;
  if (!userId) {
    console.info('[NativePush] TOKEN_PENDING_UID', {
      tokenPrefix: tokenValue.slice(0, 12),
    });
    return;
  }

  const saved = await saveNativeTokenToFirestore(userId, tokenValue);
  if (saved) {
    pendingToken = null;
  }
}

async function flushPendingToken(userId: string): Promise<void> {
  if (!pendingToken || !canSaveTokenForUser(userId)) return;
  const saved = await saveNativeTokenToFirestore(userId, pendingToken);
  if (saved) {
    pendingToken = null;
  }
}

function ensurePushListeners(): void {
  if (listenersReady) return;
  listenersReady = true;

  PushNotifications.addListener('registration', (token) => {
    void handleTokenReceived(token.value);
  });

  PushNotifications.addListener('registrationError', (error: unknown) => {
    console.error('[NativePush] REGISTRATION_ERROR', {
      error: typeof error === 'string' ? error : JSON.stringify(error),
    });
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[NativePush] NOTIFICATION_RECEIVED', JSON.stringify(notification));
    toast.success(notification.title || 'إشعار جديد', {
      icon: '🔔',
      style: {
        border: '1px solid #e2e8f0',
        padding: '16px',
        color: '#1e293b',
      },
    });
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    const data = notification.notification?.data || {};
    const route = data.routeTarget || data.route || data.type;
    if (route && typeof window !== 'undefined') {
      localStorage.setItem('schoolix_pending_tab_redirect', String(route));
      window.dispatchEvent(new CustomEvent('schoolix_tab_redirect'));
      window.dispatchEvent(new CustomEvent('schoolix-notification-route', { detail: { route } }));
      console.info('[NativePush] PUSH_CLICK_ROUTE', { route, platform: Capacitor.getPlatform() });
    }
  });
}

async function runNativeRegistration(userId: string): Promise<void> {
  logPlatformDetected();
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (!userId) {
    console.info('[NativePush] REGISTER_SKIPPED', { reason: 'no_user_id' });
    return;
  }
  if (isLogoutInProgress()) {
    console.info('[NativePush] REGISTER_SKIPPED', { reason: 'logging_out', userId });
    return;
  }

  activeUserId = userId;
  ensurePushListeners();
  await flushPendingToken(userId);

  let permStatus = await PushNotifications.checkPermissions();
  console.info('[NativePush] PERMISSION_STATUS', permStatus);

  if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
    permStatus = await PushNotifications.requestPermissions();
    console.info('[NativePush] PERMISSION_STATUS', { ...permStatus, afterRequest: true });
  }

  if (permStatus.receive !== 'granted') {
    console.warn('[NativePush] PERMISSION_DENIED', { receive: permStatus.receive, userId });
    return;
  }

  console.info('[NativePush] REGISTER_CALLED', {
    userId,
    platform: Capacitor.getPlatform(),
  });
  await PushNotifications.register();
}

export const registerForPushNotifications = async (
  userId: string,
  _userRole: string = '',
  _schoolId: string = '',
): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (registerPromise) {
    await registerPromise;
  }

  registerPromise = runNativeRegistration(userId).finally(() => {
    registerPromise = null;
  });
  await registerPromise;
};

export const unregisterPushToken = async (userId: string) => {
  if (!Capacitor.isNativePlatform() || !userId) {
    return;
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.info('[NativePush] TOKEN_REMOVE_SKIPPED', { userId, reason: 'signed_out' });
    currentPushToken = null;
    pendingToken = null;
    activeUserId = null;
    return;
  }

  try {
    await removeDevice(userId, {
      deviceId: getOrCreateDeviceId(),
      token: currentPushToken || undefined,
    });
    console.info('[NativePush] TOKEN_REMOVE_SUCCESS', { userId });
    currentPushToken = null;
    pendingToken = null;
    activeUserId = null;
  } catch (error) {
    console.error('[NativePush] TOKEN_REMOVE_ERROR', error);
  }
};

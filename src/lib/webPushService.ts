import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

let webMessaging: ReturnType<typeof getMessaging> | null = null;
let currentWebToken: string | null = null;

function readVapidKey(): string | undefined {
  const env = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return (
    env.env?.VITE_FCM_VAPID_KEY ||
    env.env?.VITE_FIREBASE_VAPID_KEY ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_FCM_VAPID_KEY') : null) ||
    undefined
  );
}

export function isWebPushConfigured(): boolean {
  return Boolean(readVapidKey()?.trim());
}

export function getWebPushConfigWarning(isArabic: boolean): string | null {
  if (isWebPushConfigured()) return null;
  return isArabic
    ? 'مفتاح VITE_FCM_VAPID_KEY غير مُعد — الإشعارات داخل التطبيق تعمل، لكن push خارج المتصفح لن يعمل حتى إضافة المفتاح في إعدادات البناء.'
    : 'VITE_FCM_VAPID_KEY is not configured — in-app notifications work, but background web push requires the VAPID key in build env.';
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

export async function registerWebPushNotifications(userId: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[Notifications] PUSH_TOKEN_REGISTERED skipped — FCM not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = readVapidKey();
    if (!vapidKey) {
      console.warn('[Notifications] PUSH_TOKEN_REGISTERED blocked — VITE_FCM_VAPID_KEY missing');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const { getApp } = await import('firebase/app');
    webMessaging = getMessaging(getApp());
    const token = await getToken(webMessaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token || !userId) return null;

    currentWebToken = token;
    localStorage.setItem('schoolix_fcm_token_web', token);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      fcmDevices: arrayUnion({
        token,
        platform: 'web',
        deviceId: getDeviceId(),
        updatedAt: new Date().toISOString(),
      }),
    });

    console.info('[Notifications] PUSH_TOKEN_REGISTERED', {
      platform: 'web',
      userId,
      tokenPrefix: token.slice(0, 12),
    });

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

    return token;
  } catch (err) {
    console.error('[Notifications] PUSH_TOKEN_REGISTERED error', err);
    return null;
  }
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
    console.info('[Notifications] PUSH_TOKEN_REGISTERED removed', { platform: 'web', userId });
  } catch (err) {
    console.error('[Notifications] PUSH_TOKEN_REGISTERED remove failed', err);
  }
}

export function getStoredWebPushToken(): string | null {
  return currentWebToken || localStorage.getItem('schoolix_fcm_token_web');
}

export { firebaseConfig };

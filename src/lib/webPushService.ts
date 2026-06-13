import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { db } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

let webMessaging: ReturnType<typeof getMessaging> | null = null;
let currentWebToken: string | null = null;

function getVapidKey(): string | undefined {
  return (
    (import.meta as any).env?.VITE_FCM_VAPID_KEY ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('VITE_FCM_VAPID_KEY') : null) ||
    undefined
  ) as string | undefined;
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
      console.warn('FCM web messaging not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.warn('VITE_FCM_VAPID_KEY not configured — web push token unavailable');
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

    onMessage(webMessaging, (payload) => {
      console.info('[FCM foreground]', payload);
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
    console.error('Web push registration failed:', err);
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
  } catch (err) {
    console.error('Failed to unregister web push token:', err);
  }
}

export function getStoredWebPushToken(): string | null {
  return currentWebToken || localStorage.getItem('schoolix_fcm_token_web');
}

export { firebaseConfig };

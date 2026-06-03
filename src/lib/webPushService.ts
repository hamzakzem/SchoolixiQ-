import { getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, getFirebaseMessaging } from './firebase';

let webFcmToken: string | null = null;
let foregroundHandlerAttached = false;

function getVapidKey(): string | undefined {
  const key = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
  return key?.trim() || undefined;
}

async function getMessagingSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
  if (existing) return existing;

  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });
  } catch (err) {
    console.warn('[WebPush] messaging SW registration failed:', err);
    return null;
  }
}

async function saveWebToken(userId: string, token: string) {
  webFcmToken = token;
  localStorage.setItem('schoolix_fcm_token_web', token);
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    fcmTokens: arrayUnion(token),
    pushPlatforms: arrayUnion('web'),
    lastWebPushAt: new Date().toISOString(),
  });
}

function attachForegroundHandler(messaging: Messaging) {
  if (foregroundHandlerAttached) return;
  foregroundHandlerAttached = true;
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'schoolixiQ';
    const body = payload.notification?.body || '';
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon.svg',
          tag: payload.data?.type || 'schoolix-fcm',
        });
      } catch {
        /* ignore */
      }
    }
  });
}

export async function registerWebPushNotifications(userId: string): Promise<string | null> {
  if (typeof window === 'undefined' || !userId) return null;

  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('[WebPush] Firebase Messaging not supported in this browser');
      return null;
    }

    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.warn('[WebPush] Set VITE_FIREBASE_VAPID_KEY for background push when the app is closed');
      return null;
    }

    if (!('Notification' in window)) return null;
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return null;

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const swReg = await getMessagingSwRegistration();
    if (!swReg) return null;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return null;

    const stored = localStorage.getItem('schoolix_fcm_token_web');
    if (stored && stored !== token && stored.startsWith('fcm_web_')) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          fcmTokens: arrayRemove(stored),
        });
      } catch {
        /* ignore cleanup of legacy mock token */
      }
    }

    if (token !== stored) {
      await saveWebToken(userId, token);
    } else {
      webFcmToken = token;
    }

    attachForegroundHandler(messaging);
    return token;
  } catch (err) {
    console.error('[WebPush] registration failed:', err);
    return null;
  }
}

export async function unregisterWebPushToken(userId: string): Promise<void> {
  if (!userId || !webFcmToken) {
    const legacy = localStorage.getItem('schoolix_fcm_token_web');
    if (legacy && userId) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          fcmTokens: arrayRemove(legacy),
        });
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem('schoolix_fcm_token_web');
    return;
  }

  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(webFcmToken),
    });
  } catch (err) {
    console.warn('[WebPush] token removal failed:', err);
  }
  localStorage.removeItem('schoolix_fcm_token_web');
  webFcmToken = null;
}

export function isValidFcmDeviceToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const t = token.trim();
  if (t.startsWith('fcm_web_')) return false;
  if (t.length < 80) return false;
  return true;
}

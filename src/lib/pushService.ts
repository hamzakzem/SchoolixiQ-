import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db } from './firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { registerWebPushNotifications, unregisterWebPushToken } from './webPushService';
import { showPlatformNotificationToast } from './platformNotificationToast';
import {
  dispatchPushNavigation,
  resolveTabFromPushData,
} from './pushNavigation';

let currentPushToken: string | null = null;
let nativeListenersAttached = false;

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await PushNotifications.createChannel({
      id: 'schoolix_alerts',
      name: 'تنبيهات schoolixiQ',
      description: 'إشعارات المنصة — رسائل، درجات، رسوم، وإعلانات',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
      lights: true,
      lightColor: '#0B2345',
    });
  } catch (e) {
    console.warn('[Push] Android channel setup:', e);
  }
}

function attachNativePushListeners(userId: string, userRole: string): void {
  if (nativeListenersAttached) return;
  nativeListenersAttached = true;

  PushNotifications.addListener('registration', async (token) => {
    console.log('[Push] Native registration OK');
    currentPushToken = token.value;
    if (!userId) return;
    try {
      const platform = Capacitor.getPlatform();
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: arrayUnion(token.value),
        pushPlatforms: arrayUnion(platform),
        lastNativePushAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[Push] Failed to save native token:', e);
    }
  });

  PushNotifications.addListener('registrationError', (error: unknown) => {
    console.error('[Push] Registration error:', JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const title =
      notification.title ||
      (notification.data?.title as string | undefined) ||
      'schoolixiQ';
    const body =
      notification.body ||
      (notification.data?.body as string | undefined) ||
      (notification.data?.message as string | undefined) ||
      '';

    showPlatformNotificationToast(title, body, {
      onClick: () => {
        const data = (notification.data || {}) as Record<string, string | undefined>;
        const tab = resolveTabFromPushData(data, userRole);
        dispatchPushNavigation({ tab, type: data.type, notificationId: data.notificationId });
      },
    });
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = (action.notification?.data || {}) as Record<string, string | undefined>;
    const tab = resolveTabFromPushData(data, userRole);
    dispatchPushNavigation({
      tab,
      url: data.url,
      type: data.type,
      notificationId: data.notificationId,
    });
  });
}

export const registerForPushNotifications = async (
  userId: string,
  userRole: string,
  _schoolId: string = '',
) => {
  if (!Capacitor.isNativePlatform()) {
    await registerWebPushNotifications(userId);
    return;
  }

  try {
    await ensureAndroidNotificationChannel();

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permission denied');
      return;
    }

    await PushNotifications.removeAllListeners();
    nativeListenersAttached = false;
    attachNativePushListeners(userId, userRole);
    await PushNotifications.register();
  } catch (error) {
    console.error('[Push] Setup failed:', error);
  }
};

export const unregisterPushToken = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    await unregisterWebPushToken(userId);
    return;
  }

  if (!currentPushToken || !userId) return;

  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(currentPushToken),
    });
    currentPushToken = null;
  } catch (error) {
    console.error('[Push] Token removal failed:', error);
  }
};

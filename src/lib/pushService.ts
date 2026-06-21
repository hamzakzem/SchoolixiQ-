import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db, auth } from './firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Store current token in memory to remove it during logout
let currentPushToken: string | null = null;

export const registerForPushNotifications = async (userId: string, userRole: string, schoolId: string = '') => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only available on native platforms using Capacitor.');
    return;
  }

  try {
    // Request permission to use push notifications
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permission');
      return;
    }

    // Register with Apple / Google to receive push via APNS/FCM
    await PushNotifications.register();

    // Listeners for registration success/error
    let isRegistrationListenerAdded = false;
    
    // Remove all previous listeners to prevent duplicates if register is called multiple times
    await PushNotifications.removeAllListeners();

    PushNotifications.addListener('registration', async (token) => {
      console.info('[Notifications] PUSH_TOKEN_REGISTERED', {
        platform: Capacitor.getPlatform(),
        userId,
        tokenPrefix: token.value.slice(0, 12),
      });
      currentPushToken = token.value;
      if (userId && auth.currentUser?.uid === userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token.value)
          });
        } catch (e) {
          console.error('[Notifications] PUSH_TOKEN_REGISTERED save failed', e);
        }
      } else if (userId) {
        console.info('[FCM] TOKEN_SAVE_SKIPPED', { userId, reason: 'signed_out' });
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Listen for notification received while app is running
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      toast.success(notification.title || 'إشعار جديد', {
        icon: '🔔',
        style: {
          border: '1px solid #e2e8f0',
          padding: '16px',
          color: '#1e293b',
        }
      });
    });

    // Listen for notification tapped by the user
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      const data = notification.notification?.data || {};
      const route = data.routeTarget || data.route || data.type;
      if (route && typeof window !== 'undefined') {
        localStorage.setItem('schoolix_pending_tab_redirect', String(route));
        window.dispatchEvent(new CustomEvent('schoolix_tab_redirect'));
        window.dispatchEvent(new CustomEvent('schoolix-notification-route', { detail: { route } }));
        console.info('[Notifications] PUSH_CLICK_ROUTE', { route, platform: Capacitor.getPlatform() });
      }
    });

  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
};

export const unregisterPushToken = async (userId: string) => {
  if (!Capacitor.isNativePlatform() || !currentPushToken || !userId) {
    return;
  }

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    console.info('[FCM] TOKEN_REMOVE_SKIPPED', { userId, reason: 'signed_out' });
    currentPushToken = null;
    return;
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(currentPushToken)
    });
    console.log('Push token removed successfully on logout.');
    currentPushToken = null;
  } catch (error) {
    console.error('Error removing push token:', error);
  }
};

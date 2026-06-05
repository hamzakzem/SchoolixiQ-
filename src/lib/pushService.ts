import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db } from './firebase';
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
      console.log('Push registration success, token: ' + token.value);
      currentPushToken = token.value;
      // Save the token to Firestore so we can send pushes to this user
      // arrayUnion prevents storing the exact same string twice in the array.
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token.value)
          });
        } catch (e) {
          console.error('Failed to save push token to user doc: ', e);
        }
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
      console.log('Push action performed: ' + JSON.stringify(notification));
      // Could route the user to a specific tab/page based on notification data
    });

  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
};

export const unregisterPushToken = async (userId: string) => {
  if (!Capacitor.isNativePlatform() || !currentPushToken || !userId) {
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

import { getSafeHomeworkNotificationTitle } from './homeworkSubjects';
import {
  playCategorizedSound,
  type NotificationCategory,
} from './notificationSound';

export function alertIncomingNotification(
  notif: { title?: string; message?: string; type?: string },
  isArabic = true,
): void {
  const type = (notif.type || 'system') as NotificationCategory;
  playCategorizedSound(type);

  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  try {
    const title =
      notif.type === 'homework'
        ? getSafeHomeworkNotificationTitle(notif.title, undefined, isArabic)
        : notif.title || (isArabic ? 'إشعار جديد' : 'New notification');
    new Notification(title, {
      body: notif.message,
      icon: '/icon.svg',
    });
  } catch (error) {
    console.warn('Browser notification failed:', error);
  }
}

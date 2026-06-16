import { notificationService } from './notificationService';

/** Dev/super-admin only: create one test notification doc to exercise push pipeline. */
export async function sendTestPushNotification(
  userId: string,
  schoolId: string,
): Promise<boolean> {
  if (!userId || !schoolId) return false;

  const dedupKey = `push_test_${userId}_${Math.floor(Date.now() / 60_000)}`;

  return notificationService.sendWithDedup({
    userId,
    schoolId,
    title: 'اختبار Push — SchoolixIQ',
    message: 'إشعار تجريبي. إذا ظهر خارج التطبيق فإعدادات Push تعمل بشكل صحيح.',
    type: 'system',
    metadata: {
      routeTarget: 'settings',
      source: 'push_test',
      dedupKey,
    },
  });
}

/**
 * Client-side Notification Center filter tabs (2.0).
 */

export type NotifFilterId =
  | 'all'
  | 'unread'
  | 'messages'
  | 'tuition'
  | 'homework'
  | 'attendance'
  | 'system';

export type NotifFilterBucket = Exclude<NotifFilterId, 'all' | 'unread'>;

export const NOTIF_FILTER_TABS: Array<{
  id: NotifFilterId;
  labelAr: string;
  labelEn: string;
}> = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
  { id: 'unread', labelAr: 'غير المقروءة', labelEn: 'Unread' },
  { id: 'messages', labelAr: 'الرسائل', labelEn: 'Messages' },
  { id: 'tuition', labelAr: 'الأقساط', labelEn: 'Tuition' },
  { id: 'homework', labelAr: 'الواجبات', labelEn: 'Homework' },
  { id: 'attendance', labelAr: 'الحضور', labelEn: 'Attendance' },
  { id: 'system', labelAr: 'النظام', labelEn: 'System' },
];

const MESSAGES_TYPES = new Set(['message', 'chat']);
const TUITION_TYPES = new Set(['tuition', 'payment', 'billing', 'installment']);
const HOMEWORK_TYPES = new Set(['homework']);
const ATTENDANCE_TYPES = new Set(['attendance', 'absence', 'dismissal', 'smart_gate', 'gate']);
const SYSTEM_TYPES = new Set([
  'system',
  'security',
  'subscription',
  'system_critical',
  'announcement',
]);

export function resolveFilterBucket(
  notification: Record<string, unknown>,
): NotifFilterBucket {
  const type = String(notification.type ?? '').toLowerCase();
  const metadata =
    notification.metadata && typeof notification.metadata === 'object'
      ? (notification.metadata as Record<string, unknown>)
      : {};
  const routeTarget = String(
    metadata.routeTarget ?? notification.routeTarget ?? '',
  ).toLowerCase();

  if (MESSAGES_TYPES.has(type) || routeTarget === 'chat' || routeTarget === 'messages') {
    return 'messages';
  }
  if (TUITION_TYPES.has(type)) return 'tuition';
  if (HOMEWORK_TYPES.has(type)) return 'homework';
  if (ATTENDANCE_TYPES.has(type)) return 'attendance';
  if (SYSTEM_TYPES.has(type)) return 'system';

  if (type === 'behavior' || type === 'grade' || type === 'report') return 'system';

  return 'system';
}

export function matchesNotifFilter(
  notification: Record<string, unknown>,
  filterId: NotifFilterId,
): boolean {
  if (filterId === 'all') return true;
  if (filterId === 'unread') return notification.read !== true;
  return resolveFilterBucket(notification) === filterId;
}

export function countNotifFilter(
  notifications: Array<Record<string, unknown>>,
  filterId: NotifFilterId,
): number {
  return notifications.filter((n) => matchesNotifFilter(n, filterId)).length;
}

export function emptyStateForFilter(
  filterId: NotifFilterId,
  isArabic: boolean,
): { title: string; hint: string } {
  const map: Record<NotifFilterId, { titleAr: string; titleEn: string; hintAr: string; hintEn: string }> = {
    all: {
      titleAr: 'لا توجد إشعارات حالياً',
      titleEn: 'No notifications right now',
      hintAr: 'كل شيء محدث — ستظهر التنبيهات هنا',
      hintEn: 'All caught up — new alerts will appear here',
    },
    unread: {
      titleAr: 'لا توجد إشعارات غير مقروءة',
      titleEn: 'No unread notifications',
      hintAr: 'رائع! قرأت كل التنبيهات',
      hintEn: 'Great — you are all caught up',
    },
    messages: {
      titleAr: 'لا توجد رسائل',
      titleEn: 'No messages',
      hintAr: 'ستظهر الرسائل الجديدة هنا',
      hintEn: 'New messages will appear here',
    },
    tuition: {
      titleAr: 'لا توجد إشعارات أقساط',
      titleEn: 'No tuition notifications',
      hintAr: 'تنبيهات الأقساط والدفع تظهر هنا',
      hintEn: 'Tuition and payment alerts appear here',
    },
    homework: {
      titleAr: 'لا توجد إشعارات واجبات',
      titleEn: 'No homework notifications',
      hintAr: 'واجبات جديدة ستظهر هنا',
      hintEn: 'New homework alerts will appear here',
    },
    attendance: {
      titleAr: 'لا توجد إشعارات حضور',
      titleEn: 'No attendance notifications',
      hintAr: 'تنبيهات الحضور والغياب تظهر هنا',
      hintEn: 'Attendance alerts appear here',
    },
    system: {
      titleAr: 'لا توجد إشعارات نظام',
      titleEn: 'No system notifications',
      hintAr: 'تنبيهات النظام والأمان تظهر هنا',
      hintEn: 'System and security alerts appear here',
    },
  };
  const entry = map[filterId];
  return {
    title: isArabic ? entry.titleAr : entry.titleEn,
    hint: isArabic ? entry.hintAr : entry.hintEn,
  };
}

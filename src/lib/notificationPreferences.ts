import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isCriticalNotification } from './notificationRetention';
import { resolveFilterBucket } from './notificationFilters';

export type NotificationPreferenceKey =
  | 'messages'
  | 'tuition'
  | 'homework'
  | 'attendance'
  | 'behavior'
  | 'announcements'
  | 'system'
  | 'sound'
  | 'externalPush';

export type NotificationPreferences = Partial<Record<NotificationPreferenceKey, boolean>>;

export const DEFAULT_NOTIFICATION_PREFERENCES: Required<NotificationPreferences> = {
  messages: true,
  tuition: true,
  homework: true,
  attendance: true,
  behavior: true,
  announcements: true,
  system: true,
  sound: true,
  externalPush: true,
};

export const PREFERENCE_TOGGLES: Array<{
  key: NotificationPreferenceKey;
  labelAr: string;
  labelEn: string;
  criticalNote?: boolean;
}> = [
  { key: 'messages', labelAr: 'الرسائل', labelEn: 'Messages' },
  { key: 'tuition', labelAr: 'الأقساط', labelEn: 'Tuition' },
  { key: 'homework', labelAr: 'الواجبات', labelEn: 'Homework' },
  { key: 'attendance', labelAr: 'الحضور', labelEn: 'Attendance' },
  { key: 'behavior', labelAr: 'السلوك', labelEn: 'Behavior' },
  { key: 'announcements', labelAr: 'الإعلانات', labelEn: 'Announcements' },
  { key: 'system', labelAr: 'النظام', labelEn: 'System', criticalNote: true },
  { key: 'sound', labelAr: 'الصوت', labelEn: 'Sound' },
  { key: 'externalPush', labelAr: 'إشعارات الجهاز', labelEn: 'Device push' },
];

function preferenceKeyForNotification(
  notification: Record<string, unknown>,
): NotificationPreferenceKey {
  const type = String(notification.type ?? '').toLowerCase();
  if (type === 'behavior' || type === 'grade' || type === 'report') return 'behavior';
  if (type === 'announcement') return 'announcements';
  const bucket = resolveFilterBucket(notification);
  if (bucket === 'messages') return 'messages';
  if (bucket === 'tuition') return 'tuition';
  if (bucket === 'homework') return 'homework';
  if (bucket === 'attendance') return 'attendance';
  return 'system';
}

export function mergeNotificationPreferences(
  raw?: NotificationPreferences | null,
): Required<NotificationPreferences> {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(raw || {}) };
}

export function isNotificationHiddenByPreferences(
  notification: Record<string, unknown>,
  prefs: NotificationPreferences,
): boolean {
  if (isCriticalNotification(notification)) return false;
  const merged = mergeNotificationPreferences(prefs);
  const key = preferenceKeyForNotification(notification);
  return merged[key] === false;
}

export function filterNotificationsByPreferences<T extends Record<string, unknown>>(
  notifications: T[],
  prefs: NotificationPreferences,
): T[] {
  return notifications.filter((n) => !isNotificationHiddenByPreferences(n, prefs));
}

export async function saveNotificationPreferences(
  uid: string,
  current: NotificationPreferences,
  patch: Partial<NotificationPreferences>,
): Promise<Required<NotificationPreferences>> {
  const next = mergeNotificationPreferences({ ...current, ...patch });
  await updateDoc(doc(db, 'users', uid), {
    notificationPreferences: next,
    updatedAt: new Date().toISOString(),
  });
  return next;
}

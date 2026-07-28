import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { isCriticalNotification } from './notificationRetention';
import { resolveFilterBucket } from './notificationFilters';

export type NotificationPreferenceKey =
  | 'messages'
  | 'chat'
  | 'tuition'
  | 'payments'
  | 'homework'
  | 'attendance'
  | 'behavior'
  | 'announcements'
  | 'system'
  | 'marketing'
  | 'sound'
  | 'vibration'
  | 'externalPush';

export type NotificationPreferences = Partial<Record<NotificationPreferenceKey, boolean>>;

export const DEFAULT_NOTIFICATION_PREFERENCES: Required<NotificationPreferences> = {
  messages: true,
  chat: true,
  tuition: true,
  payments: true,
  homework: true,
  attendance: true,
  behavior: true,
  announcements: true,
  system: true,
  marketing: false,
  sound: true,
  vibration: true,
  externalPush: true,
};

export const PREFERENCE_TOGGLES: Array<{
  key: NotificationPreferenceKey;
  labelAr: string;
  labelEn: string;
  criticalNote?: boolean;
}> = [
  { key: 'messages', labelAr: 'الرسائل / المحادثة', labelEn: 'Messages / Chat' },
  { key: 'tuition', labelAr: 'الأقساط والمدفوعات', labelEn: 'Tuition / Payments' },
  { key: 'homework', labelAr: 'الواجبات', labelEn: 'Homework' },
  { key: 'attendance', labelAr: 'الحضور', labelEn: 'Attendance' },
  { key: 'behavior', labelAr: 'السلوك والدرجات', labelEn: 'Behavior / Grades' },
  { key: 'announcements', labelAr: 'الإعلانات', labelEn: 'Announcements' },
  { key: 'system', labelAr: 'النظام', labelEn: 'System', criticalNote: true },
  { key: 'marketing', labelAr: 'التسويق', labelEn: 'Marketing' },
  { key: 'sound', labelAr: 'الصوت', labelEn: 'Sound' },
  { key: 'vibration', labelAr: 'الاهتزاز', labelEn: 'Vibration' },
  { key: 'externalPush', labelAr: 'إشعارات الجهاز (Push)', labelEn: 'Device push' },
];

function preferenceKeyForNotification(
  notification: Record<string, unknown>,
): NotificationPreferenceKey {
  const type = String(notification.type ?? '').toLowerCase();
  if (type === 'marketing' || type === 'promo') return 'marketing';
  if (type === 'chat' || type === 'message') return 'messages';
  if (type === 'payment' || type === 'tuition' || type === 'payroll') return 'tuition';
  if (type === 'behavior' || type === 'grade' || type === 'report') return 'behavior';
  if (type === 'announcement') return 'announcements';
  if (type === 'security' || type === 'login' || type === 'password') return 'system';
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
  const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(raw || {}) };
  // Alias sync: chat ↔ messages, payments ↔ tuition
  if (raw?.chat !== undefined && raw.messages === undefined) merged.messages = raw.chat;
  if (raw?.messages !== undefined && raw.chat === undefined) merged.chat = raw.messages;
  if (raw?.payments !== undefined && raw.tuition === undefined) merged.tuition = raw.payments;
  if (raw?.tuition !== undefined && raw.payments === undefined) merged.payments = raw.tuition;
  return merged;
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

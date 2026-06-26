import type { Timestamp } from 'firebase/firestore';

/** Legacy export — prefer PRESENCE_SLOW_HEARTBEAT_MS for interval writes. */
export const PRESENCE_HEARTBEAT_MS = 60_000;
/** Max interval between optional presence heartbeats (event-driven writes are primary). */
export const PRESENCE_SLOW_HEARTBEAT_MS = 12 * 60 * 1000;
export const PRESENCE_OFFLINE_MS = 2 * 60_000;
export const PRESENCE_RECENT_MS = 15 * 60_000;
export const PRESENCE_TAB_LOCK_MS = 55_000;

export type SchoolPresenceRecord = {
  schoolId: string;
  online?: boolean;
  activeUsers?: number;
  lastSeenAt?: Timestamp | null;
  lastHeartbeatAt?: Timestamp | null;
  lastActiveUserId?: string;
  lastActiveUserName?: string;
  lastActiveRole?: string;
  updatedAt?: Timestamp | null;
};

export type SchoolPresenceStatus = 'online' | 'recent' | 'offline' | 'unknown';

export function timestampToMs(value?: Timestamp | null): number | null {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const seconds = (value as { seconds?: number }).seconds;
  if (typeof seconds === 'number') return seconds * 1000;
  return null;
}

export function resolveSchoolPresenceStatus(
  presence?: SchoolPresenceRecord | null,
  nowMs: number = Date.now(),
): SchoolPresenceStatus {
  const heartbeatMs = timestampToMs(presence?.lastHeartbeatAt);
  if (heartbeatMs == null) return 'unknown';

  const ageMs = nowMs - heartbeatMs;
  if (ageMs < PRESENCE_OFFLINE_MS) return 'online';
  if (ageMs < PRESENCE_RECENT_MS) return 'recent';
  return 'offline';
}

export function minutesSinceTimestamp(
  value?: Timestamp | null,
  nowMs: number = Date.now(),
): number | null {
  const ms = timestampToMs(value);
  if (ms == null) return null;
  return Math.max(0, Math.floor((nowMs - ms) / 60_000));
}

export function formatLastActivityAr(
  value?: Timestamp | null,
  nowMs: number = Date.now(),
): string {
  const minutes = minutesSinceTimestamp(value, nowMs);
  if (minutes == null) return 'لا يوجد نشاط مسجّل';
  if (minutes < 1) return 'الآن';
  if (minutes === 1) return 'منذ دقيقة';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'منذ ساعة';
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'منذ يوم';
  return `منذ ${days} يوم`;
}

export function presenceStatusLabel(status: SchoolPresenceStatus): string {
  switch (status) {
    case 'online':
      return 'نشطة الآن';
    case 'recent':
      return 'نشطة مؤخراً';
    case 'offline':
      return 'غير نشطة';
    default:
      return 'غير معروف';
  }
}

export function presenceFilterMatches(
  status: SchoolPresenceStatus,
  filter: 'all' | 'online' | 'offline' | 'recent',
): boolean {
  if (filter === 'all') return true;
  if (filter === 'online') return status === 'online';
  if (filter === 'recent') return status === 'recent';
  return status === 'offline' || status === 'unknown';
}

/**
 * Notification retention policy — per-type seen retention windows.
 * Critical platform notifications are never auto-deleted.
 */

export const MS_24H = 24 * 60 * 60 * 1000;
export const MS_7D = 7 * MS_24H;

/** @deprecated Use getSeenRetentionMs — kept for imports */
export const SEEN_DELETE_AFTER_MS = MS_24H;

const CRITICAL_TYPES = new Set([
  'security',
  'billing',
  'subscription',
  'system_critical',
]);

const RETENTION_24H_TYPES = new Set([
  'chat',
  'message',
  'homework',
  'attendance',
  'absence',
  'dismissal',
]);

const RETENTION_7D_TYPES = new Set(['behavior']);

const NO_AUTO_DELETE_TYPES = new Set(['tuition', 'payment', 'installment', 'billing']);

export function isCriticalNotification(notification: {
  type?: string;
  metadata?: Record<string, unknown>;
  audience?: string;
}): boolean {
  const type = String(notification.type ?? '').toLowerCase();
  if (CRITICAL_TYPES.has(type)) return true;

  const metadata = notification.metadata;
  if (metadata?.critical === true || metadata?.systemCritical === true) return true;
  if (metadata?.retainOnOpen === true) return true;

  const metaType = String(metadata?.notificationClass ?? metadata?.severity ?? '').toLowerCase();
  if (CRITICAL_TYPES.has(metaType)) return true;

  if (type === 'announcement' && notification.audience === 'all_school') return true;
  if (
    type === 'announcement' &&
    (metadata?.audience === 'all_school' || metadata?.broadcast === true)
  ) {
    return true;
  }

  return false;
}

/**
 * Returns retention window in ms after seen, or null when no auto-delete should be scheduled.
 */
export function getSeenRetentionMs(notification: {
  type?: string;
  metadata?: Record<string, unknown>;
  audience?: string;
}): number | null {
  if (isCriticalNotification(notification)) return null;

  const type = String(notification.type ?? '').toLowerCase();

  if (NO_AUTO_DELETE_TYPES.has(type)) return null;

  if (RETENTION_24H_TYPES.has(type)) return MS_24H;
  if (RETENTION_7D_TYPES.has(type)) return MS_7D;

  if (type === 'system') return MS_7D;

  return MS_24H;
}

export function shouldScheduleSeenDeletion(notification: {
  type?: string;
  metadata?: Record<string, unknown>;
  audience?: string;
}): boolean {
  return getSeenRetentionMs(notification) !== null;
}

/** Whether the current user may manually delete this notification. */
export function canManuallyDeleteNotification(
  notification: {
    type?: string;
    metadata?: Record<string, unknown>;
    audience?: string;
  },
  userRole?: string,
): boolean {
  if (!isCriticalNotification(notification)) return true;
  const r = (userRole ?? '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') return true;
  const meta = notification.metadata;
  if (meta?.dismissible === true || meta?.allowDelete === true) return true;
  return false;
}

/**
 * @deprecated Use shouldScheduleSeenDeletion — immediate delete-on-open is no longer used.
 */
export function isNotificationSafeToDeleteOnOpen(notification: {
  type?: string;
  metadata?: Record<string, unknown>;
  audience?: string;
}): boolean {
  return shouldScheduleSeenDeletion(notification);
}

/**
 * Notification delete-on-open policy (cost reduction).
 * Critical platform notifications are never auto-deleted on open.
 */

const CRITICAL_DELETE_BLOCK_TYPES = new Set([
  'security',
  'billing',
  'subscription',
  'system_critical',
]);

const SAFE_DELETE_ON_OPEN_TYPES = new Set([
  'tuition',
  'attendance',
  'behavior',
  'homework',
  'payment',
  'message',
  'chat',
  'system',
  'grade',
  'report',
  'smart_gate',
  'dismissal',
  'announcement',
]);

export function isNotificationSafeToDeleteOnOpen(notification: {
  type?: string;
  metadata?: Record<string, unknown>;
  audience?: string;
}): boolean {
  const type = String(notification.type ?? '').toLowerCase();
  if (CRITICAL_DELETE_BLOCK_TYPES.has(type)) return false;

  const metadata = notification.metadata;
  if (metadata?.critical === true || metadata?.systemCritical === true) return false;
  if (metadata?.retainOnOpen === true) return false;

  const metaType = String(metadata?.notificationClass ?? metadata?.severity ?? '').toLowerCase();
  if (CRITICAL_DELETE_BLOCK_TYPES.has(metaType)) return false;

  if (type === 'announcement' && notification.audience === 'all_school') return false;
  if (
    type === 'announcement' &&
    (metadata?.audience === 'all_school' || metadata?.broadcast === true)
  ) {
    return false;
  }

  if (SAFE_DELETE_ON_OPEN_TYPES.has(type)) return true;

  const routeTarget = String(metadata?.routeTarget ?? '').toLowerCase();
  if (routeTarget === 'chat' || routeTarget === 'messages') return true;

  return false;
}

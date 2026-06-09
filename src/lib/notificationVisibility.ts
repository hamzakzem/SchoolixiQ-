export type NotificationAudience =
  | 'school_admin'
  | 'teacher'
  | 'parent'
  | 'all_school';

export interface NotificationViewerContext {
  uid: string;
  role?: string;
  schoolId?: string;
}

function normalizeRole(role?: string): string {
  const value = (role || '').toLowerCase();
  return value === 'super_admin' ? 'superadmin' : value;
}

function recipientIds(notification: Record<string, unknown>): string[] {
  const ids = [
    notification.userId,
    notification.recipientId,
    notification.receiverId,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);
  return [...new Set(ids)];
}

function resolveAudience(notification: Record<string, unknown>): string {
  const metadata =
    notification.metadata && typeof notification.metadata === 'object'
      ? (notification.metadata as Record<string, unknown>)
      : {};
  const audience = notification.audience ?? metadata.audience;
  return typeof audience === 'string' ? audience : '';
}

function schoolIdsMatch(
  notificationSchoolId: unknown,
  viewerSchoolId?: string,
): boolean {
  if (typeof notificationSchoolId !== 'string' || notificationSchoolId.length === 0) {
    return false;
  }
  if (notificationSchoolId === 'system') {
    return true;
  }
  if (!viewerSchoolId) {
    return false;
  }
  return notificationSchoolId === viewerSchoolId;
}

/**
 * Returns true only when a notification is safely addressed to the current viewer.
 * Malformed or cross-school documents are hidden unless they are a direct recipient match
 * with a matching schoolId (or system-scoped super-admin inbox).
 */
export function isNotificationVisibleToUser(
  notification: Record<string, unknown>,
  viewer: NotificationViewerContext,
): boolean {
  const role = normalizeRole(viewer.role);
  const uid = viewer.uid;
  if (!uid) return false;

  const recipients = recipientIds(notification);
  const audience = resolveAudience(notification);
  const notificationSchoolId = notification.schoolId;

  if (role === 'superadmin') {
    if (notification.userId === 'super_admin') return true;
    if (recipients.includes(uid)) return true;
    return false;
  }

  if (recipients.includes('super_admin')) {
    return false;
  }

  if (recipients.includes(uid)) {
    if (notificationSchoolId === 'system') {
      return role === 'superadmin';
    }
    return schoolIdsMatch(notificationSchoolId, viewer.schoolId);
  }

  if (
    audience &&
    ['school_admin', 'all_school'].includes(audience) &&
    ['admin', 'school_admin', 'assistant'].includes(role) &&
    schoolIdsMatch(notificationSchoolId, viewer.schoolId)
  ) {
    return true;
  }

  return false;
}

export function filterNotificationsForUser<T extends Record<string, unknown>>(
  notifications: T[],
  viewer: NotificationViewerContext,
): T[] {
  return notifications.filter((notification) =>
    isNotificationVisibleToUser(notification, viewer),
  );
}

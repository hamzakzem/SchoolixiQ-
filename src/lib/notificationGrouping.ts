import { isCriticalNotification } from './notificationRetention';

const GROUPABLE_TYPES = new Set(['homework', 'chat', 'message', 'attendance']);

export type NotificationListItem =
  | { kind: 'single'; notification: Record<string, unknown> & { id: string } }
  | {
      kind: 'group';
      key: string;
      type: string;
      notifications: Array<Record<string, unknown> & { id: string }>;
    };

function groupKey(notification: Record<string, unknown>): string | null {
  if (isCriticalNotification(notification)) return null;
  const type = String(notification.type ?? '').toLowerCase();
  if (!GROUPABLE_TYPES.has(type)) return null;

  const metadata =
    notification.metadata && typeof notification.metadata === 'object'
      ? (notification.metadata as Record<string, unknown>)
      : {};
  const studentId = String(metadata.studentId ?? '');
  const routeTarget = String(
    metadata.routeTarget ?? notification.routeTarget ?? '',
  ).toLowerCase();
  return `${type}|${studentId}|${routeTarget}`;
}

export function buildGroupedNotificationList(
  notifications: Array<Record<string, unknown> & { id: string }>,
): NotificationListItem[] {
  const items: NotificationListItem[] = [];
  let i = 0;

  while (i < notifications.length) {
    const current = notifications[i];
    const key = groupKey(current);

    if (!key) {
      items.push({ kind: 'single', notification: current });
      i += 1;
      continue;
    }

    const batch = [current];
    let j = i + 1;
    while (j < notifications.length && groupKey(notifications[j]) === key) {
      batch.push(notifications[j]);
      j += 1;
    }

    if (batch.length >= 2) {
      items.push({
        kind: 'group',
        key,
        type: String(current.type ?? '').toLowerCase(),
        notifications: batch,
      });
    } else {
      items.push({ kind: 'single', notification: current });
    }
    i = j;
  }

  return items;
}

export function groupSummaryLabel(
  type: string,
  count: number,
  isArabic: boolean,
): string {
  const labels: Record<string, { ar: string; en: string }> = {
    homework: { ar: 'إشعارات واجبات جديدة', en: 'new homework notifications' },
    chat: { ar: 'رسائل جديدة', en: 'new messages' },
    message: { ar: 'رسائل جديدة', en: 'new messages' },
    attendance: { ar: 'إشعارات حضور جديدة', en: 'new attendance notifications' },
  };
  const label = labels[type] ?? { ar: 'إشعارات جديدة', en: 'new notifications' };
  if (isArabic) return `${count} ${label.ar}`;
  return `${count} ${label.en}`;
}

import { resolveNotificationCategoryId, type NotificationCategoryId } from './notificationCategories';

export type NotificationRouteRole =
  | 'parent'
  | 'teacher'
  | 'admin'
  | 'staff'
  | 'assistant'
  | 'school_assistant'
  | 'platform_assistant'
  | 'superadmin'
  | 'super_admin'
  | 'guard'
  | '';

/** Shared notification metadata contract (stored under `metadata` + mirrored top-level fields). */
export type NotificationMetadataContract = {
  type?: string;
  category?: NotificationCategoryId;
  schoolId?: string;
  routeTarget?: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  conversationId?: string;
  installmentId?: string;
  source?: string;
  sourceId?: string;
  dedupKey?: string;
  [key: string]: unknown;
};

const PENDING_ROUTE_KEY = 'schoolix_pending_tab_redirect';
const PENDING_ROUTE_ROLE_KEY = 'schoolix_pending_tab_role';

export function normalizeDashboardRole(
  userRole?: string,
  profileRole?: string,
): NotificationRouteRole {
  const role = (userRole || profileRole || '').toLowerCase();
  if (role === 'super_admin') return 'superadmin';
  if (role === 'platform_assistant') return 'platform_assistant';
  if (role === 'school_assistant') return 'school_assistant';
  return role as NotificationRouteRole;
}

function readMetadata(notification: Record<string, unknown>): NotificationMetadataContract {
  if (notification.metadata && typeof notification.metadata === 'object') {
    return notification.metadata as NotificationMetadataContract;
  }
  return {};
}

/** Resolve canonical route target string from notification document. */
export function resolveRouteTarget(notification: Record<string, unknown>): string {
  const metadata = readMetadata(notification);
  const hints = [
    notification.routeTarget,
    metadata.routeTarget,
    notification.route,
    metadata.route,
    notification.link,
    metadata.link,
    notification.targetType,
    metadata.targetType,
  ];
  for (const hint of hints) {
    if (typeof hint === 'string' && hint.trim()) {
      return hint.trim().toLowerCase();
    }
  }

  const rawType = String(notification.type || 'system').toLowerCase();
  if (rawType === 'system') {
    if (metadata.conversationId || metadata.chat === true || metadata.senderId) {
      return 'chat';
    }
    if (metadata.dismissalId) return 'smart_gate';
    if (metadata.installmentId || metadata.installmentAlert) return 'tuition';
  }
  return rawType;
}

export function normalizeNotificationMetadata(
  type: string,
  metadata: NotificationMetadataContract | undefined,
  extras?: Record<string, unknown>,
): NotificationMetadataContract {
  const base = { ...(metadata || {}) };
  const merged: NotificationMetadataContract = {
    ...base,
    type: base.type || type,
  };

  if (extras?.senderId && typeof extras.senderId === 'string') {
    merged.senderId = merged.senderId || extras.senderId;
  }
  if (extras?.schoolId && typeof extras.schoolId === 'string') {
    merged.schoolId = merged.schoolId || extras.schoolId;
  }

  const category = resolveNotificationCategoryId({
    type,
    metadata: merged,
    ...extras,
  });
  merged.category = category;
  merged.routeTarget = merged.routeTarget || resolveRouteTarget({ type, metadata: merged, ...extras });

  return merged;
}

/** Map route target + role → dashboard tab id. */
export function resolveNotificationTab(
  notification: Record<string, unknown>,
  role: NotificationRouteRole | '',
): string | null {
  const route = resolveRouteTarget(notification);
  const isSchoolAdmin =
    role === 'admin' ||
    role === 'staff' ||
    role === 'assistant' ||
    role === 'school_assistant';

  switch (route) {
    case 'homework':
      return role === 'superadmin' ? null : 'homework';

    case 'grade':
    case 'grades':
      return role === 'superadmin' ? null : 'grades';

    case 'payment':
    case 'tuition':
    case 'installment':
    case 'tuition_reminders':
      if (role === 'parent' || isSchoolAdmin) return 'tuition';
      if (isSchoolAdmin) return 'tuition_reminders';
      return role === 'teacher' ? 'home' : null;

    case 'behavior':
      return role === 'superadmin' ? null : 'behavior';

    case 'announcement':
    case 'announcements':
      if (isSchoolAdmin) return 'announcements';
      if (role === 'parent' || role === 'teacher') return role === 'parent' ? 'inbox' : 'home';
      if (role === 'superadmin') return 'schools';
      return null;

    case 'message':
    case 'chat':
      return 'chat';

    case 'attendance':
      if (isSchoolAdmin) return 'attendance';
      if (role === 'parent' || role === 'teacher') return 'home';
      return null;

    case 'report':
    case 'reports':
    case 'evaluation':
    case 'evaluation_reports':
      if (isSchoolAdmin) return 'evaluation_reports';
      if (role === 'parent' || role === 'teacher') return 'reports';
      return null;

    case 'market':
    case 'store':
    case 'inventory':
    case 'order':
      if (role === 'parent' || role === 'teacher' || isSchoolAdmin) return 'market';
      return null;

    case 'smart_gate':
    case 'dismissal':
    case 'gate':
      if (role === 'guard') return 'home';
      if (isSchoolAdmin) return 'dismissal_gate';
      if (role === 'teacher') return 'dismissal';
      if (role === 'parent') return 'dismissal';
      return null;

    case 'system':
      if (role === 'superadmin') return 'settings';
      return null;

    default:
      return null;
  }
}

export function storePendingNotificationRoute(routeTarget: string, role?: string): void {
  if (typeof window === 'undefined' || !routeTarget) return;
  localStorage.setItem(PENDING_ROUTE_KEY, routeTarget);
  if (role) localStorage.setItem(PENDING_ROUTE_ROLE_KEY, role);
  window.dispatchEvent(new CustomEvent('schoolix_tab_redirect'));
  window.dispatchEvent(
    new CustomEvent('schoolix-notification-route', { detail: { route: routeTarget } }),
  );
  console.info('[Notifications] PUSH_CLICK_ROUTE', { routeTarget, role: role || '(any)' });
}

export function consumePendingNotificationRoute(
  role: NotificationRouteRole | '',
  setActiveTab: (tab: string) => void,
): boolean {
  if (typeof window === 'undefined') return false;
  const pending = localStorage.getItem(PENDING_ROUTE_KEY);
  if (!pending) return false;

  const pendingRole = localStorage.getItem(PENDING_ROUTE_ROLE_KEY);
  if (pendingRole && role && pendingRole !== role && pendingRole !== 'superadmin' && role !== 'superadmin') {
    return false;
  }

  localStorage.removeItem(PENDING_ROUTE_KEY);
  localStorage.removeItem(PENDING_ROUTE_ROLE_KEY);

  const tab = resolveNotificationTab({ type: pending, metadata: { routeTarget: pending } }, role);
  if (tab) {
    setActiveTab(tab);
    console.info('[Notifications] PUSH_CLICK_ROUTE', { routeTarget: pending, tab, role });
    return true;
  }

  console.info('[Notifications] PUSH_CLICK_ROUTE', { routeTarget: pending, tab: null, role });
  return false;
}

/** Global listeners for service worker + native push taps. */
export function setupGlobalNotificationClickRouting(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onSwMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== 'NOTIFICATION_CLICK') return;
    const route = data.routeTarget || data.route;
    if (typeof route === 'string' && route.trim()) {
      storePendingNotificationRoute(route.trim().toLowerCase());
    }
  };

  const onNativeRoute = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    const route = detail?.route;
    if (typeof route === 'string' && route.trim()) {
      storePendingNotificationRoute(route.trim().toLowerCase());
    }
  };

  navigator.serviceWorker?.addEventListener('message', onSwMessage);
  window.addEventListener('schoolix-notification-route', onNativeRoute);

  return () => {
    navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    window.removeEventListener('schoolix-notification-route', onNativeRoute);
  };
}


export function getNotificationActionLabel(
  notification: Record<string, unknown>,
  isArabic: boolean,
): string | null {
  const tab = resolveNotificationTab(notification, '');
  if (!tab) return null;
  const route = resolveRouteTarget(notification);
  const labels: Record<string, { ar: string; en: string }> = {
    homework: { ar: 'فتح الواجبات', en: 'Open homework' },
    grades: { ar: 'فتح الدرجات', en: 'Open grades' },
    tuition: { ar: 'فتح الأقساط', en: 'Open tuition' },
    chat: { ar: 'فتح المحادثة', en: 'Open chat' },
    attendance: { ar: 'فتح الحضور', en: 'Open attendance' },
    reports: { ar: 'فتح التقارير', en: 'Open reports' },
    announcements: { ar: 'فتح الإعلانات', en: 'Open announcements' },
    dismissal: { ar: 'فتح التسريح', en: 'Open dismissal' },
    smart_gate: { ar: 'فتح البوابة الذكية', en: 'Open smart gate' },
    market: { ar: 'فتح المتجر', en: 'Open store' },
  };
  const label = labels[route] || labels[tab];
  if (!label) return isArabic ? 'عرض' : 'View';
  return isArabic ? 'عرض' : 'View';
}

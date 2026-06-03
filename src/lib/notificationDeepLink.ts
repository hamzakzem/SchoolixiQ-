export type AppNotification = {
  type?: string;
  metadata?: Record<string, unknown>;
};

function normalizeRole(role?: string | null): string {
  const r = (role || '').toLowerCase().trim();
  if (r === 'super_admin') return 'superadmin';
  return r;
}

/**
 * Resolves the dashboard tab id to open when a notification is clicked.
 */
export function resolveNotificationTab(
  notification: AppNotification,
  role?: string | null,
): string {
  const meta = notification.metadata || {};
  const explicitTab = meta.tab ?? meta.targetTab;
  if (typeof explicitTab === 'string' && explicitTab.trim()) {
    return explicitTab.trim();
  }

  const r = normalizeRole(role);
  const type = (notification.type || 'system').toLowerCase();

  if (meta.conversationId) {
    return 'chat';
  }

  if (meta.requestType === 'renewal' || type === 'renewal_request') {
    return r === 'superadmin' ? 'requests' : 'settings';
  }

  if (meta.orderId) {
    return r === 'parent' ? 'market' : 'market';
  }

  if (r === 'superadmin') {
    switch (type) {
      case 'message':
        return 'chat';
      case 'system':
        return meta.schoolId ? 'requests' : 'schools';
      case 'announcement':
        return 'requests';
      case 'payment':
      case 'tuition':
        return 'requests';
      default:
        return 'requests';
    }
  }

  if (r === 'parent') {
    switch (type) {
      case 'homework':
        return 'homework';
      case 'grade':
      case 'grades':
        return 'grades';
      case 'payment':
      case 'tuition':
        return 'tuition';
      case 'behavior':
        return 'behavior';
      case 'announcement':
        return 'inbox';
      case 'attendance':
        return 'home';
      case 'report':
        return meta.reportKind === 'advanced' ? 'advanced_reports' : 'reports';
      case 'message':
      case 'system':
        return 'chat';
      case 'schedules':
      case 'schedule':
        return 'schedules';
      default:
        return 'home';
    }
  }

  if (r === 'teacher') {
    switch (type) {
      case 'homework':
        return 'homework';
      case 'grade':
      case 'grades':
        return 'grades';
      case 'behavior':
        return 'behavior';
      case 'report':
        return meta.reportKind === 'advanced' ? 'advanced_reports' : 'reports';
      case 'announcement':
      case 'schedules':
      case 'schedule':
        return 'schedules';
      case 'attendance':
        return 'home';
      case 'message':
      case 'system':
        return 'chat';
      default:
        return 'home';
    }
  }

  if (r === 'admin' || r === 'staff' || r === 'assistant') {
    switch (type) {
      case 'homework':
        return 'homework';
      case 'grade':
      case 'grades':
        return 'grades';
      case 'payment':
        return meta.orderId ? 'market' : 'tuition';
      case 'tuition':
        return 'tuition';
      case 'behavior':
        return 'behavior';
      case 'announcement':
        return 'announcements';
      case 'attendance':
        return 'attendance';
      case 'report':
        return meta.reportKind === 'advanced' ? 'advanced_reports' : 'evaluation_reports';
      case 'message':
      case 'system':
        return 'chat';
      case 'schedules':
      case 'schedule':
        return 'schedules';
      default:
        return 'overview';
    }
  }

  return 'overview';
}

export function getNotificationTabLabel(tab: string, isArabic: boolean): string {
  const labelsAr: Record<string, string> = {
    overview: 'نظرة عامة',
    home: 'الرئيسية',
    homework: 'الواجبات',
    grades: 'الدرجات',
    tuition: 'الرسوم',
    behavior: 'السلوك',
    attendance: 'الحضور',
    announcements: 'الإعلانات',
    chat: 'المحادثات',
    reports: 'التقارير',
    evaluation_reports: 'تقييم الطلاب',
    advanced_reports: 'تقارير متقدمة',
    market: 'المتجر',
    schedules: 'الجداول',
    inbox: 'صندوق الرسائل',
    requests: 'طلبات الاشتراك',
    schools: 'المدارس',
    settings: 'الإعدادات',
  };
  const labelsEn: Record<string, string> = {
    overview: 'Overview',
    home: 'Home',
    homework: 'Homework',
    grades: 'Grades',
    tuition: 'Tuition',
    behavior: 'Behavior',
    attendance: 'Attendance',
    announcements: 'Announcements',
    chat: 'Chat',
    reports: 'Reports',
    evaluation_reports: 'Evaluations',
    advanced_reports: 'Advanced reports',
    market: 'Marketplace',
    schedules: 'Schedules',
    inbox: 'Inbox',
    requests: 'Subscription requests',
    schools: 'Schools',
    settings: 'Settings',
  };
  const map = isArabic ? labelsAr : labelsEn;
  return map[tab] || tab;
}

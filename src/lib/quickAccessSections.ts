export type QuickAccessSectionId =
  | 'frequent'
  | 'management'
  | 'finance'
  | 'communication'
  | 'reports'
  | 'system';

export type QuickAccessMenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
};

export const QUICK_ACCESS_SECTIONS: Array<{
  id: QuickAccessSectionId;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
}> = [
  {
    id: 'frequent',
    labelAr: 'الأكثر استخدامًا',
    labelEn: 'Most used',
    descAr: 'اختصاراتك اليومية',
    descEn: 'Your daily shortcuts',
  },
  {
    id: 'management',
    labelAr: 'إدارة المدرسة',
    labelEn: 'School management',
    descAr: 'الطلاب، الصفوف، الجداول، الحضور',
    descEn: 'Students, classes, schedules, attendance',
  },
  {
    id: 'finance',
    labelAr: 'المالية',
    labelEn: 'Finance',
    descAr: 'الأقساط، الرواتب، المدفوعات',
    descEn: 'Tuition, payroll, payments',
  },
  {
    id: 'communication',
    labelAr: 'التواصل',
    labelEn: 'Communication',
    descAr: 'الرسائل، الإشعارات، أولياء الأمور',
    descEn: 'Messages, alerts, parents',
  },
  {
    id: 'reports',
    labelAr: 'التقارير',
    labelEn: 'Reports',
    descAr: 'الملخصات والسجلات والتحليلات',
    descEn: 'Summaries, records, analytics',
  },
  {
    id: 'system',
    labelAr: 'النظام والصلاحيات',
    labelEn: 'System & permissions',
    descAr: 'الإعدادات، المستخدمون، الصلاحيات',
    descEn: 'Settings, users, permissions',
  },
];

const SECTION_BY_ITEM: Record<string, QuickAccessSectionId> = {
  home: 'frequent',
  overview: 'frequent',
  students: 'management',
  students_edit: 'management',
  staff: 'management',
  classes: 'management',
  assistants: 'management',
  parents: 'management',
  schools: 'management',
  accounts: 'management',
  team: 'management',
  users: 'management',
  schedules: 'management',
  attendance: 'management',
  tuition: 'finance',
  tuition_reminders: 'finance',
  payroll: 'finance',
  inventory: 'finance',
  market: 'finance',
  packages: 'finance',
  requests: 'finance',
  chat: 'communication',
  messages: 'communication',
  announcements: 'communication',
  inbox: 'communication',
  grades: 'reports',
  homework: 'reports',
  behavior: 'reports',
  student_archive: 'reports',
  id_cards: 'reports',
  evaluation_reports: 'reports',
  reports: 'reports',
  advanced_reports: 'reports',
  settings: 'system',
  audit_logs: 'system',
  recycle_bin: 'system',
  footer: 'system',
  backups: 'system',
  diagnostics: 'system',
  dismissal_gate: 'system',
  dismissal: 'system',
};

const ITEM_DESC_AR: Record<string, string> = {
  overview: 'لوحة المتابعة والإحصائيات',
  home: 'الصفحة الرئيسية',
  schedules: 'جداول الحصص والمواعيد',
  attendance: 'تسجيل ومتابعة الحضور',
  students: 'سجل الطلاب وبياناتهم',
  students_edit: 'تعديل بيانات الطلاب',
  staff: 'الكادر التعليمي والإداري',
  classes: 'الصفوف والشعب الدراسية',
  assistants: 'مساعدو الإدارة والصلاحيات',
  parents: 'حسابات أولياء الأمور',
  schools: 'إدارة المدارس المسجّلة',
  accounts: 'حسابات الدخول والتفعيل',
  team: 'فريق النظام والصلاحيات',
  users: 'المستخدمون والأدوار',
  tuition: 'الأقساط والتحصيل المالي',
  tuition_reminders: 'تذكيرات الأقساط',
  payroll: 'رواتب الموظفين',
  inventory: 'المخزون والمستلزمات',
  market: 'المتجر والمنتجات',
  packages: 'باقات الاشتراك',
  requests: 'طلبات التسجيل والاشتراك',
  chat: 'المحادثات والرسائل',
  messages: 'صندوق الرسائل',
  announcements: 'الإعلانات والتنبيهات',
  inbox: 'البريد الوارد',
  grades: 'الدرجات والتقييمات',
  homework: 'الواجبات والمهام',
  behavior: 'السلوك والانضباط',
  student_archive: 'أرشيف الطلاب',
  id_cards: 'بطاقات الهوية',
  evaluation_reports: 'تقارير التقييم',
  reports: 'التقارير العامة',
  advanced_reports: 'التقارير المتقدمة',
  settings: 'إعدادات الحساب والمدرسة',
  audit_logs: 'سجل العمليات',
  recycle_bin: 'سلة المحذوفات',
  footer: 'إعدادات التذييل',
  backups: 'النسخ الاحتياطي',
  diagnostics: 'فحص النظام والتشخيص',
  dismissal_gate: 'بوابة الانصراف',
  dismissal: 'متابعة الانصراف',
};

const ADMIN_ITEM_IDS = new Set([
  'assistants',
  'staff',
  'team',
  'users',
  'accounts',
  'schools',
  'settings',
  'audit_logs',
  'backups',
  'diagnostics',
  'packages',
  'requests',
]);

export function resolveQuickAccessSection(itemId: string): QuickAccessSectionId {
  return SECTION_BY_ITEM[itemId] ?? 'frequent';
}

export function getQuickAccessItemDescription(item: QuickAccessMenuItem, isRtl = true): string {
  if (item.description) return item.description;
  const ar = ITEM_DESC_AR[item.id];
  if (ar) return ar;
  return isRtl ? 'الانتقال إلى هذا القسم' : 'Go to this section';
}

export function getQuickAccessItemBadge(
  itemId: string,
  isRtl = true,
): 'admin' | 'available' | null {
  if (ADMIN_ITEM_IDS.has(itemId)) return 'admin';
  return null;
}

export function groupItemsForQuickAccess(
  items: QuickAccessMenuItem[],
  searchTerm: string,
): Array<{ section: (typeof QUICK_ACCESS_SECTIONS)[number]; items: QuickAccessMenuItem[] }> {
  const kw = searchTerm.trim().toLowerCase();
  const filtered = kw
    ? items.filter((item) => {
        const section = QUICK_ACCESS_SECTIONS.find(
          (s) => s.id === resolveQuickAccessSection(item.id),
        );
        const desc = getQuickAccessItemDescription(item);
        return (
          item.label.toLowerCase().includes(kw) ||
          item.id.toLowerCase().includes(kw) ||
          desc.toLowerCase().includes(kw) ||
          (section?.labelAr.toLowerCase().includes(kw) ?? false) ||
          (section?.descAr.toLowerCase().includes(kw) ?? false)
        );
      })
    : items;

  return QUICK_ACCESS_SECTIONS.map((section) => ({
    section,
    items: filtered.filter((item) => resolveQuickAccessSection(item.id) === section.id),
  })).filter((group) => group.items.length > 0);
}

/** Tab id for the permissions gateway shortcut card. */
export function resolvePermissionsGatewayTab(
  menuItems: QuickAccessMenuItem[],
  role?: string,
): string | null {
  const ids = new Set(menuItems.map((i) => i.id));
  const r = (role ?? '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') {
    if (ids.has('team')) return 'team';
    if (ids.has('users')) return 'users';
  }
  if (ids.has('assistants')) return 'assistants';
  if (ids.has('settings')) return 'settings';
  if (ids.has('staff')) return 'staff';
  return null;
}

export function canShowPermissionsGateway(role?: string, gatewayTab: string | null = null): boolean {
  if (!gatewayTab) return false;
  const r = (role ?? '').toLowerCase();
  return ['admin', 'school_admin', 'assistant', 'superadmin', 'super_admin'].includes(r);
}

export function getPermissionsGatewayBadge(role?: string, isRtl = true): string {
  const r = (role ?? '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') {
    return isRtl ? 'سوبر أدمن' : 'Super admin';
  }
  return isRtl ? 'إدارة' : 'Admin';
}

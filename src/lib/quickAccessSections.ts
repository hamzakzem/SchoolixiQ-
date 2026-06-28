export type QuickAccessSectionId =
  | 'frequent'
  | 'management'
  | 'students'
  | 'finance'
  | 'communication'
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
}> = [
  { id: 'frequent', labelAr: 'الأكثر استخدامًا', labelEn: 'Most used' },
  { id: 'management', labelAr: 'الإدارة', labelEn: 'Management' },
  { id: 'students', labelAr: 'الطلاب', labelEn: 'Students' },
  { id: 'finance', labelAr: 'المالية', labelEn: 'Finance' },
  { id: 'communication', labelAr: 'التواصل', labelEn: 'Communication' },
  { id: 'system', labelAr: 'النظام والصلاحيات', labelEn: 'System & permissions' },
];

const SECTION_BY_ITEM: Record<string, QuickAccessSectionId> = {
  home: 'frequent',
  overview: 'frequent',
  schedules: 'frequent',
  attendance: 'frequent',
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
  grades: 'students',
  homework: 'students',
  behavior: 'students',
  student_archive: 'students',
  id_cards: 'students',
  evaluation_reports: 'students',
  reports: 'students',
  advanced_reports: 'students',
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
  settings: 'system',
  audit_logs: 'system',
  recycle_bin: 'system',
  footer: 'system',
  backups: 'system',
  diagnostics: 'system',
  dismissal_gate: 'system',
  dismissal: 'system',
};

export function resolveQuickAccessSection(itemId: string): QuickAccessSectionId {
  return SECTION_BY_ITEM[itemId] ?? 'frequent';
}

export function groupItemsForQuickAccess(
  items: QuickAccessMenuItem[],
  searchTerm: string,
): Array<{ section: (typeof QUICK_ACCESS_SECTIONS)[number]; items: QuickAccessMenuItem[] }> {
  const kw = searchTerm.trim().toLowerCase();
  const filtered = kw
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(kw) ||
          item.id.toLowerCase().includes(kw) ||
          (item.description?.toLowerCase().includes(kw) ?? false),
      )
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

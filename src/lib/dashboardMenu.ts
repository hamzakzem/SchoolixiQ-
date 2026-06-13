import type { LucideIcon } from 'lucide-react';

/** Shared navigation item used by sidebar, mobile dock, and search. */
export type DashboardMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  adminOnly?: boolean;
  /** Optional section id for grouped sidebar rendering. */
  section?: string;
};

export type DashboardNavSection = {
  id: string;
  label: string;
};

export type DashboardShellVariant = 'light' | 'admin-dark' | 'superadmin';

/** Mobile dock primary tabs (Home · Notifications · Messages · Tasks · More). */
export const MOBILE_DOCK_PRIMARY_IDS = [
  'home',
  'overview',
  'notifications',
  'chat',
  'messages',
  'tasks',
] as const;

export const TEACHER_NAV_SECTIONS: DashboardNavSection[] = [
  { id: 'today', label: 'Today' },
  { id: 'academic', label: 'Academic' },
  { id: 'communication', label: 'Communication' },
  { id: 'services', label: 'Services' },
  { id: 'system', label: 'System' },
];

export const TEACHER_ITEM_SECTIONS: Record<string, string> = {
  home: 'today',
  schedules: 'today',
  homework: 'academic',
  grades: 'academic',
  behavior: 'academic',
  reports: 'academic',
  advanced_reports: 'academic',
  id_cards: 'academic',
  chat: 'communication',
  market: 'services',
  dismissal: 'services',
  settings: 'system',
};

export const ADMIN_NAV_SECTIONS: DashboardNavSection[] = [
  { id: 'management', label: 'Management' },
  { id: 'academic', label: 'Academic' },
  { id: 'financial', label: 'Financial' },
  { id: 'communication', label: 'Communication' },
  { id: 'services', label: 'Services' },
  { id: 'reports_system', label: 'Reports & System' },
];

export const ADMIN_ITEM_SECTIONS: Record<string, string> = {
  overview: 'management',
  students: 'management',
  students_edit: 'management',
  staff: 'management',
  classes: 'management',
  assistants: 'management',
  attendance: 'academic',
  grades: 'academic',
  homework: 'academic',
  evaluation_reports: 'academic',
  schedules: 'academic',
  behavior: 'academic',
  student_archive: 'academic',
  tuition: 'financial',
  tuition_reminders: 'financial',
  payroll: 'financial',
  inventory: 'financial',
  chat: 'communication',
  announcements: 'communication',
  parents: 'services',
  market: 'services',
  dismissal_gate: 'services',
  id_cards: 'services',
  advanced_reports: 'reports_system',
  audit_logs: 'reports_system',
  recycle_bin: 'reports_system',
  settings: 'reports_system',
};

export function attachSectionLabels(
  items: DashboardMenuItem[],
  sectionMap: Record<string, string>,
): DashboardMenuItem[] {
  return items.map((item) => ({
    ...item,
    section: sectionMap[item.id] ?? item.section,
  }));
}

export function groupMenuBySection(
  items: DashboardMenuItem[],
  sections: DashboardNavSection[],
): Array<{ section: DashboardNavSection; items: DashboardMenuItem[] }> {
  const grouped = sections
    .map((section) => ({
      section,
      items: items.filter((item) => item.section === section.id),
    }))
    .filter((g) => g.items.length > 0);

  const knownIds = new Set(grouped.flatMap((g) => g.items.map((i) => i.id)));
  const unsectioned = items.filter((item) => !knownIds.has(item.id));
  if (unsectioned.length > 0) {
    grouped.push({
      section: { id: 'other', label: 'Other' },
      items: unsectioned,
    });
  }
  return grouped;
}

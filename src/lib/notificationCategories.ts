import {
  MessageSquare,
  DollarSign,
  UserCheck,
  BookOpen,
  FileText,
  Megaphone,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/** Canonical notification categories for UI, badges, and routing. */
export type NotificationCategoryId =
  | 'messages'
  | 'tuition'
  | 'attendance'
  | 'homework'
  | 'reports'
  | 'announcements'
  | 'smart_gate'
  | 'system';

export type NotificationCategoryConfig = {
  id: NotificationCategoryId;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  /** Dashboard tab id(s) that should show a badge when this category has unread items. */
  tabIds: string[];
  /** Raw notification `type` values mapped to this category. */
  typeAliases: string[];
};

export const NOTIFICATION_CATEGORIES: NotificationCategoryConfig[] = [
  {
    id: 'messages',
    labelAr: 'الرسائل',
    labelEn: 'Messages',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    tabIds: ['chat', 'messages'],
    typeAliases: ['message', 'chat'],
  },
  {
    id: 'tuition',
    labelAr: 'الأقساط',
    labelEn: 'Tuition',
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    tabIds: ['tuition', 'tuition_reminders'],
    typeAliases: ['payment', 'tuition', 'installment'],
  },
  {
    id: 'attendance',
    labelAr: 'الحضور',
    labelEn: 'Attendance',
    icon: UserCheck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    tabIds: ['attendance'],
    typeAliases: ['attendance'],
  },
  {
    id: 'homework',
    labelAr: 'الواجبات',
    labelEn: 'Homework',
    icon: BookOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    tabIds: ['homework'],
    typeAliases: ['homework'],
  },
  {
    id: 'reports',
    labelAr: 'التقارير',
    labelEn: 'Reports',
    icon: FileText,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    tabIds: ['reports', 'evaluation_reports'],
    typeAliases: ['report', 'evaluation', 'evaluation_reports', 'behavior', 'grade', 'grades'],
  },
  {
    id: 'announcements',
    labelAr: 'الإعلانات',
    labelEn: 'Announcements',
    icon: Megaphone,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    tabIds: ['announcements', 'home'],
    typeAliases: ['announcement'],
  },
  {
    id: 'smart_gate',
    labelAr: 'البوابة الذكية',
    labelEn: 'Smart Gate',
    icon: ShieldCheck,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    tabIds: ['dismissal', 'smart_gate'],
    typeAliases: ['dismissal', 'smart_gate', 'gate'],
  },
  {
    id: 'system',
    labelAr: 'النظام',
    labelEn: 'System',
    icon: Settings,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    tabIds: [],
    typeAliases: ['system'],
  },
];

const CATEGORY_BY_ID = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.id, c]),
) as Record<NotificationCategoryId, NotificationCategoryConfig>;

/** Resolve a Firestore notification document to a canonical category id. */
export function resolveNotificationCategoryId(notification: Record<string, unknown>): NotificationCategoryId {
  const metadata =
    notification.metadata && typeof notification.metadata === 'object'
      ? (notification.metadata as Record<string, unknown>)
      : {};

  const routeHints = [
    notification.route,
    notification.link,
    notification.targetType,
    metadata.route,
    metadata.link,
    metadata.targetType,
  ];
  for (const hint of routeHints) {
    if (typeof hint === 'string' && hint.trim()) {
      const h = hint.trim().toLowerCase();
      const byAlias = NOTIFICATION_CATEGORIES.find((c) =>
        c.typeAliases.some((a) => h.includes(a)) || c.id === h,
      );
      if (byAlias) return byAlias.id;
    }
  }

  if (
    metadata.conversationId ||
    metadata.chat === true ||
    metadata.senderId ||
    String(notification.title || '').includes('رسالة')
  ) {
    return 'messages';
  }

  if (metadata.installmentAlert || metadata.installmentId || metadata.dismissalId) {
    return metadata.dismissalId ? 'smart_gate' : 'tuition';
  }

  const rawType = String(notification.type || 'system').toLowerCase();
  for (const cat of NOTIFICATION_CATEGORIES) {
    if (cat.typeAliases.includes(rawType)) return cat.id;
  }

  return 'system';
}

export function getCategoryConfig(id: NotificationCategoryId): NotificationCategoryConfig {
  return CATEGORY_BY_ID[id] ?? CATEGORY_BY_ID.system;
}

export type TimeGroupId = 'today' | 'yesterday' | 'older';

export function getTimeGroup(date: Date | null | undefined): TimeGroupId {
  if (!date || Number.isNaN(date.getTime())) return 'older';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  return 'older';
}

export const TIME_GROUP_LABELS: Record<TimeGroupId, { ar: string; en: string }> = {
  today: { ar: 'اليوم', en: 'Today' },
  yesterday: { ar: 'أمس', en: 'Yesterday' },
  older: { ar: 'سابقاً', en: 'Earlier' },
};

/** Map category unread counts to dashboard tab badge counts. */
export function buildTabBadgeCounts(
  categoryUnread: Partial<Record<NotificationCategoryId, number>>,
): Record<string, number> {
  const tabCounts: Record<string, number> = {};
  for (const cat of NOTIFICATION_CATEGORIES) {
    const count = categoryUnread[cat.id] || 0;
    if (count <= 0) continue;
    for (const tabId of cat.tabIds) {
      tabCounts[tabId] = (tabCounts[tabId] || 0) + count;
    }
  }
  return tabCounts;
}

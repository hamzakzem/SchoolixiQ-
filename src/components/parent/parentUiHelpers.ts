/** UI-only helpers for parent dashboard — no data/schema changes */

export type HomeworkItem = {
  id: string;
  title?: string;
  content?: string;
  dueDate?: string;
  createdAt?: { seconds?: number };
  teacherName?: string;
  [key: string]: unknown;
};

function parseDueDate(dueDate?: string): Date | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (!Number.isNaN(d.getTime())) return d;
  const parts = dueDate.split(/[/\-]/);
  if (parts.length === 3) {
    const alt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (!Number.isNaN(alt.getTime())) return alt;
  }
  return null;
}

export function groupHomeworkByTimeline(items: HomeworkItem[], isRtl: boolean) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const todayLabel = isRtl ? 'اليوم' : 'Today';
  const weekLabel = isRtl ? 'هذا الأسبوع' : 'This week';
  const laterLabel = isRtl ? 'لاحقاً' : 'Later';
  const overdueLabel = isRtl ? 'متأخر' : 'Overdue';

  const groups: Record<string, HomeworkItem[]> = {
    [overdueLabel]: [],
    [todayLabel]: [],
    [weekLabel]: [],
    [laterLabel]: [],
  };

  for (const hw of items) {
    const due = parseDueDate(hw.dueDate);
    if (!due) {
      groups[laterLabel].push(hw);
      continue;
    }
    due.setHours(0, 0, 0, 0);
    if (due < now) groups[overdueLabel].push(hw);
    else if (due.getTime() === now.getTime()) groups[todayLabel].push(hw);
    else if (due <= weekEnd) groups[weekLabel].push(hw);
    else groups[laterLabel].push(hw);
  }

  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

export function computeGradeAverage(grades: { score?: number }[]): number | null {
  if (grades.length === 0) return null;
  const sum = grades.reduce((s, g) => s + Number(g.score ?? 0), 0);
  return Math.round(sum / grades.length);
}

export function tuitionRemaining(student: {
  totalTuition?: number;
  tuitionBalance?: number;
} | null): number {
  if (!student) return 0;
  return Math.max(0, (student.totalTuition || 0) - (student.tuitionBalance || 0));
}

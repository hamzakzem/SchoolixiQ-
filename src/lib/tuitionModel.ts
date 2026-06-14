/**
 * Shared tuition domain model — aligned with src/views/admin/Tuition.tsx (الأقساط المدرسية).
 * Single source of truth for installment status, overdue logic, balances, and Firestore queries.
 */

import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { parseDueDate } from './dailySummaryUtils';

export type TuitionStudent = {
  id: string;
  schoolId?: string;
  name?: string;
  totalTuition?: number;
  tuitionBalance?: number;
  parentPhone?: string;
  guardianPhone?: string;
  parentIds?: string[];
  parentEmail?: string;
  registrationNumber?: string;
  class?: string;
  classId?: string;
};

export type TuitionInstallment = {
  id: string;
  studentId: string;
  schoolId?: string;
  amount?: number;
  dueDate?: unknown;
  status?: string;
  isDeleted?: boolean;
  paidAt?: unknown;
  paidAmount?: number;
};

export type LateInstallmentView = TuitionInstallment & {
  studentName: string;
  student?: TuitionStudent;
  delayDays: number;
  delayLevel: 'early' | 'medium' | 'critical';
};

export type ReminderBucket = 'overdue' | 'today' | 'soon' | 'later';

export type TuitionPayment = {
  id?: string;
  studentId?: string;
  schoolId?: string;
  amount?: number;
  type?: string;
  createdAt?: unknown;
};

export type TuitionReminderTrackingSnapshot = {
  reminderCount?: number;
  lastReminderAt?: Date | null;
  escalationLevel?: number;
  parentStatus?: 'active' | 'warning' | 'restricted' | string;
};

/** Timing config for eligibility (mirrors school tuitionReminderSettings). */
export type TuitionReminderEligibilityConfig = {
  autoRemindersEnabled: boolean;
  reminderStartAfterDays: number;
  reminderRepeatEveryDays: number;
  maxReminderCountBeforeWarning: number;
  restrictAfterDays: number;
  upcomingDays: number;
};

/** Map persisted school settings → eligibility config (no service import). */
export function toEligibilityConfigFromSettings(
  settings: Partial<TuitionReminderEligibilityConfig> & {
    daysBeforeEscalation?: number;
    level3AfterReminders?: number;
    intervalHours?: number;
    level2Hours?: number;
    redWarningDurationDays?: number;
  },
): TuitionReminderEligibilityConfig {
  return {
    autoRemindersEnabled: settings.autoRemindersEnabled ?? false,
    reminderStartAfterDays: settings.reminderStartAfterDays ?? 25,
    reminderRepeatEveryDays:
      settings.reminderRepeatEveryDays ??
      Math.max(1, Math.ceil((settings.intervalHours ?? 72) / 24)),
    maxReminderCountBeforeWarning:
      settings.maxReminderCountBeforeWarning ?? settings.level3AfterReminders ?? 3,
    restrictAfterDays: settings.restrictAfterDays ?? 35,
    upcomingDays: settings.upcomingDays ?? settings.daysBeforeEscalation ?? 7,
  };
}

export type TuitionReminderFilterKey =
  | 'all'
  | 'overdue'
  | 'today'
  | 'soon'
  | 'auto_eligible'
  | 'restricted';

export type EligibleTuitionReminderRow = ReminderDashboardRow & {
  autoReminderEligible: boolean;
  escalationEligible: boolean;
  isRestricted: boolean;
  hasLinkedParent: boolean;
  daysSinceTimingAnchor: number;
  timingAnchor: Date;
  reminderCount: number;
  lastReminderAt: Date | null;
  escalationLevel: number;
  parentStatus: 'active' | 'warning' | 'restricted';
};

export type TuitionReminderDisplayRow = EligibleTuitionReminderRow & {
  className: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentId?: string;
  hasWhatsApp: boolean;
  linkedParentLabel: string;
  whatsAppLabel: string;
  statusLabel: string;
};

export type ReminderDashboardRow = {
  installmentId: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: Date;
  delayDays: number;
  bucket: ReminderBucket;
  installment: TuitionInstallment;
  student?: TuitionStudent;
};

/** Parse installment dueDate (ISO string, Firestore Timestamp, or legacy {seconds}). */
export function parseTuitionDueDate(value: unknown): Date {
  return parseDueDate(value);
}

/** Tuition.tsx unpaid filter: status !== 'paid' (includes pending, undefined, overdue labels) */
export function isUnpaidInstallment(installment: Pick<TuitionInstallment, 'status'>): boolean {
  const status = String(installment.status || '').toLowerCase();
  return status !== 'paid';
}

/** Keep installments tied to this school (handles legacy docs missing schoolId). */
export function filterInstallmentsForSchool(
  installments: TuitionInstallment[],
  students: TuitionStudent[],
  schoolId: string,
): TuitionInstallment[] {
  const studentIds = new Set(students.filter((s) => s.schoolId === schoolId || !s.schoolId).map((s) => s.id));
  return installments.filter((inst) => {
    if (inst.isDeleted) return false;
    if (inst.schoolId === schoolId) return true;
    if (!inst.schoolId && studentIds.has(inst.studentId)) return true;
    return studentIds.has(inst.studentId);
  });
}

/** Tuition.tsx overdue filter: status !== 'paid' && new Date(dueDate) < now */
export function isOverdueInstallment(
  installment: Pick<TuitionInstallment, 'status' | 'dueDate'>,
  now: Date = new Date(),
): boolean {
  if (!isUnpaidInstallment(installment)) return false;
  const due = parseTuitionDueDate(installment.dueDate);
  return due.getTime() > 0 && due < now;
}

/** Tuition.tsx remaining balance: (totalTuition || 0) - (tuitionBalance || 0) */
export function getStudentRemainingBalance(
  student: Pick<TuitionStudent, 'totalTuition' | 'tuitionBalance'>,
): number {
  return (student.totalTuition || 0) - (student.tuitionBalance || 0);
}

export function getInstallmentsForStudent(
  installments: TuitionInstallment[],
  studentId: string,
): TuitionInstallment[] {
  return installments.filter((i) => i.studentId === studentId);
}

export function getPendingInstallmentsForStudent(
  installments: TuitionInstallment[],
  studentId: string,
): TuitionInstallment[] {
  return getInstallmentsForStudent(installments, studentId)
    .filter((i) => isUnpaidInstallment(i))
    .sort(
      (a, b) =>
        parseTuitionDueDate(a.dueDate).getTime() - parseTuitionDueDate(b.dueDate).getTime(),
    );
}

/** Tuition.tsx per-student late badge */
export function isStudentLate(
  student: TuitionStudent,
  installments: TuitionInstallment[],
  now: Date = new Date(),
): boolean {
  return getInstallmentsForStudent(installments, student.id).some((i) =>
    isOverdueInstallment(i, now),
  );
}

/** Tuition.tsx lateInstallments delayDays: Math.max(1, floor(diff / day)) */
export function computeInstallmentDelayDays(dueDate: unknown, now: Date = new Date()): number {
  const due = parseTuitionDueDate(dueDate);
  const diffTime = now.getTime() - due.getTime();
  return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function computeDelayLevel(delayDays: number): LateInstallmentView['delayLevel'] {
  if (delayDays > 30) return 'critical';
  if (delayDays > 10) return 'medium';
  return 'early';
}

/** Tuition.tsx totalArrears */
export function computeTotalArrears(installments: TuitionInstallment[], now: Date = new Date()): number {
  return installments
    .filter((i) => isOverdueInstallment(i, now))
    .reduce((sum, i) => sum + (i.amount || 0), 0);
}

/** Tuition.tsx lateInstallments list */
export function computeLateInstallments(
  installments: TuitionInstallment[],
  students: TuitionStudent[],
  now: Date = new Date(),
): LateInstallmentView[] {
  return installments
    .filter((i) => isOverdueInstallment(i, now))
    .map((i) => {
      const student = students.find((s) => s.id === i.studentId);
      const delayDays = computeInstallmentDelayDays(i.dueDate, now);
      return {
        ...i,
        studentName: student?.name || 'طالب مجهول',
        student,
        delayDays,
        delayLevel: computeDelayLevel(delayDays),
      };
    })
    .sort((a, b) => b.delayDays - a.delayDays);
}

/** Reminder dashboard bucket — extends Tuition overdue logic with today/soon windows */
export function classifyInstallmentReminderBucket(
  installment: Pick<TuitionInstallment, 'status' | 'dueDate'>,
  upcomingDays: number,
  now: Date = new Date(),
): ReminderBucket | null {
  if (!isUnpaidInstallment(installment)) return null;
  const due = parseTuitionDueDate(installment.dueDate);
  if (!due.getTime() || Number.isNaN(due.getTime())) return null;

  if (isOverdueInstallment(installment, now)) return 'overdue';

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  if (due >= startToday && due < endToday) return 'today';

  const endSoon = new Date(startToday);
  endSoon.setDate(endSoon.getDate() + Math.max(1, upcomingDays) + 1);
  if (due >= endToday && due < endSoon) return 'soon';

  if (due >= endSoon) return 'later';

  return null;
}

export function buildReminderDashboardRows(
  installments: TuitionInstallment[],
  students: TuitionStudent[],
  upcomingDays: number,
  now: Date = new Date(),
): ReminderDashboardRow[] {
  return installments
    .map((installment) => {
      const bucket = classifyInstallmentReminderBucket(installment, upcomingDays, now);
      if (!bucket) return null;
      const student = students.find((s) => s.id === installment.studentId);
      const dueDate = parseTuitionDueDate(installment.dueDate);
      const delayDays = bucket === 'overdue' ? computeInstallmentDelayDays(installment.dueDate, now) : 0;
      return {
        installmentId: installment.id,
        studentId: installment.studentId,
        studentName: student?.name || 'طالب',
        amount: installment.amount || 0,
        dueDate,
        delayDays,
        bucket,
        installment,
        student,
      };
    })
    .filter(Boolean) as ReminderDashboardRow[];
}

export function computeReminderStats(rows: Pick<ReminderDashboardRow, 'bucket'>[]): {
  overdue: number;
  today: number;
  soon: number;
  later: number;
  autoEligible: number;
  restricted: number;
} {
  const base = {
    overdue: rows.filter((r) => r.bucket === 'overdue').length,
    today: rows.filter((r) => r.bucket === 'today').length,
    soon: rows.filter((r) => r.bucket === 'soon').length,
    later: rows.filter((r) => r.bucket === 'later').length,
  };
  const eligible = rows as EligibleTuitionReminderRow[];
  return {
    ...base,
    autoEligible: eligible.filter((r) => r.autoReminderEligible).length,
    restricted: eligible.filter((r) => r.isRestricted || r.escalationEligible).length,
  };
}

function parsePaymentCreatedAt(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Last tuition payment date for a student (anchor when payments exist). */
export function getLastTuitionPaymentDate(
  studentId: string,
  payments: TuitionPayment[],
): Date | null {
  let latest: Date | null = null;
  for (const payment of payments) {
    if (payment.studentId !== studentId) continue;
    if (payment.type && payment.type !== 'tuition') continue;
    const created = parsePaymentCreatedAt(payment.createdAt);
    if (!created) continue;
    if (!latest || created > latest) latest = created;
  }
  return latest;
}

/** Reminder timing anchor: last payment date, else installment due date. */
export function getReminderTimingAnchor(
  installment: Pick<TuitionInstallment, 'dueDate'>,
  payments: TuitionPayment[],
  studentId: string,
): Date {
  const lastPayment = getLastTuitionPaymentDate(studentId, payments);
  if (lastPayment) return lastPayment;
  return parseTuitionDueDate(installment.dueDate);
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** One current unpaid installment per student — earliest due first. */
export function pickCurrentUnpaidInstallmentsPerStudent(
  installments: TuitionInstallment[],
  now: Date = new Date(),
): TuitionInstallment[] {
  const byStudent = new Map<string, TuitionInstallment>();
  for (const inst of installments) {
    if (!isUnpaidInstallment(inst)) continue;
    if (inst.isDeleted) continue;
    const due = parseTuitionDueDate(inst.dueDate);
    if (!due.getTime() || Number.isNaN(due.getTime())) continue;

    const existing = byStudent.get(inst.studentId);
    if (!existing) {
      byStudent.set(inst.studentId, inst);
      continue;
    }
    const existingDue = parseTuitionDueDate(existing.dueDate);
    if (due < existingDue) {
      byStudent.set(inst.studentId, inst);
    }
  }
  return Array.from(byStudent.values());
}

function readTrackingSnapshot(
  tracking: Record<string, TuitionReminderTrackingSnapshot>,
  schoolId: string,
  studentId: string,
  installmentId: string,
): TuitionReminderTrackingSnapshot {
  const key = `${schoolId}_${studentId}_${installmentId}`;
  const fallback = `${schoolId}_${studentId}`;
  const raw = tracking[key] || tracking[fallback] || {};
  const last = raw.lastReminderAt;
  let lastDate: Date | null = null;
  if (last instanceof Date) lastDate = last;
  else if (last && typeof last === 'object' && 'toDate' in last) {
    lastDate = (last as { toDate: () => Date }).toDate();
  }
  return {
    reminderCount: raw.reminderCount || 0,
    lastReminderAt: lastDate,
    escalationLevel: raw.escalationLevel || 1,
    parentStatus: raw.parentStatus || 'active',
  };
}

function isParentRestricted(
  parentId: string | undefined,
  parents: Record<string, { privilegeRestrictions?: Record<string, unknown> }> | undefined,
  trackStatus: string,
): boolean {
  if (trackStatus === 'restricted') return true;
  if (!parentId || !parents) return false;
  const parent = parents[parentId];
  const restrictions = parent?.privilegeRestrictions;
  return Boolean(restrictions?.parentPrivilegesRestricted);
}

/**
 * Shared source of truth for tuition reminder rows (Overview + Tuition Reminders page).
 * Returns one row per student for the current unpaid installment only.
 */
export function getEligibleTuitionReminderRows(params: {
  students: TuitionStudent[];
  installments: TuitionInstallment[];
  payments: TuitionPayment[];
  settings: TuitionReminderEligibilityConfig;
  tracking: Record<string, TuitionReminderTrackingSnapshot>;
  schoolId: string;
  parents?: Record<string, { id?: string; privilegeRestrictions?: Record<string, unknown> }>;
  now?: Date;
}): EligibleTuitionReminderRow[] {
  const {
    students,
    installments,
    payments,
    settings,
    tracking,
    schoolId,
    parents,
    now = new Date(),
  } = params;

  const schoolInstallments = filterInstallmentsForSchool(installments, students, schoolId);
  const currentInstallments = pickCurrentUnpaidInstallmentsPerStudent(schoolInstallments, now);
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const rows: EligibleTuitionReminderRow[] = [];

  for (const installment of currentInstallments) {
    if (seen.has(installment.id)) continue;

    let student = studentMap.get(installment.studentId);
    if (!student) {
      student = students.find((s) => s.id === installment.studentId);
    }
    if (!student) continue;

    const bucket = classifyInstallmentReminderBucket(
      installment,
      settings.upcomingDays,
      now,
    );
    if (!bucket) continue;

    seen.add(installment.id);

    const dueDate = parseTuitionDueDate(installment.dueDate);
    const delayDays = bucket === 'overdue' ? computeInstallmentDelayDays(installment.dueDate, now) : 0;
    const track = readTrackingSnapshot(tracking, schoolId, installment.studentId, installment.id);
    const linked = resolveVerifiedLinkedParentSync(student, parents || {}, schoolId);
    const parentId = linked.parentId;
    const hasLinkedParent = linked.verified;
    const parentStatus = (track.parentStatus || 'active') as EligibleTuitionReminderRow['parentStatus'];

    const timingAnchor = getReminderTimingAnchor(installment, payments, installment.studentId);
    const daysSinceTimingAnchor = Math.max(0, daysBetween(timingAnchor, now));

    const daysSinceLastReminder = track.lastReminderAt
      ? daysBetween(track.lastReminderAt, now)
      : Number.POSITIVE_INFINITY;

    const autoReminderEligible =
      hasLinkedParent &&
      settings.autoRemindersEnabled &&
      (bucket === 'overdue' || bucket === 'today' || bucket === 'soon') &&
      daysSinceTimingAnchor >= settings.reminderStartAfterDays &&
      daysSinceLastReminder >= settings.reminderRepeatEveryDays;

    const escalationEligible =
      track.reminderCount >= settings.maxReminderCountBeforeWarning ||
      delayDays >= settings.restrictAfterDays;

    const isRestricted = isParentRestricted(parentId, parents, parentStatus);

    rows.push({
      installmentId: installment.id,
      studentId: installment.studentId,
      studentName: student.name || 'طالب',
      amount: installment.amount || 0,
      dueDate,
      delayDays,
      bucket,
      installment,
      student,
      autoReminderEligible,
      escalationEligible,
      isRestricted,
      hasLinkedParent,
      daysSinceTimingAnchor,
      timingAnchor,
      reminderCount: track.reminderCount || 0,
      lastReminderAt: track.lastReminderAt ?? null,
      escalationLevel: track.escalationLevel || 1,
      parentStatus,
    });
  }

  return rows.sort((a, b) => {
    const order: Record<ReminderBucket, number> = { overdue: 0, today: 1, soon: 2, later: 3 };
    const bucketDiff = order[a.bucket] - order[b.bucket];
    if (bucketDiff !== 0) return bucketDiff;
    return b.delayDays - a.delayDays;
  });
}

/** Rows ready for UI — unpaid installment + verified linked parent + actionable bucket. */
export function getDisplayableTuitionReminderRows(
  rows: EligibleTuitionReminderRow[],
): { displayRows: EligibleTuitionReminderRow[]; hiddenNoParent: number; hiddenLater: number } {
  const withParent = rows.filter((r) => r.hasLinkedParent);
  const hiddenNoParent = rows.length - withParent.length;
  const displayRows = withParent.filter((r) => r.bucket !== 'later');
  const hiddenLater = withParent.length - displayRows.length;
  return { displayRows, hiddenNoParent, hiddenLater };
}

export function filterTuitionReminderRows(
  rows: EligibleTuitionReminderRow[],
  filter: TuitionReminderFilterKey,
  search: string,
  parents: Record<string, { displayName?: string; name?: string; email?: string; phone?: string; phoneNumber?: string; mobile?: string }> = {},
): EligibleTuitionReminderRow[] {
  let list = rows;
  switch (filter) {
    case 'overdue':
      list = rows.filter((r) => r.bucket === 'overdue');
      break;
    case 'today':
      list = rows.filter((r) => r.bucket === 'today');
      break;
    case 'soon':
      list = rows.filter((r) => r.bucket === 'soon');
      break;
    case 'auto_eligible':
      list = rows.filter((r) => r.autoReminderEligible);
      break;
    case 'restricted':
      list = rows.filter((r) => r.isRestricted || r.escalationEligible);
      break;
    default:
      list = rows.filter((r) => r.bucket !== 'later' && r.hasLinkedParent);
      break;
  }

  const q = search.trim().toLowerCase();
  if (!q) return list;

  return list.filter((row) => {
    const student = row.student;
    const { parent } = resolveLinkedParentFromCache(student, parents);
    const parentName = String(parent?.displayName || parent?.name || '').toLowerCase();
    const parentEmail = String(student?.parentEmail || parent?.email || '').toLowerCase();
    const parentPhone = resolveParentPhone(student, parent);
    const className = String(student?.class || '').toLowerCase();
    const amountStr = String(row.amount);
    const statusLabel =
      row.bucket === 'overdue'
        ? `متأخر ${row.delayDays} يوم`
        : row.bucket === 'today'
          ? 'مستحق اليوم'
          : row.bucket;

    return (
      row.studentName.toLowerCase().includes(q) ||
      className.includes(q) ||
      parentName.includes(q) ||
      parentEmail.includes(q) ||
      parentPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      amountStr.includes(q) ||
      statusLabel.includes(q) ||
      row.bucket.includes(q)
    );
  });
}

export function enrichTuitionReminderDisplayRows(
  rows: EligibleTuitionReminderRow[],
  parents: Record<string, { id?: string; displayName?: string; name?: string; email?: string; phone?: string; phoneNumber?: string; mobile?: string }>,
): TuitionReminderDisplayRow[] {
  return rows.map((row) => {
    const { parentId, parent } = resolveVerifiedLinkedParentSync(row.student, parents, row.student?.schoolId);
    const parentPhone = resolveParentPhone(row.student, parent);
    const hasWhatsApp = isValidWhatsAppPhone(parentPhone);
    const parentEmail = String(row.student?.parentEmail || parent?.email || '').trim();
    const className = String(row.student?.class || '—');

    let statusLabel = row.bucket === 'overdue' ? `متأخر ${row.delayDays} يوم` : '';
    if (row.bucket === 'today') statusLabel = 'مستحق اليوم';
    if (row.bucket === 'soon') statusLabel = 'قريباً';
    if (row.bucket === 'later') statusLabel = 'لاحقاً';
    if (row.autoReminderEligible) statusLabel += ' · مؤهل تلقائي';
    if (row.isRestricted) statusLabel += ' · مقيّد';

    return {
      ...row,
      className,
      parentName: parent?.displayName || parent?.name || '—',
      parentEmail,
      parentPhone,
      parentId,
      hasWhatsApp,
      linkedParentLabel: parentId ? 'مرتبط' : 'لا يوجد ولي أمر مرتبط',
      whatsAppLabel: hasWhatsApp ? 'متاح' : 'لا يوجد رقم واتساب',
      statusLabel: statusLabel.trim(),
    };
  });
}

export function formatTuitionDueLabel(dueDate: unknown): string {
  if (!dueDate) return 'غير محدد';
  return parseTuitionDueDate(dueDate).toLocaleDateString('ar-IQ');
}

export function formatTuitionAmountLabel(amount?: number): string {
  return (amount ?? 0).toLocaleString('ar-IQ');
}

export function buildTuitionReminderPayload(
  student: { id: string; name?: string; schoolId?: string },
  installment: { id?: string; amount?: number; dueDate?: unknown },
  adminUid: string,
  schoolId: string,
  message: string,
) {
  return {
    title: 'تنبيه قسط دراسي',
    message,
    type: 'tuition' as const,
    schoolId,
    senderId: adminUid,
    metadata: {
      source: 'tuition',
      routeTarget: 'tuition',
      studentId: student.id,
      installmentId: installment.id,
      schoolId,
      sourceId: installment.id || `${student.id}-tuition-reminder`,
    },
  };
}

export function resolveParentPhone(
  student?: Pick<TuitionStudent, 'parentPhone' | 'guardianPhone'> | null,
  parent?: { phone?: string; phoneNumber?: string; mobile?: string } | null,
): string {
  return String(
    student?.parentPhone ||
      student?.guardianPhone ||
      parent?.phone ||
      parent?.phoneNumber ||
      parent?.mobile ||
      '',
  ).trim();
}

export function isValidWhatsAppPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 9;
}

export type TuitionParentRecord = {
  id?: string;
  email?: string;
  displayName?: string;
  name?: string;
  role?: string;
  schoolId?: string;
  phone?: string;
  phoneNumber?: string;
  mobile?: string;
};

/** Sync parent resolution — mirrors schoolSync.fetchStudentLinkFields + users/{parentId} verify. */
export function resolveVerifiedLinkedParentSync(
  student: Pick<TuitionStudent, 'parentIds' | 'parentEmail'> | null | undefined,
  parents: Record<string, TuitionParentRecord>,
  schoolId?: string,
): { parentId?: string; parent: TuitionParentRecord | null; verified: boolean } {
  if (!student) return { parentId: undefined, parent: null, verified: false };

  const ids = Array.isArray(student.parentIds)
    ? student.parentIds.filter((id): id is string => Boolean(id))
    : [];

  const isValidParent = (parent: TuitionParentRecord, id: string) => {
    const role = String(parent.role || 'parent').toLowerCase();
    if (role !== 'parent') return false;
    if (schoolId && parent.schoolId && parent.schoolId !== schoolId) return false;
    return parent.id === id || !parent.id;
  };

  for (const id of ids) {
    const direct = parents[id];
    if (direct && isValidParent(direct, id)) {
      return { parentId: id, parent: { ...direct, id: direct.id || id }, verified: true };
    }
    const found = Object.values(parents).find((p) => p.id === id || (parents[id] === undefined && p.id === id));
    if (found && isValidParent(found, id)) {
      return { parentId: id, parent: found, verified: true };
    }
  }

  const email = String(student.parentEmail || '').toLowerCase().trim();
  if (email) {
    for (const parent of Object.values(parents)) {
      if (String(parent.email || '').toLowerCase().trim() !== email) continue;
      if (schoolId && parent.schoolId && parent.schoolId !== schoolId) continue;
      const role = String(parent.role || 'parent').toLowerCase();
      if (role !== 'parent') continue;
      const parentId = parent.id || undefined;
      if (parentId) {
        return { parentId, parent, verified: true };
      }
    }
  }

  return { parentId: undefined, parent: null, verified: false };
}

/** @deprecated use resolveVerifiedLinkedParentSync */
export function resolveLinkedParentFromCache(
  student: Pick<TuitionStudent, 'parentIds' | 'parentEmail'> | null | undefined,
  parents: Record<string, TuitionParentRecord>,
): { parentId?: string; parent: TuitionParentRecord | null } {
  const resolved = resolveVerifiedLinkedParentSync(student, parents);
  return { parentId: resolved.parentId, parent: resolved.parent };
}

/** Same Firestore queries used by Tuition.tsx */
export function tuitionStudentsQuery(schoolId: string) {
  return query(collection(db, 'students'), where('schoolId', '==', schoolId), limit(1000));
}

export function tuitionInstallmentsQuery(schoolId: string) {
  return query(collection(db, 'installments'), where('schoolId', '==', schoolId), limit(500));
}

export function tuitionPaymentsQuery(schoolId: string) {
  return query(
    collection(db, 'payments'),
    where('schoolId', '==', schoolId),
    orderBy('createdAt', 'desc'),
    limit(500),
  );
}

export function tuitionParentsQuery(schoolId: string) {
  return query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', '==', 'parent'),
  );
}

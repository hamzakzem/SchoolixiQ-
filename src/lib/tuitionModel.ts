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

/** Tuition.tsx unpaid filter: status !== 'paid' */
export function isUnpaidInstallment(installment: Pick<TuitionInstallment, 'status'>): boolean {
  return installment.status !== 'paid';
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
} {
  return {
    overdue: rows.filter((r) => r.bucket === 'overdue').length,
    today: rows.filter((r) => r.bucket === 'today').length,
    soon: rows.filter((r) => r.bucket === 'soon').length,
    later: rows.filter((r) => r.bucket === 'later').length,
  };
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

export function resolveLinkedParentFromCache(
  student: Pick<TuitionStudent, 'parentIds' | 'parentEmail'> | null | undefined,
  parents: Record<string, { id?: string; email?: string; displayName?: string; name?: string }>,
): { parentId?: string; parent: (typeof parents)[string] | null } {
  const ids = Array.isArray(student?.parentIds) ? student.parentIds : [];
  for (const id of ids) {
    const parent = parents[id];
    if (parent) return { parentId: id, parent };
  }
  const email = String(student?.parentEmail || '').toLowerCase();
  if (email) {
    for (const parent of Object.values(parents)) {
      if (String(parent.email || '').toLowerCase() === email) {
        return { parentId: parent.id, parent };
      }
    }
  }
  return { parentId: undefined, parent: null };
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
    limit(100),
  );
}

export function tuitionParentsQuery(schoolId: string) {
  return query(
    collection(db, 'users'),
    where('schoolId', '==', schoolId),
    where('role', '==', 'parent'),
  );
}

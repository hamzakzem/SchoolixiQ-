import {
  classifyInstallmentReminderBucket,
  filterInstallmentsForSchool,
  getStudentRemainingBalance,
  isUnpaidInstallment,
  isValidWhatsAppPhone,
  parseTuitionDueDate,
  pickCurrentUnpaidInstallmentsPerStudent,
  resolveParentPhone,
  resolveVerifiedLinkedParentSync,
  toEligibilityConfigFromSettings,
  type EligibleTuitionReminderRow,
  type TuitionInstallment,
  type TuitionPayment,
  type TuitionReminderTrackingSnapshot,
  type TuitionStudent,
} from './tuitionModel';
import type { TuitionReminderSettings } from './tuitionReminderService';

export type TuitionReminderEmptyReason =
  | 'no_installments'
  | 'no_unpaid_installments'
  | 'unpaid_no_linked_parents'
  | 'unpaid_all_later'
  | 'query_failed'
  | 'parent_query_empty'
  | 'filter_no_match'
  | 'none';

export type TuitionReminderExclusionReason =
  | 'included'
  | 'paid'
  | 'deleted'
  | 'invalid_date'
  | 'no_student_match'
  | 'wrong_school'
  | 'no_bucket'
  | 'bucket_later'
  | 'no_parent_ids'
  | 'parent_not_in_cache'
  | 'parent_role_mismatch'
  | 'parent_school_mismatch'
  | 'parent_email_no_match'
  | 'no_linked_parent'
  | 'filtered_by_tab'
  | 'not_in_current_pick';

export type TuitionReminderDebugRow = {
  installmentId: string;
  studentId: string;
  studentName: string;
  hasParentIds: boolean;
  parentIds: string[];
  parentEmail: string;
  matchingParentFound: boolean;
  installmentSchoolId?: string;
  status?: string;
  amount?: number;
  dueDateRaw: unknown;
  parsedDueDate: string | null;
  bucket: string | null;
  reasonExcluded: TuitionReminderExclusionReason;
  displayStatus: 'linked_parent_found' | 'no_parent_linked' | 'invalid_phone' | 'not_eligible' | 'shown';
  parentPhone: string;
};

export type TuitionReminderDataCounts = {
  schoolId: string;
  studentsCount: number;
  installmentsCount: number;
  paymentsCount: number;
  parentsCount: number;
  studentsWithParentIds: number;
  studentsWithParentEmail: number;
  studentsWithRemainingDebt: number;
  unpaidInstallments: number;
  unpaidInstallmentsWithStudentMatch: number;
  legacyInstallmentsWithoutSchoolId: number;
  installmentsExcludedBySchoolIdQuery: string;
  rowsBeforeParentFilter: number;
  rowsAfterParentFilter: number;
  rowsByBucket: { overdue: number; today: number; soon: number; later: number };
  hiddenNoParent: number;
  hiddenPaid: number;
  hiddenInvalidDate: number;
  hiddenFutureNotEligible: number;
  hiddenNoInstallment: number;
  hiddenNoPhone: number;
  hiddenNoParentAccount: number;
  filteredDisplayCount: number;
  queryErrors: Record<string, string>;
};

export type TuitionReminderDiagnostics = {
  counts: TuitionReminderDataCounts;
  exclusions: TuitionReminderDebugRow[];
  emptyReason: TuitionReminderEmptyReason;
  debugRows: TuitionReminderDebugRow[];
};

function diagnoseParentLinkFailure(
  student: TuitionStudent,
  parents: Record<string, any>,
  schoolId: string,
): TuitionReminderExclusionReason {
  const ids = Array.isArray(student.parentIds)
    ? student.parentIds.filter((id): id is string => Boolean(id))
    : [];

  if (ids.length === 0 && !String(student.parentEmail || '').trim()) {
    return 'no_parent_ids';
  }

  for (const id of ids) {
    const direct = parents[id];
    if (!direct) {
      const found = Object.values(parents).find((p) => p.id === id);
      if (!found) return 'parent_not_in_cache';
      const role = String(found.role || 'parent').toLowerCase();
      if (role !== 'parent') return 'parent_role_mismatch';
      if (schoolId && found.schoolId && found.schoolId !== schoolId) return 'parent_school_mismatch';
      continue;
    }
    const role = String(direct.role || 'parent').toLowerCase();
    if (role !== 'parent') return 'parent_role_mismatch';
    if (schoolId && direct.schoolId && direct.schoolId !== schoolId) return 'parent_school_mismatch';
  }

  const email = String(student.parentEmail || '').toLowerCase().trim();
  if (email) {
    const emailMatch = Object.values(parents).some(
      (p) =>
        String(p.email || '').toLowerCase().trim() === email &&
        String(p.role || 'parent').toLowerCase() === 'parent',
    );
    if (!emailMatch && ids.length === 0) return 'parent_email_no_match';
  }

  return 'no_linked_parent';
}

function buildDebugRow(
  installment: TuitionInstallment,
  student: TuitionStudent | undefined,
  parents: Record<string, any>,
  schoolId: string,
  upcomingDays: number,
  reasonExcluded: TuitionReminderExclusionReason,
  now: Date,
): TuitionReminderDebugRow {
  const parsed = parseTuitionDueDate(installment.dueDate);
  const parsedValid = parsed.getTime() > 0 && !Number.isNaN(parsed.getTime());
  const bucket = parsedValid
    ? classifyInstallmentReminderBucket(installment, upcomingDays, now)
    : null;

  const linked = student
    ? resolveVerifiedLinkedParentSync(student, parents, schoolId)
    : { verified: false, parentId: undefined, parent: null };

  const parentPhone = student ? resolveParentPhone(student, linked.parent) : '';
  const hasPhone = isValidWhatsAppPhone(parentPhone);

  let displayStatus: TuitionReminderDebugRow['displayStatus'] = 'not_eligible';
  if (reasonExcluded === 'included') {
    displayStatus = 'shown';
  } else if (linked.verified) {
    displayStatus = hasPhone ? 'linked_parent_found' : 'invalid_phone';
  } else if (
    reasonExcluded === 'no_parent_ids' ||
    reasonExcluded === 'parent_not_in_cache' ||
    reasonExcluded === 'no_linked_parent' ||
    reasonExcluded === 'parent_email_no_match'
  ) {
    displayStatus = 'no_parent_linked';
  }

  return {
    installmentId: installment.id,
    studentId: installment.studentId,
    studentName: student?.name || '(unknown)',
    hasParentIds: Boolean(student?.parentIds?.length),
    parentIds: student?.parentIds || [],
    parentEmail: student?.parentEmail || '',
    matchingParentFound: linked.verified,
    installmentSchoolId: installment.schoolId,
    status: installment.status,
    amount: installment.amount,
    dueDateRaw: installment.dueDate,
    parsedDueDate: parsedValid ? parsed.toISOString() : null,
    bucket,
    reasonExcluded,
    displayStatus,
    parentPhone,
  };
}

export function runTuitionReminderDiagnostics(params: {
  students: TuitionStudent[];
  installments: TuitionInstallment[];
  payments: TuitionPayment[];
  settings: TuitionReminderSettings;
  tracking: Record<string, TuitionReminderTrackingSnapshot>;
  parents: Record<string, any>;
  schoolId: string;
  eligibleRows: EligibleTuitionReminderRow[];
  displayableRows: EligibleTuitionReminderRow[];
  filteredRows: EligibleTuitionReminderRow[];
  hiddenNoParent: number;
  hiddenLater: number;
  filter: string;
  queryErrors?: Record<string, string>;
  logContext?: string;
}): TuitionReminderDiagnostics {
  const {
    students,
    installments,
    payments,
    settings,
    parents,
    schoolId,
    eligibleRows,
    displayableRows,
    filteredRows,
    hiddenNoParent,
    hiddenLater,
    filter,
    queryErrors = {},
    logContext = 'sync',
  } = params;

  const now = new Date();
  const eligibility = toEligibilityConfigFromSettings(settings);
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const unpaidAll = installments.filter((i) => !i.isDeleted && isUnpaidInstallment(i));
  let hiddenPaid = installments.filter((i) => !i.isDeleted && !isUnpaidInstallment(i)).length;
  let hiddenInvalidDate = 0;

  for (const inst of unpaidAll) {
    const due = parseTuitionDueDate(inst.dueDate);
    if (!due.getTime() || Number.isNaN(due.getTime())) hiddenInvalidDate++;
  }

  const schoolInstallments = filterInstallmentsForSchool(installments, students, schoolId);
  const currentUnpaid = pickCurrentUnpaidInstallmentsPerStudent(schoolInstallments, now);
  const currentUnpaidIds = new Set(currentUnpaid.map((i) => i.id));

  const studentsWithDebt = students.filter((s) => getStudentRemainingBalance(s) > 0);
  const studentsWithDebtNoInstallment = studentsWithDebt.filter(
    (s) => !unpaidAll.some((i) => i.studentId === s.id),
  ).length;

  const rowsByBucket = {
    overdue: eligibleRows.filter((r) => r.bucket === 'overdue').length,
    today: eligibleRows.filter((r) => r.bucket === 'today').length,
    soon: eligibleRows.filter((r) => r.bucket === 'soon').length,
    later: eligibleRows.filter((r) => r.bucket === 'later').length,
  };

  const displayableIds = new Set(displayableRows.map((r) => r.installmentId));
  const filteredIds = new Set(filteredRows.map((r) => r.installmentId));

  let hiddenNoPhone = 0;
  let hiddenNoParentAccount = 0;
  for (const row of displayableRows) {
    const phone = resolveParentPhone(row.student, parents[row.parentId || '']);
    if (!isValidWhatsAppPhone(phone)) hiddenNoPhone++;
  }
  hiddenNoParentAccount = hiddenNoParent;

  const counts: TuitionReminderDataCounts = {
    schoolId,
    studentsCount: students.length,
    installmentsCount: installments.length,
    paymentsCount: payments.length,
    parentsCount: Object.keys(parents).length,
    studentsWithParentIds: students.filter((s) => (s.parentIds?.length ?? 0) > 0).length,
    studentsWithParentEmail: students.filter((s) => Boolean(String(s.parentEmail || '').trim())).length,
    studentsWithRemainingDebt: studentsWithDebt.length,
    unpaidInstallments: unpaidAll.length,
    unpaidInstallmentsWithStudentMatch: unpaidAll.filter((i) => studentMap.has(i.studentId)).length,
    legacyInstallmentsWithoutSchoolId: installments.filter((i) => !i.schoolId).length,
    installmentsExcludedBySchoolIdQuery:
      'Firestore query uses where(schoolId==schoolId) — installments missing schoolId are NOT loaded',
    rowsBeforeParentFilter: eligibleRows.length,
    rowsAfterParentFilter: displayableRows.length,
    rowsByBucket,
    hiddenNoParent,
    hiddenPaid,
    hiddenInvalidDate,
    hiddenFutureNotEligible: hiddenLater,
    hiddenNoInstallment: studentsWithDebtNoInstallment,
    hiddenNoPhone,
    hiddenNoParentAccount,
    filteredDisplayCount: filteredRows.length,
    queryErrors,
  };

  const debugRows: TuitionReminderDebugRow[] = [];
  const exclusions: TuitionReminderDebugRow[] = [];

  const sampleInstallments = [...unpaidAll]
    .sort((a, b) => a.studentId.localeCompare(b.studentId))
    .slice(0, 20);

  for (const installment of sampleInstallments) {
    const student = studentMap.get(installment.studentId);
    let reason: TuitionReminderExclusionReason = 'included';

    if (installment.isDeleted) {
      reason = 'deleted';
    } else if (!isUnpaidInstallment(installment)) {
      reason = 'paid';
    } else {
      const due = parseTuitionDueDate(installment.dueDate);
      if (!due.getTime() || Number.isNaN(due.getTime())) {
        reason = 'invalid_date';
      } else if (!student) {
        reason = 'no_student_match';
      } else if (!schoolInstallments.some((i) => i.id === installment.id)) {
        reason = 'wrong_school';
      } else if (!currentUnpaidIds.has(installment.id)) {
        reason = 'not_in_current_pick';
      } else {
        const bucket = classifyInstallmentReminderBucket(installment, eligibility.upcomingDays, now);
        if (!bucket) {
          reason = 'no_bucket';
        } else if (bucket === 'later') {
          reason = 'bucket_later';
        } else {
          const linked = resolveVerifiedLinkedParentSync(student, parents, schoolId);
          if (!linked.verified) {
            reason = diagnoseParentLinkFailure(student, parents, schoolId);
          } else if (displayableIds.has(installment.id) && !filteredIds.has(installment.id)) {
            reason = 'filtered_by_tab';
          } else {
            reason = 'included';
          }
        }
      }
    }

    const row = buildDebugRow(
      installment,
      student,
      parents,
      schoolId,
      eligibility.upcomingDays,
      reason,
      now,
    );
    exclusions.push(row);
    console.info('[TuitionReminderDebug] EXCLUSION_REASON', {
      context: logContext,
      ...row,
    });
  }

  for (const inst of unpaidAll) {
    const student = studentMap.get(inst.studentId);
    const due = parseTuitionDueDate(inst.dueDate);
    if (!due.getTime() || Number.isNaN(due.getTime())) continue;
    if (!student) continue;

    const inSchool = schoolInstallments.some((i) => i.id === inst.id);
    if (!inSchool) {
      debugRows.push(
        buildDebugRow(inst, student, parents, schoolId, eligibility.upcomingDays, 'wrong_school', now),
      );
      continue;
    }

    const bucket = classifyInstallmentReminderBucket(inst, eligibility.upcomingDays, now);
    const linked = resolveVerifiedLinkedParentSync(student, parents, schoolId);
    let reason: TuitionReminderExclusionReason = 'included';
    if (!currentUnpaidIds.has(inst.id)) reason = 'not_in_current_pick';
    else if (!bucket) reason = 'no_bucket';
    else if (!linked.verified) reason = diagnoseParentLinkFailure(student, parents, schoolId);

    debugRows.push(
      buildDebugRow(inst, student, parents, schoolId, eligibility.upcomingDays, reason, now),
    );
  }

  let emptyReason: TuitionReminderEmptyReason = 'none';
  const hasQueryError = Object.keys(queryErrors).length > 0;

  if (hasQueryError) {
    emptyReason = 'query_failed';
  } else if (installments.length === 0) {
    emptyReason = 'no_installments';
  } else if (unpaidAll.length === 0) {
    emptyReason = 'no_unpaid_installments';
  } else if (Object.keys(parents).length === 0 && students.some((s) => (s.parentIds?.length ?? 0) > 0 || s.parentEmail)) {
    emptyReason = 'parent_query_empty';
  } else if (eligibleRows.length > 0 && displayableRows.length === 0 && hiddenNoParent > 0) {
    emptyReason = 'unpaid_no_linked_parents';
  } else if (eligibleRows.length > 0 && displayableRows.length === 0 && hiddenLater === eligibleRows.length) {
    emptyReason = 'unpaid_all_later';
  } else if (displayableRows.length > 0 && filteredRows.length === 0 && filter !== 'all') {
    emptyReason = 'filter_no_match';
  } else if (filteredRows.length === 0 && displayableRows.length === 0 && eligibleRows.length === 0 && unpaidAll.length > 0) {
    if (hiddenInvalidDate === unpaidAll.length) {
      emptyReason = 'no_unpaid_installments';
    } else if (studentsWithDebtNoInstallment > 0 && unpaidAll.length === 0) {
      emptyReason = 'no_installments';
    } else {
      emptyReason = 'unpaid_no_linked_parents';
    }
  }

  console.info('[TuitionReminderDebug] DATA_COUNTS', {
    context: logContext,
    ...counts,
  });

  return { counts, exclusions, emptyReason, debugRows };
}

export function formatTuitionReminderEmptyReason(
  reason: TuitionReminderEmptyReason,
  counts: TuitionReminderDataCounts,
): string {
  switch (reason) {
    case 'no_installments':
      return `لا توجد أقساط محمّلة (${counts.installmentsCount} من الاستعلام). ${counts.studentsWithRemainingDebt} طالب لديهم رصيد متبقٍ — قد تكون الأقساط بدون schoolId ولا تُحمّل من Firestore.`;
    case 'no_unpaid_installments':
      return `جميع الأقساط المحمّلة مدفوعة (${counts.hiddenPaid} مدفوعة، ${counts.hiddenInvalidDate} بتاريخ غير صالح).`;
    case 'unpaid_no_linked_parents':
      return `${counts.unpaidInstallments} قسط غير مدفوع — ${counts.hiddenNoParent} بدون ولي أمر مرتبط في users (${counts.parentsCount} ولي أمر محمّل، ${counts.studentsWithParentIds} طالب لديه parentIds).`;
    case 'unpaid_all_later':
      return `${counts.rowsByBucket.later} قسط في bucket «لاحقاً» — لا يُعرض في القائمة الافتراضية.`;
    case 'query_failed':
      return `فشل استعلام Firestore: ${Object.entries(counts.queryErrors).map(([k, v]) => `${k}: ${v}`).join(' · ')}`;
    case 'parent_query_empty':
      return `استعلام users (role=parent) أعاد 0 — بينما ${counts.studentsWithParentIds} طالب لديه parentIds. تحقق من schoolId/role في users.`;
    case 'filter_no_match':
      return 'لا توجد نتائج مطابقة للفلتر أو البحث الحالي.';
    case 'none':
      return '';
    default:
      return 'لا توجد صفوف للعرض.';
  }
}

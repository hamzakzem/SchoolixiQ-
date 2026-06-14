import type { EligibleTuitionReminderRow, ReminderBucket } from './tuitionModel';

/** Arabic bucket / payment timing label for school-facing UI */
export function getTuitionBucketLabel(
  bucket: ReminderBucket,
  delayDays = 0,
): string {
  switch (bucket) {
    case 'overdue':
      return delayDays > 0 ? `متأخر ${delayDays} يوم` : 'متأخر';
    case 'today':
      return 'مستحق اليوم';
    case 'soon':
      return 'قريباً';
    case 'later':
      return 'لاحقاً';
    default:
      return 'غير مدفوع';
  }
}

export function getTuitionPaymentStatusLabel(row: Pick<EligibleTuitionReminderRow, 'bucket' | 'delayDays' | 'hasLinkedParent'>): string {
  const bucketLabel = getTuitionBucketLabel(row.bucket, row.delayDays);
  if (!row.hasLinkedParent) {
    return `${bucketLabel} · بدون ولي أمر`;
  }
  return bucketLabel;
}

export function getLinkedParentLabel(hasLinkedParent: boolean): string {
  return hasLinkedParent ? 'ولي أمر مرتبط' : 'لا يوجد ولي أمر مرتبط';
}

export function getSendStatusLabel(hasLinkedParent: boolean): string {
  return hasLinkedParent ? 'جاهز للإرسال' : 'لا يمكن إرسال إشعار حساب';
}

export function getWhatsAppLabel(hasWhatsApp: boolean): string {
  return hasWhatsApp ? 'واتساب: يتطلب فتح الرابط يدوياً' : 'لا يوجد رقم واتساب';
}

export function getActionHint(hasLinkedParent: boolean, hasWhatsApp: boolean): string {
  if (!hasLinkedParent && hasWhatsApp) {
    return 'واتساب فقط — لا يوجد حساب ولي أمر مرتبط';
  }
  if (!hasWhatsApp && !hasLinkedParent) {
    return 'لا يوجد رقم واتساب';
  }
  if (!hasWhatsApp && hasLinkedParent) {
    return 'إشعار حساب ولي الأمر متاح — لا يوجد رقم واتساب';
  }
  return '';
}

export function getAutoReminderNote(autoEligible: boolean): string {
  if (!autoEligible) return '';
  return 'إشعار حساب ولي الأمر: تلقائي';
}

export type DashboardReminderCounts = {
  total: number;
  dueNow: number;
  soon: number;
  later: number;
  noParent: number;
};

export function computeDashboardReminderCounts(
  rows: EligibleTuitionReminderRow[],
): DashboardReminderCounts {
  return {
    total: rows.length,
    dueNow: rows.filter((r) => r.bucket === 'overdue' || r.bucket === 'today').length,
    soon: rows.filter((r) => r.bucket === 'soon').length,
    later: rows.filter((r) => r.bucket === 'later').length,
    noParent: rows.filter((r) => !r.hasLinkedParent).length,
  };
}

export const TUITION_REMINDER_EMPTY_MESSAGES = {
  noRows: 'لا توجد أقساط غير مدفوعة حالياً.',
  searchNoMatch: 'لا توجد نتائج مطابقة للبحث أو الفلتر.',
  allLaterDashboard:
    'الأقساط الموجودة حالياً لاحقة وليست متأخرة. سيبدأ التذكير عند اقتراب تاريخ الاستحقاق حسب إعدادات المدرسة.',
  allLaterOverview:
    'لا توجد أقساط مستحقة للتنبيه الآن. توجد أقساط لاحقة يمكنك متابعتها من صفحة تذكير الأقساط.',
  noParentsWarning:
    'تم العثور على أقساط، لكن لم يتم العثور على حسابات أولياء الأمور المرتبطة.',
} as const;

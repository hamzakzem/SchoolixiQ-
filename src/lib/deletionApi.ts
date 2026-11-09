import { auth } from './firebase';
import { ensureBackendApiBaseUrl, getApiUrl } from './apiUtils';

/** Server-side deletion (authorisation, school isolation, cascade, trash and audit live on the server). */
export type DeletableCollection =
  | 'students' | 'classes' | 'subjects' | 'homework' | 'teacher_reports' | 'advanced_reports'
  | 'behavior_reports' | 'behavior' | 'grades' | 'attendance' | 'announcements' | 'installments'
  | 'payments' | 'payroll' | 'inventory' | 'market' | 'marketplace' | 'orders' | 'id_cards'
  | 'student_archives' | 'users' | 'distributors' | 'registrations' | 'subscriptionRequests'
  | 'assistant_categories' | 'assistant_flows' | 'assistant_answers' | 'assistant_keywords';

export const PERMANENT_CONFIRM_TEXT = 'حذف نهائي';

export type DeleteResult = { id: string; ok: boolean; bundleId?: string; code?: string; message?: string; partial?: boolean };

export class DeletionError extends Error {
  code: string;
  results?: DeleteResult[];
  constructor(message: string, code = 'ERROR', results?: DeleteResult[]) {
    super(message);
    this.code = code;
    this.results = results;
  }
}

const FRIENDLY: Record<string, string> = {
  FORBIDDEN_SCHOOL: 'لا يمكنك حذف بيانات مدرسة أخرى',
  FORBIDDEN_ROLE: 'ليست لديك صلاحية حذف هذا السجل',
  FORBIDDEN_PERMISSION: 'ليست لديك صلاحية حذف هذا النوع من السجلات',
  FORBIDDEN_PERMANENT: 'الحذف النهائي لمدير المدرسة فقط',
  FORBIDDEN_PRIVILEGED: 'لا يمكن حذف هذا الحساب',
  FORBIDDEN_RANK: 'لا يمكنك حذف حساب بصلاحيات مساوية أو أعلى',
  HAS_DEPENDENTS: 'لا يمكن الحذف: توجد سجلات مرتبطة. انقلها أو احذفها أولاً',
  NOT_FOUND: 'السجل غير موجود أو حُذف مسبقاً',
  ADMIN_UNAVAILABLE: 'خدمة الحذف غير متاحة حالياً. لم يتم حذف أي بيانات',
};

export function deletionMessage(code?: string, fallback?: string): string {
  return (code && FRIENDLY[code]) || fallback || 'تعذّر تنفيذ الحذف';
}

async function call(path: string, body: Record<string, unknown>) {
  await ensureBackendApiBaseUrl();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new DeletionError('يرجى تسجيل الدخول أولاً', 'UNAUTHENTICATED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch(getApiUrl(path), {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new DeletionError(deletionMessage(data.error, data.message), data.error || 'ERROR');
    return data;
  } catch (e) {
    if (e instanceof DeletionError) throw e;
    if ((e as { name?: string })?.name === 'AbortError') throw new DeletionError('انتهت مهلة الاتصال. تحقق من العملية ثم أعد المحاولة', 'TIMEOUT');
    throw new DeletionError('تعذّر الاتصال بالخادم. لم يتم حذف أي بيانات', 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
}

/** Delete (to trash by default). Resolves with per-record results; throws only on transport/validation errors. */
export async function deleteRecordsRaw(input: {
  collection: DeletableCollection;
  ids: string[];
  mode?: 'trash' | 'permanent';
  confirmBulk?: boolean;
  confirmText?: string;
}): Promise<{ ok: boolean; results: DeleteResult[] }> {
  const ids = [...new Set(input.ids)].filter(Boolean);
  return call('/api/records/delete', { ...input, ids, confirmBulk: input.confirmBulk ?? ids.length > 1 });
}

/** Same, but throws a DeletionError (with the real reason) when any record could not be deleted. */
export async function deleteRecords(input: Parameters<typeof deleteRecordsRaw>[0]): Promise<DeleteResult[]> {
  const out = await deleteRecordsRaw(input);
  const failed = out.results.filter((r) => !r.ok);
  if (failed.length) {
    const first = failed[0];
    const msg = failed.length === out.results.length || failed.length === 1
      ? deletionMessage(first.code, first.message)
      : `تعذّر حذف ${failed.length} من ${out.results.length} سجل: ${deletionMessage(first.code, first.message)}`;
    throw new DeletionError(msg, first.code || 'ERROR', out.results);
  }
  return out.results;
}

export const deleteRecord = (collection: DeletableCollection, id: string, mode: 'trash' | 'permanent' = 'trash', confirmText?: string) =>
  deleteRecords({ collection, ids: [id], mode, confirmText });

export const restoreFromTrash = (bundleId: string) => call('/api/records/restore', { bundleId });
export const purgeFromTrash = (bundleId: string, confirmText: string) => call('/api/records/purge', { bundleId, confirmText });
export const resumeDeletions = () => call('/api/records/resume', {});

/** Best message to show a user for a failed delete (real server reason when available). */
export function deleteErrorMessage(e: unknown, fallback: string): string {
  return e instanceof DeletionError && e.message ? e.message : fallback;
}

/** Cancel a payment keeping its record (amount, date, receipt, collector) — payments are never deleted. */
export const voidPayment = (paymentId: string, reason: string) => call('/api/records/void-payment', { paymentId, reason });

/** Delete the caller's own notifications (server checks ownership/school). */
export async function deleteNotificationsApi(ids: string[]): Promise<number> {
  const out = await call('/api/records/delete-notifications', { ids: [...new Set(ids)].slice(0, 100) });
  return Number(out.deleted || 0);
}

/** After a payment was cancelled and the ledger needed manual review: confirm it was reviewed. */
export const resolveFinancialReview = (studentId: string, note: string) => call('/api/records/resolve-financial-review', { studentId, note });

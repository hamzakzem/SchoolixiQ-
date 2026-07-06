const INVALID_SCHOOL_ID_TOKENS = new Set([
  '',
  '_',
  'n/a',
  'na',
  'null',
  'undefined',
  'none',
]);

export function isValidSchoolId(value: unknown): value is string {
  if (value == null) return false;
  const id = String(value).trim();
  if (!id) return false;
  if (INVALID_SCHOOL_ID_TOKENS.has(id.toLowerCase())) return false;
  return true;
}

export function normalizeSchoolId(value: unknown): string | null {
  if (!isValidSchoolId(value)) return null;
  return String(value).trim();
}

export const ASSISTANT_SCHOOL_LINK_ERROR_AR =
  'حساب المساعد غير مربوط بمدرسة. يرجى مراجعة الإدارة.';

export const SCHOOL_BOUND_ROLES = new Set([
  'admin',
  'school_admin',
  'staff',
  'teacher',
  'assistant',
  'guard',
]);

export function roleRequiresSchoolBootstrap(role: unknown): boolean {
  if (role == null) return false;
  return SCHOOL_BOUND_ROLES.has(String(role).toLowerCase().trim());
}

/** Result of resolving schools/{schoolId} for school-bound roles */
export type SchoolContextStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unlinked'
  | 'not_found'
  | 'permission_denied';

export function isAssistantRole(role: unknown): boolean {
  return String(role ?? '').toLowerCase().trim() === 'assistant';
}

export function isFirestorePermissionDenied(error: unknown): boolean {
  const code = (error as { code?: string })?.code ?? '';
  const message = String((error as { message?: string })?.message ?? '');
  return code === 'permission-denied' || /permission-denied/i.test(message);
}

export const ASSISTANT_SCHOOL_NOT_FOUND_AR =
  'لا يمكن العثور على المدرسة المرتبطة بهذا الحساب';

export const ASSISTANT_SCHOOL_PERMISSION_AR =
  'لا توجد صلاحية للوصول إلى هذه المدرسة';

export const ASSISTANT_SCHOOL_LINKING_AR = 'جاري ربط الحساب بالمدرسة...';

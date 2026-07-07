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

/**
 * SSOT: users/{uid}.schoolId — with read-only legacy field fallbacks (no Firestore writes).
 * Ignores Firebase Auth custom claims.
 */
export function resolveProfileSchoolId(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;

  const tryNormalize = (value: unknown): string | null => {
    if (value == null) return null;
    if (typeof value === 'object') {
      const refLike = value as { id?: unknown; path?: unknown };
      if (typeof refLike.id === 'string') {
        const fromId = normalizeSchoolId(refLike.id);
        if (fromId) return fromId;
      }
      if (typeof refLike.path === 'string') {
        const segment = refLike.path.split('/').filter(Boolean).pop();
        const fromPath = normalizeSchoolId(segment);
        if (fromPath) return fromPath;
      }
    }
    return normalizeSchoolId(value);
  };

  const candidates: unknown[] = [
    data.schoolId,
    data.school_id,
    data.schoolID,
    data.school,
    data.schoolRef,
  ];

  for (const raw of candidates) {
    const resolved = tryNormalize(raw);
    if (resolved) return resolved;
  }

  return null;
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
  | 'permission_denied'
  | 'network_error';

export function isFirestoreNetworkError(error: unknown): boolean {
  if (error == null) return false;
  const code = (error as { code?: string }).code ?? '';
  const message = String((error as { message?: string }).message ?? error);
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'resource-exhausted' ||
    code === 'internal' ||
    /ERR_QUIC_PROTOCOL_ERROR/i.test(message) ||
    /WebChannel/i.test(message) ||
    /transport error/i.test(message) ||
    /status\s*400/i.test(message) ||
    /\b400\b/.test(message) ||
    /Failed to fetch/i.test(message) ||
    /network error/i.test(message) ||
    /client is offline/i.test(message)
  );
}

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

export const ASSISTANT_SCHOOL_NETWORK_ERROR_AR =
  'تعذّر الاتصال بخادم البيانات. تحقق من الشبكة ثم أعد تسجيل الدخول.';

export const SCHOOL_CONTEXT_TIMEOUT_MS = 10_000;

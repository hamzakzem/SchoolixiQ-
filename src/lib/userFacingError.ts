/**
 * Message safe to show in a toast: Firebase rule / network internals
 * ("evaluation error at L1752…", "PERMISSION_DENIED") become plain Arabic.
 */
export function userFacingError(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const code = String((error as { code?: unknown } | null)?.code || '');
  if (
    code.includes('permission-denied') ||
    /evaluation error|PERMISSION_DENIED|Missing or insufficient permissions|false for '/i.test(raw)
  ) {
    return 'ليس لديك صلاحية لتنفيذ هذا الإجراء';
  }
  if (code.includes('unavailable') || /network|Failed to fetch|offline/i.test(raw)) {
    return 'تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى';
  }
  // Server messages are Arabic sentences; anything else stays generic
  return /[؀-ۿ]/.test(raw) ? raw : fallback;
}

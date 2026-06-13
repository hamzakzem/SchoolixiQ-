/**
 * Temporary investigation logs for Tuition Reminder Dashboard Firestore listeners.
 * Remove after root cause is confirmed.
 */
export function logTuitionListenerDebug(
  queryName: string,
  schoolId: string | undefined,
  collectionPath: string,
  constraints: string[],
  extra?: Record<string, unknown>,
): void {
  console.info('[TuitionReminderFirestore] LISTENER_SETUP', {
    QUERY_NAME: queryName,
    schoolId: schoolId ?? '(undefined)',
    collectionPath,
    constraints,
    ...extra,
  });
}

export function logTuitionListenerError(queryName: string, error: unknown): void {
  const err = error as { code?: string; message?: string; name?: string };
  console.error('[TuitionReminderFirestore] LISTENER_ERROR', {
    QUERY_NAME: queryName,
    code: err?.code ?? '(no code)',
    message: err?.message ?? String(error),
    error,
  });
}

export function logTuitionListenerSnapshot(
  queryName: string,
  docCount: number,
  fromCache: boolean,
): void {
  console.info('[TuitionReminderFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    docCount,
    fromCache,
  });
}

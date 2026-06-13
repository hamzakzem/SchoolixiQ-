/**
 * Temporary investigation logs for Teacher Dashboard Firestore listeners.
 */
export type TeacherFirestoreMeta = {
  queryName: string;
  collection: string;
  constraints: string[];
  uid?: string;
  schoolId?: string;
};

export function logTeacherFirestoreSetup(meta: TeacherFirestoreMeta): void {
  console.info('[TeacherFirestore] LISTENER_SETUP', {
    QUERY_NAME: meta.queryName,
    collection: meta.collection,
    constraints: meta.constraints,
    uid: meta.uid ?? '(undefined)',
    schoolId: meta.schoolId ?? '(undefined)',
  });
}

export function logTeacherFirestoreError(
  queryName: string,
  error: unknown,
): void {
  const err = error as { code?: string; message?: string };
  console.error('[TeacherFirestore] LISTENER_ERROR', {
    QUERY_NAME: queryName,
    code: err?.code ?? '(no code)',
    message: err?.message ?? String(error),
  });
}

export function logTeacherFirestoreSnapshot(
  queryName: string,
  docCount: number,
  fromCache: boolean,
): void {
  console.info('[TeacherFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    docCount,
    fromCache,
  });
}

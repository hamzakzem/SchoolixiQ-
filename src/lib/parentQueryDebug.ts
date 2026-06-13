/**
 * Temporary investigation logs for Parent Dashboard Firestore listeners.
 * Remove after audit is confirmed stable.
 */
export type ParentFirestoreMeta = {
  queryName: string;
  collection: string;
  constraints: string[];
  uid?: string;
  schoolId?: string;
};

export function logParentFirestoreSetup(meta: ParentFirestoreMeta): void {
  console.info('[ParentFirestore] LISTENER_SETUP', {
    QUERY_NAME: meta.queryName,
    collection: meta.collection,
    constraints: meta.constraints,
    uid: meta.uid ?? '(undefined)',
    schoolId: meta.schoolId ?? '(undefined)',
  });
}

export function logParentFirestoreError(
  queryName: string,
  error: unknown,
): void {
  const err = error as { code?: string; message?: string };
  console.error('[ParentFirestore] LISTENER_ERROR', {
    QUERY_NAME: queryName,
    code: err?.code ?? '(no code)',
    message: err?.message ?? String(error),
  });
}

export function logParentFirestoreSnapshot(
  queryName: string,
  docCount: number,
  fromCache: boolean,
): void {
  console.info('[ParentFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    docCount,
    fromCache,
  });
}

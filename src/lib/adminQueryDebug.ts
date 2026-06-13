/**
 * Temporary investigation logs for Admin Dashboard Firestore listeners.
 */
export type AdminFirestoreMeta = {
  queryName: string;
  collection: string;
  constraints: string[];
  uid?: string;
  schoolId?: string;
};

export function logAdminFirestoreSetup(meta: AdminFirestoreMeta): void {
  console.info('[AdminFirestore] LISTENER_SETUP', {
    QUERY_NAME: meta.queryName,
    collection: meta.collection,
    constraints: meta.constraints,
    uid: meta.uid ?? '(undefined)',
    schoolId: meta.schoolId ?? '(undefined)',
  });
}

export function logAdminFirestoreError(
  queryName: string,
  error: unknown,
  meta?: Pick<AdminFirestoreMeta, 'collection' | 'constraints'>,
): void {
  const err = error as { code?: string; message?: string };
  console.error('[AdminFirestore] LISTENER_ERROR', {
    QUERY_NAME: queryName,
    collection: meta?.collection,
    constraints: meta?.constraints,
    code: err?.code ?? '(no code)',
    message: err?.message ?? String(error),
  });
}

export function logAdminFirestoreSnapshot(
  queryName: string,
  docCount: number,
  fromCache: boolean,
): void {
  console.info('[AdminFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    docCount,
    fromCache,
  });
}

export function logAdminFirestoreFetch(
  queryName: string,
  meta: AdminFirestoreMeta,
  docCount: number,
): void {
  console.info('[AdminFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    collection: meta.collection,
    constraints: meta.constraints,
    docCount,
    fromCache: false,
  });
}

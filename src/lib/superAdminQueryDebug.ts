import { Query } from 'firebase/firestore';
import {
  shouldIgnoreFirestoreListenerError,
  shouldSkipFirestoreListeners,
  subscribeGuardedFirestore,
} from './logoutGuard';

export type SuperAdminFirestoreMeta = {
  queryName: string;
  collection: string;
  constraints: string[];
  uid?: string;
};

export function logSuperAdminFirestoreSetup(meta: SuperAdminFirestoreMeta): void {
  console.info('[SuperAdminFirestore] LISTENER_SETUP', {
    QUERY_NAME: meta.queryName,
    collection: meta.collection,
    constraints: meta.constraints,
    uid: meta.uid ?? '(undefined)',
  });
}

export function logSuperAdminFirestoreError(
  queryName: string,
  error: unknown,
  meta?: Pick<SuperAdminFirestoreMeta, 'collection' | 'constraints'>,
): void {
  if (shouldIgnoreFirestoreListenerError(error)) return;
  const err = error as { code?: string; message?: string };
  console.error('[SuperAdminFirestore] LISTENER_ERROR', {
    QUERY_NAME: queryName,
    collection: meta?.collection,
    constraints: meta?.constraints,
    code: err?.code ?? '(no code)',
    message: err?.message ?? String(error),
  });
}

export function logSuperAdminFirestoreSnapshot(
  queryName: string,
  docCount: number,
  fromCache: boolean,
  meta?: Pick<SuperAdminFirestoreMeta, 'collection' | 'constraints'>,
): void {
  console.info('[SuperAdminFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    collection: meta?.collection,
    constraints: meta?.constraints,
    docCount,
    fromCache,
  });
}

export function logSuperAdminFirestoreFetch(
  queryName: string,
  meta: SuperAdminFirestoreMeta,
  docCount: number,
): void {
  console.info('[SuperAdminFirestore] LISTENER_SNAPSHOT', {
    QUERY_NAME: queryName,
    collection: meta.collection,
    constraints: meta.constraints,
    docCount,
    fromCache: false,
  });
}

export function subscribeSuperAdminFirestore<T extends { id: string }>(
  meta: SuperAdminFirestoreMeta,
  q: Query,
  onData: (items: T[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (shouldSkipFirestoreListeners()) {
    return () => {};
  }
  logSuperAdminFirestoreSetup(meta);
  return subscribeGuardedFirestore(
    q,
    (snap) => {
      if (shouldSkipFirestoreListeners()) return;
      if (!('docs' in snap)) return;
      logSuperAdminFirestoreSnapshot(meta.queryName, snap.size, snap.metadata.fromCache, {
        collection: meta.collection,
        constraints: meta.constraints,
      });
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
    },
    (error) => {
      logSuperAdminFirestoreError(meta.queryName, error, {
        collection: meta.collection,
        constraints: meta.constraints,
      });
      onError?.(error);
    },
  );
}

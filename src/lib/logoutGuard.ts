import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { auth } from './firebase';

let logoutInProgress = false;
const firestoreUnsubs = new Set<() => void>();

export type LogoutLogSnapshot = {
  userId: string;
  role: string;
  schoolId?: string;
  email?: string | null;
};

let logoutLogSnapshot: LogoutLogSnapshot | null = null;

export function setLogoutInProgress(value: boolean): void {
  logoutInProgress = value;
}

export function isLogoutInProgress(): boolean {
  return logoutInProgress;
}

export function shouldSkipFirestoreListeners(): boolean {
  return logoutInProgress || !auth.currentUser;
}

export function isPermissionDeniedError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? '';
  const msg = String(err?.message ?? error ?? '');
  return (
    code === 'permission-denied' ||
    /permission-denied/i.test(msg) ||
    /insufficient permissions/i.test(msg) ||
    /missing or insufficient permissions/i.test(msg)
  );
}

export function shouldIgnoreFirestoreListenerError(error: unknown): boolean {
  if (logoutInProgress) return true;
  if (!auth.currentUser && isPermissionDeniedError(error)) return true;
  if (shouldSkipFirestoreListeners() && isPermissionDeniedError(error)) return true;
  return false;
}

export function setLogoutLogSnapshot(snapshot: LogoutLogSnapshot | null): void {
  logoutLogSnapshot = snapshot;
}

export function getLogoutLogSnapshot(): LogoutLogSnapshot | null {
  return logoutLogSnapshot;
}

export function registerFirestoreUnsubscribe(unsub: () => void): () => void {
  if (shouldSkipFirestoreListeners()) {
    try {
      unsub();
    } catch {
      /* noop */
    }
    return () => {};
  }

  firestoreUnsubs.add(unsub);
  return () => {
    firestoreUnsubs.delete(unsub);
    try {
      unsub();
    } catch {
      /* noop */
    }
  };
}

export function unregisterAllFirestoreListeners(): void {
  for (const unsub of [...firestoreUnsubs]) {
    try {
      unsub();
    } catch {
      /* noop */
    }
  }
  firestoreUnsubs.clear();
}

type FirestoreSnap = QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>;

export function subscribeGuardedFirestore(
  source: Query<DocumentData> | DocumentReference<DocumentData>,
  onNext: (snap: FirestoreSnap) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (shouldSkipFirestoreListeners()) {
    return () => {};
  }

  const unsub = onSnapshot(
    source,
    (snap) => {
      if (shouldSkipFirestoreListeners()) return;
      onNext(snap);
    },
    (error) => {
      if (shouldIgnoreFirestoreListenerError(error)) return;
      onError?.(error);
    },
  );

  return registerFirestoreUnsubscribe(unsub);
}

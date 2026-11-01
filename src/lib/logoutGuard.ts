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

/**
 * True only while a user-initiated sign-out is running (the app shows a
 * "signing out" screen so dashboards unmount and close their listeners before
 * the session ends). Unlike logoutInProgress, it is not set while signed out.
 */
let signingOut = false;
const signingOutListeners = new Set<() => void>();

export function setSigningOut(value: boolean): void {
  if (signingOut === value) return;
  signingOut = value;
  signingOutListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

export function isSigningOut(): boolean {
  return signingOut;
}

export function subscribeSigningOut(fn: () => void): () => void {
  signingOutListeners.add(fn);
  return () => {
    signingOutListeners.delete(fn);
  };
}

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
  source: DocumentReference<DocumentData>,
  onNext: (snap: DocumentSnapshot<DocumentData>) => void,
  onError?: (error: unknown) => void,
): () => void;
export function subscribeGuardedFirestore(
  source: Query<DocumentData>,
  onNext: (snap: QuerySnapshot<DocumentData>) => void,
  onError?: (error: unknown) => void,
): () => void;
export function subscribeGuardedFirestore(
  source: Query<DocumentData> | DocumentReference<DocumentData>,
  onNext: (snap: any) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (shouldSkipFirestoreListeners()) {
    return () => {};
  }

  const unsub = onSnapshot(
    source as Query<DocumentData>,
    (snap: FirestoreSnap) => {
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

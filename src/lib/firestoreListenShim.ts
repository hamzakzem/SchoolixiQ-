/**
 * App-wide `firebase/firestore` entry point (vite.config.ts routes the app's imports
 * here; node_modules keep the real package). Everything is re-exported unchanged
 * except `onSnapshot`.
 *
 * Why: when a screen unsubscribes a query and subscribes to the same query again
 * right away (effects re-running after a profile update, a tab switch, a sign-in),
 * the Firestore SDK reuses the query's watch target id and can hit an internal
 * assertion — "INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9/b815)" — which
 * leaves Firestore unusable until the page reloads (seen on iPhone, reproducible
 * with accounts that are refused some queries). The assertion is still present in
 * the latest SDK.
 *
 * Fix: an unsubscribe detaches the caller immediately (no more callbacks) but keeps
 * the SDK listener alive for a short grace period. Re-subscribing to the same query
 * within that window simply joins the still-active target, so the SDK never sees
 * the rapid remove/add of one target.
 */
export * from 'firebase/firestore';
import { onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';

const RELEASE_GRACE_MS = 1500;

type AnyFn = (...args: unknown[]) => unknown;

function isObserver(value: unknown): value is { next?: AnyFn; error?: AnyFn; complete?: AnyFn } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.next === 'function' || typeof v.error === 'function' || typeof v.complete === 'function';
}

export function onSnapshot(reference: unknown, ...rest: unknown[]): () => void {
  let live = true;
  const guard = (fn: AnyFn | undefined): AnyFn | undefined =>
    typeof fn === 'function'
      ? (...args: unknown[]) => {
          if (live) return fn(...args);
          return undefined;
        }
      : undefined;

  let sawErrorHandler = false;
  const args = rest.map((arg, index) => {
    if (typeof arg === 'function') {
      // onSnapshot(ref, [options], onNext, onError?, onComplete?)
      const firstFnIndex = rest.findIndex((a) => typeof a === 'function');
      if (index === firstFnIndex + 1) sawErrorHandler = true;
      return guard(arg as AnyFn);
    }
    if (isObserver(arg)) {
      if (typeof arg.error === 'function') sawErrorHandler = true;
      return {
        next: guard(arg.next?.bind(arg)),
        error: guard(arg.error?.bind(arg)) ?? ((err: unknown) => {
          if (live) console.error('Uncaught Error in snapshot listener:', err);
        }),
        complete: guard(arg.complete?.bind(arg)),
      };
    }
    return arg;
  });

  // Without a caller error handler, errors arriving after detach would be logged by
  // the SDK as uncaught; keep reporting them only while the caller is subscribed.
  if (!sawErrorHandler && args.some((a) => typeof a === 'function')) {
    const fnCount = args.filter((a) => typeof a === 'function').length;
    if (fnCount === 1) {
      args.push((err: unknown) => {
        if (live) console.error('Uncaught Error in snapshot listener:', err);
      });
    }
  }

  const unsubscribe = (firestoreOnSnapshot as unknown as (...a: unknown[]) => () => void)(reference, ...args);
  return () => {
    if (!live) return;
    live = false;
    setTimeout(() => {
      try {
        unsubscribe();
      } catch {
        /* already gone */
      }
    }, RELEASE_GRACE_MS);
  };
}

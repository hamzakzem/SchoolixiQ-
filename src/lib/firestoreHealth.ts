/**
 * Firestore SDK internal assertions ("INTERNAL ASSERTION FAILED", ids ca9/b815) leave
 * the client dead: data already on screen stays, but nothing new arrives and every
 * write waits forever (chat stuck on "sending", notifications silent). They are often
 * raised outside React rendering, so the error boundary never sees them.
 *
 * This watches the SDK's own error output and reloads the page once (at most every
 * two minutes) so the user gets a working connection back instead of a frozen app.
 */
const RECOVERY_KEY = 'schoolix_firestore_recover_at';
const FATAL = /FIRESTORE \([^)]*\) INTERNAL ASSERTION FAILED|AsyncQueue is already failed/;

let triggered = false;

function recover(source: string): void {
  if (triggered || typeof window === 'undefined') return;
  try {
    const last = Number(sessionStorage.getItem(RECOVERY_KEY) || 0);
    if (Date.now() - last < 120_000) return; // already reloaded recently — avoid loops
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: still recover once in this page */
  }
  triggered = true;
  console.warn('[FirestoreHealth] client failed, reloading', { source });
  setTimeout(() => window.location.reload(), 600);
}

function textOf(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.message}\n${value.stack || ''}`;
  try {
    return String((value as { message?: unknown }).message ?? value);
  } catch {
    return '';
  }
}

export function installFirestoreHealthWatch(): void {
  if (typeof window === 'undefined' || (window as { __sxFsHealth?: boolean }).__sxFsHealth) return;
  (window as { __sxFsHealth?: boolean }).__sxFsHealth = true;

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalError(...args);
    try {
      if (args.some((a) => FATAL.test(textOf(a)))) recover('console');
    } catch {
      /* never break logging */
    }
  };
  window.addEventListener('error', (event) => {
    if (FATAL.test(textOf(event.error) || event.message || '')) recover('error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (FATAL.test(textOf(event.reason))) recover('rejection');
  });
}

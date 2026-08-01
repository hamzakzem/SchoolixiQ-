/** Single service worker URL — FCM token must bind to the same script as PWA registration. */
export const SW_BUILD_VERSION = '2026-08-01-v16';

const RECOVER_COUNT_KEY = 'schoolix_chunk_recover_count_v16';
const RECOVER_DONE_KEY = 'schoolix_chunk_recover_done_v16';
const MAX_AUTO_RECOVERIES = 1;

export function getServiceWorkerUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return `/sw.js?build=${SW_BUILD_VERSION}`;
  }
  return '/sw.js';
}

export function isChunkLoadError(reason: unknown): boolean {
  const msg = String(
    (reason as { message?: string })?.message || reason || '',
  );
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed|ChunkLoadError|CSS_CHUNK_LOAD_FAILED/i.test(
    msg,
  );
}

export function hasAttemptedChunkRecovery(): boolean {
  try {
    return Number(sessionStorage.getItem(RECOVER_COUNT_KEY) || '0') >= MAX_AUTO_RECOVERIES;
  } catch {
    return false;
  }
}

/** Clear SW caches, unregister workers, reload once — recovers from stale Vite chunks. */
export async function recoverFromStaleChunks(
  reason = 'unknown',
  opts?: { delayMs?: number },
): Promise<void> {
  if (typeof window === 'undefined') return;

  let count = 0;
  try {
    count = Number(sessionStorage.getItem(RECOVER_COUNT_KEY) || '0');
    if (count >= MAX_AUTO_RECOVERIES) {
      console.warn('[SW] recovery already attempted; skipping reload to avoid loop', reason);
      return;
    }
    sessionStorage.setItem(RECOVER_COUNT_KEY, String(count + 1));
  } catch {
    /* private mode — still attempt once via in-memory flag */
    if ((window as unknown as { __sxRecovering?: boolean }).__sxRecovering) return;
    (window as unknown as { __sxRecovering?: boolean }).__sxRecovering = true;
  }

  console.warn('[SW] recovering from stale chunk', reason);

  if (opts?.delayMs && opts.delayMs > 0) {
    await new Promise((r) => window.setTimeout(r, opts.delayMs));
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: 'SX_PURGE_CACHES' });
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }

  try {
    sessionStorage.setItem(RECOVER_DONE_KEY, '1');
  } catch {
    /* ignore */
  }

  // Bust HTTP cache for index.html after SW unregister
  const url = new URL(window.location.href);
  url.searchParams.delete('_sx_recover');
  url.searchParams.set('_sx_recover', String(Date.now()));
  window.location.replace(url.toString());
}

/** Wire chunk-failure recovery (dynamic import / SW message). Safe to call once. */
export function installChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __sxChunkRecovery?: boolean }).__sxChunkRecovery) return;
  (window as unknown as { __sxChunkRecovery?: boolean }).__sxChunkRecovery = true;

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    void recoverFromStaleChunks('unhandledrejection', { delayMs: 250 });
  });

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === 'SCRIPT') {
        const src = (target as HTMLScriptElement).src || '';
        if (src.includes('/assets/')) {
          void recoverFromStaleChunks('script_error', { delayMs: 250 });
        }
      }
    },
    true,
  );

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_STALE_CHUNK_RELOAD') {
        void recoverFromStaleChunks(event.data?.reason || 'sw_message', { delayMs: 200 });
      }
    });

    // When an *existing* SW is replaced, reload once so HTML + chunks match (no first-visit loop).
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        hadController = Boolean(navigator.serviceWorker.controller);
        return;
      }
      const key = `schoolix_sw_controller_${SW_BUILD_VERSION}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
      } catch {
        return;
      }
      window.location.reload();
    });
  }
}

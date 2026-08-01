/** Single service worker URL — FCM token must bind to the same script as PWA registration. */
export const SW_BUILD_VERSION = '2026-08-01-v14';

export function getServiceWorkerUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return `/sw.js?build=${SW_BUILD_VERSION}`;
  }
  return '/sw.js';
}

const RECOVER_KEY = 'schoolix_chunk_recover_v14';

function isChunkLoadError(reason: unknown): boolean {
  const msg = String(
    (reason as { message?: string })?.message || reason || '',
  );
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk [\d]+ failed|ChunkLoadError/i.test(
    msg,
  );
}

/** Clear SW caches, unregister workers, reload once — recovers from stale Vite chunks. */
export async function recoverFromStaleChunks(reason = 'unknown'): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(RECOVER_KEY)) return;
    sessionStorage.setItem(RECOVER_KEY, '1');
  } catch {
    /* private mode */
  }

  console.warn('[SW] recovering from stale chunk', reason);

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
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }

  window.location.reload();
}

/** Wire chunk-failure recovery (dynamic import / SW message). Safe to call once. */
export function installChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return;
  if ((window as unknown as { __sxChunkRecovery?: boolean }).__sxChunkRecovery) return;
  (window as unknown as { __sxChunkRecovery?: boolean }).__sxChunkRecovery = true;

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    void recoverFromStaleChunks('unhandledrejection');
  });

  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === 'SCRIPT') {
      const src = (target as HTMLScriptElement).src || '';
      if (src.includes('/assets/')) {
        void recoverFromStaleChunks('script_error');
      }
    }
  }, true);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_STALE_CHUNK_RELOAD') {
        void recoverFromStaleChunks(event.data?.reason || 'sw_message');
      }
    });
  }
}

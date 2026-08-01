import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, recoverFromStaleChunks } from './serviceWorkerRegistration';

/**
 * React.lazy wrapper: on Vite chunk fetch failure, trigger one-time PWA recovery.
 * Keeps dashboard/auth logic unchanged — only stabilizes production chunk loading.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithChunkRecovery<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (isChunkLoadError(error) && import.meta.env.PROD) {
        void recoverFromStaleChunks('lazy_import', { delayMs: 400 });
      }
      throw error;
    }
  }) as LazyExoticComponent<T>;
}

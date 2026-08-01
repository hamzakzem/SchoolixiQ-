import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  isChunkLoadError,
  recoverFromStaleChunks,
} from '../lib/serviceWorkerRegistration';

type Props = {
  error?: Error | null;
  /** Auto-start recovery after paint (default 900ms). */
  autoRecoverMs?: number;
};

/**
 * Production-safe screen for Vite/React lazy chunk failures.
 * Clears SW caches, unregisters outdated workers, reloads once.
 */
export function ChunkLoadRecovery({ error, autoRecoverMs = 900 }: Props) {
  const [busy, setBusy] = useState(false);
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (!chunkError) return;
    const t = window.setTimeout(() => {
      setBusy(true);
      void recoverFromStaleChunks('chunk_ui_auto');
    }, autoRecoverMs);
    return () => window.clearTimeout(t);
  }, [chunkError, autoRecoverMs]);

  const onReload = () => {
    setBusy(true);
    void recoverFromStaleChunks('chunk_ui_click');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B1F3A]/[0.06]">
          <RefreshCw
            className={`h-7 w-7 text-[#0B1F3A] ${busy ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
          />
        </div>
        <h1 className="text-xl font-bold text-[#0B1F3A] mb-2">
          تحديث التطبيق مطلوب
        </h1>
        <p className="text-slate-500 mb-2 leading-relaxed">
          تم نشر نسخة جديدة من Schoolix. جاري تحديث الصفحة تلقائياً…
        </p>
        <p className="text-slate-400 text-sm mb-6">
          A new version is available. Refreshing to load the latest files…
        </p>
        <button
          type="button"
          onClick={onReload}
          disabled={busy}
          className="w-full bg-[#0B1F3A] text-white font-bold py-3 rounded-xl hover:bg-[#132b4d] transition-colors disabled:opacity-70 cursor-pointer"
        >
          {busy ? 'جاري التحديث…' : 'تحديث الآن'}
        </button>
      </div>
    </div>
  );
}

export function shouldUseChunkRecovery(error?: Error | null): boolean {
  return isChunkLoadError(error);
}

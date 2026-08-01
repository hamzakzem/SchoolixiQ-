import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  hasAttemptedChunkRecovery,
  isChunkLoadError,
  recoverFromStaleChunks,
} from '../lib/serviceWorkerRegistration';

type Props = {
  error?: Error | null;
  /** Auto-start recovery after paint (default 600ms). */
  autoRecoverMs?: number;
};

/**
 * Production-safe screen for Vite/React lazy chunk failures.
 * Never leaves customers on a white screen — auto-clears SW caches and reloads once.
 */
export function ChunkLoadRecovery({ error, autoRecoverMs = 600 }: Props) {
  const [busy, setBusy] = useState(false);
  const [loopStopped, setLoopStopped] = useState(() => hasAttemptedChunkRecovery());
  const chunkError = error ? isChunkLoadError(error) : true;

  useEffect(() => {
    if (!chunkError || loopStopped) return;
    const t = window.setTimeout(() => {
      setBusy(true);
      void recoverFromStaleChunks('chunk_ui_auto').then(() => {
        // If recover returns without navigating (loop guard), show manual UI
        if (hasAttemptedChunkRecovery()) {
          setBusy(false);
          setLoopStopped(true);
        }
      });
    }, autoRecoverMs);
    return () => window.clearTimeout(t);
  }, [chunkError, autoRecoverMs, loopStopped]);

  const onReload = () => {
    setBusy(true);
    // Manual force: clear recover count so one more attempt is allowed
    try {
      sessionStorage.removeItem('schoolix_chunk_recover_count_v16');
    } catch {
      /* ignore */
    }
    void recoverFromStaleChunks('chunk_ui_click');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 text-center" dir="rtl">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B1F3A]/[0.06]">
          <RefreshCw
            className={`h-7 w-7 text-[#0B1F3A] ${busy ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
          />
        </div>
        <h1 className="text-xl font-bold text-[#0B1F3A] mb-2">
          جاري تحديث التطبيق...
        </h1>
        <p className="text-slate-500 mb-2 leading-relaxed">
          {loopStopped
            ? 'تعذر التحديث التلقائي. اضغط الزر أدناه لإعادة المحاولة.'
            : 'نقوم بتحميل أحدث نسخة من Schoolix تلقائياً. لن تحتاج لمسح الذاكرة المؤقتة.'}
        </p>
        <p className="text-slate-400 text-sm mb-6" dir="ltr">
          Updating Schoolix… please wait.
        </p>
        <button
          type="button"
          onClick={onReload}
          disabled={busy && !loopStopped}
          className="w-full bg-[#0B1F3A] text-white font-bold py-3 rounded-xl hover:bg-[#132b4d] transition-colors disabled:opacity-70 cursor-pointer"
        >
          {busy && !loopStopped ? 'جاري التحديث…' : 'إعادة المحاولة'}
        </button>
      </div>
    </div>
  );
}

export function shouldUseChunkRecovery(error?: Error | null): boolean {
  return isChunkLoadError(error);
}

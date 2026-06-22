import React, { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, List } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useOfflineStatus } from '../lib/offline/useOfflineStatus';
import { OfflineOperationsPanel } from './OfflineOperationsPanel';

export function OfflineSyncIndicator() {
  const { user } = useAuth();
  const { isOnline, isSyncing, counts, statusLabel } = useOfflineStatus();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!user) return null;

  const hasQueue = counts.pending > 0 || counts.failed > 0 || counts.blocked > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={`fixed bottom-20 left-4 z-[120] flex max-w-[min(92vw,360px)] items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur-md transition-colors sm:bottom-4 ${
          !isOnline
            ? 'border-amber-300/60 bg-amber-50/95 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/90 dark:text-amber-100'
            : counts.failed > 0
              ? 'border-red-300/60 bg-red-50/95 text-red-900 dark:border-red-500/40 dark:bg-red-950/90 dark:text-red-100'
              : hasQueue
                ? 'border-sky-300/60 bg-sky-50/95 text-sky-900 dark:border-sky-500/40 dark:bg-sky-950/90 dark:text-sky-100'
                : 'border-emerald-300/50 bg-white/95 text-emerald-900 dark:border-emerald-500/30 dark:bg-slate-900/90 dark:text-emerald-100'
        }`}
        aria-label={statusLabel}
      >
        {isSyncing ? (
          <RefreshCw size={16} className="animate-spin shrink-0" />
        ) : isOnline ? (
          <Cloud size={16} className="shrink-0" />
        ) : (
          <CloudOff size={16} className="shrink-0" />
        )}
        <span className="truncate">{statusLabel}</span>
        {hasQueue && (
          <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">
            {counts.pending + counts.failed + counts.blocked}
          </span>
        )}
        <List size={14} className="shrink-0 opacity-70" />
      </button>

      <OfflineOperationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}

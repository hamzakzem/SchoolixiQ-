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

  const chipTone = !isOnline
    ? 'sx-offline-chip--offline'
    : counts.failed > 0
      ? 'sx-offline-chip--error'
      : hasQueue
        ? 'sx-offline-chip--syncing'
        : 'sx-offline-chip--ok';

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={`sx-offline-chip fixed bottom-20 left-4 z-[120] sm:bottom-4 ${chipTone}`}
        aria-label={statusLabel}
      >
        {isSyncing ? (
          <RefreshCw size={18} className="sx-action-icon animate-spin shrink-0" strokeWidth={2.25} />
        ) : isOnline ? (
          <Cloud size={18} className="sx-action-icon shrink-0" strokeWidth={2.25} />
        ) : (
          <CloudOff size={18} className="sx-action-icon shrink-0" strokeWidth={2.25} />
        )}
        <span className="truncate">{statusLabel}</span>
        {hasQueue && (
          <span className="rounded-full bg-[var(--sx-gold-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--sx-primary)]">
            {counts.pending + counts.failed + counts.blocked}
          </span>
        )}
        <List size={18} className="sx-action-icon sx-icon-muted shrink-0" strokeWidth={2.25} />
      </button>

      <OfflineOperationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}

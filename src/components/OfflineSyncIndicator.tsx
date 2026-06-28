import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle, CloudUpload, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useOfflineStatus } from '../lib/offline/useOfflineStatus';
import { OfflineOperationsPanel } from './OfflineOperationsPanel';

const DISMISS_FP_KEY = 'schoolix_offline_dismiss_fp';

type OfflineOperationsContextValue = {
  openPanel: () => void;
};

const OfflineOperationsContext = createContext<OfflineOperationsContextValue | null>(null);

export function useOfflineOperationsOptional(): OfflineOperationsContextValue | null {
  return useContext(OfflineOperationsContext);
}

function useOfflineOperationsContext(): OfflineOperationsContextValue {
  const ctx = useContext(OfflineOperationsContext);
  if (!ctx) {
    throw new Error('OfflineQueueTrigger must be used within OfflineOperationsProvider');
  }
  return ctx;
}

function useOfflineIndicatorState() {
  const { user } = useAuth();
  const { isSyncing, counts, lastError } = useOfflineStatus();
  const [dismissedFp, setDismissedFp] = useState(
    () => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(DISMISS_FP_KEY) : null) ?? '',
  );

  const queueCount = counts.pending + counts.failed + counts.blocked;
  const isCritical = counts.failed > 0 || counts.blocked > 0;
  const hasWork = queueCount > 0 || isSyncing;

  const fingerprint = `${counts.pending}:${counts.failed}:${counts.blocked}:${lastError ?? ''}`;

  const visible = Boolean(user) && hasWork && (isCritical || dismissedFp !== fingerprint);

  const dismiss = useCallback(() => {
    if (isCritical) return;
    sessionStorage.setItem(DISMISS_FP_KEY, fingerprint);
    setDismissedFp(fingerprint);
  }, [fingerprint, isCritical]);

  return {
    visible,
    queueCount,
    isCritical,
    isSyncing,
    counts,
    dismiss,
    canDismiss: hasWork && !isCritical,
  };
}

type TriggerVariant = 'header' | 'dock-pill';

type OfflineQueueTriggerProps = {
  variant?: TriggerVariant;
  className?: string;
};

export function OfflineQueueTrigger({ variant = 'header', className = '' }: OfflineQueueTriggerProps) {
  const { openPanel } = useOfflineOperationsContext();
  const { visible, queueCount, isCritical, isSyncing, counts, dismiss, canDismiss } =
    useOfflineIndicatorState();

  if (!visible) return null;

  const tone = isCritical
    ? 'sx-offline-status--error'
    : isSyncing
      ? 'sx-offline-status--syncing'
      : 'sx-offline-status--pending';

  const label =
    queueCount > 0
      ? `عمليات بانتظار المزامنة: ${queueCount}`
      : isSyncing
        ? 'جاري المزامنة'
        : 'عمليات بانتظار المزامنة';

  const Icon = isCritical ? AlertTriangle : isSyncing ? RefreshCw : CloudUpload;

  return (
    <div
      className={`sx-offline-status-wrap sx-offline-status-wrap--${variant} ${className}`.trim()}
    >
      <button
        type="button"
        onClick={openPanel}
        className={`sx-offline-status ${tone}`}
        title="عمليات بانتظار المزامنة"
        aria-label={label}
      >
        <Icon
          size={variant === 'dock-pill' ? 16 : 15}
          className={`shrink-0${isSyncing ? ' animate-spin' : ''}`}
          strokeWidth={2.25}
          aria-hidden
        />
        {queueCount > 0 && (
          <span className="sx-offline-status__count" aria-hidden>
            {queueCount > 99 ? '99+' : queueCount}
          </span>
        )}
        {variant === 'header' && counts.failed > 0 && (
          <span className="sx-offline-status__label hidden xl:inline">
            {counts.failed > 0 && counts.pending === 0 ? 'فشل الرفع' : 'بانتظار المزامنة'}
          </span>
        )}
      </button>
      {canDismiss && (
        <button
          type="button"
          className="sx-offline-status-dismiss"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          aria-label="إخفاء مؤقت"
          title="إخفاء مؤقت"
        >
          <X size={12} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </div>
  );
}

export function OfflineOperationsProvider({ children }: { children: React.ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const value = useMemo(
    () => ({
      openPanel: () => setPanelOpen(true),
    }),
    [],
  );

  return (
    <OfflineOperationsContext.Provider value={value}>
      {children}
      <OfflineOperationsPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </OfflineOperationsContext.Provider>
  );
}

/** Desktop header chip — fixed top-end, does not cover main content. */
export function OfflineSyncIndicatorDesktop() {
  return (
    <div className="sx-offline-status-host sx-offline-status-host--desktop print:hidden">
      <OfflineQueueTrigger variant="header" />
    </div>
  );
}

/** @deprecated Use OfflineOperationsProvider + OfflineQueueTrigger */
export function OfflineSyncIndicator() {
  return <OfflineSyncIndicatorDesktop />;
}

import type { OfflineQueueCounts } from './offlineTypes';

type OfflineStatusSnapshot = {
  isOnline: boolean;
  isSyncing: boolean;
  counts: OfflineQueueCounts;
  lastSyncAt: string | null;
  lastError: string | null;
  offlineDataStale: boolean;
  lastDataCacheUpdate: string | null;
  lastAppShellCacheUpdate: string | null;
};

type Listener = (snapshot: OfflineStatusSnapshot) => void;

const emptyCounts = (): OfflineQueueCounts => ({
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  blocked: 0,
  total: 0,
});

let snapshot: OfflineStatusSnapshot = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  counts: emptyCounts(),
  lastSyncAt: null,
  lastError: null,
  offlineDataStale: false,
  lastDataCacheUpdate:
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('schoolix_last_data_cache') || null
      : null,
  lastAppShellCacheUpdate:
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('schoolix_last_shell_cache') || null
      : null,
};

const listeners = new Set<Listener>();
let listenersAttached = false;

function emit(): void {
  for (const listener of listeners) {
    listener({ ...snapshot, counts: { ...snapshot.counts } });
  }
}

export function getOfflineStatusSnapshot(): OfflineStatusSnapshot {
  return { ...snapshot, counts: { ...snapshot.counts } };
}

export function subscribeOfflineStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(getOfflineStatusSnapshot());
  return () => listeners.delete(listener);
}

export function setOnlineStatus(isOnline: boolean): void {
  const prev = snapshot.isOnline;
  snapshot = { ...snapshot, isOnline };
  if (prev !== isOnline) {
    console.info('[Offline] STATUS_CHANGE', { isOnline });
    if (!isOnline) {
      snapshot = { ...snapshot, offlineDataStale: true };
    }
    emit();
  }
}

export function setSyncing(isSyncing: boolean): void {
  snapshot = { ...snapshot, isSyncing };
  emit();
}

export function setQueueCounts(counts: OfflineQueueCounts): void {
  snapshot = { ...snapshot, counts: { ...counts } };
  emit();
}

export function setLastSyncAt(iso: string | null): void {
  snapshot = { ...snapshot, lastSyncAt: iso };
  emit();
}

export function setLastSyncError(message: string | null): void {
  snapshot = { ...snapshot, lastError: message };
  emit();
}

export function setOfflineDataStale(stale: boolean): void {
  snapshot = { ...snapshot, offlineDataStale: stale };
  emit();
}

export function setLastDataCacheUpdate(iso: string): void {
  snapshot = { ...snapshot, lastDataCacheUpdate: iso, offlineDataStale: !snapshot.isOnline };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('schoolix_last_data_cache', iso);
  }
  emit();
}

export function setLastAppShellCacheUpdate(iso: string): void {
  snapshot = { ...snapshot, lastAppShellCacheUpdate: iso };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('schoolix_last_shell_cache', iso);
  }
  emit();
}

export function attachOfflineNetworkListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  const onOnline = () => {
    setOnlineStatus(true);
    setOfflineDataStale(false);
  };
  const onOffline = () => {
    setOnlineStatus(false);
    setOfflineDataStale(true);
  };

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  setOnlineStatus(navigator.onLine);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data as { type?: string; updatedAt?: string } | null;
      if (!data?.type || !data.updatedAt) return;
      if (
        data.type === 'SW_CACHE_UPDATED' ||
        data.type === 'SW_APP_SHELL_CACHE_READY'
      ) {
        setLastAppShellCacheUpdate(data.updatedAt);
      }
      if (data.type === 'SW_STALE_CHUNK_RELOAD') {
        const key = 'schoolix_sw_stale_reload';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          window.location.reload();
        }
      }
    });
  }
}

export function getOfflineStatusLabel(snapshotIn?: OfflineStatusSnapshot): string {
  const s = snapshotIn ?? getOfflineStatusSnapshot();
  if (s.isSyncing) return 'جاري المزامنة...';
  if (!s.isOnline) {
    if (s.offlineDataStale) {
      return 'غير متصل — يتم عرض آخر نسخة محفوظة';
    }
    if (s.counts.pending > 0) {
      return 'غير متصل — سيتم حفظ التغييرات محلياً';
    }
    return 'غير متصل';
  }
  if (s.counts.failed > 0) {
    return `فشل رفع بعض العمليات: ${s.counts.failed}`;
  }
  if (s.counts.pending > 0) {
    return `عمليات بانتظار الرفع: ${s.counts.pending}`;
  }
  return 'متصل';
}

export function formatCacheAge(iso: string | null): string {
  if (!iso) return 'غير متوفر';
  try {
    return new Date(iso).toLocaleString('ar-IQ');
  } catch {
    return iso;
  }
}

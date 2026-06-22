import type { OfflineQueueCounts } from './offlineTypes';

type OfflineStatusSnapshot = {
  isOnline: boolean;
  isSyncing: boolean;
  counts: OfflineQueueCounts;
  lastSyncAt: string | null;
  lastError: string | null;
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

export function attachOfflineNetworkListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  const onOnline = () => setOnlineStatus(true);
  const onOffline = () => setOnlineStatus(false);

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  setOnlineStatus(navigator.onLine);
}

export function getOfflineStatusLabel(snapshotIn?: OfflineStatusSnapshot): string {
  const s = snapshotIn ?? getOfflineStatusSnapshot();
  if (s.isSyncing) return 'جاري المزامنة...';
  if (!s.isOnline) {
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

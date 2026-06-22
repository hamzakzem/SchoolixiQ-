import { useEffect, useState } from 'react';
import {
  getOfflineStatusLabel,
  getOfflineStatusSnapshot,
  subscribeOfflineStatus,
} from './offlineStatus';
import type { OfflineQueueCounts } from './offlineTypes';

export function useOfflineStatus() {
  const [snapshot, setSnapshot] = useState(getOfflineStatusSnapshot);

  useEffect(() => subscribeOfflineStatus(setSnapshot), []);

  return {
    isOnline: snapshot.isOnline,
    isSyncing: snapshot.isSyncing,
    counts: snapshot.counts as OfflineQueueCounts,
    lastSyncAt: snapshot.lastSyncAt,
    lastError: snapshot.lastError,
    offlineDataStale: snapshot.offlineDataStale,
    lastDataCacheUpdate: snapshot.lastDataCacheUpdate,
    lastAppShellCacheUpdate: snapshot.lastAppShellCacheUpdate,
    statusLabel: getOfflineStatusLabel(snapshot),
  };
}

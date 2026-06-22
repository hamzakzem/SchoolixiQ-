import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import {
  CACHE_COLLECTION_KEYS,
  cacheSnapshot,
  getCachedProfileForUser,
  getCachedSnapshot,
  hydrateFromCache,
  isFirestoreOfflineError,
  type CacheCollectionKey,
} from './offlineDataCache';
import { setOfflineDataStale } from './offlineStatus';

export { cacheSnapshot, getCachedSnapshot, hydrateFromCache, CACHE_COLLECTION_KEYS };

export function useCachedProfile() {
  const { user, profile } = useAuth();
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || profile) {
      setFromCache(false);
      return;
    }
    let cancelled = false;
    void getCachedProfileForUser(user.uid).then((cached) => {
      if (cancelled || !cached) return;
      setFromCache(true);
      setLastUpdated(cached.updatedAt);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, profile]);

  return { fromCache, lastUpdated, profile };
}

type CachedQueryOptions<T> = {
  collectionKey: CacheCollectionKey;
  schoolId: string | undefined;
  enabled?: boolean;
  maxItems?: number;
  onData: (data: T) => void;
  onError?: (error: unknown) => void;
};

export function useCachedFirestoreQuery<T>({
  collectionKey,
  schoolId,
  enabled = true,
  maxItems,
  onData,
  onError,
}: CachedQueryOptions<T>) {
  const { user } = useAuth();

  const writeCache = useCallback(
    (data: T) => {
      if (!user?.uid || !schoolId) return;
      void cacheSnapshot(collectionKey, user.uid, schoolId, data, { maxItems });
    },
    [collectionKey, maxItems, schoolId, user?.uid],
  );

  const readCache = useCallback(async (): Promise<boolean> => {
    if (!user?.uid || !schoolId) return false;
    const ok = await hydrateFromCache<T>(collectionKey, user.uid, schoolId, onData);
    if (ok) setOfflineDataStale(true);
    return ok;
  }, [collectionKey, onData, schoolId, user?.uid]);

  const handleSnapshotError = useCallback(
    async (error: unknown) => {
      onError?.(error);
      if (isFirestoreOfflineError(error) || !navigator.onLine) {
        await readCache();
      }
    },
    [onError, readCache],
  );

  useEffect(() => {
    if (!enabled || !user?.uid || !schoolId) return;
    if (!navigator.onLine) {
      void readCache();
    }
  }, [enabled, readCache, schoolId, user?.uid]);

  return { writeCache, readCache, handleSnapshotError };
}

export function wrapSnapshotSuccess<T>(
  collectionKey: CacheCollectionKey,
  userId: string,
  schoolId: string,
  data: T,
  options?: { maxItems?: number },
): void {
  void cacheSnapshot(collectionKey, userId, schoolId, data, options);
}

export async function wrapSnapshotError<T>(
  collectionKey: CacheCollectionKey,
  userId: string,
  schoolId: string,
  error: unknown,
  apply: (data: T) => void,
): Promise<void> {
  if (!isFirestoreOfflineError(error) && navigator.onLine) return;
  const ok = await hydrateFromCache<T>(collectionKey, userId, schoolId, apply);
  if (ok) setOfflineDataStale(true);
}

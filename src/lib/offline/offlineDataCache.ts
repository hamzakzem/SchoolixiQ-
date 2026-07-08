import { setLastDataCacheUpdate } from './offlineStatus';

const DB_NAME = 'schoolixiq_offline_data';
const DB_VERSION = 1;
const STORE = 'snapshots';

export const CACHE_COLLECTION_KEYS = {
  profile: 'profile',
  school: 'school',
  classes: 'classes',
  students: 'students',
  attendance: 'attendance',
  installments: 'installments',
  subjects: 'subjects',
  messages: 'messages',
  notifications: 'notifications',
  dashboardSummary: 'dashboardSummary',
} as const;

export type CacheCollectionKey =
  (typeof CACHE_COLLECTION_KEYS)[keyof typeof CACHE_COLLECTION_KEYS];

export type CachedSnapshotEntry = {
  id: string;
  userId: string;
  schoolId: string;
  collectionKey: string;
  data: unknown;
  updatedAt: string;
  version: number;
};

export type DataCacheMeta = {
  lastUpdate: string | null;
  entryCount: number;
  collections: string[];
};

const COLLECTION_LIMITS: Partial<Record<CacheCollectionKey, number>> = {
  messages: 50,
  notifications: 30,
  students: 500,
  attendance: 100,
  classes: 200,
};

const CACHE_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('userSchool', ['userId', 'schoolId'], { unique: false });
        store.createIndex('collectionKey', 'collectionKey', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      }),
  );
}

export function buildCacheId(
  userId: string,
  schoolId: string,
  collectionKey: string,
): string {
  const scopedSchool = schoolId || '_';
  return `${userId}::${scopedSchool}::${collectionKey}`;
}

function trimPayload(
  collectionKey: string,
  data: unknown,
  maxItems?: number,
): unknown {
  const limit = maxItems ?? COLLECTION_LIMITS[collectionKey as CacheCollectionKey];
  if (!limit || !Array.isArray(data)) return data;
  return data.slice(0, limit);
}

export async function cacheSnapshot(
  collectionKey: string,
  userId: string,
  schoolId: string,
  data: unknown,
  options?: { maxItems?: number },
): Promise<void> {
  if (!userId || !collectionKey) return;
  const scopedSchool = schoolId || '_';
  const trimmed = trimPayload(collectionKey, data, options?.maxItems);
  const updatedAt = new Date().toISOString();
  const entry: CachedSnapshotEntry = {
    id: buildCacheId(userId, scopedSchool, collectionKey),
    userId,
    schoolId: scopedSchool,
    collectionKey,
    data: trimmed,
    updatedAt,
    version: CACHE_VERSION,
  };
  await withStore('readwrite', (store) => store.put(entry));
  setLastDataCacheUpdate(updatedAt);
  console.info('[OfflineCache] WRITE', { collectionKey, userId, schoolId: scopedSchool });
}

export async function getCachedSnapshot<T>(
  collectionKey: string,
  userId: string,
  schoolId: string,
): Promise<{ data: T; updatedAt: string } | null> {
  if (!userId) return null;
  const scopedSchool = schoolId || '_';
  const id = buildCacheId(userId, scopedSchool, collectionKey);
  const entry = await withStore<CachedSnapshotEntry | undefined>('readonly', (store) =>
    store.get(id),
  );
  if (!entry || entry.userId !== userId) return null;
  if (schoolId && entry.schoolId !== schoolId && entry.schoolId !== '_') return null;
  return { data: entry.data as T, updatedAt: entry.updatedAt };
}

export async function getCachedProfileForUser(
  userId: string,
): Promise<{ data: Record<string, unknown>; updatedAt: string } | null> {
  const direct = await getCachedSnapshot<Record<string, unknown>>(
    CACHE_COLLECTION_KEYS.profile,
    userId,
    '_',
  );
  if (direct) return direct;

  const all = await withStore<CachedSnapshotEntry[]>('readonly', (store) => store.getAll());
  const match = all
    .filter((e) => e.userId === userId && e.collectionKey === CACHE_COLLECTION_KEYS.profile)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (!match) return null;
  return { data: match.data as Record<string, unknown>, updatedAt: match.updatedAt };
}

export async function clearUserDataCache(userId: string): Promise<number> {
  if (!userId) return 0;
  const all = await withStore<CachedSnapshotEntry[]>('readonly', (store) => store.getAll());
  const toDelete = all.filter((e) => e.userId === userId);
  for (const entry of toDelete) {
    await withStore('readwrite', (store) => store.delete(entry.id));
  }
  console.info('[OfflineCache] CLEAR_USER', { userId, removed: toDelete.length });
  return toDelete.length;
}

/** Clear messaging-related offline snapshots so unauthorized threads cannot leak after role changes. */
export async function clearMessagingCache(userId: string): Promise<number> {
  if (!userId) return 0;
  const all = await withStore<CachedSnapshotEntry[]>('readonly', (store) => store.getAll());
  const messagingKeys = new Set([
    CACHE_COLLECTION_KEYS.messages,
    'system_messages',
    'conversations',
    'messages',
  ]);
  const toDelete = all.filter(
    (e) => e.userId === userId && messagingKeys.has(e.collectionKey),
  );
  for (const entry of toDelete) {
    await withStore('readwrite', (store) => store.delete(entry.id));
  }
  console.info('[OfflineCache] CLEAR_MESSAGING', { userId, removed: toDelete.length });
  return toDelete.length;
}

export async function getDataCacheMeta(userId?: string): Promise<DataCacheMeta> {
  const all = await withStore<CachedSnapshotEntry[]>('readonly', (store) => store.getAll());
  const scoped = userId ? all.filter((e) => e.userId === userId) : all;
  const lastUpdate =
    scoped.length > 0
      ? scoped.reduce((max, e) => (e.updatedAt > max ? e.updatedAt : max), scoped[0].updatedAt)
      : null;
  return {
    lastUpdate,
    entryCount: scoped.length,
    collections: [...new Set(scoped.map((e) => e.collectionKey))],
  };
}

export function isFirestoreOfflineError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message || '');
  return (
    code === 'unavailable' ||
    code === 'failed-precondition' ||
    message.includes('client is offline') ||
    message.includes('Failed to get document because the client is offline')
  );
}

export function cacheDocsFromSnapshot(
  collectionKey: CacheCollectionKey,
  userId: string,
  schoolId: string,
  docs: Array<{ id: string; [key: string]: unknown }>,
): void {
  void cacheSnapshot(collectionKey, userId, schoolId, docs);
}

export async function hydrateFromCache<T>(
  collectionKey: CacheCollectionKey,
  userId: string,
  schoolId: string,
  apply: (data: T) => void,
): Promise<boolean> {
  const cached = await getCachedSnapshot<T>(collectionKey, userId, schoolId);
  if (!cached) return false;
  apply(cached.data);
  console.info('[OfflineCache] HYDRATE', { collectionKey, updatedAt: cached.updatedAt });
  return true;
}

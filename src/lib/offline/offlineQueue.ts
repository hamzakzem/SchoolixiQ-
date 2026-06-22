const DB_NAME = 'schoolixiq_offline_queue';
const DB_VERSION = 1;
const STORE = 'operations';

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
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('module', 'module', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('clientMutationId', 'clientMutationId', { unique: false });
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

export async function putQueueItem<T extends { id: string }>(item: T): Promise<void> {
  await withStore('readwrite', (store) => store.put(item));
}

export async function getQueueItem<T extends { id: string }>(id: string): Promise<T | null> {
  const result = await withStore<T | undefined>('readonly', (store) => store.get(id));
  return result ?? null;
}

export async function getAllQueueItems<T>(): Promise<T[]> {
  return withStore<T[]>('readonly', (store) => store.getAll());
}

export async function deleteQueueItem(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function getQueueItemsByStatus<T>(status: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const index = store.index('status');
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearQueueItemsByStatus(status: string): Promise<number> {
  const items = await getQueueItemsByStatus<{ id: string }>(status);
  for (const item of items) {
    await deleteQueueItem(item.id);
  }
  return items.length;
}

import { db } from './firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { uploadImageViaStorageOrServer } from './imageUtils';

/** Canonical school store collection (admin writes here). */
export const STORE_COLLECTION = 'market' as const;

/** Legacy collection — read-only merge for backward compatibility. */
export const LEGACY_STORE_COLLECTION = 'marketplace' as const;

export const MAX_STORE_IMAGE_BYTES = 5 * 1024 * 1024;

export type StoreProduct = {
  id: string;
  schoolId: string;
  itemName: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  image: string;
  status: string;
  createdAt?: Timestamp | { seconds?: number };
  createdBy?: string;
};

export function normalizeStoreProduct(
  id: string,
  data: Record<string, unknown>,
): StoreProduct {
  const stock =
    typeof data.stock === 'number'
      ? data.stock
      : typeof data.quantity === 'number'
        ? data.quantity
        : 0;
  const itemName = String(
    data.itemName || data.name || data.title || '',
  ).trim();
  const imageUrl = String(data.imageUrl || data.image || '').trim();
  const status = data.status ? String(data.status) : 'active';

  return {
    id,
    schoolId: String(data.schoolId || ''),
    itemName,
    description: String(data.description || ''),
    price: Number(data.price) || 0,
    stock,
    imageUrl,
    image: imageUrl,
    status,
    createdAt: data.createdAt as StoreProduct['createdAt'],
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
  };
}

export function isActiveStoreProduct(product: { status?: string }): boolean {
  const status = product.status;
  return !status || status === 'active';
}

export function getProductImageUrl(product: {
  imageUrl?: string;
  image?: string;
}): string {
  return (product.imageUrl || product.image || '').trim();
}

export function getProductName(product: {
  itemName?: string;
  name?: string;
  title?: string;
}): string {
  return (product.itemName || product.name || product.title || '').trim();
}

export function getProductStock(product: {
  stock?: number;
  quantity?: number;
}): number {
  if (typeof product.stock === 'number') return product.stock;
  if (typeof product.quantity === 'number') return product.quantity;
  return 0;
}

export function isPersistableImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function buildStoreImageStoragePath(
  schoolId: string,
  filename: string,
): string {
  let safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  if (!/\.(jpe?g|png|webp|gif)$/i.test(safe)) {
    safe = `${safe || 'product'}.jpg`;
  }
  return `schools/${schoolId}/store/products/${Date.now()}-${safe}`;
}

export function mergeStoreProducts(
  primary: StoreProduct[],
  legacy: StoreProduct[],
): StoreProduct[] {
  const map = new Map<string, StoreProduct>();
  legacy.forEach((p) => {
    if (isActiveStoreProduct(p)) map.set(p.id, p);
  });
  primary.forEach((p) => {
    if (isActiveStoreProduct(p)) map.set(p.id, p);
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      ((b.createdAt as { seconds?: number })?.seconds || 0) -
      ((a.createdAt as { seconds?: number })?.seconds || 0),
  );
}

export function mergeAllStoreProducts(
  primary: StoreProduct[],
  legacy: StoreProduct[],
): StoreProduct[] {
  const map = new Map<string, StoreProduct>();
  legacy.forEach((p) => map.set(p.id, p));
  primary.forEach((p) => map.set(p.id, p));
  return Array.from(map.values()).sort(
    (a, b) =>
      ((b.createdAt as { seconds?: number })?.seconds || 0) -
      ((a.createdAt as { seconds?: number })?.seconds || 0),
  );
}

export function subscribeSchoolStoreProducts(
  schoolId: string,
  onProducts: (products: StoreProduct[]) => void,
  options?: { includeInactive?: boolean; onError?: (err: unknown) => void },
): () => void {
  let marketItems: StoreProduct[] = [];
  let legacyItems: StoreProduct[] = [];

  const emit = () => {
    const merged = options?.includeInactive
      ? mergeAllStoreProducts(marketItems, legacyItems)
      : mergeStoreProducts(marketItems, legacyItems);
    onProducts(merged);
  };

  const marketQ = query(
    collection(db, STORE_COLLECTION),
    where('schoolId', '==', schoolId),
    limit(200),
  );
  const legacyQ = query(
    collection(db, LEGACY_STORE_COLLECTION),
    where('schoolId', '==', schoolId),
    limit(200),
  );

  const unsubMarket = onSnapshot(
    marketQ,
    (snap) => {
      marketItems = snap.docs.map((d) =>
        normalizeStoreProduct(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    options?.onError,
  );

  const unsubLegacy = onSnapshot(
    legacyQ,
    (snap) => {
      legacyItems = snap.docs.map((d) =>
        normalizeStoreProduct(d.id, d.data() as Record<string, unknown>),
      );
      emit();
    },
    options?.onError,
  );

  return () => {
    unsubMarket();
    unsubLegacy();
  };
}

export async function uploadStoreProductImage(
  file: File,
  schoolId: string,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }
  if (file.size > MAX_STORE_IMAGE_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  const path = buildStoreImageStoragePath(schoolId, file.name || 'product.jpg');
  return uploadImageViaStorageOrServer(file, path, 800, 800);
}

export function buildStoreProductCreatePayload(
  form: {
    itemName: string;
    price: number;
    description: string;
    stock: number;
    imageUrl: string;
  },
  profile: { uid: string; schoolId: string },
) {
  const imageUrl = isPersistableImageUrl(form.imageUrl)
    ? form.imageUrl.trim()
    : '';

  return {
    itemName: form.itemName.trim(),
    name: form.itemName.trim(),
    title: form.itemName.trim(),
    description: form.description.trim(),
    price: Number(form.price) || 0,
    stock: Number(form.stock) || 0,
    quantity: Number(form.stock) || 0,
    imageUrl: imageUrl || null,
    image: imageUrl || null,
    status: 'active',
    schoolId: profile.schoolId,
    createdBy: profile.uid,
    createdAt: serverTimestamp(),
  };
}

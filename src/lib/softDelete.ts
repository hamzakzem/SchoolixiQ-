import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type SoftDeleteMeta = {
  isDeleted: true;
  deletedAt: ReturnType<typeof serverTimestamp>;
  deletedBy: string;
  deletedByName: string;
};

export function isRecordDeleted(data: Record<string, unknown> | undefined | null): boolean {
  return Boolean(data?.isDeleted);
}

export function filterActiveRecords<T extends { isDeleted?: boolean }>(records: T[]): T[] {
  return records.filter((r) => !r.isDeleted);
}

export async function softDeleteDocument(
  collectionName: string,
  docId: string,
  actor: { uid: string; name: string },
): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: actor.uid,
    deletedByName: actor.name,
  });
}

export async function restoreDocument(collectionName: string, docId: string): Promise<void> {
  await updateDoc(doc(db, collectionName, docId), {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedByName: null,
    restoredAt: serverTimestamp(),
  });
}

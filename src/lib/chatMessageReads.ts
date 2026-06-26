import { doc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import {
  handleResourceExhausted,
  isQuotaWritePaused,
  isResourceExhaustedError,
  logWriteSkippedDuplicate,
} from './firestoreQuota';

const markedSystemMessageReadIds = new Set<string>();
const BATCH_SIZE = 20;

export function markSystemMessagesRead(
  messageIds: string[],
  source: string,
): void {
  if (isQuotaWritePaused()) return;

  const pending = messageIds.filter((id) => id && !markedSystemMessageReadIds.has(id));
  if (pending.length === 0) {
    logWriteSkippedDuplicate('chat_mark_read', { source, count: 0 });
    return;
  }

  for (const id of pending) {
    markedSystemMessageReadIds.add(id);
  }

  const flushBatch = async (ids: string[]) => {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.update(doc(db, 'system_messages', id), { read: true });
    }
    try {
      await batch.commit();
    } catch (error) {
      if (isResourceExhaustedError(error)) {
        for (const id of ids) markedSystemMessageReadIds.delete(id);
        handleResourceExhausted(`chat_mark_read:${source}`);
        return;
      }
      for (const id of ids) markedSystemMessageReadIds.delete(id);
      console.warn('[ChatRead] batch mark read failed', { source, count: ids.length, error });
    }
  };

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    void flushBatch(pending.slice(i, i + BATCH_SIZE));
  }
}

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export type ChatDeleteActor = {
  uid: string;
  role: string;
  schoolId?: string;
};

export function canDeleteChatMessage(
  msg: Record<string, unknown>,
  actor: ChatDeleteActor,
): boolean {
  if (msg.deleted === true) return false;

  const role = (actor.role ?? '').toLowerCase();
  const senderId = String(msg.senderId ?? '');

  if (senderId === actor.uid) return true;

  if (role === 'superadmin' || role === 'super_admin') return true;

  if (['admin', 'school_admin', 'assistant'].includes(role)) {
    const msgSchool = String(msg.schoolId ?? '');
    return !!actor.schoolId && actor.schoolId === msgSchool;
  }

  return false;
}

export async function softDeleteChatMessage(
  messageId: string,
  actor: ChatDeleteActor,
): Promise<void> {
  await updateDoc(doc(db, 'system_messages', messageId), {
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: actor.uid,
  });
}

export const DELETED_MESSAGE_LABEL_AR = 'تم حذف هذه الرسالة';
export const DELETED_MESSAGE_LABEL_EN = 'This message was deleted';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { resolveMessagingAccess } from './messagingAccess';

export type ChatDeleteActor = {
  uid: string;
  role: string;
  schoolId?: string;
  permissions?: string[] | Record<string, boolean>;
};

export function canDeleteChatMessage(
  msg: Record<string, unknown>,
  actor: ChatDeleteActor,
): boolean {
  if (msg.deleted === true) return false;

  const access = resolveMessagingAccess({
    role: actor.role,
    schoolId: actor.schoolId || '',
    permissions: actor.permissions,
  });

  const senderId = String(msg.senderId ?? '');
  if (senderId === actor.uid) return access.canSoftDelete;

  if (access.canDelete || access.role === 'superadmin') return true;

  if (
    ['admin', 'school_admin', 'assistant', 'school_assistant', 'staff'].includes(
      access.role,
    )
  ) {
    const msgSchool = String(msg.schoolId ?? '');
    return !!actor.schoolId && actor.schoolId === msgSchool && access.canSoftDelete;
  }

  return false;
}

/** Soft delete only — permanent delete goes through adminPermanentDeleteMessage API. */
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

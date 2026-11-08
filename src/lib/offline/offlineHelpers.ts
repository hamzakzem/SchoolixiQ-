import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { OfflineActor } from './offlineTypes';
import { createClientMutationId } from './offlineSync';
import { buildConversationPrivacyStamp } from '../conversationPrivacy';
import { withMessageRetentionFields } from '../dataRetention';

export type SendChatMessageInput = {
  actor: OfflineActor;
  conversationId: string;
  schoolId: string;
  receiverId: string;
  senderName: string;
  senderRole: string;
  content: string;
  fileUrl?: string | null;
  fileType?: string | null;
  fileName?: string | null;
  /** Defaults: school→platform = platform_operations; else school_private */
  visibility?: 'superadmin_private' | 'platform_operations' | 'school_private';
};

export async function sendChatMessageOfflineSafe(
  input: SendChatMessageInput,
): Promise<{ mode: 'online' | 'queued'; messageId: string }> {
  const clientMutationId = createClientMutationId();
  const visibility =
    input.visibility ||
    (input.receiverId === 'super_admin'
      ? 'platform_operations'
      : 'school_private');
  const privacyStamp = buildConversationPrivacyStamp({
    ownerUserId: input.actor.userId,
    ownerRole: input.senderRole,
    visibility,
    schoolId: input.schoolId,
  });

  const messageData = withMessageRetentionFields({
    conversationId: input.conversationId,
    schoolId: input.schoolId,
    senderId: input.actor.userId,
    senderName: input.senderName,
    senderRole: input.senderRole,
    receiverId: input.receiverId,
    content: input.content,
    fileUrl: input.fileUrl ?? null,
    fileType: input.fileType ?? null,
    fileName: input.fileName ?? null,
    createdAt: serverTimestamp(),
    read: false,
    clientMutationId,
    messageStatus: 'sent',
    ...privacyStamp,
  });

  // Firestore's own write queue: the message shows in the thread at once (with a
  // "sending" clock) and is delivered when the connection returns. The app's separate
  // offline queue hid the message and did not deliver it after reconnecting.
  const messageRef = doc(collection(db, 'system_messages'));
  const conversationRef = doc(db, 'conversations', input.conversationId);
  const messageWrite = setDoc(messageRef, messageData);
  const conversationWrite = setDoc(
    conversationRef,
    {
      conversationId: input.conversationId,
      schoolId: input.schoolId,
      participants: ['admin', input.receiverId === 'super_admin' ? 'super_admin' : input.receiverId],
      lastMessage: input.content,
      updatedAt: serverTimestamp(),
      clientMutationId,
      ...privacyStamp,
    },
    { merge: true },
  );
  await Promise.all([messageWrite, conversationWrite]);

  return { mode: 'online', messageId: messageRef.id };
}

export function offlineActorFromProfile(profile: {
  uid: string;
  role?: string;
  schoolId?: string;
}): OfflineActor {
  return {
    userId: profile.uid,
    role: String(profile.role ?? 'unknown'),
    schoolId: String(profile.schoolId ?? ''),
  };
}

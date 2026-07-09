import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { OfflineActor } from './offlineTypes';
import {
  createClientMutationId,
  safeFirestoreAdd,
  safeFirestoreSet,
} from './offlineSync';
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
    messageStatus: 'pending_local',
    ...privacyStamp,
  });

  const messageResult = await safeFirestoreAdd('system_messages', messageData, {
    module: 'messages',
    actor: input.actor,
    clientMutationId,
  });

  const conversationRef = doc(db, 'conversations', input.conversationId);
  await safeFirestoreSet(
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
    { module: 'messages', actor: input.actor, clientMutationId },
    { merge: true },
  );

  return { mode: messageResult.mode, messageId: messageResult.id };
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

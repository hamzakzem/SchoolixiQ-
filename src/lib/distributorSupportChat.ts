import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export const DISTRIBUTOR_SUPPORT_CONVERSATIONS = 'distributor_support_conversations';
export const DISTRIBUTOR_SUPPORT_MESSAGES = 'distributor_support_messages';

export type DistributorSupportMessage = {
  id: string;
  conversationId: string;
  conversationType: 'distributor_support';
  distributorId: string;
  senderId: string;
  senderRole: 'distributor' | 'superadmin';
  senderName?: string;
  text: string;
  createdAt?: unknown;
  read?: boolean;
  readBy?: string[];
  schoolId?: null;
};

export type DistributorSupportConversation = {
  id: string;
  conversationId: string;
  conversationType: 'distributor_support';
  distributorId: string;
  distributorUserId?: string;
  distributorName?: string;
  participants: string[];
  lastMessage?: string;
  updatedAt?: unknown;
  unreadForSuperAdmin?: number;
  unreadForDistributor?: number;
};

export function distributorConversationId(distributorId: string) {
  return `dist_${distributorId}`;
}

export async function ensureDistributorSupportConversation(params: {
  distributorId: string;
  distributorUserId: string;
  distributorName: string;
}) {
  const conversationId = distributorConversationId(params.distributorId);
  const ref = doc(db, DISTRIBUTOR_SUPPORT_CONVERSATIONS, conversationId);
  const snap = await getDoc(ref);
  if (snap.exists()) return conversationId;

  await setDoc(ref, {
    conversationId,
    conversationType: 'distributor_support',
    distributorId: params.distributorId,
    distributorUserId: params.distributorUserId,
    distributorName: params.distributorName,
    participants: [params.distributorUserId, 'super_admin'],
    lastMessage: '',
    updatedAt: serverTimestamp(),
    unreadForSuperAdmin: 0,
    unreadForDistributor: 0,
    schoolId: null,
  });
  return conversationId;
}

export async function sendDistributorSupportMessage(params: {
  conversationId: string;
  distributorId: string;
  senderId: string;
  senderRole: 'distributor' | 'superadmin';
  senderName?: string;
  text: string;
}) {
  const trimmed = params.text.trim();
  if (!trimmed) return;

  await addDoc(collection(db, DISTRIBUTOR_SUPPORT_MESSAGES), {
    conversationId: params.conversationId,
    conversationType: 'distributor_support',
    distributorId: params.distributorId,
    senderId: params.senderId,
    senderRole: params.senderRole,
    senderName: params.senderName || '',
    text: trimmed,
    createdAt: serverTimestamp(),
    read: false,
    readBy: [params.senderId],
    schoolId: null,
  });

  const convRef = doc(db, DISTRIBUTOR_SUPPORT_CONVERSATIONS, params.conversationId);
  const patch: Record<string, unknown> = {
    lastMessage: trimmed,
    updatedAt: serverTimestamp(),
  };
  if (params.senderRole === 'distributor') {
    patch.unreadForSuperAdmin = 1;
  } else {
    patch.unreadForDistributor = 1;
  }
  await updateDoc(convRef, patch).catch(async () => {
    await setDoc(convRef, {
      conversationId: params.conversationId,
      conversationType: 'distributor_support',
      distributorId: params.distributorId,
      participants: [params.senderId, 'super_admin'],
      ...patch,
    }, { merge: true });
  });
}

export function subscribeDistributorSupportMessages(
  conversationId: string,
  onData: (messages: DistributorSupportMessage[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, DISTRIBUTOR_SUPPORT_MESSAGES),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DistributorSupportMessage, 'id'>) })),
      );
    },
    (err) => onError?.(err),
  );
}

export function subscribeDistributorSupportConversations(
  onData: (rows: DistributorSupportConversation[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, DISTRIBUTOR_SUPPORT_CONVERSATIONS),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DistributorSupportConversation, 'id'>) })),
      );
    },
    (err) => onError?.(err),
  );
}

export function subscribeDistributorOwnConversation(
  distributorId: string,
  onData: (row: DistributorSupportConversation | null) => void,
): Unsubscribe {
  const conversationId = distributorConversationId(distributorId);
  return onSnapshot(doc(db, DISTRIBUTOR_SUPPORT_CONVERSATIONS, conversationId), (snap) => {
    onData(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<DistributorSupportConversation, 'id'>) } : null);
  });
}

export async function markDistributorMessagesRead(params: {
  conversationId: string;
  readerId: string;
  readerRole: 'distributor' | 'superadmin';
}) {
  const convRef = doc(db, DISTRIBUTOR_SUPPORT_CONVERSATIONS, params.conversationId);
  const patch =
    params.readerRole === 'superadmin'
      ? { unreadForSuperAdmin: 0 }
      : { unreadForDistributor: 0 };
  await updateDoc(convRef, patch).catch(() => undefined);
}

import type { MutableRefObject } from 'react';
import {
  collection,
  limit,
  orderBy,
  query,
  where,
  type Query,
} from 'firebase/firestore';
import { db } from './firebase';

/** Recent messages only — avoids loading full thread history on open. */
export const CHAT_MESSAGES_LIMIT = 80;

export type ThreadMessage = {
  id: string;
  read?: boolean;
  receiverId?: string;
  createdAt?: { toMillis?: () => number };
  [key: string]: unknown;
};

/** Super Admin — full thread (legacy + privacy-stamped). */
export function buildThreadMessagesQuery(
  schoolId: string,
  conversationId: string,
): Query {
  return query(
    collection(db, 'system_messages'),
    where('schoolId', '==', schoolId),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'desc'),
    limit(CHAT_MESSAGES_LIMIT),
  );
}

/** Platform Assistant — ops thread (privacy-enforced at query layer). */
export function buildPlatformOpsThreadMessagesQuery(
  schoolId: string,
  conversationId: string,
): Query {
  return query(
    collection(db, 'system_messages'),
    where('schoolId', '==', schoolId),
    where('conversationId', '==', conversationId),
    where('conversationPrivacy.visibility', '==', 'platform_operations'),
    orderBy('createdAt', 'desc'),
    limit(CHAT_MESSAGES_LIMIT),
  );
}

/** Platform Assistant — private SA→assistant thread. */
export function buildAssistantPrivateThreadMessagesQuery(
  conversationId: string,
  assistantUid: string,
): Query {
  return query(
    collection(db, 'system_messages'),
    where('conversationId', '==', conversationId),
    where('conversationPrivacy.visibility', '==', 'platform_assistant_private'),
    where('conversationPrivacy.ownerUserId', '==', assistantUid),
    orderBy('createdAt', 'desc'),
    limit(CHAT_MESSAGES_LIMIT),
  );
}

/** Platform Assistant inbox — platform_operations conversations only. */
export function buildPlatformOpsConversationsQuery(): Query {
  return query(
    collection(db, 'conversations'),
    where('conversationPrivacy.visibility', '==', 'platform_operations'),
    orderBy('updatedAt', 'desc'),
  );
}

/** Platform Assistant inbox — direct private threads with Super Admin. */
export function buildAssistantPrivateConversationsQuery(
  assistantUid: string,
): Query {
  return query(
    collection(db, 'conversations'),
    where('conversationPrivacy.visibility', '==', 'platform_assistant_private'),
    where('conversationPrivacy.ownerUserId', '==', assistantUid),
    orderBy('updatedAt', 'desc'),
  );
}

/** Platform Assistant — unread ops messages (privacy-only). */
export function buildPlatformOpsUnreadMessagesQuery(): Query {
  return query(
    collection(db, 'system_messages'),
    where('conversationPrivacy.visibility', '==', 'platform_operations'),
    where('read', '==', false),
  );
}

export function sortThreadMessagesChronological<T extends ThreadMessage>(
  docs: T[],
): T[] {
  return [...docs].sort((a, b) => {
    const timeA = a.createdAt?.toMillis?.() ?? 0;
    const timeB = b.createdAt?.toMillis?.() ?? 0;
    return timeA - timeB;
  });
}

function threadMessagesSignature(docs: ThreadMessage[]): string {
  if (docs.length === 0) return '0';
  const last = docs[docs.length - 1];
  const unread = docs.filter((m) => !m.read).length;
  return `${docs.length}:${last.id}:${unread}`;
}

/** Skip setState when snapshot payload is unchanged — reduces render storms. */
export function applyThreadMessagesIfChanged<T extends ThreadMessage>(
  incoming: T[],
  signatureRef: MutableRefObject<string>,
  setMessages: (docs: T[]) => void,
): T[] {
  const sorted = sortThreadMessagesChronological(incoming);
  const sig = threadMessagesSignature(sorted);
  if (sig !== signatureRef.current) {
    signatureRef.current = sig;
    setMessages(sorted);
  }
  return sorted;
}

export function unreadIdsForReceiver(
  docs: ThreadMessage[],
  receiverIds: string[],
): string[] {
  const allowed = new Set(receiverIds);
  return docs
    .filter((m) => !m.read && m.receiverId && allowed.has(m.receiverId))
    .map((m) => m.id);
}

/** Mark read only when the unread set changes — avoids re-firing on every snapshot. */
export function shouldMarkThreadUnread(
  unreadIds: string[],
  lastUnreadKeyRef: MutableRefObject<string>,
): boolean {
  if (unreadIds.length === 0) {
    lastUnreadKeyRef.current = '';
    return false;
  }
  const key = unreadIds.slice().sort().join(',');
  if (key === lastUnreadKeyRef.current) return false;
  lastUnreadKeyRef.current = key;
  return true;
}

/**
 * "Open this conversation": set when a message notification is opened, read by the
 * chat screens so they select the sender's thread instead of only showing the list.
 */
export type ChatFocusTarget = {
  senderId?: string;
  schoolId?: string;
  conversationId?: string;
  senderRole?: string;
  at: number;
};

const KEY = 'schoolix_chat_focus';
const EVENT = 'schoolix-chat-focus';
const MAX_AGE_MS = 2 * 60 * 1000;

export function requestChatFocus(target: Omit<ChatFocusTarget, 'at'>): void {
  if (typeof window === 'undefined') return;
  if (!target.senderId && !target.schoolId && !target.conversationId) return;
  const value: ChatFocusTarget = { ...target, at: Date.now() };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Read and clear the pending focus (ignored when older than two minutes). */
export function takeChatFocus(): ChatFocusTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const value = JSON.parse(raw) as ChatFocusTarget;
    return Date.now() - value.at <= MAX_AGE_MS ? value : null;
  } catch {
    return null;
  }
}

export function peekChatFocus(): ChatFocusTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as ChatFocusTarget;
    return Date.now() - value.at <= MAX_AGE_MS ? value : null;
  } catch {
    return null;
  }
}

export function subscribeChatFocus(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Build a focus target from a notification document. */
export function chatFocusFromNotification(n: Record<string, unknown>): Omit<ChatFocusTarget, 'at'> {
  const meta = (n.metadata && typeof n.metadata === 'object' ? n.metadata : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    senderId: str(meta.senderId) ?? str(n.senderId),
    schoolId: str(meta.schoolId) ?? str(n.schoolId),
    conversationId: str(meta.conversationId),
    senderRole: str(meta.senderRole),
  };
}

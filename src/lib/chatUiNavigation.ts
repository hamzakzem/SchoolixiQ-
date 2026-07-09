/** UI-only chat navigation helpers — no message/Firebase logic. */

export type ChatDevice = 'mobile' | 'tablet' | 'desktop';

export type ChatBackAction =
  | 'show-list'
  | 'clear-conversation'
  | 'clear-and-show-list'
  | 'leave-chat-tab'
  | 'noop';

export function getChatDevice(): ChatDevice {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

/** Tablet (768+) and desktop — split sidebar + thread like Slack / Teams */
export function isChatTwoColumnLayout(): boolean {
  return typeof window !== 'undefined' && window.innerWidth >= 768;
}

/** Phone-only single-surface navigation */
export function isChatMobileLayout(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export type ChatBackInput = {
  hasActiveConversation: boolean;
  mobileShowChat: boolean;
  activeTab?: string;
};

export function resolveChatBackAction(input: ChatBackInput): ChatBackAction {
  const device = getChatDevice();
  const { hasActiveConversation, mobileShowChat } = input;

  if (device === 'desktop' || device === 'tablet') {
    if (hasActiveConversation) return 'clear-conversation';
    return 'leave-chat-tab';
  }

  // Mobile — single-column detail mode: return to list first
  if (mobileShowChat) {
    return 'show-list';
  }

  return 'leave-chat-tab';
}

export function shouldShowChatBackButton(
  hasActiveConversation: boolean,
  mobileShowChat: boolean,
): boolean {
  if (!hasActiveConversation) return false;
  if (!isChatMobileLayout()) return false;
  return mobileShowChat;
}

export function logChatBackVisible(
  device: ChatDevice,
  reason: string,
): void {
  console.info('[ChatUI] BACK_VISIBLE', { device, reason });
}

export function logChatBackClicked(
  device: ChatDevice,
  hasActiveConversation: boolean,
  activeTab?: string,
): void {
  console.info('[ChatUI] BACK_CLICKED', {
    device,
    hasActiveConversation,
    activeTab: activeTab ?? 'chat',
  });
}

export function logChatBackResolved(action: ChatBackAction): void {
  console.info('[ChatUI] BACK_RESOLVED', { action });
}

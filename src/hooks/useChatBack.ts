import { useCallback, useEffect } from 'react';
import { registerChatBackHandler } from '../lib/chatUiBridge';
import {
  getChatDevice,
  logChatBackClicked,
  logChatBackResolved,
  resolveChatBackAction,
  type ChatBackAction,
} from '../lib/chatUiNavigation';

export type UseChatBackOptions = {
  activeTab?: string;
  activeContact: { id: string } | null;
  mobileShowChat: boolean;
  setMobileShowChat: (show: boolean) => void;
  setActiveContact: (contact: null) => void;
  onLeaveChatTab?: () => void;
  /** When false, desktop clearing selection is skipped (e.g. admin auto-pinned contact). */
  allowClearOnDesktop?: boolean;
};

export function useChatBack({
  activeTab = 'chat',
  activeContact,
  mobileShowChat,
  setMobileShowChat,
  setActiveContact,
  onLeaveChatTab,
  allowClearOnDesktop = true,
}: UseChatBackOptions): () => boolean {
  const handleChatBack = useCallback((): boolean => {
    const device = getChatDevice();
    const hasActiveConversation = !!activeContact;
    logChatBackClicked(device, hasActiveConversation, activeTab);

    let action = resolveChatBackAction({ hasActiveConversation, mobileShowChat, activeTab });

    if (device === 'desktop' && action === 'clear-conversation' && !allowClearOnDesktop) {
      action = 'leave-chat-tab';
    }

    const apply = (resolved: ChatBackAction) => {
      logChatBackResolved(resolved);
    };

    switch (action) {
      case 'clear-conversation':
        setActiveContact(null);
        apply(action);
        return true;
      case 'clear-and-show-list':
        setActiveContact(null);
        setMobileShowChat(false);
        apply(action);
        return true;
      case 'show-list':
        setMobileShowChat(false);
        apply(action);
        return true;
      case 'leave-chat-tab':
        onLeaveChatTab?.();
        apply(action);
        return !!onLeaveChatTab;
      case 'noop':
      default:
        apply('noop');
        return false;
    }
  }, [
    activeContact,
    activeTab,
    allowClearOnDesktop,
    mobileShowChat,
    onLeaveChatTab,
    setActiveContact,
    setMobileShowChat,
  ]);

  useEffect(() => {
    registerChatBackHandler(handleChatBack);
    return () => registerChatBackHandler(null);
  }, [handleChatBack]);

  return handleChatBack;
}

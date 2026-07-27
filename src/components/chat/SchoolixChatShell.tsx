import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Profiler,
} from 'react';
import { flattenGroupedMessages } from './chatHelpers';
import { ChatLayout } from './ChatLayout';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import {
  getChatDevice,
  isChatMobileLayout,
  logChatBackVisible,
  shouldShowChatBackButton,
} from '../../lib/chatUiNavigation';
import { enterChatMode, leaveChatMode, logChatInteractionOk } from '../../lib/chatFreezeGuard';
import { recordChatRender } from '../../lib/chatPerf';
import {
  cancelChatScroll,
  scheduleChatScrollToBottom,
} from '../../lib/chatScrollHelper';
import {
  canDeleteChatMessage,
  softDeleteChatMessage,
  type ChatDeleteActor,
} from '../../lib/chatMessageDelete';
import { toast } from 'react-hot-toast';

export type ChatShellContact = {
  id: string;
  name: string;
  type?: string;
  role?: string;
  subtitle?: string;
  extra?: Record<string, unknown>;
};

export type ReplyPreview = {
  messageId: string;
  content: string;
  label: string;
};

export type SchoolixChatShellProps = {
  isRtl: boolean;
  listTitle: string;
  searchPlaceholder: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  contacts: ChatShellContact[];
  unreadCounts: Record<string, number>;
  lastInteractionTimes?: Record<string, number>;
  lastMessageSnippets?: Record<string, string>;
  activeContact: ChatShellContact | null;
  onSelectContact: (contact: ChatShellContact) => void;
  mobileShowChat: boolean;
  /** @deprecated use onChatBack */
  onMobileBack?: () => void;
  onChatBack?: () => void;
  groupedMessages: Record<string, unknown[]>;
  isOutgoingMessage: (msg: Record<string, unknown>) => boolean;
  formatMessageTime: (timestamp: unknown) => string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  isSending: boolean;
  selectedFile: File | null;
  onClearFile: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  headerStatusText?: string;
  isLoadingContacts?: boolean;
  isLoadingMessages?: boolean;
  messagesLoadError?: boolean;
  disableAttachments?: boolean;
  inputPlaceholder?: string;
  listHeaderAction?: React.ReactNode;
  listTopContent?: React.ReactNode;
  headerTrailing?: React.ReactNode;
  renderListAvatar: (contact: ChatShellContact, isSelected: boolean) => React.ReactNode;
  renderHeaderAvatar?: () => React.ReactNode;
  renderIncomingMessageAvatar?: () => React.ReactNode;
  renderOutgoingMessageAvatar?: () => React.ReactNode;
  renderContactMeta?: (contact: ChatShellContact) => React.ReactNode;
  renderRoleBadge?: (contact: ChatShellContact) => React.ReactNode;
  emptyListMessage?: string;
  emptyListDescription?: string;
  emptyThreadMessage?: string;
  showEmptyThreadIntro?: boolean;
  renderEmptyThreadIntro?: () => React.ReactNode;
  chatActor?: ChatDeleteActor | null;
  /** Super Admin hard-delete via Admin API */
  onPermanentDeleteMessage?: (msg: Record<string, unknown>) => Promise<void> | void;
  canPermanentDelete?: boolean;
  onOpenChatSettings?: () => void;
  onThreadSearchControls?: (controls: { open: () => void }) => void;
};

const SCROLL_THRESHOLD = 80;

export function SchoolixChatShell({
  isRtl,
  listTitle,
  searchPlaceholder,
  searchTerm,
  onSearchChange,
  contacts,
  unreadCounts,
  lastInteractionTimes = {},
  lastMessageSnippets = {},
  activeContact,
  onSelectContact,
  mobileShowChat,
  onMobileBack,
  onChatBack,
  groupedMessages,
  isOutgoingMessage,
  formatMessageTime,
  messagesEndRef,
  newMessage,
  onNewMessageChange,
  onSendMessage,
  isSending,
  selectedFile,
  onClearFile,
  onFileChange,
  fileInputRef,
  headerStatusText,
  isLoadingContacts = false,
  isLoadingMessages = false,
  messagesLoadError = false,
  disableAttachments = false,
  inputPlaceholder,
  listHeaderAction,
  listTopContent,
  headerTrailing,
  renderListAvatar,
  renderHeaderAvatar,
  renderIncomingMessageAvatar,
  renderOutgoingMessageAvatar,
  renderContactMeta,
  renderRoleBadge,
  emptyListMessage,
  emptyListDescription,
  emptyThreadMessage,
  showEmptyThreadIntro = true,
  renderEmptyThreadIntro,
  chatActor,
  onPermanentDeleteMessage,
  canPermanentDelete = false,
  onOpenChatSettings,
  onThreadSearchControls,
}: SchoolixChatShellProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const handleDeleteMessage = useCallback(
    async (msg: Record<string, unknown>) => {
      if (!chatActor) return;
      const msgId = String(msg.id ?? '');
      if (!msgId || !canDeleteChatMessage(msg, chatActor)) {
        toast.error(isRtl ? 'لا يمكنك حذف هذه الرسالة' : 'You cannot delete this message');
        return;
      }
      if (
        !window.confirm(isRtl ? 'حذف الرسالة؟' : 'Delete this message?')
      ) {
        return;
      }
      try {
        await softDeleteChatMessage(msgId, chatActor);
        toast.success(isRtl ? 'تم حذف الرسالة' : 'Message deleted');
      } catch (err) {
        console.error('Chat message delete failed:', err);
        toast.error(isRtl ? 'تعذر حذف الرسالة' : 'Could not delete message');
      }
    },
    [chatActor, isRtl],
  );

  const handlePermanentDeleteMessage = useCallback(
    async (msg: Record<string, unknown>) => {
      if (!canPermanentDelete || !onPermanentDeleteMessage) return;
      const msgId = String(msg.id ?? '');
      if (!msgId) return;
      if (
        !window.confirm(
          isRtl
            ? 'حذف نهائي؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Delete permanently? This cannot be undone.',
        )
      ) {
        return;
      }
      try {
        await onPermanentDeleteMessage(msg);
        toast.success(isRtl ? 'تم الحذف النهائي' : 'Permanently deleted');
      } catch (err) {
        console.error('Permanent delete failed:', err);
        toast.error(
          isRtl ? 'تعذر الحذف النهائي' : 'Could not permanently delete',
        );
      }
    },
    [canPermanentDelete, onPermanentDeleteMessage, isRtl],
  );
  const messageElMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrolledContactRef = useRef<string | null>(null);

  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newBelowCount, setNewBelowCount] = useState(0);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  useEffect(() => {
    if (!onThreadSearchControls) return;
    onThreadSearchControls({
      open: () => setThreadSearchOpen(true),
    });
  }, [onThreadSearchControls]);
  const [replyPreview, setReplyPreview] = useState<ReplyPreview | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showEmojiStrip, setShowEmojiStrip] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);

  const flatMessages = useMemo(
    () => flattenGroupedMessages(groupedMessages),
    [groupedMessages],
  );
  const messageCount = flatMessages.length;

  const searchMatches = useMemo(() => {
    const q = threadSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return flatMessages.filter((m) => m.content.toLowerCase().includes(q));
  }, [flatMessages, threadSearchQuery]);

  const defaultHeaderStatus = isRtl ? 'محادثة' : 'Conversation';
  const statusText = headerStatusText ?? defaultHeaderStatus;
  const emptyList = emptyListMessage ?? (isRtl ? 'لا توجد محادثات بعد' : 'No conversations yet');
  const emptyThread =
    emptyThreadMessage ?? (isRtl ? 'اختر محادثة للبدء' : 'Select a conversation to start');
  const messagesError = isRtl ? 'تعذر تحميل الرسائل' : 'Could not load messages';
  const placeholder = inputPlaceholder ?? (isRtl ? 'اكتب رسالة...' : 'Type a message...');
  const attachSoon = isRtl ? 'إرسال الملفات قريباً' : 'File uploads coming soon';

  const showMessageSkeleton =
    (isLoadingMessages || threadLoading) && messageCount === 0 && !messagesLoadError;

  useEffect(() => {
    enterChatMode('SchoolixChatShell');
    console.info('[ChatFreeze] LISTENER_SETUP', { component: 'SchoolixChatShell' });
    logChatInteractionOk({ surface: 'chat-shell' });
    return () => {
      console.info('[ChatFreeze] LISTENER_CLEANUP', { component: 'SchoolixChatShell' });
      cancelChatScroll(scrollRafRef);
      leaveChatMode('SchoolixChatShell');
    };
  }, []);

  useEffect(() => {
    setThreadSearchOpen(false);
    setThreadSearchQuery('');
    setReplyPreview(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setNewBelowCount(0);
    setThreadLoading(true);
    prevMessageCountRef.current = 0;
    lastScrolledContactRef.current = null;
  }, [activeContact?.id]);

  useEffect(() => {
    if (messageCount > 0 || messagesLoadError) {
      setThreadLoading(false);
    }
  }, [messageCount, messagesLoadError]);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      scheduleChatScrollToBottom(messagesContainerRef, messagesEndRef, {
        smooth,
        rafRef: scrollRafRef,
      });
      setNewBelowCount(0);
      setShowScrollDown(false);
      isNearBottomRef.current = true;
    },
    [messagesEndRef],
  );

  useEffect(() => {
    if (!activeContact?.id) return;
    if (lastScrolledContactRef.current === activeContact.id) return;
    lastScrolledContactRef.current = activeContact.id;
    scrollToBottom(false);
  }, [activeContact?.id, scrollToBottom]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    if (messageCount > prev && (prev === 0 || isNearBottomRef.current)) {
      scrollToBottom(prev > 0);
    }
    if (messageCount > prev && prev > 0 && !isNearBottomRef.current) {
      setNewBelowCount((c) => c + (messageCount - prev));
    }
    prevMessageCountRef.current = messageCount;
  }, [messageCount, scrollToBottom]);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist < SCROLL_THRESHOLD;
    isNearBottomRef.current = near;
    setShowScrollDown(!near);
    if (near) setNewBelowCount(0);
  }, []);

  const scrollToSearchMatch = useCallback(
    (index: number) => {
      if (searchMatches.length === 0) return;
      const safe = ((index % searchMatches.length) + searchMatches.length) % searchMatches.length;
      setSearchMatchIndex(safe);
      const id = searchMatches[safe].id;
      const el = messageElMap.current.get(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [searchMatches],
  );

  useEffect(() => {
    if (threadSearchQuery.trim() && searchMatches.length > 0) {
      scrollToSearchMatch(0);
    }
  }, [threadSearchQuery, searchMatches.length, scrollToSearchMatch]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      else setSelectionMode(true);
      return next;
    });
  }, []);

  const handleReply = useCallback(
    (msg: Record<string, unknown>) => {
      const content = String(msg.content ?? '');
      if (!content) return;
      setReplyPreview({
        messageId: String(msg.id),
        content,
        label: activeContact?.name ?? (isRtl ? 'رسالة' : 'Message'),
      });
      textareaRef.current?.focus();
    },
    [activeContact?.name, isRtl],
  );

  const handleSendWrapped = useCallback(
    (e: React.FormEvent) => {
      onSendMessage(e);
      setReplyPreview(null);
    },
    [onSendMessage],
  );

  const copySelected = useCallback(async () => {
    const texts = flatMessages
      .filter((m) => selectedIds.has(m.id))
      .map((m) => m.content)
      .filter(Boolean);
    if (texts.length === 0) return;
    try {
      await navigator.clipboard.writeText(texts.join('\n\n'));
    } catch {
      /* ignore */
    }
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [flatMessages, selectedIds]);

  const insertEmoji = useCallback(
    (emoji: string) => {
      onNewMessageChange(newMessage + emoji);
      textareaRef.current?.focus();
    },
    [newMessage, onNewMessageChange],
  );

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleChatBackClick = onChatBack ?? onMobileBack ?? (() => undefined);

  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== 'undefined' && isChatMobileLayout(),
  );

  useEffect(() => {
    const syncLayout = () => setIsMobileLayout(isChatMobileLayout());
    syncLayout();
    window.addEventListener('resize', syncLayout);
    return () => window.removeEventListener('resize', syncLayout);
  }, []);

  const showThreadBack = useMemo(
    () => shouldShowChatBackButton(!!activeContact, mobileShowChat),
    [activeContact, mobileShowChat],
  );

  useEffect(() => {
    if (!showThreadBack) return;
    const device = getChatDevice();
    logChatBackVisible(
      device,
      isMobileLayout ? 'detail-mode-single-column' : 'detail-mode',
    );
  }, [showThreadBack, isMobileLayout]);

  return (
    <Profiler
      id="SchoolixChatShell"
      onRender={(id, phase, actualDuration) => recordChatRender(id, phase, actualDuration)}
    >
      <ChatLayout
        isRtl={isRtl}
        isMobile={isMobileLayout}
        mobileShowChat={mobileShowChat}
        listPanel={
          <ConversationList
            isRtl={isRtl}
            listTitle={listTitle}
            searchPlaceholder={searchPlaceholder}
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            contacts={contacts}
            unreadCounts={unreadCounts}
            lastInteractionTimes={lastInteractionTimes}
            lastMessageSnippets={lastMessageSnippets}
            activeContact={activeContact}
            onSelectContact={onSelectContact}
            isLoadingContacts={isLoadingContacts}
            listHeaderAction={listHeaderAction}
            listTopContent={listTopContent}
            renderListAvatar={renderListAvatar}
            renderRoleBadge={renderRoleBadge}
            renderContactMeta={renderContactMeta}
            emptyListTitle={emptyList}
            emptyListDescription={emptyListDescription}
          />
        }
        threadPanel={
          <ChatWindow
            isRtl={isRtl}
            activeContact={activeContact}
            emptyThreadMessage={emptyThread}
            showThreadBack={showThreadBack}
            onChatBack={handleChatBackClick}
            renderHeaderAvatar={renderHeaderAvatar}
            renderIncomingMessageAvatar={renderIncomingMessageAvatar}
            renderOutgoingMessageAvatar={renderOutgoingMessageAvatar}
            renderRoleBadge={renderRoleBadge}
            headerStatusText={statusText}
            headerTrailing={headerTrailing}
            isSending={isSending}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onExitSelection={exitSelection}
            onCopySelected={copySelected}
            threadSearchOpen={threadSearchOpen}
            onToggleThreadSearch={() => setThreadSearchOpen((v) => !v)}
            onOpenChatSettings={onOpenChatSettings}
            threadSearchQuery={threadSearchQuery}
            onThreadSearchChange={setThreadSearchQuery}
            searchMatches={searchMatches}
            searchMatchIndex={searchMatchIndex}
            onScrollToSearchMatch={scrollToSearchMatch}
            onCloseThreadSearch={() => {
              setThreadSearchOpen(false);
              setThreadSearchQuery('');
            }}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
            onMessagesScroll={handleMessagesScroll}
            messagesLoadError={messagesLoadError}
            messagesError={messagesError}
            showMessageSkeleton={showMessageSkeleton}
            showEmptyThreadIntro={showEmptyThreadIntro}
            renderEmptyThreadIntro={renderEmptyThreadIntro}
            groupedMessages={groupedMessages}
            messageCount={messageCount}
            isOutgoingMessage={isOutgoingMessage}
            formatMessageTime={formatMessageTime}
            onToggleSelect={(id) => {
              setSelectionMode(true);
              toggleSelect(id);
            }}
            onReply={handleReply}
            onDeleteMessage={handleDeleteMessage}
            chatActor={chatActor}
            onPermanentDeleteMessage={handlePermanentDeleteMessage}
            canPermanentDelete={canPermanentDelete}
            messageElMap={messageElMap}
            showScrollDown={showScrollDown}
            newBelowCount={newBelowCount}
            onScrollToBottom={() => scrollToBottom(true)}
            composerProps={{
              isRtl,
              placeholder,
              newMessage,
              onNewMessageChange,
              onSend: handleSendWrapped,
              isSending,
              selectedFile,
              onClearFile,
              onFileChange,
              fileInputRef,
              disableAttachments,
              attachSoon,
              replyPreview,
              onClearReply: () => setReplyPreview(null),
              showEmojiStrip,
              onToggleEmojiStrip: () => setShowEmojiStrip((v) => !v),
              onInsertEmoji: insertEmoji,
              textareaRef,
            }}
          />
        }
      />
    </Profiler>
  );
}

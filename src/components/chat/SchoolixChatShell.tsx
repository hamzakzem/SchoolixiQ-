import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  Paperclip,
  Search,
  SendHorizontal,
  Smile,
  X,
} from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ContactListSkeleton, MessageListSkeleton } from './ChatSkeletons';
import {
  flattenGroupedMessages,
  QUICK_EMOJIS,
  truncatePreview,
} from './chatHelpers';
import {
  getChatDevice,
  isChatTwoColumnLayout,
  logChatBackVisible,
  shouldShowChatBackButton,
} from '../../lib/chatUiNavigation';

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
  emptyThreadMessage?: string;
  showEmptyThreadIntro?: boolean;
  renderEmptyThreadIntro?: () => React.ReactNode;
};

const SCROLL_THRESHOLD = 80;

function formatListTime(ms: number | undefined, isRtl: boolean): string {
  if (!ms) return '';
  const date = new Date(ms);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

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
  emptyThreadMessage,
  showEmptyThreadIntro = true,
  renderEmptyThreadIntro,
}: SchoolixChatShellProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageElMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevMessageCountRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showScrollDown, setShowScrollDown] = useState(false);
  const [newBelowCount, setNewBelowCount] = useState(0);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
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
  const supportsAttachments = !disableAttachments;

  const showMessageSkeleton =
    (isLoadingMessages || threadLoading) && messageCount === 0 && !messagesLoadError;

  useEffect(() => {
    setThreadSearchOpen(false);
    setThreadSearchQuery('');
    setReplyPreview(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setNewBelowCount(0);
    setThreadLoading(true);
    prevMessageCountRef.current = 0;
  }, [activeContact?.id]);

  useEffect(() => {
    if (messageCount > 0 || messagesLoadError) {
      setThreadLoading(false);
    }
  }, [messageCount, messagesLoadError]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    if (messageCount > prev && prev > 0 && !isNearBottomRef.current) {
      setNewBelowCount((c) => c + (messageCount - prev));
    }
    prevMessageCountRef.current = messageCount;
  }, [messageCount]);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
      setNewBelowCount(0);
      setShowScrollDown(false);
      isNearBottomRef.current = true;
    },
    [messagesEndRef],
  );

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

  const [isNarrowLayout, setIsNarrowLayout] = useState(
    () => typeof window !== 'undefined' && !isChatTwoColumnLayout(),
  );

  useEffect(() => {
    const syncLayout = () => setIsNarrowLayout(!isChatTwoColumnLayout());
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
      isNarrowLayout ? 'detail-mode-single-column' : 'detail-mode',
    );
  }, [showThreadBack, isNarrowLayout]);

  return (
    <div
      className="sx-chat-shell h-full min-h-0 w-full max-w-full overflow-hidden flex"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Conversation list */}
      <aside
        className={`sx-chat-list w-full lg:w-[360px] shrink-0 flex flex-col min-h-0 border-e border-[#0B2345]/10 transition-transform duration-300 ${
          mobileShowChat ? 'hidden lg:flex' : 'flex sx-chat-list--visible'
        }`}
        aria-label={isRtl ? 'قائمة المحادثات' : 'Conversation list'}
      >
        <div className="sx-chat-list-header shrink-0 px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black text-[#0B2345] dark:text-white font-display tracking-tight">
              {listTitle}
            </h2>
            {listHeaderAction}
          </div>
          <div className="relative">
            <Search
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 text-[#0B2345]/40 pointer-events-none ${
                isRtl ? 'right-3.5' : 'left-3.5'
              }`}
              aria-hidden
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={`sx-chat-search w-full rounded-full py-2.5 text-sm font-medium outline-none transition-shadow ${
                isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
              aria-label={searchPlaceholder}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 pb-2">
          {listTopContent}

          {isLoadingContacts ? (
            <ContactListSkeleton />
          ) : contacts.length === 0 ? (
            <div className="sx-chat-empty-state mx-2 my-4 p-6 text-center">
              <div className="sx-chat-empty-icon mx-auto mb-3">
                <MessageSquare size={28} aria-hidden />
              </div>
              <p className="text-sm font-bold text-[#0B2345]/70 dark:text-slate-300">{emptyList}</p>
            </div>
          ) : (
            contacts.map((contact) => {
              const isSelected = activeContact?.id === contact.id;
              const unread = unreadCounts[contact.id] || 0;
              const snippet = lastMessageSnippets[contact.id];
              const timeLabel = formatListTime(lastInteractionTimes[contact.id], isRtl);

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => onSelectContact(contact)}
                  className={`sx-chat-contact w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
                    isSelected ? 'sx-chat-contact--active' : ''
                  }`}
                  aria-current={isSelected ? 'true' : undefined}
                  aria-label={contact.name}
                >
                  <div className="relative shrink-0">{renderListAvatar(contact, isSelected)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm truncate text-[#0B2345] dark:text-white">
                        {contact.name}
                      </h3>
                      {timeLabel ? (
                        <span className="text-[10px] font-semibold text-[#0B2345]/45 shrink-0 tabular-nums">
                          {timeLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      {renderRoleBadge?.(contact)}
                      {renderContactMeta?.(contact)}
                    </div>
                    {snippet ? (
                      <p className="text-xs text-[#0B2345]/55 dark:text-slate-400 truncate mt-1 font-medium">
                        {snippet}
                      </p>
                    ) : contact.subtitle ? (
                      <p className="text-xs text-[#0B2345]/55 dark:text-slate-400 truncate mt-1">
                        {contact.subtitle}
                      </p>
                    ) : null}
                  </div>
                  {unread > 0 && !isSelected ? (
                    <span
                      className="shrink-0 min-w-[1.35rem] h-[1.35rem] px-1 flex items-center justify-center rounded-full bg-[#D4AF37] text-[#0B2345] text-[10px] font-black"
                      aria-label={isRtl ? `${unread} غير مقروء` : `${unread} unread`}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread panel */}
      <motion.section
        className={`sx-chat-thread flex-1 flex flex-col min-w-0 min-h-0 ${
          mobileShowChat ? 'flex sx-chat-thread--detail' : 'hidden lg:flex'
        }`}
        aria-label={isRtl ? 'المحادثة' : 'Chat thread'}
        initial={false}
        animate={mobileShowChat ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        {!activeContact ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="sx-chat-empty-state sx-chat-empty-state--desktop max-w-sm w-full p-10 text-center">
              <div className="sx-chat-empty-icon sx-chat-empty-icon--lg mx-auto mb-5">
                <MessageSquare size={40} aria-hidden />
              </div>
              <p className="text-base font-bold text-[#0B2345] dark:text-white">{emptyThread}</p>
              <p className="text-sm text-[#0B2345]/55 mt-2">
                {isRtl ? 'اختر جهة اتصال من القائمة للبدء' : 'Pick a contact from the list to start'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Selection bar OR normal header */}
            <AnimatePresence mode="wait">
              {selectionMode ? (
                <motion.header
                  key="selection"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="sx-chat-header sx-chat-selection-bar shrink-0 sticky top-0 z-30 flex items-center justify-between gap-3 px-3 md:px-5 py-3"
                >
                  <button
                    type="button"
                    onClick={exitSelection}
                    className="sx-chat-icon-btn"
                    aria-label={isRtl ? 'إلغاء التحديد' : 'Cancel selection'}
                  >
                    <X size={20} />
                  </button>
                  <span className="text-sm font-bold text-[#0B2345] dark:text-white">
                    {isRtl
                      ? `${selectedIds.size} محددة`
                      : `${selectedIds.size} selected`}
                  </span>
                  <button
                    type="button"
                    onClick={copySelected}
                    disabled={selectedIds.size === 0}
                    className="sx-chat-icon-btn disabled:opacity-40"
                    aria-label={isRtl ? 'نسخ المحدد' : 'Copy selected'}
                  >
                    <Copy size={18} />
                  </button>
                </motion.header>
              ) : (
                <motion.header
                  key="header"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="sx-chat-header shrink-0 sticky top-0 z-20 flex flex-col border-b border-[#0B2345]/10 bg-white/95 dark:bg-[#0d1528]/95 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-3 px-3 md:px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {showThreadBack ? (
                        <button
                          type="button"
                          onClick={handleChatBackClick}
                          className="sx-chat-back-btn sx-chat-icon-btn sx-action-btn sx-action-btn-icon shrink-0"
                          aria-label={isRtl ? 'رجوع إلى المحادثات' : 'Back to conversations'}
                        >
                          {isRtl ? (
                            <ArrowRight size={20} className="sx-action-icon" strokeWidth={2.4} />
                          ) : (
                            <ArrowLeft size={20} className="sx-action-icon" strokeWidth={2.4} />
                          )}
                        </button>
                      ) : null}
                      {renderHeaderAvatar?.()}
                      <div className="min-w-0">
                        <h2 className="font-bold text-[#0B2345] dark:text-white truncate text-sm md:text-base">
                          {activeContact.name}
                        </h2>
                        <p className="text-[11px] md:text-xs font-semibold text-[#0B2345]/55 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                          {isSending ? (
                            <span className="sx-chat-sending-dot" aria-live="polite">
                              {isRtl ? 'جاري الإرسال…' : 'Sending…'}
                            </span>
                          ) : (
                            statusText
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setThreadSearchOpen((v) => !v)}
                        className={`sx-chat-icon-btn ${threadSearchOpen ? 'sx-chat-icon-btn--active' : ''}`}
                        aria-label={isRtl ? 'بحث في المحادثة' : 'Search in conversation'}
                        aria-pressed={threadSearchOpen}
                      >
                        <Search size={18} />
                      </button>
                      {headerTrailing}
                    </div>
                  </div>

                  <AnimatePresence>
                    {threadSearchOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[#0B2345]/8"
                      >
                        <div className="px-3 md:px-5 py-2 flex items-center gap-2">
                          <input
                            type="search"
                            value={threadSearchQuery}
                            onChange={(e) => setThreadSearchQuery(e.target.value)}
                            placeholder={isRtl ? 'بحث في الرسائل...' : 'Search messages...'}
                            className="sx-chat-search flex-1 rounded-full py-2 text-sm px-4"
                            aria-label={isRtl ? 'بحث في الرسائل' : 'Search messages'}
                          />
                          {searchMatches.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-bold text-[#0B2345]/50 tabular-nums">
                                {searchMatchIndex + 1}/{searchMatches.length}
                              </span>
                              <button
                                type="button"
                                className="sx-chat-icon-btn"
                                onClick={() => scrollToSearchMatch(searchMatchIndex - 1)}
                                aria-label={isRtl ? 'السابق' : 'Previous'}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                className="sx-chat-icon-btn"
                                onClick={() => scrollToSearchMatch(searchMatchIndex + 1)}
                                aria-label={isRtl ? 'التالي' : 'Next'}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            className="sx-chat-icon-btn shrink-0"
                            onClick={() => {
                              setThreadSearchOpen(false);
                              setThreadSearchQuery('');
                            }}
                            aria-label={isRtl ? 'إغلاق البحث' : 'Close search'}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.header>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="relative flex-1 min-h-0 flex flex-col">
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar sx-chat-messages px-3 md:px-6 py-4"
              >
                {messagesLoadError ? (
                  <div className="sx-chat-empty-state mx-auto max-w-md p-6 text-center my-8">
                    <p className="text-sm font-bold text-rose-600">{messagesError}</p>
                  </div>
                ) : showMessageSkeleton ? (
                  <MessageListSkeleton />
                ) : null}

                {!showMessageSkeleton &&
                  showEmptyThreadIntro &&
                  messageCount === 0 &&
                  !messagesLoadError &&
                  (() => {
                    const customIntro = renderEmptyThreadIntro?.();
                    if (customIntro) return customIntro;
                    return (
                      <div className="flex flex-col items-center justify-center py-8 opacity-80">
                        <div className="mb-3">{renderHeaderAvatar?.()}</div>
                        <h3 className="text-sm font-black text-[#0B2345] dark:text-white text-center">
                          {activeContact.name}
                        </h3>
                        <p className="text-[10px] text-[#0B2345]/45 font-bold mt-1">
                          {isRtl ? 'ابدأ المحادثة الآن' : 'Start the conversation'}
                        </p>
                      </div>
                    );
                  })()}

                {!showMessageSkeleton &&
                  Object.entries(groupedMessages).map(([dateStr, dateMsgs]) => (
                    <div key={dateStr} className="space-y-1 mb-4">
                      <div className="flex justify-center my-3 sticky top-0 z-[1]">
                        <span className="sx-chat-date-pill text-[10px] font-bold px-3 py-1 rounded-full">
                          {dateStr}
                        </span>
                      </div>
                      {(dateMsgs as Record<string, unknown>[]).map((msg) => {
                        const msgId = String(msg.id);
                        const isMe = isOutgoingMessage(msg);
                        const isSearchMatch =
                          !!threadSearchQuery.trim() &&
                          String(msg.content ?? '')
                            .toLowerCase()
                            .includes(threadSearchQuery.trim().toLowerCase());
                        const activeSearchHit =
                          searchMatches.length > 0 &&
                          searchMatches[searchMatchIndex]?.id === msgId;

                        return (
                          <ChatMessageBubble
                            key={msgId}
                            msg={msg}
                            isMe={isMe}
                            isRtl={isRtl}
                            searchQuery={threadSearchQuery}
                            isSearchActive={threadSearchOpen && !!threadSearchQuery.trim()}
                            isSelected={selectedIds.has(msgId)}
                            selectionMode={selectionMode}
                            onToggleSelect={(id) => {
                              setSelectionMode(true);
                              toggleSelect(id);
                            }}
                            onReply={handleReply}
                            formatMessageTime={formatMessageTime}
                            incomingAvatar={!isMe ? renderIncomingMessageAvatar?.() : undefined}
                            outgoingAvatar={isMe ? renderOutgoingMessageAvatar?.() : undefined}
                            isSearchMatch={isSearchMatch && activeSearchHit}
                            messageRef={(el) => {
                              if (el) messageElMap.current.set(msgId, el);
                              else messageElMap.current.delete(msgId);
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
              </div>

              {/* Scroll to bottom */}
              <AnimatePresence>
                {showScrollDown && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 8 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => scrollToBottom(true)}
                    className="sx-chat-scroll-down absolute bottom-4 end-4 z-10"
                    aria-label={isRtl ? 'الانتقال لآخر رسالة' : 'Scroll to latest message'}
                  >
                    <ArrowDown size={18} />
                    {newBelowCount > 0 && (
                      <span className="sx-chat-scroll-down-badge">
                        {newBelowCount > 9 ? '9+' : newBelowCount}
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Composer */}
            <div className="sx-chat-composer shrink-0 sticky bottom-0 z-20 border-t border-[#0B2345]/10 bg-white/95 dark:bg-[#0d1528]/95 backdrop-blur-md px-3 md:px-5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {replyPreview && (
                <div className="sx-chat-reply-preview mb-2 flex items-stretch gap-2 rounded-xl border border-[#0B2345]/10 bg-[#F7F8FA] dark:bg-slate-800/50 overflow-hidden">
                  <div className="w-1 shrink-0 bg-[#D4AF37]" aria-hidden />
                  <div className="flex-1 min-w-0 py-2 ps-1 pe-2">
                    <p className="text-[10px] font-bold text-[#D4AF37]">
                      {isRtl ? `رد على ${replyPreview.label}` : `Reply to ${replyPreview.label}`}
                    </p>
                    <p className="text-xs text-[#0B2345]/70 dark:text-slate-300 truncate mt-0.5">
                      {truncatePreview(replyPreview.content)}
                    </p>
                    <p className="text-[9px] text-[#0B2345]/40 mt-1">
                      {isRtl ? 'معاينة محلية — لن تُحفظ كرد في قاعدة البيانات' : 'Local preview — not saved as reply metadata'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyPreview(null)}
                    className="sx-chat-icon-btn self-center me-1 shrink-0"
                    aria-label={isRtl ? 'إلغاء الرد' : 'Cancel reply'}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {selectedFile ? (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#0B2345]/10 bg-[#F7F8FA] dark:bg-slate-800/60 p-2.5 sx-chat-attachment-preview">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-[#0B2345]/10 text-[#0B2345] flex items-center justify-center">
                      <Paperclip size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate text-[#0B2345] dark:text-white">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-[#0B2345]/50">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearFile}
                    className="sx-chat-icon-btn text-rose-500 hover:bg-rose-50"
                    aria-label={isRtl ? 'إزالة الملف' : 'Remove file'}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : null}

              <AnimatePresence>
                {showEmojiStrip && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-2"
                  >
                    <div className="flex items-center gap-1 flex-wrap px-1 py-1">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="sx-chat-emoji-btn"
                          onClick={() => insertEmoji(emoji)}
                          aria-label={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form
                onSubmit={handleSendWrapped}
                className="flex items-end gap-2 max-w-4xl mx-auto"
              >
                <div className="flex-1 sx-chat-input-wrap flex items-end gap-0.5 px-1.5 py-1.5">
                  {supportsAttachments ? (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/gif,video/mp4,video/webm"
                        onChange={onFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending}
                        className="sx-chat-icon-btn shrink-0 disabled:opacity-40"
                        aria-label={isRtl ? 'إرفاق ملف' : 'Attach file'}
                        title={isRtl ? 'إرفاق صورة أو فيديو' : 'Attach image or video'}
                      >
                        <Paperclip size={18} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="sx-chat-icon-btn shrink-0 opacity-40 cursor-not-allowed"
                      aria-label={attachSoon}
                      title={attachSoon}
                    >
                      <Paperclip size={18} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowEmojiStrip((v) => !v)}
                    className={`sx-chat-icon-btn shrink-0 ${showEmojiStrip ? 'sx-chat-icon-btn--active' : ''}`}
                    aria-label={isRtl ? 'إيموجي' : 'Emoji'}
                    aria-pressed={showEmojiStrip}
                  >
                    <Smile size={18} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => onNewMessageChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendWrapped(e);
                      }
                    }}
                    disabled={isSending}
                    placeholder={placeholder}
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none resize-none max-h-28 min-h-[40px] py-2 px-1 text-sm font-medium text-[#0B2345] dark:text-white"
                    aria-label={placeholder}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending || (!newMessage.trim() && !selectedFile)}
                  className="sx-chat-send shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
                  aria-label={isRtl ? 'إرسال' : 'Send'}
                >
                  {isSending ? (
                    <span className="sx-chat-send-spinner" aria-hidden />
                  ) : (
                    <SendHorizontal size={18} className={isRtl ? 'rotate-180' : ''} />
                  )}
                </button>
              </form>
              <p className="hidden md:block text-center text-[10px] text-[#0B2345]/40 font-semibold mt-1.5">
                {isRtl
                  ? 'Enter للإرسال · Shift+Enter سطر جديد'
                  : 'Enter to send · Shift+Enter new line'}
              </p>
            </div>
          </>
        )}
      </motion.section>
    </div>
  );
}

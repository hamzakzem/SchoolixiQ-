import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  MessageSquare,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MessageListSkeleton } from './ChatSkeletons';
import { ChatComposer } from './ChatComposer';
import { ChatPrivacyBadge } from './ChatPrivacyBadge';
import type { ChatShellContact, ReplyPreview } from './SchoolixChatShell';
import type { ChatDeleteActor } from '../../lib/chatMessageDelete';
import { canDeleteChatMessage } from '../../lib/chatMessageDelete';

function isSystemMessage(msg: Record<string, unknown>): boolean {
  const kind = String(msg.type ?? msg.messageType ?? msg.kind ?? '').toLowerCase();
  return kind === 'system' || msg.isSystem === true;
}

function shouldGroupWithPrevious(
  prev: Record<string, unknown> | null,
  curr: Record<string, unknown>,
  isOutgoingMessage: (msg: Record<string, unknown>) => boolean,
): boolean {
  if (!prev) return false;
  if (isSystemMessage(prev) || isSystemMessage(curr)) return false;
  return isOutgoingMessage(prev) === isOutgoingMessage(curr);
}

export type ChatWindowProps = {
  isRtl: boolean;
  activeContact: ChatShellContact | null;
  emptyThreadMessage: string;
  showThreadBack: boolean;
  onChatBack: () => void;
  renderHeaderAvatar?: () => React.ReactNode;
  renderIncomingMessageAvatar?: () => React.ReactNode;
  renderOutgoingMessageAvatar?: () => React.ReactNode;
  renderRoleBadge?: (contact: ChatShellContact) => React.ReactNode;
  headerStatusText: string;
  headerTrailing?: React.ReactNode;
  isSending: boolean;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onExitSelection: () => void;
  onCopySelected: () => void;
  threadSearchOpen: boolean;
  onToggleThreadSearch: () => void;
  threadSearchQuery: string;
  onThreadSearchChange: (value: string) => void;
  searchMatches: { id: string }[];
  searchMatchIndex: number;
  onScrollToSearchMatch: (index: number) => void;
  onCloseThreadSearch: () => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onMessagesScroll: () => void;
  messagesLoadError: boolean;
  messagesError: string;
  showMessageSkeleton: boolean;
  showEmptyThreadIntro: boolean;
  renderEmptyThreadIntro?: () => React.ReactNode;
  groupedMessages: Record<string, unknown[]>;
  messageCount: number;
  isOutgoingMessage: (msg: Record<string, unknown>) => boolean;
  formatMessageTime: (timestamp: unknown) => string;
  onToggleSelect: (id: string) => void;
  onReply: (msg: Record<string, unknown>) => void;
  onDeleteMessage: (msg: Record<string, unknown>) => void;
  chatActor?: ChatDeleteActor | null;
  onPermanentDeleteMessage?: (msg: Record<string, unknown>) => void;
  canPermanentDelete: boolean;
  messageElMap: React.MutableRefObject<Map<string, HTMLDivElement>>;
  showScrollDown: boolean;
  newBelowCount: number;
  onScrollToBottom: () => void;
  composerProps: React.ComponentProps<typeof ChatComposer>;
};

export function ChatWindow({
  isRtl,
  activeContact,
  emptyThreadMessage,
  showThreadBack,
  onChatBack,
  renderHeaderAvatar,
  renderIncomingMessageAvatar,
  renderOutgoingMessageAvatar,
  renderRoleBadge,
  headerStatusText,
  headerTrailing,
  isSending,
  selectionMode,
  selectedIds,
  onExitSelection,
  onCopySelected,
  threadSearchOpen,
  onToggleThreadSearch,
  threadSearchQuery,
  onThreadSearchChange,
  searchMatches,
  searchMatchIndex,
  onScrollToSearchMatch,
  onCloseThreadSearch,
  messagesContainerRef,
  messagesEndRef,
  onMessagesScroll,
  messagesLoadError,
  messagesError,
  showMessageSkeleton,
  showEmptyThreadIntro,
  renderEmptyThreadIntro,
  groupedMessages,
  messageCount,
  isOutgoingMessage,
  formatMessageTime,
  onToggleSelect,
  onReply,
  onDeleteMessage,
  chatActor,
  onPermanentDeleteMessage,
  canPermanentDelete,
  messageElMap,
  showScrollDown,
  newBelowCount,
  onScrollToBottom,
  composerProps,
}: ChatWindowProps) {
  if (!activeContact) {
    return (
      <section
        className="sx-enterprise-chat-thread sx-chat-thread flex-1 flex flex-col min-w-0 min-h-0"
        aria-label={isRtl ? 'المحادثة' : 'Chat thread'}
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="sx-enterprise-empty sx-enterprise-animate max-w-sm w-full">
            <div className="sx-enterprise-empty__icon">
              <MessageSquare size={40} aria-hidden />
            </div>
            <p className="sx-enterprise-empty__title">{emptyThreadMessage}</p>
            <p className="sx-enterprise-empty__desc">
              {isRtl ? 'اختر جهة اتصال من القائمة للبدء' : 'Pick a contact from the list to start'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const privacyVis = activeContact.extra?.privacyVisibility as string | undefined;

  return (
    <motion.section
      className="sx-enterprise-chat-thread sx-chat-thread flex-1 flex flex-col min-w-0 min-h-0"
      aria-label={isRtl ? 'المحادثة' : 'Chat thread'}
      initial={{ opacity: 0, x: isRtl ? -12 : 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      <AnimatePresence mode="wait">
        {selectionMode ? (
          <motion.header
            key="selection"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sx-enterprise-chat-header sx-chat-header sx-chat-selection-bar shrink-0 sticky top-0 z-30 flex items-center justify-between gap-3 px-3 md:px-5 py-3"
          >
            <button
              type="button"
              onClick={onExitSelection}
              className="sx-chat-icon-btn"
              aria-label={isRtl ? 'إلغاء التحديد' : 'Cancel selection'}
            >
              <X size={20} />
            </button>
            <span className="text-sm font-bold text-[#0B2345] dark:text-white">
              {isRtl ? `${selectedIds.size} محددة` : `${selectedIds.size} selected`}
            </span>
            <button
              type="button"
              onClick={onCopySelected}
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
            className="sx-enterprise-chat-header sx-chat-header shrink-0 sticky top-0 z-20 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-3 md:px-5 py-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {showThreadBack ? (
                  <button
                    type="button"
                    onClick={onChatBack}
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
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {renderRoleBadge?.(activeContact)}
                    <ChatPrivacyBadge visibility={privacyVis} isRtl={isRtl} />
                    <p className="text-[11px] md:text-xs font-semibold text-[#0B2345]/55 dark:text-slate-400 truncate flex items-center gap-1.5">
                      <span className="sx-enterprise-online-dot shrink-0" aria-hidden />
                      {isSending ? (
                        <span className="sx-chat-sending-dot" aria-live="polite">
                          {isRtl ? 'جاري الإرسال…' : 'Sending…'}
                        </span>
                      ) : (
                        headerStatusText
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onToggleThreadSearch}
                  className={`sx-chat-icon-btn ${threadSearchOpen ? 'sx-chat-icon-btn--active' : ''}`}
                  aria-label={isRtl ? 'بحث في المحادثة' : 'Search in conversation'}
                  aria-pressed={threadSearchOpen}
                >
                  <Search size={18} />
                </button>
                <button
                  type="button"
                  className="sx-chat-icon-btn"
                  aria-label={isRtl ? 'إعدادات المحادثة' : 'Conversation settings'}
                  title={isRtl ? 'إعدادات المحادثة' : 'Conversation settings'}
                >
                  <Settings2 size={18} />
                </button>
                {headerTrailing}
              </div>
            </div>

            <AnimatePresence>
              {threadSearchOpen ? (
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
                      onChange={(e) => onThreadSearchChange(e.target.value)}
                      placeholder={isRtl ? 'بحث في الرسائل...' : 'Search messages...'}
                      className="sx-chat-search flex-1 rounded-full py-2 text-sm px-4"
                      aria-label={isRtl ? 'بحث في الرسائل' : 'Search messages'}
                    />
                    {searchMatches.length > 0 ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-bold text-[#0B2345]/50 tabular-nums">
                          {searchMatchIndex + 1}/{searchMatches.length}
                        </span>
                        <button
                          type="button"
                          className="sx-chat-icon-btn"
                          onClick={() => onScrollToSearchMatch(searchMatchIndex - 1)}
                          aria-label={isRtl ? 'السابق' : 'Previous'}
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="sx-chat-icon-btn"
                          onClick={() => onScrollToSearchMatch(searchMatchIndex + 1)}
                          aria-label={isRtl ? 'التالي' : 'Next'}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="sx-chat-icon-btn shrink-0"
                      onClick={onCloseThreadSearch}
                      aria-label={isRtl ? 'إغلاق البحث' : 'Close search'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.header>
        )}
      </AnimatePresence>

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={messagesContainerRef}
          onScroll={onMessagesScroll}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar sx-chat-messages px-3 md:px-6 py-4"
        >
          {messagesLoadError ? (
            <div className="sx-enterprise-empty mx-auto max-w-md my-8">
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
            Object.entries(groupedMessages).map(([dateStr, dateMsgs]) => {
              const msgs = dateMsgs as Record<string, unknown>[];
              return (
                <div key={dateStr} className="space-y-1 mb-4">
                  <div className="flex justify-center my-3 sticky top-0 z-[1]">
                    <span className="sx-chat-date-pill text-[10px] font-bold px-3 py-1 rounded-full">
                      {dateStr}
                    </span>
                  </div>
                  {msgs.map((msg, msgIndex) => {
                    const msgId = String(msg.id);
                    const isMe = isOutgoingMessage(msg);
                    const system = isSystemMessage(msg);
                    const prev = msgIndex > 0 ? msgs[msgIndex - 1] : null;
                    const grouped = shouldGroupWithPrevious(prev, msg, isOutgoingMessage);
                    const isSearchMatch =
                      !!threadSearchQuery.trim() &&
                      String(msg.content ?? '')
                        .toLowerCase()
                        .includes(threadSearchQuery.trim().toLowerCase());
                    const activeSearchHit =
                      searchMatches.length > 0 && searchMatches[searchMatchIndex]?.id === msgId;

                    return (
                      <ChatMessageBubble
                        key={msgId}
                        msg={msg}
                        isMe={isMe}
                        isRtl={isRtl}
                        isSystemMessage={system}
                        isGrouped={grouped}
                        hideAvatar={grouped}
                        searchQuery={threadSearchQuery}
                        isSearchActive={threadSearchOpen && !!threadSearchQuery.trim()}
                        isSelected={selectedIds.has(msgId)}
                        selectionMode={selectionMode}
                        onToggleSelect={(id) => onToggleSelect(id)}
                        onReply={onReply}
                        onDelete={onDeleteMessage}
                        canDelete={chatActor ? canDeleteChatMessage(msg, chatActor) : false}
                        onPermanentDelete={onPermanentDeleteMessage}
                        canPermanentDelete={canPermanentDelete}
                        formatMessageTime={formatMessageTime}
                        incomingAvatar={!isMe && !system ? renderIncomingMessageAvatar?.() : undefined}
                        outgoingAvatar={isMe && !system ? renderOutgoingMessageAvatar?.() : undefined}
                        isSearchMatch={isSearchMatch && activeSearchHit}
                        messageRef={(el) => {
                          if (el) messageElMap.current.set(msgId, el);
                          else messageElMap.current.delete(msgId);
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
        </div>

        <AnimatePresence>
          {showScrollDown ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={onScrollToBottom}
              className="sx-chat-scroll-down absolute bottom-4 end-4 z-10"
              aria-label={isRtl ? 'الانتقال لآخر رسالة' : 'Scroll to latest message'}
            >
              <ArrowDown size={18} />
              {newBelowCount > 0 ? (
                <span className="sx-chat-scroll-down-badge">
                  {newBelowCount > 9 ? '9+' : newBelowCount}
                </span>
              ) : null}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      <ChatComposer {...composerProps} />
    </motion.section>
  );
}

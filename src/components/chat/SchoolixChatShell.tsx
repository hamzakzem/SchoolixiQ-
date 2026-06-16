import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  FileVideo,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Search,
  SendHorizontal,
  X,
} from 'lucide-react';

export type ChatShellContact = {
  id: string;
  name: string;
  type?: string;
  role?: string;
  subtitle?: string;
  extra?: Record<string, unknown>;
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
  onMobileBack: () => void;
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
  const messageCount = Object.values(groupedMessages).reduce((n, arr) => n + arr.length, 0);
  const defaultHeaderStatus = isRtl ? 'محادثة' : 'Conversation';
  const statusText = headerStatusText ?? defaultHeaderStatus;

  const emptyList = emptyListMessage ?? (isRtl ? 'لا توجد محادثات بعد' : 'No conversations yet');
  const emptyThread =
    emptyThreadMessage ?? (isRtl ? 'اختر محادثة للبدء' : 'Select a conversation to start');
  const loadingContacts = isRtl ? 'جاري تحميل المحادثات...' : 'Loading conversations...';
  const loadingMessages = isRtl ? 'جاري تحميل الرسائل...' : 'Loading messages...';
  const messagesError = isRtl ? 'تعذر تحميل الرسائل' : 'Could not load messages';
  const placeholder =
    inputPlaceholder ?? (isRtl ? 'اكتب رسالة...' : 'Type a message...');

  return (
    <div
      className="sx-chat-shell h-full min-h-0 w-full max-w-full overflow-hidden flex"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Conversation list */}
      <aside
        className={`sx-chat-list w-full md:w-[340px] lg:w-[360px] shrink-0 flex flex-col min-h-0 border-e border-[#0B2345]/10 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
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
            <p className="px-4 py-8 text-center text-sm font-semibold text-[#0B2345]/50 animate-pulse">
              {loadingContacts}
            </p>
          ) : contacts.length === 0 ? (
            <div className="sx-chat-empty-state mx-2 my-4 p-6 text-center">
              <MessageSquare className="mx-auto mb-3 text-[#D4AF37]" size={28} aria-hidden />
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
                  className={`sx-chat-contact w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${
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
      <section
        className={`sx-chat-thread flex-1 flex flex-col min-w-0 min-h-0 ${
          mobileShowChat ? 'flex' : 'hidden md:flex'
        }`}
        aria-label={isRtl ? 'المحادثة' : 'Chat thread'}
      >
        {!activeContact ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="sx-chat-empty-state max-w-sm w-full p-8 text-center">
              <MessageSquare className="mx-auto mb-4 text-[#D4AF37]" size={36} aria-hidden />
              <p className="text-base font-bold text-[#0B2345] dark:text-white">{emptyThread}</p>
              <p className="text-sm text-[#0B2345]/55 mt-2">
                {isRtl ? 'اختر جهة اتصال من القائمة' : 'Pick a contact from the list'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="sx-chat-header shrink-0 sticky top-0 z-20 flex items-center justify-between gap-3 px-3 md:px-5 py-3 border-b border-[#0B2345]/10 bg-white/95 dark:bg-[#0d1528]/95 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={onMobileBack}
                  className="md:hidden sx-chat-icon-btn shrink-0"
                  aria-label={isRtl ? 'رجوع إلى المحادثات' : 'Back to conversations'}
                >
                  {isRtl ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                </button>
                {renderHeaderAvatar?.()}
                <div className="min-w-0">
                  <h2 className="font-bold text-[#0B2345] dark:text-white truncate text-sm md:text-base">
                    {activeContact.name}
                  </h2>
                  <p className="text-[11px] md:text-xs font-semibold text-[#0B2345]/55 dark:text-slate-400 truncate mt-0.5">
                    {statusText}
                  </p>
                </div>
              </div>
              {headerTrailing}
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar sx-chat-messages px-3 md:px-6 py-4">
              {messagesLoadError ? (
                <div className="sx-chat-empty-state mx-auto max-w-md p-6 text-center my-8">
                  <p className="text-sm font-bold text-rose-600">{messagesError}</p>
                </div>
              ) : isSending && messageCount === 0 ? (
                <p className="text-center text-sm font-semibold text-[#0B2345]/50 py-8 animate-pulse">
                  {loadingMessages}
                </p>
              ) : null}

              {showEmptyThreadIntro &&
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

              {Object.entries(groupedMessages).map(([dateStr, dateMsgs]) => (
                <div key={dateStr} className="space-y-2 mb-4">
                  <div className="flex justify-center my-3 sticky top-0 z-[1]">
                    <span className="sx-chat-date-pill text-[10px] font-bold px-3 py-1 rounded-full">
                      {dateStr}
                    </span>
                  </div>
                  {(dateMsgs as Record<string, unknown>[]).map((msg) => {
                    const isMe = isOutgoingMessage(msg);
                    const content = String(msg.content ?? '');
                    const fileUrl = msg.fileUrl as string | undefined;
                    const fileType = msg.fileType as string | undefined;
                    const fileName = msg.fileName as string | undefined;

                    return (
                      <motion.div
                        key={String(msg.id)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col mb-1 ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[88%] sm:max-w-[75%] md:max-w-[68%] flex gap-2 ${
                            isMe ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {!isMe && renderIncomingMessageAvatar?.()}
                          {isMe && renderOutgoingMessageAvatar?.()}
                          <div
                            className={`sx-chat-bubble px-3.5 py-2.5 ${
                              isMe ? 'sx-chat-bubble--out' : 'sx-chat-bubble--in'
                            }`}
                          >
                            {content ? (
                              <p className="leading-relaxed whitespace-pre-wrap text-sm font-medium">
                                {content}
                              </p>
                            ) : null}
                            {fileUrl ? (
                              <div className="mt-2 rounded-xl overflow-hidden max-w-[280px]">
                                {fileType === 'image' ? (
                                  <img
                                    src={fileUrl}
                                    alt={fileName || 'Attachment'}
                                    className="w-full h-auto object-cover max-h-64"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : fileType === 'video' ? (
                                  <video src={fileUrl} controls className="w-full h-auto max-h-64" />
                                ) : (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-black/5 hover:underline text-sm truncate"
                                  >
                                    <Paperclip size={16} />
                                    <span className="truncate">{fileName || 'Download'}</span>
                                  </a>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 mt-1 px-1 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span className="text-[10px] text-[#0B2345]/45 font-semibold tabular-nums">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMe && msg.read !== undefined ? (
                            <span className="text-[#0B2345]/40" aria-hidden>
                              {msg.read ? (
                                <CheckCheck size={13} className="text-[#D4AF37]" />
                              ) : (
                                <Check size={13} />
                              )}
                            </span>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
            </div>

            <div className="sx-chat-composer shrink-0 sticky bottom-0 z-20 border-t border-[#0B2345]/10 bg-white/95 dark:bg-[#0d1528]/95 backdrop-blur-md px-3 md:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {selectedFile ? (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#0B2345]/10 bg-[#F7F8FA] dark:bg-slate-800/60 p-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-[#0B2345]/10 text-[#0B2345] flex items-center justify-center">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon size={18} />
                      ) : (
                        <FileVideo size={18} />
                      )}
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

              <form onSubmit={onSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 sx-chat-input-wrap flex items-end gap-1 px-2 py-1.5">
                  {!disableAttachments ? (
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
                      >
                        <Paperclip size={18} />
                      </button>
                    </>
                  ) : null}
                  <textarea
                    value={newMessage}
                    onChange={(e) => onNewMessageChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSendMessage(e);
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
                  <SendHorizontal size={18} className={isRtl ? 'rotate-180' : ''} />
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

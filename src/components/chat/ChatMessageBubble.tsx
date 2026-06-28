import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  CheckCheck,
  Copy,
  CornerUpLeft,
  Forward,
  MoreHorizontal,
  Paperclip,
  Star,
  Trash2,
} from 'lucide-react';
import { highlightText } from './chatHelpers';
import {
  DELETED_MESSAGE_LABEL_AR,
  DELETED_MESSAGE_LABEL_EN,
} from '../../lib/chatMessageDelete';

export type ChatMessageBubbleProps = {
  msg: Record<string, unknown>;
  isMe: boolean;
  isRtl: boolean;
  searchQuery?: string;
  isSearchActive?: boolean;
  isSelected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
  onReply?: (msg: Record<string, unknown>) => void;
  onDelete?: (msg: Record<string, unknown>) => void;
  canDelete?: boolean;
  formatMessageTime: (ts: unknown) => string;
  incomingAvatar?: React.ReactNode;
  outgoingAvatar?: React.ReactNode;
  messageRef?: (el: HTMLDivElement | null) => void;
  isSearchMatch?: boolean;
};

function ActionMenu({
  isRtl,
  onCopy,
  onReply,
  onSelect,
  onDelete,
  showDelete,
  onClose,
}: {
  isRtl: boolean;
  onCopy: () => void;
  onReply: () => void;
  onSelect: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  onClose: () => void;
}) {
  const soon = isRtl ? 'قريباً' : 'Coming soon';

  return (
    <div
      className="sx-chat-action-menu absolute z-30 min-w-[160px] rounded-xl border border-[#0B2345]/10 bg-white dark:bg-[#141c2e] shadow-lg py-1"
      style={{ [isRtl ? 'left' : 'right']: 0, top: '100%', marginTop: 4 }}
      role="menu"
    >
      <button type="button" role="menuitem" className="sx-chat-action-item" onClick={() => { onCopy(); onClose(); }}>
        <Copy size={15} />
        {isRtl ? 'نسخ' : 'Copy'}
      </button>
      <button type="button" role="menuitem" className="sx-chat-action-item" onClick={() => { onReply(); onClose(); }}>
        <CornerUpLeft size={15} />
        {isRtl ? 'رد' : 'Reply'}
      </button>
      <button
        type="button"
        role="menuitem"
        className="sx-chat-action-item sx-chat-action-item--disabled"
        title={soon}
        disabled
      >
        <Forward size={15} />
        {isRtl ? 'إعادة توجيه' : 'Forward'}
        <span className="text-[9px] opacity-60 ms-auto">{soon}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="sx-chat-action-item sx-chat-action-item--disabled"
        title={soon}
        disabled
      >
        <Star size={15} />
        {isRtl ? 'مهم' : 'Important'}
        <span className="text-[9px] opacity-60 ms-auto">{soon}</span>
      </button>
      <button type="button" role="menuitem" className="sx-chat-action-item" onClick={() => { onSelect(); onClose(); }}>
        <Check size={15} />
        {isRtl ? 'تحديد' : 'Select'}
      </button>
      {showDelete && onDelete ? (
        <button
          type="button"
          role="menuitem"
          className="sx-chat-action-item sx-chat-action-item--danger"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <Trash2 size={15} />
          {isRtl ? 'حذف' : 'Delete'}
        </button>
      ) : null}
    </div>
  );
}

export function ChatMessageBubble({
  msg,
  isMe,
  isRtl,
  searchQuery = '',
  isSearchActive = false,
  isSelected = false,
  selectionMode = false,
  onToggleSelect,
  onReply,
  onDelete,
  canDelete = false,
  formatMessageTime,
  incomingAvatar,
  outgoingAvatar,
  messageRef,
  isSearchMatch = false,
}: ChatMessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = String(msg.content ?? '');
  const isDeleted = msg.deleted === true;
  const displayContent = isDeleted
    ? isRtl
      ? DELETED_MESSAGE_LABEL_AR
      : DELETED_MESSAGE_LABEL_EN
    : content;
  const fileUrl = msg.fileUrl as string | undefined;
  const fileType = msg.fileType as string | undefined;
  const fileName = msg.fileName as string | undefined;
  const msgId = String(msg.id);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      /* clipboard unavailable */
    }
  }, [content]);

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      onToggleSelect?.(msgId);
    }, 480);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = () => {
    if (selectionMode) onToggleSelect?.(msgId);
  };

  return (
    <motion.div
      ref={messageRef}
      data-msg-id={msgId}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`sx-chat-msg-row flex w-full flex-col mb-2 group/msg relative ${
        isMe ? 'sx-chat-msg-row--out items-end' : 'sx-chat-msg-row--in items-start'
      } ${isSearchMatch && isSearchActive ? 'sx-chat-msg--search-match' : ''} ${
        isSelected ? 'sx-chat-msg--selected' : ''
      }`}
      onClick={selectionMode ? handleClick : undefined}
    >
      <div
        className={`sx-chat-msg-body flex gap-2 min-w-0 max-w-[84%] md:max-w-[72%] ${
          isMe ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {!isMe && incomingAvatar ? (
          <div className="sx-chat-msg-avatar shrink-0 self-end">{incomingAvatar}</div>
        ) : null}
        {isMe && outgoingAvatar ? (
          <div className="sx-chat-msg-avatar shrink-0 self-end">{outgoingAvatar}</div>
        ) : null}

        <div className="relative flex flex-col min-w-0 max-w-full flex-1">
          <div
            className={`sx-chat-bubble w-fit max-w-full min-w-[4.5rem] px-3.5 py-2.5 relative ${
              isMe
                ? 'sx-chat-bubble--out sx-chat-bubble--outgoing'
                : 'sx-chat-bubble--in sx-chat-bubble--incoming'
            } ${selectionMode ? 'cursor-pointer' : ''} ${isDeleted ? 'sx-chat-bubble--deleted' : ''}`}
            onTouchStart={startLongPress}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
          >
            {selectionMode && (
              <span
                className={`absolute top-2 ${isRtl ? 'left-2' : 'right-2'} w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0B2345]'
                    : 'border-[#0B2345]/30 bg-white/80'
                }`}
                aria-hidden
              >
                {isSelected ? <Check size={10} strokeWidth={3} /> : null}
              </span>
            )}

            {(displayContent || isDeleted) ? (
              <p
                className={`sx-chat-bubble-text text-sm font-medium${isDeleted ? ' italic opacity-75' : ''}`}
                dir="auto"
              >
                {isDeleted || !isSearchActive || !searchQuery.trim()
                  ? displayContent
                  : highlightText(content, searchQuery)}
              </p>
            ) : null}

            {!isDeleted && fileUrl ? (
              <div className="mt-2 rounded-xl overflow-hidden max-w-full">
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

            {!selectionMode && (
              <button
                type="button"
                className="sx-chat-bubble-menu-btn opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 hidden sm:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                aria-label={isRtl ? 'خيارات الرسالة' : 'Message options'}
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={14} />
              </button>
            )}

            {menuOpen && !selectionMode && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label={isRtl ? 'إغلاق' : 'Close'}
                  onClick={() => setMenuOpen(false)}
                />
                <ActionMenu
                  isRtl={isRtl}
                  onCopy={handleCopy}
                  onReply={() => onReply?.(msg)}
                  onSelect={() => onToggleSelect?.(msgId)}
                  onDelete={() => onDelete?.(msg)}
                  showDelete={canDelete && !isDeleted}
                  onClose={() => setMenuOpen(false)}
                />
              </>
            )}
          </div>

          <div
            className={`sx-chat-msg-meta flex items-center gap-1.5 mt-1 px-0.5 ${
              isMe ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className="text-[10px] text-[#0B2345]/45 dark:text-slate-400 font-semibold tabular-nums leading-none">
              {formatMessageTime(msg.createdAt)}
            </span>
            {isMe && msg.read !== undefined ? (
              <span className="text-[#0B2345]/40 dark:text-slate-500" aria-hidden>
                {msg.read ? (
                  <CheckCheck size={13} className="text-[#D4AF37]" />
                ) : (
                  <Check size={13} />
                )}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

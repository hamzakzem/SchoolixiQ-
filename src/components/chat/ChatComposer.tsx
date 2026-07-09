import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Paperclip, SendHorizontal, Smile, X } from 'lucide-react';
import { QUICK_EMOJIS, truncatePreview } from './chatHelpers';
import type { ReplyPreview } from './SchoolixChatShell';

export type ChatComposerProps = {
  isRtl: boolean;
  placeholder: string;
  newMessage: string;
  onNewMessageChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  isSending: boolean;
  selectedFile: File | null;
  onClearFile: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  disableAttachments?: boolean;
  attachSoon: string;
  replyPreview: ReplyPreview | null;
  onClearReply: () => void;
  showEmojiStrip: boolean;
  onToggleEmojiStrip: () => void;
  onInsertEmoji: (emoji: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatComposer({
  isRtl,
  placeholder,
  newMessage,
  onNewMessageChange,
  onSend,
  isSending,
  selectedFile,
  onClearFile,
  onFileChange,
  fileInputRef,
  disableAttachments = false,
  attachSoon,
  replyPreview,
  onClearReply,
  showEmojiStrip,
  onToggleEmojiStrip,
  onInsertEmoji,
  textareaRef,
}: ChatComposerProps) {
  const supportsAttachments = !disableAttachments;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [newMessage, textareaRef]);

  return (
    <div className="sx-enterprise-composer sx-chat-composer shrink-0 sticky bottom-0 z-20">
      {replyPreview ? (
        <div className="sx-chat-reply-preview mb-2 flex items-stretch gap-2 rounded-xl border border-[#0B2345]/10 bg-[#F7F8FA] dark:bg-slate-800/50 overflow-hidden">
          <div className="w-1 shrink-0 bg-[#D4AF37]" aria-hidden />
          <div className="flex-1 min-w-0 py-2 ps-1 pe-2">
            <p className="text-[10px] font-bold text-[#D4AF37]">
              {isRtl ? `رد على ${replyPreview.label}` : `Reply to ${replyPreview.label}`}
            </p>
            <p className="text-xs text-[#0B2345]/70 dark:text-slate-300 truncate mt-0.5">
              {truncatePreview(replyPreview.content)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="sx-chat-icon-btn self-center me-1 shrink-0"
            aria-label={isRtl ? 'إلغاء الرد' : 'Cancel reply'}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

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
        {showEmojiStrip ? (
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
                  onClick={() => onInsertEmoji(emoji)}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <form onSubmit={onSend} className="flex items-end gap-2 max-w-4xl mx-auto">
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
            onClick={onToggleEmojiStrip}
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
                onSend(e);
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
          className="sx-chat-send-btn sx-chat-send shrink-0 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
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
        {isRtl ? 'Enter للإرسال · Shift+Enter سطر جديد' : 'Enter to send · Shift+Enter new line'}
      </p>
    </div>
  );
}

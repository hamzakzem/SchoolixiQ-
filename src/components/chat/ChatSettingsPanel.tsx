import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  Bell,
  BellOff,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { isChatMobileLayout } from '../../lib/chatUiNavigation';
import {
  assignmentStatusLabel,
  extractConversationAssignment,
  type ConversationAssignment,
} from '../../lib/conversationAssignment';
import { ChatPrivacyBadge } from './ChatPrivacyBadge';
import type { ChatShellContact } from './SchoolixChatShell';

export type ChatSettingsPanelProps = {
  isRtl: boolean;
  isOpen: boolean;
  onClose: () => void;
  activeContact: ChatShellContact | null;
  conversationId?: string;
  privacyVisibility?: string;
  isSuperAdmin?: boolean;
  onPermanentDelete?: () => void;
  onOpenThreadSearch?: () => void;
  onArchive?: () => void;
  onCloseConversation?: () => void;
};

export function ChatSettingsPanel({
  isRtl,
  isOpen,
  onClose,
  activeContact,
  conversationId,
  privacyVisibility,
  isSuperAdmin = false,
  onPermanentDelete,
  onOpenThreadSearch,
  onArchive,
  onCloseConversation,
}: ChatSettingsPanelProps) {
  const isMobile = isChatMobileLayout();
  const [muteNotifications, setMuteNotifications] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const assignment = extractConversationAssignment(
    activeContact?.extra as Record<string, unknown> | undefined,
  ) as ConversationAssignment | null;

  const panelContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#0B2345]/10 shrink-0">
        <h3 className="font-bold text-sm text-[#0B2345] dark:text-white">
          {isRtl ? 'إعدادات المحادثة' : 'Chat settings'}
        </h3>
        <button type="button" className="sx-chat-icon-btn" onClick={onClose} aria-label={isRtl ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <section className="space-y-2">
          <h4 className="text-xs font-black text-[#0B2345]/55 uppercase tracking-wide">
            {isRtl ? 'معلومات المحادثة' : 'Conversation info'}
          </h4>
          <p className="font-bold text-[#0B2345] dark:text-white">{activeContact?.name}</p>
          {conversationId ? (
            <p className="text-[10px] text-[#0B2345]/45 break-all font-mono">{conversationId}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <ChatPrivacyBadge visibility={privacyVisibility} isRtl={isRtl} />
            {assignment ? (
              <span className="sx-enterprise-privacy-badge">
                {assignmentStatusLabel(assignment.status, isRtl)}
              </span>
            ) : null}
          </div>
        </section>

        {assignment?.assignedToName ? (
          <section className="space-y-2">
            <h4 className="text-xs font-black text-[#0B2345]/55 uppercase tracking-wide flex items-center gap-1">
              <User size={12} />
              {isRtl ? 'المسؤول الحالي' : 'Current owner'}
            </h4>
            <p className="text-sm font-semibold">{assignment.assignedToName}</p>
            <p className="text-[10px] text-[#0B2345]/45">{assignment.assignedToRole}</p>
          </section>
        ) : null}

        <section className="space-y-2">
          <h4 className="text-xs font-black text-[#0B2345]/55 uppercase tracking-wide flex items-center gap-1">
            <Users size={12} />
            {isRtl ? 'المشاركون' : 'Participants'}
          </h4>
          <p className="text-xs text-[#0B2345]/60">
            {isRtl
              ? 'يُدار المشاركون عبر سياسة الخصوصية والتعيين — لا تُعرض بيانات حساسة.'
              : 'Participants are governed by privacy and assignment — no sensitive data shown.'}
          </p>
        </section>

        <section className="space-y-2">
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-[#0B2345]/10 px-3 py-2.5 text-sm font-semibold"
            onClick={() => setMuteNotifications((v) => !v)}
          >
            <span className="flex items-center gap-2">
              {muteNotifications ? <BellOff size={16} /> : <Bell size={16} />}
              {isRtl ? 'كتم الإشعارات' : 'Mute notifications'}
            </span>
            <span className="text-[10px] text-[#0B2345]/45">{muteNotifications ? (isRtl ? 'مكتوم' : 'Muted') : (isRtl ? 'مفعّل' : 'On')}</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl border border-[#0B2345]/10 px-3 py-2.5 text-sm font-semibold"
            onClick={() => {
              onOpenThreadSearch?.();
              onClose();
            }}
          >
            <Search size={16} />
            {isRtl ? 'بحث داخل الرسائل' : 'Search in thread'}
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl border border-[#0B2345]/10 px-3 py-2.5 text-sm font-semibold"
            onClick={onArchive}
          >
            <Archive size={16} />
            {isRtl ? 'أرشفة المحادثة' : 'Archive conversation'}
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-600"
            onClick={onCloseConversation}
          >
            <Shield size={16} />
            {isRtl ? 'إغلاق المحادثة' : 'Close conversation'}
          </button>

          {isSuperAdmin && onPermanentDelete ? (
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700"
              onClick={onPermanentDelete}
            >
              <Trash2 size={16} />
              {isRtl ? 'حذف نهائي' : 'Delete permanently'}
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            aria-label={isRtl ? 'إغلاق' : 'Close overlay'}
            onClick={onClose}
          />
          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: isRtl ? -320 : 320, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { x: isRtl ? -320 : 320, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl bg-white dark:bg-[#0d1528] shadow-2xl border-t border-[#0B2345]/10 pb-[env(safe-area-inset-bottom)]'
                : `fixed top-0 ${isRtl ? 'left-0' : 'right-0'} z-50 h-full w-full max-w-sm bg-white dark:bg-[#0d1528] shadow-2xl border-[#0B2345]/10 ${isRtl ? 'border-r' : 'border-l'}`
            }
            role="dialog"
            aria-modal="true"
            aria-label={isRtl ? 'إعدادات المحادثة' : 'Chat settings'}
          >
            {panelContent}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

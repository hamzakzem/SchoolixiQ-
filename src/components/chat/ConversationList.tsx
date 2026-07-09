import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Search } from 'lucide-react';
import type { ChatShellContact } from './SchoolixChatShell';
import { ContactListSkeleton } from './ChatSkeletons';
import { ChatPrivacyBadge } from './ChatPrivacyBadge';

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

export type ConversationListProps = {
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
  isLoadingContacts?: boolean;
  listHeaderAction?: React.ReactNode;
  listTopContent?: React.ReactNode;
  renderListAvatar: (contact: ChatShellContact, isSelected: boolean) => React.ReactNode;
  renderRoleBadge?: (contact: ChatShellContact) => React.ReactNode;
  renderContactMeta?: (contact: ChatShellContact) => React.ReactNode;
  emptyListTitle?: string;
  emptyListDescription?: string;
};

export function ConversationList({
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
  isLoadingContacts = false,
  listHeaderAction,
  listTopContent,
  renderListAvatar,
  renderRoleBadge,
  renderContactMeta,
  emptyListTitle,
  emptyListDescription,
}: ConversationListProps) {
  const emptyTitle = emptyListTitle ?? (isRtl ? 'لا توجد محادثات' : 'No conversations');
  const emptyDesc =
    emptyListDescription ??
    (isRtl
      ? 'ستظهر هنا المحادثات المخصصة لهذا الحساب'
      : 'Conversations assigned to this account will appear here');

  return (
    <aside
      className="sx-enterprise-chat-sidebar sx-chat-list flex flex-col min-h-0"
      aria-label={isRtl ? 'قائمة المحادثات' : 'Conversation list'}
    >
      <div className="sx-enterprise-chat-sidebar__header shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="sx-enterprise-chat-sidebar__title font-display">{listTitle}</h2>
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

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
        {listTopContent}

        {isLoadingContacts ? (
          <ContactListSkeleton />
        ) : contacts.length === 0 ? (
          <div className="sx-enterprise-empty sx-enterprise-animate">
            <div className="sx-enterprise-empty__icon">
              <MessageSquare size={28} aria-hidden />
            </div>
            <p className="sx-enterprise-empty__title">{emptyTitle}</p>
            <p className="sx-enterprise-empty__desc">{emptyDesc}</p>
          </div>
        ) : (
          contacts.map((contact, index) => {
            const isSelected = activeContact?.id === contact.id;
            const unread = unreadCounts[contact.id] || 0;
            const snippet = String(
              (lastMessageSnippets as Record<string, string>)[contact.id] ?? '',
            );
            const timeLabel = formatListTime(lastInteractionTimes[contact.id], isRtl);
            const privacyVis = contact.extra?.privacyVisibility as string | undefined;

            return (
              <motion.button
                key={contact.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.2) }}
                onClick={() => onSelectContact(contact)}
                className={`sx-enterprise-convo-card sx-enterprise-animate sx-chat-contact ${
                  isSelected ? 'sx-enterprise-convo-card--active sx-chat-contact--active' : ''
                }`}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={contact.name}
              >
                <div className="relative shrink-0">{renderListAvatar(contact, isSelected)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="sx-enterprise-convo-card__name">{contact.name}</h3>
                    {timeLabel ? (
                      <span className="text-[10px] font-semibold text-[#0B2345]/45 shrink-0 tabular-nums">
                        {timeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                    {renderRoleBadge?.(contact)}
                    <ChatPrivacyBadge visibility={privacyVis} isRtl={isRtl} />
                    {renderContactMeta?.(contact)}
                  </div>
                  {snippet ? (
                    <p className="sx-enterprise-convo-card__snippet">{snippet}</p>
                  ) : contact.subtitle ? (
                    <p className="sx-enterprise-convo-card__snippet">{contact.subtitle}</p>
                  ) : null}
                </div>
                {unread > 0 && !isSelected ? (
                  <span
                    className="sx-enterprise-unread-badge shrink-0"
                    aria-label={isRtl ? `${unread} غير مقروء` : `${unread} unread`}
                  >
                    {unread > 9 ? '9+' : unread}
                  </span>
                ) : null}
              </motion.button>
            );
          })
        )}
      </div>
    </aside>
  );
}

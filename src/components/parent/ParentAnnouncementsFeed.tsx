import React from 'react';
import { Bell, Megaphone } from 'lucide-react';

type Announcement = {
  id: string;
  title?: string;
  content?: string;
  authorName?: string;
  target?: string;
  createdAt?: { seconds?: number };
  metadata?: { important?: boolean };
};

type Props = {
  isRtl: boolean;
  t: (key: string) => string;
  announcements: Announcement[];
  /** inbox shows individual; home uses all — pass filtered list from parent */
  mode?: 'inbox' | 'all';
};

export function ParentAnnouncementsFeed({ isRtl, t, announcements, mode = 'all' }: Props) {
  const list =
    mode === 'inbox'
      ? announcements.filter((a) => a.target === 'individual')
      : announcements;

  return (
    <div className="parent-tab space-y-6">
      <header>
        <h2 className="parent-page-title">{mode === 'inbox' ? t('messageCenter') : t('latestAnnouncements')}</h2>
        <p className="parent-page-subtitle">
          {isRtl ? 'آخر الإعلانات والرسائل المدرسية' : 'Latest school announcements and messages'}
        </p>
      </header>

      {list.length > 0 ? (
        <div className="space-y-4">
          {list.map((ann) => {
            const isImportant =
              ann.metadata?.important ||
              String(ann.title || '')
                .toLowerCase()
                .includes('مهم');
            return (
              <article key={ann.id} className="parent-announce-card">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isImportant && (
                      <span className="parent-badge parent-badge--danger text-[9px]">
                        {isRtl ? 'مهم' : 'Important'}
                      </span>
                    )}
                    {ann.target === 'individual' && (
                      <span className="parent-badge parent-badge--gold text-[9px]">{t('privateMessage')}</span>
                    )}
                  </div>
                  <time className="text-[10px] font-semibold text-[#0B2345]/40 tabular-nums">
                    {ann.createdAt?.seconds
                      ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString(isRtl ? 'ar-IQ' : 'en-US')
                      : t('now')}
                  </time>
                </div>
                <h3 className="font-bold text-[#0B2345] dark:text-white text-base mb-2">{ann.title}</h3>
                <p className="text-sm text-[#0B2345]/70 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>
                {ann.authorName && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#0B2345]/8">
                    <div className="w-8 h-8 rounded-full bg-[#F7F8FA] flex items-center justify-center text-xs font-bold text-[#0B2345]">
                      {ann.authorName[0]}
                    </div>
                    <span className="text-xs text-[#0B2345]/50">
                      {isRtl ? 'المرسل' : 'From'}: {ann.authorName}
                    </span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="parent-empty-state">
          <Megaphone size={32} className="text-[#D4AF37] mb-3" aria-hidden />
          <p>{isRtl ? 'لا توجد إعلانات جديدة' : 'No new announcements'}</p>
        </div>
      )}
    </div>
  );
}

/** Inbox tab — private messages only */
export function ParentInboxView(props: Omit<Props, 'mode'>) {
  return <ParentAnnouncementsFeed {...props} mode="inbox" />;
}

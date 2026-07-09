import React from 'react';

export type ChatLayoutProps = {
  isRtl: boolean;
  isMobile: boolean;
  mobileShowChat: boolean;
  listPanel: React.ReactNode;
  threadPanel: React.ReactNode;
};

/**
 * Enterprise responsive shell:
 * - Mobile (<768): single surface — list OR thread (sidebar not in DOM when hidden)
 * - Tablet + Desktop (>=768): split layout like Slack / Teams
 */
export function ChatLayout({
  isRtl,
  isMobile,
  mobileShowChat,
  listPanel,
  threadPanel,
}: ChatLayoutProps) {
  if (isMobile) {
    return (
      <div
        className="sx-enterprise-chat-shell sx-chat-shell h-full min-h-0 w-full max-w-full overflow-hidden"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {!mobileShowChat ? listPanel : threadPanel}
      </div>
    );
  }

  return (
    <div
      className="sx-enterprise-chat-shell sx-enterprise-chat-shell--split sx-chat-shell h-full min-h-0 w-full max-w-full overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {listPanel}
      {threadPanel}
    </div>
  );
}

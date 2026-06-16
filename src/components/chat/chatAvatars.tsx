import React from 'react';
import { Building2, Megaphone, Sparkles, User, Users } from 'lucide-react';
import type { ChatShellContact } from './SchoolixChatShell';

const NAVY = '#0B2345';
const GOLD = '#D4AF37';

export function ChatAvatarFrame({
  children,
  selected,
  size = 'list',
}: {
  children: React.ReactNode;
  selected?: boolean;
  size?: 'list' | 'header' | 'message';
}) {
  const dim =
    size === 'header' ? 'w-11 h-11 rounded-full' : size === 'message' ? 'w-8 h-8 rounded-full' : 'w-12 h-12 rounded-full';
  return (
    <div
      className={`${dim} overflow-hidden flex items-center justify-center shrink-0 border-2 ${
        selected ? 'border-[#D4AF37] shadow-sm' : 'border-white dark:border-slate-700'
      } bg-[#F7F8FA] dark:bg-slate-800`}
    >
      {children}
    </div>
  );
}

export function DefaultContactAvatar({
  contact,
  selected,
  appLogo,
}: {
  contact: ChatShellContact;
  selected?: boolean;
  appLogo?: string;
}) {
  if (contact.id === 'super_admin') {
    if (appLogo) {
      return (
        <ChatAvatarFrame selected={selected}>
          <img src={appLogo} alt="" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
        </ChatAvatarFrame>
      );
    }
    return (
      <ChatAvatarFrame selected={selected}>
        <div className="w-full h-full flex items-center justify-center text-white" style={{ background: NAVY }}>
          <Sparkles size={18} />
        </div>
      </ChatAvatarFrame>
    );
  }

  if (contact.type === 'broadcast') {
    return (
      <ChatAvatarFrame selected={selected}>
        <div className="w-full h-full flex items-center justify-center" style={{ background: `${GOLD}33`, color: NAVY }}>
          <Megaphone size={18} />
        </div>
      </ChatAvatarFrame>
    );
  }

  const logoUrl = contact.extra?.logoUrl as string | undefined;
  if (logoUrl) {
    return (
      <ChatAvatarFrame selected={selected}>
        <img src={logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </ChatAvatarFrame>
    );
  }

  const photoUrl = contact.extra?.photoUrl as string | undefined;
  if (photoUrl) {
    return (
      <ChatAvatarFrame selected={selected}>
        <img src={photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </ChatAvatarFrame>
    );
  }

  const Icon =
    contact.role === 'teacher' || contact.type === 'teacher'
      ? Users
      : contact.type === 'school' || contact.type === 'admin'
        ? Building2
        : User;

  return (
    <ChatAvatarFrame selected={selected}>
      <div
        className="w-full h-full flex items-center justify-center text-sm font-bold"
        style={{
          background: selected ? NAVY : '#F7F8FA',
          color: selected ? '#fff' : NAVY,
        }}
      >
        <Icon size={18} />
      </div>
    </ChatAvatarFrame>
  );
}

export function RoleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#0B2345]/8 text-[#0B2345] dark:bg-white/10 dark:text-slate-200">
      {label}
    </span>
  );
}

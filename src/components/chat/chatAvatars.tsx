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
        selected ? 'border-[#D4AF37] shadow-sm' : 'border-white/80 dark:border-white/10'
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

  const initials = contactInitials(contact.name);
  if (!initials) {
    const Icon =
      contact.role === 'teacher' || contact.type === 'teacher'
        ? Users
        : contact.type === 'school' || contact.type === 'admin'
          ? Building2
          : User;
    return (
      <ChatAvatarFrame selected={selected}>
        <div className="w-full h-full flex items-center justify-center" style={{ background: AVATAR_TONES[0], color: GOLD }}>
          <Icon size={18} />
        </div>
      </ChatAvatarFrame>
    );
  }

  // Dark tone + light initials stays readable even under the legacy
  // "white text inside sidebars" rules that hid the old light avatar.
  return (
    <ChatAvatarFrame selected={selected}>
      <div
        className="w-full h-full flex items-center justify-center text-[15px] font-black leading-none select-none"
        style={{ background: AVATAR_TONES[toneIndex(contact.id || contact.name || '')], color: '#F5E6B8' }}
        aria-hidden
      >
        {initials}
      </div>
    </ChatAvatarFrame>
  );
}

const AVATAR_TONES = [
  'linear-gradient(135deg, #16345f, #0b2345)',
  'linear-gradient(135deg, #1f4b5c, #0e2c38)',
  'linear-gradient(135deg, #4a2f5c, #2a1838)',
  'linear-gradient(135deg, #1e4d3a, #0f2c21)',
  'linear-gradient(135deg, #5c3d1f, #382410)',
  'linear-gradient(135deg, #2f3f6b, #1a2445)',
];

function toneIndex(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % AVATAR_TONES.length;
}

/** First letters of the first two words ("علي حسن" → "ع ح" without the space). */
function contactInitials(name?: string): string {
  const words = String(name || '')
    .replace(/[()\[\]{}<>"'«»]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w && !['ولي', 'أمر', 'طالب'].includes(w));
  const source = words.length ? words : String(name || '').trim().split(/\s+/).filter(Boolean);
  return source
    .slice(0, 2)
    .map((w) => Array.from(w)[0] || '')
    .join('')
    .toUpperCase();
}

export function RoleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#0B2345]/8 text-[#0B2345] dark:bg-white/10 dark:text-slate-200">
      {label}
    </span>
  );
}

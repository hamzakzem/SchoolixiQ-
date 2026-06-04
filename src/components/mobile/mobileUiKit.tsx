import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

/** SchoolixiQ native shell — navy authority + gold accent (SaaS school OS) */
export const mobileTokens = {
  navy: '#0B2345',
  navyMid: '#163a6b',
  navyLight: '#1e4d82',
  gold: '#D4A64A',
  goldSoft: '#e8c06e',
  pageBg:
    'bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(212,166,74,0.12),transparent_50%),linear-gradient(180deg,#f8fafc_0%,#eef2f8_45%,#e4eaf3_100%)]',
  headerH: 'h-[72px]',
  shellPt: 'pt-[72px]',
  shellPb: 'pb-[84px]',
  cardShadow:
    'shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_40px_rgba(11,35,69,0.08)]',
  navShadow: 'shadow-[0_-8px_32px_rgba(11,35,69,0.12)]',
} as const;

export function MobilePage({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="px-4 py-5 space-y-5"
    >
      {children}
    </motion.div>
  );
}

export function MobileSectionTitle({
  title,
  icon: Icon,
  subtitle,
}: {
  title: string;
  icon?: LucideIcon;
  subtitle?: string;
}) {
  return (
    <div className="px-0.5">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B2345] to-[#163a6b] text-white flex items-center justify-center shadow-md shadow-[#0B2345]/25">
            <Icon size={17} strokeWidth={2.35} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-black text-[#0B2345] tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MobileCard({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-white/95 backdrop-blur-sm rounded-[1.35rem] border border-slate-200/70 ${mobileTokens.cardShadow} ${onClick ? 'active:scale-[0.985] transition-all duration-200 text-start w-full' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}

export function MobileStatCard({
  label,
  value,
  icon: Icon,
  onClick,
  accent = 'navy',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  accent?: 'navy' | 'gold';
}) {
  const Tag = onClick ? 'button' : 'div';
  const accentBg =
    accent === 'gold'
      ? 'from-[#D4A64A]/15 to-[#D4A64A]/5 text-[#8a6b1f]'
      : 'from-[#0B2345]/12 to-[#0B2345]/4 text-[#0B2345]';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden bg-white/95 rounded-2xl p-3.5 border border-slate-200/70 ${mobileTokens.cardShadow} text-start w-full ${
        onClick ? 'active:scale-[0.97] transition-all duration-200' : ''
      }`}
    >
      <div
        className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${accent === 'gold' ? 'from-transparent via-[#D4A64A] to-transparent' : 'from-transparent via-[#0B2345]/40 to-transparent'}`}
      />
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accentBg} flex items-center justify-center`}
        >
          <Icon size={17} strokeWidth={2.35} />
        </span>
        <p className="text-[10px] font-bold text-slate-500 flex-1 leading-snug">{label}</p>
      </div>
      <p className="text-[1.35rem] font-black text-slate-900 tabular-nums tracking-tight">
        {value}
      </p>
    </Tag>
  );
}

export function MobilePermissionChip({
  icon: Icon,
  label,
  onClick,
  variant = 'grid',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'grid' | 'list';
}) {
  if (variant === 'list') {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="group w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 border border-slate-200/80 shadow-[0_4px_20px_rgba(11,35,69,0.06)] text-start active:shadow-inner transition-shadow"
      >
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0B2345] via-[#0f2d52] to-[#163a6b] text-white flex items-center justify-center shadow-md shadow-[#0B2345]/25 shrink-0">
          <Icon size={20} strokeWidth={2.35} />
        </span>
        <span className="text-[13px] font-black text-[#0B2345] leading-snug tracking-tight flex-1 min-w-0">
          {label}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/90 border border-slate-200/80 shadow-[0_4px_20px_rgba(11,35,69,0.06)] min-h-[92px] transition-shadow hover:shadow-[0_8px_28px_rgba(11,35,69,0.1)]"
    >
      <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B2345] via-[#0f2d52] to-[#163a6b] text-white flex items-center justify-center shadow-md shadow-[#0B2345]/30 group-active:shadow-inner">
        <Icon size={18} strokeWidth={2.35} />
      </span>
      <span className="text-[11px] font-black text-[#0B2345] text-center leading-tight line-clamp-3 px-0.5">
        {label}
      </span>
    </motion.button>
  );
}

export function MobileBtnPrimary({
  children,
  onClick,
  className = '',
  fullWidth = true,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${fullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-2xl bg-gradient-to-b from-[#12325c] via-[#0f2d52] to-[#0B2345] text-white text-sm font-bold shadow-[0_6px_20px_rgba(11,35,69,0.4)] border border-white/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function MobileBtnSecondary({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 min-h-[46px] px-4 py-3 rounded-2xl border border-[#0B2345]/12 bg-white/90 text-[#0B2345] text-sm font-bold shadow-sm active:scale-[0.98] transition-all duration-200 ${className}`}
    >
      {children}
    </button>
  );
}

export function MobileIconAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[76px]"
    >
      <span className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 shadow-[0_8px_24px_rgba(11,35,69,0.1)] flex items-center justify-center text-[#0B2345] ring-1 ring-[#0B2345]/5">
        <Icon size={26} strokeWidth={2.2} />
      </span>
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
    </motion.button>
  );
}

export function MobileMenuTile({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return <MobilePermissionChip icon={Icon} label={label} onClick={onClick} />;
}

export function MobileSchoolHero({
  schoolName,
  logoUrl,
  badge,
  isRtl,
}: {
  schoolName: string;
  logoUrl?: string | null;
  badge?: string;
  isRtl?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#0B2345] via-[#0f2d52] to-[#1a3f72] text-white p-4 shadow-[0_16px_48px_rgba(11,35,69,0.4)] ring-1 ring-white/10"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(212,166,74,0.22),transparent_45%)] pointer-events-none" />
      <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="w-[76px] h-[76px] rounded-2xl bg-white p-1.5 shadow-xl ring-2 ring-[#D4A64A]/40 shrink-0 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={schoolName}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-2xl font-black text-[#0B2345]">
              {schoolName.charAt(0)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {badge ? (
            <p className="text-[10px] font-bold text-[#D4A64A] uppercase tracking-[0.2em] mb-1">
              {badge}
            </p>
          ) : null}
          <p className="text-lg font-black leading-tight truncate">{schoolName}</p>
          <p className="text-[11px] text-white/60 font-semibold mt-1">SchoolixiQ</p>
        </div>
      </div>
    </div>
  );
}

export function MobileListRow({
  title,
  subtitle,
  onClick,
  isRtl,
}: {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  isRtl?: boolean;
}) {
  return (
    <MobileCard
      onClick={onClick}
      className="p-4 flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 truncate">{title}</p>
        {subtitle ? (
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
            {subtitle}
          </p>
        ) : null}
      </div>
      {onClick ? (
        <ChevronLeft
          size={20}
          className={`text-slate-400 shrink-0 ${isRtl ? '' : 'rotate-180'}`}
          strokeWidth={2.5}
        />
      ) : null}
    </MobileCard>
  );
}

export function SchoolLogoAvatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box =
    size === 'lg' ? 'w-[72px] h-[72px]' : size === 'sm' ? 'w-11 h-11' : 'w-14 h-14';
  return (
    <div
      className={`${box} rounded-2xl bg-white border border-slate-200/90 shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-[#D4A64A]/20`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain p-1"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="text-lg font-black text-[#0B2345]">{name.charAt(0)}</span>
      )}
    </div>
  );
}

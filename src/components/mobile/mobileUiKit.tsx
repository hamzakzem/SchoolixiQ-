import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

/** Shared mobile shell tokens — navy + soft surfaces */
export const mobileTokens = {
  navy: '#0B2345',
  navyMid: '#163a6b',
  gold: '#C9A227',
  pageBg: 'bg-gradient-to-b from-[#f6f8fc] via-[#eef2f8] to-[#e6ecf4]',
  headerH: 'h-[72px]',
  shellPt: 'pt-[72px]',
  shellPb: 'pb-[84px]',
} as const;

export function MobilePage({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 space-y-5">{children}</div>;
}

export function MobileSectionTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-2.5 px-0.5">
      {Icon ? (
        <span className="w-8 h-8 rounded-xl bg-[#0B2345]/8 flex items-center justify-center text-[#0B2345]">
          <Icon size={16} strokeWidth={2.25} />
        </span>
      ) : null}
      <h2 className="text-[15px] font-black text-[#0B2345] tracking-tight">{title}</h2>
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
      className={`bg-white rounded-[1.25rem] border border-slate-200/80 shadow-[0_8px_30px_rgba(11,35,69,0.06)] ${onClick ? 'active:scale-[0.99] transition-transform text-start w-full' : ''} ${className}`}
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
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-white rounded-xl p-3 border border-slate-200/80 shadow-[0_4px_16px_rgba(11,35,69,0.06)] text-start w-full ${
        onClick ? 'active:scale-[0.98] transition-transform' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-8 h-8 rounded-lg bg-[#0B2345]/8 flex items-center justify-center text-[#0B2345]">
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <p className="text-[10px] font-bold text-slate-500 flex-1">{label}</p>
      </div>
      <p className="text-xl font-black text-slate-900 tabular-nums">{value}</p>
    </Tag>
  );
}

/** Small permission shortcut — 3 per row on phones */
export function MobilePermissionChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-sm active:scale-[0.97] transition-transform min-h-[76px]"
    >
      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0B2345] to-[#163a6b] text-white flex items-center justify-center">
        <Icon size={17} strokeWidth={2.25} />
      </span>
      <span className="text-[10px] font-bold text-slate-700 text-center leading-tight line-clamp-2">
        {label}
      </span>
    </button>
  );
}

export function MobileBtnPrimary({
  children,
  onClick,
  className = '',
  fullWidth = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${fullWidth ? 'w-full' : ''} inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#0f2d52] to-[#0B2345] text-white text-xs font-bold shadow-[0_4px_14px_rgba(11,35,69,0.35)] active:scale-[0.98] transition-transform ${className}`}
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
      className={`flex-1 min-h-[44px] px-3 py-2.5 rounded-xl border border-[#0B2345]/15 bg-white text-[#0B2345] text-xs font-bold shadow-sm active:scale-[0.98] transition-transform ${className}`}
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
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 min-w-[72px] active:scale-95 transition-transform"
    >
      <span className="w-[56px] h-[56px] rounded-2xl bg-white border border-slate-200/90 shadow-[0_6px_20px_rgba(11,35,69,0.08)] flex items-center justify-center text-[#0B2345]">
        <Icon size={24} strokeWidth={2.25} />
      </span>
      <span className="text-[11px] font-bold text-slate-600">{label}</span>
    </button>
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
  return (
    <MobilePermissionChip icon={Icon} label={label} onClick={onClick} />
  );
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
      className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#0B2345] via-[#0f2d52] to-[#163a6b] text-white p-4 shadow-[0_12px_40px_rgba(11,35,69,0.35)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-6 w-40 h-40 rounded-full bg-[#C9A227]/10 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="w-[72px] h-[72px] rounded-2xl bg-white p-1.5 shadow-lg ring-2 ring-white/30 shrink-0 flex items-center justify-center overflow-hidden">
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
            <p className="text-[10px] font-bold text-white/65 uppercase tracking-widest mb-1">
              {badge}
            </p>
          ) : null}
          <p className="text-lg font-black leading-tight truncate">{schoolName}</p>
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
      className={`${box} rounded-2xl bg-white border border-slate-200/90 shadow-md flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-[#0B2345]/5`}
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

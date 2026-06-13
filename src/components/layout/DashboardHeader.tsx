import React from 'react';
import { ChevronRight, Menu } from 'lucide-react';
import { clsx } from 'clsx';

export type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type DashboardHeaderProps = {
  isRtl: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBack?: boolean;
  onBack?: () => void;
  onMenuToggle: () => void;
  menuCollapsed?: boolean;
  trailing?: React.ReactNode;
  className?: string;
};

export function DashboardHeader({
  isRtl,
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  showBack,
  onBack,
  onMenuToggle,
  menuCollapsed,
  trailing,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={clsx(
        'min-h-14 md:min-h-[4.5rem] pt-[calc(0.65rem+env(safe-area-inset-top,0px))] pb-3',
        'bg-sx-card/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-sx-border dark:border-slate-800',
        'flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-40 print:hidden',
        className,
      )}
    >
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="p-2 text-slate-500 hover:text-sx-primary bg-sx-surface hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all hidden lg:flex"
        >
          <Menu size={20} className={menuCollapsed ? 'rotate-90' : ''} />
        </button>

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-sx-primary rounded-xl lg:hidden"
          >
            <ChevronRight
              size={20}
              className={isRtl ? '' : 'rotate-180'}
            />
          </button>
        ) : null}

        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="hidden md:flex items-center gap-1 text-[11px] font-semibold text-slate-400 mb-0.5">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 ? (
                    <ChevronRight
                      size={12}
                      className={clsx('opacity-50', isRtl && 'rotate-180')}
                    />
                  ) : null}
                  {crumb.onClick ? (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      className="hover:text-sx-primary transition-colors"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          ) : eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-sx-accent truncate">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-sm md:text-lg font-bold text-sx-text dark:text-white truncate leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {trailing ? (
        <div className="flex items-center gap-2 md:gap-3 shrink-0">{trailing}</div>
      ) : null}
    </header>
  );
}

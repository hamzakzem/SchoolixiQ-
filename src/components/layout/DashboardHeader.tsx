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
  showMenuToggle?: boolean;
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
  showMenuToggle = true,
  trailing,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={clsx(
        'sx-dashboard-header sx-glass min-h-[var(--sx-header-height)] h-[var(--sx-header-height)]',
        'pt-[env(safe-area-inset-top,0px)]',
        'border-b border-sx-border/80 dark:border-slate-800',
        'flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 print:hidden',
        'z-[var(--sx-z-header)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {showMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="sx-header-action-btn text-slate-500 hover:text-sx-primary bg-sx-surface hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 hidden md:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-gold)]"
            aria-label={isRtl ? 'القائمة' : 'Menu'}
          >
            <Menu size={20} className={menuCollapsed ? (isRtl ? '-rotate-90' : 'rotate-90') : ''} />
          </button>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-header-action-btn text-slate-500 hover:text-sx-primary lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sx-gold)]"
            aria-label={isRtl ? 'رجوع' : 'Back'}
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
          <h1 className="text-sm md:text-base font-semibold text-sx-text dark:text-white truncate leading-tight">
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
        <div className="sx-header-actions">{trailing}</div>
      ) : null}
    </header>
  );
}

import React from 'react';
import { ChevronRight, PanelLeft } from 'lucide-react';
import { clsx } from 'clsx';
import SchoolixLogo from '../SchoolixLogo';
import { isCustomSchoolLogo } from '../../lib/brandAssets';

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
  brandTitle?: string;
  brandSubtitle?: string;
  schoolLogoUrl?: string;
  showBrand?: boolean;
  /** Optional utility slot (e.g. search) rendered with actions */
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

/**
 * Internal dashboard navbar — brand · page title · actions
 * RTL/LTR via logical start/end. Does not affect Landing.
 */
export function DashboardHeader({
  isRtl,
  eyebrow: _eyebrow,
  title,
  subtitle: _subtitle,
  breadcrumbs,
  showBack,
  onBack,
  onMenuToggle,
  menuCollapsed,
  showMenuToggle = true,
  brandTitle,
  brandSubtitle,
  schoolLogoUrl,
  showBrand = true,
  center,
  trailing,
  className,
}: DashboardHeaderProps) {
  return (
    <header
      className={clsx('sx-ds-topbar sx-dash-navbar print:hidden', className)}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Brand zone — inline-start (right in RTL, left in LTR) */}
      <div className="sx-ds-topbar__start">
        {showMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="sx-ds-icon-btn hidden md:inline-flex"
            aria-label={isRtl ? 'طي القائمة' : 'Toggle sidebar'}
            aria-pressed={Boolean(menuCollapsed)}
          >
            <PanelLeft
              size={18}
              strokeWidth={1.75}
              className={clsx(
                'transition-transform duration-200',
                menuCollapsed && (isRtl ? 'rotate-180' : ''),
                !menuCollapsed && (isRtl ? '' : 'rotate-180'),
              )}
            />
          </button>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-ds-icon-btn md:hidden"
            aria-label={isRtl ? 'رجوع' : 'Back'}
          >
            <ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} strokeWidth={1.75} />
          </button>
        ) : null}

        {showBrand ? (
          <div className="sx-ds-topbar__brand">
            <div className="sx-ds-topbar__logo">
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <img src={schoolLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                <SchoolixLogo size={24} surface="light" />
              )}
            </div>
            <div className="sx-ds-topbar__brand-text min-w-0">
              {brandTitle ? (
                <span className="sx-ds-topbar__brand-name">{brandTitle}</span>
              ) : null}
              {brandSubtitle ? (
                <span className="sx-ds-topbar__brand-desc">{brandSubtitle}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Page title — center */}
      <div className="sx-ds-topbar__center">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="sx-ds-topbar__crumbs hidden lg:flex" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb.label}-${i}`}>
                {i > 0 ? (
                  <ChevronRight
                    size={12}
                    className={clsx('opacity-35', isRtl && 'rotate-180')}
                    aria-hidden
                  />
                ) : null}
                {crumb.onClick ? (
                  <button type="button" onClick={crumb.onClick} className="sx-ds-topbar__crumb">
                    {crumb.label}
                  </button>
                ) : (
                  <span className="sx-ds-topbar__crumb sx-ds-topbar__crumb--current">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        <h1 className="sx-ds-topbar__title">{title}</h1>
      </div>

      {/* Actions — inline-end (left in RTL, right in LTR) */}
      <div className="sx-ds-topbar__end sx-header-actions">
        {center ? (
          <div className="sx-ds-topbar__utility hidden lg:block">{center}</div>
        ) : null}
        {trailing}
      </div>
    </header>
  );
}

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
 * RTL/LTR via dir + CSS logical properties. Does not affect Landing.
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
      {/* inline-start: brand + chrome controls */}
      <div className="sx-ds-topbar__start">
        {showMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="sx-ds-icon-btn sx-ds-icon-btn--menu hidden md:inline-flex"
            aria-label={isRtl ? 'طي القائمة' : 'Toggle sidebar'}
            aria-pressed={Boolean(menuCollapsed)}
            data-collapsed={menuCollapsed ? 'true' : 'false'}
          >
            <PanelLeft size={18} strokeWidth={1.75} className="sx-ds-topbar__menu-icon" />
          </button>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-ds-icon-btn sx-ds-icon-btn--back md:hidden"
            aria-label={isRtl ? 'رجوع' : 'Back'}
          >
            <ChevronRight size={18} strokeWidth={1.75} className="sx-ds-topbar__back-icon" />
          </button>
        ) : null}

        {showBrand ? (
          <div className="sx-ds-topbar__brand">
            <div className="sx-ds-topbar__logo" aria-hidden={false}>
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <img src={schoolLogoUrl} alt="" className="sx-ds-topbar__logo-img" />
              ) : (
                <SchoolixLogo size={24} surface="light" />
              )}
            </div>
            {(brandTitle || brandSubtitle) ? (
              <div className="sx-ds-topbar__brand-text">
                {brandTitle ? (
                  <span className="sx-ds-topbar__brand-name">{brandTitle}</span>
                ) : null}
                {brandSubtitle ? (
                  <span className="sx-ds-topbar__brand-desc">{brandSubtitle}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* center: page identity */}
      <div className="sx-ds-topbar__center">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="sx-ds-topbar__crumbs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb.label}-${i}`}>
                {i > 0 ? (
                  <ChevronRight size={12} className="sx-ds-topbar__crumb-sep" aria-hidden />
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

      {/* inline-end: utilities + notifications / assistant / profile */}
      <div className="sx-ds-topbar__end">
        {center ? (
          <div className="sx-ds-topbar__utility">{center}</div>
        ) : null}
        {trailing ? (
          <div className="sx-ds-topbar__actions sx-header-actions">{trailing}</div>
        ) : null}
      </div>
    </header>
  );
}

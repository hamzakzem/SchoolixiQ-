import React from 'react';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  /** Optional brand mark in navbar (SaaS chrome). */
  brandTitle?: string;
  schoolLogoUrl?: string;
  showBrand?: boolean;
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
  brandTitle,
  schoolLogoUrl,
  showBrand = true,
  trailing,
  className,
}: DashboardHeaderProps) {
  const CollapseIcon = menuCollapsed
    ? isRtl
      ? PanelLeftClose
      : PanelLeftOpen
    : isRtl
      ? PanelLeftOpen
      : PanelLeftClose;

  return (
    <header
      className={clsx('sx-app-header sx-dashboard-header print:hidden', className)}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="sx-app-header__start">
        {showMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="sx-header-action-btn sx-app-header__icon-btn hidden md:inline-flex"
            aria-label={isRtl ? 'طي القائمة' : 'Toggle sidebar'}
            aria-pressed={Boolean(menuCollapsed)}
          >
            <CollapseIcon size={18} strokeWidth={2} />
          </button>
        ) : null}

        {showBrand ? (
          <div className="sx-app-header__brand">
            <div className="sx-app-header__logo">
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <img src={schoolLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                <SchoolixLogo size={28} surface="dark" />
              )}
            </div>
            {brandTitle ? (
              <span className="sx-app-header__brand-name hidden lg:inline">{brandTitle}</span>
            ) : null}
            <span className="sx-app-header__divider hidden sm:block" aria-hidden />
          </div>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-header-action-btn sx-app-header__icon-btn lg:hidden"
            aria-label={isRtl ? 'رجوع' : 'Back'}
          >
            <ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} strokeWidth={2} />
          </button>
        ) : null}

        <div className="sx-app-header__title-block min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="sx-app-header__crumbs hidden md:flex" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 ? (
                    <ChevronRight
                      size={12}
                      className={clsx('sx-app-header__crumb-sep', isRtl && 'rotate-180')}
                      aria-hidden
                    />
                  ) : null}
                  {crumb.onClick ? (
                    <button type="button" onClick={crumb.onClick} className="sx-app-header__crumb">
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="sx-app-header__crumb sx-app-header__crumb--current">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          ) : eyebrow ? (
            <p className="sx-app-header__eyebrow">{eyebrow}</p>
          ) : null}
          <h1 className="sx-app-header__title">{title}</h1>
          {subtitle ? <p className="sx-app-header__subtitle hidden sm:block">{subtitle}</p> : null}
        </div>
      </div>

      {trailing ? <div className="sx-app-header__end sx-header-actions">{trailing}</div> : null}
    </header>
  );
}

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
  schoolLogoUrl?: string;
  showBrand?: boolean;
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

/** Dashboard topbar — Bootstrap dark navbar (bg-dark → Navy) */
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
  center,
  trailing,
  className,
}: DashboardHeaderProps) {
  return (
    <header className={clsx('sx-ds-topbar print:hidden', className)} dir={isRtl ? 'rtl' : 'ltr'}>
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

        {showBrand ? (
          <div className="sx-ds-topbar__brand">
            <div className="sx-ds-topbar__logo">
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <img src={schoolLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                <SchoolixLogo size={26} surface="light" />
              )}
            </div>
            {brandTitle ? (
              <span className="sx-ds-topbar__brand-name hidden xl:inline">{brandTitle}</span>
            ) : null}
          </div>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-ds-icon-btn lg:hidden"
            aria-label={isRtl ? 'رجوع' : 'Back'}
          >
            <ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} strokeWidth={1.75} />
          </button>
        ) : null}

        <div className="sx-ds-topbar__title-block min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="sx-ds-topbar__crumbs hidden lg:flex" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 ? (
                    <ChevronRight
                      size={11}
                      className={clsx('opacity-40', isRtl && 'rotate-180')}
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
          ) : eyebrow ? (
            <p className="sx-ds-topbar__eyebrow hidden lg:block">{eyebrow}</p>
          ) : null}
          <h1 className="sx-ds-topbar__title">{title}</h1>
          {subtitle ? <p className="sx-ds-topbar__subtitle hidden xl:block">{subtitle}</p> : null}
        </div>
      </div>

      {center ? (
        <div className="sx-ds-topbar__center hidden md:flex">
          <div className="sx-ds-topbar__search-host">{center}</div>
        </div>
      ) : (
        <div className="sx-ds-topbar__center" aria-hidden />
      )}

      {trailing ? (
        <div className="sx-ds-topbar__end sx-header-actions">{trailing}</div>
      ) : (
        <div className="sx-ds-topbar__end" aria-hidden />
      )}
    </header>
  );
}

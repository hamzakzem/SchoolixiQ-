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
  /** Center zone — typically global search */
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
};

/**
 * Premium SaaS navbar — brand · page context · search · actions
 */
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
          <div className="sx-app-header__brand" aria-hidden={false}>
            <div className="sx-app-header__logo">
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <img src={schoolLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                <SchoolixLogo size={26} surface="dark" />
              )}
            </div>
            {brandTitle ? (
              <span className="sx-app-header__brand-name hidden xl:inline">{brandTitle}</span>
            ) : null}
          </div>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-header-action-btn sx-app-header__icon-btn lg:hidden"
            aria-label={isRtl ? 'رجوع' : 'Back'}
          >
            <ChevronRight size={18} className={isRtl ? '' : 'rotate-180'} strokeWidth={1.75} />
          </button>
        ) : null}

        <div className="sx-app-header__title-block min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav className="sx-app-header__crumbs hidden md:flex" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={`${crumb.label}-${i}`}>
                  {i > 0 ? (
                    <ChevronRight
                      size={11}
                      className={clsx('sx-app-header__crumb-sep opacity-40', isRtl && 'rotate-180')}
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
          {subtitle ? <p className="sx-app-header__subtitle hidden lg:block">{subtitle}</p> : null}
        </div>
      </div>

      {center ? (
        <div className="sx-app-header__center hidden md:flex">
          <div className="sx-app-header__search-host">{center}</div>
        </div>
      ) : (
        <div className="sx-app-header__center" aria-hidden />
      )}

      {trailing ? (
        <div className="sx-app-header__end sx-header-actions">{trailing}</div>
      ) : (
        <div className="sx-app-header__end" aria-hidden />
      )}
    </header>
  );
}

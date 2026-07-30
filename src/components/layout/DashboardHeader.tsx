import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, LogOut, PanelLeft, UserRound } from 'lucide-react';
import { clsx } from 'clsx';
import SchoolixLogo from '../SchoolixLogo';
import { isCustomSchoolLogo } from '../../lib/brandAssets';
import { useAuth } from '../../lib/AuthContext';

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
  /** Optional utility slot (e.g. search) — desktop only via CSS */
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Optional explicit profile override (otherwise reads AuthContext) */
  profileName?: string;
  profileRole?: string;
  profileImageUrl?: string;
  onLogout?: () => void;
  showProfileMenu?: boolean;
  className?: string;
};

function roleLabel(role: string | undefined, isRtl: boolean): string {
  const r = String(role || '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') return isRtl ? 'مدير النظام' : 'Super Admin';
  if (r === 'platform_assistant') return isRtl ? 'مساعد المنصة' : 'Platform Assistant';
  if (r === 'admin' || r === 'school_admin') return isRtl ? 'مدير المدرسة' : 'School Admin';
  if (r === 'assistant' || r === 'school_assistant') return isRtl ? 'مساعد إداري' : 'Assistant';
  if (r === 'teacher') return isRtl ? 'معلم' : 'Teacher';
  if (r === 'parent') return isRtl ? 'ولي أمر' : 'Parent';
  if (r === 'guard') return isRtl ? 'حارس' : 'Guard';
  if (r === 'distributor') return isRtl ? 'موزّع' : 'Distributor';
  return isRtl ? 'حساب' : 'Account';
}

/**
 * Enterprise SaaS dashboard navbar (Linear / Vercel / Stripe style).
 * Brand · page title · actions. Logical CSS for RTL/LTR. Landing untouched.
 */
export function DashboardHeader({
  isRtl,
  eyebrow: _eyebrow,
  title,
  subtitle: _subtitle,
  breadcrumbs: _breadcrumbs,
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
  profileName,
  profileRole,
  profileImageUrl,
  onLogout,
  showProfileMenu = true,
  className,
}: DashboardHeaderProps) {
  const { profile } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const displayName = (profileName || profile?.name || '').trim();
  const displayRole = profileRole || roleLabel(profile?.role, isRtl);
  const displayImage = profileImageUrl || profile?.photoURL || '';
  const initial = (displayName || '?').charAt(0).toUpperCase();

  useEffect(() => {
    if (!profileOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!profileWrapRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  return (
    <header
      className={clsx(
        'sx-ds-topbar sx-dash-navbar sx-nav print:hidden',
        showProfileMenu && 'sx-nav--has-profile',
        className,
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="sx-nav__start">
        {showMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="sx-nav__icon-btn sx-nav__icon-btn--menu"
            aria-label={isRtl ? 'طي القائمة' : 'Toggle sidebar'}
            aria-pressed={Boolean(menuCollapsed)}
            data-collapsed={menuCollapsed ? 'true' : 'false'}
          >
            <PanelLeft size={18} strokeWidth={1.75} className="sx-nav__menu-icon" />
          </button>
        ) : null}

        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="sx-nav__icon-btn sx-nav__icon-btn--back"
            aria-label={isRtl ? 'رجوع' : 'Back'}
          >
            <ChevronRight size={18} strokeWidth={1.75} className="sx-nav__back-icon" />
          </button>
        ) : null}

        {showBrand ? (
          <div className="sx-nav__brand">
            <div className="sx-nav__logo">
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <img src={schoolLogoUrl} alt="" className="sx-nav__logo-img" />
              ) : (
                <SchoolixLogo size={22} surface="light" />
              )}
            </div>
            {(brandTitle || brandSubtitle) ? (
              <div className="sx-nav__brand-copy">
                {brandTitle ? <span className="sx-nav__brand-name">{brandTitle}</span> : null}
                {brandSubtitle ? <span className="sx-nav__brand-meta">{brandSubtitle}</span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="sx-nav__center">
        <h1 className="sx-nav__title">{title}</h1>
      </div>

      <div className="sx-nav__end">
        {center ? <div className="sx-nav__utility">{center}</div> : null}

        <div className="sx-nav__actions sx-header-actions">
          {trailing}

          {showProfileMenu && displayName ? (
            <div className="sx-nav__profile" ref={profileWrapRef}>
              <button
                type="button"
                className="sx-nav__profile-trigger"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-controls={menuId}
                onClick={() => setProfileOpen((v) => !v)}
              >
                <span className="sx-nav__avatar sx-ds-avatar sx-nav-profile__avatar">
                  {displayImage ? (
                    <img src={displayImage} alt="" className="sx-nav__avatar-img" />
                  ) : (
                    initial
                  )}
                </span>
                <span className="sx-nav__profile-meta">
                  <span className="sx-nav__profile-name">{displayName}</span>
                  <span className="sx-nav__profile-role">{displayRole}</span>
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  className={clsx('sx-nav__profile-caret', profileOpen && 'is-open')}
                  aria-hidden
                />
              </button>

              {profileOpen ? (
                <div id={menuId} className="sx-nav__profile-menu" role="menu">
                  <div className="sx-nav__profile-menu-head">
                    <span className="sx-nav__avatar sx-nav__avatar--lg sx-ds-avatar">
                      {displayImage ? (
                        <img src={displayImage} alt="" className="sx-nav__avatar-img" />
                      ) : (
                        <UserRound size={18} strokeWidth={1.75} />
                      )}
                    </span>
                    <div className="sx-nav__profile-menu-copy">
                      <span className="sx-nav__profile-menu-name">{displayName}</span>
                      <span className="sx-nav__profile-menu-role">{displayRole}</span>
                    </div>
                  </div>
                  {onLogout ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="sx-nav__profile-item sx-nav__profile-item--danger"
                      onClick={() => {
                        setProfileOpen(false);
                        onLogout();
                      }}
                    >
                      <LogOut size={15} strokeWidth={1.75} aria-hidden />
                      <span>{isRtl ? 'تسجيل الخروج' : 'Sign out'}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

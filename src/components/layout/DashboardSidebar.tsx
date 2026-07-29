import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import SchoolixLogo from '../SchoolixLogo';
import { isCustomSchoolLogo } from '../../lib/brandAssets';
import {
  groupMenuBySection,
  type DashboardMenuItem,
  type DashboardNavSection,
  type DashboardShellVariant,
} from '../../lib/dashboardMenu';

type DashboardSidebarProps = {
  variant: DashboardShellVariant;
  menuItems: DashboardMenuItem[];
  sections?: DashboardNavSection[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isOpen: boolean;
  isCollapsed: boolean;
  isRtl: boolean;
  onCloseMobile: () => void;
  portalTitle: string;
  portalSubtitle?: string;
  schoolLogoUrl?: string;
  logoutLabel: string;
  onLogout: () => void;
  sectionLabels?: Record<string, string>;
  docked?: boolean;
};

/** Dashboard sidebar — Landing navy brand language */
export function DashboardSidebar({
  variant: _variant,
  menuItems,
  sections,
  activeTab,
  onTabChange,
  isOpen,
  isCollapsed,
  isRtl,
  onCloseMobile,
  portalTitle,
  portalSubtitle,
  schoolLogoUrl,
  logoutLabel,
  onLogout,
  sectionLabels,
  docked = false,
}: DashboardSidebarProps) {
  const groups = sections?.length
    ? groupMenuBySection(menuItems, sections)
    : [{ section: { id: 'all', label: '' }, items: menuItems }];

  const renderNavButton = (item: DashboardMenuItem) => {
    const active = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          onTabChange(item.id);
          onCloseMobile();
        }}
        title={isCollapsed ? item.label : undefined}
        className={clsx(
          'sx-ds-nav-item group',
          active && 'is-active',
          isCollapsed && 'sx-ds-nav-item--collapsed',
        )}
        dir={isRtl ? 'rtl' : 'ltr'}
        aria-current={active ? 'page' : undefined}
      >
        <span className="sx-ds-nav-item__rail" aria-hidden />
        <item.icon size={isCollapsed ? 19 : 17} className="shrink-0" strokeWidth={1.75} />
        {!isCollapsed ? (
          <span className="sx-ds-nav-item__label">{item.label}</span>
        ) : null}
        {!isCollapsed && item.badge != null && item.badge > 0 ? (
          <span className="sx-ds-nav-item__badge">{item.badge > 99 ? '99+' : item.badge}</span>
        ) : null}
        {isCollapsed ? (
          <span
            className={clsx(
              'sx-ds-nav-tooltip',
              isRtl ? 'sx-ds-nav-tooltip--rtl' : 'sx-ds-nav-tooltip--ltr',
            )}
          >
            {item.label}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {docked || isOpen ? (
        <motion.aside
          layout
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={clsx(
            'sx-ds-sidebar sx-shell-sidebar overflow-hidden print:hidden',
            'pt-[env(safe-area-inset-top,0px)]',
            docked && 'sx-shell-sidebar--docked',
            !docked && isOpen && 'sx-shell-sidebar--drawer',
            isCollapsed && 'sx-shell-sidebar--collapsed',
          )}
        >
          <div className="sx-ds-sidebar__inner">
            <div
              className={clsx(
                'sx-ds-sidebar__brand',
                isCollapsed && 'sx-ds-sidebar__brand--collapsed',
              )}
            >
              <div className="sx-ds-sidebar__logo">
                {isCustomSchoolLogo(schoolLogoUrl) ? (
                  <img src={schoolLogoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <SchoolixLogo size={isCollapsed ? 26 : 30} surface="light" />
                )}
              </div>
              {!isCollapsed ? (
                <div className="min-w-0" dir={isRtl ? 'rtl' : 'ltr'}>
                  <h2 className="sx-ds-sidebar__title truncate">{portalTitle}</h2>
                  {portalSubtitle ? (
                    <p className="sx-ds-sidebar__subtitle truncate">{portalSubtitle}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <nav className="sx-ds-sidebar__nav custom-scrollbar" aria-label="Primary">
              {groups.map(({ section, items }) => (
                <div key={section.id} className="sx-ds-sidebar__group">
                  {!isCollapsed && section.label ? (
                    <p className="sx-ds-sidebar__section">
                      {sectionLabels?.[section.id] ?? section.label}
                    </p>
                  ) : null}
                  <div className="sx-ds-sidebar__items">{items.map(renderNavButton)}</div>
                </div>
              ))}
            </nav>

            <div className="sx-ds-sidebar__footer">
              <button
                type="button"
                onClick={onLogout}
                title={isCollapsed ? logoutLabel : undefined}
                className={clsx('sx-ds-logout', isCollapsed && 'sx-ds-logout--collapsed')}
              >
                <LogOut size={isCollapsed ? 18 : 16} className="shrink-0" strokeWidth={1.75} />
                {!isCollapsed ? <span>{logoutLabel}</span> : null}
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function DashboardMobileSidebarOverlay({
  isOpen,
  isRtl,
  onClose,
  children,
}: {
  isOpen: boolean;
  isRtl: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 md:hidden print:hidden z-[var(--sx-z-drawer-backdrop)] bg-[#0B1F3A]/40"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: isRtl ? 280 : -280 }}
        animate={{ x: 0 }}
        exit={{ x: isRtl ? 280 : -280 }}
        className={clsx(
          'sx-ds-sidebar fixed inset-y-0 w-[min(88vw,320px)] max-w-[320px] md:hidden print:hidden pt-[env(safe-area-inset-top,0px)] z-[var(--sx-z-drawer)]',
          isRtl ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </motion.aside>
    </>
  );
}

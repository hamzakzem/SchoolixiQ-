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
};

function activeClasses(variant: DashboardShellVariant, active: boolean) {
  if (!active) {
    return 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 dark:text-slate-400';
  }
  switch (variant) {
    case 'admin-dark':
      return 'bg-white text-slate-900 shadow-md';
    case 'superadmin':
      return 'bg-blue-600 text-white shadow-md';
    default:
      return 'bg-sx-primary text-white shadow-md dark:bg-white dark:text-sx-primary';
  }
}

function sidebarSurface(variant: DashboardShellVariant) {
  switch (variant) {
    case 'admin-dark':
      return 'bg-sx-primary text-white border-sx-primary/20';
    case 'superadmin':
      return 'bg-slate-950 text-white border-slate-800';
    default:
      return 'bg-sx-card text-sx-text border-sx-border dark:bg-slate-900 dark:border-slate-800';
  }
}

export function DashboardSidebar({
  variant,
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
}: DashboardSidebarProps) {
  const groups = sections?.length
    ? groupMenuBySection(menuItems, sections)
    : [{ section: { id: 'all', label: '' }, items: menuItems }];

  const renderNavButton = (item: DashboardMenuItem) => (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        onTabChange(item.id);
        onCloseMobile();
      }}
      title={isCollapsed ? item.label : undefined}
      className={clsx(
        'w-full flex rounded-xl transition-all font-semibold text-sm active:scale-[0.98] group relative',
        isCollapsed ? 'justify-center px-0 py-3' : 'items-center gap-3 px-3 py-2.5',
        activeClasses(variant, activeTab === item.id),
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <item.icon size={isCollapsed ? 22 : 18} className="shrink-0 opacity-90" />
      {!isCollapsed ? (
        <span className="truncate flex-1 text-left rtl:text-right">{item.label}</span>
      ) : null}
      {!isCollapsed && item.badge != null && item.badge > 0 ? (
        <span className="min-w-[20px] h-5 px-1 rounded-full bg-sx-accent text-sx-primary text-[10px] font-black flex items-center justify-center">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
      {isCollapsed ? (
        <div
          className={clsx(
            'absolute hidden group-hover:block bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none',
            isRtl ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]',
          )}
        >
          {item.label}
        </div>
      ) : null}
    </button>
  );

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <motion.aside
          initial={{ x: isRtl ? 280 : -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1, width: isCollapsed ? 76 : 272 }}
          exit={{ x: isRtl ? 280 : -280, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className={clsx(
            'flex-col shrink-0 fixed inset-y-0 z-50 lg:relative shadow-2xl lg:shadow-none overflow-hidden print:hidden pt-[env(safe-area-inset-top,0px)] hidden lg:flex border',
            isRtl ? 'right-0 border-l' : 'left-0 border-r',
            sidebarSurface(variant),
          )}
        >
          <div className="h-full flex flex-col min-w-0">
            <div
              className={clsx(
                'px-4 py-5 flex items-center gap-3 border-b',
                variant === 'light'
                  ? 'border-sx-border dark:border-slate-800'
                  : 'border-white/10',
                isCollapsed && 'justify-center px-2',
              )}
            >
              {isCustomSchoolLogo(schoolLogoUrl) ? (
                <div className="w-10 h-10 rounded-xl bg-white/10 p-1 border border-white/10 flex items-center justify-center shrink-0">
                  <img src={schoolLogoUrl} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <SchoolixLogo size={isCollapsed ? 36 : 40} surface={variant === 'light' ? 'dark' : 'light'} />
              )}
              {!isCollapsed ? (
                <div className="min-w-0" dir={isRtl ? 'rtl' : 'ltr'}>
                  <h2 className="font-bold leading-tight truncate text-sm">{portalTitle}</h2>
                  {portalSubtitle ? (
                    <p className="text-[10px] uppercase tracking-wider text-sx-accent font-bold truncate mt-0.5">
                      {portalSubtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">
              {groups.map(({ section, items }) => (
                <div key={section.id}>
                  {!isCollapsed && section.label ? (
                    <p
                      className={clsx(
                        'px-2 mb-2 text-[10px] font-bold uppercase tracking-[0.14em]',
                        variant === 'light'
                          ? 'text-slate-400'
                          : 'text-white/45',
                      )}
                    >
                      {sectionLabels?.[section.id] ?? section.label}
                    </p>
                  ) : null}
                  <div className="space-y-1">{items.map(renderNavButton)}</div>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-inherit">
              <button
                type="button"
                onClick={onLogout}
                title={isCollapsed ? logoutLabel : undefined}
                className={clsx(
                  'w-full flex rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-semibold text-sm',
                  isCollapsed ? 'justify-center py-3' : 'items-center gap-3 px-3 py-2.5',
                )}
              >
                <LogOut size={isCollapsed ? 22 : 18} className="shrink-0" />
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
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden print:hidden"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: isRtl ? 280 : -280 }}
        animate={{ x: 0 }}
        exit={{ x: isRtl ? 280 : -280 }}
        className={clsx(
          'fixed inset-y-0 z-50 w-[min(288px,88vw)] lg:hidden print:hidden pt-[env(safe-area-inset-top,0px)]',
          isRtl ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </motion.aside>
    </>
  );
}

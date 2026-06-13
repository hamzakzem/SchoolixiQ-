import React, { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { GlobalFooter } from '../GlobalFooter';
import { MobileNavigationDock } from '../MobileNavigationDock';
import { DashboardHeader, type BreadcrumbItem } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import {
  type DashboardMenuItem,
  type DashboardNavSection,
  type DashboardShellVariant,
} from '../../lib/dashboardMenu';

export type DashboardShellProps = {
  variant?: DashboardShellVariant;
  menuItems: DashboardMenuItem[];
  sections?: DashboardNavSection[];
  sectionLabels?: Record<string, string>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isRtl: boolean;
  portalTitle: string;
  portalSubtitle?: string;
  schoolLogoUrl?: string;
  logoutLabel: string;
  onLogout: () => void;
  /** Header */
  headerEyebrow?: string;
  headerTitle: string;
  headerSubtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBack?: boolean;
  onBack?: () => void;
  headerTrailing?: React.ReactNode;
  /** Layout */
  children: React.ReactNode;
  showFooter?: boolean;
  fullHeightTab?: boolean;
  /** Mobile dock */
  notificationsCount?: number;
  showNotifications?: boolean;
  setShowNotifications?: (show: boolean) => void;
  className?: string;
};

export function DashboardShell({
  variant = 'light',
  menuItems,
  sections,
  sectionLabels,
  activeTab,
  onTabChange,
  isRtl,
  portalTitle,
  portalSubtitle,
  schoolLogoUrl,
  logoutLabel,
  onLogout,
  headerEyebrow,
  headerTitle,
  headerSubtitle,
  breadcrumbs,
  showBack,
  onBack,
  headerTrailing,
  children,
  showFooter = true,
  fullHeightTab = false,
  notificationsCount = 0,
  showNotifications = false,
  setShowNotifications,
  className,
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
        setIsSidebarCollapsed(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuToggle = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSidebarCollapsed((v) => !v);
    } else {
      setIsSidebarOpen((v) => {
        if (!v) setIsSidebarCollapsed(false);
        return !v;
      });
    }
  }, []);

  const closeMobileSidebar = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  return (
    <div
      className={clsx(
        'sx-shell h-[100dvh] overflow-hidden flex bg-sx-surface transition-colors print:overflow-visible print:h-auto print:block',
        className,
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <DashboardSidebar
        variant={variant}
        menuItems={menuItems}
        sections={sections}
        sectionLabels={sectionLabels}
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        isRtl={isRtl}
        onCloseMobile={closeMobileSidebar}
        portalTitle={portalTitle}
        portalSubtitle={portalSubtitle}
        schoolLogoUrl={schoolLogoUrl}
        logoutLabel={logoutLabel}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden print:overflow-visible print:h-auto">
        <DashboardHeader
          isRtl={isRtl}
          eyebrow={headerEyebrow}
          title={headerTitle}
          subtitle={headerSubtitle}
          breadcrumbs={breadcrumbs}
          showBack={showBack}
          onBack={onBack}
          onMenuToggle={handleMenuToggle}
          menuCollapsed={isSidebarCollapsed}
          trailing={headerTrailing}
        />

        <div
          className={clsx(
            'flex-1 flex flex-col min-h-0 print:overflow-visible',
            fullHeightTab
              ? 'overflow-hidden pb-[72px] lg:pb-0'
              : 'overflow-y-auto custom-scrollbar pb-[88px] lg:pb-8',
          )}
        >
          <div
            className={clsx(
              fullHeightTab
                ? 'h-full w-full flex flex-col min-h-0 overflow-hidden'
                : 'w-full max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-8 sx-fade-in flex flex-col flex-1',
            )}
          >
            {children}
          </div>
          {showFooter && !fullHeightTab ? <GlobalFooter compact /> : null}
        </div>

        <MobileNavigationDock
          menuItems={menuItems}
          activeTab={activeTab}
          setActiveTab={(tabId) => {
            onTabChange(tabId);
            closeMobileSidebar();
          }}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notificationsCount={notificationsCount}
          isRtl={isRtl}
          logoutLabel={logoutLabel}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { OfflineQueueTrigger } from '../OfflineSyncIndicator';
import { MobileNavigationDock } from '../MobileNavigationDock';
import { GlobalFooter } from '../GlobalFooter';
import { DashboardHeader, type BreadcrumbItem } from './DashboardHeader';
import { DashboardSidebar } from './DashboardSidebar';
import {
  DashboardSmartAssistant,
  SmartAssistantNavButton,
} from '../smart-assistant/DashboardSmartAssistant';
import { useDevice } from '../../lib/useDevice';
import {
  type DashboardMenuItem,
  type DashboardNavSection,
  type DashboardShellVariant,
} from '../../lib/dashboardMenu';
import { invokeChatBack } from '../../lib/chatUiBridge';

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
  headerEyebrow?: string;
  headerTitle: string;
  headerSubtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBack?: boolean;
  onBack?: () => void;
  /** Center navbar slot (global search). */
  headerCenter?: React.ReactNode;
  headerTrailing?: React.ReactNode;
  children: React.ReactNode;
  showFooter?: boolean;
  fullHeightTab?: boolean;
  hideMobileDock?: boolean;
  notificationsCount?: number;
  showNotifications?: boolean;
  setShowNotifications?: (show: boolean) => void;
  className?: string;
  hideSmartAssistant?: boolean;
};

/** Unified premium AppShell — fixed sidebar + sticky navbar + scroll body. */
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
  headerCenter,
  headerTrailing,
  children,
  showFooter = false,
  fullHeightTab = false,
  hideMobileDock = false,
  notificationsCount = 0,
  showNotifications = false,
  setShowNotifications,
  className,
  hideSmartAssistant = false,
}: DashboardShellProps) {
  const { isMobile, isTablet } = useDevice();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    if (isTablet) setIsSidebarCollapsed(true);
    if (isMobile) setIsSidebarCollapsed(false);
  }, [isTablet, isMobile]);

  const handleMenuToggle = useCallback(() => {
    if (!isMobile) setIsSidebarCollapsed((v) => !v);
  }, [isMobile]);

  const handleHeaderBack = useCallback(() => {
    if (activeTab === 'chat' && invokeChatBack()) return;
    onBack?.();
  }, [activeTab, onBack]);

  const sidebarCollapsed = isSidebarCollapsed;
  const assistantHidden = hideSmartAssistant || activeTab === 'chat';

  return (
    <div
      className={clsx(
        'sx-ds-shell sx-shell sx-app-shell sx-dashboard-context sx-dashboard-layout sx-shell-layout',
        'print:overflow-visible print:h-auto print:block',
        !isMobile && 'sx-shell--with-sidebar',
        !isMobile && sidebarCollapsed && 'sx-shell--sidebar-collapsed',
        className,
      )}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {!isMobile ? (
        <DashboardSidebar
          variant={variant}
          menuItems={menuItems}
          sections={sections}
          activeTab={activeTab}
          onTabChange={onTabChange}
          isOpen
          docked
          isCollapsed={sidebarCollapsed}
          isRtl={isRtl}
          onCloseMobile={() => undefined}
          portalTitle={portalTitle}
          portalSubtitle={portalSubtitle}
          schoolLogoUrl={schoolLogoUrl}
          logoutLabel={logoutLabel}
          onLogout={onLogout}
          sectionLabels={sectionLabels}
        />
      ) : null}

      <div
        className={clsx(
          'sx-dashboard-content sx-shell-content print:overflow-visible print:h-auto',
          fullHeightTab && 'sx-shell-main--chat',
        )}
      >
        <DashboardHeader
          isRtl={isRtl}
          eyebrow={headerEyebrow}
          title={headerTitle}
          subtitle={headerSubtitle}
          breadcrumbs={breadcrumbs}
          showBack={showBack}
          onBack={onBack ? handleHeaderBack : undefined}
          onMenuToggle={handleMenuToggle}
          menuCollapsed={sidebarCollapsed}
          showMenuToggle={!isMobile}
          brandTitle={portalTitle}
          brandSubtitle={portalSubtitle}
          schoolLogoUrl={schoolLogoUrl}
          showBrand
          center={headerCenter}
          trailing={
            <>
              {headerTrailing}
              {!assistantHidden ? (
                <SmartAssistantNavButton isRtl={isRtl} onClick={() => setAssistantOpen(true)} />
              ) : null}
              {!isMobile ? (
                <OfflineQueueTrigger variant="header" className="inline-flex" />
              ) : null}
            </>
          }
        />

        <div
          className={clsx(
            'sx-shell-scroll custom-scrollbar print:overflow-visible',
            fullHeightTab
              ? hideMobileDock
                ? 'overflow-hidden !pb-0'
                : 'overflow-hidden sx-shell-main--chat'
              : isMobile
                ? 'sx-shell-scroll--with-dock'
                : '',
          )}
        >
          <div
            className={clsx(
              'sx-shell-content-inner',
              fullHeightTab
                ? 'h-full w-full flex flex-col min-h-0 overflow-hidden flex-1 !p-0 !gap-0'
                : 'w-full max-w-7xl mx-auto sx-fade-in flex-1',
              !isMobile && 'max-w-none',
            )}
          >
            {children}
          </div>
          {showFooter && !fullHeightTab ? <GlobalFooter compact /> : null}
        </div>

        {isMobile ? (
          <MobileNavigationDock
            menuItems={menuItems}
            activeTab={activeTab}
            setActiveTab={onTabChange}
            isSidebarOpen={false}
            setIsSidebarOpen={() => undefined}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            notificationsCount={notificationsCount}
            isRtl={isRtl}
            logoutLabel={logoutLabel}
            onLogout={onLogout}
            hidden={hideMobileDock}
            desktopDrawerEnabled={false}
          />
        ) : null}
      </div>

      <DashboardSmartAssistant
        hidden={assistantHidden}
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
    </div>
  );
}

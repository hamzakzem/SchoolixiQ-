import type { ReactNode } from 'react';
import MobileMockupHeader from './MobileMockupHeader';
import MobileMockupBottomNav from './MobileMockupBottomNav';
import {
  mobileNavToTab,
  tabToMobileNav,
  type DashboardRole,
  type MobileNavId,
} from './mobileNavMaps';

type Props = {
  role: DashboardRole;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  headerSubtitle?: string;
  onNotifications?: () => void;
  children: ReactNode;
};

/** Fixed header + bottom nav + padded content (mobile / native only). */
export default function MobileMockupFrame({
  role,
  activeTab,
  onTabChange,
  headerSubtitle,
  onNotifications,
  children,
}: Props) {
  const nav = tabToMobileNav(role, activeTab);

  return (
    <>
      <MobileMockupHeader subtitle={headerSubtitle} onNotifications={onNotifications} />
      <div className="lg:hidden pt-[52px] pb-[72px] min-h-[100dvh] bg-[#eef1f6]">
        {children}
      </div>
      <MobileMockupBottomNav
        role={role}
        active={nav}
        onChange={(id: MobileNavId) => onTabChange(mobileNavToTab(role, id))}
      />
    </>
  );
}

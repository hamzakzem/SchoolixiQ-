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
  schoolName?: string;
  schoolLogoUrl?: string | null;
  onNotifications?: () => void;
  children: ReactNode;
};

/** Fixed header + bottom nav + padded content (mobile / native only). */
export default function MobileMockupFrame({
  role,
  activeTab,
  onTabChange,
  schoolName,
  schoolLogoUrl,
  onNotifications,
  children,
}: Props) {
  const nav = tabToMobileNav(role, activeTab);

  return (
    <>
      <MobileMockupHeader
        schoolName={schoolName}
        schoolLogoUrl={schoolLogoUrl}
        onNotifications={onNotifications}
      />
      <div className="pt-[64px] pb-[80px] min-h-[100dvh] bg-gradient-to-b from-[#f6f8fc] via-[#eef2f8] to-[#e6ecf4]">
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

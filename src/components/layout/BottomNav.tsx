import React from 'react';
import { MobileNavigationDock } from '../MobileNavigationDock';
import { useDevice } from '../../lib/useDevice';

type BottomNavProps = React.ComponentProps<typeof MobileNavigationDock>;

/** Bottom navigation — mobile only (<768px). Tablet/desktop use Sidebar. */
export function BottomNav(props: BottomNavProps) {
  const { isMobile } = useDevice();
  if (!isMobile) return null;
  return <MobileNavigationDock {...props} desktopDrawerEnabled={false} />;
}

export { MobileNavigationDock };

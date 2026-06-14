import { useEffect } from 'react';
import {
  consumePendingNotificationRoute,
  normalizeDashboardRole,
  type NotificationRouteRole,
} from './notificationRouting';

/** Hook: apply pending push/SW notification route to dashboard tab. */
export function useNotificationRouteRedirect(
  role: NotificationRouteRole | '',
  setActiveTab: (tab: string) => void,
): void {
  useEffect(() => {
    const run = () => {
      consumePendingNotificationRoute(role, setActiveTab);
    };
    run();
    window.addEventListener('schoolix_tab_redirect', run);
    return () => window.removeEventListener('schoolix_tab_redirect', run);
  }, [role, setActiveTab]);
}

export { normalizeDashboardRole };

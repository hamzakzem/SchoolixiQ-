import { useEffect } from 'react';
import { resolveNotificationTab, type AppNotification } from './notificationDeepLink';

export const PUSH_NAV_EVENT = 'schoolix:push-navigate';

export type PushNavigateDetail = {
  tab?: string;
  url?: string;
  type?: string;
  notificationId?: string;
};

export function dispatchPushNavigation(detail: PushNavigateDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PUSH_NAV_EVENT, { detail }));
}

export function resolveTabFromPushData(
  data: Record<string, string | undefined>,
  role?: string | null,
): string {
  if (data.tab?.trim()) return data.tab.trim();
  const notification: AppNotification = {
    type: data.type,
    metadata: {
      tab: data.tab,
      targetTab: data.targetTab,
      conversationId: data.conversationId,
      orderId: data.orderId,
      schoolId: data.schoolId,
      requestType: data.requestType,
      reportKind: data.reportKind,
    },
  };
  return resolveNotificationTab(notification, role);
}

export function usePushTabNavigation(onNavigate: (tab: string) => void, role?: string | null): void {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PushNavigateDetail>).detail || {};
      if (detail.tab) {
        onNavigate(detail.tab);
        return;
      }
      if (detail.type) {
        onNavigate(resolveTabFromPushData(detail as Record<string, string | undefined>, role));
      }
    };
    window.addEventListener(PUSH_NAV_EVENT, handler);
    return () => window.removeEventListener(PUSH_NAV_EVENT, handler);
  }, [onNavigate, role]);
}

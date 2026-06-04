export type MobileNavId = 'home' | 'messages' | 'calendar' | 'settings';

export type DashboardRole = 'parent' | 'admin' | 'teacher' | 'superadmin';

const maps: Record<DashboardRole, Record<MobileNavId, string>> = {
  parent: {
    home: 'home',
    messages: 'chat',
    calendar: 'schedules',
    settings: 'settings',
  },
  admin: {
    home: 'overview',
    messages: 'chat',
    calendar: 'schedules',
    settings: 'settings',
  },
  teacher: {
    home: 'home',
    messages: 'chat',
    calendar: 'schedules',
    settings: 'settings',
  },
  superadmin: {
    home: 'schools',
    messages: 'chat',
    calendar: 'requests',
    settings: 'settings',
  },
};

export function tabToMobileNav(role: DashboardRole, tabId: string): MobileNavId {
  const entry = Object.entries(maps[role]).find(([, tab]) => tab === tabId);
  return (entry?.[0] as MobileNavId) || 'home';
}

export function mobileNavToTab(role: DashboardRole, nav: MobileNavId): string {
  return maps[role][nav];
}

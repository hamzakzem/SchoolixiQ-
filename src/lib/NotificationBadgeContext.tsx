import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import {
  filterNotificationsForUser,
} from './notificationVisibility';
import {
  buildTabBadgeCounts,
  NotificationCategoryId,
  resolveNotificationCategoryId,
} from './notificationCategories';

export type NotificationBadgeState = {
  totalUnread: number;
  categoryUnread: Record<NotificationCategoryId, number>;
  tabBadges: Record<string, number>;
  loading: boolean;
};

const emptyCategoryUnread = (): Record<NotificationCategoryId, number> => ({
  messages: 0,
  tuition: 0,
  attendance: 0,
  homework: 0,
  reports: 0,
  announcements: 0,
  smart_gate: 0,
  system: 0,
});

const NotificationBadgeContext = createContext<NotificationBadgeState>({
  totalUnread: 0,
  categoryUnread: emptyCategoryUnread(),
  tabBadges: {},
  loading: true,
});

export function NotificationBadgeProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const isSuperAdmin = profile?.role === 'superadmin';
    const queries = [
      query(collection(db, 'notifications'), where('userId', '==', user.uid)),
    ];
    if (isSuperAdmin) {
      queries.push(
        query(collection(db, 'notifications'), where('userId', '==', 'super_admin')),
      );
    }

    const unsubs = queries.map((q) =>
      onSnapshot(
        q,
        (snap) => {
          setNotifications((prev) => {
            const map = new Map<string, any>();
            prev.forEach((n) => map.set(n.id, n));
            snap.docs.forEach((d) => {
              map.set(d.id, {
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.() ?? d.data().createdAt,
              });
            });
            return Array.from(map.values());
          });
          setLoading(false);
        },
        () => setLoading(false),
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [user?.uid, profile?.role]);

  const visible = useMemo(
    () =>
      filterNotificationsForUser(notifications, {
        uid: user?.uid || '',
        role: profile?.role,
        schoolId: profile?.schoolId,
      }),
    [notifications, user?.uid, profile?.role, profile?.schoolId],
  );

  const { totalUnread, categoryUnread, tabBadges } = useMemo(() => {
    const categoryUnread = emptyCategoryUnread();
    let totalUnread = 0;

    for (const n of visible) {
      if (n.read) continue;
      totalUnread += 1;
      const cat = resolveNotificationCategoryId(n);
      categoryUnread[cat] = (categoryUnread[cat] || 0) + 1;
    }

    return {
      totalUnread,
      categoryUnread,
      tabBadges: buildTabBadgeCounts(categoryUnread),
    };
  }, [visible]);

  const value = useMemo(
    () => ({ totalUnread, categoryUnread, tabBadges, loading }),
    [totalUnread, categoryUnread, tabBadges, loading],
  );

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadges() {
  return useContext(NotificationBadgeContext);
}

/** Small badge pill for nav tabs. */
export function TabBadge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

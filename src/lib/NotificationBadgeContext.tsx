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

function isSuperAdminRole(role?: string) {
  return role === 'superadmin' || role === 'super_admin';
}

function logNotificationBadgeError(
  queryName: string,
  error: unknown,
  meta: { uid: string; schoolId?: string; role?: string },
) {
  const err = error as { code?: string; message?: string };
  console.error('[NotificationBadge] LISTENER_ERROR', {
    QUERY_NAME: queryName,
    uid: meta.uid,
    schoolId: meta.schoolId ?? '(undefined)',
    role: meta.role ?? '(undefined)',
    code: err?.code ?? '(no code)',
    message: err?.message ?? String(error),
  });
}

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

    const role = profile?.role;
    const schoolId = profile?.schoolId;
    const isSuperAdmin = isSuperAdminRole(role);

    if (!isSuperAdmin && !schoolId) {
      setLoading(true);
      return;
    }

    type BadgeQuery = { queryName: string; q: ReturnType<typeof query> };
    const queries: BadgeQuery[] = [];

    if (isSuperAdmin) {
      queries.push({
        queryName: 'NOTIFICATION_BADGE_SUPERADMIN_USER',
        q: query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
        ),
      });
      queries.push({
        queryName: 'NOTIFICATION_BADGE_SUPERADMIN_INBOX',
        q: query(
          collection(db, 'notifications'),
          where('userId', '==', 'super_admin'),
        ),
      });
    } else if (schoolId) {
      queries.push({
        queryName: 'NOTIFICATION_BADGE_SCHOOL',
        q: query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('schoolId', '==', schoolId),
        ),
      });
      queries.push({
        queryName: 'NOTIFICATION_BADGE_SYSTEM',
        q: query(
          collection(db, 'notifications'),
          where('userId', '==', user.uid),
          where('schoolId', '==', 'system'),
        ),
      });
    }

    const snapshotByQuery = new Map<string, any[]>();

    const mergeSnapshots = () => {
      const merged = new Map<string, any>();
      for (const items of snapshotByQuery.values()) {
        for (const item of items) {
          merged.set(item.id, item);
        }
      }
      setNotifications(Array.from(merged.values()));
      setLoading(false);
    };

    const unsubs = queries.map(({ queryName, q }) =>
      onSnapshot(
        q,
        (snap) => {
          snapshotByQuery.set(
            queryName,
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              createdAt: d.data().createdAt?.toDate?.() ?? d.data().createdAt,
            })),
          );
          mergeSnapshots();
        },
        (error) => {
          logNotificationBadgeError(queryName, error, {
            uid: user.uid,
            schoolId,
            role,
          });
          setLoading(false);
        },
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [user?.uid, profile?.role, profile?.schoolId]);

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

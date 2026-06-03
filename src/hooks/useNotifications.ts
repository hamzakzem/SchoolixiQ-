import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { getNotificationInboxUserIdsFromProfile } from '../lib/notificationTargets';

export type InboxNotification = {
  id: string;
  userId?: string;
  title?: string;
  message?: string;
  type?: string;
  read?: boolean;
  schoolId?: string;
  createdAt?: Date;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

const INBOX_LIMIT = 80;

function mapSnapDocs(docs: { id: string; data: () => Record<string, unknown> }[]): InboxNotification[] {
  return docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
    return {
      id: d.id,
      ...data,
      createdAt: createdAt?.toDate?.() ?? new Date(),
    };
  });
}

/**
 * Real-time inbox for the signed-in user (and super_admin channel for superadmins).
 */
export function useNotifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const inboxUserIds = useMemo(
    () => getNotificationInboxUserIdsFromProfile(profile),
    [profile?.uid, profile?.role],
  );

  useEffect(() => {
    if (!user?.uid || inboxUserIds.length === 0) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const buckets: Record<string, InboxNotification[]> = {};
    inboxUserIds.forEach((id) => {
      buckets[id] = [];
    });

    const merge = () => {
      const merged = Object.values(buckets)
        .flat()
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      const seen = new Set<string>();
      const deduped = merged.filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      setNotifications(deduped.slice(0, INBOX_LIMIT));
      setLoading(false);
    };

    const unsubs = inboxUserIds.map((inboxUserId) => {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', inboxUserId),
        orderBy('createdAt', 'desc'),
        limit(INBOX_LIMIT),
      );
      return onSnapshot(
        q,
        (snap) => {
          buckets[inboxUserId] = mapSnapDocs(snap.docs);
          merge();
        },
        (err) => {
          console.warn('[useNotifications] listener error:', inboxUserId, err);
          merge();
        },
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [user?.uid, inboxUserIds.join(',')]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    loading,
    inboxUserIds,
  };
}

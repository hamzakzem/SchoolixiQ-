import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { filterNotificationsForUser } from '../lib/notificationVisibility';

export class DashboardService {
  /**
   * Universal dashboard fetcher with optimized limits.
   * Can be extended for caching layer (e.g. session/local storage fallback).
   */
  static async getRecentAnnouncements(schoolId: string, target: string, limitCount = 5) {
    const q = query(
      collection(db, 'announcements'),
      where('schoolId', '==', schoolId),
      where('target', 'in', ['all', target]),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getNotifications(
    userId: string,
    limitCount = 20,
    viewer?: { role?: string; schoolId?: string },
  ) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return filterNotificationsForUser(
      snap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      {
        uid: userId,
        role: viewer?.role,
        schoolId: viewer?.schoolId,
      },
    );
  }
}

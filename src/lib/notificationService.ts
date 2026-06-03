import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';

export type NotificationType = 'grade' | 'behavior' | 'attendance' | 'announcement' | 'payment' | 'homework' | 'report' | 'system' | 'message';

const PARENT_PREF_KEY: Partial<Record<NotificationType, string>> = {
  grade: 'grades',
  behavior: 'behavior',
  attendance: 'attendance',
  announcement: 'announcements',
  payment: 'payments',
};

async function parentAllowsNotificationType(
  parentId: string,
  studentId: string,
  type: NotificationType,
): Promise<boolean> {
  const prefField = PARENT_PREF_KEY[type];
  if (!prefField) return true;

  try {
    const prefId = `${parentId}_${studentId}`;
    const prefSnap = await getDoc(doc(db, 'notification_preferences', prefId));
    if (!prefSnap.exists()) {
      const q = query(
        collection(db, 'notification_preferences'),
        where('parentId', '==', parentId),
        where('studentId', '==', studentId),
      );
      const snap = await getDocs(q);
      if (snap.empty) return true;
      const data = snap.docs[0].data();
      return data[prefField] !== false;
    }
    const data = prefSnap.data();
    return data[prefField] !== false;
  } catch {
    return true;
  }
}

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  schoolId: string;
  metadata?: any;
}

export const notificationService = {
  /**
   * Send a notification to a specific user
   */
  async send(payload: NotificationPayload) {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...payload,
        read: false,
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  },

  /**
   * Send a notification to multiple users
   */
  async sendToMultiple(userIds: string[], payload: Omit<NotificationPayload, 'userId'>) {
    try {
      const batch = writeBatch(db);
      userIds.forEach(userId => {
        const docRef = doc(collection(db, 'notifications'));
        batch.set(docRef, {
          ...payload,
          userId,
          read: false,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error sending multiple notifications:', error);
      return false;
    }
  },

  /**
   * Send notification to all parents of a student
   */
  async notifyStudentParents(studentId: string, payload: Omit<NotificationPayload, 'userId'>) {
    try {
      if (!studentId) return false;
      const studentSnap = await getDoc(doc(db, 'students', studentId));
      if (!studentSnap.exists()) return false;
      
      const studentData = studentSnap.data();
      const parentIds = studentData.parentIds || [];
      
      // Also notify by email if relevant (mocked for now as we don't have a mail server, but we send in-app notification)
      if (parentIds.length === 0) {
        console.log(`No parents linked to student ${studentId} for notification`);
        return true;
      }

      const allowedParentIds: string[] = [];
      await Promise.all(
        parentIds.map(async (parentId: string) => {
          const ok = await parentAllowsNotificationType(parentId, studentId, payload.type);
          if (ok) allowedParentIds.push(parentId);
        }),
      );

      if (allowedParentIds.length === 0) return true;
      return await this.sendToMultiple(allowedParentIds, payload);
    } catch (error) {
      console.error('Error notifying student parents:', error);
      return false;
    }
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    return this.markAllAsReadForInbox([userId]);
  },

  async markAllAsReadForInbox(userIds: string[]) {
    try {
      const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
      for (const inboxUserId of uniqueIds) {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', inboxUserId),
          where('read', '==', false),
        );
        const snap = await getDocs(q);
        if (snap.empty) continue;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => {
          batch.update(d.ref, { read: true, readAt: serverTimestamp() });
        });
        await batch.commit();
      }
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  },

  /**
   * Delete a specific notification
   */
  async delete(notificationId: string) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  },

  /**
   * Delete notifications by their source ID
   */
  async deleteBySourceId(sourceId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('metadata.sourceId', '==', sourceId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error deleting notifications by source ID:', error);
      return false;
    }
  },

  /**
   * Notify all parents in a school
   */
  async notifyAllParents(schoolId: string, payload: Omit<NotificationPayload, 'userId'>) {
    try {
      const q = query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'parent'));
      const snap = await getDocs(q);
      const userIds = snap.docs.map(doc => doc.id);
      
      if (userIds.length === 0) return true;

      // Handle large numbers of users by splitting into batches of 500
      const chunks = [];
      for (let i = 0; i < userIds.length; i += 500) {
        chunks.push(userIds.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        await this.sendToMultiple(chunk, payload);
      }
      return true;
    } catch (error) {
      console.error('Error notifying all parents:', error);
      return false;
    }
  },

  /**
   * Notify all staff in a school
   */
  async notifyAllStaff(schoolId: string, payload: Omit<NotificationPayload, 'userId'>) {
    try {
      const q = query(
        collection(db, 'users'),
        where('schoolId', '==', schoolId),
        where('role', 'in', ['staff', 'teacher', 'admin', 'assistant']),
      );
      const snap = await getDocs(q);
      const userIds = snap.docs.map((doc: any) => doc.id);
      
      if (userIds.length === 0) return true;

      const chunks = [];
      for (let i = 0; i < userIds.length; i += 500) {
        chunks.push(userIds.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        await this.sendToMultiple(chunk, payload);
      }
      return true;
    } catch (error) {
      console.error('Error notifying all staff:', error);
      return false;
    }
  },

  /**
   * Notify all members in a school
   */
  async notifyAllSchool(schoolId: string, payload: Omit<NotificationPayload, 'userId'>) {
    try {
      await Promise.all([
        this.notifyAllParents(schoolId, payload),
        this.notifyAllStaff(schoolId, payload),
      ]);
      return true;
    } catch (error) {
      console.error('Error notifying all school members:', error);
      return false;
    }
  },

  /**
   * Notify all super admins
   */
  async notifySuperAdmins(payload: Omit<NotificationPayload, 'userId' | 'schoolId'>) {
    try {
      // Instead of querying all super admins (which fails permissions for normal users),
      // we write a single notification assigned to the virtual 'super_admin' user.
      return await this.send({
        ...payload,
        userId: 'super_admin',
        schoolId: 'system'
      });
    } catch (error) {
      console.error('Error notifying super admins:', error);
      return false;
    }
  },

  /**
   * Create a renewal request in the orders collection
   */
  async createRenewalRequest(data: {
    schoolId: string;
    schoolName: string;
    adminEmail?: string;
    adminPhone?: string;
    packageName?: string;
    price?: number;
  }) {
    try {
      await addDoc(collection(db, 'orders'), {
        type: 'renewal_request',
        status: 'pending',
        customerInfo: {
          name: data.schoolName,
          email: data.adminEmail || '',
          phone: data.adminPhone || '',
          address: 'طلب تجديد من داخل النظام'
        },
        schoolId: data.schoolId,
        packageName: data.packageName || 'طلب تجديد',
        price: data.price || 0,
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error creating renewal request:', error);
      return false;
    }
  }
};

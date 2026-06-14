import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, writeBatch, deleteDoc, limit } from 'firebase/firestore';
import { resolveStudentParentIds } from './schoolSync';
import { resolveNotificationCategoryId } from './notificationCategories';
import { normalizeNotificationMetadata } from './notificationRouting';

export type NotificationType = 'grade' | 'behavior' | 'attendance' | 'announcement' | 'payment' | 'tuition' | 'homework' | 'report' | 'system' | 'message' | 'chat' | 'smart_gate' | 'dismissal';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  schoolId: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  recipientId?: string;
  receiverId?: string;
  audience?: 'school_admin' | 'teacher' | 'parent' | 'all_school';
  metadata?: Record<string, unknown>;
}

function buildNotificationDoc(
  payload: NotificationPayload,
  userId: string,
): Record<string, unknown> {
  if (!payload.schoolId || typeof payload.schoolId !== 'string') {
    throw new Error('Notification requires a schoolId');
  }
  if (!userId) {
    throw new Error('Notification requires a recipient userId');
  }

  const senderId =
    payload.senderId ||
    (payload.metadata &&
    typeof payload.metadata === 'object' &&
    typeof payload.metadata.senderId === 'string'
      ? payload.metadata.senderId
      : undefined);

  const metadata = normalizeNotificationMetadata(payload.type, payload.metadata, {
    schoolId: payload.schoolId,
    senderId,
    senderName: payload.senderName,
    senderRole: payload.senderRole,
    studentId:
      payload.metadata && typeof payload.metadata.studentId === 'string'
        ? payload.metadata.studentId
        : undefined,
    studentName:
      payload.metadata && typeof payload.metadata.studentName === 'string'
        ? payload.metadata.studentName
        : undefined,
  });

  const category = resolveNotificationCategoryId({
    type: payload.type,
    metadata,
    routeTarget: metadata.routeTarget,
  });

  const doc: Record<string, unknown> = {
    title: payload.title,
    message: payload.message,
    type: payload.type,
    schoolId: payload.schoolId,
    userId,
    recipientId: payload.recipientId || userId,
    receiverId: payload.receiverId || userId,
    read: false,
    category,
    routeTarget: metadata.routeTarget,
    metadata: {
      ...metadata,
      category,
      routeTarget: metadata.routeTarget,
    },
    createdAt: serverTimestamp(),
  };

  if (senderId) doc.senderId = senderId;
  if (payload.senderName) doc.senderName = payload.senderName;
  if (payload.senderRole) doc.senderRole = payload.senderRole;
  if (payload.audience) doc.audience = payload.audience;

  return doc;
}

export const notificationService = {
  /**
   * Send without duplicate when metadata.dedupKey matches a recent notification.
   */
  async sendWithDedup(payload: NotificationPayload): Promise<boolean> {
    const dedupKey =
      payload.metadata &&
      typeof payload.metadata === 'object' &&
      typeof payload.metadata.dedupKey === 'string'
        ? payload.metadata.dedupKey
        : null;

    if (dedupKey) {
      try {
        const q = query(
          collection(db, 'notifications'),
          where('schoolId', '==', payload.schoolId),
          where('userId', '==', payload.userId),
          where('metadata.dedupKey', '==', dedupKey),
          limit(1),
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          console.info('[Notifications] SEND_START dedup skipped', {
            dedupKey,
            userId: payload.userId,
            type: payload.type,
          });
          return true;
        }
      } catch (err) {
        console.warn('[Notifications] SEND_ERROR dedup check failed, sending anyway:', err);
      }
    }

    return this.send(payload);
  },

  /**
   * Send a notification to a specific user
   */
  async send(payload: NotificationPayload) {
    try {
      console.info('[Notifications] SEND_START', {
        userId: payload.userId,
        type: payload.type,
        schoolId: payload.schoolId,
      });
      await addDoc(
        collection(db, 'notifications'),
        buildNotificationDoc(payload, payload.userId),
      );
      console.info('[Notifications] SEND_SUCCESS', {
        userId: payload.userId,
        type: payload.type,
      });
      return true;
    } catch (error) {
      console.error('[Notifications] SEND_ERROR', error);
      return false;
    }
  },

  /**
   * Send a notification to multiple users
   */
  async sendToMultiple(userIds: string[], payload: Omit<NotificationPayload, 'userId'>) {
    try {
      console.info('[Notifications] SEND_START batch', {
        count: userIds.length,
        type: payload.type,
        schoolId: payload.schoolId,
      });
      const batch = writeBatch(db);
      userIds.forEach(userId => {
        const docRef = doc(collection(db, 'notifications'));
        batch.set(docRef, buildNotificationDoc(payload, userId));
      });
      await batch.commit();
      console.info('[Notifications] SEND_SUCCESS batch', { count: userIds.length });
      return true;
    } catch (error) {
      console.error('[Notifications] SEND_ERROR batch', error);
      return false;
    }
  },

  /**
   * Send notification to all parents of a student (same school only).
   * Returns true when at least one parent was notified, false otherwise.
   */
  async notifyStudentParents(studentId: string, payload: Omit<NotificationPayload, 'userId'>) {
    try {
      if (!studentId || !payload.schoolId) return false;
      const parentIds = await resolveStudentParentIds(studentId, payload.schoolId);
      if (parentIds.length === 0) {
        console.log(`No parents linked to student ${studentId} for notification`);
        return false;
      }

      const metadata = {
        ...(payload.metadata || {}),
        studentId,
      };

      return await this.sendToMultiple(parentIds, {
        ...payload,
        metadata,
      });
    } catch (error) {
      console.error('[Notifications] SEND_ERROR notifyStudentParents', error);
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
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', userId), 
        where('read', '==', false)
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
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
  async deleteBySourceId(sourceId: string, schoolId?: string) {
    try {
      if (!schoolId) {
        console.warn('deleteBySourceId skipped: schoolId is required for scoped deletion');
        return false;
      }
      const q = query(
        collection(db, 'notifications'),
        where('schoolId', '==', schoolId),
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
      const q = query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', 'in', ['staff', 'teacher', 'admin', 'assistant']));
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
        this.notifyAllStaff(schoolId, payload)
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

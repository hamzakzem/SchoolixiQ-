/**
 * Conversation assignment — Super Admin only writes.
 */

import admin from 'firebase-admin';
import { computePrivacyHash } from './chatConversationKeys.mjs';

function isSuperAdmin(role) {
  const r = String(role || '').toLowerCase();
  return r === 'superadmin' || r === 'super_admin';
}

async function getConversation(db, conversationId) {
  const ref = db.collection('conversations').doc(conversationId);
  const snap = await ref.get();
  if (!snap.exists) {
    const err = new Error('المحادثة غير موجودة');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }
  return { ref, data: { id: snap.id, ...snap.data() } };
}

async function resolveUserName(db, userId) {
  if (!userId) return null;
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) return userId;
  const d = snap.data() || {};
  return String(d.name || d.displayName || d.email || userId);
}

function defaultAssignment() {
  return {
    assignedToUserId: null,
    assignedToName: null,
    assignedToRole: null,
    assignedBy: null,
    assignedAt: null,
    status: 'unassigned',
    lastResponseAt: null,
    firstResponseDueAt: null,
    transferHistory: [],
  };
}

/** Ensure assignee can read platform_operations conversations via privacy stamp. */
function withAssigneePrivacy(data, assigneeUserId) {
  const prev = data.conversationPrivacy;
  if (!prev || typeof prev !== 'object' || !assigneeUserId) return {};
  const visibility = String(prev.visibility || '');
  if (visibility === 'superadmin_private') return {};
  const allowed = Array.isArray(prev.allowedUserIds)
    ? prev.allowedUserIds.map(String).filter(Boolean)
    : [];
  if (!allowed.includes(assigneeUserId)) allowed.push(assigneeUserId);
  const conversationPrivacy = {
    ...prev,
    allowedUserIds: allowed,
  };
  return {
    conversationPrivacy,
    privacyHash: computePrivacyHash(conversationPrivacy),
  };
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {{ uid: string, role: string, name?: string }} actor
 * @param {{ conversationId: string, assigneeUserId: string, assigneeRole?: string, firstResponseDueMinutes?: number }} input
 */
export async function assignConversation(db, actor, input) {
  if (!isSuperAdmin(actor.role)) {
    const err = new Error('تعيين المحادثات للسوبر أدمن فقط');
    err.status = 403;
    throw err;
  }
  const conversationId = String(input.conversationId || '').trim();
  const assigneeUserId = String(input.assigneeUserId || '').trim();
  if (!conversationId || !assigneeUserId) {
    const err = new Error('conversationId and assigneeUserId required');
    err.status = 400;
    throw err;
  }

  const assigneeSnap = await db.collection('users').doc(assigneeUserId).get();
  if (!assigneeSnap.exists) {
    const err = new Error('المستخدم غير موجود');
    err.status = 404;
    throw err;
  }
  const assignee = assigneeSnap.data() || {};
  const assigneeRole = String(input.assigneeRole || assignee.role || '').toLowerCase();
  if (!['platform_assistant', 'superadmin', 'super_admin'].includes(assigneeRole)) {
    const err = new Error('نوع المستخدم غير مدعوم للتعيين');
    err.status = 400;
    throw err;
  }

  const { ref, data } = await getConversation(db, conversationId);
  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const dueMinutes = Number(input.firstResponseDueMinutes || 30);
  const dueAt = admin.firestore.Timestamp.fromMillis(Date.now() + dueMinutes * 60 * 1000);
  const assigneeName = await resolveUserName(db, assigneeUserId);
  const prev = data.conversationAssignment || defaultAssignment();

  const conversationAssignment = {
    assignedToUserId: assigneeUserId,
    assignedToName: assigneeName,
    assignedToRole: assigneeRole.includes('super') ? 'superadmin' : 'platform_assistant',
    assignedBy: actor.uid,
    assignedAt: now,
    status: 'assigned',
    lastResponseAt: prev.lastResponseAt || null,
    firstResponseDueAt: dueAt,
    transferHistory: prev.transferHistory || [],
  };

  await ref.set(
    {
      conversationAssignment,
      updatedAt: now,
      ...withAssigneePrivacy(data, assigneeUserId),
    },
    { merge: true },
  );
  return { ok: true, conversationId, conversationAssignment };
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {{ uid: string, role: string }} actor
 * @param {{ conversationId: string, toUserId: string, reason?: string }} input
 */
export async function transferConversation(db, actor, input) {
  if (!isSuperAdmin(actor.role)) {
    const err = new Error('تحويل المحادثات للسوبر أدمن فقط');
    err.status = 403;
    throw err;
  }
  const conversationId = String(input.conversationId || '').trim();
  const toUserId = String(input.toUserId || '').trim();
  if (!conversationId || !toUserId) {
    const err = new Error('conversationId and toUserId required');
    err.status = 400;
    throw err;
  }

  const { ref, data } = await getConversation(db, conversationId);
  const prev = data.conversationAssignment || defaultAssignment();
  const FieldValue = admin.firestore.FieldValue;
  const now = FieldValue.serverTimestamp();
  const toName = await resolveUserName(db, toUserId);
  const toSnap = await db.collection('users').doc(toUserId).get();
  const toRole = String(toSnap.data()?.role || '').toLowerCase();

  const entry = {
    fromUserId: prev.assignedToUserId || null,
    fromName: prev.assignedToName || null,
    toUserId,
    toName,
    transferredBy: actor.uid,
    reason: String(input.reason || '').trim() || null,
    transferredAt: now,
  };

  const conversationAssignment = {
    ...prev,
    assignedToUserId: toUserId,
    assignedToName: toName,
    assignedToRole: toRole.includes('super') ? 'superadmin' : 'platform_assistant',
    assignedBy: actor.uid,
    assignedAt: now,
    status: 'assigned',
    transferHistory: [...(prev.transferHistory || []), entry],
  };

  await ref.set(
    {
      conversationAssignment,
      updatedAt: now,
      ...withAssigneePrivacy(data, toUserId),
    },
    { merge: true },
  );
  return { ok: true, conversationId, conversationAssignment };
}

export async function unassignConversation(db, actor, input) {
  if (!isSuperAdmin(actor.role)) {
    const err = new Error('إلغاء التعيين للسوبر أدمن فقط');
    err.status = 403;
    throw err;
  }
  const conversationId = String(input.conversationId || '').trim();
  const { ref, data } = await getConversation(db, conversationId);
  const prev = data.conversationAssignment || defaultAssignment();
  const FieldValue = admin.firestore.FieldValue;

  const conversationAssignment = {
    ...prev,
    assignedToUserId: null,
    assignedToName: null,
    assignedToRole: null,
    status: 'unassigned',
    assignedBy: actor.uid,
    assignedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(
    { conversationAssignment, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return { ok: true, conversationId, conversationAssignment };
}

export async function closeConversation(db, actor, input) {
  if (!isSuperAdmin(actor.role)) {
    const err = new Error('إغلاق المحادثات للسوبر أدمن فقط');
    err.status = 403;
    throw err;
  }
  const conversationId = String(input.conversationId || '').trim();
  const { ref, data } = await getConversation(db, conversationId);
  const prev = data.conversationAssignment || defaultAssignment();
  const FieldValue = admin.firestore.FieldValue;

  const conversationAssignment = {
    ...prev,
    status: 'closed',
    assignedBy: actor.uid,
    assignedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(
    { conversationAssignment, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return { ok: true, conversationId, conversationAssignment };
}

export async function getConversationAssignment(db, actor, conversationId) {
  const { data } = await getConversation(db, conversationId);
  const role = String(actor.role || '').toLowerCase();
  const assignment = data.conversationAssignment || defaultAssignment();

  if (!isSuperAdmin(role)) {
    if (role === 'platform_assistant') {
      const allowed = data.conversationPrivacy?.allowedUserIds || [];
      const owner = data.conversationPrivacy?.ownerUserId;
      const canView =
        assignment.assignedToUserId === actor.uid ||
        allowed.includes(actor.uid) ||
        owner === actor.uid;
      if (!canView) {
        const err = new Error('غير مصرح');
        err.status = 403;
        throw err;
      }
    } else {
      const err = new Error('غير مصرح');
      err.status = 403;
      throw err;
    }
  }

  return {
    ok: true,
    conversationId,
    conversationAssignment: assignment,
    conversationPrivacy: data.conversationPrivacy || null,
    schoolId: data.schoolId || null,
    contactType: data.contactType || null,
    contactId: data.contactId || null,
  };
}

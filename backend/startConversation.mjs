/**
 * Start or open an isolated conversation — server-side privacy enforcement.
 */
import admin from 'firebase-admin';
import {
  assistantDistributorConversationKey,
  assistantSchoolConversationKey,
  assistantSuperAdminConversationKey,
  buildConversationPrivacyStamp,
} from './chatConversationKeys.mjs';

const SCHOOL_CONTACT_PERMS = new Set(['manage_schools', 'view_requests']);
const DISTRIBUTOR_CONTACT_PERMS = new Set(['manage_distributors']);
const SUPERADMIN_CONTACT_PERMS = new Set(['manage_users', 'manage_system']);

function asPermissionList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

function hasAnyPermission(permissions, required) {
  const set = new Set(permissions);
  for (const p of required) {
    if (set.has(p)) return true;
  }
  return false;
}

async function resolveSchoolAdminIds(db, schoolId) {
  const snap = await db
    .collection('users')
    .where('schoolId', '==', schoolId)
    .where('role', 'in', ['admin', 'school_admin', 'assistant', 'school_assistant'])
    .get();
  return snap.docs.map((d) => d.id);
}

/**
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {{ uid: string, role: string, permissions?: unknown }} actor
 * @param {{ contactType: string, contactId: string }} input
 */
export async function startConversation(db, actor, input) {
  const uid = String(actor.uid || '').trim();
  const role = String(actor.role || '').toLowerCase();
  const permissions = asPermissionList(actor.permissions);
  const contactType = String(input.contactType || '').toLowerCase().trim();
  const contactId = String(input.contactId || '').trim();

  if (!uid) {
    const err = new Error('UID required');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  if (role !== 'platform_assistant') {
    const err = new Error('مسموح لمساعد المنصة فقط');
    err.code = 'FORBIDDEN';
    err.status = 403;
    throw err;
  }
  if (!contactType || !contactId) {
    const err = new Error('contactType and contactId required');
    err.code = 'INVALID_BODY';
    err.status = 400;
    throw err;
  }

  const FieldValue = admin.firestore.FieldValue;
  let conversationKey = '';
  let conversationId = '';
  let privacyStamp = null;
  let participants = [uid];
  let schoolId = null;
  let distributorId = null;
  let contactName = contactId;

  if (contactType === 'school') {
    if (!hasAnyPermission(permissions, SCHOOL_CONTACT_PERMS)) {
      const err = new Error('لا صلاحية لمراسلة المدارس');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }
    const schoolSnap = await db.collection('schools').doc(contactId).get();
    if (!schoolSnap.exists) {
      const err = new Error('المدرسة غير موجودة');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }
    const schoolData = schoolSnap.data() || {};
    contactName = String(schoolData.name || contactId);
    schoolId = contactId;
    conversationKey = assistantSchoolConversationKey(uid, contactId);
    conversationId = conversationKey;
    const adminIds = await resolveSchoolAdminIds(db, contactId);
    participants = [uid, ...adminIds];
    privacyStamp = buildConversationPrivacyStamp({
      ownerUserId: uid,
      ownerRole: 'platform_assistant',
      visibility: 'platform_operations',
      allowedUserIds: [uid],
      allowedRoles: ['superadmin', 'platform_assistant', 'admin', 'school_admin'],
      schoolId: contactId,
    });
  } else if (contactType === 'superadmin') {
    if (!hasAnyPermission(permissions, SUPERADMIN_CONTACT_PERMS)) {
      const err = new Error('لا صلاحية لمراسلة مديري النظام');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }
    const userSnap = await db.collection('users').doc(contactId).get();
    if (!userSnap.exists) {
      const err = new Error('المستخدم غير موجود');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }
    const userData = userSnap.data() || {};
    const targetRole = String(userData.role || '').toLowerCase();
    if (!['superadmin', 'super_admin'].includes(targetRole)) {
      const err = new Error('جهة الاتصال ليست سوبر أدمن');
      err.code = 'INVALID_CONTACT';
      err.status = 400;
      throw err;
    }
    contactName = String(userData.name || userData.displayName || userData.email || contactId);
    conversationKey = assistantSuperAdminConversationKey(uid, contactId);
    conversationId = conversationKey;
    participants = [uid, contactId];
    privacyStamp = buildConversationPrivacyStamp({
      ownerUserId: uid,
      ownerRole: 'platform_assistant',
      visibility: 'platform_assistant_private',
      allowedUserIds: [uid, contactId],
      allowedRoles: ['superadmin', 'platform_assistant'],
    });
  } else if (contactType === 'distributor') {
    if (!hasAnyPermission(permissions, DISTRIBUTOR_CONTACT_PERMS)) {
      const err = new Error('لا صلاحية لمراسلة الموزعين');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }
    const distSnap = await db.collection('distributors').doc(contactId).get();
    if (!distSnap.exists) {
      const err = new Error('الموزع غير موجود');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }
    const distData = distSnap.data() || {};
    contactName = String(distData.name || contactId);
    distributorId = contactId;
    conversationKey = assistantDistributorConversationKey(uid, contactId);
    conversationId = conversationKey;
    participants = [uid];
    privacyStamp = buildConversationPrivacyStamp({
      ownerUserId: uid,
      ownerRole: 'platform_assistant',
      visibility: 'platform_operations',
      allowedUserIds: [uid],
      allowedRoles: ['superadmin', 'platform_assistant'],
      distributorId: contactId,
    });
  } else {
    const err = new Error('نوع جهة اتصال غير مدعوم');
    err.code = 'INVALID_CONTACT_TYPE';
    err.status = 400;
    throw err;
  }

  const convRef = db.collection('conversations').doc(conversationId);
  const existing = await convRef.get();
  const payload = {
    conversationId,
    conversationKey,
    contactType,
    contactId,
    participants,
    lastMessage: existing.exists ? existing.data()?.lastMessage || '' : '',
    updatedAt: FieldValue.serverTimestamp(),
    ...privacyStamp,
  };
  if (!existing.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
  }
  await convRef.set(payload, { merge: true });

  return {
    ok: true,
    conversationId,
    conversationKey,
    contactType,
    contactId,
    contactName,
    schoolId,
    distributorId,
    created: !existing.exists,
    conversationPrivacy: privacyStamp.conversationPrivacy,
  };
}

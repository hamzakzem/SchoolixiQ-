/**
 * Conversation keys + privacy stamps (server).
 */
import crypto from 'crypto';

export function assistantSchoolConversationKey(assistantUid, schoolId) {
  return `platform_assistant:${assistantUid}:school:${schoolId}`;
}

export function superAdminSchoolConversationKey(superAdminUid, schoolId) {
  return `superadmin:${superAdminUid}:school:${schoolId}`;
}

export function assistantSuperAdminConversationKey(assistantUid, superAdminUid) {
  return `platform_assistant:${assistantUid}:superadmin:${superAdminUid}`;
}

export function assistantDistributorConversationKey(assistantUid, distributorId) {
  return `platform_assistant:${assistantUid}:distributor:${distributorId}`;
}

function defaultAllowedRoles(visibility) {
  switch (visibility) {
    case 'superadmin_private':
      return ['superadmin'];
    case 'platform_assistant_private':
      return ['superadmin', 'platform_assistant'];
    case 'platform_operations':
      return ['superadmin', 'platform_assistant', 'admin', 'school_admin'];
    default:
      return [];
  }
}

export function computePrivacyHash(privacy) {
  const ids = [...(privacy.allowedUserIds || [])].map(String).sort().join(',');
  const payload = `${privacy.ownerUserId}|${privacy.visibility}|${ids}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function buildConversationPrivacyStamp(params) {
  const allowedUserIds = params.allowedUserIds ?? [];
  const allowedRoles = params.allowedRoles ?? defaultAllowedRoles(params.visibility);
  const conversationPrivacy = {
    ownerUserId: params.ownerUserId,
    ownerRole: params.ownerRole,
    visibility: params.visibility,
    allowedUserIds,
    allowedRoles,
  };
  const privacyHash = computePrivacyHash(conversationPrivacy);
  return {
    conversationPrivacy,
    privacyHash,
    visibility: params.visibility,
    visibilityScope: params.visibility,
    createdBy: params.ownerUserId,
    createdByRole: params.ownerRole,
    allowedRoles,
    allowedUserIds,
    ...(params.schoolId ? { schoolId: params.schoolId } : {}),
    ...(params.distributorId ? { distributorId: params.distributorId } : {}),
  };
}

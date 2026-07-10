/**
 * Server-side conversation authorization mirror of src/lib/messagingAccess.ts
 */
import crypto from 'crypto';

const PLATFORM_OPS_PERMISSIONS = new Set([
  'manage_schools',
  'manage_subscriptions',
  'view_requests',
  'manage_users',
  'manage_packages',
  'manage_system',
  'system_settings',
]);

function asPermissionList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

function extractConversationPrivacy(data) {
  if (!data) return null;
  const raw = data.conversationPrivacy;
  if (!raw || typeof raw !== 'object') return null;
  const visibility = String(raw.visibility ?? '').toLowerCase().trim();
  if (
    ![
      'superadmin_private',
      'platform_assistant_private',
      'platform_operations',
      'school_private',
    ].includes(visibility)
  ) {
    return null;
  }
  const ownerUserId = String(raw.ownerUserId ?? '').trim();
  if (!ownerUserId) return null;
  return {
    ownerUserId,
    ownerRole: String(raw.ownerRole ?? '').toLowerCase().trim(),
    visibility,
    allowedUserIds: Array.isArray(raw.allowedUserIds)
      ? raw.allowedUserIds.map(String)
      : [],
    allowedRoles: Array.isArray(raw.allowedRoles)
      ? raw.allowedRoles.map(String)
      : [],
  };
}

export function computePrivacyHash(privacy) {
  const ids = [...(privacy.allowedUserIds || [])].map(String).sort().join(',');
  const payload = `${privacy.ownerUserId}|${privacy.visibility}|${ids}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function verifyPrivacyHash(doc) {
  const privacy = extractConversationPrivacy(doc);
  if (!privacy) return false;
  const stored = String(doc.privacyHash ?? '').trim();
  if (!stored) return false;
  return computePrivacyHash(privacy) === stored;
}

export function normalizeConversationVisibility(data) {
  const privacy = extractConversationPrivacy(data);
  if (privacy) return privacy.visibility;
  if (!data) return 'school_private';
  const explicit = String(data.visibility ?? data.visibilityScope ?? '')
    .toLowerCase()
    .trim();
  if (explicit === 'superadmin_private' || explicit === 'superadmin_only' || explicit === 'platform') {
    return 'superadmin_private';
  }
  if (explicit === 'platform_assistant_private') return 'platform_assistant_private';
  if (explicit === 'platform_operations' || explicit === 'platform_ops') {
    return 'platform_operations';
  }
  const createdByRole = String(data.createdByRole ?? data.senderRole ?? '')
    .toLowerCase()
    .trim();
  if (createdByRole === 'superadmin' || createdByRole === 'super_admin') {
    return 'superadmin_private';
  }
  const conversationId = String(data.conversationId ?? data.id ?? '');
  if (conversationId.startsWith('superadmin_')) return 'superadmin_private';
  return 'school_private';
}

/**
 * @param {{ role?: string, schoolId?: string|null, permissions?: unknown, uid?: string }} user
 * @param {Record<string, unknown>|null|undefined} conversation
 */
export function authorizeConversationAccess(user, conversation) {
  if (!user || !conversation) return false;
  const role = String(user.role || '').toLowerCase();
  const permissions = asPermissionList(user.permissions);
  const uid = String(user.uid || '');

  if (role === 'superadmin' || role === 'super_admin') return true;

  const privacy = extractConversationPrivacy(conversation);

  if (role === 'platform_assistant') {
    const hasOps = permissions.some((p) => PLATFORM_OPS_PERMISSIONS.has(p));
    if (!hasOps) return false;
    if (!privacy) return false;
    if (!verifyPrivacyHash(conversation)) return false;
    if (privacy.visibility === 'superadmin_private') return false;
    if (privacy.visibility === 'platform_assistant_private') {
      return privacy.ownerUserId === uid;
    }
    if (privacy.visibility === 'platform_operations') {
      return privacy.ownerUserId === uid || privacy.allowedUserIds.includes(uid);
    }
    return false;
  }

  if (['admin', 'school_admin', 'staff', 'school_assistant', 'assistant'].includes(role)) {
    const userSchool = String(user.schoolId || '').trim();
    const convSchool = String(conversation.schoolId || '').trim();
    if (!userSchool || !convSchool || userSchool !== convSchool) return false;
    if (privacy && !verifyPrivacyHash(conversation)) return role === 'superadmin';
    return true;
  }

  return false;
}

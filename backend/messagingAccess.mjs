/**
 * Server-side conversation authorization mirror of src/lib/messagingAccess.ts
 */

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

function getExplicitVisibility(data) {
  if (!data) return null;
  const explicit = String(data.visibility ?? data.visibilityScope ?? '')
    .toLowerCase()
    .trim();
  if (
    explicit === 'superadmin_private' ||
    explicit === 'superadmin_only' ||
    explicit === 'platform'
  ) {
    return 'superadmin_private';
  }
  if (explicit === 'platform_operations' || explicit === 'platform_ops') {
    return 'platform_operations';
  }
  if (explicit === 'school_private' || explicit === 'school') {
    return 'school_private';
  }
  return null;
}

export function normalizeConversationVisibility(data) {
  if (!data) return 'school_private';
  const explicit = String(data.visibility ?? data.visibilityScope ?? '')
    .toLowerCase()
    .trim();
  if (explicit === 'superadmin_private' || explicit === 'superadmin_only') {
    return 'superadmin_private';
  }
  if (explicit === 'platform_operations' || explicit === 'platform_ops') {
    return 'platform_operations';
  }
  if (explicit === 'school_private' || explicit === 'school') {
    return 'school_private';
  }
  if (explicit === 'platform') return 'superadmin_private';

  const createdByRole = String(data.createdByRole ?? data.senderRole ?? '')
    .toLowerCase()
    .trim();
  if (createdByRole === 'superadmin' || createdByRole === 'super_admin') {
    return 'superadmin_private';
  }

  const conversationId = String(data.conversationId ?? data.id ?? '');
  const isPlatformThread = conversationId.startsWith('superadmin_');
  if (
    isPlatformThread &&
    ['admin', 'school_admin', 'staff', 'assistant', 'school_assistant'].includes(
      createdByRole,
    )
  ) {
    return 'platform_operations';
  }
  if (isPlatformThread) return 'superadmin_private';
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

  if (role === 'superadmin' || role === 'super_admin') return true;

  if (role === 'platform_assistant') {
    const hasOps = permissions.some((p) => PLATFORM_OPS_PERMISSIONS.has(p));
    if (!hasOps) return false;
    const explicit = getExplicitVisibility(conversation);
    return explicit === 'platform_operations';
  }

  if (['admin', 'school_admin', 'staff', 'school_assistant', 'assistant'].includes(role)) {
    const userSchool = String(user.schoolId || '').trim();
    const convSchool = String(conversation.schoolId || '').trim();
    if (!userSchool || !convSchool || userSchool !== convSchool) return false;
    return true;
  }

  return false;
}

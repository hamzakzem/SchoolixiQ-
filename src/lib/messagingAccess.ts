/**
 * Central messaging access layer — sole authority for chat visibility.
 * Platform assistants NEVER fall back to reading all school↔platform threads.
 */

import {
  isPlatformAssistantProfile,
  isSchoolAssistantProfile,
  normalizeEffectiveRole,
  resolveProfileSchoolId,
} from './schoolId';

export type MessagingVisibility =
  | 'superadmin_private'
  | 'platform_operations'
  | 'school_private';

export type MessagingScope =
  | 'platform_all'
  | 'platform_ops'
  | 'school'
  | 'school_participants'
  | 'none';

export type MessagingAccess = {
  role: string;
  scope: MessagingScope;
  schoolId: string | null;
  allowedCollections: string[];
  /** Permanent hard-delete via Admin API only */
  canDelete: boolean;
  /** Soft-delete own / school-scoped messages in UI */
  canSoftDelete: boolean;
  canViewAll: boolean;
  /** Platform assistant may open ops inbox only when explicitly permitted */
  canAccessPlatformInbox: boolean;
  /** Visibilities this actor may read */
  allowedVisibilities: MessagingVisibility[];
  permissions: string[];
  displayLabelAr: string;
  displayLabelEn: string;
};

const PLATFORM_OPS_PERMISSIONS = new Set([
  'manage_schools',
  'manage_subscriptions',
  'view_requests',
  'manage_users',
  'manage_packages',
  'manage_system',
  'system_settings',
]);

function asPermissionList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

function normalizeRoleLabel(role: unknown): string {
  return String(role ?? '')
    .toLowerCase()
    .trim();
}

/** Explicit visibility stamp only — no legacy inference (used for platform assistant). */
export function getExplicitVisibility(
  data: Record<string, unknown> | null | undefined,
): MessagingVisibility | null {
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

/**
 * Read-only visibility normalize for legacy docs (no Firestore write).
 * Super Admin / school roles may use inference; platform assistants must not.
 */
export function normalizeConversationVisibility(
  data: Record<string, unknown> | null | undefined,
): MessagingVisibility {
  if (!data) return 'school_private';

  const explicit = String(
    data.visibility ?? data.visibilityScope ?? '',
  )
    .toLowerCase()
    .trim();

  if (
    explicit === 'superadmin_private' ||
    explicit === 'superadmin_only'
  ) {
    return 'superadmin_private';
  }
  if (
    explicit === 'platform_operations' ||
    explicit === 'platform_ops'
  ) {
    return 'platform_operations';
  }
  if (explicit === 'school_private' || explicit === 'school') {
    return 'school_private';
  }
  // Legacy "platform" without ops marker was used for SA→school — treat as private
  if (explicit === 'platform') {
    return 'superadmin_private';
  }

  const createdByRole = normalizeRoleLabel(
    data.createdByRole ?? data.senderRole,
  );
  if (createdByRole === 'superadmin' || createdByRole === 'super_admin') {
    return 'superadmin_private';
  }

  const conversationId = String(data.conversationId ?? data.id ?? '');
  const isPlatformThread = conversationId.startsWith('superadmin_');

  if (
    isPlatformThread &&
    (createdByRole === 'admin' ||
      createdByRole === 'school_admin' ||
      createdByRole === 'staff' ||
      createdByRole === 'assistant' ||
      createdByRole === 'school_assistant')
  ) {
    // School → platform support requests (ops)
    return 'platform_operations';
  }

  if (isPlatformThread) {
    // Unmarked platform thread — secure default: Super Admin private
    return 'superadmin_private';
  }

  const schoolId = resolveProfileSchoolId(data) || String(data.schoolId ?? '');
  if (schoolId) return 'school_private';

  return 'school_private';
}

export function resolveMessagingAccess(
  user: Record<string, unknown> | null | undefined,
): MessagingAccess {
  const empty: MessagingAccess = {
    role: '',
    scope: 'none',
    schoolId: null,
    allowedCollections: [],
    canDelete: false,
    canSoftDelete: false,
    canViewAll: false,
    canAccessPlatformInbox: false,
    allowedVisibilities: [],
    permissions: [],
    displayLabelAr: '',
    displayLabelEn: '',
  };

  if (!user) return empty;

  const role =
    normalizeEffectiveRole(user) ||
    String(user.role ?? '')
      .toLowerCase()
      .trim();
  const schoolId = resolveProfileSchoolId(user);
  const permissions = asPermissionList(user.permissions);

  if (role === 'superadmin' || role === 'super_admin') {
    return {
      role: 'superadmin',
      scope: 'platform_all',
      schoolId: null,
      allowedCollections: ['system_messages', 'conversations'],
      canDelete: true,
      canSoftDelete: true,
      canViewAll: true,
      canAccessPlatformInbox: true,
      allowedVisibilities: [
        'superadmin_private',
        'platform_operations',
        'school_private',
      ],
      permissions,
      displayLabelAr: 'مدير النظام',
      displayLabelEn: 'Super Admin',
    };
  }

  if (role === 'platform_assistant' || isPlatformAssistantProfile(user)) {
    // No empty-permissions fallback — must have an explicit ops permission
    const canAccessPlatformInbox = permissions.some((p) =>
      PLATFORM_OPS_PERMISSIONS.has(p),
    );
    return {
      role: 'platform_assistant',
      scope: 'platform_ops',
      schoolId: null,
      allowedCollections: canAccessPlatformInbox
        ? ['system_messages', 'conversations']
        : [],
      canDelete: false,
      canSoftDelete: true,
      canViewAll: false,
      canAccessPlatformInbox,
      // Assistants NEVER receive superadmin_private
      allowedVisibilities: canAccessPlatformInbox
        ? ['platform_operations']
        : [],
      permissions,
      displayLabelAr: 'مساعد منصة',
      displayLabelEn: 'System Assistant',
    };
  }

  if (
    role === 'admin' ||
    role === 'school_admin' ||
    role === 'staff' ||
    role === 'school_assistant' ||
    isSchoolAssistantProfile(user)
  ) {
    return {
      role,
      scope: 'school',
      schoolId,
      allowedCollections: schoolId
        ? ['system_messages', 'conversations']
        : [],
      canDelete: false,
      canSoftDelete: true,
      canViewAll: false,
      canAccessPlatformInbox: false,
      // School may see SA messages to them + their own school threads + ops they started
      allowedVisibilities: ['school_private', 'superadmin_private', 'platform_operations'],
      permissions,
      displayLabelAr:
        role === 'school_assistant' || role === 'assistant'
          ? 'مساعد مدرسة'
          : 'إدارة المدرسة',
      displayLabelEn:
        role === 'school_assistant' || role === 'assistant'
          ? 'School Assistant'
          : 'School Admin',
    };
  }

  if (role === 'teacher' || role === 'parent') {
    return {
      role,
      scope: 'school_participants',
      schoolId,
      allowedCollections: schoolId
        ? ['system_messages', 'conversations']
        : [],
      canDelete: false,
      canSoftDelete: true,
      canViewAll: false,
      canAccessPlatformInbox: false,
      allowedVisibilities: ['school_private'],
      permissions,
      displayLabelAr: role === 'teacher' ? 'معلم' : 'ولي أمر',
      displayLabelEn: role === 'teacher' ? 'Teacher' : 'Parent',
    };
  }

  return { ...empty, role };
}

/** Strict authorization for a conversation or message document. */
export function authorizeConversationAccess(
  user: Record<string, unknown> | null | undefined,
  conversationOrMessage: Record<string, unknown> | null | undefined,
): boolean {
  const access = resolveMessagingAccess(user);
  if (!access.role || access.scope === 'none') return false;
  if (!conversationOrMessage) return false;

  if (access.canViewAll) return true;

  const visibility = normalizeConversationVisibility(conversationOrMessage);

  if (access.role === 'platform_assistant') {
    if (!access.canAccessPlatformInbox) return false;
    // Assistants: explicit visibility stamp only — no legacy OR inference
    const explicit = getExplicitVisibility(conversationOrMessage);
    return explicit === 'platform_operations';
  }

  if (!access.allowedVisibilities.includes(visibility)) return false;

  if (access.scope === 'school' || access.scope === 'school_participants') {
    const sid =
      resolveProfileSchoolId(conversationOrMessage) ||
      String(conversationOrMessage.schoolId ?? '');
    if (!access.schoolId || !sid || access.schoolId !== sid) {
      // Allow school to read their platform thread directed at them
      const audience = String(conversationOrMessage.audience ?? '');
      const receiverId = String(conversationOrMessage.receiverId ?? '');
      if (
        access.schoolId &&
        sid === access.schoolId &&
        (audience === 'school_admin' ||
          receiverId === 'admin' ||
          receiverId === String(user?.uid ?? ''))
      ) {
        return true;
      }
      return access.schoolId === sid;
    }
  }

  return true;
}

export function isSuperAdminPrivateMessage(
  msg: Record<string, unknown>,
): boolean {
  return normalizeConversationVisibility(msg) === 'superadmin_private';
}

export function filterMessagesForAccess(
  messages: Record<string, unknown>[],
  access: MessagingAccess,
  viewerUid: string,
  viewerProfile?: Record<string, unknown> | null,
): Record<string, unknown>[] {
  if (access.canViewAll || access.scope === 'platform_all') return messages;

  const profile = viewerProfile || {
    role: access.role,
    schoolId: access.schoolId || '',
    permissions: access.permissions,
  };

  return messages.filter((m) => authorizeConversationAccess(profile, m));
}

export function filterConversationsForAccess(
  conversations: Record<string, unknown>[],
  access: MessagingAccess,
  viewerProfile?: Record<string, unknown> | null,
): Record<string, unknown>[] {
  if (access.canViewAll) return conversations;
  const profile = viewerProfile || {
    role: access.role,
    schoolId: access.schoolId || '',
    permissions: access.permissions,
  };
  return conversations.filter((c) => authorizeConversationAccess(profile, c));
}

/** Fields to stamp on new conversation / message writes. */
export function buildMessagingMeta(params: {
  actorUid: string;
  actorRole: string;
  visibility: MessagingVisibility;
  schoolId?: string | null;
  allowedRoles?: string[];
}): Record<string, unknown> {
  const allowedRoles =
    params.allowedRoles ||
    (params.visibility === 'superadmin_private'
      ? ['superadmin']
      : params.visibility === 'platform_operations'
        ? ['superadmin', 'platform_assistant']
        : ['admin', 'school_admin', 'staff', 'school_assistant', 'teacher', 'parent']);

  return {
    createdBy: params.actorUid,
    createdByRole: params.actorRole,
    visibility: params.visibility,
    visibilityScope: params.visibility,
    allowedRoles,
    ...(params.schoolId ? { schoolId: params.schoolId } : {}),
  };
}

/**
 * Central messaging access layer — sole authority for chat visibility.
 * Platform assistants NEVER fall back to participants/receiverId/schoolId alone.
 */

import {
  buildConversationPrivacyStamp,
  computePrivacyHash,
  verifyPrivacyHash,
  extractConversationPrivacy,
  type ConversationPrivacy,
  type ConversationPrivacyVisibility,
} from './conversationPrivacy';
import {
  isPlatformAssistantProfile,
  isSchoolAssistantProfile,
  normalizeEffectiveRole,
  resolveProfileSchoolId,
} from './schoolId';

export type MessagingVisibility = ConversationPrivacyVisibility;

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
  canDelete: boolean;
  canSoftDelete: boolean;
  canViewAll: boolean;
  canAccessPlatformInbox: boolean;
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
  return String(role ?? '').toLowerCase().trim();
}

export function getExplicitVisibility(
  data: Record<string, unknown> | null | undefined,
): MessagingVisibility | null {
  const privacy = extractConversationPrivacy(data);
  if (privacy) return privacy.visibility;
  const explicit = String(data?.visibility ?? data?.visibilityScope ?? '')
    .toLowerCase()
    .trim();
  if (
    explicit === 'superadmin_private' ||
    explicit === 'superadmin_only' ||
    explicit === 'platform'
  ) {
    return 'superadmin_private';
  }
  if (explicit === 'platform_assistant_private') {
    return 'platform_assistant_private';
  }
  if (explicit === 'platform_operations' || explicit === 'platform_ops') {
    return 'platform_operations';
  }
  if (explicit === 'school_private' || explicit === 'school') {
    return 'school_private';
  }
  return null;
}

/** Legacy inference — Super Admin / school roles only; never for platform assistant. */
export function normalizeConversationVisibility(
  data: Record<string, unknown> | null | undefined,
): MessagingVisibility {
  const explicit = getExplicitVisibility(data);
  if (explicit) return explicit;
  if (!data) return 'school_private';

  const createdByRole = normalizeRoleLabel(
    data.createdByRole ?? data.senderRole,
  );
  if (createdByRole === 'superadmin' || createdByRole === 'super_admin') {
    return 'superadmin_private';
  }

  const conversationId = String(data.conversationId ?? data.id ?? '');
  if (conversationId.startsWith('superadmin_')) {
    if (
      ['admin', 'school_admin', 'staff', 'assistant', 'school_assistant'].includes(
        createdByRole,
      )
    ) {
      return 'platform_operations';
    }
    return 'superadmin_private';
  }

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
    String(user.role ?? '').toLowerCase().trim();
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
        'platform_assistant_private',
        'platform_operations',
        'school_private',
      ],
      permissions,
      displayLabelAr: 'مدير النظام',
      displayLabelEn: 'Super Admin',
    };
  }

  if (role === 'platform_assistant' || isPlatformAssistantProfile(user)) {
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
      allowedVisibilities: canAccessPlatformInbox
        ? ['platform_operations', 'platform_assistant_private']
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
      allowedVisibilities: [
        'school_private',
        'superadmin_private',
        'platform_operations',
      ],
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

function authorizeByPrivacyVisibility(
  user: Record<string, unknown>,
  privacy: ConversationPrivacy,
  access: MessagingAccess,
  doc: Record<string, unknown>,
): boolean {
  const uid = String(user.uid ?? '');
  const role = access.role;

  switch (privacy.visibility) {
    case 'superadmin_private':
      return role === 'superadmin' || privacy.ownerUserId === uid;
    case 'platform_assistant_private':
      return role === 'superadmin' || privacy.ownerUserId === uid;
    case 'platform_operations':
      if (role === 'superadmin') return true;
      if (role === 'platform_assistant') {
        return (
          access.canAccessPlatformInbox &&
          (privacy.ownerUserId === uid || privacy.allowedUserIds.includes(uid))
        );
      }
      return false;
    case 'school_private': {
      const userSchool = access.schoolId || resolveProfileSchoolId(user) || '';
      const docSchool =
        resolveProfileSchoolId(doc) || String(doc.schoolId ?? '');
      return !!userSchool && !!docSchool && userSchool === docSchool;
    }
    default:
      return false;
  }
}

/** Strict authorization — conversationPrivacy + privacyHash required for assistants. */
export function authorizeConversationAccess(
  user: Record<string, unknown> | null | undefined,
  conversationOrMessage: Record<string, unknown> | null | undefined,
): boolean {
  const access = resolveMessagingAccess(user);
  if (!access.role || access.scope === 'none') return false;
  if (!conversationOrMessage) return false;

  if (access.canViewAll) return true;

  const privacy = extractConversationPrivacy(conversationOrMessage);
  const uid = String(user?.uid ?? '');

  if (access.role === 'platform_assistant') {
    if (!access.canAccessPlatformInbox) return false;
    if (!privacy) return false;
    if (!verifyPrivacyHash(conversationOrMessage)) return false;
    if (privacy.visibility === 'superadmin_private') return false;
    if (privacy.visibility === 'platform_assistant_private') {
      return privacy.ownerUserId === uid;
    }
    if (privacy.visibility === 'platform_operations') {
      return authorizeByPrivacyVisibility(user!, privacy, access, conversationOrMessage);
    }
    return false;
  }

  if (privacy) {
    if (!verifyPrivacyHash(conversationOrMessage)) {
      return access.role === 'superadmin';
    }
    const visibility = privacy.visibility;
    if (!access.allowedVisibilities.includes(visibility)) return false;
    if (access.scope === 'school' || access.scope === 'school_participants') {
      const sid =
        resolveProfileSchoolId(conversationOrMessage) ||
        String(conversationOrMessage.schoolId ?? '');
      if (access.schoolId && sid && access.schoolId !== sid) {
        const audience = String(conversationOrMessage.audience ?? '');
        const receiverId = String(conversationOrMessage.receiverId ?? '');
        if (
          audience === 'school_admin' ||
          receiverId === 'admin' ||
          receiverId === uid
        ) {
          return authorizeByPrivacyVisibility(
            user!,
            privacy,
            access,
            conversationOrMessage,
          );
        }
        return false;
      }
    }
    return authorizeByPrivacyVisibility(
      user!,
      privacy,
      access,
      conversationOrMessage,
    );
  }

  // Legacy path — school/superadmin only; assistants never reach here
  const visibility = normalizeConversationVisibility(conversationOrMessage);
  if (!access.allowedVisibilities.includes(visibility)) return false;

  if (access.scope === 'school' || access.scope === 'school_participants') {
    const sid =
      resolveProfileSchoolId(conversationOrMessage) ||
      String(conversationOrMessage.schoolId ?? '');
    if (!access.schoolId || !sid || access.schoolId !== sid) {
      const audience = String(conversationOrMessage.audience ?? '');
      const receiverId = String(conversationOrMessage.receiverId ?? '');
      if (
        access.schoolId &&
        sid === access.schoolId &&
        (audience === 'school_admin' ||
          receiverId === 'admin' ||
          receiverId === uid)
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
  const privacy = extractConversationPrivacy(msg);
  if (privacy) return privacy.visibility === 'superadmin_private';
  return normalizeConversationVisibility(msg) === 'superadmin_private';
}

export function filterMessagesForAccess(
  messages: Record<string, unknown>[],
  access: MessagingAccess,
  _viewerUid: string,
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

export { buildConversationPrivacyStamp } from './conversationPrivacy';

/** @deprecated use buildConversationPrivacyStamp */
export function buildMessagingMeta(params: {
  actorUid: string;
  actorRole: string;
  visibility: MessagingVisibility;
  schoolId?: string | null;
  allowedRoles?: string[];
  allowedUserIds?: string[];
}): Record<string, unknown> {
  return {
    ...buildConversationPrivacyStamp({
      ownerUserId: params.actorUid,
      ownerRole: params.actorRole,
      visibility: params.visibility,
      allowedRoles: params.allowedRoles,
      allowedUserIds: params.allowedUserIds,
      schoolId: params.schoolId,
    }),
  };
}

export function redactNotificationBodyForRecipient(params: {
  recipientRole: string;
  recipientUserId: string;
  messageDoc?: Record<string, unknown> | null;
  fullMessage: string;
}): string {
  const { recipientRole, recipientUserId, messageDoc, fullMessage } = params;
  if (recipientRole !== 'platform_assistant') return fullMessage;
  if (!messageDoc) return 'لديك رسالة جديدة';
  if (!authorizeConversationAccess(
    { uid: recipientUserId, role: 'platform_assistant', permissions: [] },
    messageDoc,
  )) {
    return 'لديك رسالة جديدة';
  }
  const privacy = extractConversationPrivacy(messageDoc);
  if (
    privacy?.visibility === 'platform_assistant_private' &&
    privacy.ownerUserId !== recipientUserId
  ) {
    return 'لديك رسالة جديدة';
  }
  return fullMessage;
}

// Re-export for tests
export { computePrivacyHash, verifyPrivacyHash, extractConversationPrivacy };

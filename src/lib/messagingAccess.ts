/**
 * Central messaging access layer — role-scoped chat permissions.
 * UI MUST call this; hard deletes MUST go through backend Admin SDK.
 */

import {
  isPlatformAssistantProfile,
  isSchoolAssistantProfile,
  normalizeEffectiveRole,
  resolveProfileSchoolId,
} from './schoolId';

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
  /** Platform assistant: school-ops inbox (not superadmin-private) */
  canAccessPlatformInbox: boolean;
  permissions: string[];
  displayLabelAr: string;
  displayLabelEn: string;
};

const PLATFORM_INBOX_PERMISSIONS = new Set([
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
    permissions: [],
    displayLabelAr: '',
    displayLabelEn: '',
  };

  if (!user) return empty;

  const role = normalizeEffectiveRole(user) || String(user.role ?? '').toLowerCase().trim();
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
      permissions,
      displayLabelAr: 'مدير النظام',
      displayLabelEn: 'Super Admin',
    };
  }

  if (
    role === 'platform_assistant' ||
    isPlatformAssistantProfile(user)
  ) {
    const canAccessPlatformInbox = permissions.some((p) =>
      PLATFORM_INBOX_PERMISSIONS.has(p),
    ) || permissions.length === 0;
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

  if (role === 'teacher') {
    return {
      role: 'teacher',
      scope: 'school_participants',
      schoolId,
      allowedCollections: schoolId
        ? ['system_messages', 'conversations']
        : [],
      canDelete: false,
      canSoftDelete: true,
      canViewAll: false,
      canAccessPlatformInbox: false,
      permissions,
      displayLabelAr: 'معلم',
      displayLabelEn: 'Teacher',
    };
  }

  if (role === 'parent') {
    return {
      role: 'parent',
      scope: 'school_participants',
      schoolId,
      allowedCollections: schoolId
        ? ['system_messages', 'conversations']
        : [],
      canDelete: false,
      canSoftDelete: true,
      canViewAll: false,
      canAccessPlatformInbox: false,
      permissions,
      displayLabelAr: 'ولي أمر',
      displayLabelEn: 'Parent',
    };
  }

  return { ...empty, role };
}

/** Whether a message should be hidden from platform assistants (superadmin-private). */
export function isSuperAdminPrivateMessage(msg: Record<string, unknown>): boolean {
  const scope = String(msg.visibilityScope ?? '').toLowerCase();
  if (scope === 'superadmin_private' || scope === 'superadmin_only') return true;
  if (msg.superAdminPrivate === true) return true;
  return false;
}

export function filterMessagesForAccess(
  messages: Record<string, unknown>[],
  access: MessagingAccess,
  viewerUid: string,
): Record<string, unknown>[] {
  if (access.canViewAll || access.scope === 'platform_all') return messages;
  if (access.scope === 'platform_ops') {
    return messages.filter((m) => {
      if (isSuperAdminPrivateMessage(m)) return false;
      const senderId = String(m.senderId ?? '');
      const receiverId = String(m.receiverId ?? '');
      // Own messages always visible
      if (senderId === viewerUid || receiverId === viewerUid) return true;
      // Shared platform↔school ops thread (not private)
      if (receiverId === 'super_admin' || receiverId === 'admin') return true;
      if (String(m.audience ?? '') === 'school_admin') return true;
      return false;
    });
  }
  if (access.scope === 'school' || access.scope === 'school_participants') {
    if (!access.schoolId) return [];
    return messages.filter((m) => String(m.schoolId ?? '') === access.schoolId);
  }
  return [];
}

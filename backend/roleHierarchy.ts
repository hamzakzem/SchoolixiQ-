/**
 * Server-side role hierarchy for admin API authorization.
 * Higher rank = more privilege. Peers cannot manage each other unless superadmin.
 */

export const ROLE_RANK: Record<string, number> = {
  superadmin: 100,
  super_admin: 100,
  platform_assistant: 90,
  admin: 80,
  school_admin: 80,
  staff: 60,
  school_assistant: 55,
  /** @deprecated legacy — maps via normalizeEffectiveRole */
  assistant: 55,
  teacher: 50,
  parent: 40,
  guard: 30,
  distributor: 25,
  student: 20,
};

export const PLATFORM_ASSISTANT_PERMISSION_HINTS = new Set([
  'manage_packages',
  'manage_schools',
  'view_requests',
  'manage_distributors',
  'manage_users',
  'system_settings',
  'view_backups',
  'manage_subscriptions',
  'manage_system',
]);

export function normalizeRole(role: string | undefined | null): string {
  if (!role) return '';
  if (role === 'super_admin') return 'superadmin';
  return role;
}

/**
 * Read-only normalize for legacy role:"assistant" → platform_assistant | school_assistant.
 * Does not write to Firestore.
 */
export function normalizeEffectiveRole(
  role: string | undefined | null,
  schoolId?: string | null,
  userData?: Record<string, unknown> | null,
): string {
  const r = normalizeRole(role);
  if (!r) return '';
  if (r === 'platform_assistant' || r === 'school_assistant') return r;
  if (r === 'assistant') {
    const type =
      String(userData?.assistantType ?? userData?.assistantScope ?? '')
        .toLowerCase()
        .trim();
    if (type === 'platform') return 'platform_assistant';
    if (type === 'school') return 'school_assistant';
    const sid = schoolId ? String(schoolId).trim() : '';
    if (sid) return 'school_assistant';
    const perms = userData?.permissions;
    if (
      Array.isArray(perms) &&
      perms.some((p) => PLATFORM_ASSISTANT_PERMISSION_HINTS.has(String(p)))
    ) {
      return 'platform_assistant';
    }
    return sid ? 'school_assistant' : 'platform_assistant';
  }
  return r;
}

export function roleRank(role: string | undefined | null): number {
  return ROLE_RANK[normalizeEffectiveRole(role) || normalizeRole(role)] ?? 0;
}

export function isSuperAdminRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'superadmin';
}

export function isDistributorRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'distributor';
}

export function isSchoolAdminRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'school_admin';
}

export function isPlatformAssistant(
  role: string | undefined | null,
  schoolId?: string | null,
  userData?: Record<string, unknown> | null,
): boolean {
  return (
    normalizeEffectiveRole(role, schoolId, userData) === 'platform_assistant'
  );
}

export function isSchoolAssistantRole(
  role: string | undefined | null,
  schoolId?: string | null,
  userData?: Record<string, unknown> | null,
): boolean {
  return (
    normalizeEffectiveRole(role, schoolId, userData) === 'school_assistant'
  );
}

/** @deprecated Use isPlatformAssistant */
export function isSystemAssistant(
  role: string | undefined | null,
  schoolId?: string | null,
  userData?: Record<string, unknown> | null,
): boolean {
  return isPlatformAssistant(role, schoolId, userData);
}

/** Roles allowed to hit admin APIs at all (individual endpoints apply stricter checks). */
export function canActorUseAdminApi(
  role: string | undefined | null,
  schoolId?: string | null,
  userData?: Record<string, unknown> | null,
): boolean {
  const r = normalizeEffectiveRole(role, schoolId, userData);
  if (isSuperAdminRole(r)) return true;
  if (isSchoolAdminRole(r)) return true;
  if (r === 'platform_assistant') return true;
  if (r === 'staff' || r === 'school_assistant' || r === 'assistant') {
    return Boolean(schoolId && String(schoolId).trim());
  }
  return false;
}

export function canActorCreateRole(
  actorRole: string | undefined | null,
  targetRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  const target = normalizeRole(targetRole);
  if (!target) return false;

  if (target === 'superadmin') return actor === 'superadmin';
  if (target === 'distributor') return actor === 'superadmin';
  if (actor === 'platform_assistant') return false;

  if (['admin', 'school_admin'].includes(target)) {
    return actor === 'superadmin';
  }

  if (target === 'platform_assistant') {
    return actor === 'superadmin';
  }

  // Reject bare legacy assistant creation — must be platform_assistant | school_assistant
  if (target === 'assistant') {
    return false;
  }

  if (isSuperAdminRole(actor)) return true;

  if (isSchoolAdminRole(actor)) {
    return [
      'teacher',
      'parent',
      'guard',
      'staff',
      'school_assistant',
      'student',
    ].includes(target);
  }

  if (actor === 'staff' || actor === 'school_assistant') {
    return target === 'parent';
  }

  return false;
}

export function canActorDeleteUser(
  actorRole: string | undefined | null,
  targetRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  const target = normalizeRole(targetRole);
  if (!target) return false;

  if (actor === 'platform_assistant') return false;

  if (isSuperAdminRole(actor)) {
    if (isSuperAdminRole(target)) return false;
    return true;
  }

  if (isSchoolAdminRole(actor)) {
    return roleRank(target) < roleRank('admin');
  }

  return false;
}

export function canActorSyncClaims(
  actorRole: string | undefined | null,
  targetRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  const target = normalizeRole(targetRole);
  if (!target) return false;

  if (isSuperAdminRole(actor)) return true;
  if (actor === 'platform_assistant') return false;

  if (isSchoolAdminRole(actor)) {
    return roleRank(target) < roleRank('admin');
  }

  return false;
}

export function canActorDeleteStudent(
  actorRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeEffectiveRole(actorRole, actorSchoolId);
  if (isSuperAdminRole(actor)) return true;
  if (actor === 'platform_assistant') return false;
  return isSchoolAdminRole(actor);
}

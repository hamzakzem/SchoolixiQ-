/**
 * Server-side role hierarchy for admin API authorization.
 * Higher rank = more privilege. Peers cannot manage each other unless superadmin.
 */

export const ROLE_RANK: Record<string, number> = {
  superadmin: 100,
  super_admin: 100,
  admin: 80,
  school_admin: 80,
  staff: 60,
  assistant: 55,
  teacher: 50,
  parent: 40,
  guard: 30,
  student: 20,
};

export function normalizeRole(role: string | undefined | null): string {
  if (!role) return '';
  return role === 'super_admin' ? 'superadmin' : role;
}

export function roleRank(role: string | undefined | null): number {
  return ROLE_RANK[normalizeRole(role)] ?? 0;
}

export function isSuperAdminRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'superadmin';
}

export function isSchoolAdminRole(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'school_admin';
}

export function isSystemAssistant(
  role: string | undefined | null,
  schoolId?: string | null,
): boolean {
  return normalizeRole(role) === 'assistant' && !schoolId;
}

/** Roles allowed to hit admin APIs at all (individual endpoints apply stricter checks). */
export function canActorUseAdminApi(
  role: string | undefined | null,
  schoolId?: string | null,
): boolean {
  const r = normalizeRole(role);
  if (isSuperAdminRole(r)) return true;
  if (isSchoolAdminRole(r)) return true;
  if (r === 'staff' || r === 'assistant') {
    return !isSystemAssistant(r, schoolId);
  }
  return false;
}

export function canActorCreateRole(
  actorRole: string | undefined | null,
  targetRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!target) return false;

  if (target === 'superadmin') return actor === 'superadmin';
  if (isSystemAssistant(actor, actorSchoolId)) return false;

  if (['admin', 'school_admin'].includes(target)) {
    return actor === 'superadmin';
  }

  if (target === 'assistant' && !actorSchoolId) {
    return actor === 'superadmin';
  }

  if (isSuperAdminRole(actor)) return true;

  if (isSchoolAdminRole(actor)) {
    return ['teacher', 'parent', 'guard', 'staff', 'assistant', 'student'].includes(
      target,
    );
  }

  if (actor === 'staff' || actor === 'assistant') {
    return target === 'parent';
  }

  return false;
}

export function canActorDeleteUser(
  actorRole: string | undefined | null,
  targetRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!target) return false;

  if (isSystemAssistant(actor, actorSchoolId)) return false;

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
  const actor = normalizeRole(actorRole);
  const target = normalizeRole(targetRole);
  if (!target) return false;

  if (isSuperAdminRole(actor)) return true;
  if (isSystemAssistant(actor, actorSchoolId)) return false;

  if (isSchoolAdminRole(actor)) {
    return roleRank(target) < roleRank('admin');
  }

  return false;
}

export function canActorDeleteStudent(
  actorRole: string | undefined | null,
  actorSchoolId?: string | null,
): boolean {
  const actor = normalizeRole(actorRole);
  if (isSuperAdminRole(actor)) return true;
  if (isSystemAssistant(actor, actorSchoolId)) return false;
  return isSchoolAdminRole(actor);
}

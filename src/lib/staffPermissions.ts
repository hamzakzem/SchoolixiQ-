import {
  type PackagePermissions,
  isMenuFeatureEnabled,
  isStaffPermissionAllowedByPackage,
  menuIdToPackageKeys,
} from './featureRegistry';

/** Roles that use custom string[] permissions from Staff Management. */
export const CUSTOM_PERMISSION_ROLES = ['staff', 'assistant'] as const;

/** Roles with full dashboard access within the school package (custom array ignored). */
export const PACKAGE_PERMISSION_ROLES = ['admin', 'school_admin'] as const;

export type { PackagePermissions };

/**
 * Firestore user.permissions is authoritative when it is a string[] assigned per user.
 * Package-style objects and claims are fallbacks.
 */
export function resolveProfilePermissions(
  firestorePerms: unknown,
  claimPerms: unknown,
): unknown {
  if (Array.isArray(firestorePerms)) {
    return firestorePerms;
  }
  if (firestorePerms && typeof firestorePerms === 'object') {
    return firestorePerms;
  }
  return claimPerms ?? firestorePerms ?? null;
}

/** Map admin menu item ids to Staff Management permission ids. */
const MENU_TO_STAFF_PERMISSION: Record<string, string[]> = {
  students: ['students'],
  students_edit: ['students'],
  evaluation_reports: ['evaluation_reports'],
  advanced_reports: ['advanced_reports'],
  dismissal_gate: ['dismissal_gate'],
  student_archive: ['student_archive'],
  homework: ['homework'],
  schedules: ['schedules'],
  id_cards: ['id_cards'],
};

function staffPermissionAllows(itemId: string, userPerms: string[]): boolean {
  const keys = MENU_TO_STAFF_PERMISSION[itemId] || [itemId];
  return keys.some((key) => userPerms.includes(key));
}

function packageAllowsMenuItem(
  itemId: string,
  perms: PackagePermissions,
  role: string,
): boolean {
  if (itemId === 'assistants') {
    return (
      isMenuFeatureEnabled('assistants', perms) &&
      role === 'admin'
    );
  }
  const keys = menuIdToPackageKeys(itemId);
  if (keys.length === 0) return true;
  return isMenuFeatureEnabled(itemId, perms);
}

export function canAccessAdminMenuItem(
  itemId: string,
  role: string | undefined,
  userPerms: unknown,
  packagePerms: PackagePermissions | undefined,
  options?: { adminOnly?: boolean },
): boolean {
  if (!role) return false;
  if (role === 'superadmin') return true;

  if (itemId === 'overview') return true;
  if (itemId === 'chat') {
    return (
      role === 'admin' ||
      role === 'school_admin' ||
      role === 'staff' ||
      role === 'assistant'
    );
  }

  if (PACKAGE_PERMISSION_ROLES.includes(role as (typeof PACKAGE_PERMISSION_ROLES)[number])) {
    if (options?.adminOnly && role !== 'admin') return false;
    if (packagePerms && typeof packagePerms === 'object' && !Array.isArray(packagePerms)) {
      return packageAllowsMenuItem(itemId, packagePerms, role);
    }
    return true;
  }

  if (CUSTOM_PERMISSION_ROLES.includes(role as (typeof CUSTOM_PERMISSION_ROLES)[number])) {
    if (options?.adminOnly) return false;
    if (!Array.isArray(userPerms)) return false;
    if (!staffPermissionAllows(itemId, userPerms)) return false;
    if (packagePerms && typeof packagePerms === 'object' && !Array.isArray(packagePerms)) {
      return packageAllowsMenuItem(itemId, packagePerms, role);
    }
    return true;
  }

  return false;
}

/** Whether a staff permission id may be assigned given the school package. */
export function canAssignStaffPermission(
  staffPermId: string,
  packagePerms: PackagePermissions | undefined,
): boolean {
  return isStaffPermissionAllowedByPackage(staffPermId, packagePerms);
}

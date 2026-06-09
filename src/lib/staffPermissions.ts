/** Roles that use custom string[] permissions from Staff Management. */
export const CUSTOM_PERMISSION_ROLES = ['staff', 'assistant'] as const;

/** Roles with full dashboard access within the school package (custom array ignored). */
export const PACKAGE_PERMISSION_ROLES = ['admin', 'school_admin'] as const;

export type PackagePermissions = Record<string, boolean | undefined>;

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
};

function staffPermissionAllows(itemId: string, userPerms: string[]): boolean {
  const keys = MENU_TO_STAFF_PERMISSION[itemId] || [itemId];
  return keys.some((key) => userPerms.includes(key));
}

function packagePermissionAllows(
  itemId: string,
  perms: PackagePermissions,
  role: string,
): boolean {
  if (itemId === 'overview') return perms.overview !== false;
  if (itemId === 'chat') return perms.chat !== false;
  if (itemId === 'students') return perms.students_view !== false;
  if (itemId === 'students_edit') return perms.students_edit !== false;
  if (itemId === 'parents') return perms.parent_app_access !== false;
  if (itemId === 'staff') return perms.staff_manage !== false;
  if (itemId === 'tuition') return perms.tuition_fees !== false;
  if (itemId === 'payroll') return perms.staff_payroll !== false;
  if (itemId === 'attendance') return perms.attendance_track !== false;
  if (itemId === 'grades') return perms.exams_and_results !== false;
  if (itemId === 'student_archive') return perms.student_archive !== false;
  if (itemId === 'inventory') return perms.inventory_and_assets !== false;
  if (itemId === 'behavior') return perms.behavior_management !== false;
  if (itemId === 'evaluation_reports') return perms.student_evaluation_reports !== false;
  if (itemId === 'homework') return perms.homework_and_tasks !== false;
  if (itemId === 'classes') return perms.classes !== false;
  if (itemId === 'schedules') return perms.automated_schedules !== false;
  if (itemId === 'announcements') return perms.announcements !== false;
  if (itemId === 'advanced_reports') return perms.advanced_reports !== false;
  if (itemId === 'market') return perms.marketplace_ordering !== false;
  if (itemId === 'id_cards') return perms.id_card_generation !== false;
  if (itemId === 'assistants') {
    return perms.assistants_manage !== false && role === 'admin';
  }
  if (itemId === 'settings') return perms.settings !== false;
  return true;
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
      return packagePermissionAllows(itemId, packagePerms, role);
    }
    return true;
  }

  if (CUSTOM_PERMISSION_ROLES.includes(role as (typeof CUSTOM_PERMISSION_ROLES)[number])) {
    if (options?.adminOnly) return false;
    if (!Array.isArray(userPerms)) return false;
    return staffPermissionAllows(itemId, userPerms);
  }

  return false;
}

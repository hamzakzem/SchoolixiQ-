import type { UserProfile } from '../types';

/** Firestore userId values that appear in this user's notification inbox. */
export function getNotificationInboxUserIds(
  uid: string,
  role?: string | null,
): string[] {
  const normalized = (role || '').toLowerCase();
  if (normalized === 'superadmin') {
    return uid === 'super_admin' ? ['super_admin'] : [uid, 'super_admin'];
  }
  return [uid];
}

export function getNotificationInboxUserIdsFromProfile(
  profile: Pick<UserProfile, 'uid' | 'role'> | null | undefined,
): string[] {
  if (!profile?.uid) return [];
  return getNotificationInboxUserIds(profile.uid, profile.role);
}

export function isSuperAdminRole(role?: string | null): boolean {
  return (role || '').toLowerCase() === 'superadmin';
}

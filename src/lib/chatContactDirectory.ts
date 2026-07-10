/**
 * Platform Assistant contact directory — separate from conversation history.
 */
import {
  collection,
  getDocs,
  query,
  where,
  type Query,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChatContactType } from './chatConversationKeys';

export type ChatDirectoryContact = {
  id: string;
  name: string;
  contactType: ChatContactType;
  subtitle?: string;
  logoUrl?: string;
  extra?: Record<string, unknown>;
};

const SCHOOL_CONTACT_PERMS = ['manage_schools', 'view_requests'] as const;
const DISTRIBUTOR_CONTACT_PERMS = ['manage_distributors'] as const;
const SUPERADMIN_CONTACT_PERMS = ['manage_users', 'manage_system'] as const;

function asPermissionList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>)
      .filter(([, v]) => v === true)
      .map(([k]) => k);
  }
  return [];
}

export function resolveAssistantDirectoryPermissions(permissions: unknown): {
  canSeeSchools: boolean;
  canSeeDistributors: boolean;
  canSeeSuperAdmins: boolean;
} {
  const perms = asPermissionList(permissions);
  const has = (keys: readonly string[]) => keys.some((p) => perms.includes(p));
  return {
    canSeeSchools: has(SCHOOL_CONTACT_PERMS),
    canSeeDistributors: has(DISTRIBUTOR_CONTACT_PERMS),
    canSeeSuperAdmins: has(SUPERADMIN_CONTACT_PERMS),
  };
}

function isSchoolDirectoryEligible(data: Record<string, unknown>): boolean {
  const status = String(data.status ?? data.lifecycleStatus ?? '').toLowerCase();
  if (status === 'deleted' || status === 'archived') return false;
  if (data.deletedAt || data.permanentlyDeletedAt) return false;
  return true;
}

export async function loadAssistantContactDirectory(
  permissions: unknown,
): Promise<ChatDirectoryContact[]> {
  const gates = resolveAssistantDirectoryPermissions(permissions);
  const contacts: ChatDirectoryContact[] = [];
  const tasks: Promise<void>[] = [];

  if (gates.canSeeSchools) {
    tasks.push(
      (async () => {
        const snap = await getDocs(collection(db, 'schools'));
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          if (!isSchoolDirectoryEligible(data)) return;
          contacts.push({
            id: d.id,
            name: String(data.name ?? d.id),
            contactType: 'school',
            subtitle: String(data.city ?? data.governorate ?? ''),
            logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
            extra: { ...data, contactType: 'school' },
          });
        });
      })(),
    );
  }

  if (gates.canSeeSuperAdmins) {
    tasks.push(
      (async () => {
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['superadmin', 'super_admin']),
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          contacts.push({
            id: d.id,
            name: String(data.name ?? data.displayName ?? data.email ?? d.id),
            contactType: 'superadmin',
            subtitle: String(data.email ?? ''),
            extra: { ...data, contactType: 'superadmin' },
          });
        });
      })(),
    );
  }

  if (gates.canSeeDistributors) {
    tasks.push(
      (async () => {
        const snap = await getDocs(collection(db, 'distributors'));
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const status = String(data.status ?? '').toLowerCase();
          if (status === 'rejected' || status === 'deleted') return;
          contacts.push({
            id: d.id,
            name: String(data.name ?? d.id),
            contactType: 'distributor',
            subtitle: String(data.governorate ?? data.phone ?? ''),
            extra: { ...data, contactType: 'distributor' },
          });
        });
      })(),
    );
  }

  await Promise.all(tasks);

  return contacts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export function buildSchoolsDirectoryQuery(): Query {
  return query(collection(db, 'schools'));
}

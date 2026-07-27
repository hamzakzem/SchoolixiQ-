/**
 * Platform Assistant contact directory — separate from conversation history.
 */
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ChatContactType } from './chatConversationKeys';
import { logChatDirectoryDebug } from './chatDirectoryDebug';
import { fetchChatDirectorySchools } from './adminApi';

export type ChatDirectoryContact = {
  id: string;
  name: string;
  contactType: ChatContactType;
  subtitle?: string;
  logoUrl?: string;
  extra?: Record<string, unknown>;
};

export type SafeSchoolDirectoryEntry = {
  id: string;
  name: string;
  logoUrl?: string | null;
  status: string;
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

function isSchoolDirectoryEligible(status: string): boolean {
  const s = status.toLowerCase();
  return s !== 'deleted' && s !== 'archived';
}

function mapSafeSchoolContact(entry: SafeSchoolDirectoryEntry): ChatDirectoryContact | null {
  if (!isSchoolDirectoryEligible(entry.status)) return null;
  return {
    id: entry.id,
    name: entry.name,
    contactType: 'school',
    logoUrl: entry.logoUrl || undefined,
    extra: {
      contactType: 'school',
      contactId: entry.id,
      id: entry.id,
      name: entry.name,
      logoUrl: entry.logoUrl || null,
      status: entry.status,
    },
  };
}

async function loadSchoolsClientSafe(): Promise<{
  schools: ChatDirectoryContact[];
  errorCode: string | null;
}> {
  try {
    const snap = await getDocs(collection(db, 'schools'));
    const schools: ChatDirectoryContact[] = [];
    snap.docs.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const status = String(data.status ?? data.lifecycleStatus ?? 'active');
      if (!isSchoolDirectoryEligible(status)) return;
      if (data.deletedAt || data.permanentlyDeletedAt) return;
      schools.push({
        id: d.id,
        name: String(data.name ?? d.id),
        contactType: 'school',
        logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
        extra: {
          contactType: 'school',
          contactId: d.id,
          id: d.id,
          name: String(data.name ?? d.id),
          logoUrl: data.logoUrl ? String(data.logoUrl) : null,
          status,
        },
      });
    });
    return { schools, errorCode: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || 'client_schools_query_failed';
    return { schools: [], errorCode: code };
  }
}

export async function loadAssistantContactDirectory(
  permissions: unknown,
  context?: { uid?: string; role?: string },
): Promise<ChatDirectoryContact[]> {
  const gates = resolveAssistantDirectoryPermissions(permissions);
  const perms = asPermissionList(permissions);
  const uid = context?.uid || '';
  const effectiveRole = context?.role || 'platform_assistant';
  const contacts: ChatDirectoryContact[] = [];
  let schoolsCount = 0;
  let distributorsCount = 0;
  let superAdminsCount = 0;
  let errorCode: string | null = null;

  logChatDirectoryDebug({
    uid,
    effectiveRole,
    permissions: perms,
    queryStarted: true,
    schoolsCount: 0,
    errorCode: null,
    source: 'loadAssistantContactDirectory:start',
  });

  if (gates.canSeeSchools) {
    let schoolContacts: ChatDirectoryContact[] = [];
    try {
      const api = await fetchChatDirectorySchools();
      schoolContacts = (api.schools || [])
        .map((s) => mapSafeSchoolContact(s))
        .filter(Boolean) as ChatDirectoryContact[];
      schoolsCount = schoolContacts.length;
      errorCode = api.errorCode ?? null;
    } catch (apiErr) {
      console.warn('[CHAT_DIRECTORY_DEBUG] api fallback to client', apiErr);
      const client = await loadSchoolsClientSafe();
      schoolContacts = client.schools;
      schoolsCount = client.schools.length;
      errorCode = client.errorCode;
    }
    contacts.push(...schoolContacts);
  }

  if (gates.canSeeSuperAdmins) {
    try {
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
          extra: {
            contactType: 'superadmin',
            contactId: d.id,
            id: d.id,
            name: String(data.name ?? data.displayName ?? data.email ?? d.id),
          },
        });
      });
      superAdminsCount = snap.size;
    } catch (err: unknown) {
      errorCode = (err as { code?: string })?.code || errorCode;
    }
  }

  if (gates.canSeeDistributors) {
    try {
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
          extra: {
            contactType: 'distributor',
            contactId: d.id,
            id: d.id,
            name: String(data.name ?? d.id),
          },
        });
      });
      distributorsCount = snap.size;
    } catch (err: unknown) {
      errorCode = (err as { code?: string })?.code || errorCode;
    }
  }

  logChatDirectoryDebug({
    uid,
    effectiveRole,
    permissions: perms,
    queryStarted: true,
    schoolsCount,
    distributorsCount,
    superAdminsCount,
    totalContacts: contacts.length,
    errorCode,
    source: 'loadAssistantContactDirectory:done',
  });

  return contacts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

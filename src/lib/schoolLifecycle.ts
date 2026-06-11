import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getApiUrl } from './apiUtils';

export type SchoolLifecycleStatus =
  | 'active'
  | 'suspended'
  | 'archived'
  | 'inactive'
  | 'pending_subscription'
  | 'pending_approval'
  | 'rejected';

export function isSchoolHiddenFromActiveList(school: {
  status?: string;
  isDeleted?: boolean;
}): boolean {
  return school.status === 'archived' || Boolean(school.isDeleted);
}

export function isSchoolAccessBlocked(school: {
  status?: string;
  isDeleted?: boolean;
} | null | undefined): boolean {
  if (!school) return false;
  return (
    school.status === 'suspended' ||
    school.status === 'archived' ||
    Boolean(school.isDeleted)
  );
}

export function getSchoolStatusLabel(
  status: string | undefined,
  isRtl: boolean,
): string {
  const map: Record<string, { ar: string; en: string }> = {
    active: { ar: 'نشط', en: 'Active' },
    suspended: { ar: 'معطّل مؤقتاً', en: 'Suspended' },
    archived: { ar: 'مؤرشف', en: 'Archived' },
    inactive: { ar: 'موقوف', en: 'Inactive' },
    pending_subscription: { ar: 'بانتظار الاشتراك', en: 'Pending subscription' },
    pending_approval: { ar: 'بانتظار الموافقة', en: 'Pending approval' },
    rejected: { ar: 'مرفوض', en: 'Rejected' },
  };
  const entry = map[status || ''] || { ar: status || '—', en: status || '—' };
  return isRtl ? entry.ar : entry.en;
}

type Actor = { uid: string; name: string };

export async function suspendSchool(schoolId: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId), {
    status: 'suspended',
    suspendedAt: serverTimestamp(),
    suspendedBy: actor.uid,
    suspendedByName: actor.name,
    updatedAt: serverTimestamp(),
  });
}

export async function reactivateSchool(schoolId: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId), {
    status: 'active',
    isDeleted: false,
    reactivatedAt: serverTimestamp(),
    reactivatedBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveSchool(schoolId: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId), {
    status: 'archived',
    isDeleted: true,
    archivedAt: serverTimestamp(),
    archivedBy: actor.uid,
    archivedByName: actor.name,
    updatedAt: serverTimestamp(),
  });
}

export async function restoreArchivedSchool(schoolId: string, actor: Actor): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId), {
    status: 'active',
    isDeleted: false,
    restoredAt: serverTimestamp(),
    restoredBy: actor.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function permanentDeleteSchool(params: {
  schoolId: string;
  confirmName: string;
}): Promise<{ summary?: Record<string, unknown> }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('يجب تسجيل الدخول كSuper Admin');

  const response = await fetch(
    getApiUrl(`/api/admin/schools/${encodeURIComponent(params.schoolId)}/permanent-delete`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmName: params.confirmName }),
    },
  );

  let payload: Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const msg =
      String(payload.message || payload.error || '') ||
      `Permanent delete failed (${response.status})`;
    throw new Error(msg);
  }

  return { summary: payload.summary as Record<string, unknown> | undefined };
}

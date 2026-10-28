import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';

export type StudentLinkFields = {
  parentIds: string[];
  parentEmail: string;
  classId: string;
  className: string;
  schoolId: string;
};

/** Fresh student linkage fields for writes and parent-scoped reads. */
export async function fetchStudentLinkFields(
  studentId: string,
): Promise<StudentLinkFields | null> {
  const snap = await getDoc(doc(db, 'students', studentId));
  if (!snap.exists()) return null;

  const data = snap.data();
  const parentIds = [...((data.parentIds as string[]) || [])];
  const parentEmail = String(data.parentEmail || '').toLowerCase();

  if (parentIds.length === 0 && parentEmail && data.schoolId) {
    const pq = query(
      collection(db, 'users'),
      where('email', '==', parentEmail),
      where('schoolId', '==', data.schoolId),
      where('role', '==', 'parent'),
    );
    const psnap = await getDocs(pq);
    if (!psnap.empty) {
      const uid = psnap.docs[0].id;
      if (!parentIds.includes(uid)) parentIds.push(uid);
    }
  }

  return {
    parentIds,
    parentEmail,
    classId: String(data.classId || ''),
    className: String(data.class || data.className || ''),
    schoolId: String(data.schoolId || ''),
  };
}

const PARENT_LIST_TTL_MS = 60_000;
type ParentDocs = Map<string, Record<string, unknown>>;
const parentListCache = new Map<string, { at: number; docs: Promise<ParentDocs> }>();

/** Parent user docs of a school (cached briefly so bulk sends query once). */
function listSchoolParents(schoolId: string): Promise<ParentDocs> {
  const hit = parentListCache.get(schoolId);
  if (hit && Date.now() - hit.at < PARENT_LIST_TTL_MS) return hit.docs;
  const docs = getDocs(
    query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'parent')),
  ).then((snap) => new Map(snap.docs.map((d) => [d.id, d.data()])));
  docs.catch(() => parentListCache.delete(schoolId));
  parentListCache.set(schoolId, { at: Date.now(), docs });
  return docs;
}

/**
 * A parent's user doc, only if it belongs to `schoolId`; null otherwise.
 * School staff are refused a direct get on users/{id} (the rule runs past
 * Firestore's 1000-expression limit), but the school-scoped parents list
 * is allowed, so fall back to it.
 */
export async function getSchoolParentDoc(
  parentId: string,
  schoolId: string,
): Promise<Record<string, unknown> | null> {
  if (!parentId || !schoolId) return null;
  try {
    const snap = await getDoc(doc(db, 'users', parentId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.schoolId === schoolId && String(data.role || '').toLowerCase() === 'parent' ? data : null;
  } catch {
    return (await listSchoolParents(schoolId)).get(parentId) ?? null;
  }
}

/** Parent UIDs linked to a student, verified for the expected school only. */
export async function resolveStudentParentIds(
  studentId: string,
  expectedSchoolId: string,
): Promise<string[]> {
  const link = await fetchStudentLinkFields(studentId);
  if (!link || !expectedSchoolId || link.schoolId !== expectedSchoolId) {
    return [];
  }

  const ids = [...new Set(link.parentIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const verified: string[] = [];
  for (const parentId of ids) {
    if (await getSchoolParentDoc(parentId, expectedSchoolId)) verified.push(parentId);
  }
  return verified;
}

/** Union of parent UIDs linked to students (for parent-scoped homework writes). */
export function collectParentIdsFromStudents(
  students: Array<{ parentIds?: string[] }>,
): string[] {
  const ids = new Set<string>();
  for (const student of students) {
    for (const parentId of student.parentIds || []) {
      if (parentId) ids.add(parentId);
    }
  }
  return Array.from(ids);
}

export function homeworkMatchesStudent(
  hwClassId: string,
  student: { classId?: string; class?: string },
  classes?: Array<{ id: string; name?: string }>,
): boolean {
  if (!hwClassId) return false;

  const studentKeys = new Set<string>();
  if (student.classId) studentKeys.add(student.classId);
  if (student.class) studentKeys.add(student.class);

  if (studentKeys.has(hwClassId)) return true;

  if (classes?.length) {
    const classDoc = classes.find((c) => c.id === hwClassId);
    if (classDoc?.name && studentKeys.has(classDoc.name)) return true;
    if (student.classId) {
      const byId = classes.find((c) => c.id === student.classId);
      if (byId && hwClassId === byId.id) return true;
    }
    if (student.class) {
      const byName = classes.find((c) => c.name === student.class);
      if (byName && hwClassId === byName.id) return true;
    }
  }

  return false;
}

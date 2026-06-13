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

/** Parent UIDs linked to a student, verified for the expected school only. */
export async function resolveStudentParentIds(
  studentId: string,
  expectedSchoolId: string,
): Promise<string[]> {
  const link = await fetchStudentLinkFields(studentId);
  if (!link || !expectedSchoolId || link.schoolId !== expectedSchoolId) {
    return [];
  }

  const verified: string[] = [];
  for (const parentId of link.parentIds) {
    const userSnap = await getDoc(doc(db, 'users', parentId));
    if (!userSnap.exists()) continue;
    const userData = userSnap.data();
    if (
      userData.schoolId === expectedSchoolId &&
      String(userData.role || '').toLowerCase() === 'parent'
    ) {
      verified.push(parentId);
    }
  }

  return [...new Set(verified)];
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

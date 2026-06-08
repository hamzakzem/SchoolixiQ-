import { getTeacherSubjectDisplay } from './userProfile';

/** Firestore collection — single source of truth for approved school subjects. */
export const SCHOOL_SUBJECTS_COLLECTION = 'subjects';

export type SchoolSubjectOption = {
  id: string;
  name: string;
  schoolId?: string;
  className?: string;
  classId?: string;
};

function subjectDocPriority(entry: SchoolSubjectOption): number {
  if (!entry.className && !entry.classId) return 0;
  if (entry.className === 'جميع الصفوف') return 1;
  return 2;
}

export function dedupeSchoolSubjects(
  docs: { id: string; data: () => Record<string, unknown> }[],
  schoolId: string,
): SchoolSubjectOption[] {
  const byName = new Map<string, SchoolSubjectOption>();
  for (const docSnap of docs) {
    const data = docSnap.data();
    const docSchoolId = typeof data.schoolId === 'string' ? data.schoolId : '';
    if (docSchoolId && docSchoolId !== schoolId) continue;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) continue;
    const entry: SchoolSubjectOption = {
      id: docSnap.id,
      name,
      schoolId: docSchoolId || schoolId,
      className: typeof data.className === 'string' ? data.className : undefined,
      classId: typeof data.classId === 'string' ? data.classId : undefined,
    };
    const key = name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || subjectDocPriority(entry) < subjectDocPriority(existing)) {
      byName.set(key, entry);
    }
  }
  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'ar'),
  );
}

export function resolveSubjectIdForMember(
  member: Record<string, unknown>,
  schoolSubjects: SchoolSubjectOption[],
): string {
  const storedId = typeof member.subjectId === 'string' ? member.subjectId : '';
  if (storedId && schoolSubjects.some((s) => s.id === storedId)) {
    return storedId;
  }
  const display = getTeacherSubjectDisplay(member);
  const storedName =
    typeof member.subjectName === 'string' ? member.subjectName.trim() : '';
  if (display || storedName) {
    const match = schoolSubjects.find(
      (s) => s.name === display || (storedName && s.name === storedName),
    );
    if (match) return match.id;
  }
  return '';
}

export function findApprovedSubject(
  subjectId: string,
  schoolSubjects: SchoolSubjectOption[],
  schoolId: string,
): SchoolSubjectOption | null {
  if (!subjectId) return null;
  const picked = schoolSubjects.find((s) => s.id === subjectId);
  if (!picked || !picked.name.trim()) return null;
  if (picked.schoolId && picked.schoolId !== schoolId) return null;
  return picked;
}

export function subjectNameExists(
  subjects: SchoolSubjectOption[],
  name: string,
  excludeId?: string,
): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return subjects.some(
    (s) => s.id !== excludeId && s.name.trim().toLowerCase() === key,
  );
}

export function teacherUsesSubject(
  teacher: Record<string, unknown>,
  subjectId: string,
  subjectName: string,
): boolean {
  if (typeof teacher.subjectId === 'string' && teacher.subjectId === subjectId) {
    return true;
  }
  const normalized = subjectName.trim().toLowerCase();
  const candidates = [
    typeof teacher.subjectName === 'string' ? teacher.subjectName : '',
    typeof teacher.subject === 'string' ? teacher.subject : '',
    getTeacherSubjectDisplay(teacher),
  ];
  return candidates.some(
    (c) => c.trim().toLowerCase() === normalized && normalized.length > 0,
  );
}

export function listTeachersUsingSubject(
  teachers: Record<string, unknown>[],
  subjectId: string,
  subjectName: string,
): Array<{ id: string; name: string }> {
  return teachers
    .filter((t) => teacherUsesSubject(t, subjectId, subjectName))
    .map((t) => ({
      id: typeof t.id === 'string' ? t.id : '',
      name: typeof t.name === 'string' ? t.name : 'معلم',
    }))
    .filter((t) => t.id);
}

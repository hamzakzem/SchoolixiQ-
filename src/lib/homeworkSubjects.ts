import {
  getTeacherSubjectDisplay,
  isRedactedCredentialValue,
  type TeacherSubjectSource,
} from './userProfile';

/** School-defined subject document from Firestore `subjects` collection. */
export type SchoolSubjectDoc = {
  id: string;
  name: string;
  classId?: string;
  className?: string;
  schoolId?: string;
};

export const TEACHER_SUBJECT_REQUIRED_MSG =
  'يجب تحديد المادة الخاصة بالمعلم من قبل إدارة المدرسة قبل نشر الواجب.';

/** Subject name(s) assigned to a teacher by school administration on `users`. */
export function getTeacherSubjectNames(profile: {
  subject?: string;
  subjects?: string[];
} | null | undefined): string[] {
  if (!profile) return [];
  const names = new Set<string>();
  const primary = getTeacherSubjectDisplay(profile);
  if (primary) names.add(primary);
  if (Array.isArray(profile.subjects)) {
    profile.subjects.forEach((s) => {
      const trimmed = typeof s === 'string' ? s.trim() : '';
      if (trimmed) names.add(trimmed);
    });
  }
  return Array.from(names);
}

export function teacherHasAssignedSubject(profile: {
  subject?: string;
  subjects?: string[];
} | null | undefined): boolean {
  return getTeacherSubjectNames(profile).length > 0;
}

/** Match school subject docs to names assigned on the teacher profile. */
export function resolveSubjectsForTeacher(
  profile: { subject?: string; subjects?: string[] } | null | undefined,
  schoolSubjects: SchoolSubjectDoc[],
): SchoolSubjectDoc[] {
  const names = getTeacherSubjectNames(profile).map((n) => n.toLowerCase());
  if (names.length === 0) return [];

  const matched = schoolSubjects.filter((s) =>
    names.includes(s.name.trim().toLowerCase()),
  );
  if (matched.length > 0) return matched;

  // Admin assigned a subject name not yet in `subjects` collection — synthetic entry
  return names.map((name, idx) => ({
    id: `assigned_${idx}_${name}`,
    name: getTeacherSubjectNames(profile)[idx],
  }));
}

/** Subjects a teacher may use when publishing homework for a specific class. */
export function getSubjectOptionsForClass(
  assigned: SchoolSubjectDoc[],
  classId: string,
  classes: Array<{ id: string; name?: string }>,
): SchoolSubjectDoc[] {
  if (!assigned.length) return [];

  const className = classes.find((c) => c.id === classId)?.name;
  const forClass = assigned.filter(
    (s) =>
      !s.classId ||
      s.classId === classId ||
      (className && s.className === className),
  );

  if (forClass.length > 0) return forClass;
  return assigned;
}

export function resolveHomeworkSubjectForPublish(
  subjectId: string,
  assigned: SchoolSubjectDoc[],
  classId: string,
  classes: Array<{ id: string; name?: string }>,
  profile: { subject?: string; subjects?: string[] },
): { subjectId: string; subjectName: string } | null {
  const options = getSubjectOptionsForClass(assigned, classId, classes);
  if (!options.length) return null;

  const picked =
    options.find((s) => s.id === subjectId) ||
    (options.length === 1 ? options[0] : null);

  if (picked) {
    const isSynthetic = picked.id.startsWith('assigned_');
    return {
      subjectId: isSynthetic ? '' : picked.id,
      subjectName: picked.name,
    };
  }

  const names = getTeacherSubjectNames(profile);
  if (names.length === 1) {
    return { subjectId: '', subjectName: names[0] };
  }

  return null;
}

/** Backward-compatible display label for homework documents. */
export function getHomeworkSubjectDisplay(
  hw: {
    subjectName?: string;
    subject?: string;
    teacherId?: string;
  },
  teacher?: TeacherSubjectSource | null,
): string {
  const subjectName = (hw.subjectName || '').trim();
  const subject = (hw.subject || '').trim();
  const label = subjectName || subject;

  if (!label) return '—';

  if (teacher && isRedactedCredentialValue(label, teacher)) {
    return getTeacherSubjectDisplay(teacher) || '—';
  }

  if (
    !subjectName &&
    subject &&
    teacher &&
    isRedactedCredentialValue(subject, teacher)
  ) {
    return getTeacherSubjectDisplay(teacher) || '—';
  }

  return label;
}

/** Group homework items by subject for parent views. */
export function groupHomeworkBySubject<T extends { subjectName?: string; subject?: string; teacherId?: string }>(
  items: T[],
  teachersById?: Record<string, TeacherSubjectSource>,
): Array<{ subject: string; items: T[] }> {
  const map = new Map<string, T[]>();
  items.forEach((hw) => {
    const teacher = hw.teacherId ? teachersById?.[hw.teacherId] : undefined;
    const key = getHomeworkSubjectDisplay(hw, teacher);
    const list = map.get(key) || [];
    list.push(hw);
    map.set(key, list);
  });

  return Array.from(map.entries())
    .map(([subject, grouped]) => ({
      subject,
      items: grouped.sort(
        (a, b) =>
          ((b as { createdAt?: { seconds?: number } }).createdAt?.seconds || 0) -
          ((a as { createdAt?: { seconds?: number } }).createdAt?.seconds || 0),
      ),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject, 'ar'));
}

export function canTeacherDeleteHomework(
  hw: { teacherId?: string },
  teacherUid: string | undefined,
): boolean {
  return Boolean(teacherUid && hw.teacherId === teacherUid);
}

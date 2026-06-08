import {
  buildTeacherRedactionContext,
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

export const HOMEWORK_SUBJECT_UNKNOWN_AR = 'مادة غير محددة';
export const HOMEWORK_SUBJECT_UNKNOWN_EN = 'Unassigned subject';

/** Subject name(s) assigned to a teacher by school administration on `users`. */
export function getTeacherSubjectNames(profile: {
  subject?: string;
  subjects?: string[];
} | null | undefined): string[] {
  const ctx = buildTeacherRedactionContext(profile);
  if (!ctx) return [];

  const names = new Set<string>();
  const primary = getTeacherSubjectDisplay(ctx);
  if (primary) names.add(primary);

  if (Array.isArray(ctx.subjects)) {
    ctx.subjects.forEach((s) => {
      const trimmed = typeof s === 'string' ? s.trim() : '';
      if (trimmed && !isRedactedCredentialValue(trimmed, ctx)) {
        names.add(trimmed);
      }
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

  return getTeacherSubjectNames(profile).map((name, idx) => ({
    id: `assigned_${idx}_${name}`,
    name,
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
    const subjectName = picked.name.trim();
    const ctx = buildTeacherRedactionContext(profile);
    if (!subjectName || isRedactedCredentialValue(subjectName, ctx)) {
      return null;
    }
    return {
      subjectId: isSynthetic ? '' : picked.id,
      subjectName,
    };
  }

  const names = getTeacherSubjectNames(profile);
  if (names.length === 1) {
    return { subjectId: '', subjectName: names[0] };
  }

  return null;
}

/** Reject credential-like values before writing homework.subject / subjectName. */
export function isSafeHomeworkSubjectValue(
  subjectName: string,
  teacher?: TeacherSubjectSource | null,
): boolean {
  const trimmed = subjectName.trim();
  if (!trimmed) return false;
  const ctx = teacher ? buildTeacherRedactionContext(teacher) : null;
  return !isRedactedCredentialValue(trimmed, ctx);
}

/** Backward-compatible display label for homework documents. */
export function getHomeworkSubjectDisplay(
  hw: {
    subjectName?: string;
    subject?: string;
    teacherId?: string;
  },
  teacher?: TeacherSubjectSource | null,
  isRtl = true,
): string {
  const fallback = isRtl
    ? HOMEWORK_SUBJECT_UNKNOWN_AR
    : HOMEWORK_SUBJECT_UNKNOWN_EN;
  const ctx = teacher ? buildTeacherRedactionContext(teacher) : null;
  const safeTeacherSubject = ctx ? getTeacherSubjectDisplay(ctx) : '';

  const subjectName = (hw.subjectName || '').trim();
  const subject = (hw.subject || '').trim();

  if (subjectName && !isRedactedCredentialValue(subjectName, ctx)) {
    return subjectName;
  }

  if (subject && !isRedactedCredentialValue(subject, ctx)) {
    return subject;
  }

  if (safeTeacherSubject) return safeTeacherSubject;
  return fallback;
}

/** Redact homework notification titles that embed a leaked credential as subject. */
export function getSafeHomeworkNotificationTitle(
  title: string | undefined,
  teacher?: TeacherSubjectSource | null,
  isRtl = true,
): string {
  if (!title) return title || '';
  const parts = title.split(':');
  if (parts.length < 2) return title;

  const prefix = parts[0].trim();
  const maybeSubject = parts.slice(1).join(':').trim();
  const ctx = teacher ? buildTeacherRedactionContext(teacher) : null;

  if (!maybeSubject || !isRedactedCredentialValue(maybeSubject, ctx)) {
    return title;
  }

  const safeSubject =
    getTeacherSubjectDisplay(ctx) ||
    (isRtl ? HOMEWORK_SUBJECT_UNKNOWN_AR : HOMEWORK_SUBJECT_UNKNOWN_EN);
  return `${prefix}: ${safeSubject}`;
}

/** Detect homework docs that may have credential text stored as subject (audit helper). */
export function isSuspectHomeworkSubjectRecord(
  hw: { subject?: string; subjectName?: string; teacherId?: string },
  teacher?: TeacherSubjectSource | null,
): boolean {
  const ctx = teacher ? buildTeacherRedactionContext(teacher) : null;
  const subjectName = (hw.subjectName || '').trim();
  const subject = (hw.subject || '').trim();
  const label = subjectName || subject;
  return Boolean(label && isRedactedCredentialValue(label, ctx));
}

/** Group homework items by subject for parent views. */
export function groupHomeworkBySubject<T extends { subjectName?: string; subject?: string; teacherId?: string }>(
  items: T[],
  teachersById?: Record<string, TeacherSubjectSource>,
  isRtl = true,
): Array<{ subject: string; items: T[] }> {
  const map = new Map<string, T[]>();
  items.forEach((hw) => {
    const teacher = hw.teacherId ? teachersById?.[hw.teacherId] : undefined;
    const key = getHomeworkSubjectDisplay(hw, teacher, isRtl);
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

/** In-memory audit report for homework docs with credential-like subject fields. */
export function auditHomeworkSubjectRecords<
  T extends {
    id?: string;
    subject?: string;
    subjectName?: string;
    teacherId?: string;
  },
>(homework: T[], teachersById?: Record<string, TeacherSubjectSource>) {
  return homework
    .filter((hw) =>
      isSuspectHomeworkSubjectRecord(
        hw,
        hw.teacherId ? teachersById?.[hw.teacherId] : undefined,
      ),
    )
    .map((hw) => ({
      id: hw.id,
      teacherId: hw.teacherId,
      subject: hw.subject,
      subjectName: hw.subjectName,
    }));
}

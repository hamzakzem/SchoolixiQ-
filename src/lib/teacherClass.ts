export const TEACHER_NO_CLASS_MSG = 'لم يتم تعيين صف لهذا المعلم بعد';

export type SchoolClassOption = {
  id: string;
  name: string;
  schoolId?: string;
};

export function resolveTeacherClassId(profile?: Record<string, unknown> | null): string {
  if (!profile) return '';
  const candidates = [
    profile.assignedClassId,
    profile.primaryClassId,
    profile.classId,
    profile.preferredClassId,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function resolveTeacherClassName(
  profile?: Record<string, unknown> | null,
  classes?: SchoolClassOption[],
): string {
  if (!profile) return '';
  const stored =
    (typeof profile.assignedClassName === 'string' && profile.assignedClassName) ||
    (typeof profile.primaryClassName === 'string' && profile.primaryClassName) ||
    (typeof profile.className === 'string' && profile.className) ||
    '';
  if (stored) return stored;

  const classId = resolveTeacherClassId(profile);
  if (!classId || !classes?.length) return '';
  return classes.find((c) => c.id === classId)?.name || '';
}

export function teacherHasAssignedClass(profile?: Record<string, unknown> | null): boolean {
  return Boolean(resolveTeacherClassId(profile));
}

export function buildTeacherClassWriteFields(classId: string, className: string) {
  return {
    assignedClassId: classId,
    assignedClassName: className,
    primaryClassId: classId,
    primaryClassName: className,
    preferredClassId: classId,
    classId,
    className,
  };
}

export function buildTeacherClassClearFields() {
  return {
    assignedClassId: '',
    assignedClassName: '',
    primaryClassId: '',
    primaryClassName: '',
    preferredClassId: '',
    classId: '',
    className: '',
  };
}

export function filterClassesForTeacher(
  classes: SchoolClassOption[],
  assignedClassId: string,
): SchoolClassOption[] {
  if (!assignedClassId) return [];
  const match = classes.find((c) => c.id === assignedClassId);
  return match ? [match] : [];
}

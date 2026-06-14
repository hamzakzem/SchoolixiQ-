export const TEACHER_NO_CLASS_MSG = 'لم يتم تعيين صف لهذا المعلم بعد';
export const FIRESTORE_IN_QUERY_LIMIT = 10;

export type SchoolClassOption = {
  id: string;
  name: string;
  schoolId?: string;
};

function readLegacySingleClassId(profile: Record<string, unknown>): string {
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

/** All class IDs assigned to the teacher (multi-class with legacy fallback). */
export function resolveTeacherClassIds(profile?: Record<string, unknown> | null): string[] {
  if (!profile) return [];
  const raw = profile.assignedClassIds;
  if (Array.isArray(raw)) {
    const ids = raw
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .map((v) => v.trim());
    if (ids.length) return [...new Set(ids)];
  }
  const legacy = readLegacySingleClassId(profile);
  return legacy ? [legacy] : [];
}

export function resolveTeacherClassId(profile?: Record<string, unknown> | null): string {
  const ids = resolveTeacherClassIds(profile);
  return ids[0] || '';
}

export function resolveTeacherClassName(
  profile?: Record<string, unknown> | null,
  classes?: SchoolClassOption[],
): string {
  const names = resolveTeacherClassNames(profile, classes);
  if (names.length) return names.join('، ');
  if (!profile) return '';
  const stored =
    (typeof profile.assignedClassName === 'string' && profile.assignedClassName) ||
    (typeof profile.primaryClassName === 'string' && profile.primaryClassName) ||
    (typeof profile.className === 'string' && profile.className) ||
    '';
  return stored;
}

export function resolveTeacherClassNames(
  profile?: Record<string, unknown> | null,
  classes?: SchoolClassOption[],
): string[] {
  const ids = resolveTeacherClassIds(profile);
  if (ids.length && classes?.length) {
    return ids
      .map((id) => classes.find((c) => c.id === id)?.name || '')
      .filter(Boolean);
  }
  if (profile && typeof profile.assignedClassNames === 'string' && profile.assignedClassNames.trim()) {
    return profile.assignedClassNames
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const single = resolveTeacherClassName(profile, classes);
  return single ? [single] : [];
}

export function teacherHasAssignedClass(profile?: Record<string, unknown> | null): boolean {
  return resolveTeacherClassIds(profile).length > 0;
}

export function teacherHasClassAccess(
  profile: Record<string, unknown> | null | undefined,
  classId: string,
): boolean {
  if (!classId) return false;
  return resolveTeacherClassIds(profile).includes(classId);
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

export function buildTeacherClassWriteFieldsFromIds(
  classIds: string[],
  classes: SchoolClassOption[],
): Record<string, string | string[]> {
  const validIds = [
    ...new Set(
      classIds.filter((id) => classes.some((schoolClass) => schoolClass.id === id)),
    ),
  ];
  const primary = validIds[0] || '';
  const primaryClass = classes.find((c) => c.id === primary);
  const primaryName = primaryClass?.name || '';
  const assignedClassNames = validIds
    .map((id) => classes.find((c) => c.id === id)?.name || '')
    .filter(Boolean)
    .join('، ');

  return {
    assignedClassIds: validIds,
    assignedClassNames,
    ...buildTeacherClassWriteFields(primary, primaryName),
  };
}

export function buildTeacherClassClearFields() {
  return {
    assignedClassIds: [] as string[],
    assignedClassNames: '',
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
  assignedClassIdOrIds: string | string[],
): SchoolClassOption[] {
  const ids = Array.isArray(assignedClassIdOrIds)
    ? assignedClassIdOrIds
    : assignedClassIdOrIds
      ? [assignedClassIdOrIds]
      : [];
  if (!ids.length) return [];
  const idSet = new Set(ids);
  return classes.filter((c) => idSet.has(c.id));
}

export function chunkArray<T>(items: T[], size = FIRESTORE_IN_QUERY_LIMIT): T[][] {
  if (!items.length) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

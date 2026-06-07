const PASSWORD_FIELD_PATTERN = /password/i;

export type TeacherSubjectSource = {
  subject?: string;
  subjectName?: string;
  specialization?: string;
  assignedSubject?: string;
  subjects?: string[];
  password?: string;
  parentPassword?: string;
  teacherPassword?: string;
  plainPassword?: string;
  defaultPassword?: string;
  tempPassword?: string;
  [key: string]: unknown;
};

/** Remove sensitive credential fields from user/profile objects. */
export function stripSensitiveUserFields<T extends Record<string, unknown>>(
  data: T,
): T {
  const clean = { ...data } as T & Record<string, unknown>;
  for (const key of Object.keys(clean)) {
    if (PASSWORD_FIELD_PATTERN.test(key)) {
      delete clean[key];
    }
  }
  return clean as T;
}

export function collectPasswordValues(user: TeacherSubjectSource): Set<string> {
  const values = new Set<string>();
  for (const [key, fieldVal] of Object.entries(user)) {
    if (!PASSWORD_FIELD_PATTERN.test(key)) continue;
    if (typeof fieldVal === 'string' && fieldVal.trim()) {
      values.add(fieldVal.trim());
    }
  }
  return values;
}

/** Safe teacher subject label — never returns password or password-like stored values. */
export function getTeacherSubjectDisplay(
  user: TeacherSubjectSource | null | undefined,
): string {
  if (!user) return '';

  const blocked = collectPasswordValues(user);
  const candidates = [
    user.subject,
    user.subjectName,
    user.specialization,
    user.assignedSubject,
    Array.isArray(user.subjects) ? user.subjects[0] : undefined,
  ];

  for (const candidate of candidates) {
    const val = typeof candidate === 'string' ? candidate.trim() : '';
    if (!val || blocked.has(val)) continue;
    return val;
  }

  return '';
}

/** True when a display value matches a stored credential on the user record. */
export function isRedactedCredentialValue(
  value: string,
  context?: TeacherSubjectSource | null,
): boolean {
  const trimmed = value.trim();
  if (!trimmed || !context) return false;
  return collectPasswordValues(context).has(trimmed);
}

/** Strip sensitive fields and normalize subject for staff/teacher list records. */
export function sanitizeStaffRecord<T extends Record<string, unknown>>(
  record: T,
): T {
  const clean = stripSensitiveUserFields(record);
  const subject = getTeacherSubjectDisplay(clean as TeacherSubjectSource);
  return {
    ...clean,
    subject: subject || (typeof clean.subject === 'string' ? '' : clean.subject),
  } as T;
}

/** Payload safe for Firestore user documents (no plaintext passwords). */
export function sanitizeUserWritePayload(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const clean = stripSensitiveUserFields(data);
  const subject = getTeacherSubjectDisplay(clean as TeacherSubjectSource);
  if (subject) {
    clean.subject = subject;
  } else if ('subject' in clean && typeof clean.subject === 'string') {
    const blocked = collectPasswordValues(clean as TeacherSubjectSource);
    if (blocked.has(clean.subject.trim())) {
      clean.subject = '';
    }
  }
  return clean;
}

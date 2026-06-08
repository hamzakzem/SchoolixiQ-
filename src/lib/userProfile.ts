const PASSWORD_FIELD_PATTERN = /password/i;

const COMMON_SUBJECT_LABELS =
  /^(math|mathematics|science|english|arabic|physics|chemistry|biology|history|geography|islamic|pe|art|music|computer|informatics|رياضيات|علوم|عربي|انجليزي|فيزياء|كيمياء|احياء|تاريخ|جغرافيا|تربية\s*اسلامية)$/i;

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
  _credentialValues?: Set<string>;
  [key: string]: unknown;
};

/** Heuristic: value looks like a stored login password, not a school subject name. */
export function looksLikeStoredCredential(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 6) return false;
  if (/[\u0600-\u06FF]/.test(trimmed)) return false;
  if (COMMON_SUBJECT_LABELS.test(trimmed)) return false;
  if (/\s/.test(trimmed) && trimmed.length <= 40) return false;

  const hasDigit = /\d/.test(trimmed);
  const hasLetter = /[A-Za-z]/.test(trimmed);
  const isAlphanumericSymbol = /^[A-Za-z0-9!@#$%^&*._+\-/=]+$/.test(trimmed);

  if (trimmed.length >= 8 && isAlphanumericSymbol && hasDigit && hasLetter) {
    return true;
  }
  if (/^\d{6,}$/.test(trimmed)) return true;
  return false;
}

/** Remove sensitive credential fields from user/profile objects. */
export function stripSensitiveUserFields<T extends Record<string, unknown>>(
  data: T,
): T {
  const clean = { ...data } as T & Record<string, unknown>;
  for (const key of Object.keys(clean)) {
    if (PASSWORD_FIELD_PATTERN.test(key) || key === '_credentialValues') {
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

function isBlockedSubjectCandidate(
  value: string,
  credentialValues: Set<string>,
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (credentialValues.has(trimmed)) return true;
  return looksLikeStoredCredential(trimmed);
}

/** Build a safe teacher context that keeps credential fingerprints for redaction only. */
export function buildTeacherRedactionContext(
  raw: TeacherSubjectSource | null | undefined,
): TeacherSubjectSource | null {
  if (!raw) return null;

  const credentialValues = collectPasswordValues(raw);
  const stripped = stripSensitiveUserFields(
    raw as Record<string, unknown>,
  ) as TeacherSubjectSource;

  return {
    ...stripped,
    subject: getTeacherSubjectDisplay({ ...raw, _credentialValues: credentialValues }),
    _credentialValues: credentialValues,
  };
}

/** Safe teacher subject label — never returns password or password-like stored values. */
export function getTeacherSubjectDisplay(
  user: TeacherSubjectSource | null | undefined,
): string {
  if (!user) return '';

  const credentialValues =
    user._credentialValues ?? collectPasswordValues(user);

  const candidates = [
    user.subject,
    user.subjectName,
    user.specialization,
    user.assignedSubject,
    ...(Array.isArray(user.subjects) ? user.subjects : []),
  ];

  for (const candidate of candidates) {
    const val = typeof candidate === 'string' ? candidate.trim() : '';
    if (!val || isBlockedSubjectCandidate(val, credentialValues)) continue;
    return val;
  }

  return '';
}

/** True when a display value must not be shown (matches stored credentials or looks like one). */
export function isRedactedCredentialValue(
  value: string,
  context?: TeacherSubjectSource | null,
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (context) {
    const credentialValues =
      context._credentialValues ?? collectPasswordValues(context);
    if (credentialValues.has(trimmed)) return true;
  }

  return looksLikeStoredCredential(trimmed);
}

/** Strip sensitive fields and normalize subject for staff/teacher list records. */
export function sanitizeStaffRecord<T extends Record<string, unknown>>(
  record: T,
): T {
  const ctx = buildTeacherRedactionContext(record as TeacherSubjectSource);
  if (!ctx) return record;
  const { _credentialValues, ...safe } = ctx;
  return safe as T;
}

/** Payload safe for Firestore user documents (no plaintext passwords). */
export function sanitizeUserWritePayload(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const ctx = buildTeacherRedactionContext(data as TeacherSubjectSource);
  if (!ctx) return stripSensitiveUserFields(data);
  const { _credentialValues, ...safe } = ctx;
  return safe as Record<string, unknown>;
}

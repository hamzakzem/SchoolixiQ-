/** Normalize Firestore Timestamp, ISO string, or epoch to Date. */
export function toJsDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatArIqDate(value: unknown): string {
  const d = toJsDate(value);
  if (!d) return '';
  return d.toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

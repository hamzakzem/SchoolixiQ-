/** Single source of truth for student profile photos on ID cards and previews. */
export function resolveStudentPhotoUrl(
  student?: { photoUrl?: string } | null,
  cardData?: { photoUrl?: string } | null,
): string {
  const fromStudent = (student?.photoUrl || '').trim();
  if (fromStudent) return fromStudent;
  return (cardData?.photoUrl || '').trim();
}

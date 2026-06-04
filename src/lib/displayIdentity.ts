/** Public-facing identity — never show raw Google/Firebase email in UI by default. */

export function getSchoolixPublicId(uid?: string | null): string {
  if (!uid) return 'SQ---------';
  const short = uid.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `SQ-${short}`;
}

/** Masked email for rare cases (e.g. admin hint). */
export function maskEmailForDisplay(email?: string | null): string {
  if (!email || !email.includes('@')) return '—';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '—';
  const head = local[0] ?? '';
  const tail = local.length > 1 ? local.slice(-1) : '';
  const dots = '•'.repeat(Math.min(6, Math.max(2, local.length - 2)));
  return `${head}${dots}${tail}@${domain}`;
}

export function getLinkedAccountLabel(
  profile: { name?: string; uid?: string } | null | undefined,
  isRtl: boolean,
): string {
  const name =
    profile?.name?.trim() ||
    (isRtl ? 'حساب SchoolixiQ' : 'SchoolixiQ account');
  return `${name} · ${getSchoolixPublicId(profile?.uid)}`;
}

export function emailVerificationHint(isRtl: boolean): string {
  return isRtl
    ? 'يرجى تفعيل البريد المرتبط بحسابك (راجع صندوق الوارد أو Spam).'
    : 'Please verify the email linked to your account (check inbox or spam).';
}

export function schoolixAccountIdLabel(isRtl: boolean): string {
  return isRtl ? 'معرف SchoolixiQ:' : 'SchoolixiQ ID:';
}

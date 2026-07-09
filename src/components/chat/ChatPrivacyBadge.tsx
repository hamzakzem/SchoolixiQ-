import React from 'react';

const PRIVACY_LABELS: Record<
  string,
  { ar: string; en: string; icon: string }
> = {
  superadmin_private: { ar: 'محادثة خاصة', en: 'Private chat', icon: '🔒' },
  platform_assistant_private: { ar: 'محادثة خاصة', en: 'Private chat', icon: '🔒' },
  platform_operations: { ar: 'دعم المنصة', en: 'Platform ops', icon: '🏛️' },
  school_private: { ar: 'دعم المدرسة', en: 'School support', icon: '🏫' },
};

export function ChatPrivacyBadge({
  visibility,
  isRtl,
  className = '',
}: {
  visibility?: string;
  isRtl: boolean;
  className?: string;
}) {
  if (!visibility) return null;
  const key = String(visibility).toLowerCase();
  const label = PRIVACY_LABELS[key];
  if (!label) return null;
  return (
    <span className={`sx-enterprise-privacy-badge ${className}`.trim()} title={isRtl ? label.ar : label.en}>
      <span aria-hidden>{label.icon}</span>
      <span>{isRtl ? label.ar : label.en}</span>
    </span>
  );
}

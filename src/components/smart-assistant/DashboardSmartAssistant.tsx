import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { type SmartAssistantScope } from '../../lib/smartAssistantEngine';
import {
  subscribeAssistantSettings,
  type AssistantUiSettings,
  DEFAULT_ASSISTANT_SETTINGS,
} from '../../lib/smartAssistantStore';
import { SmartAssistantWidget } from './SmartAssistantWidget';

function scopeForRole(role?: string | null): SmartAssistantScope | null {
  const r = String(role || '').toLowerCase();
  if (r === 'superadmin' || r === 'super_admin') return 'superadmin';
  if (r === 'platform_assistant') return 'platform_assistant';
  if (r === 'admin' || r === 'school_admin') return 'school_admin';
  if (r === 'teacher') return 'teacher';
  if (r === 'parent') return 'parent';
  if (r === 'guard') return 'guard';
  if (r === 'distributor') return 'distributor';
  return null;
}

function visibilityAllows(settings: AssistantUiSettings, role?: string | null): boolean {
  const v = settings.visibility || 'public';
  if (v === 'public') return true;
  const r = String(role || '').toLowerCase();
  if (v === 'platform_only') {
    return r === 'superadmin' || r === 'super_admin' || r === 'platform_assistant';
  }
  return ['admin', 'school_admin', 'teacher', 'parent', 'guard', 'distributor'].includes(r);
}

export function SmartAssistantNavButton({
  isRtl,
  onClick,
  className,
  label,
}: {
  isRtl: boolean;
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  const text = label || (isRtl ? 'المساعد' : 'Assistant');
  return (
    <button
      type="button"
      onClick={onClick}
      className={className || 'sx-ds-assistant-btn'}
      aria-label={label || (isRtl ? 'مساعد SchoolixIQ' : 'SchoolixIQ Assistant')}
      title={text}
    >
      <span className="sx-ds-assistant-btn__glyph" aria-hidden>
        <Sparkles className="sx-ds-assistant-btn__icon" size={18} strokeWidth={1.75} />
      </span>
    </button>
  );
}

function useAssistantSettings() {
  const [settings, setSettings] = useState<AssistantUiSettings>(DEFAULT_ASSISTANT_SETTINGS);
  useEffect(() => subscribeAssistantSettings(setSettings), []);
  return settings;
}

/** Navbar-triggered rule-based assistant panel (no floating FAB on dashboards). */
export function DashboardSmartAssistant({
  hidden,
  open,
  onOpenChange,
}: {
  hidden?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const settings = useAssistantSettings();
  const scope = scopeForRole(profile?.role);

  if (hidden || !scope || !profile?.uid) return null;
  if (!visibilityAllows(settings, profile.role)) return null;

  return (
    <SmartAssistantWidget
      variant="panel"
      open={open}
      onOpenChange={onOpenChange}
      isRtl={isRtl}
      scope={scope}
      userId={profile.uid}
      userRole={String(profile.role || scope)}
      assistantName={isRtl ? settings.nameAr : settings.nameEn}
      introText={isRtl ? settings.introAr : settings.introEn}
      logoUrl={settings.logoUrl || undefined}
    />
  );
}

/** Self-contained host: nav button + panel. Use in custom dashboards without DashboardShell. */
export function DashboardSmartAssistantHost({
  hidden,
  isRtl: isRtlProp,
}: {
  hidden?: boolean;
  isRtl?: boolean;
}) {
  const { profile } = useAuth();
  const { isRtl: langRtl } = useLanguage();
  const isRtl = isRtlProp ?? langRtl;
  const [open, setOpen] = useState(false);
  const settings = useAssistantSettings();
  const scope = scopeForRole(profile?.role);

  if (hidden || !scope || !profile?.uid) return null;
  if (!visibilityAllows(settings, profile.role)) return null;

  return (
    <>
      <SmartAssistantNavButton
        isRtl={isRtl}
        onClick={() => setOpen(true)}
        label={isRtl ? settings.nameAr : settings.nameEn}
      />
      <SmartAssistantWidget
        variant="panel"
        open={open}
        onOpenChange={setOpen}
        isRtl={isRtl}
        scope={scope}
        userId={profile.uid}
        userRole={String(profile.role || scope)}
        assistantName={isRtl ? settings.nameAr : settings.nameEn}
        introText={isRtl ? settings.introAr : settings.introEn}
        logoUrl={settings.logoUrl || undefined}
      />
    </>
  );
}

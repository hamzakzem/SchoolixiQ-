import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { type SmartAssistantScope } from '../../lib/smartAssistantEngine';
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

/** Floating rule-based helper on authenticated dashboards (hidden on chat full-screen tabs). */
export function DashboardSmartAssistant({ hidden }: { hidden?: boolean }) {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const scope = scopeForRole(profile?.role);

  if (hidden || !scope || !profile?.uid) return null;

  return (
    <SmartAssistantWidget
      isRtl={isRtl}
      scope={scope}
      userId={profile.uid}
      userRole={String(profile.role || scope)}
    />
  );
}

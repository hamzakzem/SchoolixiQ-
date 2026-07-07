import React, { useEffect } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/LanguageContext';
import { signOutWithCleanup } from '../lib/authLogout';
import {
  ASSISTANT_SCHOOL_LINKING_AR,
  ASSISTANT_SCHOOL_LINK_ERROR_AR,
  ASSISTANT_SCHOOL_NOT_FOUND_AR,
  ASSISTANT_SCHOOL_PERMISSION_AR,
  ASSISTANT_SCHOOL_TIMEOUT_AR,
  isAssistantRole,
  resolveProfileSchoolId,
} from '../lib/schoolId';
import { PageLoadingSkeleton } from './ui/Skeleton';
import { UserRole } from '../types';

type GateShellProps = {
  isRtl: boolean;
  title: string;
  message: string;
  tone?: 'neutral' | 'warning' | 'danger';
  showLogout?: boolean;
};

function GateShell({
  isRtl,
  title,
  message,
  tone = 'neutral',
  showLogout = true,
}: GateShellProps) {
  const borderClass =
    tone === 'danger'
      ? 'border-red-100 dark:border-red-950/30'
      : tone === 'warning'
        ? 'border-amber-100 dark:border-amber-950/30'
        : 'border-slate-200 dark:border-slate-800';

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className={`max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 text-center shadow-2xl border ${borderClass}`}
      >
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{title}</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8">
          {message}
        </p>
        {showLogout ? (
          <button
            type="button"
            onClick={() => signOutWithCleanup()}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={20} />
            {isRtl ? 'تسجيل الخروج' : 'Logout'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

type AssistantSchoolGateProps = {
  children: React.ReactNode;
};

/** Blocks AdminDashboard until assistant school context is fully resolved. */
export function AssistantSchoolGate({ children }: AssistantSchoolGateProps) {
  const {
    profile,
    schoolData,
    profileLoaded,
    schoolContextLoading,
    schoolContextLoaded,
    schoolContextStatus,
    offlineStale,
  } = useAuth();
  const { isRtl } = useLanguage();

  const isAssistant =
    profile?.role === UserRole.ASSISTANT || isAssistantRole(profile?.role);

  if (!isAssistant) {
    return <>{children}</>;
  }

  const profileSchoolId = resolveProfileSchoolId(profile as Record<string, unknown> | null | undefined)
    ?? (profile?.schoolId ? String(profile.schoolId).trim() : null);

  useEffect(() => {
    if (!import.meta.env.DEV || !isAssistant) return;
    let stuckReason = 'none';
    if (!profileLoaded) stuckReason = 'profile_not_loaded';
    else if (!schoolContextLoaded) stuckReason = 'school_context_not_loaded';
    else if (schoolContextLoading || schoolContextStatus === 'loading') {
      stuckReason = 'school_context_loading';
    } else if (!profileSchoolId || schoolContextStatus === 'unlinked') {
      stuckReason = 'missing_schoolId_on_users_doc';
    } else if (schoolContextStatus === 'ready' && !schoolData && !offlineStale) {
      stuckReason = 'ready_but_no_schoolData';
    }
    console.info('[AssistantSchoolGate] state', {
      uid: profile?.uid,
      email: profile?.email,
      role: profile?.role,
      schoolId: profileSchoolId,
      profileLoaded,
      schoolContextLoaded,
      schoolContextLoading,
      schoolContextStatus,
      hasSchoolData: Boolean(schoolData),
      offlineStale,
      stuckReason,
    });
  }, [
    isAssistant,
    profile?.uid,
    profile?.email,
    profile?.role,
    profileSchoolId,
    profileLoaded,
    schoolContextLoaded,
    schoolContextLoading,
    schoolContextStatus,
    schoolData,
    offlineStale,
  ]);

  const isLoading =
    !profileLoaded ||
    !schoolContextLoaded ||
    schoolContextLoading ||
    schoolContextStatus === 'loading' ||
    schoolContextStatus === 'idle';

  if (isLoading) {
    return <PageLoadingSkeleton />;
  }

  if (profile?.schoolId && !profileSchoolId) {
    return (
      <GateShell
        isRtl={isRtl}
        title={isRtl ? 'ربط المساعد بالمدرسة' : 'Assistant School Link'}
        message={ASSISTANT_SCHOOL_LINK_ERROR_AR}
        tone="danger"
      />
    );
  }

  if (!profileSchoolId || schoolContextStatus === 'unlinked') {
    return (
      <div
        className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 text-center shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-[#0B2345]/10 dark:bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCw className="text-[#D4AF37] animate-spin" size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
            {isRtl ? ASSISTANT_SCHOOL_LINKING_AR : 'Linking your school account...'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-8">
            {isRtl
              ? 'يتم ربط حساب المساعد بالمدرسة. إذا استمرت هذه الشاشة، يرجى مراجعة إدارة المدرسة.'
              : 'Your assistant account is being linked to a school. If this persists, contact your school admin.'}
          </p>
          <button
            type="button"
            onClick={() => signOutWithCleanup()}
            className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={20} />
            {isRtl ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>
    );
  }

  if (schoolContextStatus === 'timeout') {
    return (
      <GateShell
        isRtl={isRtl}
        title={isRtl ? 'انتهت مهلة التحميل' : 'Loading Timed Out'}
        message={ASSISTANT_SCHOOL_TIMEOUT_AR}
        tone="warning"
      />
    );
  }

  if (schoolContextStatus === 'not_found') {
    return (
      <GateShell
        isRtl={isRtl}
        title={isRtl ? ASSISTANT_SCHOOL_NOT_FOUND_AR : 'School Not Found'}
        message={
          isRtl
            ? ASSISTANT_SCHOOL_NOT_FOUND_AR
            : 'The school linked to this account could not be found in the system.'
        }
        tone="warning"
      />
    );
  }

  if (schoolContextStatus === 'permission_denied') {
    return (
      <GateShell
        isRtl={isRtl}
        title={isRtl ? ASSISTANT_SCHOOL_PERMISSION_AR : 'Access Denied'}
        message={
          isRtl
            ? ASSISTANT_SCHOOL_PERMISSION_AR
            : 'You do not have permission to access this school.'
        }
        tone="danger"
      />
    );
  }

  if (schoolContextStatus === 'ready' && (schoolData || offlineStale)) {
    return <>{children}</>;
  }

  return (
    <GateShell
      isRtl={isRtl}
      title={isRtl ? 'بيانات المدرسة غير متوفرة' : 'School Profile Unreachable'}
      message={
        isRtl
          ? 'تعذّر تحميل بيانات المدرسة. يرجى المحاولة لاحقاً أو مراجعة الإدارة.'
          : 'School data could not be loaded. Please try again later or contact your admin.'
      }
      tone="warning"
      showLogout
    />
  );
}

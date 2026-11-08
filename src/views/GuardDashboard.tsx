import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { signOutWithCleanup } from '../lib/authLogout';
import { ShieldCheck, LogOut, Search, CheckCircle, XCircle, Bell, User, KeyRound, WifiOff, RefreshCw } from 'lucide-react';
import { NotificationCenter } from '../components/NotificationCenter';
import { useNotificationBadges } from '../lib/NotificationBadgeContext';
import { useNotificationRouteRedirect } from '../lib/useNotificationRouteRedirect';
import { toast } from 'react-hot-toast';
import {
  subscribeSchoolDismissals,
  guardVerifyDismissal,
  guardRejectDismissal,
  filterPendingForGuard,
  groupDismissalsByClass,
} from '../lib/dismissalService';
import { type DismissalRequest } from '../lib/dismissalTypes';
import SchoolixLogo from '../components/SchoolixLogo';
import { DismissalWorkflowListShell } from '../components/dismissal/DismissalWorkflow';
import { DismissalActionHighlight } from '../components/dismissal/DismissalActionHighlight';
import { DismissalStepper, DismissalTimelineToggle } from '../components/dismissal/DismissalStepper';
import { DismissalTimeline } from '../components/dismissal/DismissalTimeline';
import { isPackageFeatureEnabled } from '../lib/featureRegistry';
import { motion } from 'motion/react';
import { pageTransitionProps } from '../lib/motion';
import { DashboardSmartAssistantHost } from '../components/smart-assistant/DashboardSmartAssistant';
import '../styles/dismissal-workflow.css';
import { userFacingError } from '../lib/userFacingError';

export default function GuardDashboard() {
  const { profile, schoolData } = useAuth();
  const smartGateEnabled = isPackageFeatureEnabled(
    'dismissal_smart_gate',
    schoolData?.packagePermissions,
  );
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [search, setSearch] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busy = busyId !== null;
  const [showNotifications, setShowNotifications] = useState(false);
  const { totalUnread } = useNotificationBadges();
  useNotificationRouteRedirect('guard', () => {});

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (!profile?.schoolId || !smartGateEnabled) return;
    setLoadError(false);
    return subscribeSchoolDismissals(
      profile.schoolId,
      (rows) => {
        setRequests(rows);
        setLoaded(true);
        setLoadError(false);
      },
      () => {
        setLoadError(true);
        setLoaded(true);
      },
    );
  }, [profile?.schoolId, smartGateEnabled, reloadNonce]);

  const pendingRequests = useMemo(() => filterPendingForGuard(requests), [requests]);

  const normCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const code = normCode(codeInput);
  const codeMatches = useMemo(
    () => (code.length >= 3 ? pendingRequests.filter((r) => normCode(String(r.token || '')).includes(code)) : []),
    [pendingRequests, code],
  );
  const todayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return requests.filter((r) => {
      const c = r.createdAt as unknown as { toMillis?: () => number; seconds?: number } | number | undefined;
      const ms = typeof c === 'number' ? c : c?.toMillis ? c.toMillis() : c?.seconds ? c.seconds * 1000 : 0;
      return ms >= start.getTime();
    }).length;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (code.length >= 3) return codeMatches;
    if (!q) return pendingRequests;
    return pendingRequests.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.parentName.toLowerCase().includes(q) ||
        r.registrationNumber?.toLowerCase().includes(q),
    );
  }, [pendingRequests, search, code, codeMatches]);

  const groupedByClass = useMemo(() => groupDismissalsByClass(filtered), [filtered]);

  const handleVerify = async (requestId: string) => {
    if (!profile || busy) return;
    if (!online) {
      toast.error('لا يوجد اتصال بالإنترنت — لا يمكن تنفيذ الإجراء الآن');
      return;
    }
    setBusyId(requestId);
    try {
      await guardVerifyDismissal(
        requestId,
        { uid: profile.uid, name: profile.name || 'حارس' },
        undefined,
        code.length >= 3 ? codeInput : undefined,
      );
      toast.success('تم التحقق — أُرسل للإدارة');
      setExpandedId(null);
      setConfirmId(null);
      setCodeInput('');
    } catch (e: unknown) {
      toast.error(userFacingError(e, 'فشل التحقق'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!profile || busy) return;
    if (!rejectReason.trim()) {
      toast.error('أدخل سبب الرفض');
      return;
    }
    if (!online) {
      toast.error('لا يوجد اتصال بالإنترنت — لا يمكن تنفيذ الإجراء الآن');
      return;
    }
    setBusyId(requestId);
    try {
      await guardRejectDismissal(requestId, rejectReason.trim(), {
        uid: profile.uid,
        name: profile.name || 'حارس',
      });
      toast.success('تم رفض الطلب');
      setExpandedId(null);
      setRejectReason('');
    } catch (e: unknown) {
      toast.error(userFacingError(e, 'فشل الرفض'));
    } finally {
      setBusyId(null);
    }
  };

  if (!smartGateEnabled) {
    return (
      <div className="dw-root min-h-screen flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <ShieldCheck className="text-[var(--dw-slate-muted)] mb-4" size={56} />
        <h1 className="dw-header__title mb-2">البوابة الذكية غير متاحة</h1>
        <button type="button" onClick={() => signOutWithCleanup()} className="dw-btn dw-btn--ghost mt-4">
          تسجيل الخروج
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06182f]" dir="rtl">
      <header className="sx-ds-topbar sx-ds-topbar--flex px-5 md:px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="sx-ds-topbar__logo">
            <SchoolixLogo size={26} surface="light" />
          </div>
          <div className="sx-ds-topbar__title-block min-w-0">
            {schoolData?.name ? <p className="sx-ds-topbar__eyebrow">{schoolData.name}</p> : null}
            <h1 className="sx-ds-topbar__title truncate">بوابة الحارس</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DashboardSmartAssistantHost isRtl />
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="sx-ds-icon-btn relative"
            aria-label="الإشعارات"
          >
            <Bell size={18} strokeWidth={1.75} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => signOutWithCleanup()}
            className="sx-ds-icon-btn"
            aria-label="تسجيل الخروج"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} userRole="guard" />
      )}

      <motion.main className="max-w-4xl mx-auto p-4 md:p-6" {...pageTransitionProps()}>
        <DismissalWorkflowListShell
          locale="ar"
          title="تحقق التسريح"
          subtitle="الطلبات الجديدة فقط — طابق بيانات الطالب وولي الأمر ثم قرّر"
          stats={[
            { label: 'بانتظارك', value: filtered.length },
            { label: 'صفوف', value: Object.keys(groupedByClass).length },
            { label: 'طلبات اليوم', value: todayCount },
          ]}
          headerExtra={
            <span className="dw-badge dw-badge--pending">بانتظار التحقق</span>
          }
        >
          {!online && (
            <div className="col-span-full dw-glass-card dw-glass-card--no-lift flex items-center gap-2 text-sm text-amber-300" role="alert">
              <WifiOff size={16} aria-hidden /> لا يوجد اتصال بالإنترنت — الإجراءات متوقفة حتى عودة الاتصال
            </div>
          )}
          {loadError && (
            <div className="col-span-full dw-glass-card dw-glass-card--no-lift flex items-center justify-between gap-3 text-sm text-red-300" role="alert">
              <span>تعذّر تحميل الطلبات.</span>
              <button type="button" className="dw-btn dw-btn--ghost" onClick={() => { setLoaded(false); setReloadNonce((n) => n + 1); }}>
                <RefreshCw size={14} /> إعادة المحاولة
              </button>
            </div>
          )}
          <div className="col-span-full mb-2 relative">
            <KeyRound
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dw-gold-400)] pointer-events-none z-10"
              size={16}
              aria-hidden
            />
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="رمز ولي الأمر (مثال: AB12-CD34)"
              className="dw-input font-mono"
              style={{ paddingInlineStart: '2.5rem' }}
              dir="ltr"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="رمز ولي الأمر"
            />
            {code.length >= 3 && (
              <p className={`text-xs mt-1 ${codeMatches.length ? 'text-emerald-300' : 'text-red-300'}`}>
                {codeMatches.length ? `تطابق ${codeMatches.length} طلب` : 'لا يوجد طلب بهذا الرمز'}
              </p>
            )}
          </div>
          <div className="col-span-full mb-2 relative">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dw-slate-muted)] pointer-events-none z-10"
              size={16}
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الصف أو ولي الأمر..."
              className="dw-input"
              style={{ paddingInlineStart: '2.5rem' }}
              aria-label="بحث في الطلبات"
            />
          </div>

          {Object.entries(groupedByClass).map(([classKey, classRequests]) => (
            <div key={classKey} className="col-span-full space-y-3">
              <p className="dw-zone-label mb-0">{classRequests[0]?.className || classKey}</p>
              {classRequests.map((r) => {
                const expanded = expandedId === r.id;
                return (
                  <article
                    key={r.id}
                    className="dw-glass-card dw-glass-card--no-lift"
                    aria-labelledby={`guard-card-${r.id}`}
                  >
                    <DismissalActionHighlight request={r} locale="ar" viewerRole="guard" />

                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3 mt-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-black/30 border border-[var(--dw-glass-border)] flex items-center justify-center overflow-hidden shrink-0">
                          {r.photoUrl ? (
                            <img src={r.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-[var(--dw-gold-400)]" />
                          )}
                        </div>
                        <div>
                          <h3 id={`guard-card-${r.id}`} className="font-bold text-white">
                            {r.studentName}
                          </h3>
                          <p className="text-xs text-[var(--dw-slate-muted)]">{r.className}</p>
                        </div>
                      </div>
                      <span className="dw-badge dw-badge--pending">بانتظار التحقق</span>
                    </div>

                    <DismissalStepper request={r} locale="ar" mode="compact" />

                    <div className="mt-4 space-y-2 text-sm">
                      <p className="flex items-center gap-2 text-[var(--dw-slate-muted)]">
                        <User size={14} aria-hidden />
                        <span className="text-white font-semibold">{r.parentName}</span>
                        <span>— {r.pickupPersonName || r.requestedByName}</span>
                      </p>
                      {r.pickupNote && (
                        <p className="text-xs text-[var(--dw-slate-muted)]">{r.pickupNote}</p>
                      )}
                      <p className="flex items-center gap-2 text-xs text-[var(--dw-gold-400)] font-mono">
                        <KeyRound size={12} aria-hidden />
                        رمز: {r.token}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !online}
                        onClick={() => (confirmId === r.id ? handleVerify(r.id) : (setConfirmId(r.id), setExpandedId(null)))}
                        className="dw-btn dw-btn--success"
                        aria-label={`مطابقة بيانات ${r.studentName}`}
                      >
                        <CheckCircle size={16} />
                        {busyId === r.id ? 'جارٍ الإرسال…' : confirmId === r.id ? 'تأكيد وإرسال للإدارة' : 'مطابقة البيانات'}
                      </button>
                      {confirmId === r.id && !busy && (
                        <button type="button" className="dw-btn dw-btn--ghost" onClick={() => setConfirmId(null)}>
                          تراجع
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => { setConfirmId(null); setExpandedId(expanded ? null : r.id); }}
                        className="dw-btn dw-btn--danger"
                      >
                        <XCircle size={16} />
                        رفض
                      </button>
                    </div>

                    {expanded && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                        <input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="سبب الرفض"
                          className="dw-input"
                          aria-label="سبب الرفض"
                        />
                        <button
                          type="button"
                          disabled={busy || !online}
                          onClick={() => handleReject(r.id)}
                          className="dw-btn dw-btn--danger w-full"
                        >
                          تأكيد الرفض
                        </button>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-white/10">
                      <DismissalTimelineToggle request={r} locale="ar" defaultOpen={false}>
                        <DismissalTimeline request={r} locale="ar" variant="enterprise" />
                      </DismissalTimelineToggle>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}

          {!loaded && !loadError && (
            <div className="col-span-full dw-empty dw-glass-card" aria-busy="true">جارٍ تحميل الطلبات…</div>
          )}
          {loaded && !loadError && filtered.length === 0 && (
            <div className="col-span-full dw-empty dw-glass-card">
              {code.length >= 3 || search.trim()
                ? 'لا توجد نتائج مطابقة'
                : 'لا توجد طلبات بانتظار المراجعة — أنت محدّث ✓'}
            </div>
          )}
        </DismissalWorkflowListShell>
      </motion.main>
    </div>
  );
}

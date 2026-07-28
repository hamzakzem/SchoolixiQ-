import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { signOutWithCleanup } from '../lib/authLogout';
import { ShieldCheck, LogOut, Search, CheckCircle, XCircle, Bell, Phone, User } from 'lucide-react';
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

export default function GuardDashboard() {
  const { profile, schoolData } = useAuth();
  const smartGateEnabled = isPackageFeatureEnabled(
    'dismissal_smart_gate',
    schoolData?.packagePermissions,
  );
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [search, setSearch] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { totalUnread } = useNotificationBadges();
  useNotificationRouteRedirect('guard', () => {});

  useEffect(() => {
    if (!profile?.schoolId || !smartGateEnabled) return;
    return subscribeSchoolDismissals(profile.schoolId, setRequests);
  }, [profile?.schoolId, smartGateEnabled]);

  const pendingRequests = useMemo(() => filterPendingForGuard(requests), [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingRequests;
    return pendingRequests.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.parentName.toLowerCase().includes(q) ||
        r.registrationNumber?.toLowerCase().includes(q),
    );
  }, [pendingRequests, search]);

  const groupedByClass = useMemo(() => groupDismissalsByClass(filtered), [filtered]);

  const handleVerify = async (requestId: string) => {
    if (!profile) return;
    setBusy(true);
    try {
      await guardVerifyDismissal(requestId, {
        uid: profile.uid,
        name: profile.name || 'حارس',
      });
      toast.success('تم التحقق — أُرسل للإدارة');
      setExpandedId(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'فشل التحقق');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!profile || !rejectReason.trim()) {
      toast.error('أدخل سبب الرفض');
      return;
    }
    setBusy(true);
    try {
      await guardRejectDismissal(requestId, rejectReason.trim(), {
        uid: profile.uid,
        name: profile.name || 'حارس',
      });
      toast.success('تم رفض الطلب');
      setExpandedId(null);
      setRejectReason('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'فشل الرفض');
    } finally {
      setBusy(false);
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
      <header className="bg-[#06182f] border-b border-[rgba(201,162,39,0.2)] px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <SchoolixLogo size={32} surface="dark" />
          <div>
            <h1 className="font-bold text-white text-lg">بوابة التسريح — الحارس</h1>
            <p className="text-xs text-[var(--dw-slate-muted)]">{schoolData?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DashboardSmartAssistantHost isRtl />
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-xl bg-white/10 hover:bg-white/15"
            aria-label="الإشعارات"
          >
            <Bell size={18} className="text-white" />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => signOutWithCleanup()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/15"
            aria-label="تسجيل الخروج"
          >
            <LogOut size={18} className="text-white" />
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
          subtitle="طلبات REQUESTED فقط — طابق البيانات ثم قرّر"
          stats={[
            { label: 'بانتظارك', value: filtered.length },
            { label: 'صفوف', value: Object.keys(groupedByClass).length },
            { label: 'إجمالي اليوم', value: requests.length },
          ]}
          headerExtra={
            <span className="dw-badge dw-badge--pending">Pending Verification</span>
          }
        >
          <div className="col-span-full mb-2 relative">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dw-slate-muted)]"
              size={16}
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الصف..."
              className="dw-input pr-10"
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
                        <Phone size={12} aria-hidden />
                        رمز: {r.token}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleVerify(r.id)}
                        className="dw-btn dw-btn--success"
                        aria-label={`مطابقة بيانات ${r.studentName}`}
                      >
                        <CheckCircle size={16} />
                        مطابقة البيانات
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setExpandedId(expanded ? null : r.id)}
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
                          disabled={busy}
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

          {filtered.length === 0 && (
            <div className="col-span-full dw-empty dw-glass-card">
              لا توجد طلبات بانتظار المراجعة — أنت محدّث ✓
            </div>
          )}
        </DismissalWorkflowListShell>
      </motion.main>
    </div>
  );
}

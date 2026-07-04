import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { signOutWithCleanup } from '../lib/authLogout';
import {
  ShieldCheck,
  LogOut,
  Search,
  CheckCircle,
  XCircle,
  Bell,
  User,
} from 'lucide-react';
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
import { resolveDismissalStatus } from '../lib/dismissalTypes';
import SchoolixLogo from '../components/SchoolixLogo';
import DismissalStudentCard from '../components/dismissal/DismissalStudentCard';
import { DismissalWorkflowGraph } from '../components/dismissal/DismissalWorkflowGraph';
import { DismissalStatusBadge } from '../components/ui/DismissalStatusBadge';
import { isPackageFeatureEnabled } from '../lib/featureRegistry';
import { motion } from 'motion/react';
import { pageTransitionProps } from '../lib/motion';

export default function GuardDashboard() {
  const { profile, schoolData } = useAuth();
  const smartGateEnabled = isPackageFeatureEnabled(
    'dismissal_smart_gate',
    schoolData?.packagePermissions,
  );
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [search, setSearch] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      toast.success('تم التحقق — أُرسل للإدارة للاعتماد النهائي');
      setSelectedId(null);
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
      setSelectedId(null);
      setRejectReason('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'فشل الرفض');
    } finally {
      setBusy(false);
    }
  };

  if (!smartGateEnabled) {
    return (
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center"
        dir="rtl"
      >
        <ShieldCheck className="text-slate-300 mb-4" size={56} />
        <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">
          البوابة الذكية غير متاحة
        </h1>
        <button
          onClick={() => signOutWithCleanup()}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm"
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SchoolixLogo size={32} surface="dark" />
          <div>
            <h1 className="font-black text-lg">بوابة التسريح — الحارس</h1>
            <p className="text-xs text-slate-300">{schoolData?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            <Bell size={18} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-black flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => signOutWithCleanup()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} userRole="guard" />
      )}

      <motion.main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6" {...pageTransitionProps()}>
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <ShieldCheck size={18} />
            طلبات بانتظار المراجعة ({filtered.length})
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            طابق بيانات ولي الأمر والطالب ثم اعتمد أو ارفض
          </p>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الصف..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 text-sm font-bold"
            />
          </div>

          <div className="space-y-6">
            {Object.entries(groupedByClass).map(([classKey, classRequests]) => (
              <div key={classKey}>
                <h3 className="text-xs font-black text-slate-400 mb-2">
                  {classRequests[0]?.className || classKey}
                </h3>
                <div className="space-y-3">
                  {classRequests.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80 dark:bg-slate-800/50"
                    >
                      <DismissalStudentCard request={r} compact />
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                        <p className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <span className="font-bold">{r.parentName}</span>
                          <span className="text-slate-500">— {r.pickupPersonName || r.requestedByName}</span>
                        </p>
                        <DismissalWorkflowGraph request={r} locale="ar" showLegend={false} />
                        <DismissalStatusBadge status={resolveDismissalStatus(r)} size="md" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleVerify(r.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          <CheckCircle size={16} />
                          تحقق وإرسال للإدارة
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold text-sm"
                        >
                          <XCircle size={16} />
                          رفض
                        </button>
                      </div>
                      {selectedId === r.id && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="سبب الرفض"
                            className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleReject(r.id)}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm"
                          >
                            تأكيد الرفض
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm font-bold">
                لا توجد طلبات بانتظار المراجعة
              </p>
            )}
          </div>
        </section>
      </motion.main>
    </div>
  );
}

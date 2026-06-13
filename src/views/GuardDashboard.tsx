import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  ShieldCheck,
  LogOut,
  Search,
  CheckCircle,
  XCircle,
  KeyRound,
  Clock,
  Bell,
} from 'lucide-react';
import { NotificationCenter } from '../components/NotificationCenter';
import { useNotificationBadges } from '../lib/NotificationBadgeContext';
import { toast } from 'react-hot-toast';
import {
  subscribeSchoolDismissals,
  verifyDismissalToken,
  verifyDismissalHandover,
  guardCompleteDismissal,
  guardCancelDismissal,
  groupDismissalsByClass,
} from '../lib/dismissalService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  type DismissalRequest,
} from '../lib/dismissalTypes';
import SchoolixLogo from '../components/SchoolixLogo';
import DismissalStudentCard from '../components/dismissal/DismissalStudentCard';
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

  if (!smartGateEnabled) {
    return (
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center"
        dir="rtl"
      >
        <ShieldCheck className="text-slate-300 mb-4" size={56} />
        <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">
          البوابة الذكية / التسريح الآمن غير متاحة
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold max-w-md mb-6 leading-relaxed">
          ميزة التسريح الآمن غير مفعّلة في باقة مدرستكم. يرجى التواصل مع إدارة المدرسة.
        </p>
        <button
          onClick={() => signOut(auth)}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm"
        >
          تسجيل الخروج
        </button>
      </div>
    );
  }
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [search, setSearch] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [verified, setVerified] = useState<DismissalRequest | null>(null);
  const [confirmReady, setConfirmReady] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { totalUnread } = useNotificationBadges();

  useEffect(() => {
    if (!profile?.schoolId) return;
    return subscribeSchoolDismissals(profile.schoolId, setRequests);
  }, [profile?.schoolId]);

  const activeRequests = useMemo(
    () =>
      requests.filter((r) => ACTIVE_DISMISSAL_STATUSES.includes(r.status)),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeRequests;
    return activeRequests.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.registrationNumber?.toLowerCase().includes(q) ||
        r.token.toLowerCase().includes(q),
    );
  }, [activeRequests, search]);

  const groupedByClass = useMemo(() => groupDismissalsByClass(filtered), [filtered]);

  const classLabels = useMemo(() => {
    const map: Record<string, string> = {};
    filtered.forEach((r) => {
      map[r.classId || r.className] = r.className;
    });
    return map;
  }, [filtered]);

  const handleVerify = async () => {
    if (!profile?.schoolId || !tokenInput.trim()) return;
    setBusy(true);
    setConfirmReady(false);
    try {
      const req = await verifyDismissalToken(tokenInput, profile.schoolId);
      setVerified(req);
      toast.success('تم التحقق من الرمز وبيانات الطالب');
    } catch (e: any) {
      setVerified(null);
      toast.error(e.message || 'فشل التحقق');
    } finally {
      setBusy(false);
    }
  };

  const handlePrepareComplete = async () => {
    if (!profile?.schoolId || !verified) return;
    setBusy(true);
    try {
      await verifyDismissalHandover(verified, profile.schoolId, tokenInput);
      setConfirmReady(true);
      toast.success('تم التحقق — راجع البيانات ثم أكّد التسليم');
    } catch (e: any) {
      setConfirmReady(false);
      toast.error(e.message || 'فشل التحقق النهائي');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    if (!profile || !verified) return;
    setBusy(true);
    try {
      await guardCompleteDismissal(
        verified,
        { uid: profile.uid, name: profile.name || 'حارس' },
        tokenInput,
      );
      toast.success('تم تسليم الطالب');
      setVerified(null);
      setConfirmReady(false);
      setTokenInput('');
    } catch (e: any) {
      toast.error(e.message || 'فشل التسليم');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    if (!profile || !cancelReason.trim()) {
      toast.error('أدخل سبب الإلغاء');
      return;
    }
    setBusy(true);
    try {
      await guardCancelDismissal(requestId, cancelReason.trim(), {
        uid: profile.uid,
        name: profile.name || 'حارس',
      });
      toast.success('تم إلغاء الطلب');
      setVerified(null);
      setConfirmReady(false);
      setCancelReason('');
    } catch (e: any) {
      toast.error(e.message || 'فشل الإلغاء');
    } finally {
      setBusy(false);
    }
  };

  const pickupLabel = (r: DismissalRequest) =>
    r.pickupPersonName || r.requestedByName || r.parentName || '—';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SchoolixLogo size={32} surface="dark" />
          <div>
            <h1 className="font-black text-lg">بوابة التسريح الآمن</h1>
            <p className="text-xs text-slate-300">{schoolData?.name || profile?.schoolId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20"
            title="الإشعارات"
          >
            <Bell size={18} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-black flex items-center justify-center">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => signOut(auth)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
            title="تسجيل الخروج"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} userRole="guard" />
      )}

      <motion.main
        className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 sx-fade-in"
        {...pageTransitionProps()}
      >
        <section className="sx-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <KeyRound size={18} />
            التحقق من الرمز
          </h2>
          <div className="flex gap-2">
            <input
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value.toUpperCase());
                setConfirmReady(false);
              }}
              placeholder="أدخل رمز التسليم"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-mono font-bold uppercase"
            />
            <button
              onClick={handleVerify}
              disabled={busy}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              تحقق
            </button>
          </div>

          {verified && (
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-4">
              <DismissalStudentCard request={verified} />

              <div className="grid grid-cols-1 gap-2 text-sm bg-white rounded-xl p-4 border">
                <p><span className="font-bold text-slate-500">الطالب:</span> {verified.studentName}</p>
                <p><span className="font-bold text-slate-500">الصف:</span> {verified.className}</p>
                <p><span className="font-bold text-slate-500">ولي الأمر / المستلم:</span> {pickupLabel(verified)}</p>
                <p><span className="font-bold text-slate-500">رمز التحقق:</span> <span className="font-mono">{verified.token}</span></p>
                {verified.registrationNumber && (
                  <p><span className="font-bold text-slate-500">الرقم التسلسلي:</span> {verified.registrationNumber}</p>
                )}
                <DismissalStatusBadge status={verified.status} size="md" />
              </div>

              {!confirmReady ? (
                <button
                  onClick={handlePrepareComplete}
                  disabled={busy || !['called', 'ready'].includes(verified.status)}
                  className="sx-btn w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm"
                >
                  التحقق النهائي قبل التسليم
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={busy}
                  className="sx-btn w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm"
                >
                  <CheckCircle size={16} />
                  إتمام التسليم
                </button>
              )}

              <div className="pt-2 border-t border-indigo-100">
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="سبب الإلغاء (إن وجد)"
                  className="sx-input w-full px-3 py-2 rounded-lg border text-sm mb-2"
                />
                <button
                  onClick={() => handleCancel(verified.id)}
                  disabled={busy}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold text-sm"
                >
                  <XCircle size={16} />
                  إلغاء الطلب
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="sx-card bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={18} />
              الطلبات النشطة ({filtered.length})
            </h2>
          </div>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الصف أو الرقم..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 text-sm font-bold"
            />
          </div>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto">
            {Object.entries(groupedByClass).map(([classKey, classRequests]) => (
              <div key={classKey}>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 px-1">
                  {classLabels[classKey] || classKey} ({classRequests.length})
                </h3>
                <div className="space-y-2">
                  {classRequests.map((r) => (
                    <div
                      key={r.id}
                      className="sx-table-row p-4 rounded-2xl border border-slate-100 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                    >
                      <DismissalStudentCard request={r} compact />
                      <div className="text-left shrink-0">
                        <DismissalStatusBadge status={r.status} />
                        <p className="text-[10px] font-mono text-indigo-600 mt-1">{r.token}</p>
                        {r.createdAt?.seconds && (
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 justify-end">
                            <Clock size={10} />
                            {new Date(r.createdAt.seconds * 1000).toLocaleTimeString('ar-IQ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm font-bold sx-fade-in">
                لا توجد طلبات نشطة حالياً
              </p>
            )}
          </div>
        </section>
      </motion.main>
    </div>
  );
}

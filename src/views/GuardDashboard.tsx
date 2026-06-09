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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  subscribeSchoolDismissals,
  verifyDismissalToken,
  guardCompleteDismissal,
  guardCancelDismissal,
} from '../lib/dismissalService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  DISMISSAL_STATUS_LABELS,
  type DismissalRequest,
} from '../lib/dismissalTypes';
import SchoolixLogo from '../components/SchoolixLogo';

export default function GuardDashboard() {
  const { profile, schoolData } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [search, setSearch] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [verified, setVerified] = useState<DismissalRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

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
        r.token.toLowerCase().includes(q),
    );
  }, [activeRequests, search]);

  const handleVerify = async () => {
    if (!profile?.schoolId || !tokenInput.trim()) return;
    setBusy(true);
    try {
      const req = await verifyDismissalToken(tokenInput, profile.schoolId);
      setVerified(req);
      toast.success('تم التحقق من الرمز');
    } catch (e: any) {
      setVerified(null);
      toast.error(e.message || 'فشل التحقق');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (request: DismissalRequest) => {
    if (!profile) return;
    setBusy(true);
    try {
      await guardCompleteDismissal(request, {
        uid: profile.uid,
        name: profile.name || 'حارس',
      });
      toast.success('تم تسليم الطالب');
      setVerified(null);
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
      setCancelReason('');
    } catch (e: any) {
      toast.error(e.message || 'فشل الإلغاء');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      <header className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SchoolixLogo className="h-8 w-auto brightness-0 invert" />
          <div>
            <h1 className="font-black text-lg">بوابة التسريح الآمن</h1>
            <p className="text-xs text-slate-300">{schoolData?.name || profile?.schoolId}</p>
          </div>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <KeyRound size={18} />
            التحقق من الرمز
          </h2>
          <div className="flex gap-2">
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
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
            <div className="mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-3">
              <p className="font-bold text-slate-900">{verified.studentName}</p>
              <p className="text-sm text-slate-600">{verified.className}</p>
              <p className="text-xs font-bold text-indigo-600">
                {DISMISSAL_STATUS_LABELS[verified.status].ar}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleComplete(verified)}
                  disabled={busy || !['called', 'ready'].includes(verified.status)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  تأكيد التسليم
                </button>
              </div>
              <div className="pt-2 border-t border-indigo-100">
                <input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="سبب الإلغاء (إن وجد)"
                  className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
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

        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
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
              placeholder="بحث بالاسم أو الصف..."
              className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 text-sm font-bold"
            />
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-slate-900">{r.studentName}</p>
                  <p className="text-xs text-slate-500">{r.className}</p>
                  <p className="text-[10px] font-mono text-indigo-600 mt-1">{r.token}</p>
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                    {DISMISSAL_STATUS_LABELS[r.status].ar}
                  </span>
                  {r.createdAt?.seconds && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {new Date(r.createdAt.seconds * 1000).toLocaleTimeString('ar-IQ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-400 py-8 text-sm font-bold">
                لا توجد طلبات نشطة حالياً
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

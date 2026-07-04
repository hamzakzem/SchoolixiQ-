import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { subscribeSchoolDismissals, groupDismissalsByClass, filterVerifiedForManager, managerApproveDismissal, managerRejectDismissal } from '../../lib/dismissalService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  DISMISSAL_STATUS_LABELS,
  TERMINAL_DISMISSAL_STATUSES,
  resolveDismissalStatus,
  type DismissalRequest,
  type DismissalStatus,
} from '../../lib/dismissalTypes';
import { ShieldCheck, Filter, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DismissalStudentCard from '../../components/dismissal/DismissalStudentCard';
import { DismissalWorkflowGraph } from '../../components/dismissal/DismissalWorkflowGraph';
import { DismissalWorkflowDebug } from '../../components/dismissal/DismissalWorkflowDebug';
import { DismissalTimeline } from '../../components/dismissal/DismissalTimeline';
import { DismissalStatusBadge } from '../../components/ui/DismissalStatusBadge';

type SchoolClass = { id: string; name: string };

export default function DismissalMonitor() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | DismissalStatus>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;
    return subscribeSchoolDismissals(profile.schoolId, setRequests);
  }, [profile?.schoolId]);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'classes'),
      where('schoolId', '==', profile.schoolId),
      limit(200),
    );
    return onSnapshot(q, (snap) => {
      setSchoolClasses(
        snap.docs
          .map((d) => ({ id: d.id, name: String(d.data().name || '') }))
          .filter((c) => c.name)
          .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
      );
    });
  }, [profile?.schoolId]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() / 1000;
  }, []);

  const stats = useMemo(() => ({
    active: requests.filter((r) => ACTIVE_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r))).length,
    completedToday: requests.filter(
      (r) => resolveDismissalStatus(r) === 'DISMISSED' && (r.dismissedAt?.seconds || r.managerVerifiedAt?.seconds || 0) >= todayStart,
    ).length,
    rejected: requests.filter((r) =>
      TERMINAL_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r)) && resolveDismissalStatus(r) !== 'DISMISSED',
    ).length,
  }), [requests, todayStart]);

  const managerQueue = useMemo(() => filterVerifiedForManager(requests), [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && resolveDismissalStatus(r) !== statusFilter) return false;
      if (classFilter !== 'all' && r.classId !== classFilter) return false;
      return true;
    });
  }, [requests, statusFilter, classFilter]);

  const activeByClass = useMemo(() => {
    const active = filtered.filter((r) => ACTIVE_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r)));
    return groupDismissalsByClass(active);
  }, [filtered]);

  const completedByClass = useMemo(() => {
    const done = filtered.filter((r) => resolveDismissalStatus(r) === 'DISMISSED');
    return groupDismissalsByClass(done);
  }, [filtered]);

  const handleApprove = async (requestId: string) => {
    if (!profile) return;
    setBusyId(requestId);
    try {
      await managerApproveDismissal(requestId, {
        uid: profile.uid,
        name: profile.name || 'مدير',
      });
      toast.success('تم اعتماد التسريح');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'فشل الاعتماد');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!profile || !rejectReason.trim()) {
      toast.error('أدخل سبب الرفض');
      return;
    }
    setBusyId(requestId);
    try {
      await managerRejectDismissal(requestId, rejectReason.trim(), {
        uid: profile.uid,
        name: profile.name || 'مدير',
      });
      toast.success('تم رفض الطلب');
      setRejectReason('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'فشل الرفض');
    } finally {
      setBusyId(null);
    }
  };

  const classNameById = useMemo(() => {
    const map: Record<string, string> = {};
    schoolClasses.forEach((c) => { map[c.id] = c.name; });
    requests.forEach((r) => {
      if (r.classId) map[r.classId] = r.className || map[r.classId];
    });
    return map;
  }, [schoolClasses, requests]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={28} />
          البوابة الذكية / التسريح الآمن — مراقبة التسريح
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
          متابعة طلبات التسريح الآمن حسب الصفوف المسجلة في المدرسة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'نشطة الآن', value: stats.active, tone: 'text-amber-600 bg-amber-50' },
          { label: 'مكتملة اليوم', value: stats.completedToday, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'مرفوضة / منتهية', value: stats.rejected, tone: 'text-slate-600 bg-slate-100' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 border ${s.tone}`}>
            <p className="text-xs font-bold uppercase">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-slate-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2 rounded-xl border font-bold text-sm bg-white"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(DISMISSAL_STATUS_LABELS).map(([id, l]) => (
            <option key={id} value={id}>{l.ar}</option>
          ))}
        </select>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border font-bold text-sm bg-white"
        >
          <option value="all">كل الصفوف</option>
          {schoolClasses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {managerQueue.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-3xl border border-amber-200 dark:border-amber-900/40 p-5 space-y-4">
          <h3 className="font-black text-amber-900 dark:text-amber-200">
            بانتظار اعتماد الإدارة ({managerQueue.length})
          </h3>
          {managerQueue.map((r) => (
            <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border p-4 space-y-3">
              <DismissalStudentCard request={r} />
              <DismissalWorkflowGraph request={r} locale="ar" />
              <p className="text-xs text-slate-500">
                تحقق الحارس: <strong>{r.guardVerifiedByName || '—'}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handleApprove(r.id)}
                  className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  اعتماد التسريح
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => handleReject(r.id)}
                  className="flex items-center gap-1 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold text-sm"
                >
                  <XCircle size={16} />
                  رفض
                </button>
              </div>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض (عند الحاجة)"
                className="w-full px-3 py-2 rounded-lg border text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border p-5">
          <h3 className="font-bold text-slate-800 mb-3">نشطة حسب الصف</h3>
          {Object.keys(activeByClass).length === 0 ? (
            <p className="text-sm text-slate-400 font-bold">لا توجد طلبات نشطة</p>
          ) : (
            Object.entries(activeByClass).map(([classId, items]) => (
              <p key={classId} className="text-sm font-bold text-slate-600 py-1">
                {classNameById[classId] || classId}: {items.length}
              </p>
            ))
          )}
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border p-5">
          <h3 className="font-bold text-slate-800 mb-3">مكتملة حسب الصف</h3>
          {Object.keys(completedByClass).length === 0 ? (
            <p className="text-sm text-slate-400 font-bold">لا توجد طلبات مكتملة</p>
          ) : (
            Object.entries(completedByClass).map(([classId, items]) => (
              <p key={classId} className="text-sm font-bold text-slate-600 py-1">
                {classNameById[classId] || classId}: {items.length}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden">
        <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {filtered.map((r) => (
            <div key={r.id} className="p-5 hover:bg-slate-50/50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <DismissalStudentCard request={r} />
                  <p className="text-[10px] font-mono text-indigo-600 mt-2">{r.token}</p>
                </div>
                <DismissalStatusBadge status={resolveDismissalStatus(r)} />
              </div>
              <DismissalWorkflowGraph request={r} locale="ar" showLegend={false} />
              <DismissalTimeline request={r} compact />
              <DismissalWorkflowDebug request={r} locale="ar" />
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-16 text-slate-400 font-bold">لا توجد طلبات</p>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import {
  subscribeSchoolDismissals,
  filterVerifiedForManager,
  managerApproveDismissal,
  managerRejectDismissal,
} from '../../lib/dismissalService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  DISMISSAL_STATUS_LABELS,
  TERMINAL_DISMISSAL_STATUSES,
  resolveDismissalStatus,
  type DismissalRequest,
  type DismissalStatus,
} from '../../lib/dismissalTypes';
import { Filter, CheckCircle, XCircle, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DismissalWorkflowListShell, DismissalListRow } from '../../components/dismissal/DismissalWorkflow';
import { DismissalActionHighlight } from '../../components/dismissal/DismissalActionHighlight';
import { DismissalStepper } from '../../components/dismissal/DismissalStepper';
import { DismissalTimeline } from '../../components/dismissal/DismissalTimeline';
import { DismissalWorkflowDebug } from '../../components/dismissal/DismissalWorkflowDebug';
import '../../styles/dismissal-workflow.css';

type SchoolClass = { id: string; name: string };

export default function DismissalMonitor() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | DismissalStatus>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  const stats = useMemo(
    () => ({
      active: requests.filter((r) =>
        ACTIVE_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r)),
      ).length,
      completedToday: requests.filter(
        (r) =>
          resolveDismissalStatus(r) === 'DISMISSED' &&
          (r.dismissedAt?.seconds || r.managerVerifiedAt?.seconds || 0) >= todayStart,
      ).length,
      rejected: requests.filter(
        (r) =>
          TERMINAL_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r)) &&
          resolveDismissalStatus(r) !== 'DISMISSED',
      ).length,
    }),
    [requests, todayStart],
  );

  const managerQueue = useMemo(() => filterVerifiedForManager(requests), [requests]);

  const filtered = useMemo(
    () =>
      requests.filter((r) => {
        if (statusFilter !== 'all' && resolveDismissalStatus(r) !== statusFilter) return false;
        if (classFilter !== 'all' && r.classId !== classFilter) return false;
        return true;
      }),
    [requests, statusFilter, classFilter],
  );

  const handleApprove = async (requestId: string) => {
    if (!profile) return;
    setBusyId(requestId);
    try {
      await managerApproveDismissal(requestId, {
        uid: profile.uid,
        name: profile.name || 'مدير',
      });
      toast.success('تم اعتماد التسريح النهائي');
      setConfirmId(null);
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

  return (
    <div dir="rtl">
      <DismissalWorkflowListShell
        locale="ar"
        title="مراقبة التسريح الآمن"
        subtitle="اعتماد نهائي للطلبات التي تحققها الحارس (GUARD_VERIFIED)"
        stats={[
          { label: 'نشطة', value: stats.active },
          { label: 'مكتملة اليوم', value: stats.completedToday },
          { label: 'مرفوضة', value: stats.rejected },
        ]}
      >
        <div className="col-span-full flex flex-wrap gap-3 items-center mb-2">
          <Filter size={16} className="text-[var(--dw-gold-400)]" aria-hidden />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="dw-input w-auto min-w-[140px]"
            aria-label="تصفية الحالة"
          >
            <option value="all">كل الحالات</option>
            {Object.entries(DISMISSAL_STATUS_LABELS).map(([id, l]) => (
              <option key={id} value={id}>
                {l.ar}
              </option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="dw-input w-auto min-w-[140px]"
            aria-label="تصفية الصف"
          >
            <option value="all">كل الصفوف</option>
            {schoolClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {managerQueue.length > 0 && (
          <section className="col-span-full space-y-4" aria-label="طلبات بانتظار الاعتماد">
            <p className="dw-zone-label">
              بانتظار اعتمادك ({managerQueue.length})
            </p>
            {managerQueue.map((r) => (
              <article key={r.id} className="dw-glass-card dw-glass-card--no-lift border-2 border-[rgba(201,162,39,0.45)]">
                <DismissalActionHighlight request={r} locale="ar" viewerRole="manager" />

                <div className="flex flex-wrap justify-between gap-3 mb-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black/30 border border-[var(--dw-glass-border)] flex items-center justify-center overflow-hidden">
                      {r.photoUrl ? (
                        <img src={r.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-[var(--dw-gold-400)]" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{r.studentName}</h3>
                      <p className="text-xs text-[var(--dw-slate-muted)]">{r.className}</p>
                    </div>
                  </div>
                  <span className="dw-badge dw-badge--pending">GUARD_VERIFIED</span>
                </div>

                <DismissalStepper request={r} locale="ar" mode="full" />

                <p className="text-sm text-[var(--dw-slate-muted)] mt-4">
                  تحقق الحارس:{' '}
                  <strong className="text-white">{r.guardVerifiedByName || '—'}</strong>
                </p>

                <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/10">
                  <DismissalTimeline request={r} locale="ar" variant="enterprise" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {confirmId === r.id ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => handleApprove(r.id)}
                        className="dw-btn dw-btn--gold flex-1 min-w-[160px]"
                        aria-label="تأكيد التسريح النهائي"
                      >
                        <CheckCircle size={16} />
                        تأكيد التسريح النهائي
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="dw-btn dw-btn--ghost"
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setConfirmId(r.id)}
                      className="dw-btn dw-btn--success"
                    >
                      <CheckCircle size={16} />
                      اعتماد التسريح
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => handleReject(r.id)}
                    className="dw-btn dw-btn--danger"
                  >
                    <XCircle size={16} />
                    رفض
                  </button>
                </div>
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="سبب الرفض (عند الحاجة)"
                  className="dw-input mt-3"
                  aria-label="سبب الرفض"
                />
                <DismissalWorkflowDebug request={r} locale="ar" />
              </article>
            ))}
          </section>
        )}

        <section className="col-span-full mt-6" aria-label="كل الطلبات">
          <p className="dw-zone-label">سجل الطلبات</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filtered.map((r) => (
              <DismissalListRow key={r.id} request={r} locale="ar" />
            ))}
            {filtered.length === 0 && <p className="dw-empty">لا توجد طلبات</p>}
          </div>
        </section>
      </DismissalWorkflowListShell>
    </div>
  );
}

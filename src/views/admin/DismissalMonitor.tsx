import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { subscribeSchoolDismissals } from '../../lib/dismissalService';
import {
  DISMISSAL_STATUS_LABELS,
  type DismissalRequest,
  type DismissalStatus,
} from '../../lib/dismissalTypes';
import { ShieldCheck, Filter, Clock } from 'lucide-react';

export default function DismissalMonitor() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | DismissalStatus>('all');
  const [classFilter, setClassFilter] = useState('all');

  useEffect(() => {
    if (!profile?.schoolId) return;
    return subscribeSchoolDismissals(profile.schoolId, setRequests);
  }, [profile?.schoolId]);

  const classes = useMemo(() => {
    const names = new Set(requests.map((r) => r.className).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [requests]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime() / 1000;
  }, []);

  const stats = useMemo(() => ({
    active: requests.filter((r) => ['waiting', 'called', 'ready'].includes(r.status)).length,
    completedToday: requests.filter(
      (r) => r.status === 'completed' && (r.completedAt?.seconds || 0) >= todayStart,
    ).length,
    cancelledExpired: requests.filter((r) =>
      ['cancelled', 'expired'].includes(r.status),
    ).length,
  }), [requests, todayStart]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (classFilter !== 'all' && r.className !== classFilter) return false;
      return true;
    });
  }, [requests, statusFilter, classFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500" dir="rtl">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={28} />
          البوابة الذكية — مراقبة التسريح
        </h1>
        <p className="text-slate-500 font-bold mt-1">
          متابعة طلبات تسريح الطلاب الآمنة لمدرستك
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'نشطة الآن', value: stats.active, tone: 'text-amber-600 bg-amber-50' },
          { label: 'مكتملة اليوم', value: stats.completedToday, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'ملغية / منتهية', value: stats.cancelledExpired, tone: 'text-slate-600 bg-slate-100' },
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
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border overflow-hidden">
        <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {filtered.map((r) => (
            <div key={r.id} className="p-5 hover:bg-slate-50/50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{r.studentName}</p>
                  <p className="text-xs text-slate-500">{r.className} — {r.parentName}</p>
                  <p className="text-[10px] font-mono text-indigo-600 mt-1">{r.token}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {DISMISSAL_STATUS_LABELS[r.status].ar}
                </span>
              </div>
              {r.statusHistory && r.statusHistory.length > 0 && (
                <div className="mt-3 pl-3 border-r-2 border-slate-200 space-y-1">
                  {r.statusHistory.map((h, i) => (
                    <p key={i} className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {DISMISSAL_STATUS_LABELS[h.status]?.ar || h.status}
                      {h.byName ? ` — ${h.byName}` : ''}
                    </p>
                  ))}
                </div>
              )}
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

import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import {
  Bell,
  MessageCircle,
  ExternalLink,
  ShieldOff,
  ShieldCheck,
  Send,
  Settings2,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  buildTuitionWhatsAppMessage,
  buildWhatsAppUrl,
  fetchReminderLogs,
  getSchoolTuitionReminderSettings,
  restoreParentPrivileges,
  saveSchoolTuitionReminderSettings,
  sendTuitionReminderWithTracking,
  DEFAULT_TUITION_REMINDER_SETTINGS,
  isInstallmentUnpaid,
  isValidWhatsAppPhone,
  resolveLinkedParentFromCache,
  resolveParentPhone,
  type TuitionReminderSettings,
} from '../../lib/tuitionReminderService';
import { parseDueDate } from '../../lib/dailySummaryUtils';

type Row = {
  installmentId: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentId?: string;
  amount: number;
  dueDate: Date;
  delayDays: number;
  bucket: 'overdue' | 'today' | 'soon';
  reminderCount: number;
  lastReminderAt: Date | null;
  escalationLevel: number;
  parentStatus: string;
};

export default function TuitionReminderDashboard() {
  const { profile, schoolData } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [tracking, setTracking] = useState<Record<string, any>>({});
  const [parents, setParents] = useState<Record<string, any>>({});
  const [settings, setSettings] = useState<TuitionReminderSettings>(DEFAULT_TUITION_REMINDER_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'soon'>('all');

  const schoolId = profile?.schoolId || '';
  const schoolName = schoolData?.name || profile?.schoolName || 'المدرسة';

  useEffect(() => {
    if (!schoolId) return;
    getSchoolTuitionReminderSettings(schoolId).then(setSettings);
    fetchReminderLogs(schoolId, 30).then(setLogs);

    const unsubs = [
      onSnapshot(query(collection(db, 'students'), where('schoolId', '==', schoolId), limit(1000)), (s) =>
        setStudents(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(query(collection(db, 'installments'), where('schoolId', '==', schoolId), limit(500)), (s) =>
        setInstallments(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(query(collection(db, 'tuition_reminder_tracking'), where('schoolId', '==', schoolId)), (s) => {
        const map: Record<string, any> = {};
        s.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setTracking(map);
      }),
      onSnapshot(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'parent')), (s) => {
        const map: Record<string, any> = {};
        s.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setParents(map);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [schoolId]);

  const rows: Row[] = useMemo(() => {
    const now = new Date();
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingDays = Math.max(1, settings.daysBeforeEscalation || 7);

    return installments
      .filter((i) => isInstallmentUnpaid(i))
      .map((i) => {
        const student = students.find((s) => s.id === i.studentId);
        const due = parseDueDate(i.dueDate);
        if (!due.getTime() || Number.isNaN(due.getTime())) return null;

        const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        const daysUntilDue = Math.floor((dueOnly.getTime() - todayOnly.getTime()) / 86400000);

        let bucket: Row['bucket'] | null = null;
        if (daysUntilDue < 0) bucket = 'overdue';
        else if (daysUntilDue === 0) bucket = 'today';
        else if (daysUntilDue <= upcomingDays) bucket = 'soon';
        if (!bucket) return null;

        const trackKey = `${schoolId}_${i.studentId}_${i.id}`;
        const track = tracking[trackKey] || tracking[`${schoolId}_${i.studentId}`] || {};
        const { parentId, parent } = resolveLinkedParentFromCache(student, parents);
        const delayDays = Math.max(0, -daysUntilDue);

        return {
          installmentId: i.id,
          studentId: i.studentId,
          studentName: student?.name || 'طالب',
          parentName: parent?.displayName || parent?.name || '—',
          parentPhone: resolveParentPhone(student, parent),
          parentId,
          amount: i.amount || 0,
          dueDate: due,
          delayDays,
          bucket,
          reminderCount: track.reminderCount || 0,
          lastReminderAt: track.lastReminderAt?.toDate?.() ?? null,
          escalationLevel: track.escalationLevel || 1,
          parentStatus: track.parentStatus || 'active',
        };
      })
      .filter(Boolean) as Row[];
  }, [installments, students, tracking, parents, schoolId, settings.daysBeforeEscalation]);

  const filtered = rows.filter((r) => filter === 'all' || r.bucket === filter);

  const emptyMessage = useMemo(() => {
    if (students.length > 0 && installments.length === 0) {
      return 'لا توجد أقساط منشأة للطلاب بعد';
    }
    if (rows.length === 0) {
      return 'لا توجد أقساط غير مدفوعة أو مستحقة حالياً';
    }
    if (filtered.length === 0) {
      return 'لا توجد أقساط في هذا القسم';
    }
    return '';
  }, [students.length, installments.length, rows.length, filtered.length]);

  const handleSend = async (row: Row) => {
    if (!profile?.uid || !schoolId) return;
    setBusyId(row.installmentId);
    try {
      const student = students.find((s) => s.id === row.studentId);
      const result = await sendTuitionReminderWithTracking({
        schoolId,
        schoolName,
        student: student || { id: row.studentId, name: row.studentName },
        installment: { id: row.installmentId, amount: row.amount, dueDate: row.dueDate },
        senderId: profile.uid,
        senderName: profile.displayName || profile.name,
      });
      if (result === 'sent') toast.success('تم إرسال التذكير');
      else if (result === 'skipped_dedup') toast('تم تجاهل التذكير المكرر', { icon: 'ℹ️' });
      else if (result === 'no_parent') toast.error('لا يوجد ولي أمر مرتبط');
      else toast.error('فشل الإرسال');
      fetchReminderLogs(schoolId, 30).then(setLogs);
    } finally {
      setBusyId(null);
    }
  };

  const handleWhatsApp = (row: Row) => {
    if (!isValidWhatsAppPhone(row.parentPhone)) {
      toast.error('لا يوجد رقم واتساب');
      return;
    }
    const url = buildWhatsAppUrl(
      row.parentPhone,
      buildTuitionWhatsAppMessage({
        schoolName,
        studentName: row.studentName,
        amount: row.amount,
      }),
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBulk = async () => {
    if (!profile?.uid || filtered.length === 0) return;
    setBulkBusy(true);
    let sent = 0;
    try {
      for (const row of filtered.filter((r) => r.bucket === 'overdue' || r.bucket === 'today')) {
        const student = students.find((s) => s.id === row.studentId);
        const result = await sendTuitionReminderWithTracking({
          schoolId,
          schoolName,
          student: student || { id: row.studentId, name: row.studentName },
          installment: { id: row.installmentId, amount: row.amount, dueDate: row.dueDate },
          senderId: profile.uid,
          channel: 'bulk',
        });
        if (result === 'sent') sent++;
      }
      toast.success(`تم إرسال ${sent} تذكير`);
      fetchReminderLogs(schoolId, 30).then(setLogs);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleRestore = async (row: Row) => {
    if (!row.parentId || !profile?.uid) return;
    try {
      await restoreParentPrivileges(row.parentId, schoolId, profile.uid);
      toast.success('تم استعادة صلاحيات ولي الأمر');
    } catch {
      toast.error('تعذر الاستعادة');
    }
  };

  const handleRestrict = async (row: Row) => {
    if (!row.parentId || !profile?.uid) return;
    try {
      const { applyParentEscalation } = await import('../../lib/tuitionReminderService');
      await applyParentEscalation(row.parentId, schoolId, 3, settings);
      toast.success('تم تقييد بعض صلاحيات ولي الأمر');
    } catch {
      toast.error('تعذر التقييد');
    }
  };

  const saveSettings = async () => {
    if (!schoolId) return;
    await saveSchoolTuitionReminderSettings(schoolId, settings);
    toast.success('تم حفظ إعدادات التذكير');
    setShowSettings(false);
  };

  const stats = {
    overdue: rows.filter((r) => r.bucket === 'overdue').length,
    today: rows.filter((r) => r.bucket === 'today').length,
    soon: rows.filter((r) => r.bucket === 'soon').length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">لوحة تذكير الأقساط</h2>
          <p className="text-sm text-slate-500 font-bold mt-1">متابعة المتأخرين، التذكير، والتصعيد</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm"
          >
            <Settings2 size={16} /> الإعدادات
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={handleBulk}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B2345] text-white rounded-xl font-bold text-sm disabled:opacity-50"
          >
            <Send size={16} /> {bulkBusy ? 'جاري الإرسال...' : 'تذكير جماعي'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { key: 'overdue', label: 'متأخر', count: stats.overdue, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
          { key: 'today', label: 'مستحق اليوم', count: stats.today, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
          { key: 'soon', label: 'قريباً', count: stats.soon, icon: Clock, color: 'text-blue-600 bg-blue-50' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key as typeof filter)}
            className={`p-5 rounded-2xl border text-right transition-all ${filter === s.key ? 'border-[#0B2345] shadow-md' : 'border-slate-200 bg-white'}`}
          >
            <div className={`inline-flex p-2 rounded-xl ${s.color} mb-2`}>
              <s.icon size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900">{s.count}</p>
            <p className="text-xs font-bold text-slate-500">{s.label}</p>
          </button>
        ))}
      </div>

      {showSettings && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-black text-lg">إعدادات التذكير المتكرر</h3>
          <label className="flex items-center gap-3 font-bold text-sm">
            <input
              type="checkbox"
              checked={settings.repeatEnabled}
              onChange={(e) => setSettings({ ...settings, repeatEnabled: e.target.checked })}
            />
            تفعيل التذكير المتكرر
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm font-bold">
              الفترة بين التذكيرات (ساعات)
              <input
                type="number"
                min={1}
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={settings.intervalHours}
                onChange={(e) => setSettings({ ...settings, intervalHours: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm font-bold">
              أيام قبل التصعيد
              <input
                type="number"
                min={1}
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={settings.daysBeforeEscalation}
                onChange={(e) => setSettings({ ...settings, daysBeforeEscalation: Number(e.target.value) })}
              />
            </label>
          </div>
          <button type="button" onClick={saveSettings} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold">
            حفظ
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                <th className="px-4 py-3 text-right">الطالب</th>
                <th className="px-4 py-3 text-right">ولي الأمر</th>
                <th className="px-4 py-3 text-right">الهاتف</th>
                <th className="px-4 py-3 text-right">المبلغ</th>
                <th className="px-4 py-3 text-right">التأخير</th>
                <th className="px-4 py-3 text-right">آخر تذكير</th>
                <th className="px-4 py-3 text-right">العدد</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.installmentId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold">{row.studentName}</td>
                  <td className="px-4 py-3">{row.parentName}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{row.parentPhone || '—'}</td>
                  <td className="px-4 py-3">{row.amount.toLocaleString('ar-IQ')} د.ع</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${row.delayDays > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {row.delayDays > 0 ? `${row.delayDays} يوم` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.lastReminderAt ? row.lastReminderAt.toLocaleString('ar-IQ') : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold">{row.reminderCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      row.parentStatus === 'restricted' ? 'bg-rose-100 text-rose-700' :
                      row.parentStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {row.parentStatus === 'restricted' ? 'مقيّد' : row.parentStatus === 'warning' ? 'تحذير' : 'نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {row.parentId ? (
                        <button
                          type="button"
                          title="إرسال إشعار"
                          disabled={busyId === row.installmentId}
                          onClick={() => handleSend(row)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                        >
                          <Bell size={16} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold px-1 whitespace-nowrap">
                          لا يوجد ولي أمر مرتبط
                        </span>
                      )}
                      <button
                        type="button"
                        title={isValidWhatsAppPhone(row.parentPhone) ? 'واتساب' : 'لا يوجد رقم واتساب'}
                        disabled={!isValidWhatsAppPhone(row.parentPhone)}
                        onClick={() => handleWhatsApp(row)}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <MessageCircle size={16} />
                      </button>
                      {!isValidWhatsAppPhone(row.parentPhone) && (
                        <span className="text-[10px] text-slate-400 font-bold px-1 whitespace-nowrap">
                          لا يوجد رقم واتساب
                        </span>
                      )}
                      {row.parentId && (
                        <>
                          <button type="button" title="تقييد" onClick={() => handleRestrict(row)} className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100">
                            <ShieldOff size={16} />
                          </button>
                          <button type="button" title="استعادة" onClick={() => handleRestore(row)} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                            <ShieldCheck size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-12 text-slate-400 font-bold">{emptyMessage}</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="font-black text-lg mb-4 flex items-center gap-2">
          <ExternalLink size={18} /> سجل التدقيق
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap gap-2 text-xs border-b border-slate-100 pb-2">
              <span className="font-bold">{log.deliveryResult}</span>
              <span className="text-slate-500">{log.channel}</span>
              <span>طالب: {log.studentId?.slice(0, 8)}</span>
              {log.escalationLevel && <span>L{log.escalationLevel}</span>}
            </div>
          ))}
          {logs.length === 0 && <p className="text-slate-400 font-bold">لا سجلات بعد</p>}
        </div>
      </div>
    </div>
  );
}

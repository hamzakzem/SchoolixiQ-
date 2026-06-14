import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  computeReminderStats,
  formatTuitionDueLabel,
  tuitionParentsQuery,
  type TuitionReminderDisplayRow,
  type TuitionReminderFilterKey,
} from '../../lib/tuitionModel';
import { useTuitionSchoolData } from '../../lib/useTuitionSchoolData';
import { useTuitionReminderRows } from '../../lib/useTuitionReminderRows';
import {
  buildTuitionReminderRowsSnapshot,
  buildTuitionWhatsAppMessage,
  buildWhatsAppUrl,
  fetchReminderLogs,
  fetchRestrictedParentAccounts,
  getSchoolTuitionReminderSettings,
  logReminderAudit,
  logWhatsAppQueueCreated,
  restoreParentPrivileges,
  saveSchoolTuitionReminderSettings,
  sendTuitionReminder,
  DEFAULT_TUITION_REMINDER_SETTINGS,
  type TuitionReminderSettings,
} from '../../lib/tuitionReminderService';
import {
  logTuitionListenerDebug,
  logTuitionListenerError,
  logTuitionListenerSnapshot,
} from '../../lib/tuitionQueryDebug';
import { formatTuitionReminderEmptyReason } from '../../lib/tuitionReminderDebug';
import { TuitionReminderDiagnosticPanel } from '../../components/admin/tuition/TuitionReminderDiagnosticPanel';

const FILTER_TABS: { key: TuitionReminderFilterKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'overdue', label: 'متأخر' },
  { key: 'today', label: 'مستحق اليوم' },
  { key: 'soon', label: 'قريباً' },
  { key: 'later', label: 'لاحقاً' },
  { key: 'no_parent', label: 'بدون ولي أمر' },
  { key: 'auto_eligible', label: 'مؤهل للتذكير التلقائي' },
  { key: 'restricted', label: 'مقيد / يحتاج تصعيد' },
];

export default function TuitionReminderDashboard() {
  const { profile, schoolData } = useAuth();
  const schoolId = profile?.schoolId || '';
  const schoolName = schoolData?.name || profile?.schoolName || 'المدرسة';

  const { students, installments, payments, queryErrors: dataQueryErrors } = useTuitionSchoolData(schoolId);
  const [tracking, setTracking] = useState<Record<string, any>>({});
  const [parents, setParents] = useState<Record<string, any>>({});
  const [parentQueryError, setParentQueryError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [settings, setSettings] = useState<TuitionReminderSettings>(DEFAULT_TUITION_REMINDER_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [restrictedParents, setRestrictedParents] = useState<any[]>([]);
  const [filter, setFilter] = useState<TuitionReminderFilterKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    getSchoolTuitionReminderSettings(schoolId).then(setSettings);
    fetchReminderLogs(schoolId, 30).then(setLogs);
    fetchRestrictedParentAccounts(schoolId).then(setRestrictedParents);

    logTuitionListenerDebug('TUITION_REMINDER_TRACKING', schoolId, 'tuition_reminder_tracking', [
      "where('schoolId', '==', schoolId)",
    ]);

    logTuitionListenerDebug('TUITION_PARENTS', schoolId, 'users', [
      "where('schoolId', '==', schoolId)",
      "where('role', '==', 'parent')",
    ]);

    const unsubs = [
      onSnapshot(
        query(collection(db, 'tuition_reminder_tracking'), where('schoolId', '==', schoolId)),
        (s) => {
          logTuitionListenerSnapshot('TUITION_REMINDER_TRACKING', s.size, s.metadata.fromCache);
          const map: Record<string, any> = {};
          s.docs.forEach((d) => {
            const data = d.data();
            map[d.id] = { ...data, lastReminderAt: data.lastReminderAt?.toDate?.() ?? null };
          });
          setTracking(map);
        },
        (error) => logTuitionListenerError('TUITION_REMINDER_TRACKING', error),
      ),
      onSnapshot(tuitionParentsQuery(schoolId), (s) => {
        logTuitionListenerSnapshot('TUITION_PARENTS', s.size, s.metadata.fromCache);
        const map: Record<string, any> = {};
        s.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setParents(map);
        setParentQueryError(null);
        if (s.size === 0) {
          console.warn('[TuitionReminderDebug] PARENT_QUERY_EMPTY', {
            schoolId,
            query: "users where schoolId==schoolId AND role=='parent'",
          });
        }
        fetchRestrictedParentAccounts(schoolId).then(setRestrictedParents);
      }, (error) => {
        logTuitionListenerError('TUITION_PARENTS', error);
        const err = error as { message?: string };
        setParentQueryError(err?.message || String(error));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [schoolId]);

  const queryErrors = useMemo(() => {
    const merged = { ...dataQueryErrors };
    if (parentQueryError) merged.parents = parentQueryError;
    return merged;
  }, [dataQueryErrors, parentQueryError]);

  const {
    displayRows,
    eligibleRows,
    hiddenNoParent,
    diagnostics,
  } = useTuitionReminderRows({
    students,
    installments,
    payments,
    settings,
    tracking,
    parents,
    schoolId,
    filter,
    search,
    logContext: 'tuition_reminders_dashboard',
    queryErrors,
    viewMode: 'dashboard',
  });

  const parentsCount = Object.keys(parents).length;

  const stats = computeReminderStats(eligibleRows);

  const filterCounts = useMemo(() => {
    const base = buildTuitionReminderRowsSnapshot({
      students,
      installments,
      payments,
      settings,
      tracking,
      parents,
      schoolId,
      filter: 'all',
      search: '',
      logContext: 'dashboard_counts',
      queryErrors,
      viewMode: 'dashboard',
    });
    const rows = base.displayableRows;
    return {
      all: rows.length,
      overdue: rows.filter((r) => r.bucket === 'overdue').length,
      today: rows.filter((r) => r.bucket === 'today').length,
      soon: rows.filter((r) => r.bucket === 'soon').length,
      later: rows.filter((r) => r.bucket === 'later').length,
      no_parent: rows.filter((r) => !r.hasLinkedParent).length,
      auto_eligible: base.eligibleRows.filter((r) => r.autoReminderEligible).length,
      restricted: rows.filter((r) => r.isRestricted || r.escalationEligible).length,
    };
  }, [students, installments, payments, settings, tracking, parents, schoolId, queryErrors]);

  const emptyMessage = useMemo(() => {
    if (displayRows.length === 0 && search.trim()) {
      return 'لا توجد نتائج مطابقة للبحث أو الفلتر';
    }
    if (displayRows.length === 0 && eligibleRows.length === 0) {
      return formatTuitionReminderEmptyReason(diagnostics.emptyReason, diagnostics.counts);
    }
    return '';
  }, [diagnostics, displayRows.length, eligibleRows.length, search]);

  const tableRows: TuitionReminderDisplayRow[] = debugMode
    ? diagnostics.debugRows.map((d) => ({
        installmentId: d.installmentId,
        studentId: d.studentId,
        studentName: d.studentName,
        className: '—',
        parentName: d.matchingParentFound ? 'مرتبط' : 'لا يوجد ولي أمر مرتبط',
        parentEmail: d.parentEmail,
        parentPhone: d.parentPhone,
        parentId: d.matchingParentFound ? d.parentIds[0] : undefined,
        amount: d.amount || 0,
        dueDate: d.parsedDueDate ? new Date(d.parsedDueDate) : new Date(),
        delayDays: 0,
        bucket: (d.bucket || 'later') as TuitionReminderDisplayRow['bucket'],
        lastReminderAt: null,
        reminderCount: 0,
        statusLabel: `${d.displayStatus} · ${d.reasonExcluded}`,
        hasWhatsApp: d.parentPhone.replace(/\D/g, '').length >= 9,
        linkedParentLabel: d.matchingParentFound ? 'مرتبط' : 'لا يوجد ولي أمر مرتبط',
        whatsAppLabel: d.parentPhone ? 'متاح' : '—',
        autoReminderEligible: false,
        escalationEligible: false,
        isRestricted: false,
        hasLinkedParent: d.matchingParentFound,
        daysSinceTimingAnchor: 0,
        timingAnchor: new Date(),
        escalationLevel: 1,
        parentStatus: 'active' as const,
        installment: {} as TuitionReminderDisplayRow['installment'],
        student: undefined,
      }))
    : displayRows;

  const handleSend = async (row: TuitionReminderDisplayRow) => {
    if (!profile?.uid || !schoolId) return;
    if (!row.hasLinkedParent || !row.parentId) {
      toast.error('لا يوجد ولي أمر مرتبط');
      return;
    }
    setBusyId(row.installmentId);
    try {
      const student = students.find((s) => s.id === row.studentId);
      const result = await sendTuitionReminder({
        schoolId,
        schoolName,
        student: student || { id: row.studentId, name: row.studentName },
        installment: { id: row.installmentId, amount: row.amount, dueDate: row.dueDate },
        senderId: profile.uid,
        senderName: profile.displayName || profile.name,
        senderEmail: profile.email,
        senderRole: profile.role,
        metadataSource: 'tuition_reminders',
        sentFrom: 'tuition_reminders_dashboard',
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

  const handleWhatsApp = async (row: TuitionReminderDisplayRow) => {
    if (!row.hasWhatsApp) {
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
    logWhatsAppQueueCreated({
      schoolId,
      studentId: row.studentId,
      parentId: row.parentId,
      phone: row.parentPhone,
      source: 'tuition_reminders',
    });
    if (profile?.uid) {
      await logReminderAudit({
        schoolId,
        studentId: row.studentId,
        installmentId: row.installmentId,
        parentId: row.parentId,
        sentBy: profile.uid,
        sentByName: profile.displayName || profile.name,
        senderEmail: profile.email,
        senderRole: profile.role,
        senderUid: profile.uid,
        source: 'tuition_reminders',
        sentFrom: 'tuition_reminders_dashboard',
        channel: 'whatsapp_link',
        deliveryResult: 'sent',
        amount: row.amount,
        dueDate: row.dueDate.toISOString(),
      });
    }
  };

  const handleBulk = async () => {
    if (!profile?.uid) return;
    const bulkTargets = displayRows.filter(
      (r) =>
        r.hasLinkedParent &&
        (r.bucket === 'overdue' || r.bucket === 'today' || r.bucket === 'soon' || r.autoReminderEligible),
    );
    if (bulkTargets.length === 0) return;
    setBulkBusy(true);
    let sent = 0;
    try {
      for (const row of bulkTargets) {
        const student = students.find((s) => s.id === row.studentId);
        const result = await sendTuitionReminder({
          schoolId,
          schoolName,
          student: student || { id: row.studentId, name: row.studentName },
          installment: { id: row.installmentId, amount: row.amount, dueDate: row.dueDate },
          senderId: profile.uid,
          senderName: profile.displayName || profile.name,
          senderEmail: profile.email,
          senderRole: profile.role,
          metadataSource: 'tuition_reminders',
          sentFrom: 'tuition_reminders_dashboard',
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

  const handleRestore = async (parentId: string) => {
    if (!profile?.uid) return;
    try {
      await restoreParentPrivileges(parentId, schoolId, profile.uid);
      toast.success('تم استعادة صلاحيات ولي الأمر');
      fetchRestrictedParentAccounts(schoolId).then(setRestrictedParents);
    } catch {
      toast.error('تعذر الاستعادة');
    }
  };

  const saveSettings = async () => {
    if (!schoolId) return;
    await saveSchoolTuitionReminderSettings(schoolId, settings);
    toast.success('تم حفظ إعدادات التذكير');
    setShowSettings(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">لوحة تذكير الأقساط</h2>
          <p className="text-sm text-slate-500 font-bold mt-1">
            متزامنة مع Overview — قسط واحد حالي غير مدفوع لكل طالب
          </p>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { key: 'overdue', label: 'متأخر', count: stats.overdue, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
          { key: 'today', label: 'مستحق اليوم', count: stats.today, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
          { key: 'soon', label: 'قريباً', count: stats.soon, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { key: 'auto_eligible', label: 'تلقائي', count: stats.autoEligible, icon: Send, color: 'text-indigo-600 bg-indigo-50' },
          { key: 'restricted', label: 'تصعيد', count: stats.restricted, icon: ShieldOff, color: 'text-red-600 bg-red-50' },
        ].map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key as TuitionReminderFilterKey)}
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

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث: الطالب، ولي الأمر، الصف، المبلغ، الحالة..."
          className="w-full h-11 pr-11 pl-4 rounded-xl border border-slate-200 bg-white text-sm font-bold"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              filter === tab.key
                ? 'bg-[#0B2345] text-white border-[#0B2345]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.label}
            {filterCounts[tab.key] > 0 && (
              <span className="mr-1.5 opacity-80">({filterCounts[tab.key]})</span>
            )}
          </button>
        ))}
      </div>

      {showSettings && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-black text-lg">إعدادات التذكير والتصعيد</h3>
          <label className="flex items-center gap-3 font-bold text-sm">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            تفعيل التذكير اليدوي
          </label>
          <label className="flex items-center gap-3 font-bold text-sm">
            <input
              type="checkbox"
              checked={settings.autoRemindersEnabled}
              onChange={(e) => setSettings({ ...settings, autoRemindersEnabled: e.target.checked })}
            />
            تفعيل التذكير التلقائي (يتطلب Cloud Scheduler)
          </label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'reminderStartAfterDays', label: 'بدء التذكير بعد (يوم)', min: 1 },
              { key: 'reminderRepeatEveryDays', label: 'تكرار كل (يوم)', min: 1 },
              { key: 'maxReminderCountBeforeWarning', label: 'عدد التذكيرات قبل التحذير', min: 1 },
              { key: 'restrictAfterDays', label: 'تقييد بعد (يوم تأخير)', min: 1 },
              { key: 'redWarningDurationDays', label: 'مدة التحذير الأحمر (يوم)', min: 1 },
              { key: 'upcomingDays', label: 'نافذة «قريباً» (يوم)', min: 1 },
            ].map((field) => (
              <label key={field.key} className="text-sm font-bold">
                {field.label}
                <input
                  type="number"
                  min={field.min}
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={(settings as any)[field.key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [field.key]: Number(e.target.value) || field.min })
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={saveSettings} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold">
            حفظ
          </button>
        </div>
      )}

      {restrictedParents.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <h3 className="font-black text-lg text-rose-800 mb-3">حسابات أولياء الأمور المقيّدة</h3>
          <div className="space-y-2">
            {restrictedParents.map((p) => (
              <div key={p.parentId} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-xl p-3 border border-rose-100">
                <div>
                  <p className="font-bold text-slate-800">{p.name}</p>
                  {p.email && <p className="text-xs text-slate-500">{p.email}</p>}
                  {p.escalationLevel && (
                    <p className="text-xs text-rose-600 font-bold">مستوى التصعيد: {p.escalationLevel}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(p.parentId)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold"
                >
                  <ShieldCheck size={14} /> استعادة الوصول
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {parentsCount === 0 && eligibleRows.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          تم العثور على أقساط، لكن لم يتم العثور على حسابات أولياء الأمور المرتبطة.
        </div>
      )}

      <TuitionReminderDiagnosticPanel
        diagnostics={diagnostics}
        debugMode={debugMode}
        onDebugModeChange={setDebugMode}
        showWhenEmpty={displayRows.length === 0 || debugMode}
      />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                <th className="px-4 py-3 text-right">الطالب</th>
                <th className="px-4 py-3 text-right">ولي الأمر</th>
                <th className="px-4 py-3 text-right">الهاتف</th>
                <th className="px-4 py-3 text-right">المبلغ</th>
                <th className="px-4 py-3 text-right">الاستحقاق</th>
                <th className="px-4 py-3 text-right">التأخير</th>
                <th className="px-4 py-3 text-right">آخر تذكير</th>
                <th className="px-4 py-3 text-right">العدد</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row) => (
                <tr key={row.installmentId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold">{row.studentName}</td>
                  <td className="px-4 py-3">{row.parentName}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{row.parentPhone || '—'}</td>
                  <td className="px-4 py-3">{row.amount.toLocaleString('ar-IQ')} د.ع</td>
                  <td className="px-4 py-3 text-xs">{formatTuitionDueLabel(row.dueDate)}</td>
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
                      row.isRestricted || row.parentStatus === 'restricted' ? 'bg-rose-100 text-rose-700' :
                      row.escalationEligible ? 'bg-red-100 text-red-800' :
                      row.parentStatus === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {row.statusLabel || (row.parentStatus === 'restricted' ? 'مقيّد' : row.parentStatus === 'warning' ? 'تحذير' : 'نشط')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {row.hasLinkedParent && row.parentId && !debugMode ? (
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
                        title="واتساب"
                        disabled={!row.hasWhatsApp}
                        onClick={() => void handleWhatsApp(row)}
                        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40"
                      >
                        <MessageCircle size={16} />
                      </button>
                      {row.parentId && row.isRestricted && (
                        <button
                          type="button"
                          title="استعادة"
                          onClick={() => handleRestore(row.parentId!)}
                          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                        >
                          <ShieldCheck size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tableRows.length === 0 && (
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
              {log.source && <span className="text-slate-400">{log.source}</span>}
              <span>طالب: {log.studentId?.slice(0, 8)}</span>
              {log.escalationLevel && <span>L{log.escalationLevel}</span>}
              {log.skippedReason && <span className="text-amber-600">{log.skippedReason}</span>}
            </div>
          ))}
          {logs.length === 0 && <p className="text-slate-400 font-bold">لا سجلات بعد</p>}
        </div>
      </div>
    </div>
  );
}

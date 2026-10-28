import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import {
  Bell,
  MessageCircle,
  ShieldOff,
  ShieldCheck,
  Send,
  Settings2,
  AlertTriangle,
  Clock,
  Calendar,
  Search,
  Wallet,
  Inbox,
  History,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  formatTuitionAmountLabel,
  tuitionParentsQuery,
  type TuitionReminderDisplayRow,
  type TuitionReminderFilterKey,
} from '../../lib/tuitionModel';
import {
  computeDashboardReminderCounts,
  TUITION_REMINDER_EMPTY_MESSAGES,
} from '../../lib/tuitionReminderLabels';
import { useTuitionSchoolData } from '../../lib/useTuitionSchoolData';
import { useTuitionReminderRows } from '../../lib/useTuitionReminderRows';
import {
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
import { TuitionReminderDiagnosticPanel } from '../../components/admin/tuition/TuitionReminderDiagnosticPanel';
import {
  ReminderCheck,
  ReminderFilterChips,
  TuitionReminderCard,
} from '../../components/admin/tuition/TuitionReminderCard';

const IS_DEV = import.meta.env.DEV;

const LOG_RESULT_LABELS: Record<string, string> = {
  sent: 'تم الإرسال',
  skipped_dedup: 'تخطي (مكرر)',
  no_parent: 'لا يوجد ولي أمر',
  failed: 'فشل',
  restored: 'استعادة الصلاحيات',
  skipped_auto: 'تخطي تلقائي',
};

const LOG_CHANNEL_LABELS: Record<string, string> = {
  notification: 'إشعار حساب',
  whatsapp_link: 'واتساب',
  bulk: 'جماعي',
  automatic: 'تلقائي',
};

const FILTER_TABS: { key: TuitionReminderFilterKey; label: string }[] = [
  { key: 'due_now', label: 'مستحق الآن' },
  { key: 'soon', label: 'قريباً' },
  { key: 'later', label: 'لاحقاً' },
  { key: 'no_parent', label: 'بدون ولي أمر' },
  { key: 'all', label: 'الكل' },
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

  const dashboardCounts = useMemo(
    () => computeDashboardReminderCounts(eligibleRows),
    [eligibleRows],
  );

  const allLaterRows = useMemo(
    () => eligibleRows.length > 0 && eligibleRows.every((r) => r.bucket === 'later'),
    [eligibleRows],
  );

  const filterCounts = useMemo(() => {
    const rows = eligibleRows;
    return {
      all: rows.length,
      due_now: rows.filter((r) => r.bucket === 'overdue' || r.bucket === 'today').length,
      soon: rows.filter((r) => r.bucket === 'soon').length,
      later: rows.filter((r) => r.bucket === 'later').length,
      no_parent: rows.filter((r) => !r.hasLinkedParent).length,
    };
  }, [eligibleRows]);

  const emptyMessage = useMemo(() => {
    if (displayRows.length === 0 && search.trim()) {
      return TUITION_REMINDER_EMPTY_MESSAGES.searchNoMatch;
    }
    if (displayRows.length === 0 && allLaterRows) {
      return TUITION_REMINDER_EMPTY_MESSAGES.allLaterDashboard;
    }
    if (displayRows.length === 0 && eligibleRows.length === 0) {
      return TUITION_REMINDER_EMPTY_MESSAGES.noRows;
    }
    return '';
  }, [displayRows.length, eligibleRows.length, allLaterRows, search]);

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
    } catch {
      toast.error('تعذر إرسال التذكير، حاول مرة أخرى');
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
    } catch {
      toast.error(sent > 0 ? `أُرسل ${sent} تذكير ثم توقف الإرسال` : 'تعذر الإرسال الجماعي');
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

  const totalDue = useMemo(
    () => eligibleRows.reduce((sum, r) => sum + (r.amount || 0), 0),
    [eligibleRows],
  );
  const bulkCount = useMemo(
    () =>
      displayRows.filter(
        (r) =>
          r.hasLinkedParent &&
          (r.bucket === 'overdue' || r.bucket === 'today' || r.bucket === 'soon' || r.autoReminderEligible),
      ).length,
    [displayRows],
  );
  const studentNames = useMemo(() => {
    const map: Record<string, string> = {};
    students.forEach((st) => {
      map[st.id] = st.name || '';
    });
    return map;
  }, [students]);

  const stats: {
    key: TuitionReminderFilterKey;
    label: string;
    count: number;
    icon: typeof Bell;
    tone: string;
  }[] = [
    { key: 'all', label: 'إجمالي غير المدفوع', count: dashboardCounts.total, icon: Wallet, tone: 'all' },
    { key: 'due_now', label: 'مستحق الآن', count: dashboardCounts.dueNow, icon: AlertTriangle, tone: 'due' },
    { key: 'soon', label: 'قريباً', count: dashboardCounts.soon, icon: Clock, tone: 'soon' },
    { key: 'later', label: 'لاحقاً', count: dashboardCounts.later, icon: Calendar, tone: 'later' },
    { key: 'no_parent', label: 'بدون ولي أمر', count: dashboardCounts.noParent, icon: ShieldOff, tone: 'noparent' },
  ];

  return (
    <div className="sx-trm sx-trm-page" dir="rtl">
      <section className="sx-trm-hero">
        <div className="sx-trm-hero__copy">
          <p className="sx-trm-hero__eyebrow">الأقساط والرسوم</p>
          <h2 className="sx-trm-hero__title">تذكير الأقساط</h2>
          <p className="sx-trm-hero__desc">القسط الحالي غير المدفوع لكل طالب، مع قنوات التواصل المتاحة لولي أمره</p>
        </div>
        <div className="sx-trm-hero__total">
          <b>
            {formatTuitionAmountLabel(totalDue)} <small className="text-sm">د.ع</small>
          </b>
          <span>إجمالي المستحق</span>
        </div>
        <div className="sx-trm-hero__actions">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="sx-trm-cta sx-trm-cta--ghost"
            aria-expanded={showSettings}
          >
            <Settings2 size={17} aria-hidden /> الإعدادات
          </button>
          <button
            type="button"
            disabled={bulkBusy || bulkCount === 0}
            onClick={handleBulk}
            className="sx-trm-cta sx-trm-cta--primary"
          >
            <Send size={17} aria-hidden />
            {bulkBusy ? 'جاري الإرسال…' : `تذكير جماعي${bulkCount ? ` (${bulkCount})` : ''}`}
          </button>
        </div>
      </section>

      <div className="sx-trm-stats">
        {stats.map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setFilter(st.key)}
            className={`sx-trm-stat${filter === st.key ? ' is-active' : ''}`}
            aria-pressed={filter === st.key}
          >
            <span className={`sx-trm-stat__icon sx-trm-stat__icon--${st.tone}`} aria-hidden>
              <st.icon size={18} />
            </span>
            <b>{st.count}</b>
            <span>{st.label}</span>
          </button>
        ))}
      </div>

      {showSettings && (
        <section className="sx-trm-panel">
          <h3 className="sx-trm-panel__title">
            <Settings2 size={18} aria-hidden /> إعدادات التذكير والتصعيد
          </h3>
          <div className="grid gap-2 mb-4">
            <label className="sx-trm-switch">
              <input
                type="checkbox"
                className="sr-only"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
              <ReminderCheck checked={settings.enabled} />
              <span>تفعيل التذكير اليدوي</span>
            </label>
            <label className="sx-trm-switch">
              <input
                type="checkbox"
                className="sr-only"
                checked={settings.autoRemindersEnabled}
                onChange={(e) => setSettings({ ...settings, autoRemindersEnabled: e.target.checked })}
              />
              <ReminderCheck checked={settings.autoRemindersEnabled} />
              <span>
                التذكير التلقائي لحساب ولي الأمر
                <small>
                  يُرسل إشعار الحساب تلقائياً عند تفعيل الجدولة (Cloud Scheduler). رسائل واتساب تُفتح يدوياً دائماً.
                </small>
              </span>
            </label>
          </div>
          <div className="sx-trm-settings-grid">
            {[
              { key: 'reminderStartAfterDays', label: 'بدء التذكير بعد (يوم)', min: 1 },
              { key: 'reminderRepeatEveryDays', label: 'تكرار كل (يوم)', min: 1 },
              { key: 'maxReminderCountBeforeWarning', label: 'عدد التذكيرات قبل التحذير', min: 1 },
              { key: 'restrictAfterDays', label: 'تقييد بعد (يوم تأخير)', min: 1 },
              { key: 'redWarningDurationDays', label: 'مدة التحذير الأحمر (يوم)', min: 1 },
              { key: 'upcomingDays', label: 'نافذة «قريباً» (يوم)', min: 1 },
            ].map((field) => (
              <label key={field.key} className="sx-trm-field">
                {field.label}
                <input
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  value={(settings as any)[field.key]}
                  onChange={(e) =>
                    setSettings({ ...settings, [field.key]: Number(e.target.value) || field.min })
                  }
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setShowSettings(false)} className="sx-trm-cta sx-trm-cta--ghost">
              إلغاء
            </button>
            <button type="button" onClick={saveSettings} className="sx-trm-cta sx-trm-cta--navy">
              حفظ الإعدادات
            </button>
          </div>
        </section>
      )}

      {restrictedParents.length > 0 && (
        <section className="sx-trm-panel sx-trm-panel--danger">
          <h3 className="sx-trm-panel__title">
            <ShieldOff size={18} aria-hidden /> حسابات أولياء أمور مقيّدة ({restrictedParents.length})
          </h3>
          {restrictedParents.map((p) => (
            <div key={p.parentId} className="sx-trm-restricted">
              <div className="min-w-0">
                <b>{p.name}</b>
                {p.email && <small>{p.email}</small>}
                {p.escalationLevel && <small>مستوى التصعيد: {p.escalationLevel}</small>}
              </div>
              <button type="button" onClick={() => handleRestore(p.parentId)} className="sx-trm-action">
                <ShieldCheck size={15} aria-hidden /> استعادة الوصول
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="sx-trm-panel">
        <div className="flex flex-col gap-3 mb-3">
          <div className="sx-trm-search">
            <Search size={17} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب، ولي الأمر، الصف أو المبلغ"
              aria-label="بحث في الأقساط"
            />
          </div>
          <ReminderFilterChips tabs={FILTER_TABS} value={filter} counts={filterCounts} onChange={setFilter} />
        </div>

        {parentsCount === 0 && eligibleRows.length > 0 && (
          <div className="sx-trm-notice mb-3">
            <AlertTriangle size={16} aria-hidden />
            <span>{TUITION_REMINDER_EMPTY_MESSAGES.noParentsWarning}</span>
          </div>
        )}

        {allLaterRows && displayRows.length > 0 && (
          <div className="sx-trm-notice sx-trm-notice--info mb-3">
            <Clock size={16} aria-hidden />
            <span>{TUITION_REMINDER_EMPTY_MESSAGES.allLaterDashboard}</span>
          </div>
        )}

        {IS_DEV && (
          <TuitionReminderDiagnosticPanel
            diagnostics={diagnostics}
            debugMode={debugMode}
            onDebugModeChange={setDebugMode}
          />
        )}

        {displayRows.length === 0 ? (
          <div className="sx-trm-empty">
            <span className="sx-trm-empty__icon" aria-hidden>
              <Inbox size={26} />
            </span>
            <p className="m-0">{emptyMessage || 'لا توجد أقساط في هذا التصنيف'}</p>
          </div>
        ) : (
          <div className="sx-trm-list sx-trm-list--wide">
            {displayRows.map((row) => (
              <TuitionReminderCard
                key={row.installmentId}
                row={row}
                extraMeta={
                  row.reminderCount > 0 ? (
                    <span className="sx-trm-meta">
                      <Bell size={14} aria-hidden />
                      {row.reminderCount} تذكير
                    </span>
                  ) : null
                }
                actions={
                  <>
                    {row.parentId && row.isRestricted ? (
                      <button
                        type="button"
                        title="استعادة صلاحيات ولي الأمر"
                        onClick={() => handleRestore(row.parentId!)}
                        className="sx-trm-action"
                      >
                        <ShieldCheck size={15} aria-hidden /> استعادة
                      </button>
                    ) : null}
                    {row.hasWhatsApp ? (
                      <button
                        type="button"
                        onClick={() => void handleWhatsApp(row)}
                        className="sx-trm-action sx-trm-action--wa"
                      >
                        <MessageCircle size={15} aria-hidden /> واتساب
                      </button>
                    ) : null}
                    {row.hasLinkedParent && row.parentId ? (
                      <button
                        type="button"
                        disabled={busyId === row.installmentId}
                        onClick={() => handleSend(row)}
                        className="sx-trm-action sx-trm-action--send"
                      >
                        <Bell size={15} aria-hidden />
                        {busyId === row.installmentId ? 'جاري…' : 'تذكير'}
                      </button>
                    ) : null}
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="sx-trm-panel">
        <h3 className="sx-trm-panel__title">
          <History size={18} aria-hidden /> سجل التذكيرات
        </h3>
        {logs.length === 0 ? (
          <p className="m-0 text-sm font-bold" style={{ color: 'var(--trm-muted)' }}>
            لم يُرسل أي تذكير بعد
          </p>
        ) : (
          <div className="sx-trm-log">
            {logs.map((log) => {
              const seconds = (log.createdAt as { seconds?: number } | undefined)?.seconds;
              const tone =
                log.deliveryResult === 'sent' || log.deliveryResult === 'restored'
                  ? 'ok'
                  : log.deliveryResult === 'failed'
                    ? 'bad'
                    : 'skip';
              return (
                <div key={log.id} className="sx-trm-log__row">
                  <span className={`sx-trm-log__dot sx-trm-log__dot--${tone}`} aria-hidden />
                  <span className="sx-trm-log__main">
                    {studentNames[log.studentId] || 'طالب'} · {LOG_RESULT_LABELS[log.deliveryResult] || log.deliveryResult}
                  </span>
                  <span>{LOG_CHANNEL_LABELS[log.channel] || log.channel}</span>
                  {seconds ? (
                    <span className="sx-trm-log__time">
                      {new Date(seconds * 1000).toLocaleDateString('ar-IQ-u-nu-latn', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

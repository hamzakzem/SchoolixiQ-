import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { X, Search, Send, MessageCircle, ChevronDown, AlertTriangle, Inbox, SlidersHorizontal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { AppModalPortal } from '../../components/AppModalPortal';
import {
  formatTuitionAmountLabel,
  tuitionParentsQuery,
  type TuitionReminderDisplayRow,
  type TuitionReminderFilterKey,
} from '../../lib/tuitionModel';
import { TUITION_REMINDER_EMPTY_MESSAGES } from '../../lib/tuitionReminderLabels';
import { useTuitionSchoolData } from '../../lib/useTuitionSchoolData';
import { useTuitionReminderRows } from '../../lib/useTuitionReminderRows';
import {
  buildTuitionWhatsAppMessage,
  buildWhatsAppUrl,
  getSchoolTuitionReminderSettings,
  logReminderAudit,
  logWhatsAppQueueCreated,
  sendTuitionReminder,
  DEFAULT_TUITION_REMINDER_SETTINGS,
  type TuitionReminderSettings,
} from '../../lib/tuitionReminderService';
import { TuitionReminderDiagnosticPanel } from '../../components/admin/tuition/TuitionReminderDiagnosticPanel';
import {
  ReminderCheck,
  ReminderFilterChips,
  TuitionReminderCard,
} from '../../components/admin/tuition/TuitionReminderCard';
import {
  logTuitionListenerError,
  logTuitionListenerSnapshot,
} from '../../lib/tuitionQueryDebug';

type SendSummary = {
  sent: number;
  whatsAppPrepared: number;
  skippedNoParent: number;
  skippedNoPhone: number;
  skippedDedup: number;
  failed: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const IS_DEV = import.meta.env.DEV;

const FILTER_TABS: { key: TuitionReminderFilterKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'overdue', label: 'متأخر' },
  { key: 'today', label: 'مستحق اليوم' },
  { key: 'soon', label: 'قريباً' },
  { key: 'no_parent', label: 'بدون ولي أمر' },
];

export function OverviewTuitionQuickReminder({ open, onClose }: Props) {
  const { profile, schoolData } = useAuth();
  const schoolId = profile?.schoolId || '';
  const schoolName = schoolData?.name || profile?.schoolName || 'المدرسة';

  const { students, installments, payments, loading, queryErrors: dataQueryErrors } = useTuitionSchoolData(open ? schoolId : undefined);
  const [parents, setParents] = useState<Record<string, any>>({});
  const [parentQueryError, setParentQueryError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [tracking, setTracking] = useState<Record<string, any>>({});
  const [settings, setSettings] = useState<TuitionReminderSettings>(DEFAULT_TUITION_REMINDER_SETTINGS);

  const [filter, setFilter] = useState<TuitionReminderFilterKey>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendLimit, setSendLimit] = useState(10);
  const [sending, setSending] = useState(false);
  const [waQueueIndex, setWaQueueIndex] = useState(-1);
  const [summary, setSummary] = useState<SendSummary | null>(null);

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderOpen, setSenderOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFilter('all');
    setSearch('');
    setSelected(new Set());
    setSenderName(profile?.displayName || profile?.name || '');
    setSenderEmail(profile?.email || '');
    setSummary(null);
    setWaQueueIndex(-1);
    setSenderOpen(false);
  }, [open, profile?.displayName, profile?.name, profile?.email]);

  useEffect(() => {
    if (!open || !schoolId) return;
    getSchoolTuitionReminderSettings(schoolId).then(setSettings);

    const unsubs = [
      onSnapshot(
        query(collection(db, 'tuition_reminder_tracking'), where('schoolId', '==', schoolId)),
        (snap) => {
          const map: Record<string, any> = {};
          snap.docs.forEach((d) => {
            const data = d.data();
            map[d.id] = {
              ...data,
              lastReminderAt: data.lastReminderAt?.toDate?.() ?? null,
            };
          });
          setTracking(map);
        },
      ),
      onSnapshot(tuitionParentsQuery(schoolId), (snap) => {
        logTuitionListenerSnapshot('TUITION_PARENTS', snap.size, snap.metadata.fromCache);
        const map: Record<string, any> = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setParents(map);
        setParentQueryError(null);
        if (snap.size === 0) {
          console.warn('[TuitionReminderDebug] PARENT_QUERY_EMPTY', { schoolId });
        }
      }, (error) => {
        logTuitionListenerError('TUITION_PARENTS', error);
        const err = error as { message?: string };
        setParentQueryError(err?.message || String(error));
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [open, schoolId]);

  const queryErrors = useMemo(() => {
    const merged = { ...dataQueryErrors };
    if (parentQueryError) merged.parents = parentQueryError;
    return merged;
  }, [dataQueryErrors, parentQueryError]);

  const { displayRows: filteredRows, eligibleRows, diagnostics } = useTuitionReminderRows({
    students,
    installments,
    payments,
    settings,
    tracking,
    parents,
    schoolId,
    filter,
    search,
    logContext: 'overview_quick_action',
    queryErrors,
    viewMode: 'overview',
  });

  const parentsCount = Object.keys(parents).length;

  const onlyLaterRows = useMemo(
    () =>
      eligibleRows.length > 0 &&
      eligibleRows.every((r) => r.bucket === 'later'),
    [eligibleRows],
  );

  const urgentRows = useMemo(
    () => eligibleRows.filter((r) => r.bucket !== 'later'),
    [eligibleRows],
  );

  useEffect(() => {
    if (!open) return;
    console.info('[OverviewTuitionQuickReminder] COUNTS', {
      totalRows: eligibleRows.length,
      overdue: eligibleRows.filter((r) => r.bucket === 'overdue').length,
      today: eligibleRows.filter((r) => r.bucket === 'today').length,
      soon: eligibleRows.filter((r) => r.bucket === 'soon').length,
      later: eligibleRows.filter((r) => r.bucket === 'later').length,
      noParent: urgentRows.filter((r) => !r.hasLinkedParent).length,
      afterOverviewFilter: urgentRows.length,
      afterSearch: filteredRows.length,
      activeFilter: filter,
      search,
    });
  }, [open, eligibleRows, urgentRows, filteredRows.length, filter, search]);

  const emptyMessage = useMemo(() => {
    if (onlyLaterRows) {
      return TUITION_REMINDER_EMPTY_MESSAGES.allLaterOverview;
    }
    if (filteredRows.length === 0 && urgentRows.length === 0) {
      return TUITION_REMINDER_EMPTY_MESSAGES.noRows;
    }
    if (filteredRows.length === 0) {
      return TUITION_REMINDER_EMPTY_MESSAGES.searchNoMatch;
    }
    return '';
  }, [onlyLaterRows, filteredRows.length, urgentRows.length]);

  const filterCounts = useMemo(() => {
    const rows = urgentRows;
    return {
      all: rows.length,
      overdue: rows.filter((r) => r.bucket === 'overdue').length,
      today: rows.filter((r) => r.bucket === 'today').length,
      soon: rows.filter((r) => r.bucket === 'soon').length,
      no_parent: rows.filter((r) => !r.hasLinkedParent).length,
    };
  }, [urgentRows]);

  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(filteredRows.map((r) => r.installmentId));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredRows]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.installmentId)));
    }
  };

  const selectedRows = useMemo(
    () => filteredRows.filter((r) => selected.has(r.installmentId)),
    [filteredRows, selected],
  );

  const whatsAppQueue = useMemo(
    () => selectedRows.filter((r) => r.hasWhatsApp),
    [selectedRows],
  );

  const handleWhatsApp = async (row: TuitionReminderDisplayRow, logAudit = true) => {
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
      source: 'overview_quick_action',
    });
    if (logAudit && profile?.uid) {
      await logReminderAudit({
        schoolId,
        studentId: row.studentId,
        installmentId: row.installmentId,
        parentId: row.parentId,
        sentBy: profile.uid,
        sentByName: senderName || profile.displayName || profile.name,
        senderEmail: senderEmail || profile.email,
        senderRole: profile.role,
        senderUid: profile.uid,
        sentFrom: 'admin_overview_quick_action',
        source: 'overview_quick_action',
        channel: 'whatsapp_link',
        deliveryResult: 'sent',
        amount: row.amount,
        dueDate: row.dueDate.toISOString(),
        messagePreview: `WhatsApp link opened for ${row.studentName}`,
      });
    }
  };

  const openNextWhatsApp = () => {
    if (whatsAppQueue.length === 0) {
      toast.error('لا توجد أرقام واتساب في التحديد');
      return;
    }
    const nextIndex = waQueueIndex < 0 ? 0 : waQueueIndex + 1;
    if (nextIndex >= whatsAppQueue.length) {
      toast('انتهت قائمة واتساب', { icon: 'ℹ️' });
      setWaQueueIndex(-1);
      return;
    }
    setWaQueueIndex(nextIndex);
    void handleWhatsApp(whatsAppQueue[nextIndex], true);
  };

  const handleBulkSend = async () => {
    if (!profile?.uid || !schoolId || sending) return;
    if (!senderName.trim()) {
      toast.error('يرجى إدخال اسم المرسل');
      return;
    }

    const targets = selectedRows.slice(0, Math.max(1, sendLimit));
    if (targets.length === 0) {
      toast.error('حدد صفاً واحداً على الأقل');
      return;
    }

    setSending(true);
    setSummary(null);
    const result: SendSummary = {
      sent: 0,
      whatsAppPrepared: whatsAppQueue.length,
      skippedNoParent: 0,
      skippedNoPhone: selectedRows.filter((r) => !r.hasWhatsApp).length,
      skippedDedup: 0,
      failed: 0,
    };

    try {
      for (const row of targets) {
        const student = students.find((s) => s.id === row.studentId);
        const sendResult = await sendTuitionReminder({
          schoolId,
          schoolName,
          student: student || { id: row.studentId, name: row.studentName, parentPhone: row.parentPhone },
          installment: { id: row.installmentId, amount: row.amount, dueDate: row.dueDate },
          senderId: profile.uid,
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim() || profile.email,
          senderRole: profile.role,
          metadataSource: 'overview_quick_action',
          sentFrom: 'admin_overview_quick_action',
          channel: 'notification',
        });

        if (sendResult === 'sent') result.sent++;
        else if (sendResult === 'no_parent') result.skippedNoParent++;
        else if (sendResult === 'skipped_dedup') result.skippedDedup++;
        else result.failed++;
      }

      setSummary(result);
      toast.success(`تم إرسال ${result.sent} تنبيه لحساب ولي الأمر`);
    } catch {
      toast.error('فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  const allSelected = filteredRows.length > 0 && selected.size === filteredRows.length;
  const sendCount = Math.min(selected.size, sendLimit);
  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, r) => sum + (r.amount || 0), 0),
    [selectedRows],
  );

  return (
    <AppModalPortal
      open={open}
      onClose={onClose}
      dir="rtl"
      size="xl"
      ariaLabel="إرسال تنبيهات الأقساط"
    >
      <div className="sx-app-modal-panel__header">
        <div>
          <h2 className="sx-app-modal-panel__title">إرسال تنبيهات الأقساط</h2>
          <p className="sx-app-modal-panel__subtitle">
            القسط الحالي غير المدفوع لكل طالب — حدّد من تريد تذكيره
          </p>
        </div>
        <button
          type="button"
          className="sx-app-modal-panel__close"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>
      </div>

      <div className="sx-app-modal-panel__body sx-trm sx-trm-modal-body flex flex-col">
        <div className="sx-trm-modal-tools">
          <div className="sx-trm-search">
            <Search size={17} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب، الصف، ولي الأمر أو الهاتف"
              aria-label="بحث في الأقساط"
            />
          </div>

          <ReminderFilterChips
            tabs={FILTER_TABS}
            value={filter}
            counts={filterCounts}
            onChange={setFilter}
          />

          <div className={`sx-trm-sender${senderOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="sx-trm-sender__toggle"
              onClick={() => setSenderOpen((v) => !v)}
              aria-expanded={senderOpen}
            >
              <span className="sx-trm-sender__icon" aria-hidden>
                <SlidersHorizontal size={16} />
              </span>
              <span className="sx-trm-sender__copy">
                <span className="sx-trm-sender__title">إعدادات الإرسال</span>
                <span className="sx-trm-sender__summary">
                  {senderName || 'بدون اسم مرسل'} · حتى {sendLimit} حساب في المرة
                </span>
              </span>
              <ChevronDown size={18} className="sx-trm-sender__chev" aria-hidden />
            </button>
            {senderOpen ? (
              <div className="sx-trm-sender__fields">
                <label className="sx-trm-field">
                  اسم المرسل
                  <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                </label>
                <label className="sx-trm-field">
                  بريد المرسل
                  <input
                    type="email"
                    dir="ltr"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </label>
                <label className="sx-trm-field">
                  الحد الأقصى للإرسال
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={sendLimit}
                    onChange={(e) => setSendLimit(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sx-trm-modal-list">
          {parentsCount === 0 && eligibleRows.length > 0 && (
            <div className="sx-trm-notice mb-3">
              <AlertTriangle size={16} aria-hidden />
              <span>{TUITION_REMINDER_EMPTY_MESSAGES.noParentsWarning}</span>
            </div>
          )}

          {IS_DEV && (
            <TuitionReminderDiagnosticPanel
              diagnostics={diagnostics}
              debugMode={debugMode}
              onDebugModeChange={setDebugMode}
            />
          )}

          {loading ? (
            <div className="sx-trm-list" aria-busy="true">
              {[0, 1, 2].map((k) => (
                <div key={k} className="sx-trm-skeleton" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="sx-trm-empty">
              <span className="sx-trm-empty__icon" aria-hidden>
                <Inbox size={26} />
              </span>
              <p className="m-0">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="sx-trm-selectbar">
                <button
                  type="button"
                  className="sx-trm-selectbar__all"
                  onClick={toggleAllVisible}
                  aria-pressed={allSelected}
                >
                  <ReminderCheck checked={allSelected} mixed={selected.size > 0 && !allSelected} />
                  تحديد الكل ({filteredRows.length})
                </button>
                <span className="sx-trm-selectbar__info">
                  {selected.size > 0 ? (
                    <>
                      <strong>{selected.size}</strong> محدد · <strong>{formatTuitionAmountLabel(selectedTotal)}</strong> د.ع
                    </>
                  ) : (
                    'اضغط على البطاقة لتحديدها'
                  )}
                </span>
              </div>

              <div className="sx-trm-list">
                {filteredRows.map((row) => (
                  <TuitionReminderCard
                    key={row.installmentId}
                    row={row}
                    selectable
                    selected={selected.has(row.installmentId)}
                    onToggle={() => toggleRow(row.installmentId)}
                    actions={
                      row.hasWhatsApp ? (
                        <button
                          type="button"
                          className="sx-trm-action sx-trm-action--wa"
                          onClick={() => void handleWhatsApp(row)}
                        >
                          <MessageCircle size={15} aria-hidden />
                          واتساب
                        </button>
                      ) : null
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="sx-app-modal-panel__footer sx-trm sx-trm-modal-foot">
        {summary && (
          <div className="sx-trm-result" role="status">
            <div className="sx-trm-result__item sx-trm-result__item--ok">
              <b>{summary.sent}</b>
              <span>أُرسل لحساب ولي الأمر</span>
            </div>
            <div className="sx-trm-result__item">
              <b>{summary.whatsAppPrepared}</b>
              <span>روابط واتساب جاهزة</span>
            </div>
            <div className="sx-trm-result__item">
              <b>{summary.skippedNoParent + summary.skippedDedup}</b>
              <span>تم تخطيه</span>
            </div>
            {summary.failed > 0 ? (
              <div className="sx-trm-result__item sx-trm-result__item--bad">
                <b>{summary.failed}</b>
                <span>فشل</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="sx-trm-modal-foot__row">
          <button
            type="button"
            disabled={sending || selected.size === 0}
            onClick={() => void handleBulkSend()}
            className="sx-trm-cta sx-trm-cta--primary"
          >
            <Send size={17} aria-hidden />
            {sending
              ? 'جاري الإرسال…'
              : selected.size > 0
                ? `إرسال التنبيه (${sendCount})`
                : 'حدّد طلاباً للإرسال'}
          </button>
          <button
            type="button"
            disabled={whatsAppQueue.length === 0}
            onClick={openNextWhatsApp}
            className="sx-trm-cta sx-trm-cta--wa"
            title="يفتح محادثة واتساب لكل ولي أمر محدد واحداً تلو الآخر"
          >
            <MessageCircle size={17} aria-hidden />
            {waQueueIndex >= 0
              ? `التالي ${waQueueIndex + 1}/${whatsAppQueue.length}`
              : `واتساب${whatsAppQueue.length ? ` (${whatsAppQueue.length})` : ''}`}
          </button>
        </div>
      </div>
    </AppModalPortal>
  );
}

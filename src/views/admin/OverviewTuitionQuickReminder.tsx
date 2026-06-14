import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { X, Search, Send, MessageCircle, ExternalLink, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import {
  buildReminderDashboardRows,
  formatTuitionAmountLabel,
  formatTuitionDueLabel,
  isValidWhatsAppPhone,
  resolveLinkedParentFromCache,
  resolveParentPhone,
  tuitionParentsQuery,
  type ReminderBucket,
} from '../../lib/tuitionModel';
import { useTuitionSchoolData } from '../../lib/useTuitionSchoolData';
import {
  buildTuitionWhatsAppMessage,
  buildWhatsAppUrl,
  getSchoolTuitionReminderSettings,
  logReminderAudit,
  sendOverviewQuickActionReminder,
  DEFAULT_TUITION_REMINDER_SETTINGS,
  type TuitionReminderSettings,
} from '../../lib/tuitionReminderService';

const ACTIONABLE_BUCKETS: ReminderBucket[] = ['overdue', 'today', 'soon'];

type FilterKey = 'all' | 'overdue' | 'today' | 'soon';

type QuickRow = {
  installmentId: string;
  studentId: string;
  studentName: string;
  className: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  parentId?: string;
  amount: number;
  dueDate: Date;
  delayDays: number;
  bucket: ReminderBucket;
  lastReminderAt: Date | null;
  linkedParentLabel: string;
  whatsAppLabel: string;
  hasWhatsApp: boolean;
  statusLabel: string;
};

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

function bucketLabel(bucket: ReminderBucket): string {
  if (bucket === 'overdue') return 'متأخر';
  if (bucket === 'today') return 'مستحق اليوم';
  if (bucket === 'soon') return 'قريباً';
  return bucket;
}

export function OverviewTuitionQuickReminder({ open, onClose }: Props) {
  const { profile, schoolData } = useAuth();
  const schoolId = profile?.schoolId || '';
  const schoolName = schoolData?.name || profile?.schoolName || 'المدرسة';

  const { students, installments, loading } = useTuitionSchoolData(open ? schoolId : undefined);
  const [parents, setParents] = useState<Record<string, any>>({});
  const [tracking, setTracking] = useState<Record<string, any>>({});
  const [settings, setSettings] = useState<TuitionReminderSettings>(DEFAULT_TUITION_REMINDER_SETTINGS);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sendLimit, setSendLimit] = useState(10);
  const [sending, setSending] = useState(false);
  const [waQueueIndex, setWaQueueIndex] = useState(-1);
  const [summary, setSummary] = useState<SendSummary | null>(null);

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    setSenderName(profile?.displayName || profile?.name || '');
    setSenderEmail(profile?.email || '');
    setSummary(null);
    setWaQueueIndex(-1);
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
            map[d.id] = { id: d.id, ...d.data() };
          });
          setTracking(map);
        },
      ),
      onSnapshot(tuitionParentsQuery(schoolId), (snap) => {
        const map: Record<string, any> = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setParents(map);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [open, schoolId]);

  const rows: QuickRow[] = useMemo(() => {
    const upcomingDays = Math.max(1, settings.daysBeforeEscalation || 7);
    const baseRows = buildReminderDashboardRows(installments, students, upcomingDays).filter((row) =>
      ACTIONABLE_BUCKETS.includes(row.bucket),
    );

    return baseRows.map((row) => {
      const trackKey = `${schoolId}_${row.studentId}_${row.installmentId}`;
      const track = tracking[trackKey] || tracking[`${schoolId}_${row.studentId}`] || {};
      const { parentId, parent } = resolveLinkedParentFromCache(row.student, parents);
      const parentPhone = resolveParentPhone(row.student, parent);
      const hasWhatsApp = isValidWhatsAppPhone(parentPhone);
      const parentEmail = String(row.student?.parentEmail || parent?.email || '').trim();
      const className = String(row.student?.class || '—');

      return {
        installmentId: row.installmentId,
        studentId: row.studentId,
        studentName: row.studentName,
        className,
        parentName: parent?.displayName || parent?.name || '—',
        parentEmail,
        parentPhone,
        parentId,
        amount: row.amount,
        dueDate: row.dueDate,
        delayDays: row.delayDays,
        bucket: row.bucket,
        lastReminderAt: track.lastReminderAt?.toDate?.() ?? null,
        linkedParentLabel: parentId ? 'مرتبط' : 'لا يوجد ولي أمر مرتبط',
        whatsAppLabel: hasWhatsApp ? 'متاح' : 'لا يوجد رقم واتساب',
        hasWhatsApp,
        statusLabel:
          row.bucket === 'overdue'
            ? `متأخر ${row.delayDays} يوم`
            : bucketLabel(row.bucket),
      };
    });
  }, [installments, students, tracking, parents, schoolId, settings.daysBeforeEscalation]);

  const filteredRows = useMemo(() => {
    let list = filter === 'all' ? rows : rows.filter((r) => r.bucket === filter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => {
      const amountStr = String(r.amount);
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.parentName.toLowerCase().includes(q) ||
        r.parentEmail.toLowerCase().includes(q) ||
        r.parentPhone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        amountStr.includes(q)
      );
    });
  }, [rows, filter, search]);

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

  const handleWhatsApp = async (row: QuickRow, logAudit = true) => {
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
        sentFrom: 'admin_overview_quick_action',
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
        const sendResult = await sendOverviewQuickActionReminder({
          schoolId,
          schoolName,
          student: student || { id: row.studentId, name: row.studentName, parentPhone: row.parentPhone },
          installment: { id: row.installmentId, amount: row.amount, dueDate: row.dueDate },
          senderId: profile.uid,
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim() || profile.email,
          senderRole: profile.role,
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

  const filterTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: rows.length },
    { key: 'overdue', label: 'متأخر', count: rows.filter((r) => r.bucket === 'overdue').length },
    { key: 'today', label: 'مستحق اليوم', count: rows.filter((r) => r.bucket === 'today').length },
    { key: 'soon', label: 'قريباً', count: rows.filter((r) => r.bucket === 'soon').length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            dir="rtl"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">إرسال تنبيهات الأقساط</h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  يعرض فقط الأقساط المتأخرة أو المستحقة أو القريبة من الاستحقاق
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-4 shrink-0">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث: اسم الطالب، الصف، هاتف ولي الأمر، البريد، المبلغ..."
                  className="w-full h-11 pr-11 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      filter === tab.key
                        ? 'bg-[#0B2345] text-white border-[#0B2345]'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="text-xs font-bold text-slate-500">
                  اسم المرسل
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  بريد المرسل
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  عدد الحسابات المراد إرسال التنبيه لها
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={sendLimit}
                    onChange={(e) => setSendLimit(Math.max(1, Number(e.target.value) || 1))}
                    className="mt-1 w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-slate-800"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && selected.size === filteredRows.length}
                    onChange={toggleAllVisible}
                    className="rounded border-slate-300"
                  />
                  تحديد الكل ({filteredRows.length})
                </label>
                <span className="text-xs font-bold text-slate-400">
                  محدد: {selected.size} — سيُرسل لـ {Math.min(selected.size, sendLimit)} كحد أقصى
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              {loading ? (
                <p className="text-center text-slate-500 font-bold py-12">جاري تحميل الأقساط...</p>
              ) : filteredRows.length === 0 ? (
                <div className="text-center py-16">
                  <AlertTriangle className="mx-auto text-slate-300 mb-3" size={32} />
                  <p className="font-bold text-slate-500">لا توجد أقساط متأخرة أو مستحقة أو قريبة حالياً</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[960px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] font-bold uppercase">
                        <th className="px-2 py-3 text-right w-10" />
                        <th className="px-3 py-3 text-right">الطالب / الصف</th>
                        <th className="px-3 py-3 text-right">ولي الأمر</th>
                        <th className="px-3 py-3 text-right">الهاتف</th>
                        <th className="px-3 py-3 text-right">المبلغ</th>
                        <th className="px-3 py-3 text-right">الاستحقاق</th>
                        <th className="px-3 py-3 text-right">الحالة</th>
                        <th className="px-3 py-3 text-right">آخر تذكير</th>
                        <th className="px-3 py-3 text-right">ولي مرتبط</th>
                        <th className="px-3 py-3 text-right">واتساب</th>
                        <th className="px-3 py-3 text-right">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr
                          key={row.installmentId}
                          className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-2 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(row.installmentId)}
                              onChange={() => toggleRow(row.installmentId)}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-black text-slate-900 dark:text-white">{row.studentName}</p>
                            <p className="text-xs text-slate-500">{row.className}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-700 dark:text-slate-200">{row.parentName}</p>
                            {row.parentEmail && (
                              <p className="text-xs text-slate-500 truncate max-w-[140px]">{row.parentEmail}</p>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">{row.parentPhone || '—'}</td>
                          <td className="px-3 py-3 font-black text-slate-900 dark:text-white">
                            {formatTuitionAmountLabel(row.amount)} د.ع
                          </td>
                          <td className="px-3 py-3 text-xs font-bold">{formatTuitionDueLabel(row.dueDate)}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`text-[10px] font-black px-2 py-1 rounded-full ${
                                row.bucket === 'overdue'
                                  ? 'bg-rose-100 text-rose-700'
                                  : row.bucket === 'today'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {row.statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-500">
                            {row.lastReminderAt
                              ? row.lastReminderAt.toLocaleDateString('ar-IQ')
                              : '—'}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold">
                            <span className={row.parentId ? 'text-emerald-600' : 'text-rose-600'}>
                              {row.linkedParentLabel}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs font-bold">
                            <span className={row.hasWhatsApp ? 'text-emerald-600' : 'text-slate-400'}>
                              {row.whatsAppLabel}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {row.hasWhatsApp && (
                              <button
                                type="button"
                                onClick={() => void handleWhatsApp(row)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100"
                              >
                                <MessageCircle size={14} />
                                واتساب
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-4">
              {summary && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <span>إرسال لحساب ولي الأمر: {summary.sent}</span>
                  <span>روابط واتساب جاهزة: {summary.whatsAppPrepared}</span>
                  <span>تخطي — لا ولي مرتبط: {summary.skippedNoParent}</span>
                  <span>تخطي — لا هاتف: {summary.skippedNoPhone}</span>
                  <span>تخطي — مكرر: {summary.skippedDedup}</span>
                  <span>فشل: {summary.failed}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={whatsAppQueue.length === 0}
                    onClick={openNextWhatsApp}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 font-bold text-sm disabled:opacity-40"
                  >
                    <ExternalLink size={16} />
                    {waQueueIndex >= 0
                      ? `واتساب (${waQueueIndex + 1}/${whatsAppQueue.length})`
                      : 'فتح قائمة واتساب'}
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm"
                  >
                    إغلاق
                  </button>
                  <button
                    type="button"
                    disabled={sending || selected.size === 0}
                    onClick={() => void handleBulkSend()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-black text-sm disabled:opacity-50"
                  >
                    <Send size={16} />
                    {sending ? 'جاري الإرسال...' : 'إرسال المحدد'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { isPackageFeatureEnabled } from '../../lib/featureRegistry';
import { useLanguage } from '../../lib/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserX,
  Wallet,
  AlertTriangle,
  TrendingDown,
  Bell,
  CheckCircle2,
  X,
  Printer,
  Trash2,
  ShoppingBag,
  Send,
  Clock,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { notificationService } from '../../lib/notificationService';
import { fetchStudentLinkFields } from '../../lib/schoolSync';
import {
  buildDailyStudentRecords,
  getTodayDateStr,
  parseDueDate,
  type DailyStudentRecord,
} from '../../lib/dailySummaryUtils';

type ModalType = 'present' | 'absent' | 'market' | null;

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  present: { ar: 'حاضر', en: 'Present', color: 'bg-emerald-100 text-emerald-700' },
  absent: { ar: 'غائب', en: 'Absent', color: 'bg-rose-100 text-rose-700' },
  late: { ar: 'متأخر', en: 'Late', color: 'bg-amber-100 text-amber-700' },
  leave: { ar: 'إجازة', en: 'Leave', color: 'bg-blue-100 text-blue-700' },
};

type SummaryTone = 'emerald' | 'rose' | 'indigo' | 'red' | 'orange';

const SUMMARY_TONE_STYLES: Record<
  SummaryTone,
  { card: string; badge: string; icon: string; value: string }
> = {
  emerald: {
    card: 'bg-white dark:bg-slate-900 border-emerald-100/80 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    icon: 'text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  rose: {
    card: 'bg-white dark:bg-slate-900 border-rose-100/80 dark:border-rose-900/30 hover:border-rose-200 dark:hover:border-rose-800',
    badge: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400',
    icon: 'text-rose-600 dark:text-rose-400',
    value: 'text-rose-700 dark:text-rose-300',
  },
  indigo: {
    card: 'bg-white dark:bg-slate-900 border-indigo-100/80 dark:border-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-800',
    badge: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    icon: 'text-indigo-600 dark:text-indigo-400',
    value: 'text-indigo-700 dark:text-indigo-300',
  },
  red: {
    card: 'bg-white dark:bg-slate-900 border-red-100/80 dark:border-red-900/30',
    badge: 'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-300',
  },
  orange: {
    card: 'bg-white dark:bg-slate-900 border-orange-100/80 dark:border-orange-900/30',
    badge: 'bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900/40 text-orange-600 dark:text-orange-400',
    icon: 'text-orange-600 dark:text-orange-400',
    value: 'text-orange-700 dark:text-orange-300',
  },
};

function SummaryStatCard({
  label,
  value,
  emptyHint,
  icon: Icon,
  tone,
  unit = '',
  formatNumber = false,
  onClick,
  isRtl,
  className = '',
}: {
  label: string;
  value: number | null;
  emptyHint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: SummaryTone;
  unit?: string;
  formatNumber?: boolean;
  onClick?: () => void;
  isRtl: boolean;
  className?: string;
}) {
  const styles = SUMMARY_TONE_STYLES[tone];
  const isZero = value === 0;
  const displayValue =
    value === null ? '—' : formatNumber ? value.toLocaleString() : String(value);
  const isInteractive = Boolean(onClick);
  const Wrapper = isInteractive ? 'button' : 'div';

  return (
    <Wrapper
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={`p-4 md:p-5 rounded-2xl border shadow-sm flex flex-col text-right transition-all ${styles.card} ${className} ${
        isInteractive
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300'
          : ''
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${styles.badge}`}
        >
          <Icon size={17} className={styles.icon} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 min-h-[2.25rem]">
        <span
          className={`text-2xl md:text-3xl font-black tabular-nums ${isZero ? 'text-slate-300 dark:text-slate-600' : styles.value}`}
        >
          {displayValue}
        </span>
        {unit ? (
          <span className="text-[10px] font-bold text-slate-400 shrink-0">{unit}</span>
        ) : null}
      </div>
      <p className={`text-[10px] font-bold mt-2 ${isZero ? 'text-slate-400' : 'text-slate-400/80'}`}>
        {isZero ? emptyHint : isRtl ? 'محدّث اليوم' : 'Updated today'}
      </p>
    </Wrapper>
  );
}

function StudentAttendanceCard({
  student,
  isRtl,
}: {
  student: DailyStudentRecord;
  isRtl: boolean;
}) {
  const statusMeta = STATUS_LABELS[student.status] || STATUS_LABELS.present;
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center font-black text-slate-400">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt={student.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          student.name[0]
        )}
      </div>
      <div className="flex-1 min-w-0 text-right" dir={isRtl ? 'rtl' : 'ltr'}>
        <p className="font-black text-slate-900 dark:text-white truncate">{student.name}</p>
        <p className="text-xs font-bold text-slate-500 mt-0.5">{student.className}</p>
      </div>
      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full shrink-0 ${statusMeta.color}`}>
        {isRtl ? statusMeta.ar : statusMeta.en}
      </span>
    </div>
  );
}

type DailySummaryProps = {
  onGoToAttendance?: () => void;
};

export default function DailySummary({ onGoToAttendance }: DailySummaryProps) {
  const { profile, schoolData } = useAuth();
  const isSchoolAdmin = profile?.role === 'admin';
  const { t, isRtl } = useLanguage();
  const perms = schoolData?.packagePermissions || profile?.permissions;
  const hasDailySummary =
    perms && typeof perms === 'object' && !Array.isArray(perms)
      ? isPackageFeatureEnabled('daily_summary', perms)
      : true;
  const hasMarketplace =
    perms && typeof perms === 'object' && !Array.isArray(perms)
      ? isPackageFeatureEnabled('marketplace_ordering', perms)
      : true;

  const printRef = useRef<HTMLDivElement>(null);
  const todayStr = getTodayDateStr();

  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [deletingAttendance, setDeletingAttendance] = useState(false);
  const [showDangerDelete, setShowDangerDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const closeAttendanceModal = () => {
    setActiveModal(null);
    setShowDangerDelete(false);
    setDeleteConfirmText('');
  };

  const [attendanceDocs, setAttendanceDocs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [marketOrders, setMarketOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.schoolId || !hasDailySummary) {
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];
    const schoolId = profile.schoolId;

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'attendance'),
          where('schoolId', '==', schoolId),
          where('date', '==', todayStr),
        ),
        (snap) => {
          setAttendanceDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        () => setLoading(false),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'students'), where('schoolId', '==', schoolId)),
        (snap) => setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'classes'), where('schoolId', '==', schoolId)),
        (snap) => setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'installments'), where('schoolId', '==', schoolId)),
        (snap) => setInstallments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'inventory'), where('schoolId', '==', schoolId)),
        (snap) => setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
    );

    if (hasMarketplace) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      unsubs.push(
        onSnapshot(
          query(
            collection(db, 'orders'),
            where('schoolId', '==', schoolId),
            where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
            where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
          ),
          (snap) => setMarketOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          () => {
            getDocs(
              query(collection(db, 'orders'), where('schoolId', '==', schoolId)),
            ).then((fallback) => {
              const filtered = fallback.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((o: any) => {
                  const created = o.createdAt?.toDate?.() || new Date(0);
                  return created >= startOfDay && created <= endOfDay;
                });
              setMarketOrders(filtered);
            });
          },
        ),
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [profile?.schoolId, hasDailySummary, hasMarketplace, todayStr]);

  const studentsById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const classesById = useMemo(() => {
    const map = new Map<string, string>();
    classes.forEach((c) => map.set(c.id, c.name || c.id));
    return map;
  }, [classes]);

  const allRecords = useMemo(
    () =>
      buildDailyStudentRecords(
        attendanceDocs.map((d) => ({
          id: d.id,
          data: () => d,
        })),
        studentsById,
        classesById,
      ),
    [attendanceDocs, studentsById, classesById],
  );

  const presentStudents = useMemo(
    () => allRecords.filter((r) => r.status === 'present'),
    [allRecords],
  );

  const absentStudents = useMemo(
    () => allRecords.filter((r) => r.status === 'absent' || r.status === 'late'),
    [allRecords],
  );

  const marketCollectedToday = useMemo(
    () =>
      marketOrders
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [marketOrders],
  );

  const completedMarketOrders = useMemo(
    () => marketOrders.filter((o) => o.status === 'completed'),
    [marketOrders],
  );

  const delayedStats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    let delayedTotal = 0;
    let delayedCount = 0;
    installments.forEach((inst) => {
      if (inst.status === 'paid') return;
      const due = parseDueDate(inst.dueDate);
      if (due < startOfDay) {
        delayedTotal += Number(inst.amount) || 0;
        delayedCount++;
      }
    });
    return { delayedTotal, delayedCount };
  }, [installments]);

  const lowInventory = useMemo(
    () => inventory.filter((i) => (Number(i.quantity) ?? Number(i.stock) ?? 0) < 5).length,
    [inventory],
  );

  const stats = {
    presentToday: presentStudents.length,
    absentToday: absentStudents.length,
    collectedToday: marketCollectedToday,
    delayedTuition: delayedStats.delayedTotal,
    lowInventory,
    delayedCount: delayedStats.delayedCount,
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="rtl"><head><title>${isRtl ? 'سجل الحضور' : 'Attendance'}</title>
      <style>body{font-family:sans-serif;padding:24px} .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .card{border:1px solid #e2e8f0;padding:12px;border-radius:12px}</style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleGoToAttendanceCorrection = () => {
    closeAttendanceModal();
    onGoToAttendance?.();
    toast.success(
      isRtl
        ? 'انتقل إلى تبويب الحضور والغياب لتصحيح السجل الرسمي'
        : 'Open the Attendance tab to correct the official record',
    );
  };

  const handleDangerDeleteTodayAttendance = async () => {
    if (!isSchoolAdmin) {
      toast.error(isRtl ? 'الحذف متاح لمدير المدرسة فقط' : 'Only school admin can delete');
      return;
    }
    if (!profile?.schoolId || attendanceDocs.length === 0) return;
    if (deleteConfirmText.trim() !== (isRtl ? 'حذف' : 'DELETE')) {
      toast.error(
        isRtl
          ? 'اكتب «حذف» للتأكيد'
          : 'Type DELETE to confirm',
      );
      return;
    }

    setDeletingAttendance(true);
    try {
      await Promise.all(
        attendanceDocs.map((d) => deleteDoc(doc(db, 'attendance', d.id))),
      );
      toast.success(
        isRtl
          ? 'تم حذف سجل الحضور والغياب لليوم من قاعدة البيانات'
          : 'Today\'s attendance records were permanently deleted',
      );
      closeAttendanceModal();
    } catch {
      toast.error(isRtl ? 'فشل الحذف' : 'Delete failed');
    } finally {
      setDeletingAttendance(false);
    }
  };

  const sendInstallmentAlerts = async () => {
    if (!profile?.schoolId) return;
    setSendingAlerts(true);
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);
    let sent = 0;

    try {
      const studentsMap = new Map(students.map((s) => [s.id, s]));

      for (const inst of installments) {
        if (inst.status === 'paid') continue;
        const due = parseDueDate(inst.dueDate);
        const isOverdue = due < now;
        const isDueSoon = due >= now && due <= weekAhead;
        if (!isOverdue && !isDueSoon) continue;

        const student = studentsMap.get(inst.studentId);
        if (!student) continue;

        const link = await fetchStudentLinkFields(inst.studentId);
        if (!link?.parentIds?.length) continue;

        const dueLabel = due.toLocaleDateString(isRtl ? 'ar-IQ' : 'en-US');
        const title = isOverdue
          ? isRtl
            ? 'تنبيه: قسط متأخر'
            : 'Installment overdue'
          : isRtl
            ? 'تنبيه: استحقاق قسط'
            : 'Installment due soon';

        const message = isOverdue
          ? isRtl
            ? `نود تذكيركم بتأخر سداد قسط الطالب ${student.name} بمبلغ ${Number(inst.amount).toLocaleString()} د.ع (كان مستحقاً ${dueLabel}).`
            : `Installment for ${student.name} of ${Number(inst.amount).toLocaleString()} IQD was due on ${dueLabel}.`
          : isRtl
            ? `قسط الطالب ${student.name} بمبلغ ${Number(inst.amount).toLocaleString()} د.ع مستحق بتاريخ ${dueLabel}.`
            : `Installment for ${student.name} of ${Number(inst.amount).toLocaleString()} IQD is due on ${dueLabel}.`;

        await notificationService.notifyStudentParents(inst.studentId, {
          title,
          message,
          type: 'payment',
          schoolId: profile.schoolId,
          metadata: {
            banner: true,
            installmentAlert: true,
            installmentId: inst.id,
            studentId: inst.studentId,
            sourceId: `installment_alert_${inst.id}_${todayStr}`,
          },
        });
        sent++;
      }

      toast.success(
        isRtl
          ? `تم إرسال ${sent} تنبيه لأولياء الأمور`
          : `Sent ${sent} parent alerts`,
      );
    } catch {
      toast.error(isRtl ? 'فشل إرسال التنبيهات' : 'Failed to send alerts');
    } finally {
      setSendingAlerts(false);
    }
  };

  if (!hasDailySummary) return null;

  const totalStudents = stats.presentToday + stats.absentToday;
  const absenceRate = totalStudents > 0 ? (stats.absentToday / totalStudents) * 100 : 0;

  const alerts: { type: string; text: string; priority: number }[] = [];
  if (absenceRate > 15) {
    alerts.push({
      type: 'absence',
      text: isRtl
        ? `نسبة الغياب اليوم مرتفعة (${Math.round(absenceRate)}٪)`
        : `High absence rate today (${Math.round(absenceRate)}%)`,
      priority: 2,
    });
  }
  if (stats.delayedCount > 0) {
    alerts.push({
      type: 'delayed',
      text: isRtl
        ? `يوجد ${stats.delayedCount} أقساط متأخرة`
        : `${stats.delayedCount} overdue installments`,
      priority: 1,
    });
  }
  if (stats.lowInventory > 0) {
    alerts.push({
      type: 'inventory',
      text: isRtl
        ? `${stats.lowInventory} مواد بمخزون منخفض`
        : `${stats.lowInventory} low stock items`,
      priority: 3,
    });
  }
  alerts.sort((a, b) => a.priority - b.priority);

  const modalStudents =
    activeModal === 'present'
      ? presentStudents
      : activeModal === 'absent'
        ? absentStudents
        : [];

  const modalTitle =
    activeModal === 'present'
      ? isRtl
        ? 'الطلاب الحاضرون اليوم'
        : 'Present Students Today'
      : activeModal === 'absent'
        ? isRtl
          ? 'الطلاب الغائبون اليوم'
          : 'Absent Students Today'
        : activeModal === 'market'
          ? isRtl
            ? 'محصل المتجر المدرسي اليوم'
            : 'School Store Collection Today'
          : '';

  const formattedToday = new Date().toLocaleDateString(isRtl ? 'ar-IQ' : 'en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-500 mb-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-l from-amber-400 via-amber-500 to-slate-900" />
        <div className="px-5 py-5 md:px-6 md:py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                <Clock size={12} className="text-amber-600" />
                {formattedToday}
              </span>
              {!loading && totalStudents > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                  {isRtl ? `${totalStudents} طالب مسجّل اليوم` : `${totalStudents} students tracked today`}
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-display">
              {isRtl ? 'ملخص المدرسة اليوم' : 'Daily School Summary'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-xl">
              {isRtl
                ? 'نظرة مباشرة على الحضور والغياب والمتأخرات ومبيعات المتجر لهذا اليوم'
                : 'Live view of attendance, arrears, and store activity for today'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics grid */}
      <div
        className={`grid grid-cols-2 gap-3 md:gap-4 ${hasMarketplace ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-4'}`}
      >
        <SummaryStatCard
          label={isRtl ? 'حضور الطلاب' : 'Present'}
          value={loading ? null : stats.presentToday}
          emptyHint={isRtl ? 'لم يُسجّل بعد' : 'Not recorded yet'}
          icon={CheckCircle2}
          tone="emerald"
          onClick={() => setActiveModal('present')}
          isRtl={isRtl}
        />
        <SummaryStatCard
          label={isRtl ? 'غياب الطلاب' : 'Absent'}
          value={loading ? null : stats.absentToday}
          emptyHint={isRtl ? 'لا غياب مسجّل' : 'No absences'}
          icon={UserX}
          tone="rose"
          onClick={() => setActiveModal('absent')}
          isRtl={isRtl}
        />
        {hasMarketplace && (
          <SummaryStatCard
            label={isRtl ? 'المُحصل اليوم' : 'Store Today'}
            value={loading ? null : stats.collectedToday}
            emptyHint={isRtl ? 'لا مبيعات اليوم' : 'No sales today'}
            icon={Wallet}
            tone="indigo"
            unit={t('iqd')}
            formatNumber
            onClick={() => setActiveModal('market')}
            isRtl={isRtl}
          />
        )}
        <SummaryStatCard
          label={isRtl ? 'المتأخرات' : 'Arrears'}
          value={loading ? null : stats.delayedTuition}
          emptyHint={isRtl ? 'لا متأخرات' : 'No arrears'}
          icon={TrendingDown}
          tone="red"
          unit={t('iqd')}
          formatNumber
          isRtl={isRtl}
          className="col-span-2 md:col-span-1"
        />
        <SummaryStatCard
          label={isRtl ? 'مخزون منخفض' : 'Low Stock'}
          value={loading ? null : stats.lowInventory}
          emptyHint={isRtl ? 'المخزون مستقر' : 'Stock is healthy'}
          icon={AlertTriangle}
          tone="orange"
          isRtl={isRtl}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Alerts + actions panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {!loading && alerts.length > 0 ? (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center">
                <Bell size={15} className="text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">
                {isRtl ? 'ما يحتاج انتباهك اليوم' : 'Needs Your Attention Today'}
              </h3>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${alert.type === 'absence' ? 'bg-rose-500' : alert.type === 'delayed' ? 'bg-red-500' : 'bg-orange-500'}`}
                  />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{alert.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 hidden lg:flex items-center p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <p className="text-sm font-bold text-slate-400">
              {isRtl ? 'لا تنبيهات عاجلة اليوم — الوضع مستقر' : 'No urgent alerts today — all clear'}
            </p>
          </div>
        )}

        <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl border border-slate-800 dark:border-slate-700 p-5 shadow-md flex flex-col justify-between gap-4">
          <div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mb-3">
              <Send size={16} className="text-amber-400" />
            </div>
            <h3 className="text-sm font-black text-white">
              {isRtl ? 'إجراءات سريعة' : 'Quick Actions'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isRtl
                ? 'أرسل تنبيهات الأقساط المتأخرة أو المستحقة لأولياء الأمور'
                : 'Notify parents about overdue or upcoming installments'}
            </p>
          </div>
          <button
            onClick={sendInstallmentAlerts}
            disabled={sendingAlerts}
            aria-label={isRtl ? 'إرسال تنبيهات الأقساط لأولياء الأمور' : 'Send installment alerts to parents'}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-sm transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {sendingAlerts ? (
              <Clock size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span className="truncate">
              {isRtl ? 'إرسال تنبيهات الأقساط' : 'Send fee alerts'}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeAttendanceModal}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{modalTitle}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">{todayStr}</p>
                </div>
                <button
                  onClick={closeAttendanceModal}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
                {activeModal === 'market' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="text-indigo-600" size={24} />
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {isRtl ? 'إجمالي المحصل' : 'Total collected'}
                        </span>
                      </div>
                      <span className="text-2xl font-black text-indigo-600">
                        {stats.collectedToday.toLocaleString()} {t('iqd')}
                      </span>
                    </div>
                    {completedMarketOrders.length > 0 ? (
                      completedMarketOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {order.parentName || order.customerName || isRtl ? 'ولي أمر' : 'Parent'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {(order.items || [])
                                .map((i: any) => i.name || i.itemName)
                                .join('، ') || '—'}
                            </p>
                          </div>
                          <span className="font-black text-indigo-600">
                            {Number(order.total || 0).toLocaleString()} {t('iqd')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-400 font-bold py-8">
                        {isRtl ? 'لا توجد مبيعات مكتملة اليوم' : 'No completed sales today'}
                      </p>
                    )}
                  </div>
                ) : modalStudents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modalStudents.map((student) => (
                      <StudentAttendanceCard key={student.studentId} student={student} isRtl={isRtl} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-400 font-bold py-12">
                    {isRtl
                      ? 'لا يوجد سجل لهذا اليوم — سجّل الحضور من تبويب الحضور والغياب'
                      : 'No records today — register attendance in the Attendance tab'}
                  </p>
                )}
              </div>

              {(activeModal === 'present' || activeModal === 'absent') && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap gap-3 justify-end">
                    <button
                      onClick={handlePrint}
                      disabled={modalStudents.length === 0}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Printer size={16} />
                      {isRtl ? 'طباعة' : 'Print'}
                    </button>
                    <button
                      onClick={handleGoToAttendanceCorrection}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800"
                    >
                      <ClipboardCheck size={16} />
                      {isRtl ? 'تصحيح السجل' : 'Correct record'}
                    </button>
                  </div>

                  {isSchoolAdmin && attendanceDocs.length > 0 && (
                    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-4">
                      {!showDangerDelete ? (
                        <button
                          type="button"
                          onClick={() => setShowDangerDelete(true)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-2"
                        >
                          <ShieldAlert size={14} />
                          {isRtl
                            ? 'حذف فعلي من سجل الحضور والغياب (مدير فقط)'
                            : 'Permanently delete from attendance records (admin only)'}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-black text-rose-700 dark:text-rose-400 leading-relaxed">
                            {isRtl
                              ? 'تحذير: هذا الإجراء سيحذف سجل حضور وغياب اليوم بالكامل من قاعدة البيانات ولا يمكن التراجع عنه بسهولة. استخدم «تصحيح السجل» أولاً إن كان الخطأ في التسجيل فقط.'
                              : 'Warning: This permanently deletes all of today\'s attendance records from the database. Prefer «Correct record» for registration fixes.'}
                          </p>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            {isRtl
                              ? `سيتم حذف ${attendanceDocs.length} سجل/سجلات لتاريخ ${todayStr}`
                              : `${attendanceDocs.length} record(s) for ${todayStr} will be deleted`}
                          </p>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={isRtl ? 'اكتب «حذف» للتأكيد' : 'Type DELETE to confirm'}
                            className="w-full px-4 py-2.5 rounded-xl border border-rose-200 bg-white dark:bg-slate-900 font-bold text-sm"
                            dir={isRtl ? 'rtl' : 'ltr'}
                          />
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDangerDelete(false);
                                setDeleteConfirmText('');
                              }}
                              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm"
                            >
                              {isRtl ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                              type="button"
                              onClick={handleDangerDeleteTodayAttendance}
                              disabled={
                                deletingAttendance ||
                                deleteConfirmText.trim() !== (isRtl ? 'حذف' : 'DELETE')
                              }
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                              {isRtl ? 'حذف نهائي من السجل الرسمي' : 'Permanently delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { restoreDocument } from '../../lib/softDelete';
import { restoreFromTrash, purgeFromTrash, resumeDeletions, deleteErrorMessage, PERMANENT_CONFIRM_TEXT } from '../../lib/deletionApi';
import { logAction } from '../../lib/auditLog';
import { Trash2, RotateCcw, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type TrashedItem = {
  id: string;
  collection: 'classes' | 'announcements';
  name: string;
  deletedAt?: { toDate?: () => Date };
  deletedByName?: string;
};

type Bundle = {
  id: string;
  collection: string;
  label: string;
  status: string;
  kind?: string;
  retention?: string;
  childCounts?: Record<string, number>;
  deletedBy?: { name?: string; role?: string };
  deletedAt?: { toDate?: () => Date };
  purgeAfter?: { toDate?: () => Date };
  lastError?: string | null;
};

const COLLECTION_LABELS: Record<string, string> = {
  students: 'طالب', classes: 'صف', subjects: 'مادة', homework: 'واجب', teacher_reports: 'تقييم', advanced_reports: 'تقرير متقدم',
  behavior_reports: 'تقرير سلوك', behavior: 'سلوك', grades: 'درجة', attendance: 'حضور', announcements: 'إعلان',
  installments: 'قسط', payments: 'دفعة', payroll: 'راتب', inventory: 'مخزون', market: 'منتج', marketplace: 'منتج',
  orders: 'طلب', id_cards: 'هوية', student_archives: 'أرشيف', users: 'حساب',
};

export default function RecycleBin() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [busyBundle, setBusyBundle] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<Bundle | null>(null);
  const [purgeText, setPurgeText] = useState('');
  const canPurge = profile?.role === 'admin';

  useEffect(() => {
    if (!profile?.schoolId) return;

    const schoolId = profile.schoolId;
    const unsubs: (() => void)[] = [];

    const mapTrashed = (
      collectionName: 'classes' | 'announcements',
      snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> },
    ) => {
      return snap.docs
        .filter((d) => d.data().isDeleted)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            collection: collectionName,
            name: String(data.name || data.title || data.message || d.id),
            deletedAt: data.deletedAt as TrashedItem['deletedAt'],
            deletedByName: String(data.deletedByName || ''),
          };
        });
    };

    unsubs.push(
      onSnapshot(
        query(collection(db, 'classes'), where('schoolId', '==', schoolId), limit(200)),
        (snap) => {
          const classItems = mapTrashed('classes', snap);
          setItems((prev) => {
            const others = prev.filter((i) => i.collection !== 'classes');
            return [...others, ...classItems];
          });
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'announcements'), where('schoolId', '==', schoolId), limit(200)),
        (snap) => {
          const annItems = mapTrashed('announcements', snap);
          setItems((prev) => {
            const others = prev.filter((i) => i.collection !== 'announcements');
            return [...others, ...annItems];
          });
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'recycle_bin'), where('schoolId', '==', schoolId), limit(300)),
        (snap) => {
          const rows = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Bundle, 'id'>) }))
            .filter((b) => b.status !== 'purged' && b.status !== 'restored')
            .sort((a, b) => (b.deletedAt?.toDate?.()?.getTime() || 0) - (a.deletedAt?.toDate?.()?.getTime() || 0));
          setBundles(rows);
        },
        () => setBundles([]),
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [profile?.schoolId]);

  const handleRestoreBundle = async (b: Bundle) => {
    setBusyBundle(b.id);
    try {
      await restoreFromTrash(b.id);
      toast.success(isRtl ? 'تمت الاستعادة مع السجلات والملفات المرتبطة' : 'Restored with related records and files');
    } catch (e) {
      toast.error(deleteErrorMessage(e, isRtl ? 'فشلت الاستعادة' : 'Restore failed'));
    } finally {
      setBusyBundle(null);
    }
  };

  const handleResume = async (b: Bundle) => {
    setBusyBundle(b.id);
    try {
      await resumeDeletions();
      toast.success(isRtl ? 'تمت متابعة العملية' : 'Resumed');
    } catch (e) {
      toast.error(deleteErrorMessage(e, isRtl ? 'تعذّرت المتابعة' : 'Resume failed'));
    } finally {
      setBusyBundle(null);
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    if (purgeText.trim() !== PERMANENT_CONFIRM_TEXT) {
      toast.error(isRtl ? `اكتب «${PERMANENT_CONFIRM_TEXT}» للتأكيد` : 'Type the confirmation text');
      return;
    }
    setBusyBundle(purgeTarget.id);
    try {
      await purgeFromTrash(purgeTarget.id, purgeText.trim());
      toast.success(isRtl ? 'تم الحذف النهائي' : 'Permanently deleted');
      setPurgeTarget(null);
      setPurgeText('');
    } catch (e) {
      toast.error(deleteErrorMessage(e, isRtl ? 'فشل الحذف النهائي' : 'Permanent delete failed'));
    } finally {
      setBusyBundle(null);
    }
  };

  const handleRestore = async (item: TrashedItem) => {
    if (!profile?.schoolId || profile.role !== 'admin') {
      toast.error(isRtl ? 'غير مصرح' : 'Not authorized');
      return;
    }
    setRestoringId(item.id);
    try {
      await restoreDocument(item.collection, item.id);
      await logAction({
        schoolId: profile.schoolId,
        actorId: profile.uid,
        actorRole: profile.role,
        action: 'restore',
        entityType: item.collection,
        entityId: item.id,
        beforeSummary: 'محذوف',
        afterSummary: `استعادة: ${item.name}`,
      });
      toast.success(isRtl ? 'تمت الاستعادة' : 'Restored');
    } catch {
      toast.error(isRtl ? 'فشلت الاستعادة' : 'Restore failed');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Archive className="text-[#0B2345] dark:text-[#D4A64A]" size={24} />
          {isRtl ? 'سلة المحذوفات' : 'Recycle Bin'}
        </h1>
        <p className="text-sm font-bold text-slate-500 mt-1">
          {isRtl
            ? 'كل ما يُحذف يبقى هنا 30 يوماً ويمكن استعادته مع سجلاته المرتبطة؛ الحذف النهائي لمدير المدرسة فقط'
            : 'Deleted items stay here for 30 days and can be restored with their related records; permanent delete is admin-only'}
        </p>
      </div>

      {bundles.length > 0 && (
        <div className="space-y-3" data-testid="trash-bundles">
          {bundles.map((b) => {
            const counts = Object.entries(b.childCounts || {}).filter(([, n]) => n > 0);
            const restoring = b.status === 'restoring';
            const pending = b.status !== 'trashed' && !restoring;
            return (
              <div key={b.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 dark:text-white truncate">{b.label}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      {COLLECTION_LABELS[b.collection] || b.collection}
                      {b.deletedBy?.name ? ` · ${b.deletedBy.name}` : ''}
                      {b.deletedAt?.toDate ? ` · ${b.deletedAt.toDate().toLocaleDateString('ar-IQ-u-nu-latn')}` : ''}
                      {b.purgeAfter?.toDate ? ` · ${isRtl ? 'يُحذف نهائياً في' : 'purges on'} ${b.purgeAfter.toDate().toLocaleDateString('ar-IQ-u-nu-latn')}` : ''}
                    </p>
                    {counts.length > 0 && (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        {isRtl ? 'يتضمن: ' : 'Includes: '}
                        {counts.map(([c, n]) => `${COLLECTION_LABELS[c] || c} ×${n}`).join('، ')}
                      </p>
                    )}
                    {b.retention === 'protected' && !pending && (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        {isRtl ? 'يتضمن سجلات مالية/أكاديمية: لا يُحذف تلقائياً' : 'Contains financial/academic records: never auto-purged'}
                      </p>
                    )}
                    {restoring && (
                      <p className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {isRtl ? 'الاستعادة غير مكتملة — أعد المحاولة لإكمالها' : 'Restore incomplete — retry to finish'}
                        {b.lastError ? ` (${b.lastError})` : ''}
                      </p>
                    )}
                    {pending && (
                      <p className="text-[10px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {isRtl ? 'عملية غير مكتملة — ستُستأنف تلقائياً' : 'Incomplete — will resume automatically'}
                        {b.lastError ? ` (${b.lastError})` : ''}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex gap-2">
                    {pending ? (
                      canPurge && (
                        <button type="button" onClick={() => handleResume(b)} disabled={busyBundle === b.id} className="px-3 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs border border-amber-200 disabled:opacity-50">
                          {isRtl ? 'استئناف' : 'Resume'}
                        </button>
                      )
                    ) : (
                      <>
                        <button type="button" onClick={() => handleRestoreBundle(b)} disabled={busyBundle === b.id} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs border border-emerald-200 dark:border-emerald-800 disabled:opacity-50">
                          <RotateCcw size={14} />
                          {busyBundle === b.id ? '...' : restoring ? (isRtl ? 'إكمال الاستعادة' : 'Finish restore') : isRtl ? 'استعادة' : 'Restore'}
                        </button>
                        {canPurge && !restoring && (
                          <button type="button" onClick={() => { setPurgeTarget(b); setPurgeText(''); }} disabled={busyBundle === b.id} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-xl font-bold text-xs border border-red-200 dark:border-red-800 disabled:opacity-50">
                            <Trash2 size={14} />
                            {isRtl ? 'حذف نهائي' : 'Delete forever'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {purgeTarget && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4" dir="rtl">
            <h3 className="text-lg font-black text-red-600 flex items-center gap-2"><AlertTriangle size={20} />حذف نهائي لا يمكن التراجع عنه</h3>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              سيتم حذف «{purgeTarget.label}» وكل سجلاته وملفاته المرتبطة نهائياً.
              {purgeTarget.kind === 'account' ? ' وسيُحذف حساب الدخول أيضاً.' : ''}
            </p>
            <p className="text-xs font-bold text-slate-500">اكتب «{PERMANENT_CONFIRM_TEXT}» للتأكيد:</p>
            <input value={purgeText} onChange={(e) => setPurgeText(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold bg-transparent" data-testid="purge-confirm-input" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setPurgeTarget(null)} className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800">إلغاء</button>
              <button type="button" onClick={handlePurge} disabled={purgeText.trim() !== PERMANENT_CONFIRM_TEXT || busyBundle === purgeTarget.id} className="px-4 py-2 rounded-xl font-bold text-sm bg-red-600 text-white disabled:opacity-40">حذف نهائياً</button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && bundles.length === 0 ? (
        <p className="text-slate-400 font-bold">{isRtl ? 'السلة فارغة' : 'Bin is empty'}</p>
      ) : items.length === 0 ? null : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.collection}-${item.id}`}
              className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4"
            >
              <div className="min-w-0">
                <p className="font-black text-slate-900 dark:text-white truncate">{item.name}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  {item.collection}
                  {item.deletedByName ? ` · ${item.deletedByName}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRestore(item)}
                disabled={restoringId === item.id}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold text-xs border border-emerald-200 dark:border-emerald-800 disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {restoringId === item.id ? '...' : isRtl ? 'استعادة' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
        <Trash2 size={12} />
        {isRtl
          ? 'الحذف النهائي يزيل السجلات والملفات المرتبطة ولا يمكن التراجع عنه'
          : 'Permanent delete removes related records and files and cannot be undone'}
      </p>
    </div>
  );
}

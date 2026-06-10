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
import { logAction } from '../../lib/auditLog';
import { Trash2, RotateCcw, Archive } from 'lucide-react';
import { toast } from 'react-hot-toast';

type TrashedItem = {
  id: string;
  collection: 'classes' | 'announcements';
  name: string;
  deletedAt?: { toDate?: () => Date };
  deletedByName?: string;
};

export default function RecycleBin() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [items, setItems] = useState<TrashedItem[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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

    return () => unsubs.forEach((u) => u());
  }, [profile?.schoolId]);

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
            ? 'الصفوف والإعلانات المحذوفة مؤقتاً — لا حذف نهائي من هنا'
            : 'Soft-deleted classes and announcements — no permanent delete here'}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-400 font-bold">{isRtl ? 'السلة فارغة' : 'Bin is empty'}</p>
      ) : (
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
          ? 'حذف الطلاب والموظفين لا يزال نهائياً — لم يُفعّل لهم الحذف الناعم بعد'
          : 'Student/staff deletes remain permanent — soft delete not enabled for them yet'}
      </p>
    </div>
  );
}

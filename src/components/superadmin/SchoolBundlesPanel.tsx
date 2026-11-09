import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { restoreFromTrash, purgeFromTrash, deleteErrorMessage, PERMANENT_CONFIRM_TEXT } from '../../lib/deletionApi';

type SchoolBundle = {
  id: string;
  label: string;
  status: string;
  jobStatus?: string;
  retention?: string;
  collection?: string;
  lastError?: string | null;
  childCounts?: Record<string, number>;
  deletedAt?: { toDate?: () => Date };
  deletedBy?: { name?: string };
};

/** Deleted schools (Super Admin): restore everything, or delete permanently with a separate typed confirmation. */
export default function SchoolBundlesPanel() {
  const [rows, setRows] = useState<SchoolBundle[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [purge, setPurge] = useState<SchoolBundle | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    // schools, plus every platform-level record (admin accounts, distributors, requests, assistant content): schoolId is empty
    const merged = new Map<string, SchoolBundle>();
    const push = (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }, key: string) => {
      for (const k of [...merged.keys()]) if (k.startsWith(key)) merged.delete(k);
      snap.docs.forEach((d) => { const b = { id: d.id, ...(d.data() as Omit<SchoolBundle, 'id'>) }; if (!['purged', 'restored'].includes(b.status)) merged.set(key + d.id, b); });
      setRows([...merged.values()]);
    };
    const u1 = onSnapshot(query(collection(db, 'recycle_bin'), where('kind', '==', 'school'), limit(50)), (s) => push(s, 's:'), () => undefined);
    const u2 = onSnapshot(query(collection(db, 'recycle_bin'), where('schoolId', '==', ''), limit(100)), (s) => push(s, 'p:'), () => undefined);
    return () => { u1(); u2(); };
  }, []);

  if (rows.length === 0) return null;

  const restore = async (b: SchoolBundle) => {
    setBusy(b.id);
    try { await restoreFromTrash(b.id); toast.success('تمت استعادة المدرسة بكل سجلاتها وحساباتها وملفاتها'); }
    catch (e) { toast.error(deleteErrorMessage(e, 'فشلت الاستعادة')); }
    finally { setBusy(null); }
  };
  const doPurge = async () => {
    if (!purge || text.trim() !== PERMANENT_CONFIRM_TEXT) return;
    setBusy(purge.id);
    try { await purgeFromTrash(purge.id, text.trim()); toast.success('تم الحذف النهائي للمدرسة'); setPurge(null); setText(''); }
    catch (e) { toast.error(deleteErrorMessage(e, 'فشل الحذف النهائي')); }
    finally { setBusy(null); }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 p-4 space-y-3" data-testid="school-bundles" dir="rtl">
      <p className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-2"><Trash2 size={16} /> محذوفات المنصة: مدارس وموزعون وحسابات وطلبات ومحتوى (قابلة للاستعادة)</p>
      {rows.map((b) => {
        const counts = Object.entries(b.childCounts || {}).filter(([, n]) => n > 0).map(([c, n]) => `${c} ×${n}`).join('، ');
        const running = b.status === 'trashing' || b.status === 'purging';
        return (
          <div key={b.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
            <div className="min-w-0">
              <p className="font-black text-slate-900 dark:text-white truncate">{b.label}</p>
              <p className="text-[10px] font-bold text-slate-500">
                {b.deletedBy?.name || ''}{b.deletedAt?.toDate ? ` · ${b.deletedAt.toDate().toLocaleDateString('ar-IQ-u-nu-latn')}` : ''} · {b.retention === 'protected' ? 'لا يُحذف تلقائياً' : 'يُحذف تلقائياً بعد 30 يوماً'} · {b.collection}
              </p>
              {counts && <p className="text-[10px] font-bold text-slate-500">{counts}</p>}
              {(running || b.status === 'restoring') && (
                <p className="text-[10px] font-bold text-amber-700 flex items-center gap-1"><AlertTriangle size={12} />{b.status === 'restoring' ? 'الاستعادة غير مكتملة — أعد المحاولة' : 'عملية غير مكتملة — ستُستأنف تلقائياً'}{b.lastError ? ` (${b.lastError})` : ''}</p>
              )}
            </div>
            {!running && (
              <div className="shrink-0 flex gap-2">
                <button type="button" disabled={busy === b.id} onClick={() => restore(b)} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black disabled:opacity-50"><RotateCcw size={14} />{b.status === 'restoring' ? 'إكمال الاستعادة' : 'استعادة'}</button>
                {b.status === 'trashed' && (
                  <button type="button" disabled={busy === b.id} onClick={() => { setPurge(b); setText(''); }} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-black disabled:opacity-50"><Trash2 size={14} />حذف نهائي</button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {purge && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2" role="dialog">
          <p className="text-xs font-black text-red-800">حذف «{purge.label}» نهائياً: تُحذف سجلاتها وحسابات الدخول ورسائلها وملفاتها ولا يمكن التراجع. اكتب «{PERMANENT_CONFIRM_TEXT}»:</p>
          <input value={text} onChange={(e) => setText(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-red-200 text-xs font-bold bg-white" data-testid="school-purge-input" />
          <div className="flex gap-2">
            <button type="button" disabled={text.trim() !== PERMANENT_CONFIRM_TEXT || busy === purge.id} onClick={doPurge} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-black disabled:opacity-40">حذف نهائياً</button>
            <button type="button" onClick={() => setPurge(null)} className="px-4 py-2 bg-white rounded-lg text-xs font-black">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}

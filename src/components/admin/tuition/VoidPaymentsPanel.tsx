import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Ban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../../../lib/firebase';
import { voidPayment, resolveFinancialReview, deleteErrorMessage } from '../../../lib/deletionApi';

type PaymentRow = {
  id: string;
  studentName?: string;
  amount?: number;
  receiptNumber?: string;
  note?: string;
  status?: string;
  voidReason?: string;
  createdAt?: { toDate?: () => Date; seconds?: number };
};

/** Payments are accounting records: they are cancelled (with a reason, kept forever), never deleted. */
export default function VoidPaymentsPanel({ schoolId, students = [] }: { schoolId: string; students?: any[] }) {
  const review = students.filter((s) => s.financialReviewRequired);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const resolve = async (id: string) => {
    const note = window.prompt('ملاحظة المراجعة المالية (إلزامي)');
    if (!note || note.trim().length < 3) return;
    setResolvingId(id);
    try { await resolveFinancialReview(id, note.trim()); toast.success('تم إنهاء المراجعة المالية'); } catch (e) { toast.error(deleteErrorMessage(e, 'تعذّر إنهاء المراجعة')); } finally { setResolvingId(null); }
  };
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [target, setTarget] = useState<PaymentRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    const toRows = (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) =>
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentRow, 'id'>) }));
    const sortRows = (r: PaymentRow[]) =>
      [...r].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 30);
    let fallback: (() => void) | null = null;
    const unsub = onSnapshot(
      query(collection(db, 'payments'), where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'), limit(30)),
      (snap) => setRows(toRows(snap)),
      () => {
        // index not available yet: same data, sorted in the browser
        fallback = onSnapshot(query(collection(db, 'payments'), where('schoolId', '==', schoolId), limit(200)), (snap) => setRows(sortRows(toRows(snap))));
      },
    );
    return () => { unsub(); fallback?.(); };
  }, [schoolId]);

  const submit = async () => {
    if (!target) return;
    if (reason.trim().length < 3) { toast.error('اكتب سبب الإلغاء'); return; }
    setBusy(true);
    try {
      const out = await voidPayment(target.id, reason.trim());
      if (out.reviewRequired) toast('أُلغيت الدفعة. الأقساط لا تطابق الدفعات المسجّلة فأُحيل الطالب إلى مراجعة مالية', { icon: '⚠️', duration: 8000 });
      else toast.success('أُلغيت الدفعة وأُعيد توزيع الأقساط والرصيد');
      setTarget(null); setReason('');
    } catch (e) {
      toast.error(deleteErrorMessage(e, 'تعذّر إلغاء الدفعة'));
    } finally { setBusy(false); }
  };

  return (
    <details className="mx-4 mb-4 rounded-2xl border border-slate-100 dark:border-slate-800" data-testid="void-payments">
      <summary className="cursor-pointer px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Ban size={14} /> إلغاء دفعة مالية (لا تُحذف الدفعات؛ يُحفظ الأثر المحاسبي)
      </summary>
      <div className="px-4 pb-4 space-y-2 max-h-64 overflow-y-auto">
        {review.map((st) => (
          <div key={st.id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2" data-testid="financial-review">
            <p className="text-[11px] font-black text-amber-800">مراجعة مالية مطلوبة: {st.name}</p>
            <button type="button" disabled={resolvingId === st.id} onClick={() => resolve(st.id)} className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-[10px] font-black">تمت المراجعة</button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs font-bold text-slate-400">لا توجد دفعات</p>}
        {rows.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2">
            <div className="min-w-0 text-right">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{p.studentName || p.id}</p>
              <p className="text-[10px] font-bold text-slate-500">
                {Number(p.amount || 0).toLocaleString()} د.ع
                {p.receiptNumber ? ` · ${p.receiptNumber}` : ''}
                {p.createdAt?.toDate ? ` · ${p.createdAt.toDate().toLocaleDateString('ar-IQ-u-nu-latn')}` : ''}
              </p>
              {p.status === 'voided' && <p className="text-[10px] font-bold text-rose-600">ملغاة: {p.voidReason}</p>}
            </div>
            {p.status !== 'voided' && (
              <button type="button" onClick={() => { setTarget(p); setReason(''); }} className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black">
                إلغاء الدفعة
              </button>
            )}
          </div>
        ))}
        {target && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 p-3 space-y-2" role="dialog">
            <p className="text-xs font-black text-rose-800 dark:text-rose-300">
              تأكيد إلغاء دفعة {Number(target.amount || 0).toLocaleString()} د.ع للطالب {target.studentName}؟ سيُعاد الرصيد وتوزيع الأقساط، وتبقى الدفعة في السجل كملغاة.
            </p>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الإلغاء (إلزامي)" className="w-full px-3 py-2 rounded-lg border border-rose-200 text-xs font-bold bg-white dark:bg-slate-900" data-testid="void-reason" />
            <div className="flex gap-2">
              <button type="button" disabled={busy || reason.trim().length < 3} onClick={submit} className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-[11px] font-black disabled:opacity-50" data-testid="void-confirm">
                {busy ? '...' : 'تأكيد الإلغاء'}
              </button>
              <button type="button" onClick={() => setTarget(null)} className="px-4 py-2 bg-white dark:bg-slate-800 rounded-lg text-[11px] font-black">تراجع</button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { CheckCircle, Loader2, Phone, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { db } from "../../lib/firebase";
import {
  adminApproveDistributor,
  adminRejectDistributor,
} from "../../lib/adminApi";
import type { DistributorRecord } from "../../types/distributor";

function formatDate(value: unknown) {
  const ts = value as { toDate?: () => Date; seconds?: number } | undefined;
  if (ts?.toDate) return ts.toDate().toLocaleString("ar-IQ");
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("ar-IQ");
  return "—";
}

export function DistributorRequestsTab() {
  const [pending, setPending] = useState<DistributorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "distributors"), where("status", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPending(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<DistributorRecord, "id">) }))
            .sort((a, b) => {
              const aSec = (a.createdAt as { seconds?: number })?.seconds || 0;
              const bSec = (b.createdAt as { seconds?: number })?.seconds || 0;
              return bSec - aSec;
            }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const handleApprove = async (row: DistributorRecord) => {
    setActingId(row.id);
    try {
      const result = await adminApproveDistributor(row.id);
      if (result.needsEmailForLogin) {
        toast.success("تم القبول — أضف بريداً إلكترونياً لتمكين تسجيل الدخول");
      } else if (result.userCreated) {
        toast.success("تم قبول الموزع وإنشاء حساب الدخول");
      } else {
        toast.success("تم قبول الموزع");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل القبول");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (row: DistributorRecord) => {
    if (!window.confirm(`رفض طلب الموزع "${row.name}"؟`)) return;
    setActingId(row.id);
    try {
      await adminRejectDistributor(row.id);
      toast.success("تم رفض الطلب");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل الرفض");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin ml-2" size={20} />
        جاري تحميل طلبات الموزعين...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          طلبات الموزعين
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          مراجعة طلبات التسجيل الذاتي قبل تفعيل حساب الموزع
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          لا توجد طلبات بانتظار الموافقة
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((row) => (
            <div
              key={row.id}
              className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 justify-between"
            >
              <div className="space-y-1 text-right flex-1">
                <div className="font-black text-lg text-slate-900 dark:text-white">
                  {row.name}
                </div>
                <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span>الهاتف: {row.phone || "—"}</span>
                  {row.email ? <span>البريد: {row.email}</span> : null}
                  <span>المحافظة: {row.governorate || "—"}</span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  العنوان: {row.address || "—"}
                </div>
                <div className="text-xs text-slate-400">
                  تاريخ الطلب: {formatDate(row.createdAt)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {row.phone && (
                  <a
                    href={`tel:${String(row.phone).replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    <Phone size={16} />
                    اتصال
                  </a>
                )}
                <button
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => handleApprove(row)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  قبول
                </button>
                <button
                  type="button"
                  disabled={actingId === row.id}
                  onClick={() => handleReject(row)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50"
                >
                  <XCircle size={16} />
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

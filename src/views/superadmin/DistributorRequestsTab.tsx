import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { CheckCircle, Loader2, Mail, MapPin, Percent, Phone, Tag, X, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { auth, db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthContext";
import { AppModalPortal } from "../../components/AppModalPortal";
import {
  adminApproveDistributor,
  adminRejectDistributor,
} from "../../lib/adminApi";
import type { DistributorRecord } from "../../types/distributor";

function formatDate(value: unknown) {
  const ts = value as { toDate?: () => Date; seconds?: number } | undefined;
  if (ts?.toDate) return ts.toDate().toLocaleString("ar-IQ-u-nu-latn");
  if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("ar-IQ-u-nu-latn");
  return "—";
}

/** Suggests a readable coupon code from the distributor's phone, e.g. DIST-8877. */
function suggestCouponCode(row: DistributorRecord) {
  const digits = String(row.phone || "").replace(/\D/g, "").slice(-4);
  const tail = digits || Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DIST-${tail}`;
}

type ApprovalForm = {
  commissionPercent: string;
  discountPercent: string;
  couponCode: string;
  email: string;
};

export function DistributorRequestsTab() {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === "superadmin";
  const [pending, setPending] = useState<DistributorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [approving, setApproving] = useState<DistributorRecord | null>(null);
  const [form, setForm] = useState<ApprovalForm>({ commissionPercent: "10", discountPercent: "0", couponCode: "", email: "" });

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

  const openApproval = (row: DistributorRecord) => {
    setApproving(row);
    setForm({
      commissionPercent: String(row.commissionPercent ?? 10),
      discountPercent: "0",
      couponCode: suggestCouponCode(row),
      email: row.email || "",
    });
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    const row = approving;
    if (!row) return;
    const commission = Number(form.commissionPercent);
    const discount = Number(form.discountPercent || 0);
    const couponCode = form.couponCode.trim().toUpperCase();
    const email = form.email.trim().toLowerCase();
    if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
      toast.error("نسبة العمولة يجب أن تكون بين 0 و 100");
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      toast.error("نسبة الخصم يجب أن تكون بين 0 و 100");
      return;
    }
    if (!/^[A-Z0-9-]{3,24}$/.test(couponCode)) {
      toast.error("كود الكوبون: 3–24 حرفاً إنجليزياً أو رقماً أو شرطة");
      return;
    }
    if (!email) {
      toast.error("أدخل بريد الموزع لإنشاء حساب الدخول");
      return;
    }
    setActingId(row.id);
    try {
      const result = await adminApproveDistributor(row.id, {
        commissionPercent: commission,
        discountPercent: discount,
        couponCode,
        email,
      });
      if (result.userCreated) {
        // The account gets a random password; email the distributor a link to set their own.
        const sent = await sendPasswordResetEmail(auth, email).then(() => true, () => false);
        toast.success(
          sent
            ? `تم قبول الموزع بكوبون ${couponCode} وعمولة ${commission}% — أُرسل رابط تعيين كلمة المرور إلى ${email}`
            : `تم قبول الموزع بكوبون ${couponCode} — يمكنه استخدام «نسيت كلمة المرور» لتعيين كلمته`,
        );
      } else {
        toast.success(`تم قبول الموزع بكوبون ${couponCode} وعمولة ${commission}%`);
      }
      setApproving(null);
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

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500";

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          طلبات الموزعين
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          {isSuperAdmin
            ? "راجع الطلب ثم حدّد نسبة العمولة والكوبون المخصّص للموزع عند القبول"
            : "عرض فقط — قبول الموزعين وتحديد النسبة والكوبون من صلاحية مدير النظام"}
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
              <div className="space-y-1.5 text-right flex-1 min-w-0">
                <div className="font-black text-lg text-slate-900 dark:text-white">
                  {row.name}
                </div>
                <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1"><Phone size={13} /> {row.phone || "—"}</span>
                  <span className="inline-flex items-center gap-1"><Mail size={13} /> {row.email || "بدون بريد"}</span>
                  <span className="inline-flex items-center gap-1"><MapPin size={13} /> {row.governorate || "—"}</span>
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
                {isSuperAdmin && (
                  <>
                    <button
                      type="button"
                      disabled={actingId === row.id}
                      onClick={() => openApproval(row)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      قبول وتحديد العمولة
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AppModalPortal
        open={!!approving}
        onClose={() => setApproving(null)}
        size="md"
        dir="rtl"
        ariaLabel="قبول الموزع"
      >
        <form onSubmit={handleApprove} className="flex flex-col flex-1 min-h-0">
          <div className="sx-app-modal-panel__header">
            <h4 className="sx-app-modal-panel__title">قبول الموزع — {approving?.name}</h4>
            <button
              type="button"
              onClick={() => setApproving(null)}
              className="sx-app-modal-panel__close"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
          <div className="sx-app-modal-panel__body space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                <Percent size={13} /> نسبة عمولة الموزع (%)
              </span>
              <input
                required
                type="number"
                min={0}
                max={100}
                step="0.5"
                inputMode="decimal"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                className={inputClass}
              />
              <span className="text-[11px] text-slate-400">تُحسب شهرياً من صافي اشتراك كل مدرسة يجلبها الموزع</span>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                <Tag size={13} /> كود الكوبون المخصّص للموزع
              </span>
              <input
                required
                value={form.couponCode}
                onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono tracking-wider uppercase`}
                dir="ltr"
                placeholder="DIST-1234"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">خصم المدرسة عند استخدام الكوبون (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                inputMode="decimal"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                <Mail size={13} /> بريد الدخول للموزع
              </span>
              <input
                required
                type="email"
                dir="ltr"
                value={form.email}
                disabled={!!approving?.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`${inputClass} disabled:opacity-70`}
                placeholder="distributor@email.com"
              />
              <span className="text-[11px] text-slate-400">يُرسَل إليه رابط لتعيين كلمة المرور بعد القبول</span>
            </label>
          </div>
          <div className="sx-app-modal-panel__footer flex gap-2 justify-end">
            <button type="button" onClick={() => setApproving(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!!actingId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black disabled:opacity-50"
            >
              {actingId ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              تأكيد القبول
            </button>
          </div>
        </form>
      </AppModalPortal>
    </div>
  );
}

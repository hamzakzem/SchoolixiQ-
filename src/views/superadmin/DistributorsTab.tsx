import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Calendar,
  ChevronLeft,
  Loader2,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Plus,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { db } from "../../lib/firebase";
import {
  adminApplyDistributorCoupon,
  adminGenerateMonthlyCommissions,
  adminMarkCommissionPaid,
  adminMarkDistributorMonthPaid,
  adminSetSchoolDistributorCommissionPaused,
} from "../../lib/adminApi";
import type {
  DistributorCouponRecord,
  DistributorMonthlyCommission,
  DistributorRecord,
} from "../../types/distributor";
import { DistributorSupportInbox } from "./DistributorSupportInbox";
import {
  ensureDistributorSupportConversation,
} from "../../lib/distributorSupportChat";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

type SchoolRow = {
  id: string;
  name?: string;
  planId?: string;
  status?: string;
  subscriptionStatus?: string;
  paymentStatus?: string;
  distributorId?: string;
  distributorName?: string;
  distributorCommissionPaused?: boolean;
  distributorLinkedAt?: unknown;
  lastPaymentAt?: string;
};

type PackageRow = { id: string; name?: string };

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatIqd(amount: number) {
  return `${Number(amount || 0).toLocaleString("ar-IQ")} د.ع`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "معلّقة",
  earned: "مستحقة",
  paid: "مدفوعة",
  canceled: "ملغاة",
};

function schoolIsActiveForCommission(school: SchoolRow) {
  const status = String(school.status || "").toLowerCase();
  if (["suspended", "inactive", "archived", "rejected"].includes(status)) return false;
  const sub = String(school.subscriptionStatus || "active").toLowerCase();
  if (sub !== "active") return false;
  const pay = String(school.paymentStatus || "paid").toLowerCase();
  return ["paid", "approved"].includes(pay);
}

export function DistributorsTab({
  schools,
  packages,
}: {
  schools: SchoolRow[];
  packages: PackageRow[];
}) {
  const [distributors, setDistributors] = useState<DistributorRecord[]>([]);
  const [coupons, setCoupons] = useState<DistributorCouponRecord[]>([]);
  const [commissions, setCommissions] = useState<DistributorMonthlyCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [generateMonthKey, setGenerateMonthKey] = useState(currentMonthKey());
  const [generating, setGenerating] = useState(false);
  const [showAddDistributor, setShowAddDistributor] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newDistributor, setNewDistributor] = useState({
    name: "",
    phone: "",
    email: "",
    commissionPercent: 10,
  });
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    distributorId: "",
    discountPercent: 0,
    commissionPercent: 0,
  });
  const [applyCouponSchoolId, setApplyCouponSchoolId] = useState("");
  const [applyCouponCode, setApplyCouponCode] = useState("");

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, "distributors"), orderBy("name")), (snap) => {
        setDistributors(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DistributorRecord, "id">) })),
        );
      }),
      onSnapshot(collection(db, "distributorCoupons"), (snap) => {
        setCoupons(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DistributorCouponRecord, "id">) })),
        );
      }),
      onSnapshot(
        query(collection(db, "distributorMonthlyCommissions"), orderBy("monthKey", "desc")),
        (snap) => {
          setCommissions(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<DistributorMonthlyCommission, "id">),
            })),
          );
          setLoading(false);
        },
        () => setLoading(false),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const linkedSchools = useMemo(
    () => schools.filter((s) => s.distributorId),
    [schools],
  );

  const filteredCommissions = useMemo(
    () => commissions.filter((c) => c.monthKey === monthKey),
    [commissions, monthKey],
  );

  const distributorStats = useMemo(() => {
    const map = new Map<
      string,
      {
        thisMonthDue: number;
        totalDue: number;
        totalPaid: number;
        activeSchools: number;
        pausedSchools: number;
        schoolCount: number;
      }
    >();

    for (const d of distributors) {
      map.set(d.id, {
        thisMonthDue: 0,
        totalDue: 0,
        totalPaid: 0,
        activeSchools: 0,
        pausedSchools: 0,
        schoolCount: 0,
      });
    }

    for (const school of linkedSchools) {
      const id = school.distributorId!;
      const stats = map.get(id) || {
        thisMonthDue: 0,
        totalDue: 0,
        totalPaid: 0,
        activeSchools: 0,
        pausedSchools: 0,
        schoolCount: 0,
      };
      stats.schoolCount += 1;
      if (school.distributorCommissionPaused) stats.pausedSchools += 1;
      else if (schoolIsActiveForCommission(school)) stats.activeSchools += 1;
      map.set(id, stats);
    }

    for (const c of commissions) {
      const stats = map.get(c.distributorId);
      if (!stats) continue;
      if (c.monthKey === monthKey && (c.status === "earned" || c.status === "pending")) {
        stats.thisMonthDue += c.commissionAmount;
      }
      if (c.status === "paid") stats.totalPaid += c.commissionAmount;
      else if (c.status === "earned" || c.status === "pending") {
        stats.totalDue += c.commissionAmount;
      }
    }

    return map;
  }, [distributors, linkedSchools, commissions, monthKey]);

  const selectedDistributor = distributors.find((d) => d.id === selectedDistributorId);
  const selectedSchools = linkedSchools.filter((s) => s.distributorId === selectedDistributorId);
  const selectedCommissions = commissions.filter((c) => c.distributorId === selectedDistributorId);

  const handleCreateDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistributor.name.trim()) {
      toast.error("اسم الموزع مطلوب");
      return;
    }
    try {
      const ref = doc(collection(db, "distributors"));
      await setDoc(ref, {
        name: newDistributor.name.trim(),
        phone: newDistributor.phone.trim(),
        email: newDistributor.email.trim(),
        commissionPercent: Number(newDistributor.commissionPercent) || 0,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("تم إضافة الموزع");
      setShowAddDistributor(false);
      setNewDistributor({ name: "", phone: "", email: "", commissionPercent: 10 });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إضافة الموزع");
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCoupon.code.trim().toUpperCase();
    if (!code || !newCoupon.distributorId) {
      toast.error("الكود والموزع مطلوبان");
      return;
    }
    const dist = distributors.find((d) => d.id === newCoupon.distributorId);
    try {
      const ref = doc(collection(db, "distributorCoupons"));
      await setDoc(ref, {
        code,
        distributorId: newCoupon.distributorId,
        distributorName: dist?.name || "",
        discountPercent: Number(newCoupon.discountPercent) || 0,
        commissionPercent: Number(newCoupon.commissionPercent) || dist?.commissionPercent || 0,
        active: true,
        redemptionCount: 0,
        createdAt: serverTimestamp(),
      });
      toast.success("تم إنشاء الكوبون");
      setShowAddCoupon(false);
      setNewCoupon({ code: "", distributorId: "", discountPercent: 0, commissionPercent: 0 });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إنشاء الكوبون");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await adminGenerateMonthlyCommissions(generateMonthKey);
      toast.success(
        `تم التوليد: ${result.generated} جديدة، ${result.alreadyExists} موجودة مسبقاً، ${result.skippedInactive} غير نشطة، ${result.skippedUnpaid} غير مدفوعة`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل توليد العمولات");
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!applyCouponSchoolId || !applyCouponCode.trim()) {
      toast.error("اختر المدرسة وأدخل الكود");
      return;
    }
    try {
      const result = await adminApplyDistributorCoupon(
        applyCouponSchoolId,
        applyCouponCode.trim(),
      );
      if (result.alreadyLinked) {
        toast("المدرسة مرتبطة بموزع مسبقاً");
      } else {
        toast.success("تم ربط المدرسة بالموزع");
      }
      setApplyCouponCode("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل ربط الكوبون");
    }
  };

  const planName = (planId?: string) =>
    packages.find((p) => p.id === planId)?.name || planId || "—";

  const openDistributorChat = async (distributor: DistributorRecord) => {
    let userId = distributor.userId;
    if (!userId) {
      const q = query(
        collection(db, "users"),
        where("distributorId", "==", distributor.id),
        limit(1),
      );
      const snap = await getDocs(q);
      userId = snap.docs[0]?.id;
    }
    if (!userId) {
      toast.error("لا يوجد حساب مستخدم مربوط بهذا الموزع");
      return;
    }
    try {
      await ensureDistributorSupportConversation({
        distributorId: distributor.id,
        distributorUserId: userId,
        distributorName: distributor.name,
      });
      toast.success("تم تجهيز المحادثة — راجع قسم رسائل الموزعين");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل فتح المحادثة");
    }
  };

  if (loading && distributors.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="animate-spin ml-2" size={20} />
        جاري تحميل بيانات الموزعين...
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
            الموزعون والكوبونات
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            عمولة شهرية مستمرة لكل مدرسة مرتبطة بموزع
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAddDistributor(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"
          >
            <Plus size={16} />
            موزع جديد
          </button>
          <button
            type="button"
            onClick={() => setShowAddCoupon(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold"
          >
            <Tag size={16} />
            كوبون جديد
          </button>
        </div>
      </div>

      <DistributorSupportInbox distributors={distributors} />

      {/* Generate monthly */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar size={18} />
          توليد الاستحقاقات الشهرية
        </h4>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500">الشهر (YYYY-MM)</span>
            <input
              type="month"
              value={generateMonthKey}
              onChange={(e) => setGenerateMonthKey(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </label>
          <button
            type="button"
            disabled={generating}
            onClick={handleGenerate}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50"
          >
            {generating ? "جاري التوليد..." : "توليد عمولات الشهر"}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          يمكن ربط هذا الإجراء لاحقاً بمهمة مجدولة شهرية — حالياً تشغيل يدوي للسوبر أدمن فقط.
        </p>
      </div>

      {/* Apply coupon */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-4">ربط مدرسة بكوبون موزع</h4>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm min-w-[200px]">
            <span className="text-slate-500">المدرسة</span>
            <select
              value={applyCouponSchoolId}
              onChange={(e) => setApplyCouponSchoolId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="">— اختر —</option>
              {schools
                .filter((s) => !s.distributorId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-500">كود الكوبون</span>
            <input
              value={applyCouponCode}
              onChange={(e) => setApplyCouponCode(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase"
              placeholder="DIST-2026"
            />
          </label>
          <button
            type="button"
            onClick={handleApplyCoupon}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm"
          >
            ربط
          </button>
        </div>
      </div>

      {/* Distributor cards */}
      <div>
        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Users size={18} />
          الموزعون
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {distributors.map((d) => {
            const stats = distributorStats.get(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDistributorId(d.id)}
                className={`text-right p-5 rounded-2xl border shadow-sm transition-all ${
                  selectedDistributorId === d.id
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="font-black text-slate-900 dark:text-white text-lg">{d.name}</div>
                <div className="text-xs text-slate-500 mt-1">
                  نسبة العمولة الافتراضية: {d.commissionPercent}%
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-400">عمولة هذا الشهر</div>
                    <div className="font-bold text-emerald-600">
                      {formatIqd(stats?.thisMonthDue || 0)}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-400">إجمالي المستحق</div>
                    <div className="font-bold">{formatIqd(stats?.totalDue || 0)}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-400">إجمالي المدفوع</div>
                    <div className="font-bold text-blue-600">
                      {formatIqd(stats?.totalPaid || 0)}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <div className="text-slate-400">مدارس نشطة / متوقفة</div>
                    <div className="font-bold">
                      {stats?.activeSchools || 0} / {stats?.pausedSchools || 0}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {distributors.length === 0 && (
          <p className="text-slate-500 text-sm">لا يوجد موزعون بعد. أضف موزعاً وكوبوناً للبدء.</p>
        )}
      </div>

      {/* Distributor detail */}
      {selectedDistributor && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDistributorId(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={20} />
              </button>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {selectedDistributor.name} — المدارس التابعة
              </h4>
            </div>
            <button
              type="button"
              onClick={() => void openDistributorChat(selectedDistributor)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B2345] text-white text-sm font-bold"
            >
              <MessageSquare size={16} />
              فتح محادثة
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const r = await adminMarkDistributorMonthPaid(
                    selectedDistributor.id,
                    monthKey,
                  );
                  toast.success(`تم تعليم ${r.updated ?? 0} عمولة كمدفوعة`);
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : "فشل التعليم");
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
            >
              <Wallet size={16} />
              تعليم كل عمولات {monthKey} كمدفوعة
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <th className="py-2 px-2">المدرسة</th>
                  <th className="py-2 px-2">الاشتراك</th>
                  <th className="py-2 px-2">الباقة</th>
                  <th className="py-2 px-2">عمولة الشهر</th>
                  <th className="py-2 px-2">إجمالي العمولات</th>
                  <th className="py-2 px-2">الحالة</th>
                  <th className="py-2 px-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {selectedSchools.map((school) => {
                  const monthComm = selectedCommissions.find(
                    (c) => c.schoolId === school.id && c.monthKey === monthKey,
                  );
                  const totalFromSchool = selectedCommissions
                    .filter((c) => c.schoolId === school.id)
                    .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
                  const paused = school.distributorCommissionPaused === true;
                  return (
                    <tr
                      key={school.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="py-3 px-2 font-bold text-slate-900 dark:text-white">
                        {school.name || school.id}
                      </td>
                      <td className="py-3 px-2">
                        {school.subscriptionStatus || school.status || "—"}
                        {school.paymentStatus ? ` / ${school.paymentStatus}` : ""}
                      </td>
                      <td className="py-3 px-2">{planName(school.planId)}</td>
                      <td className="py-3 px-2">
                        {monthComm ? formatIqd(monthComm.commissionAmount) : "—"}
                      </td>
                      <td className="py-3 px-2">{formatIqd(totalFromSchool)}</td>
                      <td className="py-3 px-2">
                        {paused ? (
                          <span className="text-amber-600">موقوفة</span>
                        ) : monthComm ? (
                          STATUS_LABELS[monthComm.status] || monthComm.status
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          type="button"
                          title={paused ? "إعادة تفعيل العمولة" : "إيقاف العمولة"}
                          onClick={async () => {
                            try {
                              await adminSetSchoolDistributorCommissionPaused(
                                school.id,
                                !paused,
                              );
                              toast.success(paused ? "تم تفعيل العمولة" : "تم إيقاف العمولة");
                            } catch (err: unknown) {
                              toast.error(
                                err instanceof Error ? err.message : "فشل التحديث",
                              );
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          {paused ? (
                            <PlayCircle size={18} className="text-emerald-600" />
                          ) : (
                            <PauseCircle size={18} className="text-amber-600" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {selectedSchools.length === 0 && (
              <p className="text-slate-500 text-sm py-4">لا توجد مدارس مرتبطة بهذا الموزع.</p>
            )}
          </div>
        </div>
      )}

      {/* Monthly entitlements */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h4 className="text-lg font-black text-slate-900 dark:text-white">
            الاستحقاقات الشهرية
          </h4>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">عرض شهر</span>
            <input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right min-w-[960px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <th className="py-2 px-2">الموزع</th>
                <th className="py-2 px-2">المدرسة</th>
                <th className="py-2 px-2">الشهر</th>
                <th className="py-2 px-2">الباقة</th>
                <th className="py-2 px-2">الاشتراك</th>
                <th className="py-2 px-2">الخصم</th>
                <th className="py-2 px-2">الصافي</th>
                <th className="py-2 px-2">النسبة</th>
                <th className="py-2 px-2">العمولة</th>
                <th className="py-2 px-2">الحالة</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {filteredCommissions.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="py-2 px-2">{c.distributorName}</td>
                  <td className="py-2 px-2">{c.schoolName}</td>
                  <td className="py-2 px-2">{c.monthKey}</td>
                  <td className="py-2 px-2">{c.planName}</td>
                  <td className="py-2 px-2">{formatIqd(c.subscriptionAmount)}</td>
                  <td className="py-2 px-2">{formatIqd(c.discountAmount)}</td>
                  <td className="py-2 px-2">{formatIqd(c.netAmount)}</td>
                  <td className="py-2 px-2">{c.commissionPercent}%</td>
                  <td className="py-2 px-2 font-bold">{formatIqd(c.commissionAmount)}</td>
                  <td className="py-2 px-2">{STATUS_LABELS[c.status] || c.status}</td>
                  <td className="py-2 px-2">
                    {c.status !== "paid" && c.status !== "canceled" && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await adminMarkCommissionPaid(c.id);
                            toast.success("تم تعليم العمولة كمدفوعة");
                          } catch (err: unknown) {
                            toast.error(
                              err instanceof Error ? err.message : "فشل التعليم",
                            );
                          }
                        }}
                        className="text-xs px-2 py-1 rounded-lg bg-blue-600 text-white font-bold"
                      >
                        تعليم كمدفوعة
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCommissions.length === 0 && (
            <p className="text-slate-500 text-sm py-6 text-center">
              لا توجد استحقاقات لهذا الشهر. استخدم «توليد عمولات الشهر» أعلاه.
            </p>
          )}
        </div>
      </div>

      {/* Coupons list */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-4">الكوبونات</h4>
        <div className="flex flex-wrap gap-2">
          {coupons.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-mono"
            >
              <Tag size={14} />
              {c.code}
              <span className="text-slate-400 text-xs">
                ({c.distributorName || c.distributorId}) — {c.redemptionCount || 0} استخدام
              </span>
              {c.active === false && (
                <button
                  type="button"
                  onClick={() =>
                    updateDoc(doc(db, "distributorCoupons", c.id), { active: true })
                  }
                  className="text-xs text-emerald-600"
                >
                  تفعيل
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showAddDistributor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateDistributor}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h4 className="font-black text-lg">موزع جديد</h4>
            <input
              required
              placeholder="اسم الموزع"
              value={newDistributor.name}
              onChange={(e) =>
                setNewDistributor({ ...newDistributor, name: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              placeholder="الهاتف"
              value={newDistributor.phone}
              onChange={(e) =>
                setNewDistributor({ ...newDistributor, phone: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              min={0}
              max={100}
              placeholder="نسبة العمولة %"
              value={newDistributor.commissionPercent}
              onChange={(e) =>
                setNewDistributor({
                  ...newDistributor,
                  commissionPercent: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddDistributor(false)}
                className="px-4 py-2 rounded-lg border"
              >
                إلغاء
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold">
                حفظ
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateCoupon}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h4 className="font-black text-lg">كوبون جديد</h4>
            <select
              required
              value={newCoupon.distributorId}
              onChange={(e) =>
                setNewCoupon({ ...newCoupon, distributorId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">اختر الموزع</option>
              {distributors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="كود الكوبون"
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800 uppercase"
            />
            <input
              type="number"
              min={0}
              placeholder="خصم % (اختياري)"
              value={newCoupon.discountPercent || ""}
              onChange={(e) =>
                setNewCoupon({
                  ...newCoupon,
                  discountPercent: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddCoupon(false)}
                className="px-4 py-2 rounded-lg border"
              >
                إلغاء
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold">
                إنشاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

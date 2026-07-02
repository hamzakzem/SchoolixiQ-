import { Phone, LogOut, Clock, XCircle, Headphones } from "lucide-react";
import { signOutWithCleanup } from "../lib/authLogout";
import { useSystemConfig } from "../lib/SystemConfigContext";

type Variant = "pending" | "rejected" | "submitted";

export function DistributorAccessScreen({
  variant,
  isRtl = true,
}: {
  variant: Variant;
  isRtl?: boolean;
}) {
  const { config } = useSystemConfig();
  const supportPhone =
    (Array.isArray(config.supportPhones) && config.supportPhones[0]) ||
    (config as { supportPhone?: string }).supportPhone ||
    "";

  const copy =
    variant === "rejected"
      ? {
          title: isRtl ? "تم رفض طلب الموزع" : "Distributor application rejected",
          body: isRtl
            ? "لا يمكنك تسجيل الدخول كموزع. للاستفسار تواصل مع الدعم."
            : "You cannot sign in as a distributor. Contact support for details.",
          icon: <XCircle className="text-red-600" size={40} />,
          iconBg: "bg-red-100 dark:bg-red-900/20",
        }
      : {
          title: isRtl ? "بانتظار الموافقة" : "Pending approval",
          body: isRtl
            ? "تم استلام طلبك وسيتم التواصل معك قريباً. لا يمكن الدخول قبل موافقة الإدارة."
            : "Your application was received. You will be contacted soon. Login is blocked until approval.",
          icon: <Clock className="text-amber-600 animate-pulse" size={40} />,
          iconBg: "bg-amber-100 dark:bg-amber-900/20",
        };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${copy.iconBg}`}
        >
          {copy.icon}
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
          {variant === "submitted" ? (isRtl ? "تم إرسال طلبك" : "Application submitted") : copy.title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed mb-6">
          {variant === "submitted"
            ? isRtl
              ? "تم استلام طلبك وسيتم التواصل معك قريباً"
              : "Your request was received. We will contact you soon."
            : copy.body}
        </p>
        {supportPhone && (
          <a
            href={`tel:${supportPhone.replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center gap-2 w-full py-3 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Headphones size={18} />
            {isRtl ? "تواصل مع الدعم" : "Contact support"}
          </a>
        )}
        {variant !== "submitted" && (
          <button
            type="button"
            onClick={() => signOutWithCleanup()}
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm"
          >
            <LogOut size={18} />
            {isRtl ? "تسجيل الخروج" : "Sign out"}
          </button>
        )}
        {variant === "submitted" && supportPhone && (
          <a
            href={`tel:${supportPhone.replace(/\s/g, "")}`}
            className="inline-flex items-center justify-center gap-2 text-sm text-indigo-600 font-bold mt-2"
          >
            <Phone size={16} />
            {supportPhone}
          </a>
        )}
      </div>
    </div>
  );
}

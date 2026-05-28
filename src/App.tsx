import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { LanguageProvider, useLanguage } from "./lib/LanguageContext";
import { Toaster, toast } from "react-hot-toast";
import { UserRole } from "./types";
import {
  ShieldCheck,
  LogOut,
  RefreshCw,
  UserPlus,
  Clock,
  Building,
  Check,
  ArrowRight,
  ArrowLeft,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { auth, db } from "./lib/firebase";
import {
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "motion/react";
import * as Sentry from "@sentry/react";

// Views (Lazy-Loaded for Performance Optimization)
const Login = lazy(() => import("./views/Login"));
const AdminDashboard = lazy(() => import("./views/AdminDashboard"));
const ParentDashboard = lazy(() => import("./views/ParentDashboard"));
const SuperAdminDashboard = lazy(() => import("./views/SuperAdminDashboard"));
const TeacherDashboard = lazy(() => import("./views/TeacherDashboard"));
const PublicStudentVerify = lazy(() => import("./views/PublicStudentVerify"));

import ScanHandler from "./components/ScanHandler";
import SolarLoading from "./components/SolarLoading";
import { LanguageToggle } from "./components/LanguageToggle";

const DEFAULT_PACKAGES = [
  {
    id: "basic",
    name: "الباقة الأساسية",
    price: 1500000,
    priceMonthly: 150000,
    priceYearly: 1500000,
    isPopular: false,
    showInRegistration: true,
    features: [
      "لغاية 250 طالب وطالبة",
      "إدارة الغيابات والحضور اليومي",
      "لوحة تحكم للمدير والمعلمين",
      "نتائج الامتحانات الشهرية",
      "دعم فني عبر البريد الإلكتروني",
    ],
  },
  {
    id: "professional",
    name: "الباقة الاحترافية",
    price: 3000000,
    priceMonthly: 300000,
    priceYearly: 3000000,
    isPopular: true,
    showInRegistration: true,
    features: [
      "لغاية 750 طالب وطالبة",
      "تطبيق حقيقي لأولياء الأمور",
      "رواتب الحسابات والمالية للأستاذة",
      "شهادات ونتائج تفاعلية",
      "دعم فني مباشر على مدار الساعة",
    ],
  },
  {
    id: "premium",
    name: "الباقة الشاملة",
    price: 5000000,
    priceMonthly: 500000,
    priceYearly: 5000000,
    isPopular: false,
    showInRegistration: true,
    features: [
      "عدد طلاب غير محدود",
      "كل مميزات الباقة الاحترافية",
      "نظام محاسبة متقدم وهيكل رواتب",
      "إشعارات SMS فورية وتنبيهات تلقائية",
      "تخصيص كامل للهوية البصرية والشعار",
    ],
  },
];

const AppContent = () => {
  const { user, profile, schoolData, loading } = useAuth();
  const { t, isRtl, language, setLanguage } = useLanguage();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [autoLinkChecked, setAutoLinkChecked] = useState(false);

  // Onboarding state
  const [onboardingState, setOnboardingState] = useState<
    | "loading"
    | "options"
    | "packages"
    | "registration_form"
    | "waiting_approval"
    | "rejected"
    | "approved"
  >("loading");
  const [packages, setPackages] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "annually",
  );
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [myRequest, setMyRequest] = useState<any>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    password: "",
  });

  // Automatic Parent Provisioning with Student Link
  useEffect(() => {
    if (loading || !user || profile || autoLinkChecked) return;

    const performAutoProvision = async () => {
      const email = user.email?.toLowerCase();
      if (!email) {
        setAutoLinkChecked(true);
        return;
      }

      try {
        // Search for students matching this parent email
        const q = query(
          collection(db, "students"),
          where("parentEmail", "==", email),
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          setIsCreatingProfile(true);
          const allStudentDocs = snap.docs;
          const firstStudentData = allStudentDocs[0].data();
          const allStudentIds = allStudentDocs.map((d) => d.id);

          const { arrayUnion, serverTimestamp } =
            await import("firebase/firestore");

          // Create the parent profile with ALL linked student IDs
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            name: user.displayName || "ولي أمر",
            role: "parent",
            schoolId: firstStudentData.schoolId || "",
            studentIds: allStudentIds,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Link ALL matching students to this UID on their documents
          for (const sDoc of allStudentDocs) {
            const sData = sDoc.data();
            const currentParentIds = sData.parentIds || [];
            if (!currentParentIds.includes(user.uid)) {
              const { updateDoc } = await import("firebase/firestore");
              await updateDoc(doc(db, "students", sDoc.id), {
                parentIds: arrayUnion(user.uid),
                updatedAt: serverTimestamp(),
              });
            }
          }

          toast.success(
            isRtl
              ? "تم تفعيل حسابك وربطك بطلابك تلقائياً!"
              : "Account activated and linked to students automatically!",
          );
        }
        setAutoLinkChecked(true);
      } catch (err) {
        console.error("Auto-provisioning failed:", err);
        setAutoLinkChecked(true);
      } finally {
        setIsCreatingProfile(false);
      }
    };

    performAutoProvision();
  }, [loading, user, profile, autoLinkChecked, isRtl]);

  // Handle Onboarding States
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!loading && user && !profile && autoLinkChecked) {
      // First check if they have a pending registration
      import("firebase/firestore").then(
        ({ onSnapshot, query, collection, where }) => {
          const q = query(
            collection(db, "registrations"),
            where("uid", "==", user.uid),
          );
          const unsub = onSnapshot(
            q,
            (snap) => {
              if (!snap.empty) {
                const req = snap.docs[0];
                setMyRequest({ id: req.id, ...req.data() });
                if (req.data().status === "rejected") {
                  setOnboardingState("rejected");
                } else if (req.data().status === "approved") {
                  setOnboardingState("approved");
                } else {
                  setOnboardingState("waiting_approval");
                }
              } else {
                // If no pending request, check if we should show options (with a short delay to not flick)
                timer = setTimeout(() => setOnboardingState("options"), 1000);
              }
            },
            (error) => {
              console.error("Failed to read registrations:", error);
              timer = setTimeout(() => setOnboardingState("options"), 1000);
            },
          );

          // This is a bit leaky if the component unmounts but it's safe enough for now
          // A full cleanup would be better
        },
      );
    } else if (!user) {
      setOnboardingState("loading");
    }
    return () => clearTimeout(timer);
  }, [loading, user, profile, autoLinkChecked]);

  // Fetch packages when in 'packages' state
  useEffect(() => {
    if (onboardingState === "packages") {
      import("firebase/firestore").then(({ onSnapshot, query, collection }) => {
        const q = query(collection(db, "packages"));
        onSnapshot(
          q,
          (snap) => {
            if (!snap.empty) {
              setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            } else {
              setPackages(DEFAULT_PACKAGES);
            }
          },
          (error) => {
            console.error("Failed to fetch packages, using defaults", error);
            setPackages(DEFAULT_PACKAGES);
          },
        );
      });
    }
  }, [onboardingState]);

  if (loading) {
    return <SolarLoading />;
  }

  if (!user) {
    return (
      <>
        <Login />
        <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999]">
          <LanguageToggle />
        </div>
      </>
    );
  }

  const renderDashboard = () => {
    // Check school expiration for everyone except super admin
    if (
      profile?.role &&
      profile.role !== UserRole.SUPERADMIN &&
      schoolData?.subscriptionExpiresAt
    ) {
      const expiry = new Date(schoolData.subscriptionExpiresAt);
      if (expiry.getTime() < new Date().getTime()) {
        const isManagement = [
          UserRole.ADMIN,
          UserRole.STAFF,
          UserRole.ASSISTANT,
        ].includes(profile.role);
        return (
          <div
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 text-center shadow-2xl border border-red-100 dark:border-red-900/30">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="text-red-600 dark:text-red-400" size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
                {isRtl ? "عذراً، انتهى مفعول الاشتراك" : "Subscription Expired"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-bold italic">
                {isRtl
                  ? isManagement
                    ? "لقد انتهت الفترة الزمنية لاشتراك مدرستكم. يرجى التواصل مع الدعم الفني (Super Admin) لتجديد الاشتراك."
                    : "لقد انتهت الفترة الزمنية المخصصة لاشتراك مدرستكم. يرجى التواصل مع إدارة المدرسة لتجديد الاشتراك واستعادة الصلاحيات."
                  : isManagement
                    ? "Your subscription has expired. Please contact Support to renew."
                    : "Your school's subscription has expired. Please contact school administration to renew and restore access."}
              </p>
              <button
                onClick={() => auth.signOut()}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                {isRtl ? "تسجيل الخروج" : "Logout"}
              </button>
            </div>
          </div>
        );
      }
    }

    // Multi-tenant dashboard switching based on role
    switch (profile?.role) {
      case UserRole.SUPERADMIN:
        return <SuperAdminDashboard />;
      case UserRole.ASSISTANT:
        // If assistant has no schoolId, they are a system assistant
        if (!profile.schoolId) return <SuperAdminDashboard />;
        return <AdminDashboard />;
      case UserRole.ADMIN:
      case UserRole.STAFF:
        return <AdminDashboard />;
      case UserRole.PARENT:
        return <ParentDashboard />;
      case UserRole.TEACHER:
        return <TeacherDashboard />;
      default:
        return (
          <div className="p-10 text-center">
            دور غير معرّف. يرجى مراجعة المسؤول.
          </div>
        );
    }
  };

  return (
    <>
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className={isRtl ? "font-sans" : "font-sans"}
      >
        {profile ? (
          <>
            <ScanHandler />
            {renderDashboard()}
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-transparent font-sans"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6"
            >
              <ShieldCheck size={40} />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2 font-display">
              {t("loading")}
            </h1>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
              {isRtl
                ? "نحن بصدد تجهيز بيانات حسابك والتحقق من الصلاحيات."
                : "We are preparing your account data and verifying permissions."}
            </p>

            {onboardingState === "options" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 w-full max-w-sm mx-auto"
              >
                <div className="pt-8 border-t border-slate-200 mt-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    {isRtl
                      ? "لم يتم العثور على ملف تعريفي. اختر نوع الحساب"
                      : "No profile found. Choose account type"}
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    <button
                      disabled={isCreatingProfile}
                      onClick={async () => {
                        if (!user) return;
                        setIsCreatingProfile(true);
                        try {
                          const q = query(
                            collection(db, "users"),
                            where("email", "==", user.email),
                          );
                          const querySnap = await getDocs(q);
                          if (!querySnap.empty) {
                            const existingData = querySnap.docs[0].data();
                            const isManagement = [
                              "admin",
                              "staff",
                              "assistant",
                              "superadmin",
                            ].includes(existingData.role);
                            if (isManagement) {
                              toast.error(
                                isRtl
                                  ? "هذا الحساب مسجل كإدارة مدرسة ولا يمكن استخدامه كولي أمر"
                                  : "This account is registered as school management and cannot be used as a parent.",
                              );
                              setIsCreatingProfile(false);
                              return;
                            }
                          }

                          await setDoc(doc(db, "users", user.uid), {
                            uid: user.uid,
                            name: user.displayName || "ولي أمر",
                            email: user.email,
                            role: UserRole.PARENT,
                            schoolId: "",
                            createdAt: new Date().toISOString(),
                            photoURL: user.photoURL,
                          });
                          toast.success(
                            isRtl
                              ? "تم إنشاء ملفك التعريفي بنجاح"
                              : "Profile created successfully",
                          );
                        } catch (err) {
                          console.error(err);
                          toast.error(
                            isRtl
                              ? "حدث خطأ أثناء الإنشاء"
                              : "Error creating profile",
                          );
                        } finally {
                          setIsCreatingProfile(false);
                        }
                      }}
                      className="w-full px-6 py-4 bg-slate-900 border border-slate-900 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {isCreatingProfile ? (
                        <RefreshCw className="animate-spin" size={18} />
                      ) : (
                        <UserPlus size={18} />
                      )}
                      {isRtl
                        ? "تفعيل حساب ولي أمر (أهل)"
                        : "Register as Parent"}
                    </button>

                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200"></span>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-50 px-4 text-slate-400 font-bold tracking-widest">
                          {isRtl ? "أو للمدارس" : "OR FOR SCHOOLS"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCreatingProfile}
                      onClick={() => setOnboardingState("packages")}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold shadow-sm active:scale-95 transition-all outline-none focus:ring-4 focus:ring-blue-100 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      <Building size={18} />
                      {isRtl
                        ? "تسجيل مدرسة جديدة (للمدراء)"
                        : "Register a New School"}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => auth.signOut()}
                  className="w-full px-6 py-3 bg-transparent text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2 mt-4 text-xs"
                >
                  <LogOut size={16} />
                  {t("logout")}
                </button>
              </motion.div>
            )}

            {onboardingState === "packages" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl mx-auto mt-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                  <h2 className="text-2xl font-black text-slate-900 font-display text-center sm:text-right">
                    {isRtl ? "اختر باقة المدرسة" : "Choose School Package"}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-full items-center shadow-inner">
                      <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {isRtl ? "شهرياً" : "Monthly"}
                      </button>
                      <button
                        onClick={() => setBillingCycle("annually")}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${billingCycle === "annually" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {isRtl ? "سنوياً" : "Annually"}
                      </button>
                    </div>
                    <button
                      onClick={() => setOnboardingState("options")}
                      className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-bold text-sm"
                    >
                      {isRtl ? (
                        <ArrowRight size={16} />
                      ) : (
                        <ArrowLeft size={16} />
                      )}
                      {isRtl ? "رجوع" : "Back"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map((pkg) => {
                    const displayPrice =
                      billingCycle === "annually"
                        ? pkg.priceYearly !== undefined
                          ? pkg.priceYearly
                          : pkg.price
                        : pkg.priceMonthly !== undefined
                          ? pkg.priceMonthly
                          : Math.round((pkg.price || 0) / 12);
                    return (
                      <div
                        key={pkg.id}
                        className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col text-right ${pkg.isPopular ? "border-blue-600 shadow-xl shadow-blue-100" : "border-slate-100 shadow-lg"}`}
                      >
                        {pkg.isPopular && (
                          <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest self-start mb-4">
                            الأكثر طلباً
                          </span>
                        )}
                        <h3 className="text-xl font-black text-slate-900 mb-2">
                          {pkg.name}
                        </h3>
                        <div className="flex items-baseline gap-2 mb-6">
                          <span className="text-3xl font-black text-slate-900">
                            {displayPrice?.toLocaleString()}
                          </span>
                          <span className="text-slate-400 font-bold text-xs">
                            د.ع{" "}
                            {billingCycle === "monthly"
                              ? isRtl
                                ? " / شهرياً"
                                : "/ Monthly"
                              : ""}
                          </span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          {(pkg.features || []).map((f: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-slate-600 font-medium"
                            >
                              <Check
                                size={14}
                                className="text-emerald-500 mt-0.5 shrink-0"
                              />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setOnboardingState("registration_form");
                          }}
                          className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${pkg.isPopular ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                        >
                          اختيار الباقة
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {onboardingState === "registration_form" && selectedPackage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg mx-auto bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mt-8 text-right"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black">
                    {isRtl ? "معلومات المدرسة" : "School Information"}
                  </h3>
                  <button
                    onClick={() => setOnboardingState("packages")}
                    className="text-slate-400 hover:text-slate-900"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!user) return;
                    setIsCreatingProfile(true);
                    try {
                      const isMonthly = billingCycle === "monthly";
                      const actualPrice = isMonthly
                        ? selectedPackage.priceMonthly !== undefined
                          ? selectedPackage.priceMonthly
                          : Math.round((selectedPackage.price || 0) / 12)
                        : selectedPackage.priceYearly !== undefined
                          ? selectedPackage.priceYearly
                          : selectedPackage.price;

                      await addDoc(collection(db, "registrations"), {
                        type: "direct_school_signup",
                        uid: user.uid,
                        email: user.email,
                        name: subscriptionForm.name,
                        phone: subscriptionForm.phone,
                        address: subscriptionForm.address,
                        packageName: selectedPackage.name,
                        packageId: selectedPackage.id,
                        price: actualPrice,
                        billingCycle: billingCycle,
                        durationDays: isMonthly ? 30 : 365,
                        status: "pending",
                        createdAt: serverTimestamp(),
                      });
                      setOnboardingState("waiting_approval");
                    } catch (err) {
                      toast.error("حدث خطأ أثناء الإرسال");
                    } finally {
                      setIsCreatingProfile(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      اسم المدرسة
                    </label>
                    <input
                      required
                      type="text"
                      value={subscriptionForm.name}
                      onChange={(e) =>
                        setSubscriptionForm({
                          ...subscriptionForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 transition-colors font-bold text-slate-700"
                      placeholder="مدرسة المستقبل الأهلية"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      رقم هاتف الإدارة
                    </label>
                    <input
                      required
                      type="tel"
                      value={subscriptionForm.phone}
                      onChange={(e) =>
                        setSubscriptionForm({
                          ...subscriptionForm,
                          phone: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 transition-colors font-bold text-slate-700 text-left"
                      dir="ltr"
                      placeholder="07XXXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      العنوان التفصيلي
                    </label>
                    <input
                      required
                      type="text"
                      value={subscriptionForm.address}
                      onChange={(e) =>
                        setSubscriptionForm({
                          ...subscriptionForm,
                          address: e.target.value,
                        })
                      }
                      className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 transition-colors font-bold text-slate-700"
                      placeholder="المحافظة - القضاء - الحي"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingProfile}
                    className="w-full py-4 mt-4 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm flex justify-center items-center gap-2"
                  >
                    {isCreatingProfile ? (
                      <RefreshCw className="animate-spin" size={18} />
                    ) : (
                      <span>إرسال طلب الاشتراك</span>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {onboardingState === "approved" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 pointer-events-none" />
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                  <div className="absolute inset-0 bg-green-400/20 blur-xl rounded-full animate-pulse" />
                  <CheckCircle size={48} className="relative z-10" />
                </div>
                <h2 className="text-2xl font-black mb-3 text-slate-800 dark:text-white">
                  تم تفعيل حسابك بنجاح!
                </h2>
                <p className="text-slate-500 font-medium mb-6">
                  جاري نقلك إلى لوحة التحكم الخاصة بمدرستك لإعداد النظام والبدء
                  في الإدارة.
                </p>
                <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
              </motion.div>
            )}

            {onboardingState === "waiting_approval" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-xl border border-blue-100 mt-8 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 animate-pulse"></div>
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex justify-center items-center mx-auto mb-6">
                  <Clock size={40} className="animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  جاري المعالجة...
                </h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
                  تم استلام طلب مدرستك بنجاح. نحن بصدد مراجعته لتفعيل حساب
                  المدرسة، يرجى الانتظار لحين قبول الطلب.
                </p>
                <button
                  onClick={() => auth.signOut()}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  تسجيل الخروج مؤقتاً
                </button>
              </motion.div>
            )}

            {onboardingState === "rejected" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-xl border border-red-100 mt-8 text-center"
              >
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex justify-center items-center mx-auto mb-6">
                  <XCircle size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  تم الغاء طلبك
                </h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
                  نأسف، لقد تم رفض أو إلغاء طلب اشتراك مدرستك من قبل الإدارة.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      // Delete the rejected request and let them try again
                      if (myRequest?.id) {
                        import("firebase/firestore").then(
                          ({ deleteDoc, doc }) => {
                            deleteDoc(
                              doc(db, "registrations", myRequest.id),
                            ).then(() => {
                              setOnboardingState("options");
                            });
                          },
                        );
                      } else {
                        setOnboardingState("options");
                      }
                    }}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all"
                  >
                    حاول مرة أخرى
                  </button>
                  <button
                    onClick={() => auth.signOut()}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </motion.div>
            )}

            {onboardingState === "loading" && (
              <div className="flex flex-col items-center gap-4 mt-8">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-xs text-slate-400 font-bold">
                  {isRtl
                    ? "يرجى الانتظار قليلاً..."
                    : "Please wait a moment..."}
                </p>
                <button
                  onClick={() => auth.signOut()}
                  className="px-6 py-3 bg-transparent text-slate-400 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 mt-4 text-xs"
                >
                  <LogOut size={16} />
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function FallbackComponent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-6 text-center">
      <div className="max-w-md bg-white p-8 rounded-3xl shadow-xl">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          عذراً، حدث خطأ غير متوقع
        </h1>
        <p className="text-slate-500 mb-6">
          تم تسجيل الخطأ وجاري العمل على حله. يرجى إعادة تحميل الصفحة.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<FallbackComponent />}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<SolarLoading />}>
                <Routes>
                  <Route
                    path="/verify/:studentId"
                    element={<PublicStudentVerify />}
                  />
                  <Route path="*" element={<AppContent />} />
                </Routes>
              </Suspense>
              <Toaster position="top-right" />
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}

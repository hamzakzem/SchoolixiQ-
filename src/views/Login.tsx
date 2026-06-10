import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  LogIn,
  GraduationCap,
  Users,
  Building2,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Check,
  Package,
  Phone,
  MapPin,
  X,
  Coins,
  Sparkles,
  TrendingUp,
  Bell,
  Copy,
  Smartphone,
  ClipboardList,
  Download,
  Share,
  PlusSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { UserRole } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import {
  ANDROID_APK_NOT_CONFIGURED_MSG_AR,
  hasConfiguredAndroidApkUrl,
  resolveAndroidApkUrl,
  triggerAndroidApkDownload,
} from '../lib/androidApk';
import {
  classifyAuthError,
  getAuthErrorMessage,
  isInAppWebView,
  isNativeApp,
  openAndroidChromeIntent,
  authenticateWithGoogle,
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
  validatePasswordComplexity,
} from "../lib/auth";

import { useLanguage } from "../lib/LanguageContext";
import { useSystemConfig } from "../lib/SystemConfigContext";
import { GlobalFooter } from "../components/GlobalFooter";
import SchoolixLogo from "../components/SchoolixLogo";

export const getLocalizedPackages = (packagesList: any[], isRtl: boolean) => {
  return packagesList.map(pkg => {
    if (isRtl) return pkg;
    let name = pkg.name;
    let features = pkg.features || [];
    if (pkg.id === "basic" || pkg.name?.includes("الأساسية") || pkg.name?.toLowerCase().includes("basic")) {
      name = "Basic Plan";
      features = [
        "Up to 250 students",
        "Daily attendance and absence management",
        "Admin & teacher dashboard",
        "Monthly exam results",
        "Email technical support",
      ];
    } else if (pkg.id === "professional" || pkg.name?.includes("الاحترافية") || pkg.name?.toLowerCase().includes("professional")) {
      name = "Professional Plan";
      features = [
        "Up to 750 students",
        "Real app for parents",
        "Teacher payroll and accounts",
        "Interactive certificates and results",
        "24/7 direct technical support",
      ];
    } else if (pkg.id === "premium" || pkg.name?.includes("الشاملة") || pkg.name?.includes("الماسية") || pkg.name?.toLowerCase().includes("premium")) {
      name = "Premium Plan";
      features = [
        "Unlimited students",
        "All Professional features included",
        "Advanced accounting system and payroll structure",
        "Instant SMS notifications & automatic alerts",
        "Full visual identity & logo customization",
      ];
    }
    return { ...pkg, name, features };
  });
};

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

export default function Login() {
  const { t, isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>(UserRole.PARENT);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaChallenge, setCaptchaChallenge] = useState({ a: 0, b: 0 });

  // School signup fields state
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolGovernorate, setSchoolGovernorate] = useState("");
  const [schoolDirectorate, setSchoolDirectorate] = useState("");
  const [schoolEducationLevel, setSchoolEducationLevel] = useState("");
  const [schoolWorkingHours, setSchoolWorkingHours] = useState("");
  const [schoolStudyType, setSchoolStudyType] = useState("");
  const [schoolEstimatedStudents, setSchoolEstimatedStudents] = useState("");

  // Packages State
  const [packages, setPackages] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">(
    "annually",
  );
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<any>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    governorate: "",
    directorate: "",
    educationLevel: "",
    workingHours: "",
    studyType: "",
    estimatedStudents: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // PWA Direct Installer States
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [installingPlatform, setInstallingPlatform] = useState<"android" | "ios" | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  const [isAndroidUser, setIsAndroidUser] = useState(false);
  const androidApkUrl = useMemo(
    () => resolveAndroidApkUrl(config.androidApkUrl),
    [config.androidApkUrl],
  );
  const androidApkConfigured = hasConfiguredAndroidApkUrl(config.androidApkUrl);

  const handleAndroidApkDownload = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const url = resolveAndroidApkUrl(config.androidApkUrl);
      if (!url) {
        toast.error(ANDROID_APK_NOT_CONFIGURED_MSG_AR);
        return;
      }
      triggerAndroidApkDownload(url);
    },
    [config.androidApkUrl],
  );

  useEffect(() => {
    const userAgent = window.navigator.userAgent || window.navigator.vendor || (window as any).opera || "";
    setIsAndroidUser(/android/i.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    generateCaptcha();

    // Real-time packages fetch
    const unsub = onSnapshot(
      collection(db, "packages"),
      (snapshot) => {
        if (!snapshot.empty) {
          setPackages(
            snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          );
        } else {
          setPackages(DEFAULT_PACKAGES);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "packages");
        setPackages(DEFAULT_PACKAGES);
      },
    );

    return () => unsub();
  }, [mode]);

  const downloadMobileConfig = () => {
    toast.success(isRtl ? "جاري تحضير ملف التعريف وتنزيله بنجاح..." : "Preparing and downloading configuration profile...");
    window.location.href = "/api/download/schoolixiq.mobileconfig";
  };

  const startDirectInstall = (platform: "android" | "ios") => {
    setInstallingPlatform(platform);
    setInstallProgress(0);
    setShowInstallSuccess(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setInstallProgress(100);
        
        // Trigger actual native installation if available on Android
        if (platform === "android" && deferredInstallPrompt) {
          setTimeout(() => {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === "accepted") {
                setShowInstallSuccess(true);
                toast.success(isRtl ? "تم بدء تثبيت التطبيق بنجاح!" : "App installation started successfully!");
              } else {
                setShowInstallSuccess(true); // show guide as fallback
              }
              setDeferredInstallPrompt(null);
            });
          }, 300);
        } else {
          setTimeout(() => {
            setShowInstallSuccess(true);
          }, 200);
        }
      } else {
        setInstallProgress(progress);
      }
    }, 120);
  };

  const handleSubscribeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubscriptionModal) return;

    if (subscriptionForm.password.length < 6) {
      toast.error(isRtl ? "يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل." : "Password must be at least 6 characters.");
      return;
    }
    const pwdRes = validatePasswordComplexity(subscriptionForm.password);
    if (!pwdRes.isValid) {
      toast.error(pwdRes.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const isMonthly = billingCycle === "monthly";
      const actualPrice = isMonthly
        ? showSubscriptionModal.priceMonthly !== undefined
          ? showSubscriptionModal.priceMonthly
          : Math.round((showSubscriptionModal.price || 0) / 12)
        : showSubscriptionModal.priceYearly !== undefined
          ? showSubscriptionModal.priceYearly
          : showSubscriptionModal.price;

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await addDoc(collection(db, "registrations"), {
        type: "subscription_request",
        packageId: showSubscriptionModal.id,
        packageName: showSubscriptionModal.name,
        price: actualPrice,
        billingCycle: billingCycle,
        durationDays: isMonthly ? 30 : 365,
        customerInfo: subscriptionForm,
        governorate: subscriptionForm.governorate || "",
        directorate: subscriptionForm.directorate || "",
        stage: subscriptionForm.educationLevel || "",
        shift: subscriptionForm.workingHours || "",
        genderType: subscriptionForm.studyType || "",
        approximateStudents: subscriptionForm.estimatedStudents || "",
        status: "pending",
        subscriberCode: code,
        createdAt: serverTimestamp(),
      });
      setSuccessCode(code);
      toast.success("تم إرسال طلب الاشتراك بنجاح!");
      setShowSubscriptionModal(null);
      setSubscriptionForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        governorate: "",
        directorate: "",
        educationLevel: "",
        workingHours: "",
        studyType: "",
        estimatedStudents: "",
      });
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateCaptcha = () => {
    setCaptchaChallenge({
      a: Math.floor(Math.random() * 10) + 1,
      b: Math.floor(Math.random() * 10) + 1,
    });
    setCaptchaAnswer("");
  };

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showSubscriptionPassword, setShowSubscriptionPassword] = useState<boolean>(false);

  const handleGoogleAuth = async () => {
    if (isInAppWebView() && !isNativeApp()) {
      const ua =
        typeof window !== "undefined" && window.navigator
          ? window.navigator.userAgent || ""
          : "";
      if (/Android/i.test(ua)) {
        toast.loading(
          isRtl
            ? "جاري فتح Chrome لتسجيل الدخول..."
            : "Opening Chrome to sign in...",
        );
        setTimeout(() => openAndroidChromeIntent(), 800);
        return;
      }
      toast.error(
        isRtl
          ? "افتح الرابط في Safari أو Chrome لتسجيل الدخول بـ Google"
          : "Open this link in Safari or Chrome to sign in with Google",
      );
      return;
    }

    setLoading(true);
    try {
      const { user, profileCreated } = await authenticateWithGoogle(
        {},
        mode === "signup"
          ? {
              selectedRole: role,
              displayName: name.trim() || undefined,
              phone: phone.trim(),
              isRtl,
            }
          : undefined,
      );

      if (mode === "signup" && role === UserRole.ADMIN && !profileCreated) {
        toast.success(
          isRtl
            ? "تم التحقق من هويتك. أكمل تسجيل المدرسة واختر الباقة."
            : "Identity verified. Complete school registration and select a package.",
        );
      } else {
        toast.success(
          profileCreated
            ? isRtl
              ? "تم إنشاء حسابك وتسجيل الدخول بـ Google!"
              : "Account created — signed in with Google!"
            : isRtl
              ? `مرحباً ${user.displayName || ""}!`
              : `Welcome back, ${user.displayName || "user"}!`,
        );
      }
    } catch (error) {
      console.error("Google sign-in failed:", error);
      const kind = classifyAuthError(error);
      if (kind !== "cancelled") {
        toast.error(getAuthErrorMessage(error, t, isRtl));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parseInt(captchaAnswer) !== captchaChallenge.a + captchaChallenge.b) {
      toast.error(t("captchaError"));
      generateCaptcha();
      return;
    }

    const emailTrimmed = email.toLowerCase().trim();
    const passwordValue = password;

    if (passwordValue.length < 6) {
      toast.error(t("passwordShort"));
      return;
    }

    if (mode === "signup") {
      const complexityRes = validatePasswordComplexity(passwordValue);
      if (!complexityRes.isValid) {
        toast.error(
          isRtl && complexityRes.message === "This password is too simple and easy to guess"
            ? "كلمة المرور هذه شائعة جداً وسهلة التخمين."
            : isRtl && complexityRes.message === "Password cannot consist of a single repeating character"
              ? "لا يمكن أن تتكون كلمة المرور من تكرار حرف واحد فقط."
              : complexityRes.message,
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail({
          email: emailTrimmed,
          password: passwordValue,
          displayName: name,
          phone,
          selectedRole: role,
          school: {
            phone,
            address: schoolAddress,
            governorate: schoolGovernorate,
            directorate: schoolDirectorate,
            educationLevel: schoolEducationLevel,
            workingHours: schoolWorkingHours,
            studyType: schoolStudyType,
            estimatedStudents: schoolEstimatedStudents,
          },
          isRtl,
        });
        toast.success(t("signupSuccess"));
      } else {
        await signInWithEmail(emailTrimmed, passwordValue);
        toast.success(t("welcomeBack"));
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t, isRtl));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error(isRtl ? "يرجى إدخال البريد الإلكتروني أولاً" : "Enter your email first");
      return;
    }
    try {
      await resetPassword(email);
      toast.success(
        isRtl
          ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
          : "Password reset email sent",
      );
    } catch (error) {
      toast.error(getAuthErrorMessage(error, t, isRtl));
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-slate-50 font-sans flex flex-col items-center py-6 sm:py-12 px-4 sm:px-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden mb-8 sm:mb-12"
      >
        <div className="p-6 sm:p-10">
          {/* Enforced Brand: schoolixiQ */}
          <div className="flex flex-col items-center mb-6 sm:mb-10 text-center select-none">
            {/* Elegant Technical Logo Container - Fixed Height to prevent any layout shifts */}
            <div className="h-24 sm:h-28 w-full flex items-center justify-center mb-2 relative group">
              {config.appLogo && config.appLogo !== "/icon.svg" ? (
                <div className="relative">
                  {/* Tech Aura Backlight */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-[#0B2345] to-[#D4A64A] rounded-full blur-xl opacity-10 group-hover:opacity-25 transition duration-500"></div>
                  <img
                    src={config.appLogo || undefined}
                    alt="schoolixiQ Logo"
                    className="max-h-20 sm:max-h-24 w-auto object-contain drop-shadow-sm transition-all duration-500 hover:scale-105 relative z-10"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="relative">
                  {/* Tech Aura Backlight */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#0B2345] to-[#D4A64A] rounded-full blur-2xl opacity-15 group-hover:opacity-30 transition duration-500"></div>
                  <SchoolixLogo size={90} className="relative z-10" />
                </div>
              )}
            </div>

            {/* Platform Brand Title styled geometrically/technically */}
            <div className="relative flex flex-col items-center">
              {/* Elegant Geometric Accents around the main brand */}
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-gradient-to-r from-transparent to-slate-200 rounded-full"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span className="h-[2px] w-8 bg-gradient-to-l from-transparent to-slate-200 rounded-full"></span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mt-2 font-sans select-none">
                <span className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 bg-clip-text text-transparent">
                  schoolix
                </span>
                <span className="text-indigo-600 font-extrabold relative">
                  iQ
                  <span className="absolute -top-0.5 -right-2.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                </span>
              </h1>

              {/* Tagline or subheading */}
              <p className="text-slate-400 mt-2 font-medium tracking-wide text-xs sm:text-sm uppercase font-mono max-w-xs leading-relaxed">
                {t("appTagline")}
              </p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t("login")}
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t("signup")}
            </button>
          </div>

          {/* Android APK download — direct browser download */}
          <div className="mb-6 text-center">
            <a
              href={androidApkUrl ?? "#"}
              download="schoolixiq.apk"
              onClick={handleAndroidApkDownload}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#D4A64A]/40 bg-gradient-to-r from-[#0B2345]/5 to-[#D4A64A]/5 hover:from-[#0B2345]/15 hover:to-[#D4A64A]/15 text-[#0B2345] dark:text-[#D4A64A] font-black text-xs sm:text-sm transition-all hover:border-[#D4A64A] hover:scale-[1.02] active:scale-[0.98] shadow-sm select-none"
            >
              <Smartphone size={16} className="text-[#0B2345] dark:text-[#D4A64A] animate-pulse shrink-0" />
              <span>
                {isRtl ? "تحميل تطبيق أندرويد 📱" : "Download Android App 📱"}
              </span>
            </a>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 sm:space-y-5">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 sm:space-y-5 overflow-hidden"
                >
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-400 mb-1 sm:mb-2 uppercase tracking-widest text-center">
                    {t("role")}
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.PARENT)}
                      className={`flex flex-col items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${role === UserRole.PARENT ? "border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-100" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
                    >
                      <Users size={20} className="mb-1 sm:mb-2 sm:w-6 sm:h-6" />
                      <span className="font-bold text-sm">{t("parent")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.ADMIN)}
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${role === UserRole.ADMIN ? "border-slate-900 bg-slate-50 text-slate-900 shadow-lg shadow-slate-100" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
                    >
                      <Building2 size={24} className="mb-2" />
                      <span className="font-bold text-sm">{t("admin")}</span>
                    </button>
                  </div>

                  <div className="relative">
                    {isRtl ? (
                      <Users
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                    ) : (
                      <Users
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                    )}
                    <input
                      required
                      type="text"
                      placeholder={t("name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                    />
                  </div>

                  {role === UserRole.ADMIN && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 sm:space-y-5"
                    >
                      <div className="relative">
                        {isRtl ? (
                          <Phone
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                          />
                        ) : (
                          <Phone
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                          />
                        )}
                        <input
                          required
                          type="tel"
                          placeholder={t("phone")}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                        />
                      </div>

                      <div className="relative">
                        {isRtl ? (
                          <MapPin
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                          />
                        ) : (
                          <MapPin
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={18}
                          />
                        )}
                        <input
                          required
                          type="text"
                          placeholder={isRtl ? "العنوان التفصيلي للمدرسة" : "School Detailed Address"}
                          value={schoolAddress}
                          onChange={(e) => setSchoolAddress(e.target.value)}
                          className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <select
                            required
                            value={schoolGovernorate}
                            onChange={(e) => setSchoolGovernorate(e.target.value)}
                            className="w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 bg-slate-50/50 outline-none font-bold text-sm sm:text-base dark:text-slate-900 focus:bg-white"
                          >
                            <option value="" disabled>
                              {isRtl ? "اختر المحافظة..." : "Select Governorate..."}
                            </option>
                            <option value="بغداد">بغداد</option>
                            <option value="البصرة">البصرة</option>
                            <option value="نينوى">نينوى</option>
                            <option value="أربيل">أربيل</option>
                            <option value="النجف">النجف</option>
                            <option value="ذي قار">ذي قار</option>
                            <option value="كركوك">كركوك</option>
                            <option value="الأنبار">الأنبار</option>
                            <option value="ديالى">ديالى</option>
                            <option value="المثنى">المثنى</option>
                            <option value="القادسية">القادسية</option>
                            <option value="ميسان">ميسان</option>
                            <option value="واسط">واسط</option>
                            <option value="صلاح الدين">صلاح الدين</option>
                            <option value="دهوك">دهوك</option>
                            <option value="السليمانية">السليمانية</option>
                            <option value="بابل">بابل</option>
                            <option value="كربلاء">كربلاء</option>
                            <option value="حلبجة">حلبجة</option>
                          </select>
                        </div>

                        <div>
                          <select
                            required
                            value={schoolDirectorate}
                            onChange={(e) => setSchoolDirectorate(e.target.value)}
                            className="w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 bg-slate-50/50 outline-none font-bold text-sm sm:text-base dark:text-slate-900 focus:bg-white"
                          >
                            <option value="" disabled>
                              {isRtl ? "اختر المديرية..." : "Select Directorate..."}
                            </option>
                            <option value="مديرية الكرخ الاولى">مديرية الكرخ الاولى</option>
                            <option value="مديرية الكرخ الثانية">مديرية الكرخ الثانية</option>
                            <option value="مديرية الكرخ الثالثه">مديرية الكرخ الثالثه</option>
                            <option value="مديرية الرصافة الاولى">مديرية الرصافة الاولى</option>
                            <option value="مديرية الرصافة الثانية">مديرية الرصافة الثانية</option>
                            <option value="مديرية الرصافة الثالثه">مديرية الرصافة الثالثه</option>
                            <option value="أخرى / مديرية أخرى">أخرى / مديرية أخرى</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <select
                            required
                            value={schoolEducationLevel}
                            onChange={(e) => setSchoolEducationLevel(e.target.value)}
                            className="w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 bg-slate-50/50 outline-none font-bold text-sm sm:text-base dark:text-slate-900 focus:bg-white"
                          >
                            <option value="" disabled>
                              {isRtl ? "المرحلة الدراسية..." : "Education Level..."}
                            </option>
                            <option value="روضة">روضة</option>
                            <option value="ابتدائي">ابتدائي</option>
                            <option value="متوسطة">متوسطة</option>
                            <option value="اعدادية">اعدادية</option>
                            <option value="ثانوي">ثانوي</option>
                          </select>
                        </div>

                        <div>
                          <select
                            required
                            value={schoolWorkingHours}
                            onChange={(e) => setSchoolWorkingHours(e.target.value)}
                            className="w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 bg-slate-50/50 outline-none font-bold text-sm sm:text-base dark:text-slate-900 focus:bg-white"
                          >
                            <option value="" disabled>
                              {isRtl ? "وقت الدوام..." : "Working Hours..."}
                            </option>
                            <option value="صباحي">صباحي</option>
                            <option value="مسائي">مسائي</option>
                            <option value="مدمج">مدمج</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <select
                            required
                            value={schoolStudyType}
                            onChange={(e) => setSchoolStudyType(e.target.value)}
                            className="w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 bg-slate-50/50 outline-none font-bold text-sm sm:text-base dark:text-slate-900 focus:bg-white"
                          >
                            <option value="" disabled>
                              {isRtl ? "نوع الدراسة..." : "Study Type..."}
                            </option>
                            <option value="بنين">بنين</option>
                            <option value="بنات">بنات</option>
                            <option value="مختلط">مختلط</option>
                          </select>
                        </div>

                        <div>
                          <input
                            required
                            type="number"
                            min="1"
                            placeholder={isRtl ? "عدد الطلاب المقدر" : "Estimated Students"}
                            value={schoolEstimatedStudents}
                            onChange={(e) => setSchoolEstimatedStudents(e.target.value)}
                            className="w-full px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base dark:text-slate-900 focus:bg-white"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              {isRtl ? (
                <Mail
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              ) : (
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              )}
              <input
                required
                type="email"
                placeholder={t("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 shadow-inner text-sm sm:text-base`}
              />
            </div>

            <div className="relative">
              {isRtl ? (
                <Lock
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              ) : (
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              )}
              <input
                required
                type={showPassword ? "text" : "password"}
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${isRtl ? "pr-12 pl-12 text-right" : "pl-12 pr-12 text-left"} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 shadow-inner text-sm sm:text-base`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRtl ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10 flex items-center justify-center p-1`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="bg-slate-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-inner">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 hidden sm:block">
                    <ShieldCheck size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-600 text-xs sm:text-sm">
                      {t("checkIfRobot")}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
                      {t("captchaSolve")}: {captchaChallenge.a} +{" "}
                      {captchaChallenge.b} ؟
                    </span>
                  </div>
                </div>
                <input
                  required
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-slate-200 text-center font-bold focus:border-blue-500 outline-none shadow-sm text-sm sm:text-base"
                  placeholder="?"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className={`w-full py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] font-bold text-base sm:text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-50 ${mode === "signup" ? "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"}`}
            >
              {loading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{mode === "login" ? t("login") : t("signup")}</span>
                  <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
                </>
              )}
            </button>

            {mode === "login" && (
              <div className="text-center mt-3 sm:mt-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-slate-400 hover:text-slate-900 font-bold transition-all text-xs sm:text-sm"
                >
                  {t("forgotPassword")}
                </button>
              </div>
            )}

            <div className="relative my-6 sm:my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200"></span>
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">
                  {isRtl ? "أو عبر" : "OR VIA"}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all font-bold text-slate-600 flex items-center justify-center gap-3 shadow-sm hover:border-slate-200 active:scale-95 disabled:opacity-50 text-sm sm:text-base"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-4 h-4 sm:w-5 sm:h-5"
              />
              <span>
                {isRtl
                  ? "دخول سريع باستخدام Google"
                  : "Quick Sign-in with Google"}
              </span>
            </button>

          </form>

          <p className="mt-6 sm:mt-8 text-center text-slate-400 text-xs sm:text-sm font-medium">
            {isRtl
              ? "نظام آمن ومشفر 100% لإدارة تعليمية متميزة"
              : "100% Secure & Encrypted School Management System"}
          </p>
        </div>
      </motion.div>

      {/* Dynamic Direct-Installer Card - Persistently visible for all devices, tailored for Android */}
      {true && (
        <motion.div
          id="download-app-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden mb-8 sm:mb-12 text-center mx-auto"
        >
          <div className="p-6 sm:p-10 text-right">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0B2345]/5 text-[#0B2345] mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-[#0B2345]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 text-center">
              {isRtl ? "تنزيل وتثبيت تطبيق SchoolixiQ للاندرويد" : "Install SchoolixiQ Android App"}
            </h2>
            <p className="text-slate-500 font-bold text-xs sm:text-sm max-w-sm mx-auto mb-6 text-center leading-relaxed">
              {isRtl
                ? "احصل على تطبيق الأندرويد الرسمي للمنصة للاستفادة من الوصول الفوري، والسرعة الفائقة مع إشعارات دفع مباشرة وتنبيهات فورية على هاتفك."
                : "Get the official Android App for instant access, lightning-fast performance, and real-time native push notifications."}
            </p>

            {installingPlatform === null ? (
              <div className="text-center">
                <a
                  href={androidApkUrl ?? "#"}
                  download="schoolixiq.apk"
                  onClick={handleAndroidApkDownload}
                  className="w-full py-4 bg-[#D4A64A] hover:bg-[#0B2345] text-[#0B2345] hover:text-[#D4A64A] border border-[#D4A64A] hover:border-[#0B2345] font-black rounded-2xl text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#D4A64A]/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>{isRtl ? "تحميل تطبيق أندرويد (APK) 📱" : "Download Android App (APK) 📱"}</span>
                </a>
                <p className="text-[10px] text-slate-400 mt-2.5 font-bold">
                  {isRtl
                    ? "حمّل ملف APK ثم ثبّته من مدير الملفات على هاتف أندرويد"
                    : "Download the APK file, then open it on your Android phone to install"}
                </p>
                {!androidApkConfigured && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 font-bold leading-relaxed">
                    {isRtl
                      ? "إذا لم يبدأ التحميل، قد يكون ملف التطبيق غير مرفوع بعد على الخادم. تواصل مع الدعم الفني."
                      : "If download does not start, the app file may not be uploaded to the server yet. Contact support."}
                  </p>
                )}
              </div>
            ) : (
              /* Progress view */
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-right">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">
                    Google Android Package (APK / PWA)
                  </span>
                  <span className="text-sm font-black text-[#0B2345] font-mono">
                    {installProgress}%
                  </span>
                </div>

                {/* Progressive status text */}
                <p className="text-xs font-extrabold text-slate-700 mb-3 min-h-[1.5rem] leading-relaxed">
                  {isRtl ? (
                    installProgress < 30 ? "⚡ جاري فحص ملفات الدعامة والبدء..." :
                    installProgress < 70 ? "📦 جاري تنزيل ملفات التطبيق والمزامنة..." :
                    installProgress < 100 ? "🔧 جاري تهيئة الإشعارات وواجهة الدخول..." :
                    "✨ تم تجهيز ملف التطبيق بنجاح!"
                  ) : (
                    installProgress < 30 ? "⚡ Scanning system requirements..." :
                    installProgress < 70 ? "📦 Downloading modern bundle..." :
                    installProgress < 100 ? "🔧 Registering instant push gateways..." :
                    "✨ App binaries configured successfully!"
                  )}
                </p>

                {/* Progress bar container */}
                <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden mb-4">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#0B2345] to-[#D4A64A]"
                    initial={{ width: 0 }}
                    animate={{ width: `${installProgress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>

                {/* Post-Completion action / Guide */}
                {installProgress === 100 && showInstallSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-3 border-t border-slate-200/60"
                  >
                    <div className="text-xs text-slate-600 font-bold leading-relaxed space-y-2">
                      <p className="text-emerald-600 font-black">
                        {isRtl ? "✓ تم تحضير التطبيق للتثبيت" : "✓ Setup components prepared!"}
                      </p>
                      <p className="font-normal text-slate-500 text-[11px]">
                        {isRtl 
                          ? "إذا لم يظهر لك مربع حوار التثبيت التلقائي الصادر من نظام الاندرويد، يرجى النقر على زر 'تثبيت الآن' بالأسفل، أو النقر على الثلاث نقاط الرأسية أعلى المتصفح واختيار 'تثبيت التطبيق' (Install App)."
                          : "If the native install prompt did not trigger automatically, tap 'Install Now' below or click your browser's menu button and select 'Install' or 'Add to Home screen'."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (deferredInstallPrompt) {
                              deferredInstallPrompt.prompt();
                            } else {
                              toast.error(isRtl ? "يرجى تثبيت التطبيق من خيارات متصفحك مباشرة أو السحب للشاشة الرئيسية" : "Please use browser option to complete install.");
                            }
                          }}
                          className="flex-1 py-3 bg-[#0B2345] hover:bg-[#D4A64A]/90 text-[#D4A64A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#0B2345]/10"
                        >
                          <Download size={13} />
                          {isRtl ? "تثبيت الآن (شاشة الهاتف)" : "Install Now"}
                        </button>
                        
                        <a
                          href={androidApkUrl ?? "#"}
                          download="schoolixiq.apk"
                          onClick={handleAndroidApkDownload}
                          className="flex-1 py-3 bg-[#D4A64A] hover:bg-[#0B2345] text-[#0B2345] hover:text-[#D4A64A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#D4A64A]/10 border border-[#D4A64A]"
                        >
                          <Download size={13} />
                          {isRtl ? "تحميل ملف APK المباشر" : "Download Direct APK"}
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setInstallingPlatform(null)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold rounded-xl text-xs transition-colors"
                    >
                      {isRtl ? "إعادة تهيئة المزامنة" : "Restart & Re-download"}
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Subscription Plans Section */}
      <div className="w-full max-w-6xl mt-12 sm:mt-20">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 sm:mb-4 font-display">
            {isRtl
              ? `باقات الاشتراك في ${config.appName}`
              : `${config.appName} Subscription Plans`}
          </h2>
          <p className="text-slate-500 font-bold text-sm sm:text-base mb-8">
            {isRtl
              ? "اختر الباقة المناسبة لمدرستك وابدأ مسار التحول الرقمي اليوم"
              : "Choose the right plan for your school and start your digital transformation today"}
          </p>

          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full items-center shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
            >
              {isRtl ? "شهرياً" : "Monthly"}
            </button>
            <button
              onClick={() => setBillingCycle("annually")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === "annually" ? "bg-white text-slate-900 shadow-md shadow-slate-200/50" : "text-slate-500 hover:text-slate-700"}`}
            >
              {isRtl ? "سنوياً" : "Annually"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-0">
          {getLocalizedPackages(packages, isRtl).map((pkg) => {
            const displayPrice =
              billingCycle === "annually"
                ? pkg.priceYearly !== undefined
                  ? pkg.priceYearly
                  : pkg.price
                : pkg.priceMonthly !== undefined
                  ? pkg.priceMonthly
                  : Math.round((pkg.price || 0) / 12);
            return (
              <motion.div
                key={pkg.id}
                whileHover={{ y: -8 }}
                className={`bg-white rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border-2 transition-all flex flex-col ${pkg.isPopular ? "border-blue-600 shadow-2xl shadow-blue-100 ring-4 ring-blue-50" : "border-slate-100 shadow-xl"}`}
              >
                {pkg.isPopular && (
                  <span className="bg-blue-600 text-white px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest self-start mb-6">
                    {t("mostPopular")}
                  </span>
                )}
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-4xl font-black text-slate-900">
                    {displayPrice?.toLocaleString()}
                  </span>
                  <span className="text-slate-400 font-bold text-sm">
                    {billingCycle === "annually"
                      ? t("annualShort")
                      : isRtl
                        ? "/ شهرياً"
                        : "/ Monthly"}
                  </span>
                </div>

                <ul className="space-y-4 mb-10 flex-1">
                  {(pkg.features || []).map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} className="text-emerald-600" />
                      </div>
                      <span className="text-slate-600 text-sm font-medium">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowSubscriptionModal(pkg)}
                  className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 ${pkg.isPopular ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                >
                  {t("subscribeNow")}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Marketing Landing Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full mt-24 sm:mt-32 pt-20 pb-12 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[500px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-7xl mx-auto px-4 z-10 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-black tracking-widest mb-6 border border-blue-100/50 dark:border-blue-800/50 shadow-sm"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>
                {isRtl ? "لماذا تختار منصتنا؟" : "Why Choose Our Platform?"}
              </span>
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-8 font-display leading-[1.1] tracking-tight"
            >
              {config.marketingTitle ||
                (isRtl
                  ? "منصة الإدارة والتحصيل الذكي المتقدمة لمدارس العراق الأهلية"
                  : "Smart School Management & Tuition System")}
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 dark:text-slate-400 font-medium text-lg md:text-xl leading-relaxed max-w-2xl mx-auto"
            >
              {config.marketingSubtitle ||
                (isRtl
                  ? "نظام بيئي متكامل يربط الإدارة والمعلمين وأولياء الأمور لتسهيل جباية الأقساط، تتبع الغيابات ومراقبة النتائج بمرونة تامة ونظام إشعارات ذكي يرتقي بتجربة التعليم."
                  : "An integrated ecosystem connecting admins, teachers, and parents to streamline fee collection, track attendance, and monitor school progress with intelligent notifications.")}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {(config.marketingFeatures && config.marketingFeatures.length > 0
              ? config.marketingFeatures
              : [
                  {
                    title: isRtl
                      ? "متابعة الأقساط الذكية"
                      : "Smart Fees Tracking",
                    description: isRtl
                      ? "لوحة تحكم تفصيلية لمتابعة الأقساط والتحصيل اليومي وجدولة الدفعات تلقائياً."
                      : "Comprehensive dashboard for following payments and auto-scheduling batches.",
                  },
                  {
                    title: isRtl
                      ? "ربط متكامل ومباشر"
                      : "Seamless Parent Connection",
                    description: isRtl
                      ? "واجهة مخصصة تتيح لولي الأمر متابعة شاملة للغيابات، النتائج وتواريخ السداد."
                      : "Dedicated portal for parents to monitor attendance, grades, and schedules.",
                  },
                  {
                    title: isRtl
                      ? "إنذارات وتذكير فوري"
                      : "Automated Notifications",
                    description: isRtl
                      ? "تذكير فوري ذكي لإعلام أولياء الأمور بالدفعات عبر منصات التواصل والرسائل."
                      : "Instant, automatic reminders notifying parents of due and overdue fees.",
                  },
                  {
                    title: isRtl ? "إحصائيات تفاعلية" : "Interactive Analytics",
                    description: isRtl
                      ? "تقارير ورسوم بيانية ذكية تدعم اتخاذ القرار وتوفر لك رؤية فورية عن الديون والسيولة."
                      : "Intelligent charts to plan your budget, track debts, and cash flow.",
                  },
                  {
                    title: isRtl
                      ? "إدارة أكاديمية مبسطة"
                      : "Simplified Academic Mgmt",
                    description: isRtl
                      ? "تنظيم الجداول، توزيع الحصص الدراسية ومتابعة تقييمات الطلاب بسهولة."
                      : "Organize schedules, distribute classes and track evaluations easily.",
                  },
                  {
                    title: isRtl
                      ? "تشفير وحماية بيانات"
                      : "Encrypted Data Security",
                    description: isRtl
                      ? "بيانات مدرستك في أمان تام مع أعلى معايير التشفير والنسخ الاحتياطي السحابي."
                      : "Your school data is secure with the highest encryption and cloud backup standards.",
                  },
                  {
                    title: isRtl
                      ? "تطبيق للهواتف الذكية"
                      : "Mobile Application",
                    description: isRtl
                      ? "تطبيق مخصص لأولياء الأمور للوصول المباشر وتتبع مستوى الطالب بشكل فوري."
                      : "Dedicated mobile app for parents to track student progress instantly.",
                  },
                  {
                    title: isRtl
                      ? "إدارة وتصدير التقارير"
                      : "Reports Management",
                    description: isRtl
                      ? "أرشفة وتصدير تقارير وتقييمات الطلاب بسهولة وبصيغ متعددة بضغطة زر واحدة."
                      : "Easily archive and export student reports in multiple formats with one click.",
                  },
                ]
            ).map((feat, idx) => {
              const bgColors = [
                "from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-blue-600 dark:text-blue-400 group-hover:from-blue-500 group-hover:to-indigo-600",
                "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-600 dark:text-emerald-400 group-hover:from-emerald-500 group-hover:to-teal-600",
                "from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 text-orange-600 dark:text-orange-400 group-hover:from-orange-500 group-hover:to-amber-600",
                "from-purple-500/10 to-fuchsia-500/10 dark:from-purple-500/20 dark:to-fuchsia-500/20 text-purple-600 dark:text-purple-400 group-hover:from-purple-500 group-hover:to-fuchsia-600",
                "from-pink-500/10 to-rose-500/10 dark:from-pink-500/20 dark:to-rose-500/20 text-pink-600 dark:text-pink-400 group-hover:from-pink-500 group-hover:to-rose-600",
                "from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 text-cyan-600 dark:text-cyan-400 group-hover:from-cyan-500 group-hover:to-blue-600",
                "from-yellow-500/10 to-amber-500/10 dark:from-yellow-500/20 dark:to-amber-500/20 text-yellow-600 dark:text-yellow-400 group-hover:from-yellow-500 group-hover:to-amber-600",
                "from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20 text-sky-600 dark:text-sky-400 group-hover:from-sky-500 group-hover:to-blue-600",
              ];
              const IconsList = [
                Coins,
                Users,
                Bell,
                TrendingUp,
                GraduationCap,
                ShieldCheck,
                Smartphone,
                ClipboardList,
              ];

              const themeClass = bgColors[idx % bgColors.length];
              const Icon = IconsList[idx % IconsList.length];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.1,
                    ease: "easeOut",
                  }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:border-transparent dark:hover:border-transparent transition-all duration-300 z-10 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-500 from-slate-400 to-slate-900 pointer-events-none"></div>

                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${themeClass} flex items-center justify-center shrink-0 mb-8 transition-all duration-300 group-hover:shadow-lg group-hover:text-white`}
                  >
                    <Icon size={28} />
                  </div>

                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 font-display group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    {feat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="-mx-6 -mb-12 mt-20 w-[calc(100%+3rem)]">
        <GlobalFooter />
      </div>

      <AnimatePresence>
        {successCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6">
                <Check size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-4">
                {t("orderSentSuccess")}
              </h2>
              <p className="text-slate-500 font-bold mb-8">
                {t("orderSentDesc")}
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mb-8 select-all">
                <span className="text-4xl font-black text-slate-900 tracking-widest">
                  {successCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-8 leading-relaxed">
                {t("keepCodeForSupport")}
              </p>
              <button
                onClick={() => setSuccessCode(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
              >
                {t("gotIt")}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] md:rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-4 md:top-6 left-4 md:left-6 z-10">
                <button
                  onClick={() => setShowSubscriptionModal(null)}
                  className="p-2 bg-slate-100/80 backdrop-blur rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1">
                <div className="relative h-32 md:h-40 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex items-end">
                  <div className="absolute top-0 right-0 p-8 opacity-10 text-white pointer-events-none">
                    <Package size={120} />
                  </div>
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <h2 className="text-xl md:text-2xl font-black text-white">
                      {t("newSubscriptionRequest")}
                    </h2>
                    <p className="text-blue-100 font-bold text-xs md:text-sm mt-1">
                      {t("requestingPackage")} {showSubscriptionModal.name}
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-10">
                  <form
                    onSubmit={handleSubscribeRequest}
                    className="space-y-4 md:space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {t("fullSchoolName")}
                        </label>
                        <div className="relative">
                          {isRtl ? (
                            <Users
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          ) : (
                            <Users
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          )}
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
                            className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                            placeholder={t("enterName")}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {t("phoneNumber")}
                        </label>
                        <div className="relative">
                          {isRtl ? (
                            <Phone
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          ) : (
                            <Phone
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={16}
                            />
                          )}
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
                            className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                            placeholder="07XXXXXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {t("email")}
                      </label>
                      <div className="relative">
                        {isRtl ? (
                          <Mail
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        ) : (
                          <Mail
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        )}
                        <input
                          required
                          type="email"
                          value={subscriptionForm.email}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              email: e.target.value,
                            })
                          }
                          className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                          placeholder="example@email.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {t("detailedAddress")}
                      </label>
                      <div className="relative">
                        {isRtl ? (
                          <MapPin
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        ) : (
                          <MapPin
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        )}
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
                          className={`w-full ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                          placeholder={
                            isRtl
                              ? "المحافظة - القضاء - الحي"
                              : "Province - District - Neighborhood"
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        {t("suggestedAdminPassword")}
                      </label>
                      <div className="relative">
                        {isRtl ? (
                          <Lock
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        ) : (
                          <Lock
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                          />
                        )}
                        <input
                          required
                          type={showSubscriptionPassword ? "text" : "password"}
                          value={subscriptionForm.password}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              password: e.target.value,
                            })
                          }
                          className={`w-full ${isRtl ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left"} py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 outline-none font-bold bg-slate-50/50 transition-colors text-sm md:text-base`}
                          placeholder={t("strongPassword")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSubscriptionPassword(!showSubscriptionPassword)}
                          className={`absolute ${isRtl ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10 flex items-center justify-center p-1`}
                        >
                          {showSubscriptionPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Governorate & Directorate */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {isRtl ? "المحافظة" : "Governorate"}
                        </label>
                        <select
                          required
                          value={subscriptionForm.governorate}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              governorate: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 bg-slate-50/50 outline-none font-bold text-sm md:text-base dark:text-slate-900 focus:bg-white transition-colors"
                        >
                          <option value="" disabled>
                            {isRtl ? "اختر المحافظة..." : "Select Governorate..."}
                          </option>
                          <option value="بغداد">بغداد</option>
                          <option value="البصرة">البصرة</option>
                          <option value="نينوى">نينوى</option>
                          <option value="أربيل">أربيل</option>
                          <option value="النجف">النجف</option>
                          <option value="ذي قار">ذي قار</option>
                          <option value="كركوك">كركوك</option>
                          <option value="الأنبار">الأنبار</option>
                          <option value="ديالى">ديالى</option>
                          <option value="المثنى">المثنى</option>
                          <option value="القادسية">القادسية</option>
                          <option value="ميسان">ميسان</option>
                          <option value="واسط">واسط</option>
                          <option value="صلاح الدين">صلاح الدين</option>
                          <option value="دهوك">دهوك</option>
                          <option value="السليمانية">السليمانية</option>
                          <option value="بابل">بابل</option>
                          <option value="كربلاء">كربلاء</option>
                          <option value="حلبجة">حلبجة</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {isRtl ? "المديرية" : "Directorate"}
                        </label>
                        <select
                          required
                          value={subscriptionForm.directorate}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              directorate: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 bg-slate-50/50 outline-none font-bold text-sm md:text-base dark:text-slate-900 focus:bg-white transition-colors"
                        >
                          <option value="" disabled>
                            {isRtl ? "اختر المديرية..." : "Select Directorate..."}
                          </option>
                          <option value="مديرية الكرخ الاولى">مديرية الكرخ الاولى</option>
                          <option value="مديرية الكرخ الثانية">مديرية الكرخ الثانية</option>
                          <option value="مديرية الكرخ الثالثه">مديرية الكرخ الثالثه</option>
                          <option value="مديرية الرصافة الاولى">مديرية الرصافة الاولى</option>
                          <option value="مديرية الرصافة الثانية">مديرية الرصافة الثانية</option>
                          <option value="مديرية الرصافة الثالثه">مديرية الرصافة الثالثه</option>
                          <option value="أخرى / مديرية أخرى">أخرى / مديرية أخرى</option>
                        </select>
                      </div>
                    </div>

                    {/* Stage & Shift */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {isRtl ? "المرحلة الدراسية" : "Education Level"}
                        </label>
                        <select
                          required
                          value={subscriptionForm.educationLevel}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              educationLevel: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 bg-slate-50/50 outline-none font-bold text-sm md:text-base dark:text-slate-900 focus:bg-white transition-colors"
                        >
                          <option value="" disabled>
                            {isRtl ? "اختر المرحلة..." : "Select Education Level..."}
                          </option>
                          <option value="روضة">روضة</option>
                          <option value="ابتدائي">ابتدائي</option>
                          <option value="متوسطة">متوسطة</option>
                          <option value="اعدادية">اعدادية</option>
                          <option value="ثانوي">ثانوي</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {isRtl ? "وقت الدوام" : "Working Hours"}
                        </label>
                        <select
                          required
                          value={subscriptionForm.workingHours}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              workingHours: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 bg-slate-50/50 outline-none font-bold text-sm md:text-base dark:text-slate-900 focus:bg-white transition-colors"
                        >
                          <option value="" disabled>
                            {isRtl ? "اختر الدوام..." : "Select Working Shift..."}
                          </option>
                          <option value="صباحي">صباحي</option>
                          <option value="مسائي">مسائي</option>
                          <option value="مدمج">مدمج</option>
                        </select>
                      </div>
                    </div>

                    {/* Study Gender Type & Estimated Students */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {isRtl ? "نوع الدراسة" : "Study Type"}
                        </label>
                        <select
                          required
                          value={subscriptionForm.studyType}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              studyType: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 bg-slate-50/50 outline-none font-bold text-sm md:text-base dark:text-slate-900 focus:bg-white transition-colors"
                        >
                          <option value="" disabled>
                            {isRtl ? "اختر نوع الدراسة..." : "Select Study Type..."}
                          </option>
                          <option value="بنين">بنين</option>
                          <option value="بنات">بنات</option>
                          <option value="مختلط">مختلط</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                          {isRtl ? "عدد الطلاب المقدر" : "Estimated Students"}
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          value={subscriptionForm.estimatedStudents}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              estimatedStudents: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-200 focus:border-blue-600 bg-slate-50/50 outline-none font-bold text-sm md:text-base dark:text-slate-900 focus:bg-white transition-colors"
                          placeholder={isRtl ? "مثل: 250" : "e.g. 250"}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 mt-4 shadow-inner">
                      <div
                        className={`flex items-center justify-between font-black ${isRtl ? "flex-row" : "flex-row-reverse"}`}
                      >
                        <span className="text-xl md:text-2xl text-slate-900">
                          {(() => {
                            const isMonthly = billingCycle === "monthly";
                            const actualPrice = isMonthly
                              ? showSubscriptionModal.priceMonthly !== undefined
                                ? showSubscriptionModal.priceMonthly
                                : Math.round(
                                    (showSubscriptionModal.price || 0) / 12,
                                  )
                              : showSubscriptionModal.priceYearly !== undefined
                                ? showSubscriptionModal.priceYearly
                                : showSubscriptionModal.price;
                            return actualPrice?.toLocaleString();
                          })()}{" "}
                          {t("iqd")}
                        </span>
                        <span className="text-slate-400 text-xs md:text-sm uppercase tracking-widest">
                          {billingCycle === "monthly"
                            ? isRtl
                              ? "شهرياً"
                              : "Monthly"
                            : t("annualTotal")}
                        </span>
                      </div>
                    </div>

                    <button
                      disabled={isSubmitting}
                      className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 mt-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                      ) : (
                        t("confirmSubscriptionAndSend")
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

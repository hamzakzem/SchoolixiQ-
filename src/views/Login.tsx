import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  getEmailAuthErrorMessage,
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
import { isCustomAppLogo } from "../lib/brandAssets";
import { submitDistributorRegistration } from "../lib/distributorRegistration";
import { DistributorAccessScreen } from "../components/DistributorAccessScreen";
import { ScrollToTopButton } from "../components/ScrollToTopButton";

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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login",
  );
  const [authPanel, setAuthPanel] = useState<"account" | "distributor" | "distributor_success" | "reset">(
    searchParams.get("panel") === "distributor" ? "distributor" : "account",
  );
  const [distributorForm, setDistributorForm] = useState({
    name: "",
    phone: "",
    address: "",
    governorate: "",
    email: "",
  });
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
      toast.error(getEmailAuthErrorMessage(error, t, isRtl));
    } finally {
      setLoading(false);
    }
  };

  const handleDistributorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributorForm.name.trim() || !distributorForm.phone.trim() || !distributorForm.address.trim() || !distributorForm.governorate) {
      toast.error(isRtl ? "يرجى تعبئة جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await submitDistributorRegistration({
        name: distributorForm.name.trim(),
        phone: distributorForm.phone.trim(),
        address: distributorForm.address.trim(),
        governorate: distributorForm.governorate,
        email: distributorForm.email.trim() || undefined,
      });
      setAuthPanel("distributor_success");
      toast.success(isRtl ? "تم إرسال طلب الموزع بنجاح" : "Distributor application submitted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : (isRtl ? "فشل إرسال الطلب" : "Submission failed"));
    } finally {
      setLoading(false);
    }
  };

  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) {
      toast.error(isRtl ? "يرجى إدخال البريد الإلكتروني أولاً" : "Enter your email first");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      toast.success(
        isRtl
          ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني"
          : "Password reset email sent",
      );
    } catch (error) {
      toast.error(getEmailAuthErrorMessage(error, t, isRtl));
    } finally {
      setLoading(false);
    }
  };

  const openPanel = (panel: "account" | "distributor" | "reset", nextMode?: "login" | "signup") => {
    setAuthPanel(panel);
    if (nextMode) setMode(nextMode);
    setResetSent(false);
  };

  const fieldClass = `w-full ${isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"} py-3.5 rounded-xl border border-white/10 bg-white/[0.04] font-semibold text-sm sm:text-base text-white placeholder:text-slate-500 outline-none transition focus:bg-white/[0.07] focus:border-[#D4AF37]/60 focus:ring-4 focus:ring-[#D4AF37]/10`;
  const selectClass =
    "w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.04] font-semibold text-sm sm:text-base text-white outline-none transition focus:bg-white/[0.07] focus:border-[#D4AF37]/60 focus:ring-4 focus:ring-[#D4AF37]/10";
  const iconClass = `absolute ${isRtl ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none`;
  const primaryButtonClass =
    "w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-3 transition-all bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B2345] hover:brightness-105 shadow-[0_12px_30px_-10px_rgba(212,175,55,0.55)] active:scale-[0.98] disabled:opacity-50";
  const secondaryLinkClass =
    "w-full py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors";
  const spinner = (
    <div className="w-5 h-5 border-2 border-[#0B2345]/25 border-t-[#0B2345] rounded-full animate-spin" />
  );

  const panelHeading =
    authPanel === "reset"
      ? {
          title: isRtl ? "استعادة كلمة المرور" : "Reset your password",
          subtitle: isRtl
            ? "أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة"
            : "Enter your email and we'll send you a reset link",
        }
      : authPanel === "distributor"
        ? {
            title: isRtl ? "انضم كموزع معتمد" : "Become a distributor",
            subtitle: isRtl
              ? "أرسل طلبك وستتم مراجعته من الإدارة قبل تفعيل الحساب"
              : "Your account will be activated after admin approval",
          }
        : mode === "signup"
          ? {
              title: isRtl ? "أنشئ حسابك" : "Create your account",
              subtitle: isRtl
                ? "اختر نوع الحساب وأكمل بياناتك خلال دقيقة"
                : "Pick an account type and finish in a minute",
            }
          : {
              title: isRtl ? "مرحباً بعودتك" : "Welcome back",
              subtitle: isRtl
                ? "سجّل الدخول لمتابعة مدرستك وأبنائك"
                : "Sign in to continue to your dashboard",
            };

  const brandBenefits = isRtl
    ? [
        "حضور وغياب ودرجات لحظية لأولياء الأمور",
        "إدارة مالية وأقساط وتقارير دقيقة",
        "تواصل مباشر بين المدرسة والأهل",
        "انصراف آمن للطلاب عبر رمز QR",
      ]
    : [
        "Live attendance and grades for parents",
        "Fees, finance and accurate reports",
        "Direct school-to-parent messaging",
        "Safe QR-based student dismissal",
      ];

  if (authPanel === "distributor_success") {
    return <DistributorAccessScreen variant="submitted" isRtl={isRtl} />;
  }

  return (
    <div
      className="auth-dark relative isolate overflow-x-hidden min-h-[100dvh] bg-[#061429] text-slate-100 [color-scheme:dark] font-sans flex flex-col items-center py-5 sm:py-10 px-4 sm:px-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Ambient background — same navy/gold language as the landing page */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_85%_0%,rgba(212,175,55,0.16),transparent_65%),radial-gradient(ellipse_55%_50%_at_0%_100%,rgba(56,120,220,0.14),transparent_60%),linear-gradient(180deg,#071833_0%,#061429_100%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      </div>

      {/* Kept on the left edge: the language toggle is pinned top-right */}
      <div className={`w-full max-w-lg lg:max-w-5xl mb-4 sm:mb-6 flex ${isRtl ? "justify-end" : "justify-start"}`}>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold text-slate-300 border border-white/10 bg-white/[0.03] hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowRight size={16} className={isRtl ? "" : "rotate-180"} />
          {isRtl ? "العودة للرئيسية" : "Back to home"}
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg lg:max-w-5xl lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] rounded-[2rem] border border-white/10 bg-[#0a1f3f]/75 backdrop-blur-xl shadow-[0_40px_100px_-30px_rgba(0,0,0,0.75)] overflow-hidden mb-8 sm:mb-12"
      >
        <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/70 to-transparent" />
        {/* Brand panel — desktop only */}
        <aside className="hidden lg:flex flex-col justify-between gap-10 relative overflow-hidden bg-gradient-to-br from-[#10305c] via-[#0b2448] to-[#081a36] border-e border-white/10 text-white p-10 xl:p-12">
          <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-[#D4A64A]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-28 -start-20 w-80 h-80 rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-black/30 ring-4 ring-white/5 mb-6">
              {isCustomAppLogo(config.appLogo) ? (
                <img
                  src={config.appLogo || undefined}
                  alt="SchoolixIQ logo"
                  className="max-h-12 w-auto object-contain"
                />
              ) : (
                <SchoolixLogo size={44} />
              )}
            </div>
            <p className="text-3xl font-black tracking-tight" dir="ltr">
              Schoolix<span className="text-[#D4A64A]">iQ</span>
            </p>
            <p className="mt-3 text-slate-300 font-semibold leading-relaxed max-w-sm">
              {isRtl
                ? "منصة متكاملة تجمع الإدارة والمعلمين وأولياء الأمور في مكان واحد."
                : "One platform for school management, teachers and parents."}
            </p>
          </div>

          <ul className="relative space-y-4">
            {brandBenefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 font-bold text-slate-100">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#D4AF37]/15 text-[#E8C76E] ring-1 ring-[#D4AF37]/30 flex items-center justify-center">
                  <Check size={15} strokeWidth={3} />
                </span>
                <span className="leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>

          <p className="relative flex items-center gap-2 text-xs font-semibold text-slate-400">
            <ShieldCheck size={16} className="text-[#D4A64A]" />
            {isRtl ? "اتصال آمن ومشفّر بالكامل" : "Fully secure, encrypted connection"}
          </p>
        </aside>

        <div className="p-6 sm:p-10">
          {/* Brand header */}
          <div className="flex flex-col items-center mb-6 sm:mb-8 text-center select-none">
            <div className="lg:hidden mb-3 w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-black/30">
              {isCustomAppLogo(config.appLogo) ? (
                <img
                  src={config.appLogo || undefined}
                  alt="SchoolixIQ logo"
                  className="max-h-12 w-auto object-contain"
                  loading="eager"
                />
              ) : (
                <SchoolixLogo size={44} />
              )}
            </div>
            <p className="lg:hidden text-2xl font-black tracking-tight text-white mb-4" dir="ltr">
              Schoolix<span className="text-[#E8C76E]">iQ</span>
            </p>
            <h1 className="text-2xl sm:text-[1.75rem] font-black text-white leading-tight">
              {panelHeading.title}
            </h1>
            <p className="mt-2 text-sm sm:text-base font-medium text-slate-400 leading-relaxed max-w-sm">
              {panelHeading.subtitle}
            </p>
          </div>

          {authPanel !== "reset" && (
            <div role="tablist" className="grid grid-cols-3 gap-1 bg-white/[0.04] border border-white/10 p-1 rounded-2xl mb-6">
              {([
                { key: "login", label: t("login"), active: authPanel === "account" && mode === "login", onClick: () => openPanel("account", "login") },
                { key: "signup", label: t("signup"), active: authPanel === "account" && mode === "signup", onClick: () => openPanel("account", "signup") },
                { key: "distributor", label: isRtl ? "تسجيل موزع" : "Distributor", active: authPanel === "distributor", onClick: () => openPanel("distributor") },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={tab.active}
                  onClick={tab.onClick}
                  className={`py-2.5 sm:py-3 rounded-xl font-bold text-[13px] sm:text-sm transition-all ${tab.active ? "bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B2345] shadow-md shadow-black/20" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {authPanel === "reset" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetSent ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-400/15 text-emerald-300 flex items-center justify-center mx-auto mb-3">
                    <Mail size={22} />
                  </div>
                  <p className="font-black text-emerald-200">
                    {isRtl ? "تحقق من بريدك الإلكتروني" : "Check your inbox"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-emerald-100/80 leading-relaxed">
                    {isRtl
                      ? `أرسلنا رابط إعادة التعيين إلى ${email}. إذا لم تجده، تحقق من مجلد الرسائل غير المرغوب فيها.`
                      : `We sent a reset link to ${email}. Check your spam folder if you can't find it.`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Mail className={iconClass} size={18} />
                    <input
                      required
                      autoFocus
                      type="email"
                      autoComplete="email"
                      placeholder={t("email")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <button type="submit" disabled={loading} className={primaryButtonClass}>
                    {loading ? (
                      spinner
                    ) : isRtl ? (
                      "إرسال رابط الاستعادة"
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => openPanel("account", "login")}
                className={secondaryLinkClass}
              >
                {isRtl ? "العودة لتسجيل الدخول" : "Back to sign in"}
              </button>
            </form>
          ) : authPanel === "distributor" ? (
            <form onSubmit={handleDistributorRegister} className="space-y-4">
              <div className="relative">
                <Users className={iconClass} size={18} />
                <input
                  required
                  type="text"
                  autoComplete="name"
                  placeholder={isRtl ? "الاسم الكامل" : "Full name"}
                  value={distributorForm.name}
                  onChange={(e) => setDistributorForm({ ...distributorForm, name: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="relative">
                <Phone className={iconClass} size={18} />
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder={isRtl ? "رقم الهاتف" : "Phone number"}
                  value={distributorForm.phone}
                  onChange={(e) => setDistributorForm({ ...distributorForm, phone: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="relative">
                <MapPin className={iconClass} size={18} />
                <input
                  required
                  type="text"
                  autoComplete="street-address"
                  placeholder={isRtl ? "العنوان" : "Address"}
                  value={distributorForm.address}
                  onChange={(e) => setDistributorForm({ ...distributorForm, address: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <select
                required
                value={distributorForm.governorate}
                onChange={(e) => setDistributorForm({ ...distributorForm, governorate: e.target.value })}
                className={selectClass}
              >
                <option value="">{isRtl ? "اختر المحافظة..." : "Select governorate..."}</option>
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
              <div className="relative">
                <Mail className={iconClass} size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder={isRtl ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
                  value={distributorForm.email}
                  onChange={(e) => setDistributorForm({ ...distributorForm, email: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <button type="submit" disabled={loading} className={primaryButtonClass}>
                {loading ? (
                      spinner
                    ) : isRtl ? (
                  "إرسال طلب الموزع"
                ) : (
                  "Submit distributor application"
                )}
              </button>
              <button
                type="button"
                onClick={() => openPanel("account", "login")}
                className={secondaryLinkClass}
              >
                {isRtl ? "العودة لتسجيل الدخول" : "Back to sign in"}
              </button>
            </form>
          ) : (
          <>
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
                  <label className="block text-xs sm:text-sm font-bold text-slate-400 mb-1 text-center">
                    {t("role")}
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.PARENT)}
                      aria-pressed={role === UserRole.PARENT}
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${role === UserRole.PARENT ? "border-[#D4AF37]/70 bg-[#D4AF37]/10 text-[#F0D58A] shadow-lg shadow-black/20" : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"}`}
                    >
                      <Users size={24} className="mb-2" />
                      <span className="font-bold text-sm">{t("parent")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole(UserRole.ADMIN)}
                      aria-pressed={role === UserRole.ADMIN}
                      className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${role === UserRole.ADMIN ? "border-[#D4AF37]/70 bg-[#D4AF37]/10 text-[#F0D58A] shadow-lg shadow-black/20" : "border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"}`}
                    >
                      <Building2 size={24} className="mb-2" />
                      <span className="font-bold text-sm">{t("admin")}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Users className={iconClass} size={18} />
                    <input
                      required
                      type="text"
                      placeholder={t("name")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={fieldClass}
                    />
                  </div>

                  {role === UserRole.ADMIN && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 sm:space-y-5"
                    >
                      <div className="relative">
                        <Phone className={iconClass} size={18} />
                        <input
                          required
                          type="tel"
                          placeholder={t("phone")}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={fieldClass}
                        />
                      </div>

                      <div className="relative">
                        <MapPin className={iconClass} size={18} />
                        <input
                          required
                          type="text"
                          placeholder={isRtl ? "العنوان التفصيلي للمدرسة" : "School Detailed Address"}
                          value={schoolAddress}
                          onChange={(e) => setSchoolAddress(e.target.value)}
                          className={fieldClass}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <select
                            required
                            value={schoolGovernorate}
                            onChange={(e) => setSchoolGovernorate(e.target.value)}
                            className={selectClass}
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
                            className={selectClass}
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
                            className={selectClass}
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
                            className={selectClass}
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
                            className={selectClass}
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
                            className={selectClass}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className={iconClass} size={18} />
              <input
                required
                type="email"
                autoComplete="username"
                placeholder={t("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="relative">
              <Lock className={iconClass} size={18} />
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={t("password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${fieldClass} ${isRtl ? "pl-12" : "pr-12"}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? (isRtl ? "إخفاء كلمة المرور" : "Hide password") : (isRtl ? "إظهار كلمة المرور" : "Show password")}
                className={`absolute ${isRtl ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer z-10 flex items-center justify-center p-1`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === "login" && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => openPanel("reset")}
                  className="text-sm font-bold text-[#E8C76E]/80 hover:text-[#F0D58A] transition-colors"
                >
                  {t("forgotPassword")}
                </button>
              </div>
            )}

            <div className="bg-white/[0.03] px-4 py-3.5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-[#D4AF37]/10 p-1.5 sm:p-2 rounded-lg ring-1 ring-[#D4AF37]/25 hidden sm:block">
                    <ShieldCheck size={20} className="text-[#E8C76E]" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-200 text-xs sm:text-sm">
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
                  className="w-16 sm:w-20 px-2 py-2.5 rounded-lg border border-white/10 bg-white/[0.06] text-white text-center font-bold outline-none transition focus:border-[#D4AF37]/60 focus:ring-4 focus:ring-[#D4AF37]/10 text-sm sm:text-base placeholder:text-slate-500"
                  placeholder="?"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className={primaryButtonClass}
            >
              {loading ? (
                spinner
              ) : (
                <>
                  <span>{mode === "login" ? t("login") : t("signup")}</span>
                  <ArrowRight size={20} className={isRtl ? "rotate-180" : ""} />
                </>
              )}
            </button>

            <div className="flex items-center gap-4 my-6 sm:my-7 text-xs font-bold text-slate-500">
              <span className="h-px flex-1 bg-gradient-to-l from-white/15 to-transparent" />
              {isRtl ? "أو" : "OR"}
              <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              className="w-full py-3.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all font-bold text-slate-100 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base"
            >
              <img
                src="/brand/google-g.svg"
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
          </>
          )}

          <p className="mt-6 sm:mt-8 flex items-center justify-center gap-2 text-center text-slate-500 text-xs sm:text-sm font-medium">
            <ShieldCheck size={16} className="shrink-0 text-[#D4AF37]/70" />
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
          className="w-full max-w-lg lg:max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden mb-8 sm:mb-12 text-center mx-auto"
        >
          <div className="p-6 sm:p-8 text-right max-w-xl mx-auto">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/25 mx-auto mb-4">
              <Smartphone className="w-6 h-6 text-[#E8C76E]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2 text-center">
              {isRtl ? "تطبيق SchoolixiQ للأندرويد" : "Install SchoolixiQ Android App"}
            </h2>
            <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-sm mx-auto mb-6 text-center leading-relaxed">
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
                  className="w-full sm:w-auto sm:min-w-[260px] sm:mx-auto py-3.5 px-6 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#F0D58A] font-black text-sm sm:text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>{isRtl ? "تحميل تطبيق أندرويد (APK)" : "Download Android App (APK)"}</span>
                </a>
                <p className="text-[11px] text-slate-500 mt-2.5 font-medium">
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
              <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/10 text-right">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400">
                    Google Android Package (APK / PWA)
                  </span>
                  <span className="text-sm font-black text-[#E8C76E] font-mono">
                    {installProgress}%
                  </span>
                </div>

                {/* Progressive status text */}
                <p className="text-xs font-extrabold text-slate-200 mb-3 min-h-[1.5rem] leading-relaxed">
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
                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-4">
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
                    className="space-y-4 pt-3 border-t border-white/10"
                  >
                    <div className="text-xs text-slate-300 font-bold leading-relaxed space-y-2">
                      <p className="text-emerald-300 font-black">
                        {isRtl ? "✓ تم تحضير التطبيق للتثبيت" : "✓ Setup components prepared!"}
                      </p>
                      <p className="font-normal text-slate-400 text-[11px]">
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
                      className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-xl text-xs transition-colors"
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
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 sm:mb-4 font-display">
            {isRtl
              ? `باقات الاشتراك في ${config.appName}`
              : `${config.appName} Subscription Plans`}
          </h2>
          <p className="text-slate-400 font-medium text-sm sm:text-base mb-8">
            {isRtl
              ? "اختر الباقة المناسبة لمدرستك وابدأ مسار التحول الرقمي اليوم"
              : "Choose the right plan for your school and start your digital transformation today"}
          </p>

          <div className="inline-flex bg-white/[0.04] border border-white/10 p-1 rounded-full items-center">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B2345] shadow-md" : "text-slate-400 hover:text-white"}`}
            >
              {isRtl ? "شهرياً" : "Monthly"}
            </button>
            <button
              onClick={() => setBillingCycle("annually")}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-sm font-bold transition-all ${billingCycle === "annually" ? "bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B2345] shadow-md" : "text-slate-400 hover:text-white"}`}
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
                whileHover={{ y: -4 }}
                className={`rounded-[2rem] p-6 sm:p-8 border backdrop-blur-xl transition-all flex flex-col ${pkg.isPopular ? "border-[#D4AF37]/50 bg-gradient-to-b from-[#D4AF37]/[0.12] to-white/[0.02] shadow-[0_30px_80px_-30px_rgba(212,175,55,0.45)]" : "border-white/10 bg-white/[0.03]"}`}
              >
                {pkg.isPopular && (
                  <span className="bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B2345] px-4 py-1 rounded-full text-[11px] font-black self-start mb-5">
                    {t("mostPopular")}
                  </span>
                )}
                <h3 className="text-2xl font-black text-white mb-2">
                  {pkg.name}
                </h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-4xl font-black text-[#F0D58A]">
                    {displayPrice?.toLocaleString("en-US")}
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
                      <div className="w-5 h-5 bg-[#D4AF37]/15 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={12} className="text-[#E8C76E]" />
                      </div>
                      <span className="text-slate-300 text-sm font-medium">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowSubscriptionModal(pkg)}
                  className={`w-full py-3.5 rounded-xl font-black transition-all active:scale-[0.98] ${pkg.isPopular ? "bg-gradient-to-b from-[#EDD07F] to-[#C99A2E] text-[#0B2345] hover:brightness-105" : "border border-white/15 text-white hover:bg-white/10"}`}
                >
                  {t("subscribeNow")}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 sm:-mx-6 -mb-6 sm:-mb-12 mt-16 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] border-t border-white/10">
        <GlobalFooter compact />
      </div>

      <ScrollToTopButton label={isRtl ? "العودة للأعلى" : "Back to top"} />

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

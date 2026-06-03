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
  MapPin,
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
  arrayUnion,
  updateDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { useState, useEffect, lazy, Suspense, Component, ReactNode, ErrorInfo } from "react";
import { motion } from "motion/react";
import { captureException } from "./lib/sentryWrapper";

// Views (Lazy-Loaded for Performance Optimization)
const Login = lazy(() => import("./views/Login"));
const AdminDashboard = lazy(() => import("./views/AdminDashboard"));
const ParentDashboard = lazy(() => import("./views/ParentDashboard"));
const SuperAdminDashboard = lazy(() => import("./views/SuperAdminDashboard"));
const TeacherDashboard = lazy(() => import("./views/TeacherDashboard"));
const PublicStudentVerify = lazy(() => import("./views/PublicStudentVerify"));

import ScanHandler from "./components/ScanHandler";
import SolarLoading from "./components/SolarLoading";
import AuthBootScreen from "./components/AuthBootScreen";
import { createSchoolSubscriptionRegistration } from "./lib/schoolSubscriptionRequest";
import {
  isSchoolRegistrationInProgress,
  userHasPendingSchoolRegistration,
} from "./lib/schoolRegistrationSession";
import { LanguageToggle } from "./components/LanguageToggle";

const InstallAppBanner = lazy(() => import("./components/InstallAppBanner"));
const AudioNotificationManager = lazy(() =>
  import("./components/AudioNotificationManager").then((m) => ({
    default: m.AudioNotificationManager,
  })),
);

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
  const [pendingRegResolved, setPendingRegResolved] = useState(true);
  const [hasPendingSchoolReg, setHasPendingSchoolReg] = useState(false);

  // Reset chunk error reload and IndexedDb reload counters on successful render/mount
  useEffect(() => {
    try {
      sessionStorage.removeItem('chunk_error_reload_count');
      sessionStorage.removeItem('db_error_reload_count');
    } catch (e) {
      console.warn("Could not access sessionStorage:", e);
    }

    // Listen to system/config in Firestore for real-time API Server URL alignment (crucial for physical mobile apps)
    const unsub = onSnapshot(doc(db, "system", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data) {
          const isDevClient = typeof window !== 'undefined' && (
            window.location.hostname.includes('-dev-') || 
            window.location.hostname.includes('localhost') || 
            window.location.hostname.includes('127.0.0.1')
          );
          const targetUrl = isDevClient ? (data.appUrlDev || data.appUrl) : (data.appUrl || data.appUrlProd);
          if (targetUrl) {
            try {
              localStorage.setItem("schoolix_app_api_url", targetUrl);
              console.info("[API CONFIG] Saved environment-matched appUrl from Firestore to localStorage:", targetUrl);
            } catch (err) {
              console.warn("localStorage is not writeable:", err);
            }
          }
        }
      }
    }, (err) => {
      console.warn("Failed to subscribe to system API URL config:", err);
    });

    return () => unsub();
  }, []);

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
    governorate: "",
    directorate: "",
    stage: "",
    shift: "",
    genderType: "",
    estimatedStudents: "",
  });

  // Reset link check when signed out
  useEffect(() => {
    if (!user) {
      setAutoLinkChecked(false);
      setPendingRegResolved(true);
      setHasPendingSchoolReg(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || profile) {
      setPendingRegResolved(true);
      setHasPendingSchoolReg(false);
      return;
    }
    setPendingRegResolved(false);
    void userHasPendingSchoolRegistration(user.uid, user.email).then((pending) => {
      setHasPendingSchoolReg(pending);
      if (pending) {
        setOnboardingState("waiting_approval");
      }
      setPendingRegResolved(true);
    });
  }, [user?.uid, user?.email, profile]);

  // Automatic School Admin & Parent Provisioning with Student Link
  useEffect(() => {
    if (loading || !user || profile || autoLinkChecked) return;

    const performAutoProvision = async () => {
      const email = user.email?.toLowerCase();
      if (!email) {
        setAutoLinkChecked(true);
        return;
      }

      if (isSchoolRegistrationInProgress()) {
        setAutoLinkChecked(true);
        return;
      }

      if (await userHasPendingSchoolRegistration(user.uid, email)) {
        setAutoLinkChecked(true);
        return;
      }

      try {
        // 1. Check if they are an administrator of a registered and approved school
        const schoolQuery = query(
          collection(db, "schools"),
          where("adminEmail", "==", email),
        );
        const schoolSnap = await getDocs(schoolQuery);

        if (!schoolSnap.empty) {
          const schoolDoc = schoolSnap.docs[0];
          const schoolId = schoolDoc.id;
          const schoolData = schoolDoc.data();

          if (schoolData.status && schoolData.status !== "active") {
            setAutoLinkChecked(true);
            return;
          }

          setIsCreatingProfile(true);

          // Auto-provision their "admin" user profile in the users collection
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: email,
            name: schoolData.adminName || user.displayName || schoolData.name || "مدير المدرسة",
            role: "admin",
            schoolId: schoolId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Sync custom claims over our admin API securely
          try {
            await fetch("/api/admin/sync-claims", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user.getIdToken()}`,
                "X-Authorization": `Bearer ${await user.getIdToken()}`
              },
              body: JSON.stringify({ uid: user.uid }),
            });
            console.info("[AUTO PROVISION] Claims sync triggered for school admin:", email);
          } catch (syncErr) {
            console.warn("[AUTO PROVISION] Failed to sync claims over API, falling back to local snapshot matching:", syncErr);
          }

          toast.success(
            isRtl
              ? "تم التحقق من بيانات مدرستك وتفعيل حسابك كمدير بنجاح!"
              : "Your registered school was verified! Admin account activated successfully!",
          );
          setAutoLinkChecked(true);
          return;
        }

        // 2. Prevent parent auto-provisioning querying if this is a school user (has administrative/school claims)
        const tokenResult = await user.getIdTokenResult();
        const claims = tokenResult.claims || {};
        if (claims?.role && claims.role !== "parent") {
          console.info("[AUTO PROVISION] Skipping parent auto-provision for school role:", claims.role);
          setAutoLinkChecked(true);
          return;
        }

        // 3. Search for students matching this parent email
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
    let unsubs: (() => void)[] = [];
    
    if (user && (!profile || (profile.role === "admin" && !profile.schoolId)) && autoLinkChecked) {
      // Create three queries to locate registrations
      const qUid = query(
        collection(db, "registrations"),
        where("uid", "==", user.uid),
      );
      const qEmail = query(
        collection(db, "registrations"),
        where("email", "==", user.email.toLowerCase()),
      );
      const qCustEmail = query(
        collection(db, "registrations"),
        where("customerInfo.email", "==", user.email.toLowerCase()),
      );

      let results: Record<string, any> = {};

      const processSnap = (snap: any, key: string) => {
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          results[key] = { id: docSnap.id, ...docSnap.data() };
        } else {
          delete results[key];
        }

        const mergedDocs = Object.values(results);
        if (mergedDocs.length > 0) {
          // Sort or pick the active one
          const req: any = mergedDocs[0];
          setMyRequest(req);
          if (req.status === "rejected" || req.status === "cancelled") {
            setOnboardingState("rejected");
          } else if (req.status === "approved" || req.status === "active") {
            setOnboardingState("approved");
          } else {
            setOnboardingState("waiting_approval");
          }
        } else {
          void (async () => {
            const pending = await userHasPendingSchoolRegistration(
              user?.uid || "",
              user?.email,
            );
            setOnboardingState((prev) => {
              if (prev === "approved") return "approved";
              if (pending) return "waiting_approval";
              if (profile?.role === "admin") return "packages";
              return "options";
            });
          })();
        }
      };

      try {
        unsubs.push(onSnapshot(qUid, (snap) => processSnap(snap, 'uid'), (err) => console.log('Uid listener err:', err)));
        unsubs.push(onSnapshot(qEmail, (snap) => processSnap(snap, 'email'), (err) => console.log('Email listener err:', err)));
        unsubs.push(onSnapshot(qCustEmail, (snap) => processSnap(snap, 'custEmail'), (err) => console.log('CustEmail listener err:', err)));
      } catch (e) {
        console.error("Listening setup failed:", e);
        if (profile?.role === "admin") {
          setOnboardingState("packages");
        } else {
          setOnboardingState("options");
        }
      }

    } else if (!user) {
      setOnboardingState("loading");
    }
    return () => {
      clearTimeout(timer);
      unsubs.forEach((unsub) => unsub());
    };
  }, [loading, user, profile, autoLinkChecked]);

  // Automatically trigger a profile sync & page reload if approved, to apply the new admin credentials smoothly
  useEffect(() => {
    if (onboardingState === "approved") {
      const reloadTimer = setTimeout(async () => {
        try {
          if (auth.currentUser) {
            // Force refresh ID Token to get updated claims from server
            await auth.currentUser.getIdToken(true);
          }
        } catch (e) {
          console.warn("Failed to force refresh token during approved transition:", e);
        }
        // Force fully fresh page reload
        window.location.reload();
      }, 2500);
      return () => clearTimeout(reloadTimer);
    }
  }, [onboardingState]);

  // Fetch packages when in 'packages' state
  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (onboardingState === "packages") {
      const q = query(collection(db, "packages"));
      unsub = onSnapshot(
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
    }
    return () => {
      if (unsub) unsub();
    };
  }, [onboardingState]);

  if (isSchoolRegistrationInProgress()) {
    return (
      <>
        <Login />
        <div className="fixed top-4 right-4 md:top-6 md:right-6 z-[9999]">
          <LanguageToggle />
        </div>
      </>
    );
  }

  if (loading) {
    return <AuthBootScreen />;
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

  // No profile yet: wait for auto-provision, then show onboarding (not dashboard)
  if (!profile) {
    const booting =
      isCreatingProfile ||
      !autoLinkChecked ||
      !pendingRegResolved ||
      isSchoolRegistrationInProgress();
    if (booting && !hasPendingSchoolReg) {
      return <AuthBootScreen />;
    }
  } else if (isCreatingProfile) {
    return <AuthBootScreen />;
  }

  const needsSchoolOnboarding =
    profile?.role === UserRole.ADMIN && !profile?.schoolId;

  const showOnboarding = !profile || needsSchoolOnboarding;

  const renderDashboard = () => {
    if (!profile) return null;
    // Dedicated recovery/error screen if profile has school role but schoolId or schoolData is missing or inaccessible in Firestore
    const isSchoolRole = profile?.role && [
      UserRole.ADMIN,
      UserRole.STAFF,
      UserRole.ASSISTANT
    ].includes(profile.role);

    if (isSchoolRole && !profile?.schoolId) {
      return (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 text-center shadow-2xl border border-amber-100 dark:border-amber-950/30">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="text-amber-600 dark:text-amber-400 animate-pulse" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
              {isRtl ? "بيانات المدرسة غير متوفرة" : "School Profile Unreachable"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-bold italic text-sm">
              {isRtl
                ? "تم تحميل حسابك بنجاح ولكن بيانات المدرسة المرتبطة به غير موجودة أو غير مصرح لك بالوصول إليها حالياً."
                : "Your account loaded successfully, but the associated school data is missing or inaccessible."}
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-right mb-8 flex flex-col gap-2 border border-slate-100 dark:border-slate-800 text-xs font-mono">
              <div className="flex justify-between items-center text-right text-[11px]" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{isRtl ? "البريد الإلكتروني:" : "Email:"}</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">{profile.email}</span>
              </div>
              <div className="flex justify-between items-center text-right text-[11px]" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{isRtl ? "معرف المدرسة:" : "School ID:"}</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold font-mono">{profile.schoolId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-right text-[11px]" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{isRtl ? "دور الحساب:" : "Role:"}</span>
                <span className="text-slate-700 dark:text-slate-300 font-bold">{profile.role}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 font-sans">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={20} className="animate-spin" style={{ animationDuration: '3s' }} />
                {isRtl ? "إعادة تحميل الصفحة" : "Retry / Reload"}
              </button>
              <button
                onClick={() => auth.signOut()}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={20} />
                {isRtl ? "تسجيل الخروج" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      );
    }

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
        {!showOnboarding ? (
          <>
            <ScanHandler />
            {renderDashboard()}
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 text-center bg-slate-50 dark:bg-slate-950 font-sans transition-all duration-300"
            dir={isRtl ? "rtl" : "ltr"}
          >
            {onboardingState === "loading" && (
              <div className="flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-20 h-20 bg-[#e8eef5] text-[#0B2345] rounded-3xl flex items-center justify-center mb-6"
                >
                  <ShieldCheck size={40} />
                </motion.div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2 font-display">
                  {t("loading")}
                </h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  {isRtl
                    ? "نحن بصدد تجهيز بيانات حسابك والتحقق من الصلاحيات."
                    : "We are preparing your account data and verifying permissions."}
                </p>
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <button
                  onClick={() => auth.signOut()}
                  className="px-6 py-3 bg-transparent text-slate-400 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 mt-8 text-xs cursor-pointer"
                >
                  <LogOut size={16} />
                  {t("logout")}
                </button>
              </div>
            )}

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
                      className="w-full px-6 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-bold shadow-sm active:scale-95 transition-all outline-none focus:ring-4 focus:ring-blue-100 hover:border-blue-500 hover:text-[#0B2345] disabled:opacity-50 text-sm flex items-center justify-center gap-2"
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
                          <span className="bg-[#0B2345] text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest self-start mb-4">
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
                          className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${pkg.isPopular ? "bg-[#0B2345] text-white hover:bg-[#1a3a6b]" : "bg-slate-900 text-white hover:bg-slate-800"}`}
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
                      await createSchoolSubscriptionRegistration({
                        uid: user.uid,
                        email: user.email || "",
                        schoolName: subscriptionForm.name,
                        phone: subscriptionForm.phone,
                        schoolRegistration: {
                          address: subscriptionForm.address,
                          governorate: subscriptionForm.governorate,
                          directorate: subscriptionForm.directorate,
                          educationLevel: subscriptionForm.stage,
                          workingHours: subscriptionForm.shift,
                          studyType: subscriptionForm.genderType,
                          estimatedStudents: subscriptionForm.estimatedStudents,
                        },
                        package: {
                          id: selectedPackage.id,
                          name: selectedPackage.name,
                        },
                        billingCycle,
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
                      placeholder="المحلة - الزقاق - رقم الدار (اختياري)"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        المحافظة
                      </label>
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={subscriptionForm.governorate}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              governorate: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" disabled>
                            اختر المحافظة...
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
                          <option value="القادسية">القادسية (الديوانية)</option>
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
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        المديرية
                      </label>
                      <div className="relative">
                        <Building
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={subscriptionForm.directorate}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              directorate: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" disabled>
                            اختر المديرية...
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
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        المرحلة الدراسية
                      </label>
                      <div className="relative">
                        <Building
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={subscriptionForm.stage}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              stage: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" disabled>
                            اختر المرحلة...
                          </option>
                          <option value="روضة">روضة</option>
                          <option value="ابتدائي">ابتدائي</option>
                          <option value="متوسطة">متوسطة</option>
                          <option value="اعدادية">اعدادية</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        وقت الدوام
                      </label>
                      <div className="relative">
                        <Clock
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={subscriptionForm.shift}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              shift: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" disabled>
                            اختر وقت الدوام...
                          </option>
                          <option value="صباحي">صباحي</option>
                          <option value="مسائي">مسائي</option>
                          <option value="مدمج">مدمج</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        نوع الدراسة
                      </label>
                      <div className="relative">
                        <UserPlus
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={subscriptionForm.genderType}
                          onChange={(e) =>
                            setSubscriptionForm({
                              ...subscriptionForm,
                              genderType: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" disabled>
                            اختر نوع الدراسة...
                          </option>
                          <option value="مختلطة">مختلطة</option>
                          <option value="بنات فقط">بنات فقط</option>
                          <option value="اولاد فقط">اولاد فقط</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        عدد الطلاب المقدر
                      </label>
                      <input
                        required
                        type="number"
                        min={1}
                        value={subscriptionForm.estimatedStudents}
                        onChange={(e) =>
                          setSubscriptionForm({
                            ...subscriptionForm,
                            estimatedStudents: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        placeholder="مثال: 500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreatingProfile}
                    className="w-full py-4 mt-4 bg-[#0B2345] text-white rounded-xl font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm flex justify-center items-center gap-2"
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
                className="w-full max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-xl border border-blue-100 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-[#0B2345] animate-pulse"></div>
                <div className="w-20 h-20 bg-blue-50 text-[#0B2345] rounded-full flex justify-center items-center mx-auto mb-6">
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
                  type="button"
                  onClick={() => auth.signOut()}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  تسجيل الخروج مؤقتاً
                </button>
              </motion.div>
            )}

            {onboardingState === "rejected" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm mx-auto bg-white p-8 rounded-[2rem] shadow-xl border border-red-100 text-center"
              >
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex justify-center items-center mx-auto mb-6">
                  <XCircle size={40} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  تم الغاء طلبك
                </h3>
                <p className="text-slate-500 text-sm font-bold leading-relaxed mb-6">
                  تم رفض طلب اشتراك مدرستك وحذف الحساب. يمكنك التسجيل من جديد
                  ببريد آخر أو نفس البريد بعد إعادة التسجيل.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await auth.signOut();
                      } catch {
                        setOnboardingState("options");
                      }
                    }}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    العودة لتسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => auth.signOut()}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    تسجيل الخروج
                  </button>
                </div>
              </motion.div>
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

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((error: Error | null) => ReactNode);
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    captureException(error, { extra: errorInfo as any });
  }

  public render() {
    const props = (this as any).props;
    if (this.state.hasError) {
      if (typeof props.fallback === 'function') {
        return props.fallback(this.state.error);
      }
      return props.fallback;
    }
    return props.children;
  }
}

function FallbackComponent({ error }: { error?: Error | null }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          عذراً، حدث خطأ غير متوقع
        </h1>
        <p className="text-slate-500 mb-6">
          تم تسجيل الخطأ وجاري العمل على حله. يرجى إعادة تحميل الصفحة.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 animate-spin-hover" />
          إعادة تحميل الصفحة
        </button>

        {error && (
          <div className="mt-6 border-t border-slate-100 pt-4 text-right">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer focus:outline-none"
            >
              <span>{showDetails ? "إخفاء التفاصيل الفنية للخطأ" : "عرض التفاصيل الفنية للخطأ"}</span>
              <span className="text-[10px]">
                {showDetails ? "▲" : "▼"}
              </span>
            </button>

            {showDetails && (
              <div className="mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 overflow-x-auto text-left max-h-60">
                <p className="text-[11px] font-bold text-red-600 font-mono mb-2 break-all">
                  [Error] {error.name || "Error"}: {error.message}
                </p>
                {error.stack && (
                  <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap word-break-all leading-relaxed max-h-40 overflow-y-auto">
                    {error.stack}
                  </pre>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Error: ${error.message}\nStack: ${error.stack || "N/A"}`
                    );
                    toast.success("تم نسخ التفاصيل الفنية لحافظة المطور بنجاح!");
                  }}
                  className="mt-3 text-[10px] bg-slate-200 text-slate-700 hover:bg-slate-300 px-2 py-1 rounded border border-slate-300 font-sans cursor-pointer focus:outline-none"
                >
                  نسخ تفاصيل الخطأ
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SafeErrorBoundary fallback={(err) => <FallbackComponent error={err} />}>
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
              <Suspense fallback={null}>
                <InstallAppBanner />
                <AudioNotificationManager />
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </SafeErrorBoundary>
  );
}

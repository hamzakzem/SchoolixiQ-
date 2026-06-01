import React, { useState, useEffect } from "react";
import {
  Users,
  UserRound,
  Calendar,
  ClipboardCheck,
  BarChart3,
  MessageSquare,
  ShoppingBag,
  Settings,
  LogOut,
  LayoutDashboard,
  Wallet,
  Package,
  Menu,
  X,
  Building,
  XCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  FileArchive,
  Bell,
} from "lucide-react";
import { auth, db } from "../lib/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useAuth } from "../lib/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { NotificationCenter } from "../components/NotificationCenter";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { School } from "../types";
import { SubscriptionTimer } from "../components/SubscriptionTimer";
import { GlobalFooter } from "../components/GlobalFooter";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { notificationService } from "../lib/notificationService";

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

// Sub-views
import Overview from "./admin/Overview";
import StudentsList from "./admin/StudentsList";
import StaffList from "./admin/StaffList";
import Attendance from "./admin/Attendance";
import EvaluationReports from "./admin/EvaluationReports";
import AdvancedReports from "./admin/AdvancedReports";
import Homework from "./admin/Homework";
import Grades from "./admin/Grades";
import StudentArchive from "./admin/StudentArchive";
import Marketplace from "./admin/Marketplace";
import Payroll from "./admin/Payroll";
import Inventory from "./admin/Inventory";
import SettingsView from "./admin/SettingsView";
import Announcements from "./admin/Announcements";
import IdCards from "./admin/IdCards";
import Tuition from "./admin/Tuition";
import Behavior from "./admin/Behavior";
import ParentsList from "./admin/ParentsList";
import Classes from "./admin/Classes";
import Schedules from "./admin/Schedules";
import AssistantsManagement from "./admin/AssistantsManagement";
import AdminChatTab from "./admin/AdminChatTab";

import { useLanguage } from "../lib/LanguageContext";
import { useSystemConfig } from "../lib/SystemConfigContext";

export default function AdminDashboard() {
  const { t, isRtl, language, setLanguage } = useLanguage();
  const { config } = useSystemConfig();
  const [activeTab, setActiveTab] = useState("overview");
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1024,
  );

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
        setIsSidebarCollapsed(false);
      } else if (window.innerWidth < 1024) {
        setIsSidebarOpen(true);
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarOpen(true);
        // Retain user's collapse preference on desktop if possible, but for default:
        setIsSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Enhanced tab switcher that tracks history
  const navigateToTab = (tabId: string) => {
    if (tabId === activeTab) return;
    setNavigationHistory((prev) => [...prev, activeTab]);
    setActiveTab(tabId);
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      const prevTab = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else {
      setActiveTab("overview");
    }
  };
  // Filter menu items based on assistant or plan permissions
  const { profile, schoolData: authSchoolData } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;
    const qNotifications = query(
      collection(db, "notifications"),
      where("userId", "==", profile.uid)
    );
    return onSnapshot(qNotifications, (snap) => {
      setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [profile?.uid]);

  // Package permissions are controlled by the Super Admin via the package properties
  const perms = authSchoolData?.packagePermissions || profile?.permissions; // fallback to profile if not loaded yet

  const menuItems = [
    { id: "overview", label: t("overview"), icon: LayoutDashboard },
    { id: "chat", label: t("chat") || (isRtl ? "الدردشة" : "Chat"), icon: MessageSquare },
    { id: "students", label: t("viewStudents"), icon: Users },
    { id: "students_edit", label: t("manageStudents"), icon: Users },
    { id: "staff", label: t("manageStaff"), icon: UserRound },
    { id: "attendance", label: t("attendance"), icon: ClipboardCheck },
    { id: "grades", label: t("grades"), icon: BarChart3 },
    { id: "student_archive", label: isRtl ? "أرشيف الطالب" : "Student Archive", icon: FileArchive },
    { id: "tuition", label: t("tuition"), icon: Wallet },
    { id: "payroll", label: t("payroll"), icon: Wallet },
    { id: "inventory", label: t("inventory"), icon: Package },
    { id: "behavior", label: t("behavior"), icon: MessageSquare },
    { id: "evaluation_reports", label: t("evaluations"), icon: ClipboardCheck },
    { id: "homework", label: t("homework"), icon: Calendar },
    { id: "classes", label: t("classes") || (isRtl ? "الصفوف" : "Classes"), icon: Building },
    { id: "schedules", label: t("schedules"), icon: Calendar },
    { id: "announcements", label: t("announcements"), icon: MessageSquare },
    { id: "parents", label: t("parentApp"), icon: Users },
    { id: "advanced_reports", label: t("advancedReports"), icon: BarChart3 },
    { id: "market", label: t("marketplace"), icon: ShoppingBag },
    { id: "id_cards", label: t("idCards"), icon: ShieldCheck },
    {
      id: "assistants",
      label: t("assistants"),
      icon: ShieldCheck,
      adminOnly: true,
    },
    { id: "settings", label: t("settings"), icon: Settings },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (profile?.role === "superadmin") return true;
    if (profile?.role === "admin" || profile?.role === "staff") {
      if (item.id === "overview") return true;
      if (item.adminOnly && profile.role !== "admin") return false;

      // If profile has custom permissions (from package), enforce them
      if (perms && typeof perms === "object" && !Array.isArray(perms)) {
        if (item.id === "overview") return perms.overview !== false;
        if (item.id === "chat") return perms.chat !== false;
        if (item.id === "students") return perms.students_view !== false;
        if (item.id === "students_edit") return perms.students_edit !== false;
        if (item.id === "parents") return perms.parent_app_access !== false;
        if (item.id === "staff") return perms.staff_manage !== false;
        if (item.id === "tuition") return perms.tuition_fees !== false;
        if (item.id === "payroll") return perms.staff_payroll !== false;
        if (item.id === "attendance") return perms.attendance_track !== false;
        if (item.id === "grades") return perms.exams_and_results !== false;
        if (item.id === "student_archive")
          return perms.student_archive !== false;
        if (item.id === "inventory")
          return perms.inventory_and_assets !== false;
        if (item.id === "behavior") return perms.behavior_management !== false;
        if (item.id === "evaluation_reports")
          return perms.student_evaluation_reports !== false;
        if (item.id === "homework") return perms.homework_and_tasks !== false;
        if (item.id === "classes") return perms.classes !== false;
        if (item.id === "schedules") return perms.automated_schedules !== false;
        if (item.id === "announcements") return perms.announcements !== false;
        if (item.id === "advanced_reports")
          return perms.advanced_reports !== false;
        if (item.id === "market") return perms.marketplace_ordering !== false;
        if (item.id === "id_cards") return perms.id_card_generation !== false;
        if (item.id === "assistants")
          return perms.assistants_manage !== false && profile.role === "admin";
        if (item.id === "settings") return perms.settings !== false;

        return true; // Fallback for any other unmatched modules
      } else if (profile.role === "admin" && !perms) {
        // If it's an admin and no permissions are set yet, allow everything as a transitional state
        // but it's better to default to a "Basic" set if we want strictness.
        // For now, return true so they don't lose access before sync.
        return true;
      }
    }
    if (profile?.role === "assistant") {
      if (item.id === "overview") return true;
      if (item.id === "chat") return true;
      if (item.adminOnly) return false;
      // Assistant permissions are usually a legacy string array
      if (Array.isArray(profile.permissions)) {
        // Map students permission to both view and edit tabs for assistants
        if (item.id === "students" || item.id === "students_edit") {
          return profile.permissions.includes("students");
        }
        if (item.id === "attendance") return false;
        return profile.permissions.includes(item.id);
      }
      return false;
    }
    return false;
  });

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const primaryItems = filteredMenuItems.filter((item) =>
    ["overview", "students", "tuition", "chat"].includes(item.id),
  );
  const moreItems = filteredMenuItems.filter(
    (item) => !["overview", "students", "tuition", "chat"].includes(item.id),
  );

  const [schoolSetup, setSchoolSetup] = useState({
    name: "",
    address: "",
    governorate: "",
    directorate: "",
    stage: "",
    shift: "",
    genderType: "",
    approximateStudents: "",
  });
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [schoolData, setSchoolData] = useState<School | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const daysRemaining = schoolData?.subscriptionExpiresAt
    ? Math.ceil(
        (new Date(schoolData.subscriptionExpiresAt).getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const [isRenewing, setIsRenewing] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [hideVerificationBanner, setHideVerificationBanner] = useState(false);

  const handleHideVerification = () => {
    setHideVerificationBanner(true);
    setTimeout(() => {
      setHideVerificationBanner(false);
    }, 60000); // reappear after 1 minute
  };

  const [packages, setPackages] = useState<any[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [viewingPackage, setViewingPackage] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!auth.currentUser) return;

    const fetchPackages = async () => {
      setIsLoadingPackages(true);
      try {
        const q = query(
          collection(db, "packages"),
          where("showInRegistration", "==", true),
          limit(20),
        );
        const snap = await getDocs(q);
        if (!isMounted) return;

        let pkgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        if (pkgs.length === 0) {
          pkgs = DEFAULT_PACKAGES;
        } else {
          pkgs.sort((a, b) => (a.price || 0) - (b.price || 0));
        }
        setPackages(pkgs);
      } catch (error) {
        console.error("Error fetching packages:", error);
        if (isMounted) {
          setPackages(DEFAULT_PACKAGES);
        }
      } finally {
        if (isMounted) setIsLoadingPackages(false);
      }
    };

    fetchPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verificationCooldown > 0) {
      timer = setInterval(() => {
        setVerificationCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [verificationCooldown]);

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    if (verificationCooldown > 0) {
      toast.error(
        `يرجى الانتظار ${verificationCooldown} ثانية قبل المحاولة مجدداً`,
      );
      return;
    }

    setIsSendingVerification(true);
    try {
      auth.languageCode = "ar";
      await sendEmailVerification(auth.currentUser);
      toast.success(
        "تم إرسال رابط التأكيد إلى بريدك الإلكتروني. يرجى مراجعة البريد (بما في ذلك الرسائل غير المرغوب فيها).",
      );
      setVerificationCooldown(60); // 60 seconds cooldown
    } catch (error: any) {
      console.error("Email verification error:", error);
      if (error.code === "auth/too-many-requests") {
        toast.error(
          "لقد أرسلت الكثير من الطلبات مؤخراً. يرجى الانتظار بضع دقائق والمحاولة مجدداً.",
        );
        setVerificationCooldown(120); // Longer cooldown on error
      } else {
        toast.error(
          "فشل إرسال الرابط. يرجى التأكد من صحة البريد الإلكتروني أو المحاولة لاحقاً.",
        );
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleRenewRequest = async () => {
    if (!profile?.schoolId || !schoolData) return;

    setIsRenewing(true);
    try {
      // 1. Send system notification
      await notificationService.notifySuperAdmins({
        title: "طلب تجديد اشتراك",
        message: `المدرسة "${schoolData.name}" تطلب تجديد اشتراكها.`,
        type: "system",
        metadata: {
          schoolId: profile.schoolId,
          schoolName: schoolData.name,
          requestType: "renewal",
        },
      });

      // 2. Create entry in orders collection for Super Admin to see in "Requests" tab
      await notificationService.createRenewalRequest({
        schoolId: profile.schoolId,
        schoolName: schoolData.name,
        adminEmail: schoolData.adminEmail,
        adminPhone: schoolData.adminPhone,
        packageName: "تجديد اشتراك",
      });

      toast.success("تم إرسال طلب التجديد بنجاح. سنتواصل معكم قريباً.");
    } catch (error) {
      console.error("Error sending renew request:", error);
      toast.error("فشل إرسال الطلب. يرجى المحاولة لاحقاً.");
    } finally {
      setIsRenewing(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function listenToSchool() {
      if (profile?.schoolId && auth.currentUser) {
        const path = `schools/${profile.schoolId}`;
        try {
          unsubscribe = onSnapshot(
            doc(db, "schools", profile.schoolId),
            (snap) => {
              if (snap.exists()) {
                const data = snap.data() as School;
                setSchoolData({ id: snap.id, ...data });

                if (data.subscriptionExpiresAt) {
                  const expiry = new Date(data.subscriptionExpiresAt);
                  if (expiry < new Date()) {
                    setIsExpired(true);
                  } else {
                    setIsExpired(false);
                  }
                }
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, path);
            },
          );
        } catch (error) {
          console.error("Error setting up school listener:", error);
        }
      }
    }

    listenToSchool();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [profile?.schoolId]);

  const handleSetupSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setIsSettingUp(true);
    const path = "schools";
    try {
      const schoolRef = await addDoc(collection(db, path), {
        ...schoolSetup,
        status: "pending_subscription",
        planId: "basic", // Default plan for self-registration
        studentCount: 0,
        ownerUid: profile.uid,
        adminEmail: profile.email,
        adminName: profile.name,
        adminPhone: (profile as any).phone || "",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "users", profile.uid), {
        schoolId: schoolRef.id,
      });

      toast.success("تم إعداد المدرسة بنجاح");
      // Real-time listener in useAuth will pick up the schoolId change
      // and listenToSchool will pick up the school record creation.
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      toast.error("حدث خطأ أثناء الإعداد");
    } finally {
      setIsSettingUp(false);
    }
  };

  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    if (!profile?.schoolId || !schoolData) return;

    setIsSubscribing(true);
    const subReqPath = "subscriptionRequests";
    const schoolPath = `schools/${profile.schoolId}`;

    try {
      // 1. Create a subscription request for Super Admin and update school status in parallel
      await Promise.all([
        addDoc(collection(db, subReqPath), {
          schoolId: profile.schoolId,
          schoolName: schoolData.name,
          adminEmail: profile.email,
          adminName: profile.name,
          adminPhone: (profile as any).phone || schoolData.adminPhone || "",
          planId: planId,
          status: "pending",
          createdAt: serverTimestamp(),
        }),
        updateDoc(doc(db, "schools", profile.schoolId), {
          status: "pending_approval",
          selectedPackageId: planId,
          updatedAt: serverTimestamp(),
        }),
      ]);

      toast.success(
        "تم إرسال طلب تفعيل الحساب بنجاح. سيتم التواصل معك قريباً.",
      );
      // No reload needed as schoolData is now a real-time listener
    } catch (error: any) {
      console.error("Error selecting plan:", error);
      // Try to determine which operation failed
      if (error.message?.includes("subscriptionRequests")) {
        handleFirestoreError(error, OperationType.CREATE, subReqPath);
      } else {
        handleFirestoreError(error, OperationType.UPDATE, schoolPath);
      }
      toast.error("فشل إرسال الطلب. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubscribing(false);
    }
  };

  if (
    profile?.role === "admin" &&
    profile.schoolId &&
    schoolData &&
    (schoolData.status === "pending_subscription" ||
      schoolData.status === "pending_approval" ||
      schoolData.status === "rejected")
  ) {
    return (
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative"
        dir="rtl"
      >
        {/* Floating Logout and Theme buttons */}
        <div className="absolute top-8 left-8 flex items-center gap-4 z-50">
          <ThemeToggle />
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 rounded-2xl font-black text-sm shadow-xl border border-slate-100 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
          >
            <LogOut size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        <div className="max-w-4xl w-full">
          {schoolData.status === "pending_subscription" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-8">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase">
                يجب عليك الاشتراك لاستخدام المنصة
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg font-medium leading-relaxed italic">
                {isRtl
                  ? `أهلاً بك في منصة ${config.appName}. للبدء في استخدام`
                  : `Welcome to ${config.appName}. To start using`}{" "}
                كافة الصلاحيات وإدارة مدرستك، يرجى اختيار الباقة المناسبة
                لمدرستكم وإرسال طلب تفعيل.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 text-right">
                {isLoadingPackages ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold">
                      جاري تحميل الباقات المتاحة...
                    </p>
                  </div>
                ) : packages.length > 0 ? (
                  packages.map((plan) => (
                    <div
                      key={plan.id}
                      className={`bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border transition-all flex flex-col h-full hover:shadow-2xl hover:-translate-y-1 relative group ${plan.isPopular ? "border-indigo-400 ring-4 ring-indigo-500/5" : "border-slate-100 dark:border-slate-700"}`}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-4 right-8 bg-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                          باقة مميزة
                        </div>
                      )}

                      <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                          {plan.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          باقة {plan.name}
                        </p>
                      </div>

                      <div className="mb-8">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {plan.price === 0
                              ? "مجاني"
                              : plan.price.toLocaleString("ar-IQ")}
                          </span>
                          {plan.price > 0 && (
                            <span className="text-xs font-bold text-slate-400">
                              د.ع
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic opacity-60">
                          لكل سنة مدرسيّة
                        </p>
                      </div>

                      <div className="space-y-4 mb-8 flex-1">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Users size={16} />
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none mb-1">
                                الحد الأقصى للطلاب
                              </p>
                              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                                {plan.maxStudents.toLocaleString("ar-IQ")} طالب
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 px-2">
                          {Array.isArray(plan.features) ? (
                            plan.features.map((f: string) => (
                              <div
                                key={f}
                                className="flex items-start gap-2 group"
                              >
                                <CheckCircle
                                  size={14}
                                  className="text-indigo-500 mt-0.5 shrink-0"
                                />
                                <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 leading-tight">
                                  {f}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">
                              لا توجد ميزات إضافية مسجلة
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={isSubscribing}
                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-xl ${
                          plan.isPopular
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 shadow-slate-600/10"
                        }`}
                      >
                        {isSubscribing
                          ? "جاري الإرسال..."
                          : "اختيار هذه الباقة"}
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400 font-bold italic">
                      لا توجد باقات متاحة للتسجيل حالياً. يرجى التواصل مع
                      الإدارة.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : schoolData.status === "rejected" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-16 shadow-2xl border border-red-100 dark:border-red-900/30 text-center"
            >
              <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-10 relative">
                <XCircle size={48} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6">
                نعتذر، تم إلغاء طلبك
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 leading-relaxed font-bold italic">
                لقد تمت مراجعة طلب تفعيل مدرستكم من قبل الإدارة وتم إلغاؤه في
                الوقت الحالي.
                <br />
                <span className="text-red-600 dark:text-red-400 font-black">
                  {" "}
                  نعتذر تم إلغاء طلبك، يرجى إرسال طلب جديد.
                </span>
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <button
                  onClick={async () => {
                    if (profile?.schoolId) {
                      await updateDoc(doc(db, "schools", profile.schoolId), {
                        status: "pending_subscription",
                        updatedAt: serverTimestamp(),
                      });
                      toast.success("يمكنك الآن اختيار باقة جديدة");
                    }
                  }}
                  className="px-10 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-base shadow-xl active:scale-95 transition-all"
                >
                  إرسال طلب جديد
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-16 shadow-2xl border border-slate-100 dark:border-slate-800 text-center"
            >
              <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-10 relative">
                <Clock size={48} />
                <div className="absolute inset-0 border-4 border-amber-600/20 rounded-full animate-ping"></div>
              </div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6">
                طلبك قيد المراجعة الآن
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 leading-relaxed font-bold italic">
                {isRtl
                  ? `شكراً لاختيارك منصة ${config.appName}. لقد تم إرسال طلب تفعيل`
                  : `Thank you for choosing ${config.appName}. Your activation request has been sent`}{" "}
                مدرستك إلى الإدارة العليا (Super Admin).
                <br />
                <span className="text-indigo-600 dark:text-indigo-400">
                  سنقوم بتفعيل حسابك والتواصل معك خلال ساعات قليلة.
                </span>
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <div className="flex flex-col gap-2">
                  <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 h-full flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 mb-1 font-sans">
                      الباقة المختارة
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-white">
                      {packages.find(
                        (p) =>
                          p.id ===
                          ((schoolData as any).selectedPackageId ||
                            (schoolData as any).selectedPlanId),
                      )?.name || "باقة مخصصة"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const pkg = packages.find(
                        (p) =>
                          p.id ===
                          ((schoolData as any).selectedPackageId ||
                            (schoolData as any).selectedPlanId),
                      );
                      if (pkg) setViewingPackage(pkg);
                      else toast.error("تفاصيل الباقة غير متوفرة حالياً");
                    }}
                    className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 hover:text-indigo-700 transition-colors"
                  >
                    عرض تفاصيل الباقة
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (profile?.schoolId) {
                      const loadingToast = toast.loading(
                        "جاري التحقق من حالة الطلب...",
                      );
                      try {
                        const snap = await getDoc(
                          doc(db, "schools", profile.schoolId),
                        );
                        if (snap.exists()) {
                          const data = snap.data() as School;
                          setSchoolData({ id: snap.id, ...data });

                          if (data.status === "active") {
                            toast.success("تمت الموافقة على طلبكم بنجاح!");
                          } else if (data.status === "rejected") {
                            toast.error("نعتذر، لم يتم قبول الطلب الحالي.");
                          } else {
                            toast.success("الطلب لا يزال تحت المراجعة.");
                          }
                        }
                      } catch (error) {
                        console.error("Error refreshing status:", error);
                        toast.error("حدث خطأ أثناء التحديث");
                      } finally {
                        toast.dismiss(loadingToast);
                      }
                    }
                  }}
                  className="px-10 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-base shadow-xl active:scale-95 transition-all"
                >
                  تحديث حالة الطلب
                </button>
              </div>
            </motion.div>
          )}
        </div>
        <AnimatePresence>
          {viewingPackage && (
            <PackageDetailsModal
              pkg={viewingPackage}
              onClose={() => setViewingPackage(null)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (profile?.role === "admin" && !profile.schoolId) {
    return (
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center py-12 px-4 md:px-6 font-sans overflow-y-auto transition-colors duration-300"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl w-full max-w-xl border border-slate-100 dark:border-slate-800/80 my-auto"
        >
          <div className="flex justify-between items-start mb-8 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/40 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-sm shrink-0">
              <Building size={32} />
            </div>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <LogOut size={14} />
              {isRtl ? "تسجيل الخروج" : "Logout"}
            </button>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 leading-none">
            {isRtl ? "إعداد سجل المدرسة" : "Configure School Record"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-10 italic text-sm font-semibold">
            {isRtl ? "أهلاً بك كمدير جديد. يرجى إدخال بيانات مدرستك للبدء." : "Welcome as a school administrator. Please input your school statistics to get started."}
          </p>

          <form onSubmit={handleSetupSchool} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "اسم المؤسسة التعليمة" : "School or Institution Name"}
              </label>
              <input
                required
                type="text"
                value={schoolSetup.name}
                onChange={(e) =>
                  setSchoolSetup({ ...schoolSetup, name: e.target.value })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
                placeholder={isRtl ? "اسم المدرسة..." : "Enter school name..."}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "المحافظة" : "Governorate"}
              </label>
              <select
                required
                value={schoolSetup.governorate}
                onChange={(e) =>
                  setSchoolSetup({
                    ...schoolSetup,
                    governorate: e.target.value,
                  })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
              >
                <option value="" disabled>
                  {isRtl ? "اختر المحافظة..." : "Select Governorate..."}
                </option>
                <option value="بغداد">{isRtl ? "بغداد" : "Baghdad"}</option>
                <option value="البصرة">{isRtl ? "البصرة" : "Basra"}</option>
                <option value="نينوى">{isRtl ? "نينوى" : "Nineveh"}</option>
                <option value="أربيل">{isRtl ? "أربيل" : "Erbil"}</option>
                <option value="النجف">{isRtl ? "النجف" : "Najaf"}</option>
                <option value="ذي قار">{isRtl ? "ذي قار" : "Dhi Qar"}</option>
                <option value="كركوك">{isRtl ? "كركوك" : "Kirkuk"}</option>
                <option value="الأنبار">{isRtl ? "الأنبار" : "Anbar"}</option>
                <option value="ديالى">{isRtl ? "ديالى" : "Diyala"}</option>
                <option value="المثنى">{isRtl ? "المثنى" : "Muthanna"}</option>
                <option value="القادسية">{isRtl ? "القادسية (الديوانية)" : "Qadisiyah (Diwaniyah)"}</option>
                <option value="ميسان">{isRtl ? "ميسان" : "Maysan"}</option>
                <option value="واسط">{isRtl ? "واسط" : "Wasit"}</option>
                <option value="صلاح الدين">{isRtl ? "صلاح الدين" : "Salah al-Din"}</option>
                <option value="دهوك">{isRtl ? "دهوك" : "Duhok"}</option>
                <option value="السليمانية">{isRtl ? "السليمانية" : "Sulaymaniyah"}</option>
                <option value="بابل">{isRtl ? "بابل" : "Babylon"}</option>
                <option value="كربلاء">{isRtl ? "كربلاء" : "Karbala"}</option>
                <option value="حلبجة">{isRtl ? "حلبجة" : "Halabja"}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "المديرية" : "Directorate"}
              </label>
              <select
                required
                value={schoolSetup.directorate}
                onChange={(e) =>
                  setSchoolSetup({
                    ...schoolSetup,
                    directorate: e.target.value,
                  })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
              >
                <option value="" disabled>
                  {isRtl ? "اختر المديرية..." : "Select Directorate..."}
                </option>
                <option value="مديرية الكرخ الاولى">{isRtl ? "مديرية الكرخ الاولى" : "Karkh 1st Directorate"}</option>
                <option value="مديرية الكرخ الثانية">{isRtl ? "مديرية الكرخ الثانية" : "Karkh 2nd Directorate"}</option>
                <option value="مديرية الكرخ الثالثه">{isRtl ? "مديرية الكرخ الثالثه" : "Karkh 3rd Directorate"}</option>
                <option value="مديرية الرصافة الاولى">{isRtl ? "مديرية الرصافة الاولى" : "Rusafa 1st Directorate"}</option>
                <option value="مديرية الرصافة الثانية">{isRtl ? "مديرية الرصافة الثانية" : "Rusafa 2nd Directorate"}</option>
                <option value="مديرية الرصافة الثالثه">{isRtl ? "مديرية الرصافة الثالثه" : "Rusafa 3rd Directorate"}</option>
                <option value="أخرى / مديرية أخرى">{isRtl ? "أخرى / مديرية أخرى" : "Other Directorate"}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "المرحلة الدراسية" : "School Stage"}
              </label>
              <select
                required
                value={schoolSetup.stage}
                onChange={(e) =>
                  setSchoolSetup({ ...schoolSetup, stage: e.target.value })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
              >
                <option value="" disabled>
                  {isRtl ? "اختر المرحلة..." : "Select Stage..."}
                </option>
                <option value="روضة">{isRtl ? "روضة" : "Kindergarten"}</option>
                <option value="ابتدائي">{isRtl ? "ابتدائي" : "Primary"}</option>
                <option value="متوسطة">{isRtl ? "متوسطة" : "Middle School"}</option>
                <option value="اعدادية">{isRtl ? "اعدادية" : "High School"}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "وقت الدوام" : "School Shift"}
              </label>
              <select
                required
                value={schoolSetup.shift}
                onChange={(e) =>
                  setSchoolSetup({ ...schoolSetup, shift: e.target.value })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
              >
                <option value="" disabled>
                  {isRtl ? "اختر وقت الدوام..." : "Select Shift..."}
                </option>
                <option value="صباحي">{isRtl ? "صباحي" : "Morning Shift"}</option>
                <option value="مسائي">{isRtl ? "مسائي" : "Evening Shift"}</option>
                <option value="مدمج">{isRtl ? "مدمج" : "Merged/Joint Shift"}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "نوع الدراسة" : "Study Gender Type"}
              </label>
              <select
                required
                value={schoolSetup.genderType}
                onChange={(e) =>
                  setSchoolSetup({ ...schoolSetup, genderType: e.target.value })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
              >
                <option value="" disabled>
                  {isRtl ? "اختر نوع الدراسة..." : "Select Type..."}
                </option>
                <option value="مختلطة">{isRtl ? "مختلطة" : "Co-educational"}</option>
                <option value="بنات فقط">{isRtl ? "بنات فقط" : "Girls Only"}</option>
                <option value="اولاد فقط">{isRtl ? "اولاد فقط" : "Boys Only"}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "عدد الطلاب التقريبي" : "Approximate Number of Students"}
              </label>
              <input
                required
                type="number"
                min="1"
                value={schoolSetup.approximateStudents}
                onChange={(e) =>
                  setSchoolSetup({
                    ...schoolSetup,
                    approximateStudents: e.target.value,
                  })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
                placeholder={isRtl ? "مثال: 500" : "e.g. 500"}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">
                {isRtl ? "الموقع / العنوان (التفصيلي)" : "Address / Location (Detailed)"}
              </label>
              <input
                required
                type="text"
                value={schoolSetup.address}
                onChange={(e) =>
                  setSchoolSetup({ ...schoolSetup, address: e.target.value })
                }
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 dark:text-white focus:bg-white dark:focus:bg-slate-900 transition-all outline-none focus:border-slate-900 dark:focus:border-indigo-500 font-bold text-sm"
                placeholder={isRtl ? "تكملة العنوان (القضاء - الحي)..." : "Address details (District, Neighborhood...)"}
              />
            </div>
            <button
              disabled={isSettingUp}
              className="w-full py-5 bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-[1.5rem] font-bold text-lg hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSettingUp ? (isRtl ? "جاري الإعداد..." : "Setting up...") : (isRtl ? "حفظ البيانات والبدء" : "Save Record & Start")}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview setActiveTab={setActiveTab} />;
      case "chat":
        return <AdminChatTab />;
      case "classes":
        return <Classes />;
      case "schedules":
        return <Schedules />;
      case "students":
        return <StudentsList mode="view" />;
      case "students_edit":
        return <StudentsList mode="edit" />;
      case "parents":
        return <ParentsList />;
      case "staff":
        return <StaffList />;
      case "tuition":
        return <Tuition />;
      case "behavior":
        return <Behavior />;
      case "attendance":
        return <Attendance />;
      case "grades":
        return <Grades />;
      case "student_archive":
        return <StudentArchive />;
      case "market":
        return <Marketplace />;
      case "payroll":
        return <Payroll />;
      case "inventory":
        return <Inventory />;
      case "announcements":
        return <Announcements />;
      case "assistants":
        return <AssistantsManagement />;
      case "settings":
        return <SettingsView />;
      case "evaluation_reports":
        return <EvaluationReports />;
      case "homework":
        return <Homework />;
      case "advanced_reports":
        return <AdvancedReports />;
      case "id_cards":
        return <IdCards />;
      default:
        return (
          <div className="p-8 text-center text-gray-500">
            هذه الميزة قيد التطوير
          </div>
        );
    }
  };

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-transparent flex flex-col md:flex-row transition-colors duration-300 print:h-auto print:block"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Expiry Overlay */}
      {isExpired && profile?.role !== "superadmin" && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6"
          dir="rtl"
        >
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 text-center shadow-2xl border border-red-100 dark:border-red-900/30">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="text-red-600 dark:text-red-400" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
              عذراً، انتهى مفعول الاشتراك
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-bold italic">
              لقد انتهت الفترة الزمنية المخصصة لاشتراك مدرستكم. يرجى التواصل مع
              إدارة المنصة لتجديد الاشتراك وتفعيل الخدمات.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleRenewRequest}
                disabled={isRenewing}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRenewing ? "جاري الإرسال..." : "طلب تجديد الآن"}
              </button>
              <button
                onClick={() => auth.signOut()}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: isRtl ? 300 : -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1, width: isSidebarCollapsed ? 80 : 288 }}
            exit={{ x: isRtl ? 300 : -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`fixed inset-y-0 ${isRtl ? "right-0 rounded-l-[2rem] lg:rounded-none border-l" : "left-0 rounded-r-[2rem] lg:rounded-none border-r"} z-50 bg-slate-900 dark:bg-black text-white flex flex-col pt-safe lg:relative border-slate-800 dark:border-slate-900 print:hidden shadow-2xl lg:shadow-none shrink-0 overflow-visible`}
          >
            <div className="h-full flex flex-col overflow-hidden w-full">
              <div
                className={`p-6 border-b border-slate-800/50 flex ${isSidebarCollapsed ? "justify-center" : "items-center gap-4"}`}
              >
                {schoolData?.logoUrl ? (
                  <div className="bg-white w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center p-1 shadow-xl shrink-0 overflow-hidden">
                    <img
                      src={schoolData.logoUrl || undefined}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : config.appLogo ? (
                  <div className="bg-white w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center p-1 shadow-xl shrink-0 overflow-hidden">
                    <img
                      src={config.appLogo || undefined}
                      alt={config.appName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="bg-white w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-xl md:text-2xl shadow-xl shrink-0 overflow-hidden">
                    {config.appName[0]}
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-w-0"
                  >
                    <h1 className="font-bold text-lg md:text-xl text-white font-display tracking-tight leading-none truncate">
                      {config.appName}
                    </h1>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 block truncate">
                      {t("appTagline")}
                    </span>
                  </motion.div>
                )}
              </div>

              <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-4 space-y-1.5 custom-scrollbar">
                {filteredMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateToTab(item.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${
                      activeTab === item.id
                        ? "bg-white text-slate-900 shadow-xl"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <item.icon
                      size={isSidebarCollapsed ? 24 : 20}
                      strokeWidth={activeTab === item.id ? 2.5 : 1.5}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {item.label}
                      </div>
                    )}
                  </button>
                ))}
              </nav>

              <div className="p-4 md:p-6 mt-auto">
                {!isSidebarCollapsed ? (
                  <div className="bg-slate-800/50 p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] mb-3 md:mb-4 border border-slate-700/50 min-w-0">
                    <p className="text-[9px] text-slate-500 mb-1 uppercase tracking-widest font-bold truncate">
                      {isRtl ? "المستخدم النشط" : "Active User"}
                    </p>
                    <p className="text-sm font-bold text-white truncate font-display">
                      {profile?.name}
                    </p>
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-4 shadow-sm"
                    title={profile?.name}
                  >
                    {profile?.name?.[0]}
                  </div>
                )}
                <button
                  onClick={() => auth.signOut()}
                  title={isSidebarCollapsed ? (isRtl ? "تسجيل الخروج" : "Logout") : undefined}
                  className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3 px-4 md:px-5"} py-3 md:py-4 rounded-xl md:rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm`}
                >
                  <LogOut
                    size={isSidebarCollapsed ? 24 : 20}
                    className="shrink-0"
                  />
                  {!isSidebarCollapsed && <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-transparent transition-colors duration-300 print:overflow-visible print:h-auto">
        <header className="h-16 md:h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 md:px-8 shrink-0 sticky top-0 z-40 transition-colors print:hidden">
          <div className="flex items-center gap-2 md:gap-6">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                  if (!isSidebarOpen) {
                    // Ensure it's not collapsed when opened as mobile drawer
                    setIsSidebarCollapsed(false);
                  }
                }
              }}
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all shadow-sm shrink-0"
            >
              <Menu
                size={20}
                className={
                  (!isSidebarOpen && window.innerWidth < 1024) ||
                  isSidebarCollapsed
                    ? "rotate-90 transition-transform"
                    : "transition-transform"
                }
              />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800"></div>

            {activeTab !== "overview" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all font-bold text-[10px] shadow-sm hover:shadow active:scale-95 group"
              >
                <ArrowRight
                  size={14}
                  className={`transition-transform ${isRtl ? "group-hover:translate-x-0.5" : "rotate-180 group-hover:-translate-x-0.5"}`}
                />
                <span className="hidden sm:inline">{t("back")}</span>
              </motion.button>
            )}

            <h2 className="text-sm md:text-xl font-bold text-slate-800 dark:text-white truncate max-w-[120px] md:max-w-none">
              {menuItems.find((i) => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div>
              <LanguageToggle />
            </div>

            <div className="font-bold select-none">
              <ThemeToggle />
            </div>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-11 h-11 rounded-xl md:rounded-2xl border transition-all flex items-center justify-center relative ${showNotifications ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-200 hover:text-indigo-600"}`}
            >
              <Bell size={18} />
              {notifications.filter((n: any) => !n.read).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full text-[10px] font-black text-white flex items-center justify-center">
                  {notifications.filter((n: any) => !n.read).length > 9 ? '9+' : notifications.filter((n: any) => !n.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationCenter
                onClose={() => setShowNotifications(false)}
                activeTabSetter={setActiveTab}
                userRole={profile?.role || "admin"}
              />
            )}

            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-left hidden lg:block">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mb-1.5">
                  {t("todayDate")}
                </p>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Calendar size={14} className="text-slate-400" />
                  <p className="text-xs font-bold whitespace-nowrap">
                    {new Date().toLocaleDateString(isRtl ? "ar-IQ" : "en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2"></div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 md:w-11 md:h-11 bg-slate-900 dark:bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-bold border border-slate-800 dark:border-slate-700 shadow-md">
                  {profile?.name?.[0]}
                </div>
              </div>
            </div>
          </div>
        </header>

        {!auth.currentUser?.emailVerified && !hideVerificationBanner && (
          <div className="mx-4 md:mx-8 mt-4 md:mt-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm shrink-0 relative">
            <button
              onClick={handleHideVerification}
              className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 p-1 rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
              title="إخفاء مؤقتاً"
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-3 text-right w-full">
              <div className="w-8 h-8 shrink-0 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-xl flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs md:text-sm font-bold text-amber-900 dark:text-amber-400 leading-tight">
                  تأكيد البريد الإلكتروني مطلوب
                </h4>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold mt-0.5 truncate max-w-[220px] md:max-w-[400px]">
                  يرجى تفعيل بريدك ({auth.currentUser?.email})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={async () => {
                  if (auth.currentUser) {
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                      toast.success("تم تأكيد البريد بنجاح");
                    } else {
                      toast.error("لم يتم التأكيد بعد، يرجى مراجعة بريدك");
                    }
                  }
                }}
                className="flex-1 md:flex-none px-4 py-2 bg-white/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-[10px] hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
              >
                تحديث
              </button>
              <button
                onClick={handleResendVerification}
                disabled={isSendingVerification || verificationCooldown > 0}
                className="flex-1 md:flex-none px-4 py-2 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-400 rounded-lg font-bold text-[10px] hover:bg-amber-300 dark:hover:bg-amber-800 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap overflow-hidden text-ellipsis"
              >
                {isSendingVerification
                  ? "جاري..."
                  : verificationCooldown > 0
                    ? `انتظر ${verificationCooldown} ثانية`
                    : "إعادة إرسال"}
              </button>
            </div>
          </div>
        )}

        <main
          className={`flex-1 flex flex-col relative print:p-0 print:m-0 print:overflow-visible min-h-0 ${activeTab === "chat" ? "overflow-hidden h-full pb-0" : "overflow-y-auto pb-10"}`}
        >
          <div
            className={`w-full mx-auto flex flex-col print:min-h-0 print:pb-0 print:p-0 ${
              activeTab === "chat"
                ? "h-full max-w-none p-0 flex-1 min-h-0"
                : "max-w-7xl p-4 md:p-8"
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                className={
                  activeTab === "chat"
                    ? "flex-1 flex flex-col min-h-0"
                    : "w-full flex flex-col"
                }
                initial={{ opacity: 0, y: activeTab === "chat" ? 0 : 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: activeTab === "chat" ? 0 : -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {isExpired && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60"
              >
                <div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl border border-slate-200">
                  <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <X size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 font-display">
                    انتهت صلاحية الاشتراك
                  </h2>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    عذراً، لقد انتهت صلاحية اشتراك مدرستك. يرجى التواصل مع
                    الإدارة العامة (Super Admin) لتجديد الاشتراك ومواصلة استخدام
                    الخدمات.
                  </p>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        تاريخ الانتهاء
                      </span>
                      <span className="text-sm font-bold text-red-600 font-mono">
                        {new Date(
                          schoolData?.subscriptionExpiresAt,
                        ).toLocaleDateString("ar-IQ")}
                      </span>
                    </div>
                    <button
                      onClick={handleRenewRequest}
                      disabled={isRenewing}
                      className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRenewing ? "جاري الإرسال..." : "طلب تجديد الآن"}
                    </button>
                    <button
                      onClick={() => auth.signOut()}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {activeTab !== "chat" && <GlobalFooter compact />}
        </main>

        {/* Real-time Subscription Timer Bottom Bar */}
        {schoolData?.subscriptionExpiresAt &&
          schoolData?.status === "active" &&
          schoolData?.showSubscriptionTimer !== false && (
            <SubscriptionTimer
              expiryDate={schoolData.subscriptionExpiresAt}
              variant="bottom-bar"
            />
          )}

        <AnimatePresence>
          {viewingPackage && (
            <PackageDetailsModal
              pkg={viewingPackage}
              onClose={() => setViewingPackage(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PackageDetailsModal({
  pkg,
  onClose,
}: {
  pkg: any;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
      >
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {pkg.name}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
              تفاصيل الباقة المطلوبة
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all active:scale-95"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/30">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">
                السعر السنوي
              </p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {(pkg.priceYearly !== undefined
                  ? pkg.priceYearly
                  : pkg.price) === 0
                  ? "مجاني"
                  : (pkg.priceYearly !== undefined
                      ? pkg.priceYearly
                      : pkg.price
                    ).toLocaleString("ar-IQ")}
                {(pkg.priceYearly !== undefined ? pkg.priceYearly : pkg.price) >
                  0 && <span className="text-xs font-bold mr-1">د.ع</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">
                السعر الشهري
              </p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {(pkg.priceMonthly !== undefined
                  ? pkg.priceMonthly
                  : Math.round((pkg.price || 0) / 12)) === 0
                  ? "مجاني"
                  : (pkg.priceMonthly !== undefined
                      ? pkg.priceMonthly
                      : Math.round((pkg.price || 0) / 12)
                    ).toLocaleString("ar-IQ")}
                {(pkg.priceMonthly !== undefined
                  ? pkg.priceMonthly
                  : Math.round((pkg.price || 0) / 12)) > 0 && (
                  <span className="text-xs font-bold mr-1">د.ع</span>
                )}
              </p>
            </div>
            <div className="col-span-2 border-t border-indigo-150/40 dark:border-indigo-800/10 pt-4 mt-2 text-right">
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">
                سعة الطلاب
              </p>
              <p className="text-xl font-black text-indigo-800 dark:text-indigo-300">
                {pkg.maxStudents.toLocaleString("ar-IQ")} طالب
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-indigo-500" />
              الميزات المتضمنة:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {pkg.features.map((f: string) => (
                <div
                  key={f}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {f}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

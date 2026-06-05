import React, { useState, useEffect } from "react";
import { db, auth, storage } from "../lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { adminCreateUser, adminDeleteUser } from "../lib/adminApi";
import { getApiUrl } from "../lib/apiUtils";
import {
  collection,
  onSnapshot,
  query,
  addDoc,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
  where,
  getDocs,
  updateDoc,
  limit,
} from "firebase/firestore";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { MobileNavigationDock } from "../components/MobileNavigationDock";
import {
  School,
  Building,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  LogOut,
  Users,
  Settings as SettingsIcon,
  Phone,
  Mail,
  Save,
  MapPin,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Package,
  X,
  ClipboardCheck,
  FileArchive,
  LayoutGrid,
  LayoutDashboard,
  Navigation,
  Menu,
  MessageSquare,
  Activity,
  Upload,
  Sparkles,
  Star,
  CreditCard,
  Bell,
} from "lucide-react";
import { NotificationCenter } from "../components/NotificationCenter";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { SubscriptionTimer } from "../components/SubscriptionTimer";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { GlobalFooter } from "../components/GlobalFooter";
import { useAuth } from "../lib/AuthContext";

import { useLanguage } from "../lib/LanguageContext";
import { useSystemConfig } from "../lib/SystemConfigContext";
import SchoolixLogo from "../components/SchoolixLogo";
import SuperAdminChatTab from "./admin/SuperAdminChatTab";
import { SuperAdminBackupsTab } from "./SuperAdminBackupsTab";
import { SuperAdminDiagnostics } from "./SuperAdminDiagnostics";

const DEFAULT_PACKAGES = [
  {
    id: "basic",
    name: "الباقة الأساسية",
    price: 1500000,
    priceMonthly: 150000,
    priceYearly: 1500000,
    isPopular: false,
    durationDays: 365,
    showSubscriptionTimer: true,
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
    durationDays: 365,
    showSubscriptionTimer: true,
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
    durationDays: 365,
    showSubscriptionTimer: true,
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

export default function SuperAdminDashboard() {
  const { profile, logout } = useAuth();
  const { t, isRtl, setLanguage, language } = useLanguage();
  const { config } = useSystemConfig();

  const MASTER_ADMIN_EMAILS = [
    "hamzakazem1999@gmail.com",
    "hamzakazem973@gmail.com",
    "scooopyiq@gmail.com",
  ];
  const isMasterAdmin = MASTER_ADMIN_EMAILS.includes(
    profile?.email?.toLowerCase() || "",
  );

  const hasPermission = (permission: string) => {
    if (profile?.role === "superadmin") return true;
    if (profile?.role === "assistant" && !profile?.schoolId) {
      return profile?.permissions?.includes(permission);
    }
    return false;
  };

  const [schools, setSchools] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState<any[]>([]);
  const [schoolDeleteConfirmId, setSchoolDeleteConfirmId] = useState<
    string | null
  >(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [userDeleteConfirmId, setUserDeleteConfirmId] = useState<string | null>(
    null,
  );
  const [packageDeleteConfirmId, setPackageDeleteConfirmId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<
    | "schools"
    | "packages"
    | "users"
    | "parents"
    | "requests"
    | "settings"
    | "accounts"
    | "team"
    | "chat"
    | "backups"
    | "diagnostics"
  >("schools");
  const [schoolFilter, setSchoolFilter] = useState<"all" | "active" | "expiring">("all");
  const [usersTab, setUsersTab] = useState<"management" | "parents">(
    "management",
  );
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
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
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [activeRequestSource, setActiveRequestSource] = useState<string | null>(
    null,
  );
  const [viewingPackage, setViewingPackage] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
        setIsSidebarCollapsed(false);
      } else {
        setIsSidebarOpen(true);
        setIsSidebarCollapsed(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [hideVerificationBanner, setHideVerificationBanner] = useState(false);

  const handleHideVerification = () => {
    setHideVerificationBanner(true);
    setTimeout(() => {
      setHideVerificationBanner(false);
    }, 60000); // reappear after 1 minute
  };

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
    if (!auth.currentUser) return;

    if (verificationCooldown > 0) {
      toast.error(`يرجى الانتظار ${verificationCooldown} ثانية`);
      return;
    }

    setIsSendingVerification(true);
    try {
      auth.languageCode = "ar";
      await sendEmailVerification(auth.currentUser);
      toast.success("تم إرسال رابط التأكيد مجدداً");
      setVerificationCooldown(60);
    } catch (error: any) {
      console.error("Super Admin verification error:", error);
      if (error.code === "auth/too-many-requests") {
        toast.error("الكثير من الطلبات، يرجى المحاولة لاحقاً");
        setVerificationCooldown(120);
      } else {
        toast.error("فشل الإرسال، حاول لاحقاً");
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  // Enhanced tab switcher that tracks history
  const navigateToTab = (tabId: any) => {
    if (tabId === activeTab) return;
    setNavigationHistory((prev) => [...prev, activeTab]);
    setActiveTab(tabId);
  };

  const handleBack = () => {
    if (navigationHistory.length > 0) {
      const prevTab = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab as any);
    } else {
      setActiveTab("schools");
    }
  };

  if (!profile) return null;
  const [systemConfig, setSystemConfig] = useState<{
    supportPhones: string[];
    supportEmails: string[];
    successPartners: { name: string; logoUrl: string }[];
    appName: string;
    appLogo: string;
    marketingTitle?: string;
    marketingSubtitle?: string;
    marketingFeatures?: { title: string; description: string }[];
    socialLinks?: {
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      whatsapp?: string;
    };
  }>({
    supportPhones: ["+964 770 000 0000"],
    supportEmails: ["support@schoolixiq.iq"],
    successPartners: [],
    appName: "SchoolixiQ",
    appLogo: "",
    marketingTitle: "",
    marketingSubtitle: "",
    marketingFeatures: [],
    socialLinks: { instagram: "", twitter: "", linkedin: "", whatsapp: "" },
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const configRef = doc(db, "system", "config");
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSystemConfig({
            supportPhones:
              data.supportPhones ||
              (data.supportPhone ? [data.supportPhone] : ["+964 770 000 0000"]),
            supportEmails:
              data.supportEmails ||
              (data.supportEmail
                ? [data.supportEmail]
                : ["support@schoolixiq.iq"]),
            successPartners: data.successPartners || [],
            appName: data.appName || "SchoolixiQ",
            appLogo: data.appLogo || "",
            marketingTitle: data.marketingTitle || "",
            marketingSubtitle: data.marketingSubtitle || "",
            marketingFeatures: data.marketingFeatures || [],
            socialLinks: data.socialLinks || {
              instagram: "",
              twitter: "",
              linkedin: "",
              whatsapp: "",
            },
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "system/config");
      },
    );
    return unsub;
  }, []);

  const handleUpdateConfig = async () => {
    setIsSavingConfig(true);
    const path = "system/config";
    try {
      await setDoc(doc(db, "system", "config"), systemConfig, { merge: true });
      toast.success("تم تحديث إعدادات النظام");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error("خطأ في تحديث الإعدادات");
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUploadAppLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة صالحة");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن لا يتجاوز 2 ميغابايت");
      return;
    }

    const toastId = toast.loading("جاري رفع الصورة...");
    try {
      const { compressImageToBase64 } = await import("../lib/image-utils");
      const base64Url = await compressImageToBase64(file, 400, 400, 0.8);

      setSystemConfig({ ...systemConfig, appLogo: base64Url });

      toast.success("تم رفع الصورة بنجاح", { id: toastId });
    } catch (error: any) {
      console.error("Error processing app logo:", error);
      toast.error("فشل رفع الصورة.", { id: toastId });
    } finally {
      e.target.value = "";
    }
  };

  const handleUploadPartnerLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة يجب أن لا يتجاوز 2 ميغابايت");
      return;
    }

    const toastId = toast.loading("جاري رفع الصورة...");
    try {
      // Use local base64 compression instead of external storage to avoid CORS/Storage issues
      const { compressImageToBase64 } = await import("../lib/image-utils");
      const base64Url = await compressImageToBase64(file, 200, 200, 0.8);

      const newPartners = [...systemConfig.successPartners];
      newPartners[idx].logoUrl = base64Url;
      setSystemConfig({ ...systemConfig, successPartners: newPartners });

      toast.success("تم رفع الصورة بنجاح", { id: toastId });
    } catch (error: any) {
      console.error("Error processing partner logo:", error);
      toast.error("فشل رفع الصورة.", { id: toastId });
    } finally {
      e.target.value = "";
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [schoolModalTab, setSchoolModalTab] = useState<
    "info" | "subscription" | "admin"
  >("info");
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [packageModalTab, setPackageModalTab] = useState<
    "general" | "permissions" | "features"
  >("general");
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGovernorate, setFilterGovernorate] = useState("");
  const [filterDirectorate, setFilterDirectorate] = useState("");

  const [newSchool, setNewSchool] = useState({
    name: "",
    address: "",
    googleMapsUrl: "",
    governorate: "",
    directorate: "",
    stage: "",
    shift: "",
    genderType: "",
    approximateStudents: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
    authUid: "",
    durationDays: 365,
    showSubscriptionTimer: true,
    planId: "",
  });
  const [newPackage, setNewPackage] = useState({
    name: "",
    price: 0,
    priceMonthly: 0,
    priceYearly: 0,
    maxStudents: 500,
    features: "",
    durationDays: 365,
    showSubscriptionTimer: true,
    showInRegistration: true,
    isPopular: false,
    permissions: {
      overview: true,
      chat: true,
      students_view: true,
      students_edit: true,
      staff_manage: true,
      attendance_track: true,
      exams_and_results: true,
      student_archive: true,
      tuition_fees: false,
      staff_payroll: false,
      inventory_and_assets: false,
      behavior_management: true,
      student_evaluation_reports: true,
      homework_and_tasks: true,
      classes: true,
      automated_schedules: false,
      announcements: true,
      parent_app_access: true,
      advanced_reports: false,
      marketplace_ordering: true,
      id_card_generation: false,
      assistants_manage: false,
      settings: true,
    },
  });

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "parent",
    schoolId: "",
    permissions: [] as string[],
  });

  const SYSTEM_PERMISSIONS: Record<string, string> = {
    manage_schools: t('sidebar_schools'),
    manage_packages: t('sidebar_packages'),
    view_requests: t('sidebar_requests'),
    manage_users: t('sidebar_users'),
    system_settings: t('sidebar_settings'),
  };

  const PERMISSION_LABELS: Record<string, string> = {
    overview: t('overview'),
    daily_summary: t('dailySummary') || (isRtl ? "ملخص المدرسة اليومي" : "Daily School Summary"),
    chat: t('chat'),
    students_view: t('viewStudents'),
    students_edit: t('manageStudents'),
    staff_manage: t('manageStaff'),
    attendance_track: t('attendance'),
    exams_and_results: t('grades'),
    student_archive: isRtl ? "أرشيف الطالب" : "Student Archive",
    tuition_fees: t('tuition'),
    staff_payroll: t('payroll'),
    inventory_and_assets: t('inventory'),
    behavior_management: t('behavior'),
    student_evaluation_reports: t('evaluations'),
    homework_and_tasks: t('homework'),
    classes: t('classes') || (isRtl ? "الصفوف" : "Classes"),
    automated_schedules: t('schedules'),
    announcements: t('announcements'),
    parent_app_access: t('parentApp'),
    advanced_reports: t('advancedReports'),
    marketplace_ordering: t('marketplace'),
    id_card_generation: t('idCards'),
    assistants_manage: t('assistants'),
    settings: t('settings'),
  };

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGov = filterGovernorate
      ? s.governorate === filterGovernorate
      : true;
    const matchesDir = filterDirectorate
      ? s.directorate === filterDirectorate
      : true;
      
    let matchesFilter = true;
    if (schoolFilter === "active") {
      matchesFilter = s.status === "active";
    } else if (schoolFilter === "expiring") {
      const days = s.subscriptionExpiresAt ? Math.ceil(
        (new Date(s.subscriptionExpiresAt).getTime() - new Date().getTime()) /
          (1000 * 3600 * 24),
      ) : -1;
      matchesFilter = days > 0 && days <= 7;
    }

    return matchesSearch && matchesGov && matchesDir && matchesFilter;
  });

  const stats = {
    total: schools.length,
    active: schools.filter((s) => s.status === "active").length,
    expiringSoon: schools.filter((s) => {
      if (!s.subscriptionExpiresAt) return false;
      const days = Math.ceil(
        (new Date(s.subscriptionExpiresAt).getTime() - new Date().getTime()) /
          (1000 * 3600 * 24),
      );
      return days > 0 && days <= 7;
    }).length,
  };

  const handleExtendSubscription = async (
    schoolId: string,
    currentExpiry: string,
  ) => {
    const path = `schools/${schoolId}`;
    try {
      const newExpiry = new Date(currentExpiry);
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      await setDoc(
        doc(db, "schools", schoolId),
        {
          subscriptionExpiresAt: newExpiry.toISOString(),
        },
        { merge: true },
      );

      toast.success("تم تمديد الاشتراك بنجاح");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleToggleSchoolStatus = async (
    schoolId: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
      await setDoc(
        doc(db, "schools", schoolId),
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast.success(
        newStatus === "active"
          ? "تم تفعيل الاشتراك"
          : "تم إيقاف الاشتراك بنجاح",
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `schools/${schoolId}`);
    }
  };

  const handleToggleTimer = async (schoolId: string, currentShow: boolean) => {
    try {
      await updateDoc(doc(db, "schools", schoolId), {
        showSubscriptionTimer: !currentShow,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        currentShow ? "تم إخفاء المؤقت عن المدرسة" : "تم إظهار المؤقت للمدرسة",
      );
    } catch (error) {
      console.error("Error toggling timer:", error);
      toast.error("فشل في تغيير حالة المؤقت");
    }
  };

  const handleToggleFeatured = async (
    schoolId: string,
    currentFeatured?: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "schools", schoolId), {
        featured: !currentFeatured,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        !currentFeatured
          ? "تم التحديد كمدرسة مميزة"
          : "تم الإلغاء من المدارس المميزة",
      );
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast.error("فشل في تغيير حالة التميز للمدرسة");
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    const loadingToast = toast.loading(
      "جاري مسح بيانات المدرسة والمستخدمين...",
    );
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(getApiUrl('/api/admin/delete-school'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ schoolId })
      });

      if (!response.ok) {
        let msg = 'فشل الحذف الكامل للبيانات';
        try {
           const errRes = await response.json();
           msg = errRes.error || msg;
        } catch(e) {}
        throw new Error(msg);
      }

      toast.dismiss(loadingToast);
      toast.success("تم حذف المدرسة وكامل بياناتها بنجاح");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Full school deletion failed:", error);
      toast.error("فشل الحذف الكامل: " + (error.message || "خطأ غير متوقع"));
    }
  };

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (!auth.currentUser) return;

    try {
      const schoolsQ = query(collection(db, "schools"), limit(100));
      const packagesQ = query(collection(db, "packages"), limit(50));
      const usersQ = query(collection(db, "users"), limit(1000));
      const studentsQ = query(collection(db, "students"), limit(1000));

      const regQ = query(
        collection(db, "registrations"),
        where("status", "in", ["pending", "needs_review"]),
        limit(50),
      );
      const subReqQ = query(
        collection(db, "subscriptionRequests"),
        where("status", "==", "pending"),
        limit(50),
      );
      const ordersQ = query(
        collection(db, "orders"),
        where("type", "in", ["subscription_request", "direct_school_signup"]),
        limit(50),
      );

      // Separate references to combine requests properly
      let currentReg: any[] = [];
      let currentSubReq: any[] = [];
      let currentOrders: any[] = [];

      const updateRequests = () => {
        setSubscriptionRequests([
          ...currentReg,
          ...currentSubReq,
          ...currentOrders,
        ]);
      };

      unsubs.push(
        onSnapshot(
          schoolsQ,
          (snap) => setSchools(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
          (error) => {
            console.error("SuperAdminDashboard: Failed to listen to schools:", error);
            handleFirestoreError(error, OperationType.GET, "schools", false);
          }
        ),
      );
      unsubs.push(
        onSnapshot(
          packagesQ,
          (snap) => {
            if (!snap.empty) {
              setPackages(
                snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
              );
            } else {
              setPackages(DEFAULT_PACKAGES);
            }
          },
          (err) => {
            console.warn("Packages subscription failed, using defaults", err);
            handleFirestoreError(err, OperationType.GET, "packages", false);
            setPackages(DEFAULT_PACKAGES);
          },
        ),
      );
      unsubs.push(
        onSnapshot(
          usersQ,
          (snap) => setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
          (error) => {
            console.error("SuperAdminDashboard: Failed to listen to users:", error);
            handleFirestoreError(error, OperationType.GET, "users", false);
          }
        ),
      );
      unsubs.push(
        onSnapshot(
          studentsQ,
          (snap) => setStudents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
          (error) => {
            console.error("SuperAdminDashboard: Failed to listen to students:", error);
            handleFirestoreError(error, OperationType.GET, "students", false);
          }
        ),
      );

      unsubs.push(
        onSnapshot(
          regQ,
          (snap) => {
            currentReg = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              _source: "registrations",
            }));
            updateRequests();
          },
          (error) => {
            console.error("SuperAdminDashboard: Failed to listen to registrations:", error);
            handleFirestoreError(error, OperationType.GET, "registrations", false);
          }
        ),
      );
      unsubs.push(
        onSnapshot(
          subReqQ,
          (snap) => {
            currentSubReq = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              _source: "subscriptionRequests",
            }));
            updateRequests();
          },
          (error) => {
            console.error("SuperAdminDashboard: Failed to listen to subscriptionRequests:", error);
            handleFirestoreError(error, OperationType.GET, "subscriptionRequests", false);
          }
        ),
      );
      unsubs.push(
        onSnapshot(
          ordersQ,
          (snap) => {
            currentOrders = snap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              _source: "orders",
            }));
            updateRequests();
          },
          (error) => {
            console.error("SuperAdminDashboard: Failed to listen to orders:", error);
            handleFirestoreError(error, OperationType.GET, "orders", false);
          }
        ),
      );
    } catch (error) {
      console.error("Error setting up SuperAdmin Dashboard listeners:", error);
    }

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const handleApproveSubscription = async (request: any) => {
    if (!request.schoolId) {
      toast.error("هذا الطلب غير مرتبط بمعرف مدرسة");
      return;
    }
    const loadingToast = toast.loading("جاري تفعيل الحساب...");
    try {
      const durationDays = request.durationDays || 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // 1. Update school status
      await updateDoc(doc(db, "schools", request.schoolId), {
        status: "active",
        planId: request.planId || "basic",
        subscriptionExpiresAt: expiresAt.toISOString(),
        updatedAt: serverTimestamp(),
      });

      // 2. Delete request document so it disappears
      const source = request._source || "subscriptionRequests";
      await deleteDoc(doc(db, source, request.id));

      toast.dismiss(loadingToast);
      toast.success("تم تفعيل حساب المدرسة ومسح الطلب بنجاح");
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error("فشل التفعيل: " + error.message);
    }
  };

  const handleDeleteRequest = async (request: any) => {
    const id = typeof request === "string" ? request : request?.id;
    const source =
      typeof request === "string" ? "orders" : request?._source || "orders";

    if (!id) {
      toast.error("لم يتم العثور على معرف الطلب");
      return;
    }

    const loadingToast = toast.loading("جاري إلغاء الطلب...");
    try {
      // If it's a subscription request and has a schoolId, update school status to 'rejected'
      if (request && typeof request !== "string" && request.schoolId) {
        await updateDoc(doc(db, "schools", request.schoolId), {
          status: "rejected",
          updatedAt: serverTimestamp(),
        });
      }

      const requestRef = doc(db, source, id);
      await deleteDoc(requestRef);

      toast.dismiss(loadingToast);
      toast.success("تم إلغاء الطلب وتحويل حالة المدرسة إلى مرفوض");
      setDeleteConfirmId(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Cancel failed:", error);

      if (error.code === "permission-denied") {
        toast.error("ليس لديك صلاحية لإلغاء هذا الطلب");
      } else {
        toast.error(`خطأ: ${error.message || "فشل الاتصال بالخادم"}`);
      }
      handleFirestoreError(error, OperationType.DELETE, `${source}/${id}`);
    }
  };

  const handleApproveRequest = async (request: any) => {
    if (!request || !request.id) return;

    // Check if school already exists to prevent duplicate effort
    const email = (request.customerInfo?.email || request.email)
      ?.toLowerCase()
      ?.trim();
    if (email) {
      const existingSchool = schools.find(
        (s) => s.adminEmail?.toLowerCase() === email,
      );
      if (existingSchool) {
        try {
          await deleteDoc(doc(db, request._source || "orders", request.id));
          toast.success("تم حذف الطلب المكرر حيث أن المدرسة مسجلة بالفعل");
        } catch (e) {
          toast.error("هذه المدرسة مسجلة بالفعل، يرجى حذف الطلب المكرر يدوياً");
        }
        return;
      }
    }

    const loadingToast = toast.loading(
      "جاري تجهيز المدرسة وتفعيل حساب المدير وتسجيل البيانات...",
    );
    try {
      const durationDays = request.durationDays || 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      const name =
        request.customerInfo?.name ||
        request.name ||
        request.schoolName ||
        "مدرسة جديدة";
      const address = request.customerInfo?.address || request.address || "";
      const planId =
        request.planId || request.packageId || request.packageName || "basic";
      const password =
        request.password ||
        request.adminPassword ||
        request.customerInfo?.password ||
        "";
      const phone =
        request.customerInfo?.phone ||
        request.phone ||
        request.adminPhone ||
        "";
      const adminName =
        request.customerInfo?.name ||
        request.name ||
        request.adminName ||
        "مدير المدرسة";

      // 1. Create School (Firestore)
      const customerInfo = request.customerInfo || {};
      const schoolRef = await addDoc(collection(db, "schools"), {
        name: name,
        address: address,
        governorate: customerInfo.governorate || request.governorate || "",
        directorate: customerInfo.directorate || request.directorate || "",
        educationLevel: customerInfo.educationLevel || request.educationLevel || request.stage || "",
        stage: customerInfo.educationLevel || request.educationLevel || request.stage || "",
        workingHours: customerInfo.workingHours || request.workingHours || request.shift || "",
        shift: customerInfo.workingHours || request.workingHours || request.shift || "",
        studyType: customerInfo.studyType || request.studyType || request.genderType || "",
        genderType: customerInfo.studyType || request.studyType || request.genderType || "",
        estimatedStudents: Number(customerInfo.estimatedStudents || request.estimatedStudents) || 0,
        approximateStudents: customerInfo.estimatedStudents || request.estimatedStudents || "",
        status: "active",
        planId: planId,
        studentCount: 0,
        subscriptionExpiresAt: expiresAt.toISOString(),
        showSubscriptionTimer: true,
        adminEmail: email,
        adminPassword: password, // Store for reference only
        adminPhone: phone,
        createdAt: serverTimestamp(),
      });

      // 2. Create User Profile
      if (request.uid) {
        await setDoc(
          doc(db, "users", request.uid),
          {
            uid: request.uid,
            email: email,
            name: adminName,
            role: "admin",
            schoolId: schoolRef.id,
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );

        // Sync claims via admin API
        try {
          await fetch(getApiUrl("/api/admin/sync-claims"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
              "X-Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
            },
            body: JSON.stringify({ uid: request.uid }),
          });
        } catch (e) {
          console.error("Failed to sync claims", e);
        }
      } else {
        // Fallback or warning if no UID
        try {
          const userResult = await adminCreateUser({
            email: email,
            password: password || "123456",
            displayName: adminName,
            role: "admin",
            schoolId: schoolRef.id,
          });
          if (userResult && userResult.uid) {
            await fetch(getApiUrl("/api/admin/sync-claims"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
                "X-Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
              },
              body: JSON.stringify({ uid: userResult.uid }),
            });
          }
        } catch (e) {
          console.warn("Failed to create fallback auth user", e);
        }
      }

      toast.dismiss(loadingToast);
      toast.success(
        "تم تفعيل المدرسة التفعيل كامل فايربيس (Firebase) وربط الحساب بنجاح",
      );

      // Update request notification to approved
      const source = request._source || "orders";
      try {
        await updateDoc(doc(db, source, request.id), { status: "approved" });
        // Automatically delete it after 10 seconds to keep clean
        setTimeout(async () => {
          await deleteDoc(doc(db, source, request.id)).catch((e) =>
            console.error(e),
          );
        }, 10000);
      } catch (e) {
        // Fallback just delete
        await deleteDoc(doc(db, source, request.id)).catch(console.error);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Approve school request error:", error);
      toast.error(error.message || "حدث خطأ أثناء إجراء التفعيل");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = "users";
    try {
      if (editingUser) {
        await setDoc(
          doc(db, "users", editingUser.id),
          {
            ...newUser,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        toast.success("تم تحديث بيانات المستخدم");
      } else {
        await adminCreateUser({
          email: newUser.email.toLowerCase(),
          displayName: newUser.name,
          role: newUser.role,
          schoolId: newUser.schoolId || "",
          additionalData: {
            permissions: newUser.permissions || [],
          },
        });
        toast.success("تمت إضافة المستخدم بنجاح");
      }
      setShowUserModal(false);
      setEditingUser(null);
      setNewUser({ name: "", email: "", role: "parent", schoolId: "" });
    } catch (error: any) {
      console.error("Add user error:", error);
      toast.error(error.message || "حدث خطأ أثناء المعالجة");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === auth.currentUser?.uid) {
      toast.error("لا يمكنك حذف حسابك الحالي");
      return;
    }

    const loadingToast = toast.loading("جاري حذف المستخدم وكافة بياناته...");
    try {
      // Use Admin API for real Auth deletion
      await adminDeleteUser(userId);
      toast.dismiss(loadingToast);
      toast.success("تم حذف المستخدم بنجاح");
      setUserDeleteConfirmId(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Delete user failed:", error);
      toast.error(error.message || "فشل في حذف المستخدم");
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading("جاري حفظ الباقة...");
    try {
      const pkgData = {
        name: newPackage.name,
        price: Number(
          newPackage.priceYearly !== undefined
            ? newPackage.priceYearly
            : newPackage.price,
        ),
        priceMonthly: Number(
          newPackage.priceMonthly !== undefined
            ? newPackage.priceMonthly
            : Math.round((newPackage.price || 0) / 12),
        ),
        priceYearly: Number(
          newPackage.priceYearly !== undefined
            ? newPackage.priceYearly
            : newPackage.price,
        ),
        maxStudents: Number(newPackage.maxStudents),
        durationDays: Number(newPackage.durationDays),
        showSubscriptionTimer: newPackage.showSubscriptionTimer,
        showInRegistration: newPackage.showInRegistration,
        isPopular: newPackage.isPopular,
        permissions: newPackage.permissions,
        features:
          typeof newPackage.features === "string"
            ? newPackage.features
                .split(",")
                .map((f) => f.trim())
                .filter((f) => f)
            : newPackage.features,
        active: true,
      };

      let apiSuccess = false;
      let apiErrorDetail = "";

      try {
        const token = await auth.currentUser?.getIdToken();
        const method = editingPackage ? "PUT" : "POST";
        const url = editingPackage
          ? getApiUrl(`/api/admin/plans/${encodeURIComponent(editingPackage.id)}`)
          : getApiUrl("/api/admin/plans");

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(pkgData),
        });

        if (response.ok) {
          apiSuccess = true;
        } else {
          try {
            const errRes = await response.json();
            apiErrorDetail =
              errRes.error || errRes.message || `Status: ${response.status}`;
          } catch (e) {
            apiErrorDetail = `Status: ${response.status}`;
          }
          console.warn(
            `API save returned status ${response.status}. Trying direct client-side write...`,
          );
        }
      } catch (apiErr: any) {
        apiErrorDetail = apiErr.message || String(apiErr);
        console.warn(
          "API save threw an error. Trying direct client-side write...",
          apiErr,
        );
      }

      if (!apiSuccess) {
        try {
          // Fallback to direct client-side Firestore write
          if (editingPackage) {
            await setDoc(
              doc(db, "packages", editingPackage.id),
              {
                ...pkgData,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          } else {
            await addDoc(collection(db, "packages"), {
              ...pkgData,
              createdAt: serverTimestamp(),
            });
          }
        } catch (firestoreErr: any) {
          throw new Error(
            `فشل حفظ الباقة عبر الخادم وعبر قاعدة البيانات مباشرة. خطأ الخادم: ${apiErrorDetail}. خطأ قاعدة البيانات: ${firestoreErr.message}`,
          );
        }
      }

      toast.dismiss(loadingToast);
      toast.success(
        editingPackage ? "تم تحديث الباقة بنجاح" : "تمت إضافة الباقة بنجاح",
      );

      setShowPackageModal(false);
      setEditingPackage(null);
      setNewPackage({
        name: "",
        price: 0,
        priceMonthly: 0,
        priceYearly: 0,
        maxStudents: 500,
        features: "",
        durationDays: 365,
        showSubscriptionTimer: true,
        showInRegistration: true,
        isPopular: false,
        permissions: {
          overview: true,
          chat: true,
          students_view: true,
          students_edit: true,
          staff_manage: true,
          attendance_track: true,
          exams_and_results: true,
          student_archive: true,
          tuition_fees: false,
          staff_payroll: false,
          inventory_and_assets: false,
          behavior_management: true,
          student_evaluation_reports: true,
          homework_and_tasks: true,
          classes: true,
          automated_schedules: false,
          announcements: true,
          parent_app_access: true,
          advanced_reports: false,
          marketplace_ordering: true,
          id_card_generation: false,
          assistants_manage: false,
          settings: true,
        },
      });
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message);
    }
  };

  const handleDeletePackage = async (id: string) => {
    const loadingToast = toast.loading("جاري حذف الباقة...");
    try {
      let apiSuccess = false;
      let apiErrorDetail = "";

      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(
          `/api/admin/plans/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "X-Authorization": `Bearer ${token}`
            },
          },
        );

        if (response.ok) {
          apiSuccess = true;
        } else {
          try {
            const errRes = await response.json();
            apiErrorDetail =
              errRes.error || errRes.message || `Status: ${response.status}`;
          } catch (e) {
            apiErrorDetail = `Status: ${response.status}`;
          }
          console.warn(
            `API delete returned status ${response.status}. Trying direct client-side write...`,
          );
        }
      } catch (apiErr: any) {
        apiErrorDetail = apiErr.message || String(apiErr);
        console.warn(
          "API delete threw an error. Trying direct client-side write...",
          apiErr,
        );
      }

      if (!apiSuccess) {
        try {
          // Fallback to direct client-side Firestore delete
          await deleteDoc(doc(db, "packages", id));
        } catch (firestoreErr: any) {
          throw new Error(
            `فشل حذف الباقة عبر الخادم وعبر قاعدة البيانات مباشرة. خطأ الخادم: ${apiErrorDetail}. خطأ قاعدة البيانات: ${firestoreErr.message}`,
          );
        }
      }

      toast.dismiss(loadingToast);
      toast.success("تم حذف الباقة بنجاح");
      setPackageDeleteConfirmId(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || "حدث خطأ أثناء حذف الباقة");
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSchool) {
      try {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + newSchool.durationDays);

        await setDoc(
          doc(db, "schools", editingSchool.id),
          {
            name: newSchool.name,
            address: newSchool.address,
            googleMapsUrl: newSchool.googleMapsUrl,
            governorate: newSchool.governorate,
            directorate: newSchool.directorate,
            stage: newSchool.stage,
            shift: newSchool.shift,
            genderType: newSchool.genderType,
            approximateStudents: newSchool.approximateStudents,
            planId: newSchool.planId,
            subscriptionExpiresAt: expiresAt.toISOString(),
            showSubscriptionTimer: newSchool.showSubscriptionTimer,
            status: "active", // If they are editing, they likely want to activate/keep it active
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        // Trigger claims sync to apply new plan permissions
        const schoolUsers = users.filter(
          (u) => u.schoolId === editingSchool.id && u.role === "admin",
        );
        for (const user of schoolUsers) {
          await fetch(getApiUrl("/api/admin/sync-claims"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
              "X-Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
            },
            body: JSON.stringify({ uid: user.id }),
          });
        }

        toast.success("تم تحديث بيانات المدرسة ومزامنة الصلاحيات");
        setShowAddModal(false);
        setEditingSchool(null);
        setNewSchool({
          name: "",
          address: "",
          governorate: "",
          directorate: "",
          stage: "",
          shift: "",
          genderType: "",
          approximateStudents: "",
          adminName: "",
          adminEmail: "",
          adminPassword: "",
          authUid: "",
          adminPhone: "",
          durationDays: 365,
          showSubscriptionTimer: true,
          planId: "",
        });
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "schools");
        return;
      }
    }

    if (!newSchool.authUid && newSchool.adminPassword.length < 6) {
      toast.error("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
      return;
    }

    const loadingToast = toast.loading("جاري تجهيز المدرسة وحساب المدير...");
    try {
      const email = newSchool.adminEmail.toLowerCase().trim();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newSchool.durationDays);

      // 1. Create School (Firestore)
      const schoolRef = await addDoc(collection(db, "schools"), {
        name: newSchool.name,
        address: newSchool.address,
        googleMapsUrl: newSchool.googleMapsUrl,
        governorate: newSchool.governorate,
        directorate: newSchool.directorate,
        stage: newSchool.stage,
        shift: newSchool.shift,
        genderType: newSchool.genderType,
        approximateStudents: newSchool.approximateStudents,
        status: "active",
        planId: newSchool.planId,
        studentCount: 0, // Initialize student counter
        subscriptionExpiresAt: expiresAt.toISOString(),
        showSubscriptionTimer: newSchool.showSubscriptionTimer,
        adminEmail: email,
        adminPassword: newSchool.adminPassword,
        adminPhone: newSchool.adminPhone,
        createdAt: serverTimestamp(),
      });

      // 2. Create Admin Auth & Profile using Admin API
      const userResult = await adminCreateUser({
        email: email,
        ...(newSchool.adminPassword
          ? { password: newSchool.adminPassword }
          : {}),
        displayName: newSchool.adminName,
        role: "admin",
        schoolId: schoolRef.id,
      });

      // 3. Sync claims immediately for the new admin
      if (userResult && userResult.uid) {
        await fetch(getApiUrl("/api/admin/sync-claims"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
            "X-Authorization": `Bearer ${await auth.currentUser?.getIdToken()}`
          },
          body: JSON.stringify({ uid: userResult.uid }),
        });
      }

      toast.dismiss(loadingToast);
      toast.success("تمت إضافة المدرسة وتفعيل حساب المدير بنجاح");

      // Cleanup request notification if applicable
      if (activeRequestId && activeRequestSource) {
        try {
          await deleteDoc(doc(db, activeRequestSource, activeRequestId));
          setActiveRequestId(null);
          setActiveRequestSource(null);
        } catch (e) {
          console.error("Error deleting request:", e);
        }
      }

      setShowAddModal(false);
      setNewSchool({
        name: "",
        address: "",
        governorate: "",
        directorate: "",
        stage: "",
        shift: "",
        genderType: "",
        approximateStudents: "",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        authUid: "",
        adminPhone: "",
        planId: "",
        durationDays: 365,
        showSubscriptionTimer: true,
      });
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error("Add school/admin error:", error);
      toast.error(error.message || "حدث خطأ أثناء إعداد المدرسة");
    }
  };

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-transparent flex font-sans transition-colors duration-300 print:h-auto print:block"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Sidebar Mockup matching theme */}
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

      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: isRtl ? 300 : -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1, width: isSidebarCollapsed ? 80 : 288 }}
            exit={{ x: isRtl ? 300 : -300, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className={`bg-slate-900 dark:bg-black text-white flex flex-col shrink-0 fixed inset-y-0 ${isRtl ? "right-0 border-l rounded-l-[2rem] lg:rounded-none" : "left-0 border-r rounded-r-[2rem] lg:rounded-none"} z-50 lg:relative border-slate-800 dark:border-slate-800 transition-colors shadow-2xl lg:shadow-none overflow-visible pt-[env(safe-area-inset-top,0px)]`}
          >
            <div className="h-full flex flex-col overflow-hidden w-full">
              <div
                className={`p-6 flex ${isSidebarCollapsed ? "justify-center border-b border-transparent" : "items-center gap-4 border-b border-slate-700 dark:border-slate-800"} pb-6`}
              >
                {config.appLogo && config.appLogo !== "/icon.svg" ? (
                  <img
                    src={config.appLogo || undefined}
                    alt={config.appName}
                    className="w-10 h-10 md:w-12 md:h-12 object-contain rounded-xl bg-white p-1 shrink-0"
                  />
                ) : (
                  <SchoolixLogo size={isSidebarCollapsed ? 38 : 44} />
                )}
                {!isSidebarCollapsed && (
                  <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-lg md:text-xl font-bold font-display tracking-tight leading-none min-w-0"
                  >
                    <span className="truncate block w-full">
                      {t('sidebar_platform_title').replace('{appName}', config.appName)}
                    </span>
                  </motion.h1>
                )}
              </div>
              <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 md:px-4 py-4 space-y-1.5 custom-scrollbar">
                {hasPermission("manage_schools") && (
                  <button
                    onClick={() => {
                      navigateToTab("schools");
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? t('sidebar_schools') : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "schools" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                  >
                    <Building
                      size={isSidebarCollapsed ? 24 : 20}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{t('sidebar_schools')}</span>
                    )}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {t('sidebar_schools')}
                      </div>
                    )}
                  </button>
                )}
                {hasPermission("manage_schools") && (
                  <button
                    onClick={() => {
                      navigateToTab("accounts");
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? t('sidebar_accounts') : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "accounts" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                  >
                    <Lock
                      size={isSidebarCollapsed ? 24 : 20}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{t('sidebar_accounts')}</span>
                    )}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {t('sidebar_accounts')}
                      </div>
                    )}
                  </button>
                )}
                {profile?.role === "superadmin" && (
                  <button
                    onClick={() => {
                      navigateToTab("team");
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={
                      isSidebarCollapsed
                        ? t('sidebar_team')
                        : undefined
                    }
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "team" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                  >
                    <ShieldCheck
                      size={isSidebarCollapsed ? 24 : 20}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{t('sidebar_team')}</span>
                    )}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {t('sidebar_team')}
                      </div>
                    )}
                  </button>
                )}
                {hasPermission("manage_packages") && (
                  <button
                    onClick={() => {
                      navigateToTab("packages");
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? t('sidebar_packages') : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "packages" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                  >
                    <Plus
                      size={isSidebarCollapsed ? 24 : 20}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{t('sidebar_packages')}</span>
                    )}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {t('sidebar_packages')}
                      </div>
                    )}
                  </button>
                )}
                {hasPermission("view_requests") && (
                  <button
                    onClick={() => {
                      navigateToTab("requests");
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? t('sidebar_requests') : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "requests" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                  >
                    <Mail
                      size={isSidebarCollapsed ? 24 : 20}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{t('sidebar_requests')}</span>
                    )}
                    {subscriptionRequests.length > 0 && !isSidebarCollapsed && (
                      <span className="mr-auto bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black animate-pulse">
                        {subscriptionRequests.length}
                      </span>
                    )}
                    {subscriptionRequests.length > 0 && isSidebarCollapsed && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-black animate-pulse border-2 border-slate-900">
                        {subscriptionRequests.length}
                      </span>
                    )}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {t('sidebar_requests')}
                      </div>
                    )}
                  </button>
                )}
                {hasPermission("manage_schools") && (
                  <button
                    onClick={() => {
                      navigateToTab("chat");
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    title={isSidebarCollapsed ? t('sidebar_chat') : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "chat" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                  >
                    <MessageSquare
                      size={isSidebarCollapsed ? 24 : 20}
                      className="shrink-0"
                    />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{t('sidebar_chat')}</span>
                    )}
                    {isSidebarCollapsed && (
                      <div
                        className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                      >
                        {t('sidebar_chat')}
                      </div>
                    )}
                  </button>
                )}
                {hasPermission("manage_users") && (
                  <>
                    <button
                      onClick={() => {
                        navigateToTab("users");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={
                        isSidebarCollapsed ? t('sidebar_users') : undefined
                      }
                      className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "users" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <Users
                        size={isSidebarCollapsed ? 24 : 20}
                        className="shrink-0"
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{t('sidebar_users')}</span>
                      )}
                      {isSidebarCollapsed && (
                        <div
                          className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                        >
                          {t('sidebar_users')}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigateToTab("parents");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? t('sidebar_parents') : undefined}
                      className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "parents" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <Users
                        size={isSidebarCollapsed ? 24 : 20}
                        className="shrink-0"
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{t('sidebar_parents')}</span>
                      )}
                      {isSidebarCollapsed && (
                        <div
                          className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                        >
                          {t('sidebar_parents')}
                        </div>
                      )}
                    </button>
                  </>
                )}
                {hasPermission("system_settings") && (
                  <>
                    <button
                      onClick={() => {
                        navigateToTab("settings");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? t('sidebar_settings') : undefined}
                      className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "settings" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <SettingsIcon
                        size={isSidebarCollapsed ? 24 : 20}
                        className="shrink-0"
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{t('sidebar_settings')}</span>
                      )}
                      {isSidebarCollapsed && (
                        <div
                          className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                        >
                          {t('sidebar_settings')}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigateToTab("footer");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={
                        isSidebarCollapsed
                          ? t('sidebar_footer')
                          : undefined
                      }
                      className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "footer" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <LayoutDashboard
                        size={isSidebarCollapsed ? 24 : 20}
                        className="shrink-0"
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">
                          {t('sidebar_footer')}
                        </span>
                      )}
                      {isSidebarCollapsed && (
                        <div
                          className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                        >
                          {t('sidebar_footer')}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigateToTab("backups");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? t('sidebar_backups') : undefined}
                      className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "backups" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <Save
                        size={isSidebarCollapsed ? 24 : 20}
                        className="shrink-0"
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">{t('sidebar_backups')}</span>
                      )}
                      {isSidebarCollapsed && (
                        <div
                          className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                        >
                          {t('sidebar_backups')}
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        navigateToTab("diagnostics");
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={
                        isSidebarCollapsed
                          ? t('sidebar_diagnostics')
                          : undefined
                      }
                      className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3.5 px-4 md:px-5"} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${activeTab === "diagnostics" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-900"}`}
                    >
                      <Activity
                        size={isSidebarCollapsed ? 24 : 20}
                        className="shrink-0"
                      />
                      {!isSidebarCollapsed && (
                        <span className="truncate">
                          {t('sidebar_diagnostics')}
                        </span>
                      )}
                      {isSidebarCollapsed && (
                        <div
                          className={`absolute ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}
                        >
                          {t('sidebar_diagnostics')}
                        </div>
                      )}
                    </button>
                  </>
                )}
              </nav>
              <div className="p-4 md:p-6 mt-auto">
                {isSidebarCollapsed ? (
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-4 shadow-sm"
                    title={profile?.name}
                  >
                    {profile?.name?.[0]}
                  </div>
                ) : (
                  <div className="bg-slate-800/50 p-4 md:p-5 rounded-2xl md:rounded-[1.5rem] mb-3 md:mb-4 border border-slate-700/50 min-w-0">
                    <p className="text-[9px] text-slate-500 mb-1 uppercase tracking-widest font-bold truncate">
                      {t('sidebar_active_user')}
                    </p>
                    <p className="text-sm font-bold text-white truncate font-display">
                      {profile?.name || "مدير النظام"}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => auth.signOut()}
                  title={isSidebarCollapsed ? t('sidebar_logout') : undefined}
                  className={`w-full flex ${isSidebarCollapsed ? "justify-center px-0" : "items-center gap-3 px-4 md:px-5"} py-3 md:py-4 bg-slate-800 dark:bg-slate-900 rounded-xl md:rounded-2xl text-red-400 hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors shadow-inner font-bold text-sm`}
                >
                  <LogOut
                    size={isSidebarCollapsed ? 24 : 18}
                    className="shrink-0"
                  />
                  {!isSidebarCollapsed && <span>{t('sidebar_logout')}</span>}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-transparent transition-all duration-300 print:overflow-visible print:h-auto print:block">
        <header className="min-h-[5rem] h-auto pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 md:px-8 shrink-0 transition-colors shadow-sm relative z-10 print:hidden">
          <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                  if (!isSidebarOpen) {
                    setIsSidebarCollapsed(false);
                  }
                }
              }}
              className="w-11 h-11 hidden lg:flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all shadow-sm shrink-0"
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
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0 hidden sm:block"></div>
            {activeTab !== "schools" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleBack}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-xs shadow-sm active:scale-95 group shrink-0"
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
                <span className="hidden xs:inline">{t('back')}</span>
              </motion.button>
            )}
            <h2
              id="super-admin-header"
              className="text-sm sm:text-base md:text-xl font-black text-slate-900 dark:text-white font-display tracking-tight hover:text-blue-600 transition-colors cursor-default truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none"
            >
              {t('system_management')}
            </h2>
          </div>
          <div className="flex items-center gap-4 sm:gap-4 md:gap-6 shrink-0">
            <LanguageToggle />
            <ThemeToggle />

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-11 h-11 rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center justify-center relative group active:scale-95 shrink-0 ${
                showNotifications
                  ? "bg-[#D4A64A] border-[#D4A64A] text-[#0B2345] shadow-lg shadow-[#D4A64A]/20"
                  : "bg-[#0B2345] border-[#D4A64A]/30 text-[#D4A64A] hover:bg-[#D4A64A] hover:text-[#0B2345] hover:border-[#D4A64A]"
              }`}
            >
              <Bell size={18} className="transition-transform duration-300 group-hover:scale-110" />
              {notifications.filter((n: any) => !n.read).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-[#0B2345] rounded-full text-[10px] font-black text-white flex items-center justify-center">
                  {notifications.filter((n: any) => !n.read).length > 9 ? '9+' : notifications.filter((n: any) => !n.read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationCenter
                onClose={() => setShowNotifications(false)}
                activeTabSetter={setActiveTab}
                userRole="super_admin"
              />
            )}
            <div className="text-left md:block hidden">
              <p className="text-[10px] text-slate-400 leading-none mb-1 uppercase tracking-widest font-bold">
                {t('system_status')}
              </p>
              <div className="flex items-center gap-2 font-bold text-green-500 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {t('system_status_ok')}
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
                  تأكيد البريد الإلكتروني (Super Admin)
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
                      toast.error("لم يتم التأكيد بعد");
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

        <div
          className={`flex-1 flex flex-col print:overflow-visible min-h-0 ${activeTab === "chat" ? "overflow-hidden h-full pb-20 lg:pb-0" : "overflow-y-auto custom-scrollbar pb-28 lg:pb-10"}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className={
                activeTab === "chat"
                  ? "p-0 h-full w-full flex flex-col min-h-0 overflow-hidden"
                  : "w-full p-4 md:p-8 flex flex-col"
              }
              initial={{ opacity: 0, y: activeTab === "chat" ? 0 : 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: activeTab === "chat" ? 0 : -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {activeTab === "schools" ? (
                <>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 md:mb-8 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group gap-4">
                    <div id="overview-header-group">
                      <h3
                        id="overview-title"
                        className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight group-hover:translate-x-1 transition-transform inline-block"
                      >
                        {t('overview_schools')}
                      </h3>
                      <p
                        id="overview-subtitle"
                        className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-xs sm:text-sm"
                      >
                        {t('overview_subtitle')}
                      </p>
                    </div>
                    <button
                      id="add-school-btn"
                      onClick={() => {
                        setEditingSchool(null);
                        setSchoolModalTab("info");
                        setShowAddModal(true);
                      }}
                      className="mt-2 md:mt-0 w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl hover:bg-blue-600 dark:hover:bg-blue-700 transition-all font-black shadow-2xl shadow-blue-600/20 active:scale-95 group/btn text-sm shrink-0"
                    >
                      <Plus
                        size={18}
                        className="group-hover/btn:rotate-90 transition-transform"
                      />
                      {t('add_new_school')}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                    <AdminStatCard
                      title={t('stat_total_schools')}
                      value={stats.total}
                      hint={t('stat_schools_hint')}
                      color="text-slate-800"
                      onClick={() => setSchoolFilter("all")}
                      isActive={schoolFilter === "all"}
                    />
                    <AdminStatCard
                      title={t('stat_active_schools')}
                      value={stats.active}
                      hint={t('stat_active_hint')}
                      color="text-green-600"
                      onClick={() => setSchoolFilter("active")}
                      isActive={schoolFilter === "active"}
                    />
                    <AdminStatCard
                      title={t('stat_expiring_soon')}
                      value={stats.expiringSoon}
                      hint={t('stat_expiring_hint')}
                      color="text-orange-600"
                      onClick={() => setSchoolFilter("expiring")}
                      isActive={schoolFilter === "expiring"}
                    />
                    <AdminStatCard
                      title={t('stat_total_users')}
                      value={users.length}
                      hint={t('stat_users_hint')}
                      color="text-indigo-600"
                      onClick={() => setActiveTab("users")}
                      isActive={activeTab === "users"}
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden transition-all">
                    <div className="px-6 md:px-8 py-4 md:py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/20 dark:bg-slate-800/20">
                      <div className="flex items-center gap-4">
                        <div className="p-2 md:p-3 bg-blue-600 rounded-xl md:rounded-2xl text-white shadow-lg shadow-blue-600/20">
                          <LayoutGrid size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                            أحدث المدارس المشتركة
                          </h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                            Global Network Nodes & Licenses
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-96 group">
                          <Search
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                            size={18}
                          />
                          <input
                            type="text"
                            placeholder="بحث عن مدرسة باسمها أو العنوان..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-12 pl-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-600 transition-all text-sm font-bold shadow-sm"
                          />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                          <select
                            value={filterGovernorate}
                            onChange={(e) =>
                              setFilterGovernorate(e.target.value)
                            }
                            className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-600 transition-all text-xs font-bold shadow-sm appearance-none min-w-[120px]"
                          >
                            <option value="">كل المحافظات</option>
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
                          <select
                            value={filterDirectorate}
                            onChange={(e) =>
                              setFilterDirectorate(e.target.value)
                            }
                            className="w-full md:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-600 transition-all text-xs font-bold shadow-sm appearance-none min-w-[150px]"
                          >
                            <option value="">كل المديريات</option>
                            <option value="مديرية الكرخ الاولى">
                              مديرية الكرخ الاولى
                            </option>
                            <option value="مديرية الكرخ الثانية">
                              مديرية الكرخ الثانية
                            </option>
                            <option value="مديرية الكرخ الثالثه">
                              مديرية الكرخ الثالثه
                            </option>
                            <option value="مديرية الرصافة الاولى">
                              مديرية الرصافة الاولى
                            </option>
                            <option value="مديرية الرصافة الثانية">
                              مديرية الرصافة الثانية
                            </option>
                            <option value="مديرية الرصافة الثالثه">
                              مديرية الرصافة الثالثه
                            </option>
                            <option value="أخرى / مديرية أخرى">
                              أخرى / مديرية أخرى
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-right border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                          <th className="px-8 py-5 text-right">
                            المدرسة والبيانات
                          </th>
                          <th className="px-6 py-5 text-right">المحافظة</th>
                          <th className="px-6 py-5 text-right">المديرية</th>
                          <th className="px-6 py-5 text-right">المرحلة الدراسية</th>
                          <th className="px-6 py-5 text-right">المواصفات</th>
                          <th className="px-6 py-5 text-right">
                            فترة الاشتراك
                          </th>
                          <th className="px-6 py-5 text-center">
                            الحالة التشغيلية
                          </th>
                          <th className="px-8 py-5 text-center">التحكم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredSchools.map((school) => (
                          <tr
                            key={school.id}
                            className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all"
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                {school.logoUrl ? (
                                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center shadow-lg shadow-blue-500/10 border border-slate-100 dark:border-slate-700 hover:scale-110 transition-transform shrink-0">
                                    <img
                                      src={school.logoUrl}
                                      alt="Logo"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform shrink-0">
                                    <Building size={20} />
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate max-w-[200px]">
                                    {school.name}
                                  </span>
                                  <div className="flex flex-col gap-0.5 mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                      ID: {school.id?.slice(0, 8)}
                                    </span>
                                    {school.governorate && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-bold max-w-[180px]">
                                        {school.governorate}{" "}
                                        {school.directorate
                                          ? ` - ${school.directorate}`
                                          : ""}
                                        {school.stage
                                          ? ` - ${school.stage}`
                                          : ""}
                                        {school.shift
                                          ? ` - ${school.shift}`
                                          : ""}
                                        {school.genderType
                                          ? ` - ${school.genderType}`
                                          : ""}
                                        {school.approximateStudents
                                          ? ` - ${school.approximateStudents} طالب تقريباً`
                                          : ""}
                                      </div>
                                    )}
                                    {school.address && (
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[180px]">
                                        <MapPin
                                          size={10}
                                          className="text-slate-300"
                                        />
                                        {school.address}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 border-r border-slate-100 dark:border-slate-800/50">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {school.governorate || "غير محدد"}
                              </span>
                            </td>
                            <td className="px-6 py-6 border-r border-slate-100 dark:border-slate-800/50">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {school.directorate || "غير محدد"}
                              </span>
                            </td>
                            <td className="px-6 py-6 border-r border-slate-100 dark:border-slate-800/50">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {school.stage || school.educationLevel || "غير محدد"}
                              </span>
                            </td>
                            <td className="px-6 py-6 border-r border-slate-100 dark:border-slate-800/50">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-md border border-blue-100 dark:border-blue-900/40 uppercase tracking-tighter">
                                    {packages.find(
                                      (p) => p.id === school.planId,
                                    )?.name || "BASIC_PLAN"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-20">
                                    <div
                                      className="h-full bg-blue-500 transition-all"
                                      style={{
                                        width: `${Math.min(100, ((school.studentCount || 0) / (packages.find((p) => p.id === school.planId)?.maxStudents || 500)) * 100)}%`,
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 font-mono shrink-0">
                                    {school.studentCount || 0}/
                                    {packages.find(
                                      (p) => p.id === school.planId,
                                    )?.maxStudents || 500}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 font-mono">
                                    {school.createdAt
                                      ?.toDate?.()
                                      ?.toLocaleDateString("ar-IQ")}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                                    تاريخ التسجيل
                                  </span>
                                </div>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>
                                {school.subscriptionExpiresAt ? (
                                  <SubscriptionTimer
                                    expiryDate={school.subscriptionExpiresAt}
                                    variant="compact"
                                  />
                                ) : (
                                  <span className="text-[9px] font-black text-slate-400 italic">
                                    LIFETIME_ACCESS
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-6 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div
                                  className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-2 ${
                                    school.status === "active"
                                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 shadow-[0_0_15px_-5px_rgba(16,185,129,0.2)]"
                                      : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 shadow-[0_0_15px_-5px_rgba(239,68,68,0.2)]"
                                  }`}
                                >
                                  <div className="relative flex items-center justify-center">
                                    <span
                                      className={`absolute w-full h-full rounded-full opacity-50 ${school.status === "active" ? "bg-emerald-400 animate-ping" : ""}`}
                                    ></span>
                                    <span
                                      className={`relative w-2 h-2 rounded-full ${school.status === "active" ? "bg-emerald-500" : "bg-red-500"}`}
                                    ></span>
                                  </div>
                                  {school.status === "active"
                                    ? "System_Online"
                                    : "System_Offline"}
                                </div>
                                <span className="text-[8px] font-mono text-slate-400 group-hover:text-slate-500 transition-colors uppercase tracking-widest">
                                  Latency: Normal
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center justify-center gap-2">
                                {schoolDeleteConfirmId === school.id ? (
                                  <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                                    <button
                                      onClick={() => {
                                        handleDeleteSchool(school.id);
                                        setSchoolDeleteConfirmId(null);
                                      }}
                                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                                    >
                                      تأكيد المسح
                                    </button>
                                    <button
                                      onClick={() =>
                                        setSchoolDeleteConfirmId(null)
                                      }
                                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-[10px] font-black"
                                    >
                                      تراجع
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:border-blue-100 dark:group-hover:border-blue-900/30 transition-all">
                                      <button
                                        onClick={() =>
                                          handleToggleFeatured(
                                            school.id,
                                            school.featured,
                                          )
                                        }
                                        title={
                                          school.featured
                                            ? "إزالة المدرسة من قائمة شركاء النجاح في الصفحة الرئيسية"
                                            : "إضافة المدرسة كشريك نجاح في الصفحة الرئيسية"
                                        }
                                        className={`p-2.5 rounded-xl transition-all ${school.featured ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 shadow-sm border border-amber-200 dark:border-amber-800/50" : "text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-900"}`}
                                      >
                                        <Star
                                          size={16}
                                          fill={
                                            school.featured
                                              ? "currentColor"
                                              : "none"
                                          }
                                        />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleToggleTimer(
                                            school.id,
                                            !!school.showSubscriptionTimer,
                                          )
                                        }
                                        title={
                                          school.showSubscriptionTimer
                                            ? "إخفاء المؤقت عن المدرسة"
                                            : "إظهار المؤقت للمدرسة"
                                        }
                                        className={`p-2.5 rounded-xl transition-all ${school.showSubscriptionTimer ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm border border-slate-100 dark:border-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-900"}`}
                                      >
                                        {school.showSubscriptionTimer ? (
                                          <Eye size={16} />
                                        ) : (
                                          <EyeOff size={16} />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingSchool(school);
                                          setNewSchool({
                                            name: school.name,
                                            address: school.address,
                                            googleMapsUrl: school.googleMapsUrl || "",
                                            governorate:
                                              school.governorate || "",
                                            directorate:
                                              school.directorate || "",
                                            stage: school.stage || "",
                                            shift: school.shift || "",
                                            genderType: school.genderType || "",
                                            approximateStudents:
                                              school.approximateStudents || "",
                                            adminName: school.adminName || "",
                                            adminEmail: school.adminEmail || "",
                                            adminPassword: "",
                                            authUid: "",
                                            adminPhone: school.adminPhone || "",
                                            planId: school.planId || "",
                                            durationDays: 365,
                                            showSubscriptionTimer:
                                              school.showSubscriptionTimer !==
                                              false,
                                          });
                                          setSchoolModalTab("info");
                                          setShowAddModal(true);
                                        }}
                                        className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-all"
                                      >
                                        <SettingsIcon size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleExtendSubscription(
                                            school.id,
                                            school.subscriptionExpiresAt,
                                          )
                                        }
                                        className="p-2.5 text-blue-600 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-all"
                                      >
                                        <Plus size={16} />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleToggleSchoolStatus(
                                          school.id,
                                          school.status,
                                        )
                                      }
                                      className={`p-3 rounded-2xl transition-all ${school.status === "active" ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600 hover:bg-orange-100 transition-all" : "bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100"}`}
                                    >
                                      {school.status === "active" ? (
                                        <XCircle size={18} />
                                      ) : (
                                        <CheckCircle size={18} />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        setSchoolDeleteConfirmId(school.id)
                                      }
                                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              ) : activeTab === "accounts" ? (
                <>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight flex items-center gap-2.5">
                        <ShieldCheck className="text-blue-600 shrink-0" size={24} />
                        حسابات المدارس الرقمية
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 flex items-center gap-1.5 text-xs sm:text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        إدارة بيانات الدخول والمصادقة للأنظمة المدرسية
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start md:self-center shrink-0">
                      <div className="flex flex-col px-4 py-1 text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                          إجمالي الحسابات
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {schools.length}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
                      <div className="flex flex-col px-4 py-1 text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                          نشطة الآن
                        </span>
                        <span className="text-lg font-black text-emerald-600 leading-tight tracking-tighter">
                          {schools.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex-1 relative group">
                      <Search
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                        size={18}
                      />
                      <input
                        type="text"
                        placeholder="ابحث عن مدرسة، بريد إلكتروني، أو رقم هاتف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pr-12 pl-4 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-bold text-sm text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <button className="px-5 py-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10">
                      <Lock size={16} />
                      تأمين كافة الحسابات
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden transition-all">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-5">
                              المدرسة وبيانات التواصل
                            </th>
                            <th className="px-6 py-5">المصادقة والأمان</th>
                            <th className="px-6 py-5">الحالة</th>
                            <th className="px-8 py-5 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {filteredSchools.map((school) => (
                            <tr
                              key={school.id}
                              className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-all"
                            >
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  {school.logoUrl ? (
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1 flex items-center justify-center border border-slate-100 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110 shrink-0">
                                      <img
                                        src={school.logoUrl}
                                        alt="Logo"
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700 shadow-sm transition-transform group-hover:scale-110 shrink-0">
                                      <Building size={20} />
                                    </div>
                                  )}
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight truncate max-w-[200px]">
                                      {school.name}
                                    </span>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        <Mail
                                          size={10}
                                          className="text-slate-300"
                                        />
                                        <span className="truncate max-w-[150px]">
                                          {school.adminEmail || "---"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                        <Phone
                                          size={10}
                                          className="text-slate-300"
                                        />
                                        <span>
                                          {school.adminPhone || "---"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex flex-col gap-2">
                                  <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800 group-hover:border-blue-100 dark:group-hover:border-blue-900/30 transition-colors w-fit">
                                    <PasswordCell
                                      password={school.adminPassword}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                                    ID: {school.id?.slice(0, 8)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                                    نشط
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex justify-center gap-2">
                                  {schoolDeleteConfirmId === school.id ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                      <button
                                        onClick={() => {
                                          handleDeleteSchool(school.id);
                                          setSchoolDeleteConfirmId(null);
                                        }}
                                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                                      >
                                        تأكيد الحذف النهائي
                                      </button>
                                      <button
                                        onClick={() =>
                                          setSchoolDeleteConfirmId(null)
                                        }
                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black active:scale-95 transition-all"
                                      >
                                        تراجع
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <a
                                        href={`mailto:${school.adminEmail}`}
                                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-lg hover:shadow-blue-500/5"
                                        title="إرسال بريد"
                                      >
                                        <Mail size={16} />
                                      </a>
                                      {school.adminPhone && (
                                        <a
                                          href={`https://wa.me/${school.adminPhone.replace(/\s+/g, "")}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-green-600 transition-all border border-slate-200 dark:border-slate-800 hover:border-green-200 dark:hover:border-green-900/50 hover:shadow-lg hover:shadow-green-500/5"
                                          title="واتساب"
                                        >
                                          <Phone size={16} />
                                        </a>
                                      )}
                                      <button
                                        onClick={() =>
                                          setSchoolDeleteConfirmId(school.id)
                                        }
                                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-red-500 transition-all border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900/50 hover:shadow-lg hover:shadow-red-500/5"
                                        title="حذف المدرسة"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {subscriptionRequests.filter(
                    (r) => r.type === "direct_school_signup",
                  ).length > 0 && (
                    <div className="mt-12">
                      <div className="mb-6">
                        <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
                            <Users size={24} />
                          </div>
                          تسجيلات مدرسية بانتظار المراجعة (New Nodes)
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1 opacity-80 pr-12">
                          حسابات تم إنشاؤها عبر بوابات الويب ولم يتم تعيينها
                          لمراكز بيانات مدرسية (تتطلب تفعيل يدوي)
                        </p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-orange-200/50 dark:border-orange-900/20 shadow-xl shadow-orange-500/5 overflow-hidden transition-all">
                        <div className="overflow-x-auto w-full custom-scrollbar">
                          <table className="w-full text-right border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-orange-50/50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest border-b border-orange-100/50 dark:border-orange-900/20">
                              <th className="px-8 py-5">
                                المؤسسة والبيانات الشخصية
                              </th>
                              <th className="px-6 py-5">المصادقة المؤقتة</th>
                              <th className="px-8 py-5 text-center">
                                التحكم بالنظام
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-orange-50/50 dark:divide-orange-900/10">
                            {subscriptionRequests
                              .filter((r) => r.type === "direct_school_signup")
                              .map((req) => (
                                <tr
                                  key={req.id}
                                  className="group hover:bg-orange-50/30 dark:hover:bg-orange-900/5 transition-all"
                                >
                                  <td className="px-8 py-6">
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-slate-900 dark:text-white font-black text-sm tracking-tight truncate max-w-[250px]">
                                        {req.name}
                                      </span>
                                      <div className="flex flex-col gap-0.5 mt-1 font-mono text-[10px]">
                                        <span className="text-slate-500 dark:text-slate-400 lowercase">
                                          {req.email}
                                        </span>
                                        {req.phone && (
                                          <span className="text-slate-400">
                                            {req.phone}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-orange-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-orange-500 animate-ping"></div>
                                        ORPHAN_ACCOUNT
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6">
                                    <div className="inline-flex items-center gap-2 bg-orange-50/30 dark:bg-orange-950 px-3 py-2 rounded-xl border border-orange-100/50 dark:border-orange-900/30 transition-colors">
                                      <PasswordCell password={req.password} />
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 text-center">
                                    <div className="flex justify-center gap-2">
                                      {deleteConfirmId === req.id ? (
                                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-300">
                                          <button
                                            onClick={() =>
                                              handleDeleteRequest(req)
                                            }
                                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black hover:bg-red-700 shadow-lg shadow-red-600/20"
                                          >
                                            مسح البيانات
                                          </button>
                                          <button
                                            onClick={() =>
                                              setDeleteConfirmId(null)
                                            }
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black"
                                          >
                                            إلغاء
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <button
                                            className="px-4 py-2 bg-orange-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all active:scale-95"
                                            onClick={() => {
                                              handleApproveRequest(req);
                                            }}
                                          >
                                            تفعيل وإنشاء المدارس
                                          </button>
                                          <button
                                            onClick={() =>
                                              setDeleteConfirmId(req.id)
                                            }
                                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-red-100 transition-all"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : activeTab === "packages" ? (
                <>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        إدارة باقات الاشتراك
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-xs sm:text-sm">
                        التحكم في خيارات التسجيل المتاحة للمدارس وتخصيص صلاحيات
                        الباقات
                      </p>
                    </div>
                    <button
                      id="add-package-btn"
                      onClick={() => {
                        setEditingPackage(null);
                        setPackageModalTab("general");
                        setShowPackageModal(true);
                      }}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 text-sm shrink-0"
                    >
                      <Plus size={18} />
                      إضافة باقة جديدة
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-3xl text-blue-600">
                            <Package size={24} />
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${pkg.active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                            >
                              {pkg.active ? "نشط" : "متوقف"}
                            </span>
                            {pkg.showInRegistration && (
                              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                متاح للتسجيل
                              </span>
                            )}
                            {pkg.isPopular && (
                              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                موصى به (Popular)
                              </span>
                            )}
                          </div>
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">
                          {pkg.name}
                        </h4>
                        <div className="flex flex-col gap-1.5 mb-6">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-950 dark:text-white">
                              {(pkg.priceYearly !== undefined
                                ? pkg.priceYearly
                                : pkg.price
                              )?.toLocaleString()}{" "}
                              د.ع
                            </span>
                            <span className="text-slate-400 text-xs font-bold">
                              / سنوياً
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                              {(pkg.priceMonthly !== undefined
                                ? pkg.priceMonthly
                                : Math.round((pkg.price || 0) / 12)
                              )?.toLocaleString()}{" "}
                              د.ع
                            </span>
                            <span className="text-slate-400 text-[10px] font-bold">
                              / شهرياً
                            </span>
                          </div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          {pkg.features?.map((f: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm text-slate-600"
                            >
                              <CheckCircle
                                size={14}
                                className="text-green-500"
                              />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-col gap-2">
                          {packageDeleteConfirmId === pkg.id ? (
                            <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-300">
                              <button
                                onClick={() => handleDeletePackage(pkg.id)}
                                className="w-full py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-sm shadow-lg shadow-red-600/20"
                              >
                                تأكيد الحذف النهائي
                              </button>
                              <button
                                onClick={() => setPackageDeleteConfirmId(null)}
                                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  setEditingPackage(pkg);
                                  setPackageModalTab("general");
                                  setNewPackage({
                                    name: pkg.name,
                                    price: pkg.price,
                                    priceMonthly:
                                      pkg.priceMonthly !== undefined
                                        ? pkg.priceMonthly
                                        : Math.round((pkg.price || 0) / 12),
                                    priceYearly:
                                      pkg.priceYearly !== undefined
                                        ? pkg.priceYearly
                                        : pkg.price,
                                    maxStudents: pkg.maxStudents || 500,
                                    features: Array.isArray(pkg.features)
                                      ? pkg.features.join(", ")
                                      : pkg.features,
                                    durationDays: pkg.durationDays || 365,
                                    showSubscriptionTimer:
                                      pkg.showSubscriptionTimer !== false,
                                    showInRegistration:
                                      pkg.showInRegistration !== false,
                                    isPopular: !!pkg.isPopular,
                                    permissions: pkg.permissions || {
                                      overview: true,
                                      chat: true,
                                      students_view: true,
                                      students_edit: true,
                                      staff_manage: true,
                                      attendance_track: true,
                                      exams_and_results: true,
                                      student_archive: true,
                                      tuition_fees: false,
                                      staff_payroll: false,
                                      inventory_and_assets: false,
                                      behavior_management: true,
                                      student_evaluation_reports: true,
                                      homework_and_tasks: true,
                                      classes: true,
                                      automated_schedules: false,
                                      announcements: true,
                                      parent_app_access: true,
                                      advanced_reports: false,
                                      marketplace_ordering: true,
                                      id_card_generation: false,
                                      assistants_manage: false,
                                      settings: true,
                                    },
                                  });
                                  setShowPackageModal(true);
                                }}
                                className="py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all font-sans text-sm flex items-center justify-center gap-2"
                              >
                                <SettingsIcon size={14} />
                                تعديل
                              </button>
                              <button
                                onClick={() =>
                                  setPackageDeleteConfirmId(pkg.id)
                                }
                                className="py-3 bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all font-sans text-sm flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
                              >
                                <Trash2 size={14} />
                                حذف
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : activeTab === "chat" ? (
                <SuperAdminChatTab />
              ) : activeTab === "requests" ? (
                <>
                  <div className="mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        طلبات الاشتراك
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-xs sm:text-sm">
                        طلبات المدارس الجديدة التي تنتظر تفعيل الحساب
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-100 dark:border-blue-800 shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-black text-xs sm:text-sm">
                        {subscriptionRequests.length} طلبات معلقة
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {subscriptionRequests.map((request) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={request.id}
                        className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900/30 group relative"
                      >
                        <div className="flex items-center gap-8 flex-1">
                          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors duration-500">
                            <Building size={32} />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                {request.customerInfo?.name ||
                                  request.schoolName ||
                                  request.adminName}
                              </h4>
                              <span
                                className={`px-3 py-1 ${request.type === "renewal_request" ? "bg-orange-100 text-orange-600 border border-orange-200" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"} text-[10px] font-black rounded-full uppercase tracking-widest`}
                              >
                                {request.type === "renewal_request"
                                  ? "طلب تجديد"
                                  : request.planId || request.packageName}
                              </span>
                              {request.billingCycle && (
                                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-black rounded-full border border-purple-100 dark:border-purple-900/30">
                                  {request.billingCycle === "monthly"
                                    ? "شهرياً"
                                    : "سنوياً"}
                                </span>
                              )}
                              {request.subscriberCode && (
                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full border border-emerald-100 dark:border-emerald-900/30">
                                  رمز: {request.subscriberCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                              <Phone size={14} className="text-slate-400" />
                              <span className="select-all">
                                {request.customerInfo?.phone ||
                                  request.adminPhone ||
                                  request.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                              <Mail size={14} className="text-slate-400" />
                              <span className="lowercase select-all">
                                {request.customerInfo?.email ||
                                  request.adminEmail ||
                                  request.email}
                              </span>
                            </div>
                            {request.price !== undefined && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                <CreditCard
                                  size={14}
                                  className="text-amber-500"
                                />
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {request.price.toLocaleString("ar-IQ")} د.ع
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                              <Lock size={14} className="text-indigo-500" />
                              <PasswordCell
                                password={
                                  request.adminPassword ||
                                  request.password ||
                                  request.customerInfo?.password
                                }
                              />
                            </div>
                            {request.customerInfo?.address && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <MapPin size={14} className="text-slate-400" />
                                <span>{request.customerInfo?.address}</span>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                const planId =
                                  request.planId || request.packageName;
                                const pkg = packages.find(
                                  (p) => p.id === planId || p.name === planId,
                                );
                                if (pkg) {
                                  setViewingPackage(pkg);
                                } else {
                                  toast.error(
                                    "لم يتم العثور على تفاصيل الباقة",
                                  );
                                }
                              }}
                              className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-4 font-black hover:text-blue-700 transition-colors"
                            >
                              <Plus size={12} />
                              تحديد/عرض تفاصيل الباقة المطلوبة
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-300 font-mono italic">
                            تاريخ الطلب:{" "}
                            {request.createdAt
                              ?.toDate?.()
                              ?.toLocaleString("ar-IQ") || "جاري التحميل..."}
                          </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end gap-1 px-8 md:border-r border-slate-100 dark:border-slate-800 h-full justify-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">
                            نوع الطلب
                          </span>
                          <span className="text-slate-900 dark:text-white font-black text-lg tracking-tighter uppercase">
                            {request._source === "subscriptionRequests"
                              ? "اشتراك جديد"
                              : request.type === "renewal_request"
                                ? "تجديد اشتراك"
                                : "طلب مباشر"}
                          </span>
                        </div>

                        <div className="flex gap-4 items-center">
                          {deleteConfirmId === request.id ? (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-2xl border border-red-100 dark:border-red-900/30 animate-in fade-in zoom-in duration-300">
                              <button
                                onClick={() => handleDeleteRequest(request)}
                                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all active:scale-95"
                              >
                                تأكيد الحذف
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (
                                    request._source === "subscriptionRequests"
                                  ) {
                                    if (request.schoolId) {
                                      handleApproveSubscription(request);
                                    } else {
                                      handleApproveRequest(request);
                                    }
                                    return;
                                  }
                                  if (
                                    request.type === "renewal_request" &&
                                    request.schoolId
                                  ) {
                                    const school = schools.find(
                                      (s) => s.id === request.schoolId,
                                    );
                                    if (school) {
                                      handleExtendSubscription(
                                        school.id,
                                        school.subscriptionExpiresAt,
                                      );
                                      handleDeleteRequest(request);
                                      return;
                                    }
                                  }
                                  handleApproveRequest(request);
                                }}
                                className="px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-600 dark:hover:bg-blue-700 transition-all active:scale-90 flex items-center gap-2 shadow-lg shadow-blue-600/10 cursor-pointer relative z-30"
                              >
                                <CheckCircle size={20} />
                                {request._source === "subscriptionRequests" &&
                                request.schoolId
                                  ? "تفعيل فوري"
                                  : request.type === "renewal_request"
                                    ? "تجديد الاشتراك"
                                    : "تفعيل الحساب"}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log("Delete click:", request.id);
                                  setDeleteConfirmId(request.id);
                                }}
                                className="px-6 h-14 bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 rounded-2xl font-black hover:bg-red-600 hover:text-white transition-all duration-300 flex items-center gap-2 border border-red-100 dark:border-red-900/30 cursor-pointer active:scale-95 relative z-30 shadow-sm"
                                title="حذف نهائي"
                              >
                                <XCircle size={20} />
                                <span>إلغاء الطلب</span>
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {subscriptionRequests.length === 0 && (
                      <div className="text-center py-40 text-slate-400 italic">
                        لا يوجد طلبات اشتراك معلقة حالياً
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === "team" ? (
                <>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        فريق عمل المنصة
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-xs sm:text-sm">
                        إدارة حسابات Super Admins والمساعدين التقنيين للمنصة
                      </p>
                    </div>
                    {isMasterAdmin && (
                      <button
                        onClick={() => {
                          setNewUser({
                            name: "",
                            email: "",
                            role: "assistant",
                            schoolId: "",
                          });
                          setShowUserModal(true);
                        }}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 text-sm"
                      >
                        <ShieldCheck size={18} />
                        إضافة عضو فريق
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
                    <AdminStatCard
                      title="المدراء الخارقين"
                      value={
                        users.filter((u) => u.role === "superadmin").length
                      }
                      hint="صلاحية كاملة"
                      color="text-purple-600"
                    />
                    <AdminStatCard
                      title="المساعدين التقنيين"
                      value={
                        users.filter(
                          (u) => u.role === "assistant" && !u.schoolId,
                        ).length
                      }
                      hint="صلاحيات مخصصة"
                      color="text-blue-600"
                    />
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-right border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50/30 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4">العضو</th>
                            <th className="px-6 py-4">البريد الإلكتروني</th>
                            <th className="px-6 py-4">الدور</th>
                          <th className="px-6 py-4">الصلاحيات المخصصة</th>
                          <th className="px-6 py-4">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {users
                          .filter(
                            (u) =>
                              u.role === "superadmin" ||
                              (u.role === "assistant" && !u.schoolId),
                          )
                          .map((user) => (
                            <tr
                              key={user.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 last:border-0 uppercase text-[11px] font-bold"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black">
                                    {user.name?.[0]}
                                  </div>
                                  <div>
                                    <span className="text-slate-900 dark:text-white block font-black text-sm">
                                      {user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      عضو منذ{" "}
                                      {user.createdAt
                                        ? new Date(
                                            user.createdAt.seconds * 1000,
                                          ).toLocaleDateString("ar-IQ")
                                        : "---"}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono tracking-tight lowercase">
                                {user.email}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                    user.role === "superadmin"
                                      ? "bg-purple-100 text-purple-600 border border-purple-200"
                                      : "bg-blue-100 text-blue-600 border border-blue-200"
                                  }`}
                                >
                                  {user.role === "superadmin"
                                    ? "Super Admin (الكل)"
                                    : "System Assistant (مساعد منسق)"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  {user.role === "superadmin" ? (
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[8px]">
                                      وصول مطلق لكافة ميزات النظام
                                    </span>
                                  ) : (
                                    user.permissions?.map((p: string) => (
                                      <span
                                        key={p}
                                        className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[8px] font-black"
                                      >
                                        {SYSTEM_PERMISSIONS[p] || p}
                                      </span>
                                    )) || (
                                      <span className="text-slate-300 text-[9px]">
                                        لا توجد صلاحيات مخصصة
                                      </span>
                                    )
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {MASTER_ADMIN_EMAILS.includes(
                                    user.email?.toLowerCase(),
                                  ) ? (
                                    <div className="text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-1 rounded-lg">
                                      حساب رئيسي محمي
                                    </div>
                                  ) : !isMasterAdmin &&
                                    user.role === "superadmin" ? (
                                    <div className="text-[10px] text-slate-400 font-bold">
                                      لا توجد صلاحية للإدارة
                                    </div>
                                  ) : userDeleteConfirmId === user.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() =>
                                          handleDeleteUser(user.id)
                                        }
                                        className="px-3 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black"
                                      >
                                        تأكيد
                                      </button>
                                      <button
                                        onClick={() =>
                                          setUserDeleteConfirmId(null)
                                        }
                                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-black"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingUser(user);
                                          setNewUser({
                                            name: user.name,
                                            email: user.email,
                                            role: user.role,
                                            schoolId: user.schoolId || "",
                                            permissions: user.permissions || [],
                                          } as any);
                                          setShowUserModal(true);
                                        }}
                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                                      >
                                        <SettingsIcon size={14} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setUserDeleteConfirmId(user.id)
                                        }
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              ) : activeTab === "users" ? (
                <>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        قائمة المستخدمين
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-xs sm:text-sm">
                        إدارة كافة حسابات المنصة
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                      <div className="bg-slate-100 dark:bg-slate-800 p-1 flex items-center rounded-2xl w-full sm:w-auto">
                        <button
                          onClick={() => setUsersTab("management")}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${usersTab === "management" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          إدارة المدارس
                        </button>
                        <button
                          onClick={() => setUsersTab("parents")}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${usersTab === "parents" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          الأهالي
                        </button>
                      </div>
                      {usersTab === "management" && (
                        <button
                          onClick={() => setShowUserModal(true)}
                          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 text-sm"
                        >
                          <Plus size={18} />
                          إضافة مستخدم
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-right border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50/30 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4">المستخدم</th>
                            <th className="px-6 py-4">البريد الإلكتروني</th>
                          {usersTab === "management" ? (
                            <>
                              <th className="px-6 py-4">الصلاحية</th>
                              <th className="px-6 py-4">الإجراءات</th>
                            </>
                          ) : (
                            <>
                              <th className="px-6 py-4">المدرسة المشترك بها</th>
                              <th className="px-6 py-4">الطلاب المرتبطين</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {users
                          .filter((u) =>
                            usersTab === "management"
                              ? u.role !== "parent"
                              : u.role === "parent",
                          )
                          .map((user) => {
                            const userSchool = schools.find(
                              (s) => s.id === user.schoolId,
                            );
                            const userStudents = students.filter(
                              (s) =>
                                user.studentIds?.includes(s.id) ||
                                s.parentIds?.includes(user.id),
                            );
                            return (
                              <tr
                                key={user.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 last:border-0 uppercase text-[11px] font-bold"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-[10px]">
                                      {user.name?.[0]}
                                    </div>
                                    <span className="text-slate-900 dark:text-white">
                                      {user.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono tracking-tight lowercase">
                                  {user.email}
                                </td>

                                {usersTab === "management" ? (
                                  <>
                                    <td className="px-6 py-4">
                                      <div className="space-y-1">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                            user.role === "superadmin"
                                              ? "bg-purple-100 text-purple-600 border border-purple-200"
                                              : user.role === "admin"
                                                ? "bg-blue-100 text-blue-600 border border-blue-200"
                                                : user.role === "teacher"
                                                  ? "bg-indigo-100 text-indigo-600 border border-indigo-200"
                                                  : "bg-green-100 text-green-600 border border-green-200"
                                          }`}
                                        >
                                          {user.role === "superadmin"
                                            ? "Super Admin"
                                            : user.role === "admin"
                                              ? "School Admin"
                                              : user.role === "teacher"
                                                ? "Teacher"
                                                : user.role === "parent"
                                                  ? "Parent"
                                                  : user.role}
                                        </span>
                                        {userSchool && (
                                          <div className="text-[9px] text-slate-400 flex items-center gap-1">
                                            <Building size={10} />
                                            {userSchool.name}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-2">
                                        {userDeleteConfirmId === user.id ? (
                                          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                                            <button
                                              onClick={() =>
                                                handleDeleteUser(user.id)
                                              }
                                              className="px-4 py-2 bg-red-600 text-white text-[9px] font-black rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                                            >
                                              تأكيد الحذف
                                            </button>
                                            <button
                                              onClick={() =>
                                                setUserDeleteConfirmId(null)
                                              }
                                              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                            >
                                              إلغاء
                                            </button>
                                          </div>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => {
                                                setEditingUser(user);
                                                setNewUser({
                                                  name: user.name,
                                                  email: user.email,
                                                  role: user.role,
                                                  schoolId: user.schoolId || "",
                                                });
                                                setShowUserModal(true);
                                              }}
                                              className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all border border-slate-100 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900/30"
                                              title="تعديل المستخدم"
                                            >
                                              <SettingsIcon size={16} />
                                            </button>
                                            <button
                                              onClick={() =>
                                                setUserDeleteConfirmId(user.id)
                                              }
                                              className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-slate-800 hover:border-red-100 dark:hover:border-red-900/20"
                                              title="حذف المستخدم"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-4">
                                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {userSchool ? (
                                          userSchool.name
                                        ) : (
                                          <span className="text-slate-400 text-[10px]">
                                            غير مرتبط
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="space-y-1">
                                        {userStudents.length > 0 ? (
                                          userStudents.map((s) => (
                                            <div
                                              key={s.id}
                                              className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md inline-block mr-1"
                                            >
                                              {s.name}
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-slate-400 text-[10px]">
                                            لا يوجد طلاب بعد
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              ) : activeTab === "parents" ? (
                <>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        قائمة أولياء الأمور
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-xs sm:text-sm">
                        حسابات أولياء الأمور وارتباطاتهم بالمدارس والطلاب
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-right border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50/30 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-6 py-4">ولي الأمر</th>
                            <th className="px-6 py-4">المدرسة المشتركة</th>
                          <th className="px-6 py-4">الطلاب المرتبطين</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {users
                          .filter((u) => u.role === "parent")
                          .map((user) => {
                            const userSchool = schools.find(
                              (s) => s.id === user.schoolId,
                            );
                            const userStudents = students.filter((s) =>
                              s.parentIds?.includes(user.id),
                            );

                            return (
                              <tr
                                key={user.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 last:border-0 text-xs"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black">
                                      {user.name?.[0]}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-900 dark:text-white font-black text-sm whitespace-nowrap">
                                        {user.name}
                                      </span>
                                      <span className="text-slate-500 font-mono tracking-tight lowercase truncate block">
                                        {user.email}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  {userSchool ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex justify-center items-center">
                                        <Building size={16} />
                                      </div>
                                      <span className="text-slate-800 dark:text-slate-200 font-black">
                                        {userSchool.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      --
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    {userStudents.length > 0 ? (
                                      userStudents.map((st) => (
                                        <span
                                          key={st.id}
                                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-800/30 w-max font-bold"
                                        >
                                          {st.name}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-400 italic font-medium">
                                        لاتوجد طلبة
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        {users.filter((u) => u.role === "parent").length ===
                          0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-6 py-10 text-center text-slate-400 italic"
                            >
                              لا يوجد أولياء أمور مسجلين حالياً
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              ) : activeTab === "settings" ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-4xl"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        إعدادات النظام العامة
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-sm">
                        تعديل معلومات التواصل للدعم الفني التي تظهر للمدارس
                        والمديرين
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 md:space-y-8 transition-colors">
                    {/* Platform Name and Logo Section */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                          اسم المنصة
                        </label>
                        <input
                          type="text"
                          value={systemConfig.appName}
                          onChange={(e) =>
                            setSystemConfig({
                              ...systemConfig,
                              appName: e.target.value,
                            })
                          }
                          className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all"
                          placeholder="SchoolixiQ"
                          dir="auto"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                          رابط شعار المنصة (PNG أو JPG)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={systemConfig.appLogo}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                appLogo: e.target.value,
                              })
                            }
                            className="flex-1 px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-mono"
                            placeholder="https://example.com/logo.png"
                            dir="ltr"
                          />
                          <label className="flex items-center justify-center gap-2 px-6 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-2xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-800/50 shrink-0">
                            <Upload size={20} />
                            <span className="hidden sm:inline">رفع صورة</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg"
                              className="hidden"
                              onChange={handleUploadAppLogo}
                            />
                          </label>
                        </div>
                        {systemConfig.appLogo && (
                          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 inline-block">
                            <img
                              src={systemConfig.appLogo}
                              alt="Platform Logo"
                              className="h-16 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Support Phones Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          أرقام هاتف الدعم (WhatsApp)
                        </label>
                        <button
                          onClick={() =>
                            setSystemConfig({
                              ...systemConfig,
                              supportPhones: [
                                ...systemConfig.supportPhones,
                                "",
                              ],
                            })
                          }
                          className="text-blue-600 dark:text-blue-400 text-xs font-black flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> إضافة رقم
                        </button>
                      </div>
                      <div className="space-y-3">
                        {systemConfig.supportPhones.map((phone, idx) => (
                          <div
                            key={idx}
                            className="relative flex items-center gap-2"
                          >
                            <div className="relative flex-1">
                              <Phone
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                size={18}
                              />
                              <input
                                type="text"
                                value={phone}
                                onChange={(e) => {
                                  const newPhones = [
                                    ...systemConfig.supportPhones,
                                  ];
                                  newPhones[idx] = e.target.value;
                                  setSystemConfig({
                                    ...systemConfig,
                                    supportPhones: newPhones,
                                  });
                                }}
                                className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-mono"
                                placeholder="+964 7XX XXX XXXX"
                                dir="ltr"
                              />
                            </div>
                            {systemConfig.supportPhones.length > 1 && (
                              <button
                                onClick={() =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    supportPhones:
                                      systemConfig.supportPhones.filter(
                                        (_, i) => i !== idx,
                                      ),
                                  })
                                }
                                className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Support Emails Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          عناوين البريد الإلكتروني للدعم
                        </label>
                        <button
                          onClick={() =>
                            setSystemConfig({
                              ...systemConfig,
                              supportEmails: [
                                ...systemConfig.supportEmails,
                                "",
                              ],
                            })
                          }
                          className="text-blue-600 dark:text-blue-400 text-xs font-black flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> إضافة بريد
                        </button>
                      </div>
                      <div className="space-y-3">
                        {systemConfig.supportEmails.map((email, idx) => (
                          <div
                            key={idx}
                            className="relative flex items-center gap-2"
                          >
                            <div className="relative flex-1">
                              <Mail
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                size={18}
                              />
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                  const newEmails = [
                                    ...systemConfig.supportEmails,
                                  ];
                                  newEmails[idx] = e.target.value;
                                  setSystemConfig({
                                    ...systemConfig,
                                    supportEmails: newEmails,
                                  });
                                }}
                                className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-mono"
                                placeholder="support@example.com"
                                dir="ltr"
                              />
                            </div>
                            {systemConfig.supportEmails.length > 1 && (
                              <button
                                onClick={() =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    supportEmails:
                                      systemConfig.supportEmails.filter(
                                        (_, i) => i !== idx,
                                      ),
                                  })
                                }
                                className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleUpdateConfig}
                      disabled={isSavingConfig}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={20} />
                      {isSavingConfig ? "جاري الحفظ..." : "حفظ الإعدادات"}
                    </button>
                  </div>
                </motion.div>
              ) : activeTab === "footer" ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-4xl"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                        إعدادات الفوتر
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 opacity-80 text-sm">
                        إدارة شركاء النجاح في الفوتر الموحد للمنصة
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 md:space-y-8 transition-colors">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          شركاء النجاح
                        </label>
                        <button
                          onClick={() =>
                            setSystemConfig({
                              ...systemConfig,
                              successPartners: [
                                ...systemConfig.successPartners,
                                { name: "", logoUrl: "" },
                              ],
                            })
                          }
                          className="text-blue-600 dark:text-blue-400 text-xs font-black flex items-center gap-1 hover:underline"
                        >
                          <Plus size={14} /> إضافة شريك
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {systemConfig.successPartners.map((partner, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 relative"
                          >
                            {systemConfig.successPartners.length > 0 && (
                              <button
                                onClick={() =>
                                  setSystemConfig({
                                    ...systemConfig,
                                    successPartners:
                                      systemConfig.successPartners.filter(
                                        (_, i) => i !== idx,
                                      ),
                                  })
                                }
                                className="absolute top-2 left-2 p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-2">
                                اسم الشريك
                              </label>
                              <input
                                type="text"
                                value={partner.name}
                                onChange={(e) => {
                                  const newPartners = [
                                    ...systemConfig.successPartners,
                                  ];
                                  newPartners[idx].name = e.target.value;
                                  setSystemConfig({
                                    ...systemConfig,
                                    successPartners: newPartners,
                                  });
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                                placeholder="اسم الشريك"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-2">
                                رابط الشعار (صورة)
                              </label>
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="url"
                                    value={partner.logoUrl}
                                    onChange={(e) => {
                                      const newPartners = [
                                        ...systemConfig.successPartners,
                                      ];
                                      newPartners[idx].logoUrl = e.target.value;
                                      setSystemConfig({
                                        ...systemConfig,
                                        successPartners: newPartners,
                                      });
                                    }}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-blue-500 transition-all text-sm"
                                    placeholder="https://example.com/logo.png"
                                    dir="ltr"
                                  />
                                  <div className="absolute left-2 top-1.5 bottom-1.5 flex items-center gap-1">
                                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                      <Upload size={14} /> رفع
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                          handleUploadPartnerLogo(e, idx)
                                        }
                                      />
                                    </label>
                                  </div>
                                </div>
                                {partner.logoUrl && (
                                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 p-1">
                                    <img
                                      src={partner.logoUrl || undefined}
                                      alt="prev"
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) =>
                                        (e.currentTarget.style.display = "none")
                                      }
                                      onLoad={(e) =>
                                        (e.currentTarget.style.display =
                                          "block")
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {systemConfig.successPartners.length === 0 && (
                          <div className="col-span-full py-8 text-center text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                            لا يوجد شركاء نجاح. اضغط على 'إضافة شريك' للبدء.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Social Links Section */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          روابط وسائل التواصل الاجتماعي للفوتر
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                            Instagram Link
                          </label>
                          <input
                            type="url"
                            value={systemConfig.socialLinks?.instagram || ""}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                socialLinks: {
                                  ...systemConfig.socialLinks,
                                  instagram: e.target.value,
                                },
                              })
                            }
                            placeholder="https://instagram.com/..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 transition-all"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                            Twitter (X) Link
                          </label>
                          <input
                            type="url"
                            value={systemConfig.socialLinks?.twitter || ""}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                socialLinks: {
                                  ...systemConfig.socialLinks,
                                  twitter: e.target.value,
                                },
                              })
                            }
                            placeholder="https://twitter.com/..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 transition-all"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                            LinkedIn Link
                          </label>
                          <input
                            type="url"
                            value={systemConfig.socialLinks?.linkedin || ""}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                socialLinks: {
                                  ...systemConfig.socialLinks,
                                  linkedin: e.target.value,
                                },
                              })
                            }
                            placeholder="https://linkedin.com/..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 transition-all"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">
                            WhatsApp Link
                          </label>
                          <input
                            type="url"
                            value={systemConfig.socialLinks?.whatsapp || ""}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                socialLinks: {
                                  ...systemConfig.socialLinks,
                                  whatsapp: e.target.value,
                                },
                              })
                            }
                            placeholder="https://wa.me/..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:border-blue-500 transition-all"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Marketing Landing Section Config */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6">
                      <div>
                        <h4 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                          <Sparkles size={18} className="text-blue-500" />
                          الواجهة التعريفية والتسويقية للمنصة (Landing Section)
                        </h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">
                          تخصيص العبارات الرنانة والمميزات التي تظهر للزوار
                          وأولياء الأمور بالصفحة الرئيسية لزيادة التسجيل والتحول
                          الرقمي
                        </p>
                      </div>

                      {/* Banners Control Section */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center justify-between px-1">
                          <label className="block text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            الواجهة الإعلانية الرئيسية صور العرض (Banners)
                          </label>
                          <button
                            onClick={() => {
                              const currentBanners =
                                systemConfig.promotionalBanners || [];
                              setSystemConfig({
                                ...systemConfig,
                                promotionalBanners: [
                                  ...currentBanners,
                                  {
                                    id: `banner-${Date.now()}`,
                                    imageUrl: "",
                                    active: true,
                                    link: "",
                                  },
                                ],
                              });
                            }}
                            className="text-blue-600 dark:text-blue-400 text-xs font-black flex items-center gap-1 hover:underline"
                          >
                            <Plus size={14} /> إضافة لافته عرض (Banner)
                          </button>
                        </div>

                        <div className="space-y-4">
                          {(systemConfig.promotionalBanners || []).map(
                            (banner, idx) => (
                              <div
                                key={banner.id || idx}
                                className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800/50 flex flex-col md:flex-row gap-4"
                              >
                                <div className="flex-1 space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                                      بانر إعلاني {idx + 1}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const currentBanners =
                                          systemConfig.promotionalBanners || [];
                                        setSystemConfig({
                                          ...systemConfig,
                                          promotionalBanners:
                                            currentBanners.filter(
                                              (_, i) => i !== idx,
                                            ),
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700 p-1 text-xs font-black transition-colors"
                                    >
                                      حذف
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                        رابط الصورة الإعلانية (عالية الجودة،
                                        أفقية العرض)
                                      </label>
                                      <input
                                        type="url"
                                        required
                                        value={banner.imageUrl}
                                        onChange={(e) => {
                                          const currentBanners = [
                                            ...(systemConfig.promotionalBanners ||
                                              []),
                                          ];
                                          currentBanners[idx] = {
                                            ...currentBanners[idx],
                                            imageUrl: e.target.value,
                                          };
                                          setSystemConfig({
                                            ...systemConfig,
                                            promotionalBanners: currentBanners,
                                          });
                                        }}
                                        placeholder="https://example.com/promotion.jpg"
                                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-905 dark:text-white font-bold outline-none focus:border-blue-500"
                                        dir="ltr"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                        الرابط الموجه عند النقر (اختياري)
                                      </label>
                                      <input
                                        type="url"
                                        value={banner.link || ""}
                                        onChange={(e) => {
                                          const currentBanners = [
                                            ...(systemConfig.promotionalBanners ||
                                              []),
                                          ];
                                          currentBanners[idx] = {
                                            ...currentBanners[idx],
                                            link: e.target.value,
                                          };
                                          setSystemConfig({
                                            ...systemConfig,
                                            promotionalBanners: currentBanners,
                                          });
                                        }}
                                        placeholder="https://wa.me/..."
                                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-905 dark:text-white font-bold outline-none focus:border-blue-500"
                                        dir="ltr"
                                      />
                                    </div>
                                    <div className="pt-2">
                                      <label className="flex items-center gap-2 cursor-pointer w-max">
                                        <input
                                          type="checkbox"
                                          checked={banner.active}
                                          onChange={(e) => {
                                            const currentBanners = [
                                              ...(systemConfig.promotionalBanners ||
                                                []),
                                            ];
                                            currentBanners[idx] = {
                                              ...currentBanners[idx],
                                              active: e.target.checked,
                                            };
                                            setSystemConfig({
                                              ...systemConfig,
                                              promotionalBanners:
                                                currentBanners,
                                            });
                                          }}
                                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 transition-all cursor-pointer"
                                        />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                                          تفعيل النشر (يظهر للزائر)
                                        </span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                {banner.imageUrl && (
                                  <div className="w-full md:w-64 h-32 md:h-full min-h-[120px] rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 self-center">
                                    <img
                                      src={banner.imageUrl}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src =
                                          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTQ5NzlkIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48L3N2Zz4=";
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                          {(systemConfig.promotionalBanners || []).length ===
                            0 && (
                            <div className="col-span-full py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                              لا توجد واجهات عرض إعلانية مضافة حالياً.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                            عنوان الحملة التسويقية الرئيسي
                          </label>
                          <input
                            type="text"
                            value={systemConfig.marketingTitle}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                marketingTitle: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all"
                            placeholder="مثال: منصة الإدارة والتحصيل الذكي لمدارس العراق الأهلية"
                            dir="auto"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                            الوصف التسويقي الفرعي
                          </label>
                          <textarea
                            value={systemConfig.marketingSubtitle}
                            onChange={(e) =>
                              setSystemConfig({
                                ...systemConfig,
                                marketingSubtitle: e.target.value,
                              })
                            }
                            rows={3}
                            className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all resize-none"
                            placeholder="مثال: نظام متكامل يربط الإدارة والمعلمين وأولياء الأمور لتسهيل سداد الرسوم..."
                            dir="auto"
                          />
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between px-1">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              الخدمات والمميزات الخاصة بالمنصة
                            </label>
                            <button
                              onClick={() => {
                                const currentFeatures =
                                  systemConfig.marketingFeatures || [];
                                setSystemConfig({
                                  ...systemConfig,
                                  marketingFeatures: [
                                    ...currentFeatures,
                                    { title: "", description: "" },
                                  ],
                                });
                              }}
                              className="text-blue-600 dark:text-blue-400 text-xs font-black flex items-center gap-1 hover:underline"
                            >
                              <Plus size={14} /> إضافة ميزة تسويقية
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(systemConfig.marketingFeatures || []).map(
                              (feat, idx) => (
                                <div
                                  key={idx}
                                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800/50 space-y-3 relative"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                                      العنصر رقم {idx + 1}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const currentFeatures =
                                          systemConfig.marketingFeatures || [];
                                        setSystemConfig({
                                          ...systemConfig,
                                          marketingFeatures:
                                            currentFeatures.filter(
                                              (_, i) => i !== idx,
                                            ),
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700 p-1 text-xs font-black transition-colors"
                                    >
                                      حذف
                                    </button>
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      required
                                      value={feat.title}
                                      onChange={(e) => {
                                        const currentFeatures = [
                                          ...(systemConfig.marketingFeatures ||
                                            []),
                                        ];
                                        currentFeatures[idx] = {
                                          ...currentFeatures[idx],
                                          title: e.target.value,
                                        };
                                        setSystemConfig({
                                          ...systemConfig,
                                          marketingFeatures: currentFeatures,
                                        });
                                      }}
                                      placeholder="عنوان الميزة (مثال: متابعة ذكية للأقساط)"
                                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-905 dark:text-white font-bold outline-none focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <textarea
                                      required
                                      value={feat.description}
                                      onChange={(e) => {
                                        const currentFeatures = [
                                          ...(systemConfig.marketingFeatures ||
                                            []),
                                        ];
                                        currentFeatures[idx] = {
                                          ...currentFeatures[idx],
                                          description: e.target.value,
                                        };
                                        setSystemConfig({
                                          ...systemConfig,
                                          marketingFeatures: currentFeatures,
                                        });
                                      }}
                                      placeholder="شرح مبسط لكيفية عمل الميزة لـ ولي الأمر أو المدرسة..."
                                      rows={2}
                                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-905 dark:text-white font-medium outline-none resize-none focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              ),
                            )}
                            {(systemConfig.marketingFeatures || []).length ===
                              0 && (
                              <div className="col-span-full py-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                سيتم استخدام المميزات الافتراضية إذا
                                تُرِك هذا الحقل فارغاً. اضغط على 'إضافة ميزة
                                تسويقية' للبدء.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleUpdateConfig}
                      disabled={isSavingConfig}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                    >
                      <Save size={20} />
                      {isSavingConfig ? "جاري الحفظ..." : "حفظ الإعدادات"}
                    </button>
                  </div>
                </motion.div>
              ) : activeTab === "backups" ? (
                <SuperAdminBackupsTab />
              ) : activeTab === "diagnostics" ? (
                <SuperAdminDiagnostics />
              ) : null}
            </motion.div>
          </AnimatePresence>
          {activeTab !== "chat" && <GlobalFooter compact />}
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    {editingSchool
                      ? "تعديل بيانات المدرسة"
                      : "إضافة مدرسة جديدة"}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">
                    تجهيز بيئة عمل جديدة لإحدى المؤسسات التعليمية
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Building size={24} />
                </div>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setSchoolModalTab("info")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                    schoolModalTab === "info"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-600"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                  }`}
                >
                  معلومات المدرسة
                </button>
                <button
                  type="button"
                  onClick={() => setSchoolModalTab("subscription")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                    schoolModalTab === "subscription"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-600"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                  }`}
                >
                  الاشتراك والباقة
                </button>
                {!editingSchool && (
                  <button
                    type="button"
                    onClick={() => setSchoolModalTab("admin")}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                      schoolModalTab === "admin"
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-600"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                    }`}
                  >
                    حساب المدير
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-2">
              <form
                onSubmit={handleAddSchool}
                id="school-form"
                className="space-y-6"
              >
                {schoolModalTab === "info" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        اسم المؤسسة التعليمية
                      </label>
                      <div className="relative">
                        <Building
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          required
                          type="text"
                          value={newSchool.name}
                          onChange={(e) =>
                            setNewSchool({ ...newSchool, name: e.target.value })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-display"
                          placeholder="مثال: مدرسة النخبة النموذجية"
                        />
                      </div>
                    </div>
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
                          value={newSchool.governorate}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              governorate: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all appearance-none"
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
                          value={newSchool.directorate}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              directorate: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all appearance-none"
                        >
                          <option value="" disabled>
                            اختر المديرية...
                          </option>
                          <option value="مديرية الكرخ الاولى">
                            مديرية الكرخ الاولى
                          </option>
                          <option value="مديرية الكرخ الثانية">
                            مديرية الكرخ الثانية
                          </option>
                          <option value="مديرية الكرخ الثالثه">
                            مديرية الكرخ الثالثه
                          </option>
                          <option value="مديرية الرصافة الاولى">
                            مديرية الرصافة الاولى
                          </option>
                          <option value="مديرية الرصافة الثانية">
                            مديرية الرصافة الثانية
                          </option>
                          <option value="مديرية الرصافة الثالثه">
                            مديرية الرصافة الثالثه
                          </option>
                          <option value="أخرى / مديرية أخرى">
                            أخرى / مديرية أخرى
                          </option>
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
                          value={newSchool.stage}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              stage: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all appearance-none"
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
                        <Building
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={newSchool.shift}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              shift: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all appearance-none"
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
                        <Building
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <select
                          required
                          value={newSchool.genderType}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              genderType: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all appearance-none"
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
                        العدد التقريبي للطلاب
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={newSchool.approximateStudents}
                        onChange={(e) =>
                          setNewSchool({
                            ...newSchool,
                            approximateStudents: e.target.value,
                          })
                        }
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-mono placeholder:font-sans placeholder:font-medium text-right"
                        placeholder="مثال: 500"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        العنوان التفصيلي (المنطقة / الشارع)
                      </label>
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          required
                          type="text"
                          value={newSchool.address}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              address: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all"
                          placeholder="تكملة العنوان"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        رابط الموقع الجغرافي للمدرسة (Google Maps)
                      </label>
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="url"
                          value={newSchool.googleMapsUrl}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              googleMapsUrl: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-mono"
                          placeholder="https://maps.google.com/..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {schoolModalTab === "subscription" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        اختر باقة الاشتراك
                      </label>
                      <div className="relative">
                        <ShieldCheck
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <select
                          required
                          value={newSchool.planId}
                          onChange={(e) => {
                            const selectedPlan = packages.find(
                              (p) => p.id === e.target.value,
                            );
                            if (selectedPlan) {
                              setNewSchool({
                                ...newSchool,
                                planId: e.target.value,
                                durationDays: selectedPlan.durationDays || 365,
                                showSubscriptionTimer:
                                  selectedPlan.showSubscriptionTimer !== false,
                              });
                            } else {
                              setNewSchool({
                                ...newSchool,
                                planId: e.target.value,
                              });
                            }
                          }}
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">-- اضغط لاختيار باقة --</option>
                          {packages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.price.toLocaleString()} د.ع /{" "}
                              {p.durationDays} يوم)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                          مدة الاشتراك (يوم)
                        </label>
                        <input
                          required
                          type="number"
                          value={
                            Number.isNaN(newSchool.durationDays)
                              ? ""
                              : newSchool.durationDays
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewSchool({
                              ...newSchool,
                              durationDays: val === "" ? 0 : parseInt(val) || 0,
                            });
                          }}
                          className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all"
                          min="1"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                            إظهار التايمر للمدرسة
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewSchool({
                                ...newSchool,
                                showSubscriptionTimer:
                                  !newSchool.showSubscriptionTimer,
                              })
                            }
                            className={`w-10 h-5 rounded-full transition-all relative ${newSchool.showSubscriptionTimer ? "bg-blue-600" : "bg-slate-300"}`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${newSchool.showSubscriptionTimer ? "left-5.5" : "left-0.5"}`}
                            ></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {schoolModalTab === "admin" && !editingSchool && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 mb-2">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 leading-relaxed">
                        <ShieldCheck size={16} className="shrink-0" />
                        سيتم إنشاء حساب مدير بصلاحية "Admin" لهذه المدرسة فور
                        الحفظ، ليتمكنوا من البدء فوراً.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        اسم مدير النظام
                      </label>
                      <input
                        required
                        type="text"
                        value={newSchool.adminName}
                        onChange={(e) =>
                          setNewSchool({
                            ...newSchool,
                            adminName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all placeholder:font-medium"
                        placeholder="الاسم الثلاثي للمدير"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        البريد الإلكتروني للدخول
                      </label>
                      <input
                        required
                        type="email"
                        value={newSchool.adminEmail}
                        onChange={(e) =>
                          setNewSchool({
                            ...newSchool,
                            adminEmail: e.target.value,
                          })
                        }
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-mono placeholder:font-sans placeholder:font-medium"
                        placeholder="admin@school.com"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        رقم الهاتف
                      </label>
                      <div className="relative">
                        <Phone
                          size={18}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          required
                          type="tel"
                          value={newSchool.adminPhone}
                          onChange={(e) =>
                            setNewSchool({
                              ...newSchool,
                              adminPhone: e.target.value,
                            })
                          }
                          className="w-full pr-12 pl-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all"
                          placeholder="077XXXXXXXX"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest px-1">
                        كلمة المرور المؤقتة
                      </label>
                      <input
                        required={!newSchool.authUid}
                        type="password"
                        value={newSchool.adminPassword}
                        onChange={(e) =>
                          setNewSchool({
                            ...newSchool,
                            adminPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all"
                        placeholder={
                          newSchool.authUid
                            ? "اتركه فارغاً للاحتفاظ بكلمة مرور حساب الطالب"
                            : "6 أحرف على الأقل"
                        }
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex gap-4">
                <button
                  type="submit"
                  form="school-form"
                  className="flex-1 px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/10 active:scale-95"
                >
                  {editingSchool ? "حفظ التعديلات" : "تأكيد إنشاء المدرسة"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSchool(null);
                    setActiveRequestId(null);
                    setNewSchool({
                      name: "",
                      address: "",
                      governorate: "",
                      directorate: "",
                      stage: "",
                      shift: "",
                      genderType: "",
                      approximateStudents: "",
                      adminName: "",
                      adminEmail: "",
                      adminPassword: "",
                      authUid: "",
                      adminPhone: "",
                      planId: "",
                      durationDays: 365,
                      showSubscriptionTimer: true,
                    });
                  }}
                  className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPackageModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[90vh]">
            <div className="p-8 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                    {editingPackage
                      ? "تعديل باقة اشتراك"
                      : "إضافة باقة اشتراك جديدة"}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mt-1">
                    تحديد الميزات والقيود والأسعار لكل فئة
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ShieldCheck size={24} />
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setPackageModalTab("general")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                    packageModalTab === "general"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-600"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                  }`}
                >
                  المعلومات والقيود
                </button>
                <button
                  type="button"
                  onClick={() => setPackageModalTab("permissions")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                    packageModalTab === "permissions"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-600"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                  }`}
                >
                  الصلاحيات المتاحة
                </button>
                <button
                  type="button"
                  onClick={() => setPackageModalTab("features")}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                    packageModalTab === "features"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-600"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
                  }`}
                >
                  ميزات التسويق
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-2">
              <form
                onSubmit={handleAddPackage}
                id="package-form"
                className="space-y-8"
              >
                {packageModalTab === "general" && (
                  <>
                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-50 dark:border-blue-900/30 pb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        المعلومات الأساسية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                            اسم الباقة
                          </label>
                          <input
                            required
                            type="text"
                            value={newPackage.name}
                            onChange={(e) =>
                              setNewPackage({
                                ...newPackage,
                                name: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-bold"
                            placeholder="مثال: الباقة الماسية"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                            السعر السنوي (د.ع / سنوياً)
                          </label>
                          <input
                            required
                            type="number"
                            value={
                              Number.isNaN(newPackage.priceYearly)
                                ? ""
                                : newPackage.priceYearly ||
                                  newPackage.price ||
                                  ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = val === "" ? 0 : Number(val) || 0;
                              setNewPackage({
                                ...newPackage,
                                priceYearly: numVal,
                                price: numVal, // set fallback legacy price
                              });
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-bold"
                            placeholder="مثال: 1200000"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                            السعر الشهري (د.ع / شهرياً)
                          </label>
                          <input
                            required
                            type="number"
                            value={
                              Number.isNaN(newPackage.priceMonthly)
                                ? ""
                                : newPackage.priceMonthly !== undefined &&
                                    newPackage.priceMonthly !== 0
                                  ? newPackage.priceMonthly
                                  : Math.round((newPackage.price || 0) / 12) ||
                                    ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = val === "" ? 0 : Number(val) || 0;
                              setNewPackage({
                                ...newPackage,
                                priceMonthly: numVal,
                              });
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-bold"
                            placeholder="مثال: 100000"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Constraints & Duration */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-50 dark:border-blue-900/30 pb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                        القيود والمدة الزمنية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                            حد الطلاب الأقصى
                          </label>
                          <div className="relative">
                            <input
                              required
                              type="number"
                              value={
                                Number.isNaN(newPackage.maxStudents)
                                  ? ""
                                  : newPackage.maxStudents
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewPackage({
                                  ...newPackage,
                                  maxStudents:
                                    val === "" ? 0 : Number(val) || 0,
                                });
                              }}
                              className="w-full pr-4 pl-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-bold"
                            />
                            <Users
                              size={16}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                            مدة الاشتراك (يوم)
                          </label>
                          <input
                            required
                            type="number"
                            value={
                              Number.isNaN(newPackage.durationDays)
                                ? ""
                                : newPackage.durationDays
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewPackage({
                                ...newPackage,
                                durationDays: val === "" ? 0 : Number(val) || 0,
                              });
                            }}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all font-bold"
                          />
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 md:col-span-2">
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                            إظهار التايمر للمدرسة
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewPackage({
                                ...newPackage,
                                showSubscriptionTimer:
                                  !newPackage.showSubscriptionTimer,
                              })
                            }
                            className={`w-10 h-5 rounded-full transition-all relative ${newPackage.showSubscriptionTimer ? "bg-blue-600" : "bg-slate-300"}`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${newPackage.showSubscriptionTimer ? "left-5.5" : "left-0.5"}`}
                            ></div>
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 md:col-span-1">
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                            ظهور عند التسجيل
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewPackage({
                                ...newPackage,
                                showInRegistration:
                                  !newPackage.showInRegistration,
                              })
                            }
                            className={`w-10 h-5 rounded-full transition-all relative ${newPackage.showInRegistration ? "bg-blue-600" : "bg-slate-300"}`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${newPackage.showInRegistration ? "left-5.5" : "left-0.5"}`}
                            ></div>
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 md:col-span-1">
                          <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase">
                            باقة مميزة (Popular)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setNewPackage({
                                ...newPackage,
                                isPopular: !newPackage.isPopular,
                              })
                            }
                            className={`w-10 h-5 rounded-full transition-all relative ${newPackage.isPopular ? "bg-amber-500" : "bg-slate-300"}`}
                          >
                            <div
                              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${newPackage.isPopular ? "left-5.5" : "left-0.5"}`}
                            ></div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {packageModalTab === "permissions" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-50 dark:border-blue-900/30 pb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      الموديولات المتاحة (الصلاحيات)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                      {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={
                                (newPackage.permissions as any)?.[key] || false
                              }
                              onChange={(e) =>
                                setNewPackage({
                                  ...newPackage,
                                  permissions: {
                                    ...(newPackage.permissions || {}),
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all"></div>
                            <CheckCircle
                              size={14}
                              className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                            />
                          </div>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {packageModalTab === "features" && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest border-b border-blue-50 dark:border-blue-900/30 pb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                      ميزات التسويق
                    </h3>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">
                        قائمة الميزات (افصل بفاصلة)
                      </label>
                      <textarea
                        value={newPackage.features}
                        onChange={(e) =>
                          setNewPackage({
                            ...newPackage,
                            features: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all h-40 resize-none text-sm font-medium"
                        placeholder="مثال: دعم فني VIP, تطبيق للهواتف, لوحة تحكم متقدمة..."
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex gap-4">
                <button
                  type="submit"
                  form="package-form"
                  className="flex-1 px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/10 active:scale-95"
                >
                  {editingPackage ? "حفظ التعديلات" : "إنشاء الباقة"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPackageModal(false);
                    setEditingPackage(null);
                    setNewPackage({
                      name: "",
                      price: 0,
                      maxStudents: 500,
                      features: "",
                      durationDays: 365,
                      showSubscriptionTimer: true,
                      showInRegistration: true,
                      isPopular: false,
                      permissions: {
                        overview: true,
                        chat: true,
                        students_view: true,
                        students_edit: true,
                        staff_manage: true,
                        attendance_track: true,
                        exams_and_results: true,
                        student_archive: true,
                        tuition_fees: false,
                        staff_payroll: false,
                        inventory_and_assets: false,
                        behavior_management: true,
                        student_evaluation_reports: true,
                        homework_and_tasks: true,
                        classes: true,
                        automated_schedules: false,
                        announcements: true,
                        parent_app_access: true,
                        advanced_reports: false,
                        marketplace_ordering: true,
                        id_card_generation: false,
                        assistants_manage: false,
                        settings: true,
                      },
                    });
                  }}
                  className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative border border-slate-200 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              {editingUser ? "تعديل مستخدم" : "إضافة مستخدم جديد"}
            </h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                  الاسم الكامل
                </label>
                <input
                  required
                  type="text"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                  البريد الإلكتروني
                </label>
                <input
                  required
                  type="email"
                  disabled={!!editingUser}
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold disabled:bg-slate-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                    الدور
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as any })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold"
                  >
                    <option value="parent">ولي أمر</option>
                    <option value="teacher">معلم</option>
                    <option value="staff">موظف إداري</option>
                    <option value="assistant">مساعد</option>
                    <option value="admin">مدير مدرسة</option>
                    {isMasterAdmin && (
                      <option value="superadmin">مدير نظام (Super)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">
                    المدرسة (اختياري)
                  </label>
                  <select
                    value={newUser.schoolId}
                    onChange={(e) =>
                      setNewUser({ ...newUser, schoolId: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none transition-all font-bold"
                  >
                    <option value="">لا يوجد (فريق المنصة)</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {newUser.role === "assistant" && !newUser.schoolId && (
                <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                  <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">
                    تخصيص صلاحيات المساعد
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(SYSTEM_PERMISSIONS).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={newUser.permissions?.includes(key)}
                          onChange={(e) => {
                            const current = newUser.permissions || [];
                            const updated = e.target.checked
                              ? [...current, key]
                              : current.filter((p) => p !== key);
                            setNewUser({ ...newUser, permissions: updated });
                          }}
                          className="rounded text-blue-600 border-slate-300 transition-all"
                        />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg"
                >
                  {editingUser ? "تحديث البيانات" : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setNewUser({
                      name: "",
                      email: "",
                      role: "parent",
                      schoolId: "",
                    });
                  }}
                  className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AnimatePresence>
        {viewingPackage && (
          <PackageDetailsModal
            pkg={viewingPackage}
            onClose={() => setViewingPackage(null)}
          />
        )}
      </AnimatePresence>

      {/* Floating/Sticky Mobile Navigation Dock for Super Admin */}
      <MobileNavigationDock
        menuItems={[
          hasPermission("manage_schools") && { id: "schools", label: t('sidebar_schools'), icon: Building },
          hasPermission("manage_schools") && { id: "accounts", label: t('sidebar_accounts'), icon: Lock },
          profile?.role === "superadmin" && { id: "team", label: t('sidebar_team'), icon: ShieldCheck },
          hasPermission("manage_packages") && { id: "packages", label: t('sidebar_packages'), icon: Plus },
          hasPermission("view_requests") && { id: "requests", label: t('sidebar_requests'), icon: Mail },
          hasPermission("manage_schools") && { id: "chat", label: t('sidebar_chat'), icon: MessageSquare },
          hasPermission("manage_users") && { id: "users", label: t('sidebar_users'), icon: Users },
          hasPermission("manage_users") && { id: "parents", label: t('sidebar_parents'), icon: Users },
          hasPermission("system_settings") && { id: "settings", label: t('sidebar_settings'), icon: SettingsIcon },
          hasPermission("system_settings") && { id: "footer", label: t('sidebar_footer'), icon: Save },
          hasPermission("view_backups") && { id: "backups", label: t('sidebar_backups') || (isRtl ? "النسخ الاحتياطي" : "Backups"), icon: FileArchive },
          (profile?.role === "superadmin" || profile?.role === "dev_agent") && { id: "diagnostics", label: t('sidebar_diagnostics') || (isRtl ? "الفحص والتشخيص" : "Diagnostics"), icon: ClipboardCheck }
        ].filter(Boolean) as any[]}
        activeTab={activeTab}
        setActiveTab={(tabId) => {
          navigateToTab(tabId);
        }}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        notificationsCount={notifications.filter((n: any) => !n.read).length}
        isRtl={isRtl}
      />
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
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between transition-colors">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">
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
          <div className="grid grid-cols-2 gap-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800/30 transition-colors">
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">
                السعر السنوي
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors">
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
              <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">
                السعر الشهري
              </p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors">
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
            <div className="col-span-2 border-t border-blue-150/40 dark:border-blue-800/10 pt-4 mt-2 text-right">
              <p className="text-[10px] font-black text-blue-400 uppercase mb-1 tracking-widest">
                سعة الطلاب
              </p>
              <p className="text-xl font-black text-blue-800 dark:text-blue-300 transition-colors">
                {pkg.maxStudents.toLocaleString("ar-IQ")} طالب
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 transition-colors">
              <ClipboardCheck size={18} className="text-blue-500" />
              الميزات المتضمنة:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {Array.isArray(pkg.features) &&
                pkg.features.map((f: string) => (
                  <div
                    key={f}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors"
                  >
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">
                      {f}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex justify-end transition-colors">
          <button
            onClick={onClose}
            className="px-10 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PasswordCell({ password }: { password?: string }) {
  const [show, setShow] = React.useState(false);

  if (!password) return <span className="text-slate-300">---</span>;

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs">{show ? password : "••••••••"}</span>
      <button
        onClick={() => setShow(!show)}
        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-slate-400"
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

function AdminStatCard({ title, value, hint, color, onClick, isActive }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700' : ''
      } ${
        isActive ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
        {title}
      </p>
      <div className="flex items-end justify-between mt-2">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
          {hint}
        </span>
      </div>
    </div>
  );
}

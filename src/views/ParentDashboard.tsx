import { useState, useEffect, useMemo, useRef } from "react";
import React from "react";
import { db, auth } from "../lib/firebase";
import { signOutWithCleanup } from "../lib/authLogout";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  setDoc,
  serverTimestamp,
  limit,
  arrayUnion,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { useNotificationBadges } from "../lib/NotificationBadgeContext";
import { useNotificationRouteRedirect, normalizeDashboardRole } from "../lib/useNotificationRouteRedirect";
import { NotificationCenter } from "../components/NotificationCenter";
import { MobileNavigationDock } from "../components/MobileNavigationDock";
import { GlobalFooter } from "../components/GlobalFooter";
import {
  logParentFirestoreSetup,
  logParentFirestoreError,
  logParentFirestoreSnapshot,
  type ParentFirestoreMeta,
} from "../lib/parentQueryDebug";
import { filterNotificationsForUser } from "../lib/notificationVisibility";
import {
  getHomeworkSubjectDisplay,
  groupHomeworkBySubject,
} from "../lib/homeworkSubjects";
import {
  isRedactedCredentialValue,
} from "../lib/userProfile";
import {
  getProductImageUrl,
  getProductName,
  getProductStock,
  subscribeSchoolStoreProducts,
} from "../lib/storeProducts";
import { toast } from "react-hot-toast";
import {
  Home,
  BookOpen,
  Calendar,
  MessageSquare,
  ShoppingBag,
  User,
  LogOut,
  Bell,
  ArrowRight,
  Wallet,
  Users,
  Settings,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  CheckCircle,
  FileText,
  Star,
  Trash2,
  Menu,
  BarChart3,
  ShieldCheck,
  Image as ImageIcon,
  QrCode,
  Building,
  DoorOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { pageTransitionProps } from "../lib/motion";

import SolarLoading from "../components/SolarLoading";
import ParentChatTab from "./ParentChatTab";
import { invokeChatBack } from "../lib/chatUiBridge";
import ParentSchedules from "./parent/ParentSchedules";
import ParentDismissalTab from "./parent/ParentDismissalTab";
import { ParentHomeView } from "../components/parent/ParentHomeView";
import { ParentHomeworkView } from "../components/parent/ParentHomeworkView";
import { ParentGradesView } from "../components/parent/ParentGradesView";
import { ParentTuitionView } from "../components/parent/ParentTuitionView";
import { ParentInboxView } from "../components/parent/ParentAnnouncementsFeed";
import StudentCard from "../components/admin/idcards/StudentCard";
import { IdCardTemplate } from "../types/idCardTemplate";
import { Phone, Mail, MapPin, Save, Sparkles, ShieldAlert, ExternalLink } from "lucide-react";

import { useLanguage } from "../lib/LanguageContext";
import { useSystemConfig } from "../lib/SystemConfigContext";
import SchoolixLogo from "../components/SchoolixLogo";
import { isCustomAppLogo } from "../lib/brandAssets";

function isParentDashboardRole(role?: string) {
  return ["parent", "admin", "superadmin", "staff", "teacher"].includes(
    role || "",
  );
}

function parentSnapshotError(queryName: string) {
  return (error: unknown) => {
    logParentFirestoreError(queryName, error);
  };
}

function mapNotificationToAnnouncement(notif: any) {
  const metadata =
    notif.metadata && typeof notif.metadata === "object" ? notif.metadata : {};
  const targetStudentId =
    typeof metadata.targetStudentId === "string"
      ? metadata.targetStudentId
      : undefined;
  return {
    id:
      (typeof metadata.sourceId === "string" && metadata.sourceId) || notif.id,
    title: notif.title,
    content: notif.message,
    authorName: notif.senderName || notif.authorName,
    target: targetStudentId
      ? "individual"
      : typeof metadata.target === "string"
        ? metadata.target
        : "all",
    targetStudentId,
    createdAt: notif.createdAt,
  };
}

function defaultNotificationPrefsForStudent(
  parentId: string,
  studentId: string,
) {
  return {
    parentId,
    studentId,
    grades: true,
    behavior: true,
    attendance: true,
    announcements: true,
    payments: true,
  };
}

export default function ParentDashboard() {
  const { profile, schoolData } = useAuth();
  const { t, isRtl, language, setLanguage } = useLanguage();
  const { config } = useSystemConfig();
  const [activeTab, setActiveTab] = useState("home");
  const { totalUnread: badgeTotalUnread, tabBadges } = useNotificationBadges();
  useNotificationRouteRedirect(normalizeDashboardRole(undefined, profile?.role), setActiveTab);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  // Enhanced tab switcher that tracks history
  const navigateToTab = (tabId: string) => {
    const restrictions = profile?.privilegeRestrictions;
    const restricted = Boolean(restrictions?.parentPrivilegesRestricted);
    const blocked = restrictions?.restrictedFeatures ?? [];
    if (restricted) {
      if (tabId === "market" && blocked.includes("marketplace")) {
        toast.error("تم تقييد المتجر — يرجى سداد الأقساط المستحقة");
        return;
      }
      if (tabId === "chat" && blocked.includes("chat")) {
        toast.error("تم تقييد المحادثات — يرجى سداد الأقساط المستحقة");
        return;
      }
      if (tabId === "homework" && blocked.includes("homework_submit")) {
        toast.error("تم تقييد الواجبات — يرجى سداد الأقساط المستحقة");
        return;
      }
    }
    if (tabId === activeTab) return;
    setNavigationHistory((prev) => [...prev, activeTab]);
    setActiveTab(tabId);
  };

  const handleBack = () => {
    if (activeTab === "chat" && invokeChatBack()) return;
    if (navigationHistory.length > 0) {
      const prevTab = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((prev) => prev.slice(0, -1));
      setActiveTab(prevTab);
    } else {
      setActiveTab("home");
    }
  };
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsPrimedRef = useRef(false);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const [showNotifications, setShowNotifications] = useState(false);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);
  const [purchaseModal, setPurchaseModal] = useState<any>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [linkingRegNumber, setLinkingRegNumber] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<
    Record<string, any>
  >({});
  const [isSavingPrefs, setIsSavingPrefs] = useState<string | null>(null);
  const [behaviorReports, setBehaviorReports] = useState<Record<string, any[]>>(
    {},
  );
  const [homework, setHomework] = useState<any[]>([]);
  const homeworkBySubject = useMemo(
    () => groupHomeworkBySubject(homework, {}, isRtl),
    [homework, isRtl],
  );
  const announcements = useMemo(() => {
    const mapped = notifications
      .filter((notif) => notif.type === "announcement")
      .map(mapNotificationToAnnouncement);
    return Array.from(
      new Map(mapped.map((item) => [item.id, item])).values(),
    ).sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );
  }, [notifications]);
  const [teacherReports, setTeacherReports] = useState<any[]>([]);
  const [advancedReports, setAdvancedReports] = useState<any[]>([]);
  const [idCards, setIdCards] = useState<Record<string, any>>({});
  const [idCardTemplate, setIdCardTemplate] = useState<IdCardTemplate | null>(null);

  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);

  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    if (!selectedStudent?.schoolId) {
      setSchoolInfo(null);
      return;
    }
    const schoolRef = doc(db, "schools", selectedStudent.schoolId);
    getDoc(schoolRef).then((snap) => {
      if (snap.exists()) {
        setSchoolInfo({ id: snap.id, ...snap.data() });
      } else {
        setSchoolInfo(null);
      }
    }).catch((err) => {
      console.error("Error fetching school locator:", err);
      setSchoolInfo(null);
    });
  }, [selectedStudent?.schoolId]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[ParentMenu] active surface: light");
    }
  }, []);
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

  useEffect(() => {
    if (activeTab === "chat" && isSidebarOpen && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [activeTab, isSidebarOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (window.innerWidth >= 1024) return;
      if (isSidebarOpen) setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (selectedStudent) {
      const card = idCards[selectedStudent.id] || {};
      setEditPhone(selectedStudent.parentPhone || "");
      setEditEmail(selectedStudent.parentEmail || card.parentEmail || "");
      setEditAddress(card.residenceAddress || selectedStudent.address || "");
    }
  }, [selectedStudent, idCards]);

  const handleUpdateContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent?.id) return;
    setIsUpdatingCard(true);
    try {
      // 1. Update Student document
      const studentRef = doc(db, "students", selectedStudent.id);
      await updateDoc(studentRef, {
        parentPhone: editPhone.trim(),
        parentEmail: editEmail.trim(),
        address: editAddress.trim(),
        updatedAt: serverTimestamp(),
      });

      // 2. Update ID Card document (if exists)
      const hasIdCard = !!idCards[selectedStudent.id];
      if (hasIdCard) {
        const idCardRef = doc(db, "id_cards", selectedStudent.id);
        await updateDoc(idCardRef, {
          parentEmail: editEmail.trim(),
          residenceAddress: editAddress.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(
        isRtl
          ? "تم تحديث بيانات الاتصال والعنوان بنجاح! ستظهر التحديثات بالهوية فوراً."
          : "Contact details and address updated successfully! Changes will reflect on the ID card immediately.",
      );
    } catch (error: any) {
      console.error("Error updating student/idcard details:", error);
      handleFirestoreError(error, OperationType.UPDATE, "students_and_id_cards");
      toast.error(
        isRtl
          ? "عذراً، فشل تحديث البيانات. يرجى مراجعة الصلاحيات."
          : "Error updating data. Please check permissions.",
      );
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUid = profile?.uid || auth.currentUser?.uid;
    if (!currentUid || !linkingRegNumber) return;
    setIsLinking(true);
    try {
      const regNum = linkingRegNumber.trim();
      const q = query(
        collection(db, "students"),
        where("registrationNumber", "==", regNum),
        limit(1),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error(t("studentNotFound"));
        setIsLinking(false);
        return;
      }

      const studentDoc = snap.docs[0];
      const studentData = studentDoc.data();
      const currentParentIds = studentData.parentIds || [];

      if (currentParentIds.includes(currentUid)) {
        toast(t("alreadyLinked"), { icon: "ℹ️" });
        setShowAddStudentModal(false);
        setIsLinking(false);
        return;
      }

      try {
        await updateDoc(doc(db, "students", studentDoc.id), {
          parentIds: arrayUnion(currentUid),
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error("Failed to link student doc:", err);
        // Special check for permission error to give better feedback
        if (err.message?.includes("insufficient permissions")) {
          toast.error(
            isRtl
              ? "عذراً، لاتملك صلاحية تعديل بيانات هذا الطالب"
              : "Insufficient permissions to link this student",
          );
        }
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `students_search_and_link:student_doc`,
        );
        throw err;
      }

      // Update parent's profile with schoolId and studentIds for rule checking
      const updateData: any = {
        role: "parent",
        studentIds: arrayUnion(studentDoc.id),
        updatedAt: serverTimestamp(),
      };

      if (studentData.schoolId) {
        updateData.schoolId = studentData.schoolId;
      }

      const { setDoc } = await import("firebase/firestore");
      try {
        await setDoc(doc(db, "users", currentUid), updateData, { merge: true });

        // Professionally update local state immediately to avoid waiting for observer
        const newStudent = { id: studentDoc.id, ...studentData };
        setStudents((prev) => {
          const exists = prev.find((s) => s.id === studentDoc.id);
          if (exists) return prev;
          return [...prev, newStudent];
        });
        setSelectedStudent(newStudent);

        // Success message
        toast.success(
          isRtl
            ? "تم ربط الطالب بنجاح! جاري تحديث البيانات..."
            : "Student linked successfully! Loading data...",
        );

        // Close modal after a short delay
        setTimeout(() => {
          setShowAddStudentModal(false);
          setLinkingRegNumber("");
          setActiveTab("home");
        }, 1500);
      } catch (err: any) {
        console.error("Failed to update user profile with student link:", err);
        if (err.message?.includes("insufficient permissions")) {
          toast.error(
            isRtl
              ? "فشل تحديث ملفك الشخصي. يرجى إعادة المحاولة."
              : "Failed to update your profile. Please try again.",
          );
        }
        handleFirestoreError(
          err,
          OperationType.UPDATE,
          `students_search_and_link:user_profile`,
        );
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `students_search_and_link`,
      );
      toast.error(t("linkFailed"));
    } finally {
      setIsLinking(false);
    }
  };

  useEffect(() => {
    if (!profile?.uid || !auth.currentUser) {
      setStudentsLoading(false);
      return;
    }
    if (!isParentDashboardRole(profile.role)) {
      setStudentsLoading(false);
      return;
    }

    const queryName = "PARENT_STUDENTS";
    const constraints = [`parentIds array-contains ${profile.uid}`];
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "students",
      constraints,
      uid: profile.uid,
      schoolId: profile.schoolId,
    };
    logParentFirestoreSetup(meta);

    const q = query(
      collection(db, "students"),
      where("parentIds", "array-contains", profile.uid),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        logParentFirestoreSnapshot(
          queryName,
          snapshot.size,
          snapshot.metadata.fromCache,
        );
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];
        setStudents(data);

        if (data.length > 0) {
          if (!selectedStudent) {
            setSelectedStudent(data[0]);
          } else {
            const updated = data.find(
              (s) => (s as any).id === selectedStudent.id,
            );
            if (updated) {
              if (
                updated.name !== selectedStudent.name ||
                updated.class !== selectedStudent.class ||
                updated.schoolId !== selectedStudent.schoolId
              ) {
                setSelectedStudent(updated);
              }
            } else {
              setSelectedStudent(data[0]);
            }
          }
        } else {
          setSelectedStudent(null);
        }
        setStudentsLoading(false);
      },
      parentSnapshotError(queryName),
    );
    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    if (!profile?.uid || !auth.currentUser) return;
    if (!isParentDashboardRole(profile.role)) return;

    let cancelled = false;
    let unsubSchool: (() => void) | undefined;
    let unsubSystem: (() => void) | undefined;

    const applyNotifications = (rawItems: any[], schoolId: string) => {
      const items = filterNotificationsForUser(
        rawItems.sort(
          (a: any, b: any) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        ),
        {
          uid: profile.uid,
          role: profile.role,
          schoolId,
        },
      );
      if (notificationsPrimedRef.current) {
        items.forEach((notif: any) => {
          if (!knownNotificationIdsRef.current.has(notif.id) && !notif.read) {
            knownNotificationIdsRef.current.add(notif.id);
          }
        });
      } else {
        notificationsPrimedRef.current = true;
      }
      knownNotificationIdsRef.current = new Set(
        items.map((notif: any) => notif.id),
      );
      setNotifications(items);
    };

    const setup = async () => {
      let schoolId: string | undefined;
      try {
        const tokenResult = await auth.currentUser!.getIdTokenResult(true);
        if (cancelled) return;
        const claimSchoolId = tokenResult.claims.schoolId;
        schoolId =
          typeof claimSchoolId === "string" && claimSchoolId
            ? claimSchoolId
            : profile.schoolId || students[0]?.schoolId;
      } catch {
        schoolId = profile.schoolId || students[0]?.schoolId;
      }

      if (!schoolId || cancelled) {
        if (!schoolId) setNotifications([]);
        return;
      }

      const queryName = "PARENT_NOTIFICATIONS";
      const meta: ParentFirestoreMeta = {
        queryName,
        collection: "notifications",
        constraints: [
          `userId == ${profile.uid}`,
          `schoolId == ${schoolId}`,
          `userId == ${profile.uid} && schoolId == system`,
          "limit(50) each",
        ],
        uid: profile.uid,
        schoolId,
      };
      logParentFirestoreSetup(meta);

      let schoolItems: any[] = [];
      let systemItems: any[] = [];

      const mergeAndApply = () => {
        const merged = [...schoolItems, ...systemItems];
        const deduped = Array.from(
          new Map(merged.map((item) => [item.id, item])).values(),
        );
        applyNotifications(deduped, schoolId!);
      };

      const schoolQ = query(
        collection(db, "notifications"),
        where("userId", "==", profile.uid),
        where("schoolId", "==", schoolId),
        limit(50),
      );
      const systemQ = query(
        collection(db, "notifications"),
        where("userId", "==", profile.uid),
        where("schoolId", "==", "system"),
        limit(50),
      );

      unsubSchool = onSnapshot(
        schoolQ,
        (snap) => {
          logParentFirestoreSnapshot(
            queryName,
            snap.size,
            snap.metadata.fromCache,
          );
          schoolItems = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          mergeAndApply();
        },
        parentSnapshotError(queryName),
      );

      unsubSystem = onSnapshot(
        systemQ,
        (snap) => {
          logParentFirestoreSnapshot(
            `${queryName}_SYSTEM`,
            snap.size,
            snap.metadata.fromCache,
          );
          systemItems = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          mergeAndApply();
        },
        parentSnapshotError(`${queryName}_SYSTEM`),
      );
    };

    void setup();

    return () => {
      cancelled = true;
      unsubSchool?.();
      unsubSystem?.();
    };
  }, [profile?.uid, profile?.role, profile?.schoolId, students, isRtl]);

  useEffect(() => {
    if (!profile?.uid || students.length === 0) return;

    setNotificationPrefs((prev) => {
      const next = { ...prev };
      for (const student of students) {
        if (!next[student.id]) {
          next[student.id] = defaultNotificationPrefsForStudent(
            profile.uid,
            student.id,
          );
        }
      }
      return next;
    });
  }, [profile?.uid, students]);

  useEffect(() => {
    if (activeTab !== "settings") return;
    if (!profile?.uid || !auth.currentUser) return;
    if (!isParentDashboardRole(profile.role) || students.length === 0) return;

    const queryName = "PARENT_NOTIFICATION_PREFERENCES";
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "notification_preferences",
      constraints: ["doc get per student", `${profile.uid}_{studentId}`],
      uid: profile.uid,
      schoolId: profile.schoolId,
    };
    logParentFirestoreSetup(meta);

    const unsubs: (() => void)[] = [];
    let cancelled = false;

    const loadPrefs = async () => {
      for (const student of students) {
        if (cancelled) return;
        const docId = `${profile.uid}_${student.id}`;
        const prefRef = doc(db, "notification_preferences", docId);
        try {
          const snap = await getDoc(prefRef);
          if (cancelled) return;
          if (!snap.exists()) continue;

          setNotificationPrefs((prev) => ({
            ...prev,
            [student.id]: { id: snap.id, ...snap.data() },
          }));

          unsubs.push(
            onSnapshot(
              prefRef,
              (liveSnap) => {
                if (!liveSnap.exists()) return;
                setNotificationPrefs((prev) => ({
                  ...prev,
                  [student.id]: { id: liveSnap.id, ...liveSnap.data() },
                }));
              },
              parentSnapshotError(queryName),
            ),
          );
        } catch (error) {
          const code = (error as { code?: string })?.code;
          if (code === "permission-denied") continue;
          logParentFirestoreError(queryName, error);
        }
      }
    };

    void loadPrefs();

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [
    activeTab,
    profile?.uid,
    profile?.role,
    profile?.schoolId,
    students,
  ]);

  useEffect(() => {
    if (!profile?.uid || !auth.currentUser) return;
    if (!isParentDashboardRole(profile.role) || students.length === 0) return;

    const studentIds = students.map((s) => s.id).filter(Boolean);
    if (studentIds.length === 0) return;

    const queryName = "PARENT_BEHAVIOR_REPORTS";
    const constraints = [
      `studentId in [${studentIds.slice(0, 10).join(", ")}${studentIds.length > 10 ? ", …" : ""}]`,
      `parentIds array-contains ${profile.uid}`,
    ];
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "behavior_reports",
      constraints,
      uid: profile.uid,
      schoolId: profile.schoolId || students[0]?.schoolId,
    };
    logParentFirestoreSetup(meta);

    const q = query(
      collection(db, "behavior_reports"),
      where("studentId", "in", studentIds.slice(0, 30)),
      where("parentIds", "array-contains", profile.uid),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        logParentFirestoreSnapshot(
          queryName,
          snapshot.size,
          snapshot.metadata.fromCache,
        );
        const reports: Record<string, any[]> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!reports[data.studentId]) reports[data.studentId] = [];
          reports[data.studentId].push({ id: doc.id, ...data });
        });
        Object.keys(reports).forEach((studentId) => {
          reports[studentId].sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          });
        });
        setBehaviorReports(reports);
      },
      parentSnapshotError(queryName),
    );
  }, [profile, students]);

  useEffect(() => {
    if (!selectedStudent?.id || !auth.currentUser || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;

    const schoolId = selectedStudent.schoolId;
    let unsubs: (() => void)[] = [];
      setLoadingGrades(true);

    const gradesQueryName = "PARENT_GRADES";
    const gradesConstraints = [
      `schoolId == ${schoolId}`,
      `studentId == ${selectedStudent.id}`,
      `parentIds array-contains ${profile.uid}`,
      "limit(50)",
    ];
    const gradesMeta: ParentFirestoreMeta = {
      queryName: gradesQueryName,
      collection: "grades",
      constraints: gradesConstraints,
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(gradesMeta);

      const gradesQ = query(
        collection(db, "grades"),
      where("schoolId", "==", schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
      limit(50),
    );
    unsubs.push(
      onSnapshot(
        gradesQ,
        (snap) => {
          logParentFirestoreSnapshot(
            gradesQueryName,
            snap.size,
            snap.metadata.fromCache,
          );
          const allGrades = snap.docs
            .map((doc) => {
          const data = doc.data();
          const score = Number(data.score ?? 0);
          const maxScore = Number(data.maxScore || 100);
          return {
            id: doc.id,
            subject: data.subject,
                score,
                maxScore,
                percentage:
                  maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
            term: data.term || "",
            createdAt: data.createdAt,
          };
            })
            .sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            );
        setStudentGrades(allGrades);
        setLoadingGrades(false);
        },
        parentSnapshotError(gradesQueryName),
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [selectedStudent?.id, selectedStudent?.schoolId, profile?.uid]);

  useEffect(() => {
    if (!selectedStudent?.id || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;
    if (activeTab !== "home" && activeTab !== "homework") return;

    const schoolId = selectedStudent.schoolId;
    const classId = selectedStudent.classId || selectedStudent.class;
    if (!schoolId || !classId) {
      setHomework([]);
      return;
    }

    const queryName = "PARENT_HOMEWORK";
    const constraints = [
      `parentIds array-contains ${profile.uid}`,
      `client filter schoolId == ${schoolId}`,
      `client filter classId == ${classId}`,
      "limit(100)",
    ];
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "homework",
      constraints,
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(meta);

    const hwQ = query(
      collection(db, "homework"),
      where("parentIds", "array-contains", profile.uid),
      limit(100),
    );

    return onSnapshot(
      hwQ,
      (snap) => {
        logParentFirestoreSnapshot(
          queryName,
          snap.size,
          snap.metadata.fromCache,
        );
        setHomework(
          snap.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter(
              (hw: any) =>
                hw.schoolId === schoolId &&
                hw.classId === classId &&
                !(hw.hiddenFor || []).includes(profile.uid),
            )
            .sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ) as any,
        );
      },
      parentSnapshotError(queryName),
    );
  }, [
    selectedStudent?.id,
    selectedStudent?.schoolId,
    selectedStudent?.classId,
    selectedStudent?.class,
    profile?.uid,
    activeTab,
  ]);

  useEffect(() => {
    if (!selectedStudent?.id || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;
    if (activeTab !== "tuition") return;

    const schoolId = selectedStudent.schoolId;
    let unsubs: (() => void)[] = [];

    const paymentsQueryName = "PARENT_PAYMENTS";
    const paymentsMeta: ParentFirestoreMeta = {
      queryName: paymentsQueryName,
      collection: "payments",
      constraints: [`studentId == ${selectedStudent.id}`],
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(paymentsMeta);

    const installmentsQueryName = "PARENT_INSTALLMENTS";
    const installmentsMeta: ParentFirestoreMeta = {
      queryName: installmentsQueryName,
      collection: "installments",
      constraints: [`studentId == ${selectedStudent.id}`],
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(installmentsMeta);

    unsubs.push(
      onSnapshot(
        query(
        collection(db, "payments"),
        where("studentId", "==", selectedStudent.id),
        ),
        (snap) => {
          logParentFirestoreSnapshot(
            paymentsQueryName,
            snap.size,
            snap.metadata.fromCache,
          );
          setPayments(
            snap.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .sort(
                (a: any, b: any) =>
                  (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
              ) as any,
          );
        },
        parentSnapshotError(paymentsQueryName),
      ),
    );
    unsubs.push(
      onSnapshot(
        query(
        collection(db, "installments"),
        where("studentId", "==", selectedStudent.id),
        ),
        (snap) => {
          logParentFirestoreSnapshot(
            installmentsQueryName,
            snap.size,
            snap.metadata.fromCache,
          );
          setInstallments(
            snap.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .sort(
                (a: any, b: any) =>
                  (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0),
              ) as any,
          );
        },
        parentSnapshotError(installmentsQueryName),
      ),
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [selectedStudent?.id, selectedStudent?.schoolId, profile?.uid, activeTab]);

  useEffect(() => {
    if (!selectedStudent?.schoolId || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;
    if (activeTab !== "market") return;

    setMarketLoading(true);
    const queryName = "PARENT_MARKET";
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "market + marketplace",
      constraints: [`schoolId == ${selectedStudent.schoolId}`, "limit(200)"],
      uid: profile.uid,
      schoolId: selectedStudent.schoolId,
    };
    logParentFirestoreSetup(meta);

    return subscribeSchoolStoreProducts(
      selectedStudent.schoolId,
      (products) => {
        logParentFirestoreSnapshot(queryName, products.length, false);
        setMarketItems(products);
        setMarketLoading(false);
      },
      {
        onError: (error) => {
          logParentFirestoreError(queryName, error, meta);
          handleFirestoreError(error, OperationType.LIST, "ParentDashboard:market");
          setMarketLoading(false);
        },
      },
    );
  }, [selectedStudent?.schoolId, profile?.uid, activeTab]);

  useEffect(() => {
    if (!selectedStudent?.id || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;
    if (activeTab !== "reports") return;

    const schoolId = selectedStudent.schoolId;
    const queryName = "PARENT_TEACHER_REPORTS";
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "teacher_reports",
      constraints: [
        `schoolId == ${schoolId}`,
        `studentId == ${selectedStudent.id}`,
        "target in [parents, both]",
        `parentIds array-contains ${profile.uid}`,
        "limit(20)",
      ],
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(meta);

      const repQ = query(
        collection(db, "teacher_reports"),
      where("schoolId", "==", schoolId),
        where("studentId", "==", selectedStudent.id),
        where("target", "in", ["parents", "both"]),
        where("parentIds", "array-contains", profile.uid),
      limit(20),
    );

    return onSnapshot(
      repQ,
      (snap) => {
        logParentFirestoreSnapshot(
          queryName,
          snap.size,
          snap.metadata.fromCache,
        );
        setTeacherReports(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ) as any,
        );
      },
      parentSnapshotError(queryName),
    );
  }, [
    selectedStudent?.id,
    selectedStudent?.schoolId,
    profile?.uid,
    activeTab,
  ]);

  useEffect(() => {
    if (!selectedStudent?.id || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;
    if (activeTab !== "advanced_reports") return;

    const schoolId = selectedStudent.schoolId;
    const queryName = "PARENT_ADVANCED_REPORTS";
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: "advanced_reports",
      constraints: [
        `schoolId == ${schoolId}`,
        `studentId == ${selectedStudent.id}`,
        `parentIds array-contains ${profile.uid}`,
        "limit(20)",
      ],
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(meta);

      const advRepQ = query(
        collection(db, "advanced_reports"),
      where("schoolId", "==", schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
      limit(20),
    );

    return onSnapshot(
      advRepQ,
      (snap) => {
        logParentFirestoreSnapshot(
          queryName,
          snap.size,
          snap.metadata.fromCache,
        );
        setAdvancedReports(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ) as any,
        );
      },
      parentSnapshotError(queryName),
    );
  }, [
    selectedStudent?.id,
    selectedStudent?.schoolId,
    profile?.uid,
    activeTab,
  ]);

  useEffect(() => {
    if (!selectedStudent?.id || !profile?.uid) return;
    if (!isParentDashboardRole(profile.role)) return;
    if (activeTab !== "id_cards") return;

    const schoolId = selectedStudent.schoolId;
    const queryName = "PARENT_ID_CARD";
    const meta: ParentFirestoreMeta = {
      queryName,
      collection: `id_cards/${selectedStudent.id}`,
      constraints: [`doc id == studentId ${selectedStudent.id}`],
      uid: profile.uid,
      schoolId,
    };
    logParentFirestoreSetup(meta);

    getDoc(
      doc(db, "schools", schoolId, "settings", "idCardTemplate"),
    )
      .then((templateSnap) => {
          if (templateSnap.exists()) {
          setIdCardTemplate(templateSnap.data() as IdCardTemplate);
          } else {
            setIdCardTemplate(null);
          }
        })
      .catch((err) => console.warn("Could not fetch idCardTemplate", err));

    return onSnapshot(
      doc(db, "id_cards", selectedStudent.id),
      (snap) => {
        logParentFirestoreSnapshot(
          queryName,
          snap.exists() ? 1 : 0,
          snap.metadata.fromCache,
        );
        if (snap.exists()) {
          setIdCards({
            [selectedStudent.id]: { id: snap.id, ...snap.data() },
          });
        } else {
          setIdCards({});
        }
      },
      parentSnapshotError(queryName),
    );
  }, [selectedStudent?.id, selectedStudent?.schoolId, profile?.uid, activeTab]);

  const studentIds = useMemo(() => students.map((s) => s.id), [students]);

  const attendanceSummary = useMemo(() => {
    if (!selectedStudent?.id) return { absent: 0, late: 0 };
    let absent = 0;
    let late = 0;
    for (const n of notifications) {
      if (n.type !== "attendance") continue;
      const metaStudentId = n.metadata?.studentId;
      if (metaStudentId && metaStudentId !== selectedStudent.id) continue;
      const status = String(n.metadata?.status || "").toLowerCase();
      const title = String(n.title || "").toLowerCase();
      const message = String(n.message || "").toLowerCase();
      if (
        status === "absent" ||
        title.includes("absent") ||
        title.includes("غائب") ||
        message.includes("absent") ||
        message.includes("غائب")
      ) {
        absent += 1;
      } else if (
        status === "late" ||
        title.includes("late") ||
        title.includes("متأخر") ||
        message.includes("late") ||
        message.includes("متأخر")
      ) {
        late += 1;
      }
    }
    return { absent, late };
  }, [notifications, selectedStudent?.id]);

  const installmentBanners = useMemo(
    () =>
      notifications.filter(
        (n) =>
          (n.type === "payment" || n.type === "tuition") &&
          (n.metadata?.banner || n.metadata?.installmentAlert) &&
          !n.dismissed &&
          (!n.metadata?.studentId || studentIds.includes(n.metadata.studentId)),
      ),
    [notifications, studentIds],
  );

  const tuitionEscalationAlert = useMemo(() => {
    const restrictions = profile?.privilegeRestrictions;
    const until = restrictions?.tuitionWarningUntil as
      | { toDate?: () => Date; seconds?: number }
      | null
      | undefined;
    let warningActive = (restrictions?.tuitionEscalationLevel ?? 0) >= 2;
    if (until?.toDate) warningActive = Date.now() < until.toDate().getTime();
    else if (until?.seconds) warningActive = Date.now() < until.seconds * 1000;

    const alertNotif = notifications.find(
      (n) =>
        !n.dismissed &&
        n.type === "tuition" &&
        ((n.metadata?.escalationLevel ?? 0) >= 2 || n.metadata?.installmentAlert),
    );

    if (!warningActive && !restrictions?.parentPrivilegesRestricted && !alertNotif) {
      return null;
    }

    return {
      studentName:
        alertNotif?.metadata?.studentName ||
        selectedStudent?.name ||
        students[0]?.name ||
        "الطالب",
      amount: alertNotif?.metadata?.amount,
      dueDate: alertNotif?.metadata?.dueDate,
      message:
        alertNotif?.message ||
        "يوجد قسط دراسي متأخر. يرجى مراجعة إدارة المدرسة وسداد المبلغ المستحق.",
      restricted: Boolean(restrictions?.parentPrivilegesRestricted),
      schoolPhone: schoolData?.phone || schoolData?.contactPhone,
    };
  }, [profile?.privilegeRestrictions, notifications, selectedStudent, students, schoolData]);

  const dismissInstallmentBanner = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        dismissed: true,
        read: true,
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, dismissed: true, read: true } : n,
        ),
      );
    } catch (err) {
      console.error("Failed to dismiss installment banner", err);
    }
  };

  const allItems = [
    { id: "home", label: t("home"), icon: Home },
    {
      id: "homework",
      label: t("homework"),
      icon: BookOpen,
      badge: tabBadges.homework || homework.length || undefined,
    },
    { id: "grades", label: t("grades"), icon: Star },
    { id: "schedules", label: "الجدول الأسبوعي", icon: Calendar },
    { id: "tuition", label: t("tuition"), icon: Wallet, badge: tabBadges.tuition || undefined },
    {
      id: "behavior",
      label: t("behavior"),
      icon: MessageSquare,
      badge: selectedStudent
        ? behaviorReports[selectedStudent.id]?.length || 0
        : 0,
    },
    {
      id: "reports",
      label: t("reports"),
      icon: FileText,
      badge: teacherReports.length,
    },
    {
      id: "advanced_reports",
      label: isRtl ? "تقارير متقدمة" : "Advanced Reports",
      icon: BarChart3,
      badge: advancedReports.length,
    },
    {
      id: "id_cards",
      label: isRtl ? "هويات الطلاب" : "Student ID Cards",
      icon: ShieldCheck,
      badge: selectedStudent && idCards[selectedStudent.id] ? 1 : 0,
    },
    { id: "market", label: t("market"), icon: ShoppingBag },
    { id: "dismissal", label: isRtl ? "طلب التسريح" : "Dismissal", icon: DoorOpen },
    { id: "chat", label: t("chat") || "الدردشة", icon: MessageSquare, badge: tabBadges.chat || undefined },
    {
      id: "inbox",
      label: t("inbox"),
      icon: Bell,
      badge: announcements.filter((a) => a.target === "individual").length,
    },
    { id: "settings", label: t("settings"), icon: Settings },
  ].filter((item) => {
    if (
      item.id === "home" ||
      item.id === "settings" ||
      item.id === "inbox" ||
      item.id === "chat"
    )
      return true;
    const p = (schoolData?.packagePermissions || profile?.permissions) as any;
    if (p && typeof p === "object" && !Array.isArray(p)) {
      if (item.id === "homework") return p.homework_and_tasks !== false;
      if (item.id === "grades") return p.exams_and_results !== false;
      if (item.id === "schedules") return p.automated_schedules !== false;
      if (item.id === "tuition") return p.tuition_fees !== false;
      if (item.id === "behavior") return p.behavior_management !== false;
      if (item.id === "reports") return p.student_evaluation_reports !== false;
      if (item.id === "advanced_reports") return p.advanced_reports !== false;
      if (item.id === "id_cards") return p.id_card_generation !== false;
      if (item.id === "market") return p.marketplace_ordering !== false;
      if (item.id === "dismissal") {
        return p.dismissal_smart_gate !== false && p.parent_app_access !== false;
      }
    }
    return true;
  });

  const handlePurchase = async (item: any) => {
    if (!profile?.uid || !selectedStudent?.id) return;

    // Check stock before proceeding
    if (getProductStock(item) <= 0) {
      toast.error(
        isRtl
          ? "عذراً، هذا المنتج غير متوفر حالياً"
          : "Sorry, this item is out of stock",
      );
      return;
    }

    setIsPurchasing(true);
    try {
      await addDoc(collection(db, "orders"), {
        schoolId: selectedStudent.schoolId,
        studentId: selectedStudent.id,
        parentId: profile.uid,
        studentName: selectedStudent.name,
        parentName: profile.name,
        items: [
          {
            id: item.id,
            name: getProductName(item),
            price: item.price,
            quantity: 1,
          },
        ],
        total: item.price,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast.success("تم إرسال طلب الشراء بنجاح");
      setPurchaseModal(null);
    } catch (error) {
      console.error(error);
      toast.error("فشل عملية الشراء");
    } finally {
      setIsPurchasing(false);
    }
  };

  const togglePreference = async (studentId: string, type: string) => {
    if (!profile?.uid) return;

    setIsSavingPrefs(studentId);
    try {
      const currentPrefs = notificationPrefs[studentId] || {
        parentId: profile.uid,
        studentId: studentId,
        grades: true,
        behavior: true,
        attendance: true,
        announcements: true,
        payments: true,
      };

      const newPrefs = {
        ...currentPrefs,
        [type]: !currentPrefs[type],
        updatedAt: serverTimestamp(),
      };

      const docId = `${profile.uid}_${studentId}`;

      const { id: _id, ...saveData } = newPrefs as any;

      await setDoc(doc(db, "notification_preferences", docId), saveData, {
        merge: true,
      });

      setNotificationPrefs((prev) => ({
        ...prev,
        [studentId]: { id: docId, ...saveData },
      }));

      toast.success("تم تحديث إعدادات الإشعارات");
    } catch (error) {
      console.error(error);
      toast.error(t("settingsUpdateFailed"));
    } finally {
      setIsSavingPrefs(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutWithCleanup();
      toast.success(t("logoutSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("logoutFailed"));
    }
  };

  const handleDeleteRecord = async (
    collectionName: string,
    docId: string,
    itemTitle?: string,
  ) => {
    if (!profile?.uid) return;

    // In our system, the parent has full control over these records in their account
    const confirmDelete = window.confirm(
      isRtl
        ? `هل أنت متأكد من حذف ${itemTitle || "هذا السجل"} من حسابك؟`
        : `Are you sure you want to delete ${itemTitle || "this record"} from your account?`,
    );

    if (!confirmDelete) return;

    try {
      if (collectionName === "homework") {
        // Special case for homework: don't delete the source doc as it's shared, just hide it
        await updateDoc(doc(db, "homework", docId), {
          hiddenFor: arrayUnion(profile.uid),
        });
        toast.success(
          isRtl ? "تم إخفاء الواجب بنجاح" : "Homework hidden successfully",
        );
      } else {
        // Regular deletion for per-student records (grades, reports, behavioral etc)
        await deleteDoc(doc(db, collectionName, docId));
        toast.success(
          isRtl
            ? "تم الحذف من حسابك بنجاح"
            : "Successfully deleted from your account",
        );
      }
    } catch (error) {
      console.error("Delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, collectionName);
      toast.error(isRtl ? "فشل عملية الحذف" : "Failed to delete record");
    }
  };

  if (studentsLoading) {
    return <SolarLoading />;
  }

  const renderContent = () => {
    if (!selectedStudent && students.length === 0) {
      return (
        <div
          className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center"
          dir="rtl"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-50 dark:bg-slate-800 text-blue-600 mb-6 shadow-sm overflow-hidden">
            {isCustomAppLogo(config.appLogo) ? (
              <img
                src={config.appLogo}
                alt="SchoolixIQ logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <SchoolixLogo size={52} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {isRtl
              ? `مرحباً بك في ${config.appName}`
              : `Welcome to ${config.appName}`}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-bold leading-relaxed max-w-md">{t("noLinkedStudents")}</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Users size={20} />
              {t("linkStudentWithId")}
            </button>
            
            <button
              onClick={async () => {
                if (window.confirm(isRtl ? "هل أنت متأكد من رغبتك في تعديل نوع الحساب إلى إدارة مدرسة؟ سيتم تصفير خيارات الحساب والتحقق من اشتراكاتك." : "Are you sure you want to change your account type back to school management? This will reset your profile and re-evaluate your subscriptions.")) {
                  try {
                    await deleteDoc(doc(db, "users", auth.currentUser!.uid));
                    toast.success(isRtl ? "تمت إعادة تعيين نوع الحساب بنجاح. جاري إعادة التحميل..." : "Account type successfully reset. Reloading...");
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (e) {
                    console.error("Failed to reset wrong parent account type:", e);
                    toast.error(isRtl ? "حدث خطأ أثناء الاتصال" : "An error occurred during connection");
                  }
                }
              }}
              className="px-6 py-4 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 shadow-sm font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Building size={20} />
              {isRtl ? "التحول لحساب مدرسة / إدارة" : "Switch to School Admin"}
            </button>

            <button
              onClick={() => signOutWithCleanup()}
              className="px-6 py-4 bg-white text-red-600 border border-red-100 shadow-sm font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={20} />
              {t("logout")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="parent-app h-[100dvh] overflow-hidden flex font-sans transition-colors duration-300 print:overflow-visible print:h-auto print:block print:pb-0"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: isRtl ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1, width: isSidebarCollapsed ? 80 : 288 }}
              exit={{ x: isRtl ? 300 : -300, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`parent-dashboard-menu hidden lg:flex flex-col shrink-0 fixed inset-y-0 ${isRtl ? "right-0 border-l lg:rounded-none" : "left-0 border-r lg:rounded-none"} z-[var(--sx-z-drawer)] lg:relative lg:z-auto border-slate-200 transition-colors shadow-2xl lg:shadow-none overflow-hidden print:hidden pt-[env(safe-area-inset-top,0px)]`}
            >
              <div className="h-full flex flex-col overflow-hidden w-full">
                <div className={`p-6 flex ${isSidebarCollapsed ? 'justify-center border-b border-transparent' : 'items-center gap-3 border-b border-slate-100 dark:border-slate-800'} pb-6`}>
                  {isCustomAppLogo(config.appLogo) ? (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <img
                        src={config.appLogo}
                        alt="SchoolixIQ logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <SchoolixLogo size={isSidebarCollapsed ? 38 : 44} surface="dark" />
                  )}
                  {!isSidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0" dir={isRtl ? "rtl" : "ltr"}>
                      <h2 className="parent-sidebar-heading font-bold leading-tight truncate">
                         {t("parentWelcome")}
                      </h2>
                      <div className="flex flex-col">
                        <p className="parent-sidebar-subheading text-[10px] uppercase tracking-widest font-bold truncate">
                          {profile?.name}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 md:px-4 py-4 space-y-1.5 custom-scrollbar">
                  {allItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigateToTab(item.id);
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={`parent-nav-item w-full flex ${isSidebarCollapsed ? 'justify-center px-0' : 'items-center gap-3.5 px-4 md:px-5'} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${
                        activeTab === item.id ? "parent-nav-item--active" : ""
                      }`}
                      dir={isRtl ? "rtl" : "ltr"}
                    >
                      <div className="relative shrink-0">
                        <item.icon className="parent-nav-icon" size={isSidebarCollapsed ? 24 : 20} />
                        {item.badge > 0 && (
                           <span className="absolute -top-1 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-mono font-black rounded flex items-center justify-center border border-white dark:border-slate-900 shadow-sm">
                             {item.badge}
                           </span>
                        )}
                      </div>
                      {!isSidebarCollapsed && <span className="parent-nav-label truncate">{item.label}</span>}
                      {isSidebarCollapsed && (
                        <div className={`absolute ${isRtl ? 'right-[calc(100%+10px)]' : 'left-[calc(100%+10px)]'} hidden group-hover:block bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none`}>
                          {item.label}
                        </div>
                      )}
                    </button>
                  ))}
                </nav>

                <div className="p-4 md:p-6 mt-auto">
                  <button
                    onClick={() => signOutWithCleanup()}
                    title={isSidebarCollapsed ? t("logout") : undefined}
                    className={`parent-nav-logout w-full flex ${isSidebarCollapsed ? 'justify-center px-0' : 'items-center gap-3 px-4 md:px-5'} py-3 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm`}
                  >
                    <LogOut size={isSidebarCollapsed ? 24 : 20} className="shrink-0 parent-nav-icon" />
                    {!isSidebarCollapsed && <span>{t("logout")}</span>}
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-transparent print:overflow-visible print:h-auto print:block">
        <header className="parent-app-header sticky top-0 z-[var(--sx-z-header)] transition-colors print:hidden">
          <div className="px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                  className="parent-icon-btn hidden lg:flex shrink-0 bg-[#F7F8FA]"
                  aria-label={isRtl ? "القائمة" : "Menu"}
                >
                  <Menu size={20} />
                </button>
                {activeTab !== "home" && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleBack}
                    className="parent-icon-btn shrink-0 bg-[#F7F8FA]"
                    aria-label={isRtl ? "رجوع" : "Back"}
                  >
                    <ArrowRight
                      size={18}
                      className={isRtl ? "" : "rotate-180"}
                    />
                  </motion.button>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#0B2345]/50 uppercase tracking-wide">
                    {t("parentWelcome")}
                  </p>
                  <p className="text-sm font-black text-[#0B2345] dark:text-white truncate max-w-[140px] sm:max-w-xs">
                    {profile?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <LanguageToggle />
                  <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="parent-icon-btn text-rose-500"
                  aria-label={t("logout")}
                >
                  <LogOut size={18} />
                </button>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`parent-icon-btn ${showNotifications ? "bg-[#D4AF37] text-[#0B2345]" : "bg-[#0B2345] text-[#D4AF37]"}`}
                    aria-label={isRtl ? "الإشعارات" : "Notifications"}
                  >
                    <Bell size={18} />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -top-1 -end-1 min-w-[1.1rem] h-[1.1rem] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {notifications.filter((n) => !n.read).length > 9 ? "9+" : notifications.filter((n) => !n.read).length}
                      </span>
                    )}
                  </button>
                {showNotifications && (
                  <NotificationCenter
                    onClose={() => setShowNotifications(false)}
                    activeTabSetter={setActiveTab}
                    userRole="parent"
                  />
                )}
              </div>
            </div>
          </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-3 px-4 hide-scrollbar">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`parent-child-pill ${selectedStudent?.id === s.id ? "parent-child-pill--active" : ""}`}
                aria-label={s.name}
                aria-current={selectedStudent?.id === s.id ? "true" : undefined}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-white/20 flex items-center justify-center">
                  {s.photoUrl ? (
                    <img src={s.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[10px] font-black">{s.name[0]}</span>
                  )}
                </div>
                <span className="truncate max-w-[5rem]">{s.name}</span>
              </button>
            ))}
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="parent-child-pill border-dashed border-[#D4AF37]/50 text-[#0B2345]"
              aria-label={t("linkStudent")}
            >
              <Users size={14} />
              {t("linkStudent")}
            </button>
          </div>
        </header>

        <main className={`parent-app-main flex-1 flex flex-col print:overflow-visible min-h-0 ${activeTab === 'chat' ? 'overflow-hidden h-full pb-0 lg:pb-0' : 'overflow-y-auto custom-scrollbar pb-28 lg:pb-10'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className={activeTab === "chat" ? "p-0 h-full w-full flex flex-col min-h-0 overflow-hidden" : "w-full p-4 md:p-8 space-y-4 md:space-y-6 flex flex-col max-w-7xl mx-auto sx-fade-in"}
              {...pageTransitionProps(activeTab === "chat")}
            >
              {activeTab === "home" && (
                <ParentHomeView
                  isRtl={isRtl}
                  language={language}
                  t={t}
                  students={students}
                  selectedStudent={selectedStudent}
                  onSelectStudent={setSelectedStudent}
                  schoolInfo={schoolInfo}
                  onAddStudent={() => setShowAddStudentModal(true)}
                  linkStudentLabel={t("linkStudent")}
                  studentGrades={studentGrades}
                  loadingGrades={loadingGrades}
                  homework={homework}
                  announcements={announcements}
                  attendanceSummary={attendanceSummary}
                  installmentBanners={installmentBanners}
                  tuitionEscalationAlert={tuitionEscalationAlert}
                  onDismissBanner={dismissInstallmentBanner}
                  onNavigate={navigateToTab}
                  onDeleteHomework={(id, title) => handleDeleteRecord("homework", id, title)}
                  showDismissal={allItems.some((item) => item.id === "dismissal")}
                  behaviorPreview={
                    selectedStudent && behaviorReports[selectedStudent.id]?.[0]
                      ? behaviorReports[selectedStudent.id][0]
                      : null
                  }
                />
              )}

              {activeTab === "behavior" && (
                <div className="space-y-4 md:space-y-6">
                  <div className="flex flex-col gap-1 px-1 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h2 className="text-lg font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle size={18} />
                      {t("behaviorLogs")}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                      {t("behaviorHistory")}
                    </p>
                  </div>

                  {students.map((student) => {
                    const studentReports = behaviorReports[student.id] || [];
                    const isEnabled =
                      notificationPrefs[student.id]?.behavior !== false;

                    return (
                      <div key={student.id} className="space-y-3">
                        <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-lg shadow-sm border border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded shrink-0 bg-white/10 flex items-center justify-center font-bold text-sm">
                              {student.name?.[0]}
                            </div>
                            <div className="text-right">
                              <h3 className="font-bold text-sm leading-tight">{student.name}</h3>
                              <p className="text-[10px] font-mono text-white/50">
                                {student.id}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
                            <AlertTriangle
                              size={12}
                              className="text-white/40"
                            />
                            <span className="text-[10px] font-mono font-bold tracking-wider">
                              {studentReports.length} {t("notesCount")}
                            </span>
                          </div>
                        </div>

                        {!isEnabled && (
                          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 rounded-lg flex items-center gap-2.5">
                            <AlertTriangle
                              className="text-amber-500"
                              size={16}
                            />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-bold uppercase tracking-widest">
                              {t("notificationsOff")}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                          {studentReports.length > 0 ? (
                            studentReports.map((report) => (
                              <div
                                key={report.id}
                                className={`p-4 rounded-lg border transition-all ${
                                  report.type === "positive"
                                    ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50"
                                    : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5 dark:border-white/5">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-6 h-6 flex items-center justify-center rounded ${
                                        report.type === "positive"
                                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {report.type === "positive" ? (
                                        <CheckCircle size={12} />
                                      ) : (
                                        <AlertTriangle size={12} />
                                      )}
                                    </div>
                                    <span
                                      className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
                                        report.type === "positive"
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {report.type === "positive"
                                        ? t("positiveBehavior")
                                        : t("warningBehavior")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-slate-500 font-mono font-bold">
                                      {report.createdAt?.seconds
                                        ? new Date(
                                            report.createdAt.seconds * 1000,
                                          ).toLocaleDateString()
                                        : ""}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 leading-relaxed text-right">
                                  {report.description}
                                </p>
                                <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between opacity-70">
                                  <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                    {t("deliveredBy")}: {report.authorName}
                                  </span>
                                  <div className="flex items-center gap-1 text-[9px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                                    <Calendar size={10} />
                                    <span>
                                      {report.createdAt?.seconds
                                        ? new Date(
                                            report.createdAt.seconds * 1000,
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : ""}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                                <MessageSquare size={32} />
                              </div>
                              <p className="text-slate-400 font-bold text-sm">
                                {t("noBehavior")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "dismissal" &&
                allItems.some((item) => item.id === "dismissal") && (
                <ParentDismissalTab
                  students={students}
                  selectedStudent={selectedStudent}
                  isRtl={isRtl}
                />
              )}

              {activeTab === "homework" && (
                <ParentHomeworkView
                  isRtl={isRtl}
                  t={t}
                  homework={homework}
                  onDelete={(id, title) => handleDeleteRecord("homework", id, title)}
                />
              )}

              {activeTab === "schedules" && (
                <ParentSchedules selectedStudent={selectedStudent} />
              )}

              {activeTab === "id_cards" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="text-right">
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white font-display">
                        {isRtl ? "بطاقة الهوية والبيانات الشخصية" : "Student ID Card & Profile"}
                      </h2>
                      <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-1">
                        {isRtl 
                          ? `إدارة وتعديل بيانات الاتصال المعروضة بالهوية للطالب: ${selectedStudent?.name}`
                          : `Manage and edit contact details shown on the ID card for: ${selectedStudent?.name}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: ID Card Preview Container */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                      <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-4 tracking-wider uppercase text-center w-full">
                        {isRtl ? "معاينة بطاقة الهوية الذكية" : "Smart ID Card Preview"}
                      </h3>

                      <div className="w-full max-w-sm flex items-center justify-center p-6 bg-slate-100/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
                        {idCards[selectedStudent?.id] ? (
                          <div className="w-full scale-100">
                            <StudentCard
                              student={selectedStudent}
                              cardData={idCards[selectedStudent.id]}
                              isRtl={isRtl}
                              template={idCardTemplate}
                            />
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 dark:text-slate-500 py-12 px-6 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800/80 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 shadow-sm border border-slate-100 dark:border-slate-700">
                              <ShieldAlert size={32} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-600 dark:text-slate-300">
                                {isRtl ? "لم يتم إصدار بطاقة هوية بعد" : "No ID card issued yet"}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                                {isRtl 
                                  ? "المرشد لم يصمّم هوية لهذا الطالب بعد، ولكن يمكنك إدخال بيانات ولي الأمر أدناه مسبقاً."
                                  : "The administration has not yet designed an ID card, but you can enter your contact details below in advance."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Contact Details Form Editor */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                      <div className="flex items-start gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-3xl text-right">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                          <Sparkles size={18} className="animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-bold text-indigo-950 dark:text-indigo-300 text-sm">
                            {isRtl ? "تحكّم كامل في بيانات الهوية" : "Full Control of ID card details"}
                          </h4>
                          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed mt-0.5 font-semibold">
                            {isRtl 
                              ? "يمكنك تعديل بيانات هاتفك وبريدك الإلكتروني وعنوان السكن هنا، لتنعكس فوراً على معاينة الهوية والرمز البريدي (QR) المطبوع لسلامة الطالب."
                              : "Update your phone number, email, and residence address to update the printed ID card preview and scanned QR code for student safety."}
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleUpdateContactInfo} className="space-y-5">
                        {/* Parent Phone Input */}
                        <div className="space-y-1.5 text-right">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {isRtl ? "رقم هاتف ولي الأمر" : "Parent Phone Number"}
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                              <Phone size={16} />
                            </div>
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              placeholder={isRtl ? "مثال: 07701234567" : "e.g., +9647701234567"}
                              className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono tracking-wide"
                              required
                            />
                          </div>
                        </div>

                        {/* Parent Email Input */}
                        <div className="space-y-1.5 text-right">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {isRtl ? "البريد الإلكتروني لولي الأمر" : "Parent Email Address"}
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                              <Mail size={16} />
                            </div>
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder={isRtl ? "مثال: parent@example.com" : "e.g., parent@example.com"}
                              className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                              required
                            />
                          </div>
                        </div>

                        {/* Residence Address Input */}
                        <div className="space-y-1.5 text-right">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {isRtl ? "عنوان السكن الحالي" : "Current Residence Address"}
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                              <MapPin size={16} />
                            </div>
                            <input
                              type="text"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              placeholder={isRtl ? "المحافظة، المنطقة، أقرب نقطة دالة" : "City, District, Landmark"}
                              className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                              required
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isUpdatingCard}
                          className="w-full py-4 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/10 cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-98 disabled:opacity-50"
                        >
                          {isUpdatingCard ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-slate-900 border-t-transparent" />
                          ) : (
                            <Save size={18} />
                          )}
                          <span>
                            {isUpdatingCard 
                              ? (isRtl ? "جاري الحفظ والتحديث..." : "Saving & Updating...") 
                              : (isRtl ? "حفظ وتحديث بيانات الهوية" : "Save & Update ID Card")}
                          </span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "advanced_reports" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display px-2 text-right">
                    {isRtl ? "التقارير المتقدمة" : "Advanced Reports"}
                  </h2>
                  <div className="space-y-4">
                    {advancedReports.length > 0 ? (
                      advancedReports.map((report) => (
                        <div
                          key={report.id}
                          className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-right border-l-4 border-l-indigo-600"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                              {isRtl ? "تقرير متقدم" : "Advanced Report"}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold transition-colors">
                                {report.teacherName?.[0] || "A"}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">
                                  {t("deliveredBy")}
                                </p>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {report.teacherName || t("admin")}
                                </p>
                              </div>
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                            {report.title}
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                            {report.content}
                          </p>
                          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-bold">
                              {report.createdAt?.seconds
                                ? new Date(
                                    report.createdAt.seconds * 1000,
                                  ).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
                        <BarChart3
                          size={40}
                          className="mx-auto mb-3 opacity-20"
                        />
                        <p className="text-slate-400 dark:text-slate-500 italic">
                          {isRtl
                            ? "لا توجد تقارير متقدمة"
                            : "No advanced reports"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display px-2 text-right">
                    {t("evaluationReports")}
                  </h2>
                  <div className="space-y-4">
                    {teacherReports.length > 0 ? (
                      teacherReports.map((report) => (
                        <div
                          key={report.id}
                          className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-right border-l-4 border-l-indigo-600"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                              {report.subject && !isRedactedCredentialValue(report.subject)
                                ? report.subject
                                : report.teacherName || "—"}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-bold">
                                {report.createdAt?.seconds
                                  ? new Date(
                                      report.createdAt.seconds * 1000,
                                    ).toLocaleDateString()
                                  : "الآن"}
                              </span>
                            </div>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-bold mb-4">
                            {report.content}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                              {report.teacherName?.[0]}
                            </div>
                            <p className="text-xs text-slate-500">
                              {t("reportBy")}: {t("mr")}. {report.teacherName}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
                        <FileText
                          size={40}
                          className="mx-auto mb-3 opacity-20"
                        />
                        <p className="text-slate-400 dark:text-slate-500 italic">
                          {t("noReports")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "market" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                      {t("schoolStore")}
                    </h2>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest">
                      {selectedStudent?.schoolName || t("officialStore")}
                    </span>
                  </div>

                  {marketLoading ? (
                    <div className="py-20 flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-slate-900"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {marketItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col group"
                        >
                          <div className="w-full aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 flex items-center justify-center text-slate-300 dark:text-slate-600 transition-colors group-hover:bg-slate-100 dark:group-hover:bg-slate-700 relative overflow-hidden">
                            {getProductImageUrl(item) ? (
                              <img
                                src={getProductImageUrl(item) || undefined}
                                alt={getProductName(item)}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ShoppingBag size={40} strokeWidth={1} />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                              {getProductName(item)}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                              {item.description || t("noProductDescription")}
                            </p>
                          </div>
                          <div className="mt-auto space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm">
                                {item.price?.toLocaleString()} د.ع
                              </p>
                              <span className="text-[9px] font-bold text-slate-400">
                                {t("remaining")}: {getProductStock(item)}
                              </span>
                            </div>
                            <button
                              onClick={() => setPurchaseModal(item)}
                              className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                            >
                              {t("buyNow")}
                            </button>
                          </div>
                        </div>
                      ))}
                      {marketItems.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                          <ShoppingBag
                            size={40}
                            className="mx-auto mb-3 opacity-20"
                          />
                          <p className="text-slate-400 text-sm">
                            {t("noProductsInStore")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "grades" && (
                <ParentGradesView
                  isRtl={isRtl}
                  t={t}
                  studentName={selectedStudent?.name}
                  grades={studentGrades}
                  loading={loadingGrades}
                />
              )}

              {activeTab === "tuition" && (
                <ParentTuitionView
                  isRtl={isRtl}
                  t={t}
                  language={language}
                  student={selectedStudent}
                  payments={payments}
                  installments={installments}
                  escalation={tuitionEscalationAlert}
                />
              )}

              {activeTab === "chat" && <ParentChatTab />}

              {activeTab === "inbox" && (
                <ParentInboxView isRtl={isRtl} t={t} announcements={announcements} />
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-2 px-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display text-right">
                      {t("notificationSettings")}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-right font-medium">
                      {t("personalizeNotifications")}
                    </p>
                  </div>

                  <div className="space-y-8 pb-10">
                    {students.map((student) => {
                      const prefs = notificationPrefs[student.id] || {
                        grades: true,
                        behavior: true,
                        attendance: true,
                        announcements: true,
                        payments: true,
                      };

                      const config = [
                        {
                          id: "grades",
                          label: t("examResultsLabel"),
                          icon: BookOpen,
                        },
                        {
                          id: "behavior",
                          label: t("behaviorReportsLabel"),
                          icon: MessageSquare,
                        },
                        {
                          id: "attendance",
                          label: t("attendanceLabel"),
                          icon: Calendar,
                        },
                        {
                          id: "announcements",
                          label: t("announcementsLabel"),
                          icon: Bell,
                        },
                        {
                          id: "payments",
                          label: t("paymentRemindersLabel"),
                          icon: Wallet,
                        },
                      ];

                      return (
                        <div
                          key={student.id}
                          className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
                        >
                          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                                {student.name?.[0]}
                              </div>
                              <div className="text-right">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                  {student.name}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                  {student.class} - {student.registrationNumber}
                                </p>
                              </div>
                            </div>
                            <Users size={18} className="text-slate-300" />
                          </div>

                          <div className="p-6 space-y-4">
                            {config.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2.5 rounded-xl transition-all duration-500 ${prefs[item.id] ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 scale-110 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
                                  >
                                    <item.icon size={18} />
                                  </div>
                                  <span
                                    className={`text-sm font-bold transition-colors duration-300 ${prefs[item.id] ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`}
                                  >
                                    {item.label}
                                  </span>
                                </div>

                                <button
                                  disabled={isSavingPrefs === student.id}
                                  onClick={() =>
                                    togglePreference(student.id, item.id)
                                  }
                                  className={`w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner ${prefs[item.id] ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                                  dir="ltr"
                                >
                                  <motion.div
                                    animate={{ x: prefs[item.id] ? 24 : 4 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 30,
                                    }}
                                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          {activeTab !== "chat" && <GlobalFooter compact />}
        </main>

        {/* Floating/Sticky Mobile Navigation Dock for Parents */}
        <MobileNavigationDock
          menuItems={allItems}
          activeTab={activeTab}
          setActiveTab={(tabId) => {
            setActiveTab(tabId);
          }}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notificationsCount={badgeTotalUnread}
          isRtl={isRtl}
          menuSurface="light"
          hidden={activeTab === "chat"}
        />
      </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}

      {/* Purchase Confirmation Modal */}
      <AnimatePresence>
        {purchaseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800"
            >
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-6 overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner">
                {getProductImageUrl(purchaseModal) ? (
                  <img
                    src={getProductImageUrl(purchaseModal) || undefined}
                    alt={getProductName(purchaseModal)}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ShoppingBag size={32} />
                )}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center font-display">
                {t("confirmPurchase")}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">
                {t("purchaseItem")}{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  "{getProductName(purchaseModal)}"
                </span>{" "}
                لـ {selectedStudent?.name}
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl mb-8 space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">{t("productPrice")}</span>
                  <span className="text-slate-900 dark:text-white">
                    {purchaseModal.price?.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">{t("quantity")}</span>
                  <span className="text-slate-900 dark:text-white">1</span>
                </div>
                <div className="h-px bg-slate-200 dark:border-slate-700 my-2"></div>
                <div className="flex justify-between text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                  <span>{t("total")}</span>
                  <span>{purchaseModal.price?.toLocaleString()} د.ع</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  disabled={isPurchasing}
                  onClick={() => handlePurchase(purchaseModal)}
                  className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  {isPurchasing ? t("executing") : t("confirmPurchaseBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseModal(null)}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  {t("cancel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student / Linking Modal */}
      <AnimatePresence>
        {showAddStudentModal && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-6">
                <Users size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center font-display">
                {t("linkStudent")}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-8">
                {t("linkStudentDesc")}
              </p>

              <form onSubmit={handleLinkStudent} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 mr-1">
                    {t("registrationNoLabel")}
                  </label>
                  <input
                    required
                    type="text"
                    value={linkingRegNumber}
                    onChange={(e) => setLinkingRegNumber(e.target.value)}
                    placeholder={t("placeholderRegNo")}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 rounded-2xl outline-none transition-all font-mono text-center text-lg font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-bold">
                    {t("disclaimerLostId")}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLinking}
                    className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLinking ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 animate-spin rounded-full"></div>
                        {t("linking")}
                      </>
                    ) : (
                      t("confirmLinking")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStudentModal(false);
                      setLinkingRegNumber("");
                    }}
                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all font-sans"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

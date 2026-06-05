import { useState, useEffect } from "react";
import React from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  limit,
  arrayUnion,
  deleteDoc,
  getDoc,
  or,
  and,
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { GlobalFooter } from "../components/GlobalFooter";
import { NotificationCenter } from "../components/NotificationCenter";
import { MobileNavigationDock } from "../components/MobileNavigationDock";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import SolarLoading from "../components/SolarLoading";
import ParentChatTab from "./ParentChatTab";
import ParentSchedules from "./parent/ParentSchedules";
import StudentCard from "../components/admin/idcards/StudentCard";
import { IdCardTemplate } from "../types/idCardTemplate";
import { Phone, Mail, MapPin, Save, Sparkles, ShieldAlert, ExternalLink } from "lucide-react";

import { useLanguage } from "../lib/LanguageContext";
import { useSystemConfig } from "../lib/SystemConfigContext";
import SchoolixLogo from "../components/SchoolixLogo";

export default function ParentDashboard() {
  const { profile, schoolData } = useAuth();
  const { t, isRtl, language, setLanguage } = useLanguage();
  const { config } = useSystemConfig();
  const [activeTab, setActiveTab] = useState("home");
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);

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
      setActiveTab("home");
    }
  };
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState({
    absent: 0,
    late: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
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
    const isParentOrAdmin = [
      "parent",
      "admin",
      "superadmin",
      "staff",
      "teacher",
    ].includes(profile.role || "");
    if (!isParentOrAdmin) {
      setStudentsLoading(false);
      return;
    }
    const path = "students";
    const q = query(
      collection(db, path),
      where("parentIds", "array-contains", profile.uid),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];
        setStudents(data);

        if (data.length > 0) {
          if (!selectedStudent) {
            setSelectedStudent(data[0]);
          } else {
            // Keep current selected student updated with latest data from the students list
            const updated = data.find(
              (s) => (s as any).id === selectedStudent.id,
            );
            if (updated) {
              // Only update if something actually changed to avoid effect loops
              if (
                updated.name !== selectedStudent.name ||
                updated.class !== selectedStudent.class ||
                updated.schoolId !== selectedStudent.schoolId
              ) {
                setSelectedStudent(updated);
              }
            } else {
              // Selected student was removed from the list
              setSelectedStudent(data[0]);
            }
          }
        } else {
          setSelectedStudent(null);
        }
        setStudentsLoading(false);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          "ParentDashboard:students",
        );
        setStudentsLoading(false);
      },
    );
    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    if (!profile?.uid || !auth.currentUser) return;
    const isParentOrAdmin = [
      "parent",
      "admin",
      "superadmin",
      "staff",
      "teacher",
    ].includes(profile.role || "");
    if (!isParentOrAdmin || students.length === 0) return;

    const prefsPath = "notification_preferences";
    const q = query(
      collection(db, prefsPath),
      where("parentId", "==", profile.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const prefs: Record<string, any> = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          prefs[data.studentId] = { id: doc.id, ...data };
        });
        setNotificationPrefs(prefs);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          "ParentDashboard:notification_preferences",
        );
      },
    );

    return unsubscribe;
  }, [profile, students]);

  useEffect(() => {
    if (!profile?.uid || !auth.currentUser) return;
    const isParentOrAdmin = [
      "parent",
      "admin",
      "superadmin",
      "staff",
      "teacher",
    ].includes(profile.role || "");
    if (!isParentOrAdmin || students.length === 0) return;

    const reportsPath = "behavior_reports";
    const studentIds = students?.map((s) => s.id) || [];

    if (!studentIds || studentIds.length === 0) return;

    const parentEmail =
      auth.currentUser?.email?.toLowerCase() ||
      profile?.email?.toLowerCase() ||
      "";
    const q = query(
      collection(db, reportsPath),
      where("studentId", "in", studentIds),
      where("parentIds", "array-contains", profile.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reports: Record<string, any[]> = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (!reports[data.studentId]) reports[data.studentId] = [];
          reports[data.studentId].push({ id: doc.id, ...data });
        });

        // Sort reports by date
        Object.keys(reports).forEach((studentId) => {
          reports[studentId].sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          });
        });

        setBehaviorReports(reports);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          "ParentDashboard:behavior_reports",
        );
      },
    );

    return unsubscribe;
  }, [profile, students]);

  useEffect(() => {
    if (!selectedStudent?.id || !auth.currentUser || !profile?.uid) return;
    const isParentOrAdmin = [
      "parent",
      "admin",
      "superadmin",
      "staff",
      "teacher",
    ].includes(profile?.role || "");
    if (!isParentOrAdmin) return;

    let unsubs: (() => void)[] = [];

    try {
      setLoadingGrades(true);
      setMarketLoading(true);

      const currentClassId = selectedStudent.classId || selectedStudent.class;

      // 1. Grades
      const gradesQ = query(
        collection(db, "grades"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
        limit(50)
      );
      unsubs.push(onSnapshot(gradesQ, snap => {
        const allGrades = snap.docs.map((doc) => {
          const data = doc.data();
          const score = Number(data.score ?? 0);
          const maxScore = Number(data.maxScore || 100);
          return {
            id: doc.id,
            subject: data.subject,
            score, maxScore,
            percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
            term: data.term || "",
            createdAt: data.createdAt,
          };
        }).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setStudentGrades(allGrades);
        setLoadingGrades(false);
      }));

      // 2. Attendance
      const attendanceQ = query(
        collection(db, "attendance"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("class", "==", currentClassId || "none"),
        limit(50)
      );
      unsubs.push(onSnapshot(attendanceQ, snap => {
        let absentCount = 0;
        let lateCount = 0;
        snap.docs.forEach((doc) => {
          const records = doc.data().records || {};
          if (records[selectedStudent.id] === "absent") absentCount++;
          if (records[selectedStudent.id] === "late") lateCount++;
        });
        setAttendanceSummary({ absent: absentCount, late: lateCount });
      }));

      // 3. Announcements
      const annQ = query(
        collection(db, "announcements"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("target", "in", ["all", "parents"]),
        limit(20)
      );
      const indQ = query(
        collection(db, "announcements"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("target", "==", "individual"),
        where("targetStudentId", "==", selectedStudent.id),
        limit(10)
      );
      
      let allAnnLatest: any[] = [];
      let allIndLatest: any[] = [];
      const updateAnn = () => {
        const allAnn = [...allAnnLatest, ...allIndLatest].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAnnouncements(Array.from(new Map(allAnn.map((item) => [item.id, item])).values()));
      };
      
      unsubs.push(onSnapshot(annQ, snap => {
        allAnnLatest = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateAnn();
      }));
      unsubs.push(onSnapshot(indQ, snap => {
        allIndLatest = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateAnn();
      }));

      // 4. Payments
      const paymentsQ = query(
        collection(db, "payments"),
        where("studentId", "==", selectedStudent.id),
      );
      unsubs.push(onSnapshot(paymentsQ, snap => {
        setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      // 5. Installments
      const installmentsQ = query(
        collection(db, "installments"),
        where("studentId", "==", selectedStudent.id),
      );
      unsubs.push(onSnapshot(installmentsQ, snap => {
        setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0)) as any);
      }));

      // 6. Market
      const marketQ = query(
        collection(db, "marketplace"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("status", "==", "active"),
      );
      unsubs.push(onSnapshot(marketQ, snap => {
        setMarketItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
        setMarketLoading(false);
      }));

      // 7. Notifications
      const notificationsQ = query(
        collection(db, "notifications"),
        where("userId", "==", profile.uid),
        limit(50)
      );
      unsubs.push(onSnapshot(notificationsQ, snap => {
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      // 8. Homework
      if (currentClassId) {
        const hwQ = query(
          collection(db, "homework"),
          where("schoolId", "==", selectedStudent.schoolId),
          where("classId", "==", currentClassId),
          limit(30)
        );
        unsubs.push(onSnapshot(hwQ, snap => {
          setHomework(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((hw: any) => !(hw.hiddenFor || []).includes(profile?.uid))
            .sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
        }));
      }

      // 9. Reports
      const repQ = query(
        collection(db, "teacher_reports"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("target", "in", ["parents", "both"]),
        where("parentIds", "array-contains", profile.uid),
        limit(20)
      );
      unsubs.push(onSnapshot(repQ, snap => {
        setTeacherReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      const advRepQ = query(
        collection(db, "advanced_reports"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
        limit(20)
      );
      unsubs.push(onSnapshot(advRepQ, snap => {
         setAdvancedReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      // 10. Id Cards
      const idCardsQ = query(
        collection(db, "id_cards"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
        limit(1)
      );
      unsubs.push(onSnapshot(idCardsQ, snap => {
        const cardsObj: Record<string, any> = {};
        snap.docs.forEach((doc) => {
          cardsObj[doc.data().studentId] = { id: doc.id, ...doc.data() };
        });
        setIdCards(cardsObj);
      }));

      // Fetch template once
      getDoc(doc(db, "schools", selectedStudent.schoolId, "settings", "idCardTemplate"))
        .then(templateSnap => {
          if (templateSnap.exists()) {
            setIdCardTemplate(templateSnap.data() as any);
          } else {
            setIdCardTemplate(null);
          }
        })
        .catch(err => console.warn("Could not fetch idCardTemplate", err));

    } catch (error) {
      console.error("Error setting up ParentDashboard listeners:", error);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [selectedStudent, profile?.uid]);

  const allItems = [
    { id: "home", label: t("home"), icon: Home },
    {
      id: "homework",
      label: t("homework"),
      icon: BookOpen,
      badge: homework.length,
    },
    { id: "grades", label: t("grades"), icon: Star },
    { id: "schedules", label: "الجدول الأسبوعي", icon: Calendar },
    { id: "tuition", label: t("tuition"), icon: Wallet },
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
      label: isRtl ? "هويات الطالب" : "ID Cards",
      icon: ShieldCheck,
      badge: selectedStudent && idCards[selectedStudent.id] ? 1 : 0,
    },
    { id: "market", label: t("market"), icon: ShoppingBag },
    { id: "chat", label: t("chat") || "الدردشة", icon: MessageSquare },
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
    }
    return true;
  });

  const handlePurchase = async (item: any) => {
    if (!profile?.uid || !selectedStudent?.id) return;

    // Check stock before proceeding
    if (item.stock <= 0) {
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
            name: item.itemName,
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

      const docId = currentPrefs.id || `${profile.uid}_${studentId}`;

      // Remove id from object before saving to firestore if it was there
      const { id, ...saveData } = newPrefs as any;

      if (currentPrefs.id) {
        await updateDoc(
          doc(db, "notification_preferences", currentPrefs.id),
          saveData,
        );
      } else {
        // Use setDoc with a deterministic ID or addDoc.
        // Blueprint didn't specify ID pattern, let's use addDoc to be safe with rules unless we update rules for setDoc.
        // Actually updateDoc was allowed. Let's try addDoc if no ID exists.
        await addDoc(collection(db, "notification_preferences"), saveData);
      }

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
      await auth.signOut();
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
          className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center"
          dir="rtl"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-50 dark:bg-slate-800 text-blue-600 mb-6 shadow-sm overflow-hidden">
            {config.appLogo && config.appLogo !== "/icon.svg" ? (
              <img
                src={config.appLogo}
                alt={config.appName}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <SchoolixLogo size={52} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isRtl
              ? `مرحباً بك في ${config.appName}`
              : `Welcome to ${config.appName}`}
          </h1>
          <p className="text-gray-500 mb-8">{t("noLinkedStudents")}</p>
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
              onClick={() => auth.signOut()}
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
        className="h-[100dvh] overflow-hidden bg-transparent flex font-sans transition-colors duration-300 print:overflow-visible print:h-auto print:block print:pb-0"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden print:hidden"
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
              className={`bg-white dark:bg-slate-900 flex flex-col shrink-0 fixed inset-y-0 ${isRtl ? "right-0 border-l rounded-l-[2rem] lg:rounded-none" : "left-0 border-r rounded-r-[2rem] lg:rounded-none"} z-50 lg:relative border-slate-200 dark:border-slate-800 transition-colors shadow-2xl lg:shadow-none overflow-visible print:hidden pt-[env(safe-area-inset-top,0px)]`}
            >
              <div className="h-full flex flex-col overflow-hidden w-full">
                <div className={`p-6 flex ${isSidebarCollapsed ? 'justify-center border-b border-transparent' : 'items-center gap-3 border-b border-slate-100 dark:border-slate-800'} pb-6`}>
                  {config.appLogo && config.appLogo !== "/icon.svg" ? (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <img
                        src={config.appLogo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <SchoolixLogo size={isSidebarCollapsed ? 38 : 44} />
                  )}
                  {!isSidebarCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0" dir={isRtl ? "rtl" : "ltr"}>
                      <h2 className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                         {t("parentWelcome")}
                      </h2>
                      <div className="flex flex-col">
                        <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold truncate">
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
                      className={`w-full flex ${isSidebarCollapsed ? 'justify-center px-0' : 'items-center gap-3.5 px-4 md:px-5'} py-3.5 md:py-4 rounded-xl md:rounded-2xl transition-all font-bold text-sm active:scale-95 group relative ${
                        activeTab === item.id
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg"
                          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      dir={isRtl ? "rtl" : "ltr"}
                    >
                      <div className="relative shrink-0">
                        <item.icon size={isSidebarCollapsed ? 24 : 20} />
                        {item.badge > 0 && (
                           <span className="absolute -top-1 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-mono font-black rounded flex items-center justify-center border border-white dark:border-slate-900 shadow-sm">
                             {item.badge}
                           </span>
                        )}
                      </div>
                      {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
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
                    onClick={() => auth.signOut()}
                    title={isSidebarCollapsed ? t("logout") : undefined}
                    className={`w-full flex ${isSidebarCollapsed ? 'justify-center px-0' : 'items-center gap-3 px-4 md:px-5'} py-3 md:py-4 rounded-xl md:rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all font-bold text-sm`}
                  >
                    <LogOut size={isSidebarCollapsed ? 24 : 20} className="shrink-0" />
                    {!isSidebarCollapsed && <span>{t("logout")}</span>}
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-transparent print:overflow-visible print:h-auto print:block">
        {/* Engineered Mobile Header */}
        <header className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors print:hidden">
          <div className="px-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3">
            <div className="flex items-center justify-between mb-4">
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
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all shadow-sm shrink-0 hidden lg:block"
                >
                  <Menu
                    size={22}
                    className={
                      (!isSidebarOpen && window.innerWidth < 1024) || isSidebarCollapsed
                        ? "rotate-90 transition-transform"
                        : "transition-transform"
                    }
                  />
                </button>
                {activeTab !== "home" && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleBack}
                    className="flex items-center justify-center w-8 h-8 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 transition-all shadow-sm active:scale-95 group"
                  >
                    <ArrowRight
                      size={16}
                      className={`transition-transform ${isRtl ? "group-hover:translate-x-0.5" : "rotate-180 group-hover:-translate-x-0.5"}`}
                    />
                  </motion.button>
                )}
                <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-mono font-bold text-sm sm:text-lg shadow-inner ring-1 ring-white/10">
                  {profile?.name?.[0]}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className={`text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 mb-0.5 ${isRtl ? "" : "uppercase tracking-wider"}`}>
                    {t("parentWelcome")}
                  </h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate max-w-[120px] md:max-w-xs">
                    {profile?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-11 h-11 shrink-0 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center bg-white dark:bg-slate-800 text-red-500 hover:text-red-600 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 shadow-sm active:scale-95"
                  title={t("logout")}
                >
                  <LogOut size={18} />
                </button>

                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`w-11 h-11 shrink-0 rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center relative group active:scale-95 ${
                      showNotifications
                        ? "bg-[#D4A64A] border-[#D4A64A] text-[#0B2345] shadow-lg shadow-[#D4A64A]/20"
                        : "bg-[#0B2345] border-[#D4A64A]/30 text-[#D4A64A] hover:bg-[#D4A64A] hover:text-[#0B2345] hover:border-[#D4A64A] border"
                    }`}
                  >
                    <Bell size={18} className="transition-transform duration-300 group-hover:scale-110" />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-[#0B2345] rounded-full text-[10px] font-black text-white flex items-center justify-center">
                        {notifications.filter((n) => !n.read).length > 9 ? '9+' : notifications.filter((n) => !n.read).length}
                      </span>
                    )}
                  </button>


                {/* Notifications Center Modal */}
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
          {/* Close the px-4 pt-5 pb-3 div */}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar mt-2 px-4">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className={`py-1.5 px-3 rounded text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-2.5 shrink-0 border ${
                  selectedStudent?.id === s.id
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-md translate-y-[-1px]"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-[3px] flex items-center justify-center shrink-0 overflow-hidden ${selectedStudent?.id === s.id ? "bg-white/20" : "bg-white shadow-sm ring-1 ring-slate-200/50"}`}
                >
                  {s.photoUrl ? (
                    <img
                      src={s.photoUrl || undefined}
                      alt={s.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className={`text-[9px] font-black uppercase ${selectedStudent?.id === s.id ? "text-white" : "text-indigo-600"}`}>
                      {s.name[0]}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[90px]">{s.name}</span>
              </button>
            ))}
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-3 py-1.5 rounded text-xs font-mono font-bold bg-white dark:bg-slate-800 text-indigo-600 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 transition-all flex items-center gap-2 shrink-0 border-dashed"
            >
              <Users size={12} />
              {t("linkStudent")}
            </button>
          </div>
        </header>

        <main className={`flex-1 flex flex-col print:overflow-visible min-h-0 bg-transparent ${activeTab === 'chat' ? 'overflow-hidden h-full pb-20 lg:pb-0' : 'overflow-y-auto custom-scrollbar pb-28 lg:pb-10'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className={activeTab === "chat" ? "p-0 h-full w-full flex flex-col min-h-0 overflow-hidden" : "w-full p-4 md:p-8 space-y-4 md:space-y-6 flex flex-col max-w-7xl mx-auto"}
              initial={{ opacity: 0, y: activeTab === 'chat' ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: activeTab === 'chat' ? 0 : -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "home" && (
                <div className="space-y-4 md:space-y-6">
                  {/* Detailed School Address and Google Maps Location Card */}
                  {schoolInfo && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 md:p-6 rounded-[2rem] bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 transition-all text-right"
                    >
                      <div className="flex items-start gap-4 w-full md:w-auto">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/20">
                          <MapPin size={24} className="animate-bounce" style={{ animationDuration: '3s' }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{isRtl ? 'الموقع الجغرافي للمدرسة' : 'Detailed School Location & Address'}</p>
                          <h3 className="text-lg font-black text-slate-950 dark:text-white mt-1 leading-snug">{schoolInfo.name}</h3>
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                            <p className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-400 font-mono text-xs">{isRtl ? 'العنوان المدرسي:' : 'Address:'}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{schoolInfo.address || (isRtl ? 'غير محدد' : 'Not specified')}</span>
                            </p>
                            {schoolInfo.googleMapsUrl && (
                              <p className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 font-mono text-xs">{isRtl ? 'الموقع التفصيلي:' : 'Location link:'}</span>
                                <a 
                                  href={schoolInfo.googleMapsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-bold"
                                >
                                  {isRtl ? 'خرائط جوجل (Google Maps)' : 'Google Maps'}
                                  <ExternalLink size={11} />
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {schoolInfo.googleMapsUrl && (
                        <a
                          href={schoolInfo.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full md:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-505 text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          <MapPin size={14} />
                          <span>{isRtl ? 'الذهاب إلى خريطة المدرسة التفصيلية' : 'Open Detailed School Google Map'}</span>
                        </a>
                      )}
                    </motion.div>
                  )}

                  {/* Highlight Stats Bento */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                      <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BarChart3 size={12} />
                        {t("generalAverage")}
                      </p>
                      <p className="text-3xl font-mono font-black text-slate-900 dark:text-white leading-none">
                        {studentGrades.length > 0
                          ? Math.round(
                              studentGrades.reduce(
                                (sum, g) => sum + Number(g.score),
                                0,
                              ) / studentGrades.length,
                            )
                          : "--"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                      <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <AlertTriangle size={12} />
                        {t("absenceDays")}
                      </p>
                      <div className="flex items-baseline gap-1.5 leading-none">
                        <span className={`text-3xl font-mono font-black ${attendanceSummary.absent > 3 ? "text-red-500" : "text-slate-900 dark:text-white"}`}>
                          {attendanceSummary.absent}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">{t("day")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Announcements Section */}
                  <section>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h2 className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Bell size={14} />
                        {t("latestAnnouncements")}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                      {announcements.length > 0 ? (
                        announcements.slice(0, 3).map((ann) => (
                          <div
                            key={ann.id}
                            className="bg-slate-900 dark:bg-slate-800 p-4 rounded-lg text-white shadow-sm border border-slate-700 relative overflow-hidden transition-all hover:border-slate-500"
                          >
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                                    {t("from")}:{" "}
                                    {ann.authorName || t("schoolAdmin")}
                                  </p>
                                  {ann.target === "individual" && (
                                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-sm text-[8px] font-mono font-bold uppercase tracking-wider">
                                      {t("privateMessage")}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-mono text-slate-500">
                                  {ann.createdAt?.seconds
                                    ? new Date(
                                        ann.createdAt.seconds * 1000,
                                      ).toLocaleDateString(
                                        language === "ar" ? "ar-IQ" : "en-US",
                                      )
                                    : t("now")}
                                </span>
                              </div>
                              <h3 className="text-sm font-bold mb-1.5 line-clamp-1">
                                {ann.title}
                              </h3>
                              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                                {ann.content}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs font-mono font-bold uppercase text-slate-400">
                          {t("noAnnouncements")}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Recent Homework Section */}
                  <section>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h2 className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <BookOpen size={14} />
                        {t("recentHomework")}
                      </h2>
                      <button
                        onClick={() => setActiveTab("homework")}
                        className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1"
                      >
                        {t("seeAll")} <ArrowRight size={10} className={isRtl ? "rotate-180" : ""} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {homework.length > 0 ? (
                        homework.slice(0, 2).map((hw) => (
                          <div
                            key={hw.id}
                            onClick={() => setActiveTab("homework")}
                            className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition-colors group relative"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700">
                                  <BookOpen size={16} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 mb-1 text-right">
                                    {hw.title}
                                  </h4>
                                  <div className="text-right">
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-mono font-bold uppercase tracking-wider inline-block">
                                      {hw.subject}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto">
                              <p className="text-[10px] font-mono font-bold text-slate-400">
                                {t("deliveryDate")}: <span className="text-indigo-600 dark:text-indigo-400">{hw.dueDate}</span>
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRecord(
                                    "homework",
                                    hw.id,
                                    hw.title,
                                  );
                                }}
                                className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                title={t("delete")}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs font-mono font-bold uppercase text-slate-400">
                          {t("noHomework")}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Behavioral Feed */}
                  <section>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <h2 className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle size={14} />
                        {t("latestBehavior")}
                      </h2>
                    </div>
                    {selectedStudent &&
                    behaviorReports[selectedStudent.id] &&
                    behaviorReports[selectedStudent.id].length > 0 ? (
                      <div
                        onClick={() => setActiveTab("behavior")}
                        className={`p-4 rounded-lg border transition-all cursor-pointer shadow-sm relative overflow-hidden group ${
                          behaviorReports[selectedStudent.id][0].type ===
                          "positive"
                            ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400"
                            : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 hover:border-red-400"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/50 dark:border-white/5">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 flex items-center justify-center rounded ${behaviorReports[selectedStudent.id][0].type === "positive" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-red-500/20 text-red-600 dark:text-red-400"}`}>
                              {behaviorReports[selectedStudent.id][0].type === "positive" ? (
                                <CheckCircle size={12} />
                              ) : (
                                <AlertTriangle size={12} />
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-mono font-bold uppercase tracking-widest ${
                                behaviorReports[selectedStudent.id][0].type ===
                                "positive"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {behaviorReports[selectedStudent.id][0].type ===
                              "positive"
                                ? t("positiveBehavior")
                                : t("warningBehavior")}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">
                            {behaviorReports[selectedStudent.id][0].createdAt
                              ?.seconds
                              ? new Date(
                                  behaviorReports[selectedStudent.id][0]
                                    .createdAt.seconds * 1000,
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right line-clamp-2">
                          {behaviorReports[selectedStudent.id][0].description}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 text-center text-xs font-mono font-bold uppercase text-slate-400">
                        {t("noBehavior")}
                      </div>
                    )}
                  </section>
                </div>
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

              {activeTab === "homework" && (
                <div className="space-y-4 md:space-y-6">
                  <div className="flex flex-col gap-1 px-1 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h2 className="text-lg font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen size={18} />
                      {t("homeworkList")}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {homework.length > 0 ? (
                      homework.map((hw) => (
                        <div
                          key={hw.id}
                          className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm transition-all text-right relative overflow-hidden group hover:border-indigo-300 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800/50">
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                                {hw.subject}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-500 font-mono font-bold">
                                  {t("dueDateLabel")}: <span className="text-red-500 dark:text-red-400">{hw.dueDate}</span>
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRecord(
                                      "homework",
                                      hw.id,
                                      hw.title,
                                    );
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                                  title={t("hide")}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                              {hw.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed whitespace-pre-wrap mb-4">
                              {hw.content}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50 mt-auto opacity-80">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold text-slate-500">
                                {t("deliveredBy")}:{" "}
                                {hw.teacherName || t("teacher")}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-400">
                              {hw.createdAt?.seconds
                                ? new Date(
                                    hw.createdAt.seconds * 1000,
                                  ).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                        <BookOpen
                          size={24}
                          className="mx-auto mb-3 opacity-20"
                        />
                        <p className="text-slate-400 dark:text-slate-500 italic">
                          {t("noHomework")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                              {report.subject}
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
                            {item.image ? (
                              <img
                                src={item.image || undefined}
                                alt={item.itemName}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ShoppingBag size={40} strokeWidth={1} />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                              {item.itemName}
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
                                {t("remaining")}: {item.stock}
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
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                      {t("resultsFor")} {selectedStudent?.name}
                    </h2>
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 transition-colors uppercase tracking-widest">
                      {t("firstSemester")}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {studentGrades.map((grade, idx) => (
                      <div
                        key={`${grade.subject}-${grade.term}-${idx}`}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:scale-[1.02] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 dark:text-slate-500 transition-colors">
                            <BookOpen size={20} />
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {grade.subject}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {grade.term}
                            </span>
                          </div>
                        </div>
                        <div className="text-left flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-2xl font-bold font-display ${grade.score < grade.maxScore * 0.5 ? "text-red-500" : "text-emerald-600"}`}
                            >
                              {grade.maxScore === 100
                                ? `${grade.percentage}%`
                                : `${grade.score} من ${grade.maxScore}`}
                            </span>
                            {grade.maxScore === 100 && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-widest text-left">
                                {t("outOf100")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {studentGrades.length === 0 && (
                      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
                        <p className="text-slate-400 dark:text-slate-500 italic">
                          {t("noGradesFound")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "tuition" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 px-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display text-right">
                      {t("paymentHistory")} & {t("tuition")} -{" "}
                      {selectedStudent?.name}
                    </h2>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-right flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                            <Wallet size={16} />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t("totalFees")}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                          {(
                            selectedStudent?.totalTuition || 0
                          ).toLocaleString()}{" "}
                          <span className="text-xs font-bold text-slate-400">
                            {t("iqd")}
                          </span>
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-right flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center">
                            <CheckCircle size={16} />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t("totalPaid")}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tighter">
                          {payments
                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                            .toLocaleString()}{" "}
                          <span className="text-xs font-bold text-slate-400">
                            {t("iqd")}
                          </span>
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-right flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
                            <ArrowRight size={16} className="rotate-180" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t("remaining")}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-red-600 dark:text-red-400 font-mono tracking-tighter">
                          {(
                            (selectedStudent?.totalTuition || 0) -
                            (selectedStudent?.tuitionBalance || 0)
                          ).toLocaleString()}{" "}
                          <span className="text-xs font-bold text-slate-400">
                            {t("iqd")}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {installments.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 px-2 text-right">
                          {t("upcomingInstallments")}
                        </h3>
                        <div className="space-y-3">
                          {installments.map((inst) => (
                            <div
                              key={inst.id}
                              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                    inst.status === "paid"
                                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600"
                                      : inst.status === "late"
                                        ? "bg-red-50 dark:bg-red-900/30 text-red-600"
                                        : "bg-amber-50 dark:bg-amber-900/30 text-amber-600"
                                  }`}
                                >
                                  {inst.status === "paid" ? (
                                    <CheckCircle size={18} />
                                  ) : inst.status === "late" ? (
                                    <AlertTriangle size={18} />
                                  ) : (
                                    <Calendar size={18} />
                                  )}
                                </div>
                                <div className="text-right">
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                    {t("installmentFor")}{" "}
                                    {inst.dueDate?.seconds
                                      ? new Date(
                                          inst.dueDate.seconds * 1000,
                                        ).toLocaleDateString(
                                          language === "ar" ? "ar-IQ" : "en-US",
                                          { month: "long" },
                                        )
                                      : ""}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                                    {t("dueDateLabel")}:{" "}
                                    {inst.dueDate?.seconds
                                      ? new Date(
                                          inst.dueDate.seconds * 1000,
                                        ).toLocaleDateString(
                                          language === "ar" ? "ar-IQ" : "en-US",
                                        )
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="text-left flex flex-col items-end">
                                <span className="text-sm font-black text-slate-900 dark:text-white font-mono tracking-tighter">
                                  {inst.amount?.toLocaleString()}{" "}
                                  <span className="text-[9px] font-bold">
                                    د.ع
                                  </span>
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                                    inst.status === "paid"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                                      : inst.status === "late"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                                  }`}
                                >
                                  {inst.status === "paid"
                                    ? "تم الدفع"
                                    : inst.status === "late"
                                      ? "متأخر"
                                      : "منتظر"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 px-2 text-right">
                        {t("paymentHistory")}
                      </h3>
                      <div className="space-y-4">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
                                <Wallet size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-right">
                                  {payment.type === "tuition"
                                    ? "قسط دراسي"
                                    : "دفعة مالية"}
                                </h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold text-right">
                                  {payment.createdAt?.seconds
                                    ? new Date(
                                        payment.createdAt.seconds * 1000,
                                      ).toLocaleString("ar-IQ")
                                    : "جاري العرض..."}
                                </p>
                              </div>
                            </div>
                            <div className="text-left font-mono font-bold text-lg text-slate-900 dark:text-white tracking-tighter">
                              +{payment.amount?.toLocaleString()}{" "}
                              <span className="text-[10px] font-bold">د.ع</span>
                            </div>
                          </div>
                        ))}
                        {payments.length === 0 && (
                          <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
                            <p className="text-slate-400 dark:text-slate-500 italic">
                              لا توجد دفعات مسجلة حالياً لـ{" "}
                              {selectedStudent?.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "chat" && <ParentChatTab />}

              {activeTab === "inbox" && (
                <div className="space-y-6">
                  <h2
                    className={`text-2xl font-bold text-slate-900 dark:text-white font-display px-2 ${isRtl ? "text-right" : "text-left"}`}
                  >
                    {t("messageCenter")}
                  </h2>
                  <div className="space-y-4">
                    {announcements.filter((a) => a.target === "individual")
                      .length > 0 ? (
                      announcements
                        .filter((a) => a.target === "individual")
                        .map((ann) => (
                          <div
                            key={ann.id}
                            className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors ${isRtl ? "border-r-4 border-r-indigo-600 text-right" : "border-l-4 border-l-indigo-600 text-left"}`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                {t("privateMessage")}
                              </span>
                              <span className="text-xs text-slate-400 font-bold">
                                {ann.createdAt?.seconds
                                  ? new Date(
                                      ann.createdAt.seconds * 1000,
                                    ).toLocaleDateString(
                                      isRtl ? "ar-IQ" : "en-US",
                                    )
                                  : t("now")}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                              {ann.title}
                            </h3>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {ann.content}
                            </p>
                            <div
                              className={`mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 ${isRtl ? "flex-row" : "flex-row-reverse justify-end"}`}
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                                {ann.authorName?.[0]}
                              </div>
                              <span className="text-xs text-slate-500">
                                {isRtl ? "المرسل" : "Sender"}: {ann.authorName}
                              </span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="bg-white dark:bg-slate-900 p-12 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center transition-colors">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 transition-colors">
                          <MessageSquare size={32} />
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 italic">
                          {t("noMessages")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
          notificationsCount={notifications.filter((n: any) => !n.read).length}
          isRtl={isRtl}
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
                {purchaseModal.image ? (
                  <img
                    src={purchaseModal.image || undefined}
                    alt={purchaseModal.itemName}
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
                  "{purchaseModal.itemName}"
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

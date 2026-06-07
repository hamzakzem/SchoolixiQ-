import React, { useState, useEffect, useMemo } from "react";
import { db, auth } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  limit,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../lib/AuthContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { NotificationCenter } from "../components/NotificationCenter";
import {
  Users,
  BookOpen,
  ClipboardList,
  Star,
  MessageSquare,
  Plus,
  Search,
  Calendar,
  ChevronRight,
  LogOut,
  Bell,
  LayoutDashboard,
  FileText,
  Send,
  User,
  Trash2,
  Menu,
  CheckCircle,
  AlertTriangle,
  Settings as SettingsIcon,
  BarChart3,
  ShieldCheck,
  Check,
} from "lucide-react";
import { updatePassword, verifyBeforeUpdateEmail } from "firebase/auth";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { notificationService } from "../lib/notificationService";
import { fetchStudentLinkFields, homeworkMatchesStudent } from "../lib/schoolSync";
import {
  TEACHER_SUBJECT_REQUIRED_MSG,
  teacherHasAssignedSubject,
  resolveSubjectsForTeacher,
  getSubjectOptionsForClass,
  resolveHomeworkSubjectForPublish,
  getHomeworkSubjectDisplay,
  canTeacherDeleteHomework,
  type SchoolSubjectDoc,
} from "../lib/homeworkSubjects";
import { MobileNavigationDock } from "../components/MobileNavigationDock";

type Tab =
  | "home"
  | "homework"
  | "grades"
  | "behavior"
  | "reports"
  | "advanced_reports"
  | "id_cards"
  | "settings"
  | "chat"
  | "schedules";

import SolarLoading from "../components/SolarLoading";
import TeacherSettingsTab from "./TeacherSettingsTab";
import TeacherChatTab from "./TeacherChatTab";
import Schedules from "./admin/Schedules";
import AdvancedReports from "./admin/AdvancedReports";
import IdCards from "./admin/IdCards";
import SchoolixLogo from "../components/SchoolixLogo";

import { useLanguage } from "../lib/LanguageContext";
import { GlobalFooter } from "../components/GlobalFooter";

export const getGradeTypeLabel = (val: string, isRtl: boolean) => {
  if (isRtl) return val;
  switch (val) {
    case "درجة الشهر الاول": return "First Month Grade (Teacher Only)";
    case "درجة الشهر الثاني": return "Second Month Grade (Teacher Only)";
    case "معدل النصف الاول": return "First Half Avg";
    case "درجة امتحان نصف السنة": return "Midyear Exam Grade";
    case "درجة الشهر الاول الكورس الثاني": return "First Month Term 2 (Teacher Only)";
    case "درجة الشهر الثاني الكورس الثاني": return "Second Month Term 2 (Teacher Only)";
    case "معدل النصف الثاني": return "Second Half Avg";
    case "معدل السعي السنوي": return "Yearly Effort Avg";
    case "درجة الامتحان النهائي": return "Final Exam Grade";
    case "الدرجة النهائية": return "Final Grade";
    case "النتيجة": return "Final Outcome / Result";
    default: return val;
  }
};

export default function TeacherDashboard() {
  const { profile, schoolData } = useAuth();
  const { t, isRtl, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  useEffect(() => {
    const handlePendingRedirect = () => {
      const pendingType = localStorage.getItem('schoolix_pending_tab_redirect');
      if (pendingType) {
        localStorage.removeItem('schoolix_pending_tab_redirect');
        
        switch (pendingType) {
          case 'homework':
            setActiveTab('homework');
            break;
          case 'grade':
          case 'grades':
            setActiveTab('grades');
            break;
          case 'behavior':
            setActiveTab('behavior');
            break;
          case 'announcement':
            setActiveTab('home');
            break;
          case 'message':
          case 'chat':
            setActiveTab('chat');
            break;
          case 'report':
            setActiveTab('reports');
            break;
          default:
            setActiveTab('home');
            break;
        }
      }
    };

    handlePendingRedirect();
    window.addEventListener('schoolix_tab_redirect', handlePendingRedirect);
    return () => {
      window.removeEventListener('schoolix_tab_redirect', handlePendingRedirect);
    };
  }, []);

  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const [loading, setLoading] = useState(true);
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

  // Package permissions are controlled by the Super Admin via the package properties
  const perms = schoolData?.packagePermissions || profile?.permissions; // fallback to profile if not loaded yet

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Homework state
  const [homework, setHomework] = useState<any[]>([]);
  const [showAddHomework, setShowAddHomework] = useState(false);
  const [newHomework, setNewHomework] = useState({
    title: "",
    content: "",
    dueDate: "",
    classId: (profile as any)?.preferredClassId || "",
  });

  // Grades state
  const [selectedClassId, setSelectedClassId] = useState(
    (profile as any)?.preferredClassId || "",
  );
  const [gradeType, setGradeType] = useState("درجة الشهر الاول");
  const [shareTeacherOnlyGrades, setShareTeacherOnlyGrades] = useState(false);
  const [maxScore, setMaxScore] = useState(100);
  const [studentGrades, setStudentGrades] = useState<Record<string, number>>(
    {},
  );
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);
  const [schoolSubjectDocs, setSchoolSubjectDocs] = useState<SchoolSubjectDoc[]>([]);
  const [homeworkPublishSubjectId, setHomeworkPublishSubjectId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(
    (profile as any)?.preferredSubject || profile?.subject || "",
  );
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [currentBulkDocId, setCurrentBulkDocId] = useState<string | null>(null);

  // Fetch existing grades when selection changes
  useEffect(() => {
    if (
      !profile?.schoolId ||
      !selectedClassId ||
      !selectedSubject ||
      !auth.currentUser
    )
      return;

    setLoadingGrades(true);
    const q = query(
      collection(db, "grades"),
      where("schoolId", "==", profile.schoolId),
      where("classId", "==", selectedClassId),
      where("subject", "==", selectedSubject),
      where("term", "==", gradeType),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const gradesMap: Record<string, number> = {};
        let sharedMaxScore = 100;
        let anyShared = false;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          gradesMap[data.studentId] = data.score;
          if (data.maxScore) sharedMaxScore = data.maxScore;
          if (data.isTeacherOnly === false) anyShared = true;
        });

        if (snapshot.docs.length > 0) {
          setShareTeacherOnlyGrades(anyShared);
        } else {
          setShareTeacherOnlyGrades(false);
        }

        setStudentGrades(gradesMap);
        setMaxScore(sharedMaxScore);
        setLoadingGrades(false);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          "TeacherDashboard:grades",
        );
        setLoadingGrades(false);
      },
    );

    return unsubscribe;
  }, [profile?.schoolId, selectedClassId, selectedSubject, gradeType]);

  // Reports state
  const [showAddReport, setShowAddReport] = useState(false);
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [sentReports, setSentReports] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [reportContent, setReportContent] = useState("");
  const [reportTarget, setReportTarget] = useState<
    "school" | "parents" | "both"
  >("both");
  const [behaviorNote, setBehaviorNote] = useState({
    type: "positive",
    description: "",
  });

  const handleSendBehaviorReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedStudent) return;

    try {
      const link = await fetchStudentLinkFields(selectedStudent.id);
      await addDoc(collection(db, "behavior_reports"), {
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        parentIds: link?.parentIds || [],
        parentEmail: link?.parentEmail || "",
        type: behaviorNote.type,
        description: behaviorNote.description,
        createdAt: serverTimestamp(),
        authorId: profile.uid,
        authorName: profile.name,
      });

      await notificationService.notifyStudentParents(selectedStudent.id, {
        title:
          behaviorNote.type === "positive"
            ? "تقرير سلوكي إيجابي"
            : "تنبيه سلوكي",
        message: behaviorNote.description,
        type: "behavior",
        schoolId: profile.schoolId,
      });

      toast.success(t("behaviorReportSent"));
      setShowAddBehavior(false);
      setBehaviorNote({ type: "positive", description: "" });
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "behavior_reports");
    }
  };
  const [behaviorSearch, setBehaviorSearch] = useState("");
  const [behaviorClassFilter, setBehaviorClassFilter] = useState("");

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (!profile?.schoolId || !auth.currentUser) return;

    try {
      setLoading(true);

      const schoolRef = doc(db, "schools", profile.schoolId);
      unsubs.push(onSnapshot(schoolRef, (docSnap) => {
        if (docSnap.exists() && auth.currentUser) {
          setSchoolName(docSnap.data().name);
        }
      }));

      const subjectsQ = query(
        collection(db, "subjects"),
        where("schoolId", "==", profile.schoolId),
        limit(50),
      );
      unsubs.push(onSnapshot(subjectsQ, (snap) => {
        if (auth.currentUser) {
          const docs = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            name: String(docSnap.data().name || ""),
            classId: docSnap.data().classId,
            className: docSnap.data().className,
            schoolId: docSnap.data().schoolId,
          }));
          setSchoolSubjectDocs(docs);
          const subjs = docs.map((d) => d.name).filter(Boolean);
          const defaults = isRtl
            ? [
                "الرياضيات",
                "اللغة العربية",
                "العلوم",
                "اللغة الإنجليزية",
                "التربية الإسلامية",
              ]
            : [
                "Mathematics",
                "Arabic Language",
                "Science",
                "English Language",
                "Islamic Education",
              ];
          setSchoolSubjects(Array.from(new Set([...defaults, ...subjs])));
        }
      }));

      const classesQ = query(
        collection(db, "classes"),
        where("schoolId", "==", profile.schoolId),
        limit(100),
      );
      unsubs.push(onSnapshot(classesQ, (snap) => {
        const classesData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClasses(classesData as any);
        if (!(profile as any)?.preferredClassId && classesData.length > 0 && !selectedClassId) {
          setSelectedClassId(classesData[0].id);
        }
      }));

      const studentsQ = query(
        collection(db, "students"),
        where("schoolId", "==", profile.schoolId),
        limit(500),
      );
      unsubs.push(onSnapshot(studentsQ, (snap) => {
        setStudents(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as any);
      }));

      const homeworkQ = query(
        collection(db, "homework"),
        where("schoolId", "==", profile.schoolId),
        where("teacherId", "==", profile.uid),
        limit(50),
      );
      unsubs.push(onSnapshot(homeworkQ, (snap) => {
        setHomework(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ) as any,
        );
      }));

      const reportsQ = query(
        collection(db, "teacher_reports"),
        where("schoolId", "==", profile.schoolId),
        where("teacherId", "==", profile.uid),
        limit(50),
      );
      unsubs.push(onSnapshot(reportsQ, (snap) => {
        setSentReports(
          snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(
              (a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
            ) as any,
        );
      }));

      const notificationsQ = query(
        collection(db, "notifications"),
        where("userId", "==", profile.uid),
        limit(50),
      );
      unsubs.push(onSnapshot(notificationsQ, (snap) => {
        const notifData = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort(
            (a: any, b: any) =>
              (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          );
        setNotifications(notifData as any);
      }));

      setLoading(false);
    } catch (error) {
      console.error("Error setting up teacher dashboard listeners:", error);
      setLoading(false);
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [profile, isRtl]);

  const teacherAssignedSubjects = useMemo(
    () => resolveSubjectsForTeacher(profile, schoolSubjectDocs),
    [profile, schoolSubjectDocs],
  );

  const homeworkSubjectOptions = useMemo(() => {
    const classId = newHomework.classId || (profile as any)?.preferredClassId || "";
    if (!classId) return teacherAssignedSubjects;
    return getSubjectOptionsForClass(teacherAssignedSubjects, classId, classes);
  }, [newHomework.classId, teacherAssignedSubjects, classes, profile]);

  useEffect(() => {
    if (!showAddHomework) return;
    if (homeworkSubjectOptions.length === 1) {
      setHomeworkPublishSubjectId(homeworkSubjectOptions[0].id);
      return;
    }
    if (
      homeworkPublishSubjectId &&
      !homeworkSubjectOptions.some((s) => s.id === homeworkPublishSubjectId)
    ) {
      setHomeworkPublishSubjectId("");
    }
  }, [showAddHomework, homeworkSubjectOptions, homeworkPublishSubjectId]);

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (!teacherHasAssignedSubject(profile)) {
        toast.error(TEACHER_SUBJECT_REQUIRED_MSG);
        return;
      }

      const targetClassId =
        newHomework.classId || (profile as any)?.preferredClassId;
      if (!targetClassId) {
        toast.error(
          isRtl
            ? "يرجى اختيار الصف الدراسي أولاً"
            : "Please select a class first",
        );
        return;
      }

      const subjectPayload = resolveHomeworkSubjectForPublish(
        homeworkPublishSubjectId,
        teacherAssignedSubjects,
        targetClassId,
        classes,
        profile,
      );

      if (!subjectPayload) {
        toast.error(
          isRtl
            ? "يرجى اختيار المادة الدراسية للواجب"
            : "Please select the homework subject",
        );
        return;
      }

      const targetClassName =
        classes.find((c) => c.id === targetClassId)?.name || "";

      const homeworkRef = await addDoc(collection(db, "homework"), {
        title: newHomework.title,
        content: newHomework.content,
        dueDate: newHomework.dueDate,
        classId: targetClassId,
        className: targetClassName,
        teacherId: profile.uid,
        teacherName: profile.name,
        subjectId: subjectPayload.subjectId || null,
        subjectName: subjectPayload.subjectName,
        subject: subjectPayload.subjectName,
        schoolId: profile.schoolId,
        hiddenFor: [],
        createdAt: serverTimestamp(),
      });

      // Notify all parents in the class about the homework
      const classStudents = students.filter((s) =>
        homeworkMatchesStudent(targetClassId, s, classes),
      );
      if (classStudents.length > 0) {
        for (const student of classStudents) {
          await notificationService.notifyStudentParents(student.id, {
            title: `${t("newHomework")}: ${subjectPayload.subjectName}`,
            message: `${newHomework.title} - ${t("deliveryDate")}: ${newHomework.dueDate}`,
            type: "homework",
            schoolId: profile.schoolId,
            metadata: { sourceId: homeworkRef.id },
          });
        }
      } else {
        console.log(
          "No students found in class for notification:",
          targetClassId,
        );
      }

      toast.success(t("homeworkPublished"));
      setShowAddHomework(false);
      setHomeworkPublishSubjectId("");
      setNewHomework({
        title: "",
        content: "",
        dueDate: "",
        classId: (profile as any)?.preferredClassId || "",
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "homework");
    }
  };

  const handleDeleteHomework = async (id: string, ownerId?: string) => {
    if (!id) {
      toast.error(isRtl ? "خطأ في معرف الواجب" : "Invalid homework ID");
      return;
    }

    if (!canTeacherDeleteHomework({ teacherId: ownerId }, profile?.uid)) {
      toast.error(
        isRtl
          ? "لا يمكنك حذف واجب لم تنشره أنت"
          : "You can only delete homework you published",
      );
      return;
    }

    const loadingToast = toast.loading(t("deleting"));
    try {
      await deleteDoc(doc(db, "homework", id));
      await notificationService.deleteBySourceId(id);
      toast.success(t("homeworkDeleted"), { id: loadingToast });
    } catch (error) {
      console.error("Error deleting homework:", error);
      toast.error(
        isRtl
          ? "حدث خطأ أثناء الحذف - قد لا تملك الصلاحية الكافية"
          : "Error deleting - insufficient permissions",
        { id: loadingToast },
      );
      try {
        handleFirestoreError(error, OperationType.DELETE, `homework/${id}`);
      } catch (e) {
        // Silent catch for re-throw
      }
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!id) return;
    const loadingToast = toast.loading(t("deleting"));
    try {
      await deleteDoc(doc(db, "teacher_reports", id));
      await notificationService.deleteBySourceId(id);
      toast.success(t("reportDeleted"), { id: loadingToast });
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error(
        isRtl
          ? "حدث خطأ أثناء الحذف - قد لا تملك الصلاحية الكافية"
          : "Error deleting - insufficient permissions",
        { id: loadingToast },
      );
      try {
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `teacher_reports/${id}`,
        );
      } catch (e) {
        // Silent catch
      }
    }
  };

  const TEACHER_ONLY_TERMS = [
    "درجة الشهر الاول",
    "درجة الشهر الثاني",
    "درجة الشهر الاول الكورس الثاني",
    "درجة الشهر الثاني الكورس الثاني",
  ];

  const handleSaveGrades = async () => {
    if (!profile || !selectedClassId || !selectedSubject || isSavingGrades)
      return;

    const currentClass = classes.find((c) => c.id === selectedClassId);
    if (!currentClass) return;

    setIsSavingGrades(true);
    const loadingToast = toast.loading(t("executing"));

    try {
      const studentIds = Object.keys(studentGrades);
      if (studentIds.length === 0) {
        toast.error(t("enterGradesFirst"), { id: loadingToast });
        setIsSavingGrades(false);
        return;
      }

      const term = gradeType;
      const year = new Date().getFullYear().toString();
      const isTeacherOnly = TEACHER_ONLY_TERMS.includes(term) && !shareTeacherOnlyGrades;

      // Individual updates to prevent overwriting other students
      for (const studentId of studentIds) {
        const link = await fetchStudentLinkFields(studentId);
        const student = students.find((s) => s.id === studentId);
        const percentage = Math.round(
          (studentGrades[studentId] / maxScore) * 100,
        );

        // Find if an entry already exists for this specific student/subject/term
        const existingQ = query(
          collection(db, "grades"),
          where("schoolId", "==", profile.schoolId),
          where("studentId", "==", studentId),
          where("subject", "==", selectedSubject),
          where("term", "==", term),
          where("year", "==", year),
        );
        const existingSnap = await getDocs(existingQ);

        const gradeData = {
          schoolId: profile.schoolId,
          classId: selectedClassId,
          className: currentClass.name,
          studentId,
          studentName: student?.name || t("student"),
          parentIds: isTeacherOnly ? [] : (link?.parentIds || []),
          parentEmail: isTeacherOnly ? "" : (link?.parentEmail || ""),
          score: studentGrades[studentId],
          maxScore,
          percentage,
          term,
          year,
          type: gradeType,
          subject: selectedSubject,
          isTeacherOnly,
          teacherId: profile.uid,
          updatedAt: serverTimestamp(),
        };

        if (!existingSnap.empty) {
          await updateDoc(
            doc(db, "grades", existingSnap.docs[0].id),
            gradeData,
          );
        } else {
          await addDoc(collection(db, "grades"), {
            ...gradeData,
            createdAt: serverTimestamp(),
          });
        }

        // Notify parents only if NOT teacher only
        if (!isTeacherOnly && (studentGrades[studentId] !== undefined && studentGrades[studentId] !== null)) {
          await notificationService.notifyStudentParents(studentId, {
            title: `${t("newGrade")}: ${selectedSubject}`,
            message: `${t("gradeRecorded")}: ${studentGrades[studentId]} ${t("from")} ${maxScore}${maxScore === 100 ? ` (${percentage}%)` : ""}`,
            type: "grade",
            schoolId: profile.schoolId,
          });
        }
      }

      toast.success(t("gradesSaved"), { id: loadingToast });
    } catch (error) {
      toast.error(t("error"), { id: loadingToast });
      handleFirestoreError(error, OperationType.WRITE, "grades");
    } finally {
      setIsSavingGrades(false);
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedStudent) return;

    try {
      const link = await fetchStudentLinkFields(selectedStudent.id);
      const reportRef = await addDoc(collection(db, "teacher_reports"), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        parentIds: link?.parentIds || [],
        parentEmail: link?.parentEmail || "",
        teacherId: profile.uid,
        teacherName: profile.name,
        subject: profile.subject || t("undefined"),
        content: reportContent,
        target: reportTarget,
        schoolId: profile.schoolId,
        createdAt: serverTimestamp(),
      });

      if (reportTarget === "parents" || reportTarget === "both") {
        await notificationService.notifyStudentParents(selectedStudent.id, {
          title: `${t("reportFromTeacher")}: ${profile.subject}`,
          message: reportContent,
          type: "report",
          schoolId: profile.schoolId,
          metadata: { sourceId: reportRef.id },
        });
      }

      toast.success(t("reportSent"));
      setShowAddReport(false);
      setReportContent("");
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "teacher_reports");
    }
  };

  const handleSetPreferredClass = async (classId: string) => {
    if (!profile?.uid) return;
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        preferredClassId: classId,
      });
      toast.success("تم تعيين الصف كصف افتراضي");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "users");
    }
  };

  const sidebarItems = [
    { id: "home", label: isRtl ? "الرئيسية" : "Home", icon: LayoutDashboard },
    {
      id: "schedules",
      label: isRtl ? "الجدول الدراسي" : "Study Schedule",
      icon: Calendar,
      permission: "automated_schedules",
    },
    {
      id: "homework",
      label: isRtl ? "الالواحب اليومي" : "Daily Homework",
      icon: BookOpen,
      permission: "homework_and_tasks",
    },
    {
      id: "grades",
      label: isRtl ? "النتائج والدرجات" : "Results & Grades",
      icon: Star,
      permission: "exams_and_results",
    },
    {
      id: "behavior",
      label: isRtl ? "السلوك والطلاب" : "Behavior & Students",
      icon: Users,
      permission: "behavior_management",
    },
    {
      id: "reports",
      label: isRtl ? "تقارير التقييم" : "Evaluation Reports",
      icon: FileText,
      permission: "student_evaluation_reports",
    },
    {
      id: "advanced_reports",
      label: isRtl ? "تقارير متقدمة" : "Advanced Reports",
      icon: BarChart3,
      permission: "advanced_reports",
    },
    {
      id: "id_cards",
      label: isRtl ? "هويات الطالب" : "Student ID Cards",
      icon: ShieldCheck,
      permission: "id_card_generation",
    },
    { id: "chat", label: isRtl ? "الدردشة" : "Chat", icon: MessageSquare },
  ].filter((item) => {
    if (item.id === "home" || item.id === "chat") return true;
    if (perms && typeof perms === "object" && !Array.isArray(perms)) {
      if (item.id === "homework") return perms.homework_and_tasks !== false;
      if (item.id === "grades") return perms.exams_and_results !== false;
      if (item.id === "behavior") return perms.behavior_management !== false;
      if (item.id === "reports") return perms.student_evaluation_reports !== false;
      if (item.id === "advanced_reports") return perms.advanced_reports !== false;
      if (item.id === "schedules") return perms.automated_schedules !== false;
      if (item.id === "id_cards") return perms.id_card_generation !== false;
    }
    return true;
  });

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const primaryItems = sidebarItems.filter(item => ["home", "homework", "grades", "chat"].includes(item.id));
  const moreItems = sidebarItems.filter(item => !["home", "homework", "grades", "chat"].includes(item.id));

  if (loading) {
    return <SolarLoading />;
  }

  return (
    <div
      className="h-[100dvh] overflow-hidden bg-transparent flex transition-all duration-300 print:overflow-visible print:h-auto print:block"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Sidebar Overlay for Mobile */}
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

      {/* Sidebar - Desktop */}
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
                {schoolData?.logoUrl && schoolData?.logoUrl !== "/icon.svg" ? (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <img
                      src={schoolData.logoUrl}
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
                      {t("teacherPortal")}
                    </h2>
                    <div className="flex flex-col">
                      <p className="text-[10px] uppercase tracking-widest text-indigo-600 font-bold truncate">
                        {profile?.subject}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>

              <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 md:px-4 py-4 space-y-1.5 custom-scrollbar">
              {[
                { id: "home", label: t("home"), icon: LayoutDashboard },
                { id: "homework", label: t("dailyHomework"), icon: BookOpen },
                { id: "grades", label: t("resultsAndGrades"), icon: Star },
                {
                  id: "behavior",
                  label: t("behaviorAndStudents"),
                  icon: Users,
                },
                {
                  id: "reports",
                  label: t("evaluationReports"),
                  icon: FileText,
                },
                {
                  id: "advanced_reports",
                  label: isRtl ? "تقارير متقدمة" : "Advanced Reports",
                  icon: BarChart3,
                },
                {
                  id: "id_cards",
                  label: isRtl ? "هويات الطالب" : "ID Cards",
                  icon: ShieldCheck,
                },
                { id: "schedules", label: t("schedules"), icon: Calendar },
                {
                  id: "chat",
                  label: t("chat") || (isRtl ? "المراسلة" : "Messages"),
                  icon: MessageSquare,
                },
                {
                  id: "settings",
                  label: t("settings") || (isRtl ? "الإعدادات" : "Settings"),
                  icon: SettingsIcon,
                },
              ]
                .filter((item) => {
                  if (
                    item.id === "home" ||
                    item.id === "settings" ||
                    item.id === "chat"
                  )
                    return true;
                  const p = perms as any;
                  if (p && typeof p === "object" && !Array.isArray(p)) {
                    if (item.id === "homework")
                      return p.homework_and_tasks !== false;
                    if (item.id === "grades")
                      return p.exams_and_results !== false;
                    if (item.id === "behavior")
                      return p.behavior_management !== false;
                    if (item.id === "reports")
                      return p.student_evaluation_reports !== false;
                    if (item.id === "advanced_reports")
                      return p.advanced_reports !== false;
                    if (item.id === "schedules") return true;
                    if (item.id === "id_cards") return true;
                  }
                  return true;
                })
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as Tab);
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
                    <item.icon size={isSidebarCollapsed ? 24 : 20} className="shrink-0" />
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-transparent print:overflow-visible print:h-auto print:block">
        <header className="min-h-[3.5rem] md:min-h-[5rem] h-auto pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 md:pt-[calc(1.25rem+env(safe-area-inset-top,0px))] md:pb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 md:px-10 shrink-0 sticky top-0 z-40 print:hidden">
          <div className="flex items-center gap-1.5 md:gap-6">
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
              className="p-2 md:p-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 rounded-xl transition-all shadow-sm hidden lg:block"
            >
              <Menu
                size={20}
                className={
                  (!isSidebarOpen && window.innerWidth < 1024) || isSidebarCollapsed
                    ? "rotate-90 transition-transform"
                    : "transition-transform"
                }
              />
            </button>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-[7px] md:text-[10px] font-bold uppercase tracking-wider text-indigo-600 truncate">
                  {t("dashboard")}
                </span>
                {schoolName && (
                  <div className="flex items-center gap-1">
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span>
                    <span className="text-[7px] md:text-[10px] font-bold text-slate-400 truncate max-w-[60px] md:max-w-[120px]">
                      {schoolName}
                    </span>
                  </div>
                )}
              </div>
              <h1 className="text-xs md:text-xl font-bold text-slate-900 dark:text-white truncate max-w-[100px] md:max-w-none leading-none mt-0.5">
                {profile?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden lg:block text-right ml-4">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">
                {t("todayDate")}
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {new Date().toLocaleDateString(
                  language === "ar" ? "ar-EG" : "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block"></div>

            <div className="flex items-center gap-1.5 md:gap-3">
              <LanguageToggle />
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center justify-center relative group active:scale-95 shrink-0 ${
                  showNotifications
                    ? "bg-[#D4A64A] border-[#D4A64A] text-[#0B2345] shadow-lg shadow-[#D4A64A]/25"
                    : "bg-[#0B2345] border-[#D4A64A]/30 text-[#D4A64A] hover:bg-[#D4A64A] hover:text-[#0B2345] hover:border-[#D4A64A]"
                }`}
              >
                <Bell size={18} className="transition-transform duration-300 group-hover:scale-110" />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 border-2 border-[#0B2345] rounded-full text-[10px] font-black text-white flex items-center justify-center">
                    {notifications.filter((n) => !n.read).length > 9 ? '9+' : notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              {/* Redesigned Notification Center Modal */}
              {showNotifications && (
                <NotificationCenter
                  onClose={() => setShowNotifications(false)}
                  activeTabSetter={(tabName) => setActiveTab(tabName as any)}
                  userRole="teacher"
                />
              )}
            </div>
          </div>
        </header>

        <div className={`flex-1 flex flex-col min-h-0 print:overflow-visible ${activeTab === 'chat' ? 'overflow-hidden h-full pb-[72px] lg:pb-0' : 'overflow-y-auto custom-scrollbar pb-[90px] lg:pb-10'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className={activeTab === "chat" ? "p-0 h-full w-full flex flex-col min-h-0 overflow-hidden" : "w-full p-6 md:p-10 flex flex-col"}
              initial={{ opacity: 0, y: activeTab === "chat" ? 0 : 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: activeTab === "chat" ? 0 : -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {activeTab === "home" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        label: "طلاب الصف الدائم",
                        value: students.filter(
                          (s) =>
                            s.classId === (profile as any)?.preferredClassId,
                        ).length,
                        icon: Users,
                        color: "indigo",
                      },
                      {
                        label: "الصف الدائم",
                        value: (profile as any)?.preferredClassId ? 1 : 0,
                        icon: LayoutDashboard,
                        color: "orange",
                      },
                      {
                        label: "واجبات منشورة",
                        value: homework.length,
                        icon: BookOpen,
                        color: "emerald",
                      },
                      {
                        label: "تقارير مرسلة",
                        value: sentReports.length,
                        icon: FileText,
                        color: "blue",
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm"
                      >
                        <div
                          className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center mb-4`}
                        >
                          <stat.icon size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">
                          {stat.label}
                        </p>
                        <p className="text-3xl font-black text-slate-900 font-display">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-slate-900 mb-1 font-display">
                        {t("browseClasses")}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold">
                        {t("browseClassesDesc")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {classes.map((c) => (
                        <button
                          key={c.id}
                          onClick={() =>
                            setSelectedClassId(
                              c.id === selectedClassId ? "" : c.id,
                            )
                          }
                          className={`p-6 rounded-[2.5rem] border transition-all text-right relative overflow-hidden group ${
                            selectedClassId === c.id
                              ? "bg-slate-900 border-slate-900 text-white shadow-2xl shadow-indigo-200 scale-[1.02]"
                              : "bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white"
                          }`}
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
                              selectedClassId === c.id
                                ? "bg-white/10 text-white"
                                : "bg-white text-indigo-600 shadow-sm"
                            }`}
                          >
                            <LayoutDashboard size={24} />
                          </div>
                          <p
                            className={`font-bold text-sm mb-1 ${selectedClassId === c.id ? "text-white" : "text-slate-900"}`}
                          >
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Users
                              size={12}
                              className={
                                selectedClassId === c.id
                                  ? "text-indigo-300"
                                  : "text-slate-400"
                              }
                            />
                            <p
                              className={`text-[10px] font-bold ${selectedClassId === c.id ? "text-indigo-200" : "text-slate-400"}`}
                            >
                              {
                                students.filter((s) => s.classId === c.id)
                                  .length
                              }{" "}
                              {t("student")}
                            </p>
                          </div>

                          {c.id === (profile as any)?.preferredClassId && (
                            <div className="absolute top-4 left-4">
                              <Star
                                size={14}
                                className="text-orange-400"
                                fill="currentColor"
                              />
                            </div>
                          )}

                          {selectedClassId === c.id && (
                            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white/5 rounded-full blur-2xl"></div>
                          )}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence>
                      {selectedClassId && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{
                            opacity: 1,
                            height: "auto",
                            marginTop: 48,
                          }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                              <h4 className="font-bold text-slate-900">
                                {t("studentList")}:{" "}
                                {
                                  classes.find((c) => c.id === selectedClassId)
                                    ?.name
                                }
                              </h4>
                            </div>
                            <button
                              onClick={() =>
                                handleSetPreferredClass(selectedClassId)
                              }
                              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                            >
                              <Star
                                size={14}
                                fill={
                                  (profile as any)?.preferredClassId ===
                                  selectedClassId
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                              {t("setDefaultClass")}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {students
                              .filter((s) => s.classId === selectedClassId)
                              .map((student) => (
                                <div
                                  key={student.id}
                                  onClick={() => {
                                    setSelectedStudent(student);
                                    setShowAddReport(true);
                                  }}
                                  className="p-4 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer group text-center"
                                >
                                  <div className="w-16 h-16 rounded-[1.5rem] bg-white mx-auto flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm border border-slate-50 transition-all group-hover:scale-110 mb-4">
                                    <User size={28} />
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-900 truncate px-2">
                                    {student.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-1 font-mono uppercase tracking-wider">
                                    {student.registrationNumber || t("noId")}
                                  </p>
                                  <div className="mt-4 pt-4 border-t border-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] font-bold text-indigo-600">
                                      {t("sendReport")}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {students.filter(
                              (s) => s.classId === selectedClassId,
                            ).length === 0 && (
                              <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                                <Users
                                  size={48}
                                  className="mx-auto text-slate-100 mb-4"
                                />
                                <p className="text-slate-400 font-bold">
                                  {t("noStudentsInClass")}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200">
                      <h3 className="text-xl font-bold mb-6 text-slate-900">
                        {t("recentHomeworks")}
                      </h3>
                      <div className="space-y-4">
                        {homework.length > 0 ? (
                          homework.slice(0, 5).map((hw) => (
                            <div
                              key={hw.id}
                              className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 transition-all cursor-pointer group relative"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                <BookOpen size={18} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900">
                                  {hw.title}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {t("deliveryDate")}: {hw.dueDate}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {canTeacherDeleteHomework(hw, profile?.uid) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteHomework(hw.id, hw.teacherId);
                                    }}
                                    className="p-2.5 text-red-500 hover:text-white hover:bg-red-600 rounded-xl transition-all opacity-100 bg-white shadow-md border border-red-50 active:scale-95 z-[30] cursor-pointer"
                                    title="حذف الواجب"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                                <ChevronRight
                                  size={16}
                                  className="text-slate-300 group-hover:text-indigo-600 transition-colors"
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center text-slate-400 text-sm">
                            {t("noHomeworksPublished")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                      <h3 className="text-xl font-bold mb-6">
                        {t("quickAccess")}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setShowAddHomework(true)}
                          className="p-6 rounded-3xl bg-indigo-600 hover:bg-indigo-500 transition-colors text-right relative overflow-hidden group"
                        >
                          <Plus
                            size={32}
                            className="opacity-10 absolute -bottom-2 -left-2 scale-150 group-hover:scale-110 transition-transform"
                          />
                          <p className="font-bold mb-1">{t("addHomework")}</p>
                          <p className="text-[10px] opacity-70 leading-relaxed">
                            {t("addHomeworkDesc")}
                          </p>
                        </button>
                        <button
                          onClick={() => {
                            setActiveTab("grades");
                            setSelectedClassId(classes[0]?.id || "");
                          }}
                          className="p-6 rounded-3xl bg-slate-800 hover:bg-slate-700 transition-colors text-right relative overflow-hidden group"
                        >
                          <Star
                            size={32}
                            className="opacity-10 absolute -bottom-2 -left-2 scale-150 group-hover:scale-110 transition-transform"
                          />
                          <p className="font-bold mb-1">
                            {t("recordGradesLabel")}
                          </p>
                          <p className="text-[10px] opacity-70 leading-relaxed">
                            {t("recordGradesLabelDesc")}
                          </p>
                        </button>
                        <button
                          onClick={() => setShowAddReport(true)}
                          className="p-6 rounded-3xl bg-slate-800 hover:bg-slate-700 transition-colors text-right relative overflow-hidden group"
                        >
                          <MessageSquare
                            size={32}
                            className="opacity-10 absolute -bottom-2 -left-2 scale-150 group-hover:scale-110 transition-transform"
                          />
                          <p className="font-bold mb-1">{t("sendReport")}</p>
                          <p className="text-[10px] opacity-70 leading-relaxed">
                            {t("sendReportDesc")}
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "homework" && (
                <div
                  className="space-y-8 animate-in fade-in duration-500"
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {t("homeworkManagement")}
                    </h2>
                    <button
                      onClick={() => {
                        if (!teacherHasAssignedSubject(profile)) {
                          toast.error(TEACHER_SUBJECT_REQUIRED_MSG);
                          return;
                        }
                        setHomeworkPublishSubjectId(
                          homeworkSubjectOptions.length === 1
                            ? homeworkSubjectOptions[0].id
                            : "",
                        );
                        setShowAddHomework(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <Plus size={20} />
                      {t("newHomeworkBtn")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {homework.map((hw) => (
                      <div
                        key={hw.id}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/20 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                            {getHomeworkSubjectDisplay(hw)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(
                                hw.createdAt?.seconds * 1000,
                              ).toLocaleDateString()}
                            </span>
                            {canTeacherDeleteHomework(hw, profile?.uid) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteHomework(hw.id, hw.teacherId)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title={isRtl ? "حذف الواجب" : "Delete homework"}
                                aria-label={isRtl ? "حذف الواجب" : "Delete homework"}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">
                          {hw.title}
                        </h3>
                        <p className="text-xs text-slate-500 mb-6 line-clamp-3 leading-relaxed">
                          {hw.content}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-900">
                              الموعد: {hw.dueDate}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {classes.find((c) => c.id === hw.classId)?.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "grades" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                      <div className="space-y-6 flex-1">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-bold text-slate-900 font-display">
                            رصد الدرجات الجديد
                          </h2>
                          {selectedClassId &&
                            selectedClassId !==
                              (profile as any)?.preferredClassId && (
                              <button
                                onClick={() =>
                                  handleSetPreferredClass(selectedClassId)
                                }
                                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                              >
                                تعيين هذا الصف كصف دائم
                              </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                              {t("selectClassLabel")}
                            </label>
                            <select
                              value={selectedClassId}
                              onChange={(e) => {
                                setSelectedClassId(e.target.value);
                              }}
                              className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all appearance-none"
                            >
                              <option value="">{t("selectClass")}</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}{" "}
                                  {c.id === (profile as any)?.preferredClassId
                                    ? t("defaultSuffix")
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                              المادة الدراسية
                            </label>
                            <div className="flex gap-2">
                              <select
                                value={selectedSubject}
                                onChange={(e) => {
                                  setSelectedSubject(e.target.value);
                                }}
                                className="flex-1 px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all appearance-none"
                              >
                                <option value="">اختر المادة...</option>
                                {schoolSubjects.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              {selectedSubject &&
                                selectedSubject !==
                                  (profile as any)?.preferredSubject && (
                                  <button
                                    onClick={async () => {
                                      if (!profile?.uid) return;
                                      await updateDoc(
                                        doc(db, "users", profile.uid),
                                        { preferredSubject: selectedSubject },
                                      );
                                      toast.success(
                                        "تم تعيين المادة كمادة افتراضية",
                                      );
                                    }}
                                    className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                                    title="تعيين كمادة افتراضية"
                                  >
                                    <Star size={18} fill="currentColor" />
                                  </button>
                                )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                              {isRtl ? "نوع التقييم" : "Evaluation Type"}
                            </label>
                            <select
                              value={gradeType}
                              onChange={(e) => setGradeType(e.target.value)}
                              className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all appearance-none"
                            >
                              <option value="درجة الشهر الاول">{getGradeTypeLabel("درجة الشهر الاول", isRtl)}</option>
                              <option value="درجة الشهر الثاني">{getGradeTypeLabel("درجة الشهر الثاني", isRtl)}</option>
                              <option value="معدل النصف الاول">{getGradeTypeLabel("معدل النصف الاول", isRtl)}</option>
                              <option value="درجة امتحان نصف السنة">{getGradeTypeLabel("درجة امتحان نصف السنة", isRtl)}</option>
                              <option value="درجة الشهر الاول الكورس الثاني">{getGradeTypeLabel("درجة الشهر الاول الكورس الثاني", isRtl)}</option>
                              <option value="درجة الشهر الثاني الكورس الثاني">{getGradeTypeLabel("درجة الشهر الثاني الكورس الثاني", isRtl)}</option>
                              <option value="معدل النصف الثاني">{getGradeTypeLabel("معدل النصف الثاني", isRtl)}</option>
                              <option value="معدل السعي السنوي">{getGradeTypeLabel("معدل السعي السنوي", isRtl)}</option>
                              <option value="درجة الامتحان النهائي">{getGradeTypeLabel("درجة الامتحان النهائي", isRtl)}</option>
                              <option value="الدرجة النهائية">{getGradeTypeLabel("الدرجة النهائية", isRtl)}</option>
                              <option value="النتيجة">{getGradeTypeLabel("النتيجة", isRtl)}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                              الدرجة العظمى
                            </label>
                            <input
                              type="number"
                              value={maxScore}
                              onChange={(e) =>
                                setMaxScore(parseInt(e.target.value) || 0)
                              }
                              className="w-full px-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600/20 font-black text-indigo-700 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {loadingGrades ? (
                      <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-lg text-indigo-600 font-bold"></div>
                      </div>
                    ) : selectedClassId ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold text-center">
                          <div className="col-span-4 text-right">
                            {t("studentName")}
                          </div>
                          <div className="col-span-4">{t("grade")}</div>
                          <div className="col-span-4">{t("percentage")}</div>
                        </div>
                        {students
                          .filter((s) => s.classId === selectedClassId)
                          .map((student) => (
                            <div
                              key={student.id}
                              className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 rounded-2xl items-center border border-transparent hover:border-slate-200 transition-all"
                            >
                              <div className="col-span-4">
                                <p className="font-bold text-slate-900">
                                  {student.name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {t("registrationNumberLabel")}:{" "}
                                  {student.registrationNumber}
                                </p>
                              </div>
                              <div className="col-span-4 flex justify-center">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxScore}
                                    value={
                                      studentGrades[student.id] !== undefined
                                        ? studentGrades[student.id]
                                        : ""
                                    }
                                    onChange={(e) =>
                                      setStudentGrades({
                                        ...studentGrades,
                                        [student.id]:
                                          parseInt(e.target.value) || 0,
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        const inputs = Array.from(
                                          document.querySelectorAll(
                                            'input[type="number"]',
                                          ),
                                        );
                                        const index = inputs.indexOf(
                                          e.currentTarget,
                                        );
                                        if (
                                          index > -1 &&
                                          index < inputs.length - 1
                                        ) {
                                          (
                                            inputs[
                                              index + 1
                                            ] as HTMLInputElement
                                          ).focus();
                                        }
                                      }
                                    }}
                                    className="w-32 px-4 py-2 bg-white rounded-xl border border-slate-200 text-center font-black text-slate-900"
                                    placeholder={`0 / ${maxScore}`}
                                  />
                                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">
                                    / {maxScore}
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-4 flex flex-col items-center gap-1">
                                <span className="text-xl font-black text-indigo-600">
                                  {studentGrades[student.id] !== undefined
                                    ? maxScore === 100
                                      ? `${Math.round((studentGrades[student.id] / maxScore) * 100)}%`
                                      : `${studentGrades[student.id]} ${t("of")} ${maxScore}`
                                    : "-"}
                                </span>
                                <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 transition-all"
                                    style={{
                                      width: `${studentGrades[student.id] !== undefined ? Math.min(100, Math.round((studentGrades[student.id] / maxScore) * 100)) : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8">
                          {TEACHER_ONLY_TERMS.includes(gradeType) ? (
                            <label className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                shareTeacherOnlyGrades 
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                                  : "bg-slate-100 text-transparent border border-slate-200 group-hover:border-indigo-300"
                              }`}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <input 
                                type="checkbox" 
                                className="hidden" 
                                checked={shareTeacherOnlyGrades} 
                                onChange={(e) => setShareTeacherOnlyGrades(e.target.checked)} 
                              />
                              <div className="text-right">
                                <span className="block text-sm font-bold text-slate-800">
                                  مشاركة الدرجات للإدارة والآباء
                                </span>
                                <span className="block text-[10px] font-bold text-slate-400 mt-0.5">
                                  بشكل افتراضي، هذا التقييم يحفظ لديك فقط
                                </span>
                              </div>
                            </label>
                          ) : (
                            <div />
                          )}
                          <button
                            onClick={handleSaveGrades}
                            disabled={
                              isSavingGrades ||
                              loadingGrades ||
                              !selectedSubject ||
                              Object.keys(studentGrades).length === 0
                            }
                            className={`px-10 py-5 rounded-2xl font-bold transition-all flex items-center gap-3 ${
                              isSavingGrades ||
                              loadingGrades ||
                              !selectedSubject ||
                              Object.keys(studentGrades).length === 0
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                : "bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95"
                            }`}
                          >
                            {(isSavingGrades || loadingGrades) && (
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            )}
                            {t("saveAndSendResults")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-24 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                        <Star
                          size={48}
                          className="mx-auto text-slate-200 mb-4"
                        />
                        <p className="text-slate-400 font-bold">
                          {t("selectClassToRecordGrades")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "behavior" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {t("studentBehaviorAndReports")}
                    </h2>
                  </div>

                  <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                      <div className="relative flex-1">
                        <Search
                          size={20}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          type="text"
                          value={behaviorSearch}
                          onChange={(e) => setBehaviorSearch(e.target.value)}
                          placeholder={t("searchStudentByName")}
                          className="w-full pr-14 pl-6 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all font-display"
                        />
                      </div>
                      <div className="w-full md:w-64">
                        <select
                          value={behaviorClassFilter}
                          onChange={(e) =>
                            setBehaviorClassFilter(e.target.value)
                          }
                          className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-600/10 font-bold text-slate-900 transition-all appearance-none"
                        >
                          <option value="">{t("allClasses")}</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {students
                        .filter((s) => {
                          const matchesSearch = s.name
                            .toLowerCase()
                            .includes(behaviorSearch.toLowerCase());
                          const matchesClass = behaviorClassFilter
                            ? s.classId === behaviorClassFilter
                            : true;
                          return matchesSearch && matchesClass;
                        })
                        .map((student) => (
                          <div
                            key={student.id}
                            className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-200 hover:bg-indigo-50/10 transition-all group"
                          >
                            <div className="flex items-start gap-4 mb-6">
                              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                <User size={24} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 leading-tight">
                                  {student.name}
                                </h4>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {classes.find((c) => c.id === student.classId)
                                    ?.name || t("noClass")}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowAddReport(true);
                                }}
                                className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:border-indigo-200 hover:text-indigo-600 transition-all"
                              >
                                {t("evaluationReportShort")}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowAddBehavior(true);
                                }}
                                className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:border-indigo-200 hover:text-indigo-600 transition-all"
                              >
                                {t("behaviorReport")}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "advanced_reports" && (
                <div className="animate-in fade-in duration-500">
                  <AdvancedReports />
                </div>
              )}

              {activeTab === "id_cards" && (
                <div className="animate-in fade-in duration-500">
                  <IdCards />
                </div>
              )}

              {activeTab === "reports" && (
                <div
                  className="space-y-8 animate-in fade-in duration-500"
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {t("sentDailyEvaluationReports")}
                    </h2>
                    <button
                      onClick={() => setShowAddReport(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      <Plus size={20} />
                      {t("sendNewReport")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {sentReports.length > 0 ? (
                      sentReports.map((report) => (
                        <div
                          key={report.id}
                          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-4 border-r-indigo-600 relative overflow-hidden group hover:shadow-md transition-all"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                                <User size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {report.studentName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {t("student")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400">
                                {report.createdAt?.seconds
                                  ? new Date(
                                      report.createdAt.seconds * 1000,
                                    ).toLocaleDateString()
                                  : "الآن"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف التقرير"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">
                            {report.content}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <span
                              className={`text-[9px] font-bold px-3 py-1 rounded-full ${
                                report.target === "parents"
                                  ? "bg-orange-50 text-orange-600"
                                  : report.target === "school"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              {t("directedTo")}:{" "}
                              {report.target === "parents"
                                ? t("parents")
                                : report.target === "school"
                                  ? t("school")
                                  : t("all")}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {t("subjectLabel")}: {report.subject}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-slate-200 shadow-sm">
                        <FileText
                          size={56}
                          className="mx-auto text-slate-100 mb-6"
                        />
                        <h4 className="text-slate-900 font-bold mb-2">
                          {t("noReportsSent")}
                        </h4>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto">
                          {t("startSendingReports")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "schedules" && <Schedules />}

              {activeTab === "settings" && (
                <TeacherSettingsTab classes={classes} />
              )}

              {activeTab === "chat" && <TeacherChatTab />}
            </motion.div>
          </AnimatePresence>
          {activeTab !== "chat" && <GlobalFooter compact />}
        </div>

        {/* Floating/Sticky Mobile Navigation Dock for Teachers */}
        <MobileNavigationDock
          menuItems={sidebarItems}
          activeTab={activeTab}
          setActiveTab={(tabId) => {
            setActiveTab(tabId);
            setShowMoreMenu(false);
          }}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notificationsCount={notifications.filter((n) => !n.read).length}
          isRtl={isRtl}
        />

        {/* HomeWork Modal */}
        <AnimatePresence>
          {showAddHomework && (
            <div
              className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 font-display">
                    إضافة واجب منزلي جديد
                  </h2>
                  <button
                    onClick={() => setShowAddHomework(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <Plus className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleAddHomework} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                        {t("titleLabel")}
                      </label>
                      <input
                        required
                        type="text"
                        value={newHomework.title}
                        onChange={(e) =>
                          setNewHomework({
                            ...newHomework,
                            title: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none"
                        placeholder={t("exampleHomeworkTitle")}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                        {t("deliveryDate")}
                      </label>
                      <input
                        required
                        type="date"
                        value={newHomework.dueDate}
                        onChange={(e) =>
                          setNewHomework({
                            ...newHomework,
                            dueDate: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t("targetClass")}
                      </label>
                      {newHomework.classId &&
                        newHomework.classId !==
                          (profile as any)?.preferredClassId && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSetPreferredClass(newHomework.classId)
                            }
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                          >
                            {t("setPermanentClass")}
                          </button>
                        )}
                    </div>
                    <select
                      required
                      value={newHomework.classId}
                      onChange={(e) =>
                        setNewHomework({
                          ...newHomework,
                          classId: e.target.value,
                        })
                      }
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none appearance-none"
                    >
                      <option value="">{t("selectClass")}</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{" "}
                          {c.id === (profile as any)?.preferredClassId
                            ? t("defaultSuffix")
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      {t("subjectLabel")}
                    </label>
                    {homeworkSubjectOptions.length > 1 ? (
                      <select
                        required
                        value={homeworkPublishSubjectId}
                        onChange={(e) => setHomeworkPublishSubjectId(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none appearance-none"
                      >
                        <option value="">
                          {isRtl ? "اختر المادة" : "Select subject"}
                        </option>
                        {homeworkSubjectOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {s.className ? ` — ${s.className}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full px-5 py-3.5 bg-slate-50 rounded-xl font-bold text-slate-800">
                        {homeworkSubjectOptions[0]?.name ||
                          profile?.subject ||
                          "—"}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      {t("homeworkContentPlaceholder")}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={newHomework.content}
                      onChange={(e) =>
                        setNewHomework({
                          ...newHomework,
                          content: e.target.value,
                        })
                      }
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none"
                      placeholder={t("homeworkContentPlaceholder")}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    {t("publishHomeworkNow")}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Behavior Modal */}
        <AnimatePresence>
          {showAddBehavior && (
            <div
              className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 font-display">
                    {t("addBehaviorReport")}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddBehavior(false);
                      setSelectedStudent(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <Plus className="rotate-45" />
                  </button>
                </div>

                {selectedStudent && (
                  <div className="p-4 bg-slate-50 rounded-2xl mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase">
                          {t("student")}
                        </p>
                        <p className="text-slate-900 font-bold">
                          {selectedStudent.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSendBehaviorReport} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      {t("behaviorType")}
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setBehaviorNote({ ...behaviorNote, type: "positive" })
                        }
                        className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${behaviorNote.type === "positive" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-slate-50 border-transparent text-slate-400"}`}
                      >
                        <CheckCircle size={18} />
                        {t("positiveBehavior")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setBehaviorNote({ ...behaviorNote, type: "warning" })
                        }
                        className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${behaviorNote.type === "warning" ? "bg-red-50 border-red-500 text-red-700" : "bg-slate-50 border-transparent text-slate-400"}`}
                      >
                        <AlertTriangle size={18} />
                        {t("warningBehavior")}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      {t("behaviorDescription")}
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={behaviorNote.description}
                      onChange={(e) =>
                        setBehaviorNote({
                          ...behaviorNote,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none"
                      placeholder={t("behaviorDescriptionPlaceholder")}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    {t("saveReport")}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <AnimatePresence>
          {showAddReport && (
            <div
              className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 font-display">
                    {t("studentEvaluationReportTitle")}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddReport(false);
                      setSelectedStudent(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <Plus className="rotate-45" />
                  </button>
                </div>

                {!selectedStudent ? (
                  <div className="mb-6">
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      اختر الطالب
                    </label>
                    <select
                      required
                      onChange={(e) =>
                        setSelectedStudent(
                          students.find((s) => s.id === e.target.value),
                        )
                      }
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none appearance-none"
                    >
                      <option value="">{t("selectStudentPlaceholder")}</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (
                          {classes.find((c) => c.id === s.classId)?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase">
                          الطالب
                        </p>
                        <p className="text-slate-900 font-bold">
                          {selectedStudent.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      {t("change")}
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendReport} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      {t("directReportTo")}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "school", label: t("schoolOnly") },
                        { id: "parents", label: t("parentsOnly") },
                        { id: "both", label: t("schoolAndParents") },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setReportTarget(opt.id as any)}
                          className={`py-3 rounded-xl border text-[10px] font-bold transition-all ${reportTarget === opt.id ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-slate-500 border-slate-200"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                      نص التقرير / الملاحظات
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={reportContent}
                      onChange={(e) => setReportContent(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 rounded-xl border-none font-bold outline-none"
                      placeholder={t("reportContentPlaceholder")}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={18} />
                    {t("sendReportBtn")}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

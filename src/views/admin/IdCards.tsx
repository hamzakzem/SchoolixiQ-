import { createPortal } from "react-dom";
import React, { useState, useEffect, useRef } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Printer,
  Edit2,
  X,
  Image as ImageIcon,
  QrCode,
  Upload,
  Users,
  Check,
  Clock,
  Building,
  User,
  Settings2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import {
  handleFirestoreError,
  OperationType,
} from "../../lib/firestore-errors";
import { uploadImageToServer } from "../../lib/imageUtils";
import { printService } from "../../lib/printService";
import StudentCard from "../../components/admin/idcards/StudentCard";
import StudentCardPrint from "../../components/admin/idcards/StudentCardPrint";
import StudentGridPrint from "../../components/admin/idcards/StudentGridPrint";
import PrintPreviewModal from "../../components/admin/idcards/PrintPreviewModal";
import QRCodeSection from "../../components/admin/idcards/QRCodeSection";

import IdCardSettings from "./IdCardSettings";
import { IdCardTemplate } from "../../types/idCardTemplate";

export default function IdCards() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  
  // Printing State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<"single" | "bulk">("single");

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [idCards, setIdCards] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Template state
  const [template, setTemplate] = useState<IdCardTemplate | null>(null);

  // Card Form state
  const [photoUrl, setPhotoUrl] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [transportInfo, setTransportInfo] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [examNumber, setExamNumber] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [residenceAddress, setResidenceAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const singlePrintRef = useRef<HTMLDivElement>(null);
  const bulkPrintRef = useRef<HTMLDivElement>(null);

  const currentCard = selectedStudent ? idCards[selectedStudent.id] : null;

  const handleSinglePrint = () => {
    setPrintMode("single");
    setShowPrintModal(true);
  };

  const handleBulkPrint = () => {
    setPrintMode("bulk");
    setShowPrintModal(true);
  };
  
  const handlePrintComplete = async (printedCount: number) => {
    if (printMode === "single" && selectedStudent) {
      await printService.incrementPrintCount("id_cards", selectedStudent.id);
      await printService.logPrintAction(
        profile?.schoolId || "",
        profile?.uid || "",
        "Single ID Card",
        printedCount,
      );
      toast.success(isRtl ? "تمت الطباعة بنجاح" : "Print successful");
    } else if (printMode === "bulk") {
      const cardsToPrint = students.filter((s) => idCards[s.id]);
      for (const student of cardsToPrint) {
        await printService.incrementPrintCount("id_cards", student.id);
      }
      await printService.logPrintAction(
        profile?.schoolId || "",
        profile?.uid || "",
        "Bulk Class ID Cards",
        printedCount,
      );
      toast.success(isRtl ? "تمت الطباعة بنجاح" : "Print successful");
    }
  };
  useEffect(() => {
    if (!profile?.schoolId) return;
    const fetchTemplate = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docRef = doc(
          db,
          "schools",
          profile.schoolId,
          "settings",
          "idCardTemplate",
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTemplate(docSnap.data() as IdCardTemplate);
        }
      } catch (error) {
        console.error("Error fetching template", error);
      }
    };
    fetchTemplate();

    const q = query(
      collection(db, "classes"),
      where("schoolId", "==", profile.schoolId),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const classData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClasses(classData);
        if (classData.length > 0 && !selectedClassId)
          setSelectedClassId(classData[0].id);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "classes"),
    );
    return () => unsubscribe();
  }, [profile]);

  // Fetch students for selected class
  useEffect(() => {
    if (!profile?.schoolId || !selectedClassId) {
      setStudents([]);
      return;
    }
    const q = query(
      collection(db, "students"),
      where("schoolId", "==", profile.schoolId),
      where("classId", "==", selectedClassId),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setStudents(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, "students"),
    );
    return () => unsubscribe();
  }, [profile, selectedClassId]);

  // Fetch id cards
  useEffect(() => {
    if (!profile?.schoolId) return;
    setLoading(true);

    const cardsQ = query(
      collection(db, "id_cards"),
      where("schoolId", "==", profile.schoolId),
    );

    const unsubscribe = onSnapshot(
      cardsQ,
      (snapshot) => {
        const cardsObj: Record<string, any> = {};
        snapshot.docs.forEach((doc) => {
          cardsObj[doc.data().studentId] = { id: doc.id, ...doc.data() };
        });
        setIdCards(cardsObj);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "id_cards");
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    // Check file size (max 5MB just to be safe as we compress anyway)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        isRtl
          ? "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت"
          : "Image size must not exceed 5MB",
      );
      return;
    }

    try {
      setIsSaving(true);
      const url = await uploadImageToServer(
        file,
        `students/${selectedStudent.id}/id_card_${Date.now()}`,
        400,
        400,
      );
      setPhotoUrl(url);
      toast.success(
        isRtl ? "تم رفع الصورة بنجاح" : "Image uploaded successfully",
      );
    } catch (error) {
      console.error("Error preparing image:", error);
      toast.error(isRtl ? "فشل رفع الصورة" : "Failed to upload image");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCard = async () => {
    if (!selectedStudent || !profile) return;
    setIsSaving(true);
    try {
      const cardRef = doc(collection(db, "id_cards"), selectedStudent.id);

      await setDoc(cardRef, {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        classId: selectedClassId,
        className: classes.find((c) => c.id === selectedClassId)?.name || "",
        parentIds: selectedStudent.parentIds || [],
        parentEmail: (selectedStudent.parentEmail || "").toLowerCase(),
        schoolId: profile.schoolId,
        schoolName,
        photoUrl,
        bloodType,
        transportInfo,
        driverName,
        driverPhone,
        carNumber,
        guardianName,
        schoolPhone,
        issueDate,
        validUntil,
        examNumber,
        residenceAddress,
        updatedAt: serverTimestamp(),
      });

      if (photoUrl && photoUrl !== selectedStudent.photoUrl) {
        const studentRef = doc(db, "students", selectedStudent.id);
        await updateDoc(studentRef, { photoUrl });
      }

      toast.success(
        isRtl ? "تم حفظ الهوية بنجاح" : "ID Card saved successfully",
      );
      setShowEditModal(false);
      setIsSaving(false);
    } catch (error) {
      toast.error(isRtl ? "فشل الحفظ" : "Failed to save");
      setIsSaving(false);
      handleFirestoreError(error, OperationType.WRITE, "id_cards");
    }
  };

  const handleDeleteCard = async (studentId: string) => {
    if (
      confirm(
        isRtl
          ? "هل أنت متأكد من حذف هذه الهوية؟"
          : "Are you sure you want to delete this ID card?",
      )
    ) {
      try {
        await deleteDoc(doc(db, "id_cards", studentId));
        toast.success(
          isRtl ? "تم حذف الهوية بنجاح" : "ID Card deleted successfully",
        );
      } catch (error) {
        toast.error(isRtl ? "فشل الحذف" : "Deletion failed");
        handleFirestoreError(
          error,
          OperationType.DELETE,
          `id_cards/${studentId}`,
        );
      }
    }
  };

  const canPrintBulk = students.filter((s) => idCards[s.id]).length > 0;

  if (showSettings) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-transparent mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">
              {isRtl ? "إعدادات الهوية المدرسية" : "ID Card Settings"}
            </h1>
            <p className="text-slate-500 mt-1">
              {isRtl ? "تخصيص شكل وقالب الهوية" : "Customize card appearance"}
            </p>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold transition-colors shadow-lg"
          >
            {isRtl ? "العودة للبطاقات" : "Back to Cards"}
          </button>
        </div>
        <IdCardSettings />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">
            {isRtl ? "هويات الطالب" : "Student ID Cards"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isRtl
              ? "إصدار وتعديل الهويات المدرسية للطلاب"
              : "Generate and manage student ID cards"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Settings2 size={18} />
            <span className="hidden sm:inline">
              {isRtl ? "تخصيص الهوية" : "Card Template"}
            </span>
          </button>

          {canPrintBulk && (
            <button
              onClick={() => handleBulkPrint()}
              className="px-4 py-2 bg-[#e8eef5] dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-200 transition-colors"
            >
              <Users size={18} />
              <span>{isRtl ? "طباعة القائمة" : "Print All"}</span>
            </button>
          )}
          {currentCard && (
            <button
              onClick={() => handleSinglePrint()}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"
            >
              <Printer size={18} />
              <span>{isRtl ? "طباعة الهوية" : "Print Card"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar: Classes & Students (Hidden on Print) */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 px-2">
              {isRtl ? "اختر الصف" : "Select Class"}
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pl-2 pr-1 custom-scrollbar">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedClassId === cls.id ? "bg-[#0B2345] text-white shadow-md" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4 flex-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 px-2">
              {isRtl ? "اختر الطالب" : "Select Student"}
            </h3>
            <div className="space-y-2 h-[calc(100vh-180px)] min-h-[600px] overflow-y-auto pl-2 pr-1 custom-scrollbar">
              {students.map((student) => {
                const hasCard = !!idCards[student.id];
                return (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full text-right px-4 py-3 rounded-xl flex items-center justify-between transition-all ${selectedStudent?.id === student.id ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800/30 border" : "bg-transparent border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudent?.id === student.id ? "bg-[#0B2345] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
                      >
                        {hasCard ? (
                          <ShieldCheck size={14} className="text-emerald-500" />
                        ) : (
                          student.name[0]
                        )}
                      </div>
                      <span className="font-bold text-sm truncate">
                        {student.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right content: Card Preview */}
        <div className="lg:col-span-3 space-y-6">
          {selectedStudent ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-100px)] min-h-[800px] print:border-none print:shadow-none print:h-auto print:min-h-0 print:overflow-visible">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 print:hidden">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#e8eef5] dark:bg-indigo-900/50 text-[#0B2345] dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedStudent.name}
                    </h2>
                    <p className="text-sm font-bold text-slate-400">
                      {
                        classes.find((c) => c.id === selectedStudent.classId)
                          ?.name
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentCard && (
                    <button
                      onClick={() => handleDeleteCard(selectedStudent.id)}
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline">
                        {isRtl ? "حذف الهوية" : "Delete"}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (currentCard) {
                        setPhotoUrl(currentCard.photoUrl || "");
                        setBloodType(currentCard.bloodType || "");
                        setTransportInfo(currentCard.transportInfo || "");
                        setDriverName(currentCard.driverName || "");
                        setDriverPhone(currentCard.driverPhone || "");
                        setCarNumber(currentCard.carNumber || "");
                        setGuardianName(currentCard.guardianName || "");
                        setSchoolPhone(currentCard.schoolPhone || "");
                        setIssueDate(currentCard.issueDate || "");
                        setValidUntil(currentCard.validUntil || "");
                        setExamNumber(currentCard.examNumber || selectedStudent.examNumber || "");
                        setResidenceAddress(
                          currentCard.residenceAddress ||
                            selectedStudent.address ||
                            "",
                        );
                        setSchoolName(
                          currentCard.schoolName || profile.schoolName || "",
                        );
                      } else {
                        setPhotoUrl("");
                        setBloodType("");
                        setTransportInfo("");
                        setDriverName("");
                        setDriverPhone(selectedStudent.driverPhone || "");
                        setCarNumber("");
                        setGuardianName("");
                        setSchoolPhone(profile.schoolPhone || profile.phone || "");
                        setExamNumber(selectedStudent.examNumber || "");
                        setIssueDate(new Date().toISOString().split("T")[0]);
                        setValidUntil(new Date().getFullYear() + 1 + "");
                        setResidenceAddress(selectedStudent.address || "");
                        setSchoolName(profile.schoolName || "");
                      }
                      setShowEditModal(true);
                    }}
                    className="px-4 py-2 bg-[#0B2345] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    {currentCard ? <Edit2 size={18} /> : <Plus size={18} />}
                    <span className="hidden sm:inline">
                      {currentCard
                        ? isRtl
                          ? "تعديل الهوية"
                          : "Edit Card"
                        : isRtl
                          ? "إصدار هوية"
                          : "Create Card"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 flex items-center justify-center bg-slate-50 dark:bg-slate-900 print:bg-white print:p-0">
                {currentCard ? (
                  <div className="scale-125 origin-center">
                    <StudentCard
                      student={selectedStudent}
                      cardData={currentCard}
                      isRtl={isRtl}
                      template={template}
                    />
                  </div>
                ) : (
                  <div className="text-center text-slate-400 space-y-4 print:hidden">
                    <ShieldCheck size={64} className="mx-auto opacity-20" />
                    <p className="font-bold">
                      {isRtl
                        ? "لم يتم إصدار هوية لهذا الطالب"
                        : "No ID card issued for this student"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm h-[calc(100vh-100px)] min-h-[800px] flex items-center justify-center p-8 print:hidden relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-full h-full opacity-[0.02] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 100% 0%, #4f46e5 0%, transparent 50%), radial-gradient(circle at 0% 100%, #4f46e5 0%, transparent 50%)",
                }}
              />

              <div className="text-right space-y-8 max-w-2xl text-slate-600 dark:text-slate-300 relative z-10 w-full">
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-[#0B2345] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative">
                    <div className="absolute inset-0 bg-indigo-400/20 blur-xl rounded-full animate-pulse" />
                    <QrCode size={40} className="relative z-10" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3">
                    {isRtl
                      ? "الهوية الذكية: مفتاح للنظام"
                      : "Smart ID: The System Key"}
                  </h3>
                  <p className="text-slate-500 font-medium text-lg">
                    {isRtl
                      ? "الهوية الحديثة ليست مجرد ورقة، بل هي أداة ربط متكاملة."
                      : "A modern ID is not just paper, it's a complete ecosystem."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4 text-[#0B2345] dark:text-indigo-400">
                      <div className="p-2 bg-[#e8eef5] dark:bg-indigo-900/50 rounded-lg">
                        <Check size={20} />
                      </div>
                      <strong className="text-lg">
                        {isRtl ? "تسجيل الحضور بالمسح" : "Scan to Attend"}
                      </strong>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      {isRtl
                        ? "عبر مسح الباركود، يمكنك تسجيل حضور الطالب بضغطة زر واحدة. قل وداعاً لكتابة الأسماء والأخطاء البشرية."
                        : "Scan the QR code to log student attendance in 1 click. Say goodbye to manual entry and human errors."}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                        <User size={20} />
                      </div>
                      <strong className="text-lg">
                        {isRtl ? "سجل إلكتروني فوري" : "Instant Student Record"}
                      </strong>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      {isRtl
                        ? "بمجرد مسح الـ QR تظهر بيانات الطالب الكاملة للإدارة. مفيد في الامتحانات، الدخول، والمكتبة المدرسية."
                        : "Scanning the DB pulls up full student details instantly. Perfect for exams, gates, and the library."}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4 text-orange-600 dark:text-orange-400">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                        <Building size={20} />
                      </div>
                      <strong className="text-lg">
                        {isRtl ? "رفع قيمة المؤسسة" : "Elevate School Image"}
                      </strong>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      {isRtl
                        ? "النظام المتكامل يمنح انطباعاً عالياً بالاحترافية والتنظيم التقني للآباء والمجتمع التعليمي."
                        : "Showcase technical professionalism. A complete system impresses parents and the community."}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-4 text-[#0B2345] dark:text-blue-400">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                        <Clock size={20} />
                      </div>
                      <strong className="text-lg">
                        {isRtl ? "عملي وسريع جداً" : "Practical & Ultra Fast"}
                      </strong>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      {isRtl
                        ? "استخدم كاميرا أي هاتف ذكي للتحقق. لا حاجة لبرمجيات أو أجهزة المسح المعقدة بعد اليوم."
                        : "Use any smartphone camera to verify. No need for complex mapping or expensive scanning hardware."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {template && (
        <AnimatePresence>
          {showPrintModal && (
            <PrintPreviewModal
              isOpen={showPrintModal}
              onClose={() => setShowPrintModal(false)}
              students={printMode === "single" && selectedStudent ? [selectedStudent] : students.filter((s) => idCards[s.id])}
              idCards={idCards}
              isRtl={isRtl}
              template={template}
              title={printMode === "single" ? `Student-ID-${selectedStudent?.name || "Card"}` : `Class-IDs-${classes.find((c) => c.id === selectedClassId)?.name || "Class"}`}
              onAfterPrint={handlePrintComplete}
            />
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setShowEditModal(false)}
                className="absolute top-6 left-6 rtl:right-6 rtl:left-auto p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {currentCard
                  ? isRtl
                    ? "تعديل الهوية"
                    : "Edit ID Card"
                  : isRtl
                    ? "إصدار هوية جديدة"
                    : "Create ID Card"}
              </h2>
              <p className="text-slate-500 font-bold mb-6">
                {selectedStudent?.name}
              </p>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 flex flex-col gap-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    {isRtl ? "الصورة الشخصية" : "Profile Photo"}
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full aspect-square bg-indigo-50 hover:bg-[#e8eef5] dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-[#0B2345] dark:text-indigo-400 font-bold rounded-2xl border border-indigo-200 dark:border-indigo-800/50 border-dashed transition-all overflow-hidden"
                    >
                      {photoUrl ? (
                        <img src={photoUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Upload size={24} />
                          <span className="text-xs text-center px-4">
                            {isRtl
                              ? "رفع صورة"
                              : "Upload photo"}
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700" />
                    <span className="text-[10px] font-bold text-slate-400">
                      {isRtl ? "أو رابط" : "OR URL"}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    dir="ltr"
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div className="md:w-2/3 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "اسم المدرسة" : "School Name"}
                      </label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder={isRtl ? "اسم المدرسة..." : "School name..."}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "فصيلة الدم" : "Blood Type"}
                      </label>
                      <input
                        type="text"
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        placeholder="e.g. O+"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "تاريخ الإصدار" : "Issue Date"}
                      </label>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "تاريخ الصلاحية" : "Valid Until"}
                      </label>
                      <input
                        type="text"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        placeholder="e.g. 2026"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "الرقم الامتحاني" : "Exam Number"}
                      </label>
                      <input
                        type="text"
                        value={examNumber}
                        onChange={(e) => setExamNumber(e.target.value)}
                        placeholder={isRtl ? "الرقم الامتحاني..." : "Exam Number..."}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 line-clamp-1">
                        {isRtl
                          ? "معلومات المواصلات (اختياري)"
                          : "Transport Info"}
                      </label>
                      <input
                        type="text"
                        value={transportInfo}
                        onChange={(e) => setTransportInfo(e.target.value)}
                        dir="auto"
                        placeholder={
                          isRtl
                            ? "رقم الحافلة، المنطقة..."
                            : "Bus number, area..."
                        }
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "عنوان السكن" : "Residence Address"}
                      </label>
                      <input
                        type="text"
                        value={residenceAddress}
                        onChange={(e) => setResidenceAddress(e.target.value)}
                        placeholder={
                          isRtl ? "المحافظة، الحي..." : "City, Area..."
                        }
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800 my-2" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "اسم ولي الأمر" : "Guardian Name"}
                      </label>
                      <input
                        type="text"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder={isRtl ? "ولي الأمر" : "Guardian"}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "اسم السائق" : "Driver Name"}
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder={isRtl ? "السائق" : "Driver"}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "رقم هاتف السائق" : "Driver Phone"}
                      </label>
                      <input
                        type="text"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="07..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "هاتف المدرسة" : "School Phone"}
                      </label>
                      <input
                        type="text"
                        value={schoolPhone}
                        onChange={(e) => setSchoolPhone(e.target.value)}
                        placeholder="07..."
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {isRtl ? "رقم السيارة" : "Car Number"}
                      </label>
                      <input
                        type="text"
                        value={carNumber}
                        onChange={(e) => setCarNumber(e.target.value)}
                        placeholder="أ 12345"
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-5 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                    >
                      {isRtl ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      onClick={handleSaveCard}
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl font-bold bg-[#0B2345] text-white flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : isRtl ? (
                        "حفظ البيانات"
                      ) : (
                        "Save Details"
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

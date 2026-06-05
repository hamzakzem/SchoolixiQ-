import React, { useState, useEffect, useRef } from "react";
import { Capacitor } from '@capacitor/core';
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  writeBatch,
  doc,
} from "firebase/firestore";
import { useAuth } from "../../lib/AuthContext";
import {
  Search,
  Loader2,
  Printer,
  ChevronRight,
  FileArchive,
  Save,
  CalendarDays,
  Filter,
  Edit2,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import {
  handleFirestoreError,
  OperationType,
} from "../../lib/firestore-errors";
import { printElement } from "../../lib/printUtils";

const ARCHIVE_COLUMNS = [
  {
    id: "term1",
    label: "معدل النصف الاول",
    matchTerms: ["فصل اول", "معدل النصف الاول"],
  },
  {
    id: "midYear",
    label: "درجة امتحان نصف السنة",
    matchTerms: ["نصف السنه", "درجة امتحان نصف السنة"],
  },
  {
    id: "term2",
    label: "معدل النصف الثاني",
    matchTerms: ["فصل ثاني", "معدل النصف الثاني"],
  },
  {
    id: "annual",
    label: "معدل السعي السنوي",
    matchTerms: ["سعي سنوي", "معدل السعي السنوي"],
  },
  {
    id: "final",
    label: "درجة الامتحان النهائي",
    matchTerms: ["نهاية السنه", "درجة الامتحان النهائي"],
  },
  {
    id: "finalGrade",
    label: "الدرجة النهائية",
    matchTerms: ["الدرجة النهائية"],
  },
  { id: "notes", label: "الملاحظات", matchTerms: ["الملاحظات"] },
  { id: "result", label: "النتيجة", matchTerms: ["النتيجة"] },
  { id: "manager", label: "اسم المدير", matchTerms: ["اسم المدير"] },
];

export default function StudentArchive() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const printWindowRef = useRef<Window | null>(null);

  // Fetch classes
  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;

    const fetchClasses = async () => {
      try {
        const q = query(
          collection(db, "classes"),
          where("schoolId", "==", profile.schoolId),
        );
        const snap = await getDocs(q);
        if (isMounted) {
          setClasses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "classes");
      }
    };
    fetchClasses();
    return () => {
      isMounted = false;
    };
  }, [profile]);

  // Fetch students
  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        let q;
        if (selectedClassId !== "all") {
          q = query(
            collection(db, "students"),
            where("schoolId", "==", profile.schoolId),
            where("classId", "==", selectedClassId),
          );
        } else {
          q = query(
            collection(db, "students"),
            where("schoolId", "==", profile.schoolId),
          );
        }

        const snap = await getDocs(q);
        if (!isMounted) return;

        let fetchedStudents = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as object),
        }));

        // Sort alphabetically in Arabic
        fetchedStudents = fetchedStudents.sort((a: any, b: any) =>
          a.name.localeCompare(b.name, "ar"),
        );

        setStudents(fetchedStudents);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "students");
      } finally {
        if (isMounted) setLoadingStudents(false);
      }
    };
    fetchStudents();
    return () => {
      isMounted = false;
    };
  }, [profile, selectedClassId]);

  // Fetch selected student grades
  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId || !selectedStudent) {
      setStudentGrades([]);
      return;
    }

    const fetchArchiveGrades = async () => {
      setLoadingGrades(true);
      try {
        const q = query(
          collection(db, "grades"),
          where("schoolId", "==", profile.schoolId),
          where("studentId", "==", selectedStudent.id),
        );
        const snap = await getDocs(q);
        if (!isMounted) return;

        setStudentGrades(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "grades");
      } finally {
        if (isMounted) setLoadingGrades(false);
      }
    };

    fetchArchiveGrades();
    return () => {
      isMounted = false;
    };
  }, [selectedStudent, profile]);

  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchQuery) ||
      (s.nationalId && s.nationalId.includes(searchQuery)),
  );

  const handlePrintClick = () => {
    if (!printRef.current) {
      toast.error("لا توجد بيانات للطباعة");
      return;
    }
    const title = `أرشيف-درجات-${selectedStudent?.name || "طالب"}`;
    const success = printElement(printRef.current, title);
    if (!success) {
      toast.error("يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة");
    }
  };

  const currentMonthYear = new Date().toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "long",
  });
  const [editingYear, setEditingYear] = useState<{
    oldYear: string;
    newYear: string;
  } | null>(null);
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);

  const confirmDeleteYear = async (year: string) => {
    const gradesToDelete = studentGrades.filter((g) => g.year === year);
    if (!gradesToDelete.length) return;

    try {
      const batch = writeBatch(db);
      gradesToDelete.forEach((g) => {
        batch.delete(doc(db, "grades", g.id));
      });
      await batch.commit();

      setStudentGrades((prev) => prev.filter((g) => g.year !== year));
      toast.success(`تم حذف درجات عام ${year} بنجاح`);
      setYearToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "grades");
      toast.error("فشل في حذف السجل");
    }
  };

  const handleUpdateYear = async () => {
    if (
      !editingYear ||
      !editingYear.newYear.trim() ||
      editingYear.oldYear === editingYear.newYear
    )
      return;

    const gradesToUpdate = studentGrades.filter(
      (g) => g.year === editingYear.oldYear,
    );
    if (!gradesToUpdate.length) return;

    try {
      const batch = writeBatch(db);
      gradesToUpdate.forEach((g) => {
        batch.update(doc(db, "grades", g.id), { year: editingYear.newYear });
      });
      await batch.commit();

      setStudentGrades((prev) =>
        prev.map((g) =>
          g.year === editingYear.oldYear
            ? { ...g, year: editingYear.newYear }
            : g,
        ),
      );

      toast.success("تم تحديث العام الدراسي بنجاح");
      setEditingYear(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "grades");
      toast.error("فشل في تحديث العام الدراسي");
    }
  };

  const handleSaveArchive = async () => {
    if (!selectedStudent || !profile) return;
    if (studentGrades.length === 0) {
      toast.error("لا توجد درجات مقيدة لحفظها في الأرشيف");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save to Firestore (sanitize grades to avoid custom object errors)
      const sanitizedGrades = JSON.parse(JSON.stringify(studentGrades));

      await addDoc(collection(db, "student_archives"), {
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        archiveDate: currentMonthYear,
        gradesSnapshot: sanitizedGrades,
        createdAt: serverTimestamp(),
        recordedBy: profile.uid,
      });

      // 2. Download as PDF (wrapped in try-catch to not break if import fails)
      try {
        if (printRef.current) {
          const { toPng } = await import("html-to-image");
          const { default: jsPDF } = await import("jspdf");

          const dataUrl = await toPng(printRef.current, {
            cacheBust: true,
            style: { background: "white" },
            pixelRatio: 2,
          });

          const pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4",
          });

          const imgProps = pdf.getImageProperties(dataUrl);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          const { savePdf } = await import("../../lib/pdfUtils");
          pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
          const pdfFileName = `أرشيف_${selectedStudent.name}_${currentMonthYear}.pdf`;
          
          if (Capacitor.isNativePlatform()) {
             const dataUriString = pdf.output('datauristring');
             await savePdf(dataUriString, pdfFileName);
          } else {
             pdf.save(pdfFileName);
          }
        }
      } catch (pdfError) {
        console.error("PDF Generation failed:", pdfError);
        toast.error(
          "تم أرشفة السجل، لكن فشل توليد ملف الـ PDF تلقائياً. يمكنك الطباعة كبي دي إف عوضاً عن ذلك.",
        );
      }

      toast.success("تم أرشفة سجل الطالب بنجاح!");
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, "student_archives");
      toast.error("فشل في حفظ الأرشيف");
    } finally {
      setIsSaving(false);
    }
  };

  // Group grades by year
  const gradesByYear = studentGrades.reduce(
    (acc, grade) => {
      if (!acc[grade.year]) acc[grade.year] = [];
      acc[grade.year].push(grade);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const years = Object.keys(gradesByYear).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {!selectedStudent ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                أرشيف الطالب
              </h1>
              <p className="text-sm font-bold text-slate-500 mt-1">
                البحث في السجلات الدراسية للطلاب وعرض درجاتهم السنوية
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="بحث عن طالب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl font-bold w-full sm:min-w-[250px] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="relative flex-1 sm:flex-initial">
                <Filter
                  size={18}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 appearance-none w-full sm:min-w-[180px]"
                >
                  <option value="all">التصفية (جميع الصفوف)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
            {loadingStudents ? (
              <div className="flex items-center justify-center p-20">
                <Loader2 size={32} className="animate-spin text-slate-400" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                <FileArchive size={64} className="mb-4 opacity-20" />
                <p className="font-bold text-lg">
                  لم يتم العثور على طلاب مطابِقين
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 md:p-6 bg-slate-50/50">
                {filteredStudents.map((student, idx) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="p-5 text-right bg-white border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 hover:border-indigo-500 hover:shadow-sm transition-all duration-200 flex items-center justify-between group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-base">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-[#0B2345] transition-colors">
                          {student.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                          {classes.find((c) => c.id === student.classId)
                            ?.name || "غير محدد"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-slate-300 group-hover:text-indigo-500 transform transition-transform group-hover:-translate-x-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 no-print">
              <button
                onClick={() => setSelectedStudent(null)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors w-full sm:w-auto"
              >
                <ChevronRight size={18} />
                عودة للقائمة
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePrintClick}
                  disabled={loadingGrades}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                >
                  <Printer size={18} />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={async () => {
                    if (!printRef.current) return;
                    toast.loading("جاري تجهيز ملف الـ PDF...", {
                      id: "pdf-toast",
                    });
                    try {
                      const { toPng } = await import("html-to-image");
                      const { default: jsPDF } = await import("jspdf");

                      const dataUrl = await toPng(printRef.current, {
                        cacheBust: true,
                        style: { background: "white" },
                        pixelRatio: 2,
                      });

                      const pdf = new jsPDF({
                        orientation: "p",
                        unit: "mm",
                        format: "a4",
                      });

                      const imgProps = pdf.getImageProperties(dataUrl);
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight =
                        (imgProps.height * pdfWidth) / imgProps.width;

                      const { savePdf } = await import("../../lib/pdfUtils");
                      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
                      const pdfFileName = `أرشيف_${selectedStudent?.name || "طالب"}.pdf`;

                      if (Capacitor.isNativePlatform()) {
                        const dataUriString = pdf.output('datauristring');
                        const ok = await savePdf(dataUriString, pdfFileName);
                        if (ok) {
                          toast.success("تم تنزيل وتخزين ملف الـ PDF بنجاح في المستندات", {
                            id: "pdf-toast",
                          });
                        }
                      } else {
                        pdf.save(pdfFileName);
                        toast.success("تم تنزيل ملف الـ PDF بنجاح", {
                          id: "pdf-toast",
                        });
                      }
                    } catch (e) {
                      console.error("PDF generation error: ", e);
                      toast.error("حدث خطأ أثناء تنزيل الملف", {
                        id: "pdf-toast",
                      });
                    }
                  }}
                  disabled={loadingGrades}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                  <span>تنزيل PDF</span>
                </button>
                <button
                  onClick={handleSaveArchive}
                  disabled={loadingGrades || isSaving}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B2345] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  <span>حفظ كأرشيف</span>
                </button>
              </div>
            </div>

            {/* Printable Archive Paper */}
            <div
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 md:p-10 print:shadow-none print:border-none print:p-0 min-h-[800px] print:min-h-0 relative overflow-hidden print:overflow-visible"
              ref={printRef}
            >
              {/* Print Only Header */}
              <div className="hidden print:block text-center mb-8 border-b-4 border-slate-900 pb-6 relative">
                <div className="absolute left-0 top-0 text-left">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    الرقم المرجعي
                  </p>
                  <p className="font-mono text-sm">
                    {selectedStudent.id.substring(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="absolute right-0 top-0 text-right space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    تاريخ السجل
                  </p>
                  <p className="font-mono text-sm">{currentMonthYear}</p>
                </div>

                <div className="inline-block p-4 bg-white border-2 border-slate-900 rounded-xl mb-4 rotate-3">
                  <FileArchive size={32} className="text-slate-900" />
                </div>
                <h1 className="text-3xl font-black text-slate-900">
                  سجل درجات الطالب - أرشيف
                </h1>
                <h2 className="text-xl font-bold text-slate-700 mt-2">
                  {profile?.schoolName}
                </h2>
              </div>

              {/* Student Header Info for both screen and print */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-100 mb-8 print:bg-transparent print:border-b-2 print:border-slate-900 print:rounded-none px-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    اسم الطالب
                  </h3>
                  <h2 className="text-2xl font-black text-slate-900">
                    {selectedStudent.name}
                  </h2>
                </div>
                <div className="text-right sm:text-left space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      الصف الحالي
                    </h3>
                    <p className="font-bold text-slate-900">
                      {classes.find((c) => c.id === selectedStudent.classId)
                        ?.name || "غير محدد"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grades Content */}
              {loadingGrades ? (
                <div className="flex justify-center p-20">
                  <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
              ) : studentGrades.length === 0 ? (
                <div className="text-center p-20 border-2 border-dashed border-slate-200 rounded-2xl print:border-none print:mt-20">
                  <p className="text-lg font-bold text-slate-400">
                    لا يوجد أرشيف درجات لهذا الطالب
                  </p>
                </div>
              ) : (
                <div className="space-y-12">
                  {years.map((year) => {
                    const yearGrades = gradesByYear[year];
                    // Extract unique subjects for this year
                    const subjectsList: string[] = Array.from(
                      new Set(yearGrades.map((g: any) => String(g.subject))),
                    );

                    return (
                      <div
                        key={year}
                        className="break-inside-avoid shadow-sm rounded-xl overflow-hidden print:overflow-visible border border-slate-200 print:shadow-none print:rounded-none print:border-none print:mb-12"
                      >
                        <div className="bg-slate-900 text-white p-4 flex flex-row flex-wrap sm:flex-nowrap gap-3 items-center justify-between print:text-slate-900 print:bg-transparent print:border-b-2 print:border-slate-900">
                          <div className="flex items-center gap-3">
                            <CalendarDays size={20} />
                            {editingYear?.oldYear === year ? (
                              <div className="flex items-center gap-2">
                                <input
                                  value={editingYear.newYear}
                                  onChange={(e) =>
                                    setEditingYear({
                                      ...editingYear,
                                      newYear: e.target.value,
                                    })
                                  }
                                  className="bg-slate-800 text-white border border-slate-700 px-3 py-1 rounded-md text-sm outline-none focus:border-indigo-500 w-32"
                                  autoFocus
                                  dir="ltr"
                                />
                                <button
                                  onClick={handleUpdateYear}
                                  className="p-1.5 hover:text-green-400 transition-colors bg-slate-800 rounded-md border border-slate-700"
                                  title="حفظ"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingYear(null)}
                                  className="p-1.5 hover:text-red-400 transition-colors bg-slate-800 rounded-md border border-slate-700"
                                  title="إلغاء"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <h3 className="text-lg font-bold">
                                العام الدراسي {year}
                              </h3>
                            )}
                          </div>

                          {yearToDelete === year ? (
                            <div className="flex items-center gap-2 no-print">
                              <span className="text-xs text-red-400 font-bold ml-2">
                                تأكيد الحذف؟
                              </span>
                              <button
                                onClick={() => confirmDeleteYear(year)}
                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30"
                                title="تأكيد الحذف"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setYearToDelete(null)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                                title="إلغاء"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            !editingYear && (
                              <div className="flex items-center gap-2 no-print">
                                <button
                                  onClick={() =>
                                    setEditingYear({
                                      oldYear: year,
                                      newYear: year,
                                    })
                                  }
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                                  title="تعديل العام الدراسي"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => setYearToDelete(year)}
                                  className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-lg transition-colors border border-slate-700 hover:border-red-500/30"
                                  title="حذف هذا السجل"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        {/* Desktop Widescreen View (Large Screen View and absolute Print output) */}
                        <div className="hidden lg:block print:block overflow-x-auto print:overflow-visible">
                          <table className="w-full text-right border-collapse print:border print:border-slate-300">
                            <thead className="bg-slate-50 font-bold text-[10px] text-slate-500 uppercase">
                              <tr>
                                <th className="p-3 border-b border-l border-slate-200 print:border-slate-300 print:p-2 w-40">
                                  المادة
                                </th>
                                {ARCHIVE_COLUMNS.map((col) => (
                                  <th
                                    key={col.id}
                                    className="p-3 border-b border-l border-slate-200 print:border-slate-300 print:p-2 text-center"
                                  >
                                    {col.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {subjectsList.map((subject) => {
                                return (
                                  <tr
                                    key={subject}
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors print:border-b-2 print:border-slate-300"
                                  >
                                    <td className="p-3 border-l border-slate-100 font-bold text-slate-900 print:border-slate-300 print:p-2">
                                      {subject}
                                    </td>
                                    {ARCHIVE_COLUMNS.map((col) => {
                                      const gradeEntry = yearGrades.find(
                                        (g) =>
                                          g.subject === subject &&
                                          col.matchTerms.includes(g.term),
                                      );
                                      return (
                                        <td
                                          key={col.id}
                                          className="p-3 border-l border-slate-100 text-center print:border-slate-300 print:p-2"
                                        >
                                          {gradeEntry ? (
                                            <span className="font-mono font-bold text-slate-900 flex flex-col">
                                              <span>{gradeEntry.score}</span>
                                              <span className="text-[10px] text-slate-400">
                                                /{gradeEntry.maxScore || 100}
                                              </span>
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 print:text-transparent">
                                              -
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile and iPad Portrait Layout (Slick Responsive Mode) */}
                        <div className="block lg:hidden print:hidden space-y-4 p-4 bg-slate-50/50">
                          {subjectsList.map((subject) => {
                            return (
                              <div
                                key={subject}
                                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
                              >
                                <div className="border-b border-slate-100 pb-2 mb-3">
                                  <h4 className="font-bold text-slate-800 text-base">
                                    {subject}
                                  </h4>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {ARCHIVE_COLUMNS.map((col) => {
                                    const gradeEntry = yearGrades.find(
                                      (g) =>
                                        g.subject === subject &&
                                        col.matchTerms.includes(g.term),
                                    );

                                    if (
                                      !gradeEntry &&
                                      (col.id === "notes" ||
                                        col.id === "manager")
                                    )
                                      return null;

                                    return (
                                      <div
                                        key={col.id}
                                        className={`p-2.5 rounded-xl flex flex-col justify-between ${
                                          col.id === "finalGrade"
                                            ? "bg-indigo-50/50 border border-indigo-100/50 col-span-2 sm:col-span-1"
                                            : col.id === "result"
                                              ? "bg-emerald-50/50 border border-emerald-100/50"
                                              : "bg-slate-50/40 border border-slate-100/30"
                                        }`}
                                      >
                                        <span className="text-[10px] text-slate-400 font-bold mb-1 truncate">
                                          {col.label}
                                        </span>
                                        {gradeEntry ? (
                                          <div className="flex items-baseline gap-1">
                                            <span
                                              className={`font-mono font-bold text-sm ${
                                                col.id === "finalGrade"
                                                  ? "text-[#0B2345] text-base"
                                                  : "text-slate-800"
                                              }`}
                                            >
                                              {gradeEntry.score}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold">
                                              /{gradeEntry.maxScore || 100}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300 font-bold text-xs">
                                            -
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-slate-50 p-4 border-t border-slate-200 text-[10px] font-bold text-slate-400 print:bg-transparent print:border-none print:mt-2">
                          <span>
                            * تم تزامن هذا الأرشيف تلقائياً بناءً على درجات
                            الطالب المدخلة في النظام
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Print Styles Configuration */}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

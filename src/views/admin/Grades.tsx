import React, { useState, useEffect, useRef } from 'react';
import { printElement } from '../../lib/printUtils';
import { printService } from '../../lib/printService';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, doc, limit } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { BarChart3, Trophy, Save, ChevronRight, BookOpen, GraduationCap, Star, Plus, Edit2, Printer, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GradesPrint from '../../components/print/GradesPrint';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../../lib/notificationService';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useLanguage } from '../../lib/LanguageContext';

export default function Grades() {
  const { profile } = useAuth();
  const { t, isRtl } = useLanguage();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('معدل النصف الاول');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [printTarget, setPrintTarget] = useState<any | null>(null);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'cards'>('cards');
  const [subjectFilter, setSubjectFilter] = useState<string | 'all'>('all');
  const [printMode, setPrintMode] = useState<'table' | 'cards'>('table');

  const hasAutoPrinted = React.useRef(false);

  // Dynamic Certificate Columns
  const rawActiveColumns = profile?.certificateColumns || [
    'firstTermAverage', 
    'midYearExam', 
    'secondTermAverage', 
    'effortAverage',
    'finalExam', 
    'finalGrade'
  ];

  // Map any legacy names to the new standard system
  const activeColumns = rawActiveColumns.map((col: string) => {
    if (col === 'firstHalf') return 'firstTermAverage';
    if (col === 'midYear') return 'midYearExam';
    if (col === 'secondHalf') return 'secondTermAverage';
    return col;
  });

  const colDefs: Record<string, { label: any; key: string }> = {
    firstTermAverage: { label: <>معدل النصف<br/>الأول</>, key: 'firstHalf' },
    midYearExam: { label: <>درجة امتحان<br/>نصف السنة</>, key: 'midYear' },
    secondTermAverage: { label: <>معدل النصف<br/>الثاني</>, key: 'secondHalf' },
    effortAverage: { label: <>معدل السعي<br/>السنوي</>, key: 'effortAverage' },
    finalExam: { label: <>درجة الامتحان<br/>النهائي</>, key: 'finalExam' },
    finalGrade: { label: <>الدرجة<br/>النهائية</>, key: 'finalGrade' },
  };

  const gradeColumns = activeColumns.map((k: string) => colDefs[k]).filter(Boolean);

  const printContentRef = useRef<HTMLDivElement>(null);
  const handlePrintClick = () => {
    if (!printContentRef.current) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }
    const title = printTarget ? 'وثيقة درجات الطالب' : 'سجل نتائج الطلاب الموحد';
    const success = printElement(printContentRef.current, title);
    if (!success) {
      toast.error('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة');
    }
    toast.dismiss('print-toast');
  };

  const handlePrint = (mode: 'table' | 'cards') => {
    setPrintTarget(null);
    setPrintMode(mode);
    toast.loading('جاري تحضير الكشف للطباعة...', { id: 'print-toast', duration: 2000 });
    setTimeout(() => {
      handlePrintClick();
    }, 500);
  };

  const handlePrintIndividual = (student: any) => {
    setPrintTarget(student);
    setPrintMode('table');
    toast.loading('جاري تحضير الشهادة...', { id: 'print-toast', duration: 2000 });
    setTimeout(() => {
      handlePrintClick();
    }, 500);
  };

  const defaultSubjects = ['الرياضيات', 'اللغة العربية', 'العلوم', 'اللغة الإنجليزية', 'التربية الإسلامية'];

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;

    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId), limit(100));
        const snap = await getDocs(q);
        if (!isMounted) return;
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching Grades classes:", error);
      }
    };
    fetchClasses();

    return () => { isMounted = false; };
  }, [profile]);

  useEffect(() => {
    if (selectedClassId) {
      setSelectedClass(classes.find(c => c.id === selectedClassId) || null);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes]);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId || !selectedClass) {
      if (!selectedClass && isMounted) setSubjects(defaultSubjects);
      return;
    }

    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        const path = 'subjects';
        const q = query(
          collection(db, path),
          where('schoolId', '==', profile.schoolId),
          where('className', 'in', [selectedClass.name, 'جميع الصفوف']),
          limit(50)
        );
        const snap = await getDocs(q);
        if (!isMounted) return;
        const schoolSubjects = snap.docs.map(doc => doc.data().name);
        setSubjects(Array.from(new Set([...defaultSubjects, ...schoolSubjects])));
      } catch (error) {
        console.error("Error fetching subjects:", error);
      } finally {
        if (isMounted) setSubjectsLoading(false);
      }
    };
    fetchSubjects();

    return () => { isMounted = false; };
  }, [profile?.schoolId, selectedClass]);

  const handleAddSubject = async () => {
    if (!newSubject.trim() || !profile?.schoolId || !selectedClass) return;
    
    const subjectName = newSubject.trim();
    if (subjects.includes(subjectName)) {
      toast.error('هذه المادة موجودة بالفعل لهذا الصف');
      return;
    }

    const path = 'subjects';
    try {
      await addDoc(collection(db, path), {
        name: subjectName,
        schoolId: profile.schoolId,
        className: selectedClass.name,
        classId: selectedClassId,
        createdAt: serverTimestamp()
      });
      setSubjects(prev => [...prev, subjectName]);
      toast.success(`تمت إضافة مادة ${subjectName} لصف ${selectedClass.name}`);
      setNewSubject('');
      setShowAddSubject(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      toast.error('فشل في إضافة المادة');
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId || !selectedClass) return;
    
    const fetchStudents = async () => {
      try {
        const path = 'students';
        const q = query(
          collection(db, path), 
          where('schoolId', '==', profile.schoolId),
          where('classId', '==', selectedClassId),
          limit(200)
        );
        const snap = await getDocs(q);
        if (!isMounted) return;
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchStudents();

    return () => { isMounted = false; };
  }, [profile, selectedClass]);

  const [individualGrades, setIndividualGrades] = useState<any[]>([]);
  const [classGradesLoading, setClassGradesLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId || !selectedClassId || !selectedTerm || !selectedYear) return;

    setClassGradesLoading(true);
    const q = query(
      collection(db, 'grades'),
      where('schoolId', '==', profile.schoolId),
      where('classId', '==', selectedClassId),
      where('term', '==', selectedTerm),
      where('year', '==', selectedYear),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (isMounted) {
        setIndividualGrades(
          snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((g: any) => !g.isTeacherOnly)
        );
        setClassGradesLoading(false);
      }
    }, (error) => {
      console.error("Error fetching grades:", error);
      if (isMounted) setClassGradesLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [profile?.schoolId, selectedClassId, selectedTerm, selectedYear]);

  const getStudentGrade = (studentId: string, subject: string) => {
    const entry = individualGrades.find(g => g.studentId === studentId && g.subject === subject);

    if (entry) {
      const score = Number(entry.score);
      const maxScore = Number(entry.maxScore || 100);
      return {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
        raw: entry
      };
    }
    return null;
  };

  const [editingCell, setEditingCell] = useState<{ studentId: string, subject: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editMaxScore, setEditMaxScore] = useState<number>(100);

  const handleUpdateGrade = async () => {
    if (!editingCell || !profile?.schoolId || !selectedClassId || !selectedClass) return;

    try {
      const { studentId, subject } = editingCell;
      const numValue = Math.min(editMaxScore, Math.max(0, Number(editValue)));
      const percentage = Math.round((numValue / editMaxScore) * 100);

      // Find the student to get their parent access info
      const student = students.find(s => s.id === studentId);
      const parentIds = student?.parentIds || [];
      const parentEmail = (student?.parentEmail || '').toLowerCase();

      const existingEntry = individualGrades.find(g => g.studentId === studentId && g.subject === subject);

      if (existingEntry?.id) {
        await updateDoc(doc(db, 'grades', existingEntry.id), {
          score: numValue,
          maxScore: editMaxScore,
          percentage,
          parentIds, // Keep synced
          parentEmail, // Keep synced
          updatedAt: serverTimestamp(),
          lastModifiedBy: profile.uid
        });
      } else {
        await addDoc(collection(db, 'grades'), {
          schoolId: profile.schoolId,
          classId: selectedClassId,
          className: selectedClass.name,
          studentId,
          subject,
          term: selectedTerm,
          year: selectedYear,
          score: numValue,
          maxScore: editMaxScore,
          percentage,
          parentIds, // For secure parent listing
          parentEmail, // For secure parent listing
          recordedBy: profile.uid,
          createdAt: serverTimestamp()
        });
      }

      toast.success('تم تحديث الدرجة بنجاح');
      setEditingCell(null);
    } catch (error) {
      console.error(error);
      toast.error('خطأ في التحديث');
    }
  };

  const startEditing = (studentId: string, subject: string, data: any | null) => {
    setEditingCell({ studentId, subject });
    setEditValue(data?.score?.toString() || '');
    setEditMaxScore(data?.maxScore || 100);
  };

  const handleSave = async () => {
    if (!profile?.schoolId || !selectedClass || !selectedSubject) return;
    setLoading(true);
    try {
      const { writeBatch, doc, collection, serverTimestamp } = await import('firebase/firestore');
      const batch = writeBatch(db);

      const studentIds = Object.keys(grades);
      for (const studentId of studentIds) {
        const student = students.find(s => s.id === studentId);
        const score = grades[studentId];
        if (score === undefined || score === null || score === '') continue;

        const numScore = Number(score);
        const percentage = Math.round((numScore / editMaxScore) * 100);

        const gradeData = {
          schoolId: profile.schoolId,
          classId: selectedClassId,
          className: selectedClass.name,
          studentId,
          subject: selectedSubject,
          term: selectedTerm,
          year: selectedYear,
          score: numScore,
          maxScore: editMaxScore,
          percentage,
          parentIds: student?.parentIds || [],
          parentEmail: (student?.parentEmail || '').toLowerCase(),
          recordedBy: profile.uid,
          updatedAt: serverTimestamp()
        };

        const existingEntry = individualGrades.find(g => g.studentId === studentId && g.subject === selectedSubject && g.term === selectedTerm && g.year === selectedYear);

        if (existingEntry?.id) {
          batch.update(doc(db, 'grades', existingEntry.id), gradeData);
        } else {
          const newRef = doc(collection(db, 'grades'));
          batch.set(newRef, { ...gradeData, createdAt: serverTimestamp() });
        }
      }

      await batch.commit();

      for (const studentId of studentIds) {
        if (grades[studentId] === undefined || grades[studentId] === null || grades[studentId] === '') continue;
        await notificationService.notifyStudentParents(studentId, {
          title: 'رصد درجات جديدة',
          message: `تم رصد درجة الطالب في مادة ${selectedSubject}: ${grades[studentId]} من ${editMaxScore}`,
          type: 'grade',
          schoolId: profile.schoolId
        });
      }

      toast.success('تم حفظ الدرجات بنجاح');
      setGrades({});
      setSelectedSubject(null);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">إدارة الدرجات والنتائج</h1>
          <p className="text-slate-500 mt-1">تسجيل وتعديل نتائج الطلاب للاختبارات الشهرية والنهائية</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedClass ? (
          <motion.div 
            key="class-selector"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl lg:col-span-1 flex flex-col justify-between">
               <div>
                  <GraduationCap size={40} className="mb-6 opacity-30" />
                  <h3 className="text-2xl font-bold mb-4 font-display">سجل الدرجات الموحد</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">اختر الصف لعرض وتعديل كافة الدرجات في شبكة واحدة موحدة.</p>
               </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
               {classes.map(cls => (
                 <button 
                   key={cls.id}
                   onClick={() => setSelectedClassId(cls.id)}
                   className="p-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-slate-900 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 group"
                 >
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <ChevronRight size={24} className="rotate-180" />
                    </div>
                    <span className="text-lg font-bold text-slate-700">الصف {cls.name}</span>
                 </button>
               ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="unified-grid"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-200 rounded-[2rem] p-4 md:p-6 shadow-sm">
              <div className="flex flex-col gap-6">
                {/* Top Row: Title & Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { setSelectedClassId(null); setSubjectFilter('all'); }}
                      className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 border border-slate-200 rounded-xl transition-all active:scale-95"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div>
                       <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">{selectedClass.name} - {t("resultsManagement")}</h2>
                       <p className="text-slate-400 text-[10px] md:text-xs">{t("viewAndRecordGrades")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                      <button 
                         onClick={() => setViewMode('cards')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-[#0B2345]' : 'text-slate-400'}`}
                      >
                         {t("cards")}
                      </button>
                      <button 
                         onClick={() => setViewMode('grid')}
                         className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#0B2345]' : 'text-slate-400'}`}
                      >
                         {t("generalRecord")}
                      </button>
                    </div>
                    
                    <div className="h-6 w-px bg-slate-200 shrink-0"></div>

                    <button 
                      onClick={() => handlePrint('table')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-50 transition-all shadow-sm border border-slate-200 shrink-0 active:scale-95"
                    >
                      <Printer size={12} />
                      {t("printAll")}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t("subjectLabel")}</label>
                    <select 
                      value={subjectFilter}
                      onChange={e => setSubjectFilter(e.target.value)}
                      className="w-full bg-white px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 focus:ring-2 focus:ring-indigo-600/10 outline-none transition-all appearance-none"
                    >
                      <option value="all">{t("allSubjects")}</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t("term")}</label>
                    <select 
                      value={selectedTerm}
                      onChange={e => setSelectedTerm(e.target.value)}
                      className="w-full bg-white px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 focus:ring-2 focus:ring-indigo-600/10 outline-none transition-all appearance-none"
                    >
                      <option value="معدل النصف الاول">معدل النصف الاول</option>
                      <option value="درجة امتحان نصف السنة">درجة امتحان نصف السنة</option>
                      <option value="معدل النصف الثاني">معدل النصف الثاني</option>
                      <option value="معدل السعي السنوي">معدل السعي السنوي</option>
                      <option value="درجة الامتحان النهائي">درجة الامتحان النهائي</option>
                      <option value="الدرجة النهائية">الدرجة النهائية</option>
                      <option value="النتيجة">النتيجة</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t("academicYear")}</label>
                    <input 
                      value={selectedYear}
                      onChange={e => setSelectedYear(e.target.value)}
                      className="w-full bg-white px-3 py-2.5 rounded-xl text-xs font-bold border border-slate-200 focus:ring-2 focus:ring-indigo-600/10 outline-none transition-all text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Search Bar Inline */}
              <div className="mt-4 relative group">
                 <input 
                    type="text"
                    placeholder="بحث سريع عن طالب بالاسم أو رقم القيد..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-10 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 shadow-inner transition-all text-sm font-medium text-slate-900"
                 />
                 <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            </div>

            <div className="flex gap-2 pb-2 overflow-x-auto scrolling-touch">
              {subjects.map(subj => (
                <div key={subj} className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${subjectFilter === subj ? 'bg-[#0B2345] text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-400'}`}>
                  {subj}
                </div>
              ))}
              <button 
                onClick={() => setShowAddSubject(true)}
                className="px-3 py-1 bg-white border border-dashed border-indigo-200 text-[#0B2345] rounded-lg text-[10px] font-bold hover:bg-indigo-50 transition-all"
              >
                + مادة جديدة
              </button>
            </div>

            <div className="min-h-[400px]">
              {classGradesLoading ? (
                <div className="flex items-center justify-center h-64 text-slate-300 font-bold animate-pulse">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span>مزامنة سجل الدرجات...</span>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
                        <tr>
                          <th className="p-4 sticky right-0 bg-slate-50 z-30 border-l border-slate-200 shadow-[2px_0_10px_rgba(0,0,0,0.05)] w-48">قائمة الطلاب</th>
                          {subjects.filter(s => subjectFilter === 'all' || s === subjectFilter).map(subj => (
                            <th key={subj} className="p-4 text-center border-l border-slate-100 min-w-[100px]">{subj}</th>
                          ))}
                          <th className="p-4 text-center bg-indigo-50 text-[#0B2345] border-r border-indigo-100 font-black">المعدل</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.filter(s => 
                          (s.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (s.registrationNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                        ).map(student => {
                          const filteredSubjects = subjects.filter(s => subjectFilter === 'all' || s === subjectFilter);
                          const studentData = filteredSubjects.map(subj => getStudentGrade(student.id, subj));
                          const validPercentages = studentData.filter(d => d !== null).map(d => d!.percentage);
                          const average = validPercentages.length > 0 
                            ? Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length) 
                            : null;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50 group transition-colors">
                              <td className="p-4 font-bold text-slate-800 sticky right-0 bg-white group-hover:bg-slate-50 z-20 border-l border-slate-50 shadow-[1px_0_5px_rgba(0,0,0,0.02)]">
                                <div className="truncate w-full text-xs">{student.name}</div>
                              </td>
                              {studentData.map((data, idx) => {
                                const currentSubj = filteredSubjects[idx];
                                const isEditing = editingCell?.studentId === student.id && editingCell?.subject === currentSubj;
                                return (
                                  <td key={idx} className={`p-1.5 text-center border-l border-slate-50 ${isEditing ? 'bg-indigo-50/30' : ''}`}>
                                    {isEditing ? (
                                      <div className="flex flex-col items-center gap-1 p-1 bg-white border border-indigo-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-1">
                                          <input 
                                            autoFocus
                                            type="number"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') handleUpdateGrade();
                                            }}
                                            className="w-10 h-7 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-indigo-600"
                                          />
                                          <span className="text-[10px] text-slate-300">/</span>
                                          <input 
                                            type="number"
                                            value={Number.isNaN(editMaxScore) ? '' : editMaxScore}
                                            onChange={e => {
                                              const val = e.target.value;
                                              setEditMaxScore(val === '' ? 100 : Number(val) || 100);
                                            }}
                                            className="w-10 h-7 text-center text-xs bg-slate-100 border border-slate-100 rounded-md text-slate-400 outline-none"
                                          />
                                        </div>
                                        <button 
                                          onClick={handleUpdateGrade}
                                          className="w-full h-6 bg-[#0B2345] text-white rounded-md text-[8px] font-bold"
                                        >
                                          حفظ
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => startEditing(student.id, currentSubj, data)}
                                        className="w-full py-3 group/cell relative hover:bg-indigo-50/20 transition-all"
                                      >
                                        {data !== null ? (
                                          <div className="flex flex-col items-center">
                                            <span className={`text-xs font-black ${data.percentage >= 50 ? 'text-[#0B2345]' : 'text-rose-500'}`}>
                                              {data.maxScore === 100 ? `${data.percentage}%` : `${data.score} من ${data.maxScore}`}
                                            </span>
                                            {data.maxScore === 100 && (
                                              <span className="text-[8px] text-slate-400 font-bold">({data.score}/{data.maxScore})</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-slate-200 text-[10px]">-</span>
                                        )}
                                        <div className="absolute inset-0 opacity-0 group-hover/cell:opacity-100 flex items-center justify-center transition-opacity">
                                          <Edit2 size={8} className="text-indigo-300" />
                                        </div>
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="p-4 text-center border-l border-indigo-50 bg-indigo-50/10">
                                 {average !== null ? (
                                   <span className="font-black text-indigo-700 text-sm">{average}%</span>
                                 ) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                   {students.filter(s => 
                     (s.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                     (s.registrationNumber?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                   ).map(student => {
                      const filteredSubjects = subjects.filter(s => subjectFilter === 'all' || s === subjectFilter);
                      const studentData = filteredSubjects.map(subj => getStudentGrade(student.id, subj));
                      const validPercentages = studentData.filter(d => d !== null).map(d => d!.percentage);
                      const average = validPercentages.length > 0 
                        ? Math.round(validPercentages.reduce((a, b) => a + b, 0) / validPercentages.length) 
                        : null;

                      return (
                        <div key={student.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col">
                           <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-sm font-black">
                                    {student.name[0]}
                                 </div>
                                 <div>
                                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0B2345] transition-colors truncate max-w-[120px]">{student.name}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold tracking-tight">ID: {student.registrationNumber}</p>
                                 </div>
                              </div>
                              {average !== null && (
                                 <div className="text-left bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                    <div className="text-base font-black text-[#0B2345] leading-none">{average}%</div>
                                 </div>
                              )}
                           </div>

                           <div className="grid grid-cols-2 gap-3 mb-4">
                              {filteredSubjects.map((subj, idx) => {
                                 const data = studentData[idx];
                                 const isEditing = editingCell?.studentId === student.id && editingCell?.subject === subj;
                                 
                                 return (
                                    <div key={subj} className="relative">
                                       {isEditing ? (
                                          <div className="absolute inset-0 z-10 bg-indigo-50 p-2 rounded-xl border border-indigo-200 flex flex-col gap-1">
                                             <div className="flex items-center justify-between gap-1">
                                                <input 
                                                   autoFocus
                                                   type="number"
                                                   value={editValue}
                                                   onChange={e => setEditValue(e.target.value)}
                                                   onKeyDown={e => { if (e.key === 'Enter') handleUpdateGrade(); }}
                                                   className="w-full h-8 bg-white border border-indigo-200 rounded-lg text-center font-bold text-xs"
                                                />
                                                <button onClick={handleUpdateGrade} className="p-2 bg-[#0B2345] text-white rounded-lg">
                                                   <Save size={12} />
                                                </button>
                                             </div>
                                             <div className="flex items-center justify-between px-1">
                                               <span className="text-[8px] font-bold text-indigo-300">{subj}</span>
                                               <button onClick={() => setEditingCell(null)} className="text-[8px] text-rose-500 font-bold">إلغاء</button>
                                             </div>
                                          </div>
                                       ) : (
                                          <button 
                                             onClick={() => startEditing(student.id, subj, data)}
                                             className="w-full flex flex-col p-3 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-200 rounded-2xl transition-all h-full"
                                          >
                                             <div className="flex items-center justify-between w-full mb-1">
                                                <span className="text-[9px] font-bold text-slate-500 truncate">{subj}</span>
                                                <Edit2 size={8} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                             </div>
                                             {data ? (
                                                <div className="flex flex-col">
                                                   <span className={`text-sm font-black ${data.percentage >= 50 ? 'text-[#0B2345]' : 'text-rose-500'}`}>
                                                      {data.maxScore === 100 ? `${data.percentage}%` : `${data.score} من ${data.maxScore}`}
                                                   </span>
                                                   {data.maxScore === 100 && (
                                                      <span className="text-[8px] text-slate-400">({data.score}/{data.maxScore})</span>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="text-[10px] text-slate-300">-</span>
                                             )}
                                          </button>
                                       )}
                                    </div>
                                 );
                              })}
                           </div>

                           <div className="flex gap-2 pt-4 border-t border-slate-50 mt-auto">
                              <button 
                                onClick={() => handlePrintIndividual(student)}
                                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold hover:bg-[#0B2345] transition-all flex items-center justify-center gap-2"
                              >
                                 <Printer size={12} />
                                 شهادة
                              </button>
                              <button 
                                onClick={() => {/* Detail view */}}
                                className="w-10 h-10 flex items-center justify-center border border-slate-100 text-slate-400 hover:text-[#0B2345] hover:bg-indigo-50 rounded-xl transition-all"
                              >
                                 <FileText size={14} />
                              </button>
                           </div>
                        </div>
                      );
                   })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
        <GradesPrint 
          ref={printContentRef} 
          profile={profile} 
          selectedYear={selectedYear} 
          selectedTerm={selectedTerm} 
          printTarget={printTarget} 
          students={students} 
          subjects={subjects} 
          getStudentGrade={getStudentGrade} 
          gradeColumns={gradeColumns} 
        />
      </div>

      <AnimatePresence>
        {showAddSubject && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">إضافة مادة لصف {selectedClass?.name}</h3>
              <input 
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder="اسم المادة"
                className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex gap-3">
                <button onClick={handleAddSubject} className="flex-1 py-4 bg-[#0B2345] text-white rounded-xl font-bold">إضافة المادة</button>
                <button onClick={() => setShowAddSubject(false)} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold">إلغاء</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

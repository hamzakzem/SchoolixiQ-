import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { AttendanceService } from '../../services/attendance.service';
import { fetchStudentLinkFields } from '../../lib/schoolSync';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { FileText, Plus, Edit2, Trash2, Send, X, Users, BarChart, Printer, Wallet, BookOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';

type AdvancedReportsProps = {
  lockedClassId?: string;
  lockedClassName?: string;
};

export default function AdvancedReports({
  lockedClassId,
  lockedClassName,
}: AdvancedReportsProps = {}) {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = language === 'ar';

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [studentAnalytics, setStudentAnalytics] = useState<{
    behaviorCount: number;
    evaluationCount: number;
    customReportCount: number;
    homeworkCount: number;
    absentDays: number;
    lateDays: number;
    tuitionBalance: number;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (!profile?.schoolId) return;

    const q = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (lockedClassId) {
        const lockedOnly = classData.filter((c) => c.id === lockedClassId);
        setClasses(lockedOnly);
        setSelectedClassId(lockedClassId);
        return;
      }
      setClasses(classData);
      if (classData.length > 0 && !selectedClassId) setSelectedClassId(classData[0].id);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));

    return () => unsubscribe();
  }, [profile, lockedClassId]);

  // Fetch students for selected class
  useEffect(() => {
    if (!profile?.schoolId || !selectedClassId) {
      setStudents([]);
      return;
    }

    const q = query(
      collection(db, 'students'),
      where('schoolId', '==', profile.schoolId),
      where('classId', '==', selectedClassId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));

    return () => unsubscribe();
  }, [profile, selectedClassId]);

  // Fetch advanced reports
  useEffect(() => {
    if (!profile?.schoolId) return;
    setLoading(true);

    const reportsQ = query(
      collection(db, 'advanced_reports'),
      where('schoolId', '==', profile.schoolId)
    );
    const unsubscribe = onSnapshot(reportsQ, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'advanced_reports');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!profile?.schoolId || !selectedStudent?.id || !selectedStudent?.classId) {
      setStudentAnalytics(null);
      return;
    }

    let cancelled = false;
    setAnalyticsLoading(true);

    (async () => {
      try {
        const [behaviorSnap, evaluationSnap, homeworkSnap, attendance] = await Promise.all([
          getDocs(
            query(
              collection(db, 'behavior_reports'),
              where('schoolId', '==', profile.schoolId),
              where('studentId', '==', selectedStudent.id),
            ),
          ),
          getDocs(
            query(
              collection(db, 'teacher_reports'),
              where('schoolId', '==', profile.schoolId),
              where('studentId', '==', selectedStudent.id),
            ),
          ),
          getDocs(
            query(
              collection(db, 'homework'),
              where('schoolId', '==', profile.schoolId),
              where('classId', '==', selectedStudent.classId),
            ),
          ),
          AttendanceService.getStudentAttendanceSummary(
            profile.schoolId,
            selectedStudent.classId,
            selectedStudent.id,
          ),
        ]);

        if (cancelled) return;

        setStudentAnalytics({
          behaviorCount: behaviorSnap.size,
          evaluationCount: evaluationSnap.size,
          customReportCount: reports.filter((r) => r.studentId === selectedStudent.id).length,
          homeworkCount: homeworkSnap.size,
          absentDays: attendance.absent,
          lateDays: attendance.late,
          tuitionBalance: Number(selectedStudent.tuitionBalance || 0),
        });
      } catch (error) {
        if (!cancelled) setStudentAnalytics(null);
        handleFirestoreError(error, OperationType.LIST, 'AdvancedReports:analytics');
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.schoolId, selectedStudent, reports]);

  const handleSaveReport = async () => {
    if (!selectedStudent || !reportTitle.trim() || !reportContent.trim() || !profile) return;
    setIsSaving(true);
    try {
      if (editingReport) {
        await updateDoc(doc(db, 'advanced_reports', editingReport.id), {
          title: reportTitle,
          content: reportContent,
          updatedAt: serverTimestamp()
        });
        toast.success(isRtl ? 'تم تحديث التقرير بنجاح' : 'Report updated successfully');
      } else {
        const link = await fetchStudentLinkFields(selectedStudent.id);
        const reportRef = await addDoc(collection(db, 'advanced_reports'), {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          parentIds: link?.parentIds || [],
          parentEmail: link?.parentEmail || '',
          teacherId: profile.uid,
          teacherName: profile.name,
          title: reportTitle,
          content: reportContent,
          schoolId: profile.schoolId,
          createdAt: serverTimestamp()
        });
        
        await notificationService.notifyStudentParents(selectedStudent.id, {
          title: isRtl ? 'تقرير متقدم جديد: ' + reportTitle : 'New Advanced Report: ' + reportTitle,
          message: reportContent.substring(0, 100) + '...',
          type: 'report',
          schoolId: profile.schoolId,
          metadata: { sourceId: reportRef.id }
        });

        toast.success(isRtl ? 'تم إضافة التقرير بنجاح' : 'Report added successfully');
      }
      setShowAddModal(false);
      setEditingReport(null);
      setReportTitle('');
      setReportContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'advanced_reports');
      toast.error(isRtl ? 'فشل الحفظ' : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا التقرير؟' : 'Are you sure you want to delete this report?')) {
      try {
        await deleteDoc(doc(db, 'advanced_reports', id));
        await notificationService.deleteBySourceId(id, profile.schoolId);
        toast.success(isRtl ? 'تم حذف التقرير بنجاح' : 'Report deleted successfully');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `advanced_reports/${id}`);
        toast.error(isRtl ? 'فشل الحذف' : 'Deletion failed');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">
            {isRtl ? 'التقارير المتقدمة والتحليلات' : 'Advanced Reports & Analytics'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isRtl
              ? 'عرض تحليلي مجمّع للطالب من الحضور والسلوك والتقييمات والأقساط — للقراءة والطباعة وليس لإدخال الحوادث'
              : 'Read-only aggregated student analytics from attendance, behavior, evaluations, and payments — for viewing and printing'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:bg-slate-800/40 dark:border-slate-700 px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
        {isRtl ? (
          <>
            <span className="text-slate-900 dark:text-white">هذا القسم للتحليل والتقارير:</span>{' '}
            لا تُسجَّل هنا الحوادث السلوكية (استخدم «السلوك») ولا التقييمات المنظمة (استخدم «التقييمات») ولا التعميمات (استخدم «الإعلانات»).
          </>
        ) : (
          <>
            <span className="text-slate-900 dark:text-white">Analytics hub:</span>{' '}
            Do not record behavior incidents, structured evaluations, or broadcasts here — use their dedicated sections.
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar: Classes & Students */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 px-2">{isRtl ? 'اختر الصف' : 'Select Class'}</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pl-2 pr-1 custom-scrollbar">
              {lockedClassId ? (
                <div className="w-full text-right px-4 py-3 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700">
                  {lockedClassName || lockedClassId}
                </div>
              ) : (
                classes.map(cls => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedClassId === cls.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    {cls.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4 flex-1">
             <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 px-2">{isRtl ? 'اختر الطالب' : 'Select Student'}</h3>
             <div className="space-y-2 max-h-[400px] overflow-y-auto pl-2 pr-1 custom-scrollbar">
                {students.map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`w-full text-right px-4 py-3 rounded-xl flex items-center justify-between transition-all ${selectedStudent?.id === student.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800/30 border' : 'bg-transparent border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedStudent?.id === student.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {student.name[0]}
                      </div>
                      <span className="font-bold text-sm truncate">{student.name}</span>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Right content: Reports List */}
        <div className="lg:col-span-3 space-y-6">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl">
                       <BarChart size={24} />
                     </div>
                     <div>
                       <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedStudent.name}</h2>
                       <p className="text-sm font-bold text-slate-400">
                         {classes.find(c => c.id === selectedStudent.classId)?.name}
                       </p>
                     </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingReport(null);
                      setReportTitle('');
                      setReportContent('');
                      setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <Plus size={18} />
                    <span>{isRtl ? 'ملاحظة تحليلية إضافية' : 'Add analytic note'}</span>
                  </button>
                </div>

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {isRtl ? 'ملخص تحليلي للطالب' : 'Student analytics summary'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1.5 hover:bg-slate-200 transition-colors no-print"
                    >
                      <Printer size={14} />
                      {isRtl ? 'طباعة' : 'Print'}
                    </button>
                  </div>
                  {analyticsLoading ? (
                    <p className="text-sm font-bold text-slate-400">{isRtl ? 'جاري تجميع البيانات...' : 'Loading analytics...'}</p>
                  ) : studentAnalytics ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: isRtl ? 'حوادث سلوكية' : 'Behavior', value: studentAnalytics.behaviorCount, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
                        { label: isRtl ? 'تقييمات أداء' : 'Evaluations', value: studentAnalytics.evaluationCount, icon: FileText, tone: 'text-indigo-600 bg-indigo-50' },
                        { label: isRtl ? 'غياب / تأخر' : 'Absent / late', value: `${studentAnalytics.absentDays}/${studentAnalytics.lateDays}`, icon: BarChart, tone: 'text-amber-600 bg-amber-50' },
                        { label: isRtl ? 'رصيد الأقساط' : 'Tuition balance', value: studentAnalytics.tuitionBalance.toLocaleString(), icon: Wallet, tone: 'text-emerald-600 bg-emerald-50' },
                        { label: isRtl ? 'واجبات الصف' : 'Class homework', value: studentAnalytics.homeworkCount, icon: BookOpen, tone: 'text-blue-600 bg-blue-50' },
                        { label: isRtl ? 'ملاحظات محفوظة' : 'Saved notes', value: studentAnalytics.customReportCount, icon: FileText, tone: 'text-slate-600 bg-slate-100' },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-xl p-3 border border-slate-100 dark:border-slate-800 ${item.tone.split(' ').slice(1).join(' ')}`}>
                          <div className={`flex items-center gap-2 text-[10px] font-bold uppercase ${item.tone.split(' ')[0]}`}>
                            <item.icon size={12} />
                            {item.label}
                          </div>
                          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">{isRtl ? 'اختر طالباً لعرض الملخص' : 'Select a student to view summary'}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                    {isRtl
                      ? 'البيانات مُجمّعة للقراءة فقط من أقسام الحضور والسلوك والتقييمات والأقساط والواجبات.'
                      : 'Data is aggregated read-only from attendance, behavior, evaluations, tuition, and homework sections.'}
                  </p>
                </div>
                
                <div className="px-6 pt-4">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                    {isRtl ? 'ملاحظات تحليلية محفوظة (اختياري)' : 'Saved analytic notes (optional)'}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-3 space-y-4 custom-scrollbar">
                  {reports.filter(r => r.studentId === selectedStudent.id).length > 0 ? (
                    reports.filter(r => r.studentId === selectedStudent.id).map((report) => (
                      <div key={report.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                                <BarChart size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{report.title}</h4>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                  <span>{report.teacherName}</span>
                                  <span>•</span>
                                  <span>{report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : ''}</span>
                                </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingReport(report);
                                  setReportTitle(report.title || '');
                                  setReportContent(report.content);
                                  setShowAddModal(true);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-700 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{report.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <BarChart size={48} className="opacity-20" />
                      <p className="font-bold">{isRtl ? 'لا توجد ملاحظات تحليلية محفوظة' : 'No saved analytic notes'}</p>
                      <p className="text-xs text-center max-w-sm leading-relaxed">
                        {isRtl
                          ? 'الملخص أعلاه يعرض بيانات مجمّعة. يمكنك إضافة ملاحظة تحليلية إضافية عند الحاجة.'
                          : 'The summary above shows aggregated data. Add an optional analytic note if needed.'}
                      </p>
                    </div>
                  )}
                </div>
             </div>
           ) : (
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm h-[calc(100vh-12rem)] min-h-[600px] flex items-center justify-center">
               <div className="text-center text-slate-400 space-y-4 max-w-sm px-6">
                 <Users size={64} className="mx-auto opacity-20" />
                 <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">{isRtl ? 'اختر طالباً لعرض التحليلات المجمّعة' : 'Select a student to view aggregated analytics'}</h3>
                 <p className="text-sm leading-relaxed">
                   {isRtl
                     ? 'منطقة قراءة وتحليل — ليست لإدخال الحوادث السلوكية أو التقييمات أو التعميمات.'
                     : 'Read-only analytics area — not for behavior incidents, evaluations, or broadcasts.'}
                 </p>
               </div>
             </div>
           )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 left-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title={isRtl ? 'إغلاق' : 'Close'}
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                {editingReport ? (isRtl ? 'تعديل الملاحظة التحليلية' : 'Edit analytic note') : (isRtl ? 'ملاحظة تحليلية إضافية' : 'Optional analytic note')}
              </h2>
              <p className="text-slate-500 font-bold mb-2">{selectedStudent?.name}</p>
              <p className="text-slate-400 text-xs mb-6">
                {isRtl
                  ? 'للتعليقات التحليلية التكميلية فقط — البيانات الأساسية تُسجَّل في أقسامها المخصصة'
                  : 'Supplementary analytic comments only — core data belongs in dedicated sections'}
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRtl ? 'عنوان الملاحظة' : 'Note title'}</label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    dir="auto"
                    placeholder={isRtl ? 'مثال: ملخص الفصل الدراسي' : 'e.g. term summary'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRtl ? 'تفاصيل الملاحظة التحليلية' : 'Analytic note details'}</label>
                  <textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    dir="auto"
                    rows={6}
                    placeholder={isRtl ? 'أدخل التفاصيل...' : 'Enter details...'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white resize-none"
                  ></textarea>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSaveReport}
                    disabled={isSaving || !reportTitle.trim() || !reportContent.trim()}
                    className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        <span>{isRtl ? 'حفظ وإرسال' : 'Save & Send'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

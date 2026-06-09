import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, limit } from 'firebase/firestore';
import { fetchStudentLinkFields } from '../../lib/schoolSync';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { FileText, Plus, Search, Edit2, Trash2, Send, X, Shield, Star, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';

export default function Evaluations() {
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
  const [reportContent, setReportContent] = useState('');
  const [reportTarget, setReportTarget] = useState<'school' | 'parents' | 'both'>('parents');
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch classes
  useEffect(() => {
    if (!profile?.schoolId) return;

    const q = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      const classData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classData);
      if (classData.length > 0 && !selectedClassId) setSelectedClassId(classData[0].id);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));

    return () => unsubscribe();
  }, [profile]);

  // Fetch students for selected class
  useEffect(() => {
    if (!profile?.schoolId || !selectedClassId) {
      setStudents([]);
      return;
    }

    const q = query(
      collection(db, 'students'),
      where('schoolId', '==', profile.schoolId),
      where('classId', '==', selectedClassId),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));

    return () => unsubscribe();
  }, [profile, selectedClassId]);

  // Fetch evaluation reports
  useEffect(() => {
    if (!profile?.schoolId) return;
    setLoading(true);

    const reportsQ = query(
      collection(db, 'teacher_reports'),
      where('schoolId', '==', profile.schoolId),
      limit(300)
    );
    const unsubscribe = onSnapshot(reportsQ, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'teacher_reports');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleSaveReport = async () => {
    if (!selectedStudent || !reportContent.trim() || !profile) return;
    setIsSaving(true);
    try {
      if (editingReport) {
        await updateDoc(doc(db, 'teacher_reports', editingReport.id), {
          content: reportContent,
          target: reportTarget,
          updatedAt: serverTimestamp()
        });
        toast.success(isRtl ? 'تم تحديث التقييم بنجاح' : 'Evaluation updated successfully');
      } else {
        const link = await fetchStudentLinkFields(selectedStudent.id);
        const reportRef = await addDoc(collection(db, 'teacher_reports'), {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          parentIds: link?.parentIds || [],
          parentEmail: link?.parentEmail || '',
          teacherId: profile.uid, // Using admin's UID
          teacherName: profile.name,
          subject: 'إدارة المدرسة', // Meaning "School Administration"
          content: reportContent,
          target: reportTarget,
          schoolId: profile.schoolId,
          createdAt: serverTimestamp()
        });
        
        if (reportTarget === 'parents' || reportTarget === 'both') {
          await notificationService.notifyStudentParents(selectedStudent.id, {
            title: isRtl ? 'تقرير تقييم جديد' : 'New Evaluation Report',
            message: reportContent.substring(0, 100) + '...',
            type: 'report',
            schoolId: profile.schoolId,
            metadata: { sourceId: reportRef.id }
          });
        }
        toast.success(isRtl ? 'تم إضافة التقييم بنجاح' : 'Evaluation added successfully');
      }
      setShowAddModal(false);
      setEditingReport(null);
      setReportContent('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'teacher_reports');
      toast.error(isRtl ? 'فشل حفظ التقييم' : 'Failed to save evaluation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا التقييم؟' : 'Are you sure you want to delete this evaluation?')) {
      try {
        await deleteDoc(doc(db, 'teacher_reports', id));
        await notificationService.deleteBySourceId(id, profile.schoolId);
        toast.success(isRtl ? 'تم حذف التقييم بنجاح' : 'Evaluation deleted successfully');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `teacher_reports/${id}`);
        toast.error(isRtl ? 'فشل الحذف' : 'Deletion failed');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-display">
            {isRtl ? 'تقارير التقييم' : 'Evaluations'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {isRtl ? 'إدارة تقييمات الطلاب والتواصل مع أولياء الأمور' : 'Manage student evaluations and communicate with parents'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar: Classes & Students */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 px-2">{isRtl ? 'اختر الصف' : 'Select Class'}</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pl-2 pr-1 custom-scrollbar">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedClassId === cls.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {cls.name}
                </button>
              ))}
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

        {/* Right content: Evaluations List */}
        <div className="lg:col-span-3 space-y-6">
           {selectedStudent ? (
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-bold text-xl">
                       {selectedStudent.name[0]}
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
                      setReportContent('');
                      setReportTarget('parents');
                      setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <Plus size={18} />
                    <span>{isRtl ? 'تقييم جديد' : 'New Report'}</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {reports.filter(r => r.studentId === selectedStudent.id).length > 0 ? (
                    reports.filter(r => r.studentId === selectedStudent.id).map((report) => (
                      <div key={report.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500">
                                <FileText size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{report.teacherName}</h4>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                  <span>{report.subject}</span>
                                  <span>•</span>
                                  <span>{report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : ''}</span>
                                </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingReport(report);
                                  setReportContent(report.content);
                                  setReportTarget(report.target || 'parents');
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
                        <div className="mt-4 flex items-center gap-2">
                           <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${report.target === 'parents' || report.target === 'both' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                             {report.target === 'parents' ? (isRtl ? 'لأولياء الأمور فقط' : 'Parents Only') : report.target === 'both' ? (isRtl ? 'لأولياء الأمور والمدرسة' : 'Parents & School') : (isRtl ? 'للإدارة فقط' : 'School Only')}
                           </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                      <FileText size={48} className="opacity-20" />
                      <p className="font-bold">{isRtl ? 'لا توجد تقييمات سابقة لهذا الطالب' : 'No previous evaluations for this student'}</p>
                    </div>
                  )}
                </div>
             </div>
           ) : (
             <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm h-[calc(100vh-12rem)] min-h-[600px] flex items-center justify-center">
               <div className="text-center text-slate-400 space-y-4 max-w-sm px-6">
                 <Users size={64} className="mx-auto opacity-20" />
                 <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">{isRtl ? 'اختر طالباً لعرض وتقييم حالته الدراسية' : 'Select a student to view and manage their evaluations'}</h3>
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
                {editingReport ? (isRtl ? 'تعديل التقييم' : 'Edit Evaluation') : (isRtl ? 'إضافة تقييم جديد' : 'New Evaluation')}
              </h2>
              <p className="text-slate-500 font-bold mb-6">
                {selectedStudent?.name}
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRtl ? 'نص التقييم' : 'Evaluation Content'}</label>
                  <textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    dir="auto"
                    rows={6}
                    placeholder={isRtl ? 'اكتب تقييمك هنا مع ذكر الملاحظات الإيجابية ونقاط التحسين...' : 'Write your evaluation here...'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900 dark:text-white resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{isRtl ? 'المرسل إليهم' : 'Send to'}</label>
                  <div className="grid grid-cols-2 gap-3">
                     {[
                       { id: 'parents', label: isRtl ? 'لأولياء الأمور فقط' : 'Parents Only' },
                       { id: 'both', label: isRtl ? 'لأولياء الأمور والإدارة' : 'Parents & School' },
                     ].map(opt => (
                       <button
                         key={opt.id}
                         onClick={() => setReportTarget(opt.id as any)}
                         className={`py-3 rounded-xl border text-sm font-bold transition-all ${reportTarget === opt.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                       >
                         {opt.label}
                       </button>
                     ))}
                  </div>
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
                    disabled={isSaving || !reportContent.trim()}
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

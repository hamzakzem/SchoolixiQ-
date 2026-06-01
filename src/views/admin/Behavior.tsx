import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, limit, orderBy, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { Calendar, Plus, Search, User, MessageSquare, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../../lib/notificationService';

import { useLanguage } from '../../lib/LanguageContext';

export default function Behavior() {
  const { isRtl } = useLanguage();
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [newReport, setNewReport] = useState({ type: 'positive', description: '' });

  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;
    
    const fetchBehaviorData = async () => {
      setLoading(true);
      try {
        const studentsPath = 'students';
        const studentsQ = query(collection(db, studentsPath), where('schoolId', '==', profile.schoolId), limit(500));
        
        const reportsPath = 'behavior_reports';
        const reportsQ = query(collection(db, reportsPath), where('schoolId', '==', profile.schoolId), orderBy('createdAt', 'desc'), limit(100));

        const [studentsSnap, reportsSnap] = await Promise.all([
          getDocs(studentsQ),
          getDocs(reportsQ)
        ]);

        if (!isMounted) return;

        setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setReports(reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching behavior data: ", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBehaviorData();

    return () => { isMounted = false; };
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !selectedStudent) return;
    setLoading(true);
    
    try {
      const path = 'behavior_reports';
      const docRef = await addDoc(collection(db, path), {
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        parentIds: selectedStudent.parentIds || [],
        parentEmail: (selectedStudent.parentEmail || '').toLowerCase(),
        type: newReport.type,
        description: newReport.description,
        createdAt: serverTimestamp(),
        authorId: profile.uid,
        authorName: profile.name
      });
      
      const newReportData = {
        id: docRef.id,
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        type: newReport.type,
        description: newReport.description,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        authorId: profile.uid,
        authorName: profile.name
      };

      setReports(prev => [newReportData, ...prev]);

      // Notify parents
      await notificationService.notifyStudentParents(selectedStudent.id, {
        title: newReport.type === 'positive' ? 'تقرير سلوكي إيجابي' : 'تنبيه سلوكي',
        message: `تم تسجيل تقرير سلوكي جديد: ${newReport.description}`,
        type: 'behavior',
        schoolId: profile.schoolId
      });

      toast.success('تم تسجيل التقرير السلوكي بنجاح');
      setShowAddModal(false);
      setNewReport({ type: 'positive', description: '' });
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'behavior_reports');
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'behavior_reports', reportToDelete));
      setReports(prev => prev.filter(r => r.id !== reportToDelete));
      toast.success('تم حذف التقرير بنجاح');
      setReportToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'behavior_reports');
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">تقارير السلوك</h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">تسجيل الملاحظات السلوكية الإيجابية والتحذيرية للطلاب</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white">الطلاب</h3>
              <div className="relative w-64">
                <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
                <input 
                  type="text" 
                  placeholder="بحث عن طالب..." 
                  className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4 text-left'} py-2 text-sm rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-100`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredStudents.map(student => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-600">
                      {student.name[0]}
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{student.name}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowAddModal(true);
                    }}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-[#0B2345] transition-all active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 font-display">آخر التقارير</h3>
            <div className="space-y-4 overflow-y-auto h-[600px] pr-2 custom-scrollbar">
              {reports.map(report => (
                <div 
                  key={report.id}
                  className={`p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 ${report.type === 'positive' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : 'bg-red-50/50 dark:bg-red-950/20'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{report.studentName}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setReportToDelete(report.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                      {report.type === 'positive' ? (
                        <CheckCircle size={14} className="text-emerald-500" />
                      ) : (
                        <AlertTriangle size={14} className="text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{report.description}</p>
                  <div className="mt-3 flex items-center justify-between opacity-60">
                    <span className="text-[10px] font-bold">{report.authorName}</span>
                    <span className="text-[10px] font-mono">
                      {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-20 text-slate-400 italic text-sm">
                  لا توجد تقارير حالياً
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {reportToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">تأكيد الحذف</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">هل أنت متأكد من رغبتك في حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setReportToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {loading ? 'جاري الحذف...' : 'حذف التقرير'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 w-full max-w-xl border border-slate-200 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">تقرير سلوكي جديد</h2>
              <p className="text-slate-500 font-bold text-sm mb-8">تسجيل ملاحظة لـ {selectedStudent?.name}</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">نوع السلوك</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewReport({...newReport, type: 'positive'})}
                      className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${newReport.type === 'positive' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      <CheckCircle size={18} />
                      إيجابي
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReport({...newReport, type: 'warning'})}
                      className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${newReport.type === 'warning' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-slate-50 border-transparent text-slate-400'}`}
                    >
                      <AlertTriangle size={18} />
                      تنبيه / تحذير
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">التفاصيل / الملاحظة</label>
                  <textarea 
                    required
                    value={newReport.description}
                    onChange={e => setNewReport({...newReport, description: e.target.value})}
                    className="w-full h-32 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 focus:bg-white outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700"
                    placeholder="اكتب ملاحظاتك هنا..."
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    إلغاء
                  </button>
                  <button 
                    disabled={loading || !newReport.description}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'جاري الحفظ...' : 'حفظ التقرير'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

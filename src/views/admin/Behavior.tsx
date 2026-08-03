import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, limit, orderBy } from 'firebase/firestore';
import { fetchStudentLinkFields } from '../../lib/schoolSync';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { Calendar, Plus, Search, User, MessageSquare, AlertTriangle, CheckCircle, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { notificationService } from '../../lib/notificationService';
import { safeFirestoreAdd } from '../../lib/offline/offlineSync';
import { offlineActorFromProfile } from '../../lib/offline/offlineHelpers';
import { useLanguage } from '../../lib/LanguageContext';
import { AppModalPortal } from '../../components/AppModalPortal';

export default function Behavior() {
  const { isRtl } = useLanguage();
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [newReport, setNewReport] = useState({
    type: 'positive' as 'positive' | 'warning',
    severity: 'medium' as 'low' | 'medium' | 'high',
    actionTaken: '',
    description: '',
    notifyParent: true,
  });

  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;

    setLoading(true);
    const unsubs: (() => void)[] = [];

    const studentsQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId), limit(500));
    unsubs.push(onSnapshot(studentsQ, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error('Error fetching students:', error)));

    const reportsQ = query(
      collection(db, 'behavior_reports'),
      where('schoolId', '==', profile.schoolId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    unsubs.push(onSnapshot(reportsQ, (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching behavior reports:', error);
      setLoading(false);
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !selectedStudent) return;
    setLoading(true);
    
    try {
      const link = await fetchStudentLinkFields(selectedStudent.id);
      const path = 'behavior_reports';
      const reportPayload = {
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        parentIds: link?.parentIds || [],
        parentEmail: link?.parentEmail || '',
        type: newReport.type,
        severity: newReport.severity,
        actionTaken: newReport.actionTaken.trim() || '',
        description: newReport.description,
        notifyParent: newReport.notifyParent,
        createdAt: serverTimestamp(),
        authorId: profile.uid,
        authorName: profile.name,
        updatedAt: new Date().toISOString(),
      };

      const saveResult = await safeFirestoreAdd(path, reportPayload, {
        module: 'behavior',
        actor: offlineActorFromProfile(profile),
      });
      
      const newReportData = {
        id: saveResult.id,
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

      if (newReport.notifyParent && saveResult.mode === 'online') {
        await notificationService.notifyStudentParents(selectedStudent.id, {
          title: newReport.type === 'positive' ? 'ملاحظة سلوكية إيجابية' : 'تنبيه سلوكي',
          message: `تم تسجيل حادثة سلوكية: ${newReport.description}`,
          type: 'behavior',
          schoolId: profile.schoolId
        });
      } else if (newReport.notifyParent && saveResult.mode === 'queued') {
        toast('سيتم إرسال الإشعار بعد المزامنة', { icon: 'ℹ️' });
      }

      toast.success('تم تسجيل التقرير السلوكي بنجاح');
      setShowAddModal(false);
      setNewReport({
        type: 'positive',
        severity: 'medium',
        actionTaken: '',
        description: '',
        notifyParent: true,
      });
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
        <h1 className="text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">السلوك والحوادث</h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
          تسجيل حوادث سلوكية لطالب محدد — ليست للتعميمات العامة ولا للتقييمات الأكاديمية
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 px-5 py-4 text-sm font-bold text-amber-900 dark:text-amber-200">
        <span className="text-amber-600 dark:text-amber-400">متى تستخدم هذا القسم؟</span>{' '}
        عند ملاحظة سلوك إيجابي أو مخالفة لطالب واحد. للتعميمات استخدم «الإعلانات»، وللتقييم الدراسي استخدم «التقييمات».
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white">اختر طالباً لتسجيل حادثة</h3>
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

            <div className="sx-selection-panel" role="listbox">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  role="option"
                  className="sx-selection-panel__option flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-bold text-slate-400 border border-slate-100 dark:border-slate-600 shrink-0">
                      {student.name[0]}
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{student.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowAddModal(true);
                    }}
                    className="p-2 bg-slate-900 text-white rounded-lg hover:bg-blue-600 transition-all active:scale-95 shrink-0"
                    aria-label="إضافة حادثة"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="sx-section bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm h-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 font-display">آخر الحوادث السلوكية</h3>
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
                  {report.severity && (
                    <span className="inline-block mb-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                      الشدة: {report.severity === 'high' ? 'عالية' : report.severity === 'low' ? 'منخفضة' : 'متوسطة'}
                    </span>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{report.description}</p>
                  {report.actionTaken && (
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">الإجراء: {report.actionTaken}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between opacity-60">
                    <span className="text-[10px] font-bold">{report.authorName}</span>
                    <span className="text-[10px] font-mono">
                      {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-20 text-slate-400 space-y-2 px-4">
                  <p className="font-bold text-sm">لا توجد حوادث سلوكية مسجلة</p>
                  <p className="text-xs leading-relaxed">
                    سجّل هنا الملاحظات السلوكية الفردية (إيجابية أو تحذيرية) مع نوع الحادثة والإجراء المتخذ.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AppModalPortal
        open={Boolean(reportToDelete)}
        onClose={() => setReportToDelete(null)}
        dir={isRtl ? 'rtl' : 'ltr'}
        size="sm"
        ariaLabel="تأكيد الحذف"
      >
        <div className="sx-app-modal-panel__header">
          <div>
            <h2 className="sx-app-modal-panel__title">تأكيد الحذف</h2>
            <p className="sx-app-modal-panel__subtitle">حذف حادثة سلوكية</p>
          </div>
          <button type="button" className="sx-app-modal-panel__close" onClick={() => setReportToDelete(null)} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="sx-app-modal-panel__body">
          <p className="text-slate-500 text-sm font-bold">هل أنت متأكد من رغبتك في حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.</p>
        </div>
        <div className="sx-app-modal-panel__footer flex gap-3">
          <button
            onClick={() => setReportToDelete(null)}
            className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all min-h-12"
          >
            إلغاء
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 min-h-12"
          >
            {loading ? 'جاري الحذف...' : 'حذف التقرير'}
          </button>
        </div>
      </AppModalPortal>

      <AppModalPortal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        dir={isRtl ? 'rtl' : 'ltr'}
        size="md"
        ariaLabel="حادثة سلوكية جديدة"
      >
        <div className="sx-app-modal-panel__header">
          <div>
            <h2 className="sx-app-modal-panel__title">حادثة سلوكية جديدة</h2>
            <p className="sx-app-modal-panel__subtitle">تسجيل حادثة لطالب: {selectedStudent?.name}</p>
          </div>
          <button type="button" className="sx-app-modal-panel__close" onClick={() => setShowAddModal(false)} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="sx-app-modal-panel__body space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">نوع الحادثة</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewReport({ ...newReport, type: 'positive' })}
                  className={`py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-12 ${newReport.type === 'positive' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}
                >
                  <CheckCircle size={18} />
                  إيجابي
                </button>
                <button
                  type="button"
                  onClick={() => setNewReport({ ...newReport, type: 'warning' })}
                  className={`py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-h-12 ${newReport.type === 'warning' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-400'}`}
                >
                  <AlertTriangle size={18} />
                  تنبيه / تحذير
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">درجة الشدة</label>
              <select
                value={newReport.severity}
                onChange={(e) =>
                  setNewReport({
                    ...newReport,
                    severity: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 min-h-11"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">الإجراء المتخذ (اختياري)</label>
              <input
                type="text"
                value={newReport.actionTaken}
                onChange={(e) => setNewReport({ ...newReport, actionTaken: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 min-h-11"
                placeholder="مثال: تنبيه شفهي، استدعاء ولي الأمر..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">ملاحظات الحادثة</label>
              <textarea
                required
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                className="w-full h-28 p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none transition-all font-bold text-slate-700"
                placeholder="صف ما حدث بوضوح..."
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer min-h-11">
              <input
                type="checkbox"
                checked={newReport.notifyParent}
                onChange={(e) => setNewReport({ ...newReport, notifyParent: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm font-bold text-slate-600">إشعار ولي الأمر بهذه الحادثة</span>
            </label>
          </div>

          <div className="sx-app-modal-panel__footer flex gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all min-h-12"
            >
              إلغاء
            </button>
            <button
              disabled={loading || !newReport.description}
              className="flex-[2] py-3.5 bg-[#0b1f3a] text-white rounded-xl font-bold hover:bg-[#122a4a] transition-all disabled:opacity-50 min-h-12"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الحادثة'}
            </button>
          </div>
        </form>
      </AppModalPortal>
    </div>
  );
}

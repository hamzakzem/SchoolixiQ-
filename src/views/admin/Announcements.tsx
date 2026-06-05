import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, limit, orderBy, getDocs } from 'firebase/firestore';
import { MessageSquare, Plus, Trash2, Send, Bell, Filter, Users, User, ArrowRight, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';

export default function Announcements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [browsingMode, setBrowsingMode] = useState<'search' | 'grade'>('search');

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    target: 'all', // all, parents, staff, individual
    targetStudentId: '',
    targetStudentName: ''
  });

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;

    const fetchData = async () => {
      try {
        const studentsQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId), limit(500));
        const annQ = query(collection(db, 'announcements'), where('schoolId', '==', profile.schoolId), orderBy('createdAt', 'desc'), limit(100));

        const [studentsSnap, annSnap] = await Promise.all([
          getDocs(studentsQ),
          getDocs(annQ)
        ]);

        if (!isMounted) return;

        setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setAnnouncements(annSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching announcements data:", error);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [profile]);

  // Group students by grade
  const studentsByGrade = students.reduce((acc: any, student: any) => {
    const grade = student.grade || 'غير محدد';
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(student);
    return acc;
  }, {});

  const grades = Object.keys(studentsByGrade).sort();

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.registrationNumber?.includes(searchTerm);
    const matchesGrade = selectedGrade ? s.grade === selectedGrade : true;
    return matchesSearch && matchesGrade;
  }).slice(0, browsingMode === 'search' ? 8 : 100);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;
    setLoading(true);
    const path = 'announcements';
    try {
      const annRef = await addDoc(collection(db, path), {
        ...newAnnouncement,
        schoolId: profile.schoolId,
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: serverTimestamp(),
      });

      // Send notifications based on target
      if (newAnnouncement.target === 'individual' && newAnnouncement.targetStudentId) {
        await notificationService.notifyStudentParents(newAnnouncement.targetStudentId, {
          title: `إعلان خاص: ${newAnnouncement.title}`,
          message: newAnnouncement.content,
          type: 'announcement',
          schoolId: profile.schoolId,
          metadata: { sourceId: annRef.id }
        });
      } else if (newAnnouncement.target === 'parents') {
        await notificationService.notifyAllParents(profile.schoolId, {
          title: newAnnouncement.title,
          message: newAnnouncement.content,
          type: 'announcement',
          schoolId: profile.schoolId,
          metadata: { sourceId: annRef.id }
        });
      } else if (newAnnouncement.target === 'staff') {
        await notificationService.notifyAllStaff(profile.schoolId, {
          title: newAnnouncement.title,
          message: newAnnouncement.content,
          type: 'announcement',
          schoolId: profile.schoolId,
          metadata: { sourceId: annRef.id }
        });
      } else if (newAnnouncement.target === 'all') {
        await notificationService.notifyAllSchool(profile.schoolId, {
          title: newAnnouncement.title,
          message: newAnnouncement.content,
          type: 'announcement',
          schoolId: profile.schoolId,
          metadata: { sourceId: annRef.id }
        });
      }

      const addedAnn = {
        id: annRef.id,
        ...newAnnouncement,
        schoolId: profile.schoolId,
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: { seconds: Math.floor(Date.now() / 1000) }
      };
      setAnnouncements(prev => [addedAnn, ...prev]);

      toast.success('تم نشر الإعلان بنجاح');
      setShowAddModal(false);
      setNewAnnouncement({ title: '', content: '', target: 'all', targetStudentId: '', targetStudentName: '' });
      setSearchTerm('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      toast.error('حدث خطأ أثناء النشر');
    } finally {
      setLoading(false);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const path = `announcements/${id}`;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      await notificationService.deleteBySourceId(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('تم حذف الإعلان بنجاح');
      setDeleteConfirmId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">تأكيد الحذف</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-bold text-sm">هل أنت متأكد من رغبتك في حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  حذف الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">الإعلانات والتعليمات</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">تواصل مع أولياء الأمور والكادر التعليمي بضغطة زر</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:shadow-xl transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>إرسال تعميم جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {announcements.map((ann) => (
            <motion.div 
              layout
              key={ann.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
            >
              <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    ann.target === 'all' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                    ann.target === 'parents' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                    'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    <Bell size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ann.target === 'all' ? 'bg-blue-100 text-blue-700' :
                        ann.target === 'parents' ? 'bg-purple-100 text-purple-700' :
                        ann.target === 'staff' ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ann.target === 'all' ? 'للجميع' : ann.target === 'parents' ? 'لأولياء الأمور' : ann.target === 'staff' ? 'للكادر التعليمي' : `فردي: ${ann.targetStudentName}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {ann.createdAt?.seconds ? new Date(ann.createdAt.seconds * 1000).toLocaleString('ar-IQ') : 'جاري النشر...'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{ann.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl whitespace-pre-wrap">{ann.content}</p>
                    <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-400 italic">
                      بواسطة: {ann.authorName}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(ann.id); }}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 active:scale-95"
                  title="حذف الإعلان"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-900 dark:bg-white opacity-10"></div>
            </motion.div>
          ))}
        </AnimatePresence>

        {announcements.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">لا توجد إعلانات بعد</h3>
            <p className="text-slate-500">ابدأ بنشر أول تعميم لمدرستك ليصل للجميع</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
                    <Send size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">نشر تعميم جديد</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                  إغلاق
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 px-1 font-display">الفئة المستهدفة</label>
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto custom-scrollbar">
                      {[
                        { id: 'all', label: 'للجميع', color: 'blue' },
                        { id: 'parents', label: 'الأهالي', color: 'purple' },
                        { id: 'staff', label: 'الكادر', color: 'orange' },
                        { id: 'individual', label: 'فردي (طالب)', color: 'emerald' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setNewAnnouncement({...newAnnouncement, target: t.id});
                            if (t.id === 'individual') setShowStudentSearch(true);
                          }}
                          className={`flex-1 py-3 px-3 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all ${
                            newAnnouncement.target === t.id 
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {newAnnouncement.target === 'individual' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:col-span-2 overflow-hidden"
                      >
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 px-1 font-display">
                          {newAnnouncement.targetStudentId ? 'الطالب المختار' : 'ابحث عن طالب'}
                        </label>
                        {newAnnouncement.targetStudentId ? (
                          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl animate-in zoom-in-95 duration-200">
                             <div className="flex items-center gap-3">
                               <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                 <User size={24} />
                               </div>
                               <div>
                                 <p className="font-bold text-slate-900 dark:text-white">{newAnnouncement.targetStudentName}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                   <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">تم التحديد - سيصل الإشعار للأهالي</p>
                                 </div>
                               </div>
                             </div>
                             <button 
                               type="button"
                               onClick={() => {
                                 setNewAnnouncement({...newAnnouncement, targetStudentId: '', targetStudentName: ''});
                                 setSearchTerm('');
                               }}
                               className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                             >
                               <Trash2 size={18} />
                             </button>
                          </div>
                        ) : (
                          <div className="relative z-[70]">
                            <div className="relative group">
                              <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                <Search size={18} />
                              </div>
                              <input 
                                type="text"
                                className="w-full pr-12 pl-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                                placeholder={browsingMode === 'search' ? "ابحث عن اسم الطالب أو رقمه التسلسلي..." : "اختر صفاً من القائمة أدناه..."}
                                value={searchTerm}
                                onFocus={() => {
                                  setShowStudentSearch(true);
                                }}
                                onClick={() => setShowStudentSearch(true)}
                                onChange={e => {
                                  setSearchTerm(e.target.value);
                                  setShowStudentSearch(true);
                                  setBrowsingMode('search');
                                }}
                              />
                              <div className="absolute inset-y-0 left-5 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBrowsingMode(prev => prev === 'search' ? 'grade' : 'search');
                                    setShowStudentSearch(true);
                                  }}
                                  className={`p-2 rounded-lg transition-all ${browsingMode === 'grade' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                  title="تصفح حسب الصفوف"
                                >
                                  <Users size={16} />
                                </button>
                                <Filter size={14} className={showStudentSearch ? 'rotate-180 transition-all text-emerald-500' : 'transition-all text-slate-300'} />
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {showStudentSearch && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-[-1]" 
                                    onClick={() => {
                                      setShowStudentSearch(false);
                                      setSelectedGrade(null);
                                    }}
                                  />
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[28rem] overflow-y-auto custom-scrollbar"
                                  >
                                    {/* Tabs */}
                                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBrowsingMode('search');
                                          setSelectedGrade(null);
                                        }}
                                        className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all ${browsingMode === 'search' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-slate-400'}`}
                                      >
                                        بحث سريع
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setBrowsingMode('grade')}
                                        className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all ${browsingMode === 'grade' ? 'text-emerald-500 border-b-2 border-emerald-500 bg-emerald-50/30' : 'text-slate-400'}`}
                                      >
                                        تصفح الصفوف
                                      </button>
                                    </div>

                                    {browsingMode === 'search' ? (
                                      <>
                                        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                          <div className="flex items-center justify-between mb-3">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                              {searchTerm ? `نتائج البحث (${filteredStudents.length})` : 'تصفية حسب الصف'}
                                            </p>
                                            {selectedGrade && (
                                              <button 
                                                onClick={() => setSelectedGrade(null)}
                                                className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                              >
                                                إعادة تعيين
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar scroll-smooth">
                                            {grades.map(grade => (
                                              <button
                                                key={grade}
                                                type="button"
                                                onClick={() => setSelectedGrade(selectedGrade === grade ? null : grade)}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${
                                                  selectedGrade === grade 
                                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                                                  : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-emerald-500'
                                                }`}
                                              >
                                                {grade}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        {filteredStudents.length > 0 ? (
                                          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {filteredStudents.map(s => (
                                              <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => {
                                                  setNewAnnouncement({
                                                    ...newAnnouncement, 
                                                    targetStudentId: s.id, 
                                                    targetStudentName: s.name 
                                                  });
                                                  setSearchTerm('');
                                                  setShowStudentSearch(false);
                                                  setSelectedGrade(null);
                                                }}
                                                className="w-full px-5 py-4 text-right hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all flex items-center justify-between group/item"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all shadow-sm">
                                                    <User size={16} />
                                                  </div>
                                                  <div>
                                                    <span className="font-bold text-slate-900 dark:text-white block group-hover/item:text-emerald-600 dark:group-hover/item:text-emerald-400 transition-colors">{s.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-[10px] text-slate-400 font-medium">الصف: {s.grade}</span>
                                                      <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                                                      <span className="text-[10px] text-slate-400 font-medium">الشعبة: {s.section}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                  <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">{s.registrationNumber}</span>
                                                </div>
                                              </button>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="px-6 py-12 text-center text-slate-400">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200 dark:text-slate-700">
                                              <Search size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">لم نتمكن من العثور على الطالب</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">تأكد من كتابة الاسم بشكل صحيح أو تغيير التصفية</p>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="p-4">
                                        {!selectedGrade ? (
                                          <div className="grid grid-cols-2 gap-3 pb-4">
                                            {grades.map(grade => (
                                              <button
                                                key={grade}
                                                type="button"
                                                onClick={() => setSelectedGrade(grade)}
                                                className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all text-center group"
                                              >
                                                <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-emerald-500 shadow-sm">
                                                  <Users size={18} />
                                                </div>
                                                <span className="block font-bold text-slate-900 dark:text-white text-sm">{grade}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{studentsByGrade[grade].length} طالب</span>
                                              </button>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="animate-in slide-in-from-left-4 duration-300">
                                            <button 
                                              onClick={() => setSelectedGrade(null)}
                                              className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-4 hover:gap-3 transition-all"
                                            >
                                              <ArrowRight size={14} />
                                              <span>العودة لقائمة الصفوف</span>
                                            </button>
                                            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl mb-4">
                                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">طلاب {selectedGrade}</p>
                                            </div>
                                            <div className="space-y-2">
                                              {studentsByGrade[selectedGrade].map((s: any) => (
                                                <button
                                                  key={s.id}
                                                  type="button"
                                                  onClick={() => {
                                                    setNewAnnouncement({
                                                      ...newAnnouncement, 
                                                      targetStudentId: s.id, 
                                                      targetStudentName: s.name 
                                                    });
                                                    setShowStudentSearch(false);
                                                    setSelectedGrade(null);
                                                  }}
                                                  className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-emerald-500 transition-all text-right flex items-center justify-between"
                                                >
                                                  <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                                      <User size={14} />
                                                    </div>
                                                    <div className="text-right">
                                                      <p className="font-bold text-slate-900 dark:text-white text-xs">{s.name}</p>
                                                      <p className="text-[9px] text-slate-400">الشعبة: {s.section}</p>
                                                    </div>
                                                  </div>
                                                  <span className="text-[9px] font-mono text-slate-400">{s.registrationNumber}</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 px-1 font-display">عنوان التعميم</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all font-display"
                      placeholder="مثلاً: تنبيه بخصوص العطلة الرسمية..."
                      value={newAnnouncement.title}
                      onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3.5 px-1 font-display">نص التعميم</label>
                    <textarea 
                      required
                      rows={6}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all resize-none font-display"
                      placeholder="اكتب تفاصيل الإعلان هنا بالتفصيل..."
                      value={newAnnouncement.content}
                      onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                    ></textarea>
                  </div>
                </div>

                <button 
                  disabled={loading}
                  className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-bold text-lg hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3 shadow-xl"
                >
                  <Send size={24} />
                  {loading ? 'جاري النشر...' : 'تأكيد النشر الآن'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

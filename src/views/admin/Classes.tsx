import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Search, Plus, Filter, MoreVertical, LayoutDashboard, Trash2, AlertTriangle, X, Users, Edit2, UserPlus, ArrowRightLeft, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

export default function Classes() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '' });
  const [editingClass, setEditingClass] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<any | null>(null);
  const [movingStudent, setMovingStudent] = useState<any | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickNewStudent, setQuickNewStudent] = useState({ name: '', registrationNumber: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (!profile?.schoolId) return;
    
    try {
      const classesQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId), limit(100));
      unsubs.push(onSnapshot(classesQ, snap => {
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));

      const studentsQ = query(collection(db, 'students'), where('schoolId', '==', profile.schoolId), limit(1000));
      unsubs.push(onSnapshot(studentsQ, snap => {
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));
    } catch (error) {
      console.error("Error setting up real-time classes listeners:", error);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [profile]);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;
    
    try {
      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), {
          name: newClass.name,
          updatedAt: serverTimestamp(),
        });
        setClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, name: newClass.name } : c));
        toast.success('تم تحديث الصف بنجاح');
      } else {
        const docRef = await addDoc(collection(db, 'classes'), {
          name: newClass.name,
          schoolId: profile.schoolId,
          createdAt: serverTimestamp(),
        });
        setClasses(prev => [...prev, { id: docRef.id, name: newClass.name, schoolId: profile.schoolId }]);
        toast.success('تمت إضافة الصف بنجاح');
      }
      setNewClass({ name: '' });
      setEditingClass(null);
      setShowAddModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
      toast.error('حدث خطأ أثناء حفظ الصف');
    }
  };

  const handleDeleteClass = async (id: string) => {
    setIsDeleting(true);
    try {
      // Check if class has students
      const classStudents = students.filter(s => s.classId === id);
      if (classStudents.length > 0) {
        toast.error('لا يمكن حذف صف يحتوي على طلاب. يرجى نقل الطلاب أولاً.');
        setIsDeleting(false);
        return;
      }

      await deleteDoc(doc(db, 'classes', id));
      setClasses(prev => prev.filter(c => c.id !== id));
      toast.success('تم حذف الصف بنجاح');
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
      toast.error('فشل حذف الصف');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveStudent = async (studentId: string, newClassId: string) => {
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'students', studentId), {
        classId: newClassId,
        updatedAt: serverTimestamp(),
      });
      toast.success('تم نقل الطالب بنجاح');
      setMovingStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
      toast.error('فشل نقل الطالب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !selectedClassForStudents) return;
    
    setIsProcessing(true);
    try {
      await addDoc(collection(db, 'students'), {
        name: quickNewStudent.name,
        registrationNumber: quickNewStudent.registrationNumber,
        classId: selectedClassForStudents.id,
        schoolId: profile.schoolId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        linkedParents: []
      });
      toast.success('تمت إضافة الطالب بنجاح');
      setQuickNewStudent({ name: '', registrationNumber: '' });
      setShowQuickAdd(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
      toast.error('حدث خطأ أثناء إضافة الطالب');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">إدارة الصفوف الدراسية</h1>
          <p className="text-slate-500 mt-1">تحديد الهيكل الدراسي والمراحل المعترف بها في المدرسة</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
               type="text" 
               placeholder="بحث عن صف..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none w-full md:w-64 transition-all font-medium"
            />
          </div>
          <button
            onClick={() => {
              setEditingClass(null);
              setNewClass({ name: '' });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-xl active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            <span className="hidden md:inline">صف جديد</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredClasses.map(cls => (
          <motion.div 
            layout
            key={cls.id}
            onClick={() => setSelectedClassForStudents(cls)}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 left-0 w-32 h-32 bg-slate-50 rounded-full -translate-x-16 -translate-y-16 group-hover:bg-indigo-50 transition-colors"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform">
                  <LayoutDashboard size={28} />
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === cls.id ? null : cls.id);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  <AnimatePresence>
                    {activeMenu === cls.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                      >
                        <div className="p-2">
                          <button
                            onClick={() => {
                              setEditingClass(cls);
                              setNewClass({ name: cls.name });
                              setShowAddModal(true);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all group/item"
                          >
                            <Edit2 size={16} className="text-slate-400 group-hover/item:text-indigo-600" />
                            تعديل الاسم
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDeleteId(cls.id);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all group/item"
                          >
                            <Trash2 size={16} className="text-red-400 group-hover/item:text-red-600" />
                            حذف الصف
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-2 font-display">{cls.name}</h3>
              <div className="flex items-center gap-2 text-slate-400 mb-6">
                <Users size={14} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  {students.filter(s => s.classId === cls.id).length} طالب مسجل
                </span>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase">المعرف: {cls.id.slice(0, 8)}</span>
                <div className="flex -space-x-2 space-x-reverse">
                   {students.filter(s => s.classId === cls.id).slice(0, 3).map((s, i) => (
                     <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500 overflow-hidden">
                        {s.name[0]}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredClasses.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
            <LayoutDashboard size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-400 font-bold">لا توجد صفوف مطابقة للبحث</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedClassForStudents && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-end backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
            >
               <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-2xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 font-display">طلاب: {selectedClassForStudents.name}</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{students.filter(s => s.classId === selectedClassForStudents.id).length} طالب مقيد</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedClassForStudents(null);
                      setShowQuickAdd(false);
                    }}
                    className="p-3 hover:bg-white hover:shadow-lg rounded-2xl transition-all text-slate-400 hover:text-slate-900"
                  >
                    <X size={24} />
                  </button>
               </div>

               <div className="p-8 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-bold text-slate-900">قائمة الطلاب</h3>
                    <button 
                      onClick={() => setShowQuickAdd(!showQuickAdd)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      {showQuickAdd ? <X size={16} /> : <UserPlus size={16} />}
                      {showQuickAdd ? 'إلغاء' : 'إضافة طالب سريع'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showQuickAdd && (
                      <motion.form 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleQuickAddStudent}
                        className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4 mb-4">
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">اسم الطالب</label>
                              <input 
                                required
                                type="text"
                                value={quickNewStudent.name}
                                onChange={e => setQuickNewStudent({...quickNewStudent, name: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
                                placeholder="الاسم الكامل"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">رقم القيد</label>
                              <input 
                                required
                                type="text"
                                value={quickNewStudent.registrationNumber}
                                onChange={e => setQuickNewStudent({...quickNewStudent, registrationNumber: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
                                placeholder="ID001"
                              />
                           </div>
                        </div>
                        <button 
                          disabled={isProcessing}
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50"
                        >
                          {isProcessing ? 'جاري الحفظ...' : 'إضافة الطالب للصف'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  <div className="space-y-4">
                    {students.filter(s => s.classId === selectedClassForStudents.id).map(student => (
                      <div key={student.id} className="p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:border-slate-300 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">#{student.registrationNumber}</p>
                          </div>
                        </div>

                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingStudent(movingStudent === student.id ? null : student.id);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                            <ArrowRightLeft size={14} />
                            نقل لصف آخر
                          </button>

                          <AnimatePresence>
                            {movingStudent === student.id && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute left-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[60] p-2"
                              >
                                <p className="text-[9px] font-bold text-slate-400 px-3 py-2 uppercase tracking-tight">اختر الوجهة:</p>
                                {classes.filter(c => c.id !== selectedClassForStudents.id).map(targetClass => (
                                  <button
                                    key={targetClass.id}
                                    onClick={() => handleMoveStudent(student.id, targetClass.id)}
                                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between"
                                  >
                                    {targetClass.name}
                                    <Plus size={12} className="text-slate-300" />
                                  </button>
                                ))}
                                {classes.length <= 1 && (
                                  <p className="text-[9px] text-red-400 px-3 py-2">لا توجد صفوف أخرى متاحة</p>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                    {students.filter(s => s.classId === selectedClassForStudents.id).length === 0 && !showQuickAdd && (
                      <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                        <Users size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 font-bold">لا يوجد طلاب في هذا الصف حالياً</p>
                      </div>
                    )}
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative border border-slate-200"
            >
              <h2 className="text-2xl font-bold mb-6 text-slate-900 font-display">
                {editingClass ? 'تعديل بيانات الصف' : 'إضافة صف دراسي جديد'}
              </h2>
              
              <form onSubmit={handleAddClass} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">اسم الصف</label>
                  <input
                    required
                    type="text"
                    value={newClass.name}
                    onChange={e => setNewClass({ name: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 outline-none transition-all font-bold text-slate-900"
                    placeholder="مثال: الصف الأول أ"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                  >
                    {editingClass ? 'تحديث البيانات' : 'إضافة الصف'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl"
              dir="rtl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">تأكيد حذف الصف</h2>
              <p className="text-slate-500 text-sm mb-8">
                هل أنت متأكد من رغبتك في حذف هذا الصف؟ سيتم إزالة هذا التصنيف من كافة قوائم المدرسة.
              </p>
              
              <div className="flex gap-3">
                <button
                  disabled={isDeleting}
                  onClick={() => handleDeleteClass(confirmDeleteId)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Users, Search, Trash2, Mail, User, GraduationCap, AlertTriangle, X, Plus, Phone, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { adminCreateUser, adminDeleteUser } from '../../lib/adminApi';

import { useLanguage } from '../../lib/LanguageContext';

export default function ParentsList() {
  const { isRtl } = useLanguage();
  const { profile } = useAuth();
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState<any>(null);
  const [newParent, setNewParent] = useState({ name: '', email: '', password: '', phoneNumber: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{parentId: string, studentId: string, studentName: string} | null>(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!profile?.schoolId) return;

    try {
      const studentsQ = query(
        collection(db, 'students'),
        where('schoolId', '==', profile.schoolId)
      );
      const unsub = onSnapshot(studentsQ, snap => {
        setAllStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'ParentsList:students');
    }
  }, [profile?.schoolId]);

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    try {
      await updateDoc(doc(db, 'users', showEditModal.id), {
        name: showEditModal.name,
        phoneNumber: showEditModal.phoneNumber || ""
      });
      toast.success('تم تحديث بيانات ولي الأمر بنجاح');
      setShowEditModal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      toast.error('فشل في تحديث البيانات');
    }
  };

  const handleLinkStudent = async (studentId: string) => {
    if (!showLinkModal) return;

    setIsLinking(true);
    try {
      const studentRef = doc(db, 'students', studentId);
      const student = allStudents.find(s => s.id === studentId);
      const currentParentIds = student.parentIds || [];

      if (currentParentIds.includes(showLinkModal.id)) {
        toast.error('هذا الطالب مربوط بالفعل بهذا الحساب');
        return;
      }

      await updateDoc(studentRef, {
        parentIds: arrayUnion(showLinkModal.id),
        updatedAt: serverTimestamp()
      });

      toast.success('تم ربط الطالب بنجاح');
      setShowLinkModal(null);
      setStudentSearch('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
      toast.error('فشل في ربط الطالب');
    } finally {
      setIsLinking(false);
    }
  };

  useEffect(() => {
    if (!profile?.schoolId) return;

    try {
      const q = query(
        collection(db, 'users'),
        where('schoolId', '==', profile.schoolId),
        where('role', '==', 'parent')
      );

      const unsub = onSnapshot(q, snap => {
        const parentsData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setParents(parentsData);
        setLoading(false);
      });

      return () => unsub();
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
      setLoading(false);
    }
  }, [profile?.schoolId]);

  const handleUnlink = async () => {
    if (!showDeleteConfirm) return;

    try {
      const studentRef = doc(db, 'students', showDeleteConfirm.studentId);
      await updateDoc(studentRef, {
        parentIds: arrayRemove(showDeleteConfirm.parentId)
      });
      
      toast.success('تم فك الارتباط بنجاح');
      setShowDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
      toast.error('حدث خطأ أثناء فك الارتباط');
    }
  };

  const handleDeleteParent = async () => {
    if (!showDeleteAccountConfirm || !profile?.schoolId) return;

    setIsDeleting(true);
    try {
      const parentId = showDeleteAccountConfirm.id;
      // Admin API handles real Auth and Firestore deletion
      await adminDeleteUser(parentId);
      
      toast.success('تم حذف حساب ولي الأمر بنجاح');
      setShowDeleteAccountConfirm(null);
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      toast.error(error.message || 'فشل في حذف الحساب');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;
    if (!newParent.email || !newParent.password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (newParent.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsAdding(true);
    try {
      // Use Admin API for real Auth creation
      await adminCreateUser({
        email: newParent.email.toLowerCase(),
        password: newParent.password,
        displayName: newParent.name || "ولي أمر",
        role: 'parent',
        schoolId: profile.schoolId,
        additionalData: {
          phoneNumber: newParent.phoneNumber || "",
        }
      });
      
      toast.success('تم إنشاء حساب ولي الأمر بنجاح');
      setShowAddModal(false);
      setNewParent({ name: '', email: '', password: '', phoneNumber: '' });
    } catch (error: any) {
      console.error('Error adding parent:', error);
      toast.error(error.message || 'فشل في إضافة الحساب');
    } finally {
      setIsAdding(false);
    }
  };


  const filteredParents = parents.filter(parent => 
    parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0B2345]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="flex items-center gap-5 relative z-10">
           <div className="w-16 h-16 bg-indigo-50 text-[#0B2345] rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner">
             <Users size={32} />
           </div>
           <div>
             <h1 className="text-2xl font-black text-slate-900 font-display mb-1.5">حسابات أولياء الأمور</h1>
             <p className="text-slate-500 text-sm font-bold">إدارة الحسابات، تفاصيل التواصل، والطلاب المربوطين</p>
           </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10 w-full md:w-auto">
          <div className="relative group w-full md:w-auto">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="البحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-72 pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-sm"
            />
          </div>
          
          <button 
            onClick={() => {
              setNewParent({ name: '', email: '', password: '', phoneNumber: '' });
              setShowAddModal(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#0B2345] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={20} />
            إضافة ولي أمر
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-6 animate-pulse">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl shrink-0"></div>
                <div className="space-y-3 flex-1">
                  <div className="w-48 h-4 bg-slate-100 rounded"></div>
                  <div className="w-32 h-3 bg-slate-100 rounded"></div>
                </div>
                <div className="hidden md:block w-64 h-12 bg-slate-100 rounded-xl shrink-0"></div>
                <div className="hidden md:block w-32 h-10 bg-slate-100 rounded-xl shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredParents.length > 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block sq-table-wrap" style={{ maxHeight: 'calc(100dvh - 13.5rem)', minHeight: 'min(52vh, 420px)' }}>
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100/80">
                  <th className="py-5 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider w-1/4">ولي الأمر</th>
                  <th className="py-5 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider w-1/4">معلومات التواصل</th>
                  <th className="py-5 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider">الطلاب المربوطون</th>
                  <th className="py-5 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider text-center w-32">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParents.map(parent => {
                  const linkedStudents = allStudents.filter(s => s.parentIds?.includes(parent.id));
                  return (
                    <tr key={parent.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-5 px-6 align-top border-l border-slate-50">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-indigo-50 text-[#0B2345] rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
                            <User size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-[#0B2345] transition-colors">{parent.name || 'ولي أمر'}</h3>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1.5 inline-block">حساب ولي أمر</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 align-top border-l border-slate-50">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-100 w-max" title="البريد الإلكتروني">
                            <Mail size={14} className="text-slate-400" />
                            <span className="text-xs font-mono font-medium">{parent.email}</span>
                          </div>
                          {parent.phoneNumber && (
                            <div className="flex items-center gap-2 text-slate-600 bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-100 w-max" title="رقم الهاتف">
                              <Phone size={14} className="text-slate-400" />
                              <span className="text-xs font-mono font-medium">{parent.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-6 align-top">
                        <div className="flex flex-wrap gap-2">
                          {linkedStudents.map((student: any) => (
                            <div key={student.id} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100/50 rounded-xl py-1.5 pr-3 pl-1.5">
                              <GraduationCap size={16} className="text-emerald-500 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-emerald-900 block">{student.name}</span>
                                <span className="text-[9px] text-emerald-600 font-bold block mt-0.5 uppercase tracking-wider">الصف: {student.class || 'غير محدد'}</span>
                              </div>
                              <button 
                                onClick={() => setShowDeleteConfirm({ parentId: parent.id, studentId: student.id, studentName: student.name })}
                                className="mr-3 text-emerald-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                title="فك الارتباط"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={() => setShowLinkModal(parent)}
                            className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-500 border border-slate-200 border-dashed rounded-xl px-3 hover:bg-slate-50 hover:text-[#0B2345] hover:border-indigo-300 transition-all shadow-sm"
                          >
                            <Plus size={14} /> ربط طالب
                          </button>
                        </div>
                      </td>
                      <td className="py-5 px-6 align-middle text-center border-r border-slate-50">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setShowEditModal(parent)}
                            className="p-2 text-slate-400 hover:text-[#0B2345] hover:bg-indigo-50 rounded-xl transition-all"
                            title="تعديل البيانات"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => setShowDeleteAccountConfirm(parent)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="حذف الحساب"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredParents.map(parent => {
              const linkedStudents = allStudents.filter(s => s.parentIds?.includes(parent.id));
              return (
                <div key={parent.id} className="p-5 space-y-4 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-[#0B2345] rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
                        <User size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{parent.name || 'ولي أمر'}</h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">حساب ولي أمر</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-100/80 rounded-xl p-1">
                       <button 
                         onClick={() => setShowEditModal(parent)}
                         className="p-1.5 text-slate-400 hover:text-[#0B2345] hover:bg-white rounded-lg transition-all shadow-sm"
                       >
                         <Edit2 size={14} />
                       </button>
                       <button 
                         onClick={() => setShowDeleteAccountConfirm(parent)}
                         className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm"
                       >
                         <Trash2 size={14} />
                       </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-2 border-t border-slate-100/60">
                    <div className="flex items-center gap-3 text-slate-600 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 w-full overflow-hidden text-ellipsis">
                      <Mail size={16} className="text-slate-400 shrink-0" />
                      <span className="text-xs font-mono font-bold truncate tracking-tight">{parent.email}</span>
                    </div>
                    {parent.phoneNumber && (
                      <div className="flex items-center gap-3 text-slate-600 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 w-full">
                        <Phone size={16} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-mono font-bold tracking-tight">{parent.phoneNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pointer-events-none">
                      <span className="text-xs font-black text-slate-700">الطلاب المربوطون</span>
                      <button 
                        onClick={() => setShowLinkModal(parent)}
                        className="text-[10px] font-bold bg-white text-[#0B2345] border border-indigo-200 rounded-lg px-2.5 py-1.5 shadow-sm pointer-events-auto active:scale-95 transition-transform"
                      >
                        <Plus size={10} className="inline mr-1" /> ربط طالب
                      </button>
                    </div>
                    <div className="space-y-2">
                       {linkedStudents.length > 0 ? (
                         linkedStudents.map((student: any) => (
                          <div key={student.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2 px-3 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100/50">
                                <GraduationCap size={16} className="text-emerald-500" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-800 block leading-none mb-1">{student.name}</span>
                                <span className="text-[9px] text-slate-400 font-bold tracking-wider">{student.class ? `الصف: ${student.class}` : 'الصف غير محدد'}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => setShowDeleteConfirm({ parentId: parent.id, studentId: student.id, studentName: student.name })}
                              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                         ))
                       ) : (
                         <div className="text-center py-4 bg-white/50 border border-slate-100 rounded-xl border-dashed">
                           <span className="text-[11px] font-bold text-slate-400">لا يوجد طلاب مربوطون</span>
                         </div>
                       )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-20 text-center border border-slate-200 shadow-sm">
          <div className="w-24 h-24 bg-slate-50/80 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400 shadow-inner">
            <Users size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">لا يوجد أولياء أمور</h3>
          <p className="text-slate-500 font-bold text-sm">لم يتم العثور على أي حسابات أولياء أمور مسجلة في مدرستك حالياً.</p>
        </div>
      )}

      {/* Delete/Unlink Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-200 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 border border-red-100">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">فك ارتباط الحساب</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                هل أنت متأكد من رغبتك في فك ارتباط هذا الحساب بالطالب <span className="font-bold text-slate-900">({showDeleteConfirm.studentName})</span>؟
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all font-display"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleUnlink}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 font-display"
                >
                  تأكيد الفصل
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Parent Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteAccountConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm border border-slate-200 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-inner">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2 font-display">حذف حساب ولي الأمر</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                هل أنت متأكد من حذف حساب <span className="font-bold text-slate-900">({showDeleteAccountConfirm.name || showDeleteAccountConfirm.email})</span>؟
                <br />
                <span className="text-red-500 text-[10px] mt-2 block font-bold">سيؤدي هذا إلى حذف الحساب تماماً وفك ارتباطه بكافة الطلاب.</span>
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteAccountConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all font-display disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleDeleteParent}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 font-display disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Parent Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md border border-slate-200 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute left-6 top-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-[#0B2345] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                  <User size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">إضافة ولي أمر جديد</h2>
                <p className="text-slate-500 text-sm mt-1">أنشئ حساباً جديداً لأحد أولياء الأمور</p>
              </div>

              <form onSubmit={handleAddParent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">اسم ولي الأمر (اختياري)</label>
                  <input 
                    type="text"
                    value={newParent.name}
                    onChange={(e) => setNewParent({ ...newParent, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    placeholder="مثال: محمد علي"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">البريد الإلكتروني (مطلوب)</label>
                  <input 
                    type="email"
                    required
                    value={newParent.email}
                    onChange={(e) => setNewParent({ ...newParent, email: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-left"
                    placeholder="parent@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">كلمة المرور (مطلوب)</label>
                  <input 
                    type="password"
                    required
                    value={newParent.password}
                    onChange={(e) => setNewParent({ ...newParent, password: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-left"
                    placeholder="******"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">رقم الهاتف (اختياري)</label>
                  <input 
                    type="tel"
                    value={newParent.phoneNumber}
                    onChange={(e) => setNewParent({ ...newParent, phoneNumber: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    placeholder="07XXXXXXXX"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isAdding}
                    className="w-full py-4 bg-[#0B2345] text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isAdding ? 'جاري الإضافة...' : 'إنشاء الحساب'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Parent Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md border border-slate-200 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowEditModal(null)}
                className="absolute left-6 top-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-[#0B2345] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                  <Edit2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">تعديل بيانات ولي الأمر</h2>
                <p className="text-slate-500 text-sm mt-1">تعديل معلومات التواصل والحساب</p>
              </div>

              <form onSubmit={handleUpdateParent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">البريد الإلكتروني (غير قابل للتعديل)</label>
                  <input 
                    type="email"
                    disabled
                    value={showEditModal.email}
                    className="w-full px-5 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold opacity-70 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">اسم ولي الأمر</label>
                  <input 
                    type="text"
                    required
                    value={showEditModal.name}
                    onChange={(e) => setShowEditModal({ ...showEditModal, name: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    placeholder="الاسم الكامل"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 pr-1">رقم الهاتف</label>
                  <input 
                    type="tel"
                    value={showEditModal.phoneNumber || ""}
                    onChange={(e) => setShowEditModal({ ...showEditModal, phoneNumber: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                    placeholder="رقم الهاتف"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#0B2345] text-white rounded-2xl font-bold font-display shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Student Modal */}
      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 w-full max-w-md border border-slate-200 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button 
                onClick={() => {
                  setShowLinkModal(null);
                  setStudentSearch('');
                }}
                className="absolute left-6 top-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8 shrink-0">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <GraduationCap size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">ربط طالب جديد</h2>
                <p className="text-slate-500 text-sm mt-1">اختر الطالب الذي تريد ربطه بحساب <span className="text-[#0B2345] font-bold">{showLinkModal.name || showLinkModal.email}</span></p>
              </div>

              <div className="relative mb-6 shrink-0">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="ابحث عن الطالب بالاسم..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pr-11 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-sm"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {allStudents
                  .filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase()))
                  .slice(0, 10)
                  .map(student => {
                    const isAlreadyLinked = student.parentIds?.includes(showLinkModal.id);
                    return (
                      <button
                        key={student.id}
                        disabled={isAlreadyLinked || isLinking}
                        onClick={() => handleLinkStudent(student.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-right ${
                          isAlreadyLinked 
                            ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' 
                            : 'bg-white border-slate-100 hover:border-emerald-500 hover:shadow-md hover:scale-[1.02]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAlreadyLinked ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            <User size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">الصف: {student.class || 'غير محدد'}</p>
                          </div>
                        </div>
                        {isAlreadyLinked ? (
                          <span className="text-[10px] font-bold text-slate-400">مربوط مسبقاً</span>
                        ) : (
                          <Plus size={16} className="text-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                {allStudents.filter(s => s.name?.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm italic">لا يوجد نتائج للبحث...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

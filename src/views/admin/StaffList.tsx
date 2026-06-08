import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, serverTimestamp, setDoc, doc, getDocs, updateDoc, limit, onSnapshot, deleteField } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { UserPlus, Mail, Phone, ShieldCheck, Trash2, Lock, Save, X, Search, Printer, FileText, Send, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { adminCreateUser, adminDeleteUser } from '../../lib/adminApi';
import { printElement } from '../../lib/printUtils';
import {
  getTeacherSubjectDisplay,
  sanitizeUserWritePayload,
  sanitizeStaffRecord,
} from '../../lib/userProfile';

export default function StaffList() {
  const { profile } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryEditStaff, setSalaryEditStaff] = useState<any>(null);
  const [newSalary, setNewSalary] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [newStaff, setNewStaff] = useState({ 
    name: '', 
    email: '', 
    password: '',
    role: 'teacher', 
    phoneNumber: '',
    subject: '',
    salary: 0,
    joiningDate: new Date().toISOString().split('T')[0],
    gender: 'male' as 'male' | 'female',
    status: 'active' as 'active' | 'on_leave' | 'inactive' | 'absent',
    notes: ''
  });

  const reportPrintRef = useRef<HTMLDivElement>(null);

  const handlePrintClick = () => {
    if (!reportPrintRef.current) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }
    const title = 'تقرير حضور الكادر';
    const success = printElement(reportPrintRef.current, title);
    if (!success) {
      toast.error('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة');
    }
  };

  useEffect(() => {
    if (!profile?.schoolId) return;

    try {
      const q = query(
        collection(db, 'users'), 
        where('schoolId', '==', profile.schoolId),
        where('role', 'in', ['admin', 'teacher', 'staff']),
        limit(200)
      );
      const unsub = onSnapshot(q, snap => {
        setStaff(
          snap.docs.map((docSnap) =>
            sanitizeStaffRecord({ id: docSnap.id, ...docSnap.data() }),
          ),
        );
      });
      return () => unsub();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'StaffList:users');
    }
  }, [profile]);

  const handleShareStatus = (member: any) => {
    if (!member.phoneNumber) {
      toast.error('لا يوجد رقم هاتف لهذا الموظف');
      return;
    }

    const statusText = member.status === 'active' ? 'نشط' : 
                      member.status === 'on_leave' ? 'مجاز' : 
                      member.status === 'absent' ? 'غائب' : 'غير نشط';
    
    const message = `تحية طيبة، الأستاذ/ة ${member.name}. تم تسجيل حالتك لهذا اليوم: (${statusText}).\nشكراً لإلتزامكم.\n- إدارة المدرسة`;
    const whatsappUrl = `https://wa.me/${member.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleUpdateStatusQuick = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        status,
        updatedAt: serverTimestamp()
      });
      toast.success('تم تحديث الحالة بنجاح');
    } catch (error) {
      toast.error('فشل في تحديث الحالة');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;

    if (!editingStaff && (!newStaff.password || newStaff.password.length < 6)) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (
      newStaff.role === 'teacher' &&
      newStaff.subject.trim() &&
      newStaff.password.trim() &&
      newStaff.subject.trim() === newStaff.password.trim()
    ) {
      toast.error('لا يمكن أن تكون المادة الدراسية نفس كلمة المرور');
      return;
    }

    setIsSaving(true);
    try {
      if (editingStaff) {
        await setDoc(doc(db, 'users', editingStaff.id), sanitizeUserWritePayload({
          name: newStaff.name,
          phoneNumber: newStaff.phoneNumber,
          role: newStaff.role,
          subject: newStaff.role === 'teacher' ? newStaff.subject.trim() : '',
          salary: Number(newStaff.salary),
          joiningDate: newStaff.joiningDate,
          gender: newStaff.gender,
          status: newStaff.status,
          notes: newStaff.notes,
          password: deleteField(),
          parentPassword: deleteField(),
          teacherPassword: deleteField(),
          plainPassword: deleteField(),
          defaultPassword: deleteField(),
          tempPassword: deleteField(),
          updatedAt: serverTimestamp(),
        }), { merge: true });

        // Update pending payroll if exists for current month
        await updatePendingPayroll(editingStaff.id, Number(newStaff.salary), newStaff.name);

        toast.success('تم تحديث بيانات الموظف والراتب');
      } else {
        const createdPassword = newStaff.password;
        // Use Admin API for real Auth creation (password stays in Auth only)
        await adminCreateUser({
          email: newStaff.email.toLowerCase(),
          password: createdPassword,
          displayName: newStaff.name,
          role: newStaff.role,
          schoolId: profile.schoolId,
          additionalData: {
            phoneNumber: newStaff.phoneNumber,
            subject: newStaff.role === 'teacher' ? newStaff.subject.trim() : '',
            salary: Number(newStaff.salary),
            joiningDate: newStaff.joiningDate,
            gender: newStaff.gender,
            status: newStaff.status,
            notes: newStaff.notes,
          }
        });
        toast.success(
          `تم إنشاء حساب الموظف بنجاح. كلمة المرور (عرض لمرة واحدة): ${createdPassword}`,
          { duration: 12000 },
        );
      }
      setShowModal(false);
      setEditingStaff(null);
      resetNewStaff();
    } catch (error: any) {
      console.error('Error saving staff:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryEditStaff) return;

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', salaryEditStaff.id), {
        salary: Number(newSalary),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Update pending payroll if exists for current month
      await updatePendingPayroll(salaryEditStaff.id, Number(newSalary), salaryEditStaff.name);

      toast.success('تم تحديث الراتب بنجاح');
      setShowSalaryModal(false);
    } catch (error: any) {
      console.error('Error updating salary:', error);
      toast.error('حدث خطأ أثناء تحديث الراتب');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePendingPayroll = async (userId: string, salary: number, name?: string) => {
    if (!profile?.schoolId) return;
    
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      // More robust query: update all pending records for this user across any month/year if they are still pending
      const q = query(
        collection(db, 'payroll'),
        where('schoolId', '==', profile.schoolId),
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log('No pending payroll records found for user:', userId);
        return;
      }

      const updatePromises = snap.docs.map(payrollDoc => {
        const updateData: any = {
          amount: salary,
          updatedAt: serverTimestamp()
        };
        // Only update name if provided and different
        if (name && payrollDoc.data().userName !== name) updateData.userName = name;
        return updateDoc(doc(db, 'payroll', payrollDoc.id), updateData);
      });
      await Promise.all(updatePromises);
      console.log(`Updated ${snap.size} pending payroll records for user ${userId}`);
    } catch (error) {
      console.error('Error updating payroll records:', error);
      // We don't want to block the user if payroll sync fails, but we log it
    }
  };

  const resetNewStaff = () => {
    setNewStaff({ 
      name: '', 
      email: '', 
      password: '', 
      role: 'teacher', 
      phoneNumber: '', 
      subject: '', 
      salary: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      gender: 'male',
      status: 'active',
      notes: ''
    });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      // Use Admin API for real Auth deletion
      await adminDeleteUser(id);
      toast.success('تم حذف الموظف');
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error('Delete staff error:', error);
      toast.error(error.message || 'فشل في حذف الموظف');
    } finally {
      setIsDeleting(false);
    }
  };


  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getTeacherSubjectDisplay(member).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display text-right">الموظفين والمعلمين</h1>
          <p className="text-slate-500 mt-1 text-right">إدارة الكادر التعليمي والإداري للمدرسة</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
             <Printer size={20} />
             تقرير الحضور
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="بحث عن موظف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-right"
              dir="rtl"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <button 
            onClick={() => {
              setEditingStaff(null);
              resetNewStaff();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
          >
             <UserPlus size={20} />
             إضافة موظف
          </button>
        </div>
      </div>

      {/* Attendance Filter Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth px-1" dir="rtl">
        {[
          { id: 'all', label: 'الكل', count: staff.length, color: 'text-slate-600', bg: 'bg-slate-100', activeBg: 'bg-slate-900 text-white' },
          { id: 'active', label: 'نشط', count: staff.filter(s => s.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-500 text-white' },
          { id: 'on_leave', label: 'مجاز', count: staff.filter(s => s.status === 'on_leave').length, color: 'text-amber-600', bg: 'bg-amber-50', activeBg: 'bg-amber-500 text-white' },
          { id: 'absent', label: 'غائب', count: staff.filter(s => s.status === 'absent').length, color: 'text-rose-600', bg: 'bg-rose-50', activeBg: 'bg-rose-500 text-white' }
        ].map((stat) => (
          <button 
            key={stat.id}
            onClick={() => setStatusFilter(stat.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all whitespace-nowrap shrink-0 group ${
              statusFilter === stat.id 
                ? `${stat.activeBg} border-transparent shadow-lg shadow-slate-200 scale-105` 
                : `${stat.bg} ${stat.color} border-transparent hover:border-slate-200`
            }`}
          >
            <span className="text-xs font-black uppercase tracking-widest">{stat.label}</span>
            <span className="text-lg font-black font-mono leading-none">{stat.count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map(member => (
          <motion.div 
            layout
            key={member.id} 
            className="group bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full -translate-y-16 translate-x-16 group-hover:bg-slate-100/50 transition-colors duration-500"></div>
            <div className="flex items-start gap-4 h-full relative z-10 text-right" dir="rtl">
              {/* زر حذف علوي فوري - بارز جداً */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (member.id === profile?.uid) {
                    return toast.error('لا يمكنك حذف حسابك الخاص');
                  }
                  setConfirmDeleteId(member.id);
                }}
                className="absolute top-0 left-0 w-10 h-10 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all z-20 flex items-center justify-center shadow-sm border border-red-100 active:scale-95 group/del"
                title="حذف هذا الموظف فوراً"
              >
                <Trash2 size={18} className="group-hover/del:scale-110 transition-transform" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xl shadow-slate-900/20 min-w-[4rem] group-hover:scale-105 transition-transform duration-500">
                 {member.name?.[0]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-black transition-colors">{member.name}</h3>
                <div className="flex items-center gap-2 mt-1.5 leading-none flex-wrap">
                  <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-full border border-blue-100">
                    <ShieldCheck size={12} className="opacity-80" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {member.role === 'teacher' ? 'معلم' : (member.role === 'admin' ? 'مدير' : 'موظف')}
                    </span>
                  </div>
                  {member.role === 'teacher' && getTeacherSubjectDisplay(member) && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
                      {getTeacherSubjectDisplay(member)}
                    </span>
                  )}
                  {member.status && (
                    <div className="flex gap-1">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        member.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        member.status === 'on_leave' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        member.status === 'absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {member.status === 'active' ? 'نشط' : member.status === 'on_leave' ? 'مجاز' : member.status === 'absent' ? 'غائب' : 'غير نشط'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Status & Actions Row */}
                <div className="flex items-center justify-between mt-4 p-2 bg-slate-50/50 rounded-xl border border-slate-100 no-print">
                   <div className="flex items-center gap-1.5 p-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                      <button 
                        onClick={() => handleUpdateStatusQuick(member.id, 'active')}
                        className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${member.status === 'active' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-emerald-200'}`}
                        title="نشط"
                      >
                        {member.status === 'active' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>
                      <button 
                        onClick={() => handleUpdateStatusQuick(member.id, 'on_leave')}
                        className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${member.status === 'on_leave' ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-200 hover:border-amber-200'}`}
                        title="إجازة"
                      >
                        {member.status === 'on_leave' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>
                      <button 
                        onClick={() => handleUpdateStatusQuick(member.id, 'absent')}
                        className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${member.status === 'absent' ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-200 hover:border-rose-200'}`}
                        title="غائب"
                      >
                        {member.status === 'absent' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </button>
                   </div>

                   <div className="flex items-center gap-1.5">
                     <button 
                       onClick={() => handleShareStatus(member)}
                       className="w-8 h-8 flex items-center justify-center bg-white text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/btn"
                       title="إرسال الحالة للموظف"
                     >
                       <Send size={14} className="group-hover/btn:scale-110 transition-transform" />
                     </button>
                   </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-slate-600 text-sm py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-slate-400" />
                      <span className="text-[11px] font-medium truncate max-w-[120px]">{member.email}</span>
                    </div>
                    {member.joiningDate && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                        {member.joiningDate}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-slate-600 text-sm py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400" />
                      <span className="text-[11px] font-medium">{member.phoneNumber || 'لا يوجد هاتف'}</span>
                    </div>
                    {member.gender && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {member.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </span>
                    )}
                  </div>

                  {member.notes && (
                    <div className="mt-2 p-2.5 bg-indigo-50/30 rounded-xl border border-indigo-100/50 text-[10px] text-slate-500 italic leading-relaxed">
                      "{member.notes}"
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2 text-slate-600 text-sm group/salary">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Lock size={14} />
                      </div>
                      <span className="font-bold text-emerald-700">الراتب: {(member.salary || 0).toLocaleString()} د.ع</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSalaryEditStaff(member);
                        setNewSalary(member.salary || 0);
                        setShowSalaryModal(true);
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-all flex items-center gap-1"
                    >
                      تعديل
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3 relative z-10">
              <button 
                onClick={() => {
                  setEditingStaff(member);
                  setNewStaff({
                    name: member.name,
                    email: member.email,
                    password: '',
                    role: member.role || 'teacher',
                    phoneNumber: member.phoneNumber || '',
                    subject: getTeacherSubjectDisplay(member) || '',
                    salary: member.salary || 0,
                    joiningDate: member.joiningDate || new Date().toISOString().split('T')[0],
                    gender: member.gender || 'male',
                    status: member.status || 'active',
                    notes: member.notes || ''
                  });
                  setShowModal(true);
                }}
                className="flex-[2] py-3 text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl transition-all border border-slate-200 shadow-sm active:scale-95 flex items-center justify-center gap-2"
                dir="rtl"
              >
                <Save size={16} className="opacity-70" />
                تعديل البيانات
              </button>
              <button 
                onClick={() => {
                  if (member.id === profile?.uid) {
                    toast.error('لا يمكنك حذف حسابك الخاص من هنا');
                    return;
                  }
                  setConfirmDeleteId(member.id);
                }}
                className="flex-1 px-4 py-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-100 active:scale-95 flex items-center justify-center gap-2 border border-red-500/20"
                dir="rtl"
              >
                <Trash2 size={14} />
                حذف الموظف
              </button>
            </div>
          </motion.div>
        ))}
        {staff.length === 0 && (
           <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 w-full">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <UserPlus size={32} className="opacity-20" />
             </div>
             <p className="font-medium">لا يوجد موظفين مسجلين حالياً</p>
           </div>
        )}
      </div>

      <AnimatePresence>
        {showSalaryModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-[70] flex items-center justify-center p-4 backdrop-blur-md" dir="rtl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative border border-slate-200"
            >
              <h2 className="text-xl font-bold mb-2 text-slate-900">تعديل راتب الموظف</h2>
              <p className="text-slate-500 text-sm mb-6">{salaryEditStaff?.name}</p>
              
              <form onSubmit={handleUpdateSalary} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">الراتب الجديد (د.ع)</label>
                  <input
                    required
                    autoFocus
                    type="number"
                    value={Number.isNaN(newSalary) ? '' : newSalary}
                    onChange={e => {
                      const val = e.target.value;
                      setNewSalary(val === '' ? 0 : Number(val) || 0);
                    }}
                    className="w-full px-4 py-4 rounded-xl border-2 border-emerald-100 outline-none focus:border-emerald-500 transition-all font-black text-2xl text-emerald-700 text-center"
                    placeholder="مثال: 500000"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {isSaving ? 'جاري الحفظ...' : 'تحديث الراتب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSalaryModal(false)}
                    className="px-6 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md" dir="rtl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl relative border border-slate-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-8 pb-4 shrink-0">
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  {editingStaff ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                </h2>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-8 py-2 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">الاسم الكامل</label>
                    <input
                      required
                      type="text"
                      value={newStaff.name}
                      onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900"
                      placeholder="اسم الموظف الثلاثي..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">البريد الإلكتروني</label>
                    <input
                      required
                      type="email"
                      disabled={!!editingStaff}
                      value={newStaff.email}
                      onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900 disabled:bg-slate-50"
                      placeholder="email@school.com"
                    />
                  </div>
                  
                  {!editingStaff && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">كلمة المرور</label>
                      <div className="relative">
                        <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          required
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={newStaff.password}
                          onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                          className="w-full pr-12 pl-12 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10 flex items-center justify-center p-1"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">رقم الهاتف</label>
                    <input
                      type="tel"
                      value={newStaff.phoneNumber}
                      onChange={e => setNewStaff({ ...newStaff, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900"
                      placeholder="07XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">الصلاحية</label>
                    <select
                      value={newStaff.role}
                      onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900 bg-white"
                    >
                      <option value="teacher">معلم / مدرس</option>
                      <option value="admin">إداري</option>
                      <option value="staff">موظف إداري</option>
                    </select>
                  </div>

                  {newStaff.role === 'teacher' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">المادة الدراسية</label>
                      <input
                        required
                        type="text"
                        autoComplete="off"
                        name="teacher-subject"
                        value={newStaff.subject}
                        onChange={e => setNewStaff({ ...newStaff, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900"
                        placeholder="لغة عربية، علوم، رياضيات..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">الراتب الشهري (د.ع)</label>
                    <input
                      required
                      type="number"
                      value={Number.isNaN(newStaff.salary) ? '' : newStaff.salary}
                      onChange={e => {
                        const val = e.target.value;
                        setNewStaff({ ...newStaff, salary: val === '' ? 0 : Number(val) || 0 });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900"
                      placeholder="مثال: 500000"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">تاريخ التعيين</label>
                      <input
                        type="date"
                        value={newStaff.joiningDate}
                        onChange={e => setNewStaff({ ...newStaff, joiningDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">الجنس</label>
                      <select
                        value={newStaff.gender}
                        onChange={e => setNewStaff({ ...newStaff, gender: e.target.value as any })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900 bg-white"
                      >
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">حالة الموظف</label>
                    <select
                      value={newStaff.status}
                      onChange={e => setNewStaff({ ...newStaff, status: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900 bg-white"
                    >
                      <option value="active">نشط</option>
                      <option value="on_leave">في إجازة</option>
                      <option value="absent">غائب</option>
                      <option value="inactive">غير نشط</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">ملاحظات إدارية</label>
                    <textarea
                      value={newStaff.notes}
                      onChange={e => setNewStaff({ ...newStaff, notes: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-slate-900 min-h-[80px]"
                      placeholder="أضف أي ملاحظات إدارية هنا..."
                    />
                  </div>
                </div>

                <div className="p-8 pt-4 bg-slate-50/50 shrink-0 border-t border-slate-100 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 min-w-[120px] py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {isSaving ? 'جاري الحفظ...' : 'حفظ البيانات'}
                  </button>
                  {editingStaff && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setConfirmDeleteId(editingStaff.id);
                      }}
                      className="px-6 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      حذف
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingStaff(null);
                      setNewStaff({ name: '', email: '', password: '', role: 'teacher', phoneNumber: '', subject: '' });
                      resetNewStaff();
                    }}
                    className="px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-100 transition-all"
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
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-slate-200 text-right"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 font-display">تأكيد حذف الموظف</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                هل أنت متأكد من حذف حساب الموظف <span className="font-bold text-slate-900">{staff.find(s => s.id === confirmDeleteId)?.name}</span>؟ 
                <span className="block mt-2 text-red-500 font-bold text-xs text-right">سيتم فقدان صلاحية الوصول لهذا الحساب فوراً.</span>
              </p>
              
              <div className="flex flex-row-reverse gap-4">
                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف السجل'}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 no-print">
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-slate-900 font-display">تقرير حضور الكادر</h2>
                  <p className="text-slate-500 text-sm">بيانات الحالة اليومية لجميع الموظفين</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handlePrintClick}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
                  >
                    <Printer size={18} />
                    طباعة التقرير
                  </button>
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div ref={reportPrintRef} className="flex-1 overflow-y-auto p-8 bg-white" id="report-content" dir="rtl">
                <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-6">
                  <h1 className="text-3xl font-black mb-2">تقرير حضور كادر المدرسة</h1>
                  <p className="text-xl font-bold text-slate-600 font-mono tracking-tighter">التاريخ: {new Date().toLocaleDateString('ar-IQ')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <table className="w-full text-right" dir="rtl">
                    <thead>
                      <tr className="border-b-2 border-slate-100">
                        <th className="py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4">الموظف</th>
                        <th className="py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4">الصلاحية</th>
                        <th className="py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4">الحالة</th>
                        <th className="py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest px-4">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-4 px-4 font-bold text-slate-900">{m.name}</td>
                          <td className="py-4 px-4 text-sm text-slate-500">
                            {m.role === 'teacher' ? 'معلم' : (m.role === 'admin' ? 'مدير' : 'موظف')}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                              m.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              m.status === 'on_leave' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              m.status === 'absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                              {m.status === 'active' ? 'نشط' : m.status === 'on_leave' ? 'مجاز' : m.status === 'absent' ? 'غائب' : 'غير نشط'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-400 italic leading-relaxed max-w-xs">
                            {m.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-24 hidden print:grid grid-cols-2 gap-8 pt-12 border-t border-slate-100">
                  <div className="text-center">
                    <p className="font-bold text-slate-400 mb-12">توقيع مسؤول الحضور</p>
                    <div className="w-48 h-px bg-slate-300 mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-400 mb-12">ختم إدارة المدرسة</p>
                    <div className="w-48 h-px bg-slate-300 mx-auto"></div>
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

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, serverTimestamp, setDoc, doc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { UserPlus, Trash2, Save, X, Search, Lock, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { adminCreateUser, adminDeleteUser } from '../../lib/adminApi';
import { UserRole } from '../../types';
import { getStaffPermissionOptions } from '../../lib/featureRegistry';
import { canAssignStaffPermission } from '../../lib/staffPermissions';
import { AppModalPortal } from '../../components/AppModalPortal';

export default function AssistantsManagement() {
  const { profile, schoolData } = useAuth();
  const permissionOptions = React.useMemo(
    () => getStaffPermissionOptions(schoolData?.packagePermissions, true),
    [schoolData?.packagePermissions],
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    permissions: [] as string[],
    salary: '' as string | number
  });

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;

    const fetchAssistants = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('schoolId', '==', profile.schoolId),
          where('role', 'in', [UserRole.SCHOOL_ASSISTANT, UserRole.ASSISTANT]),
          limit(100)
        );
        const snap = await getDocs(q);
        if (!isMounted) return;
        setAssistants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'AssistantsManagement:users');
      }
    };
    
    fetchAssistants();
    return () => { isMounted = false; };
  }, [profile]);

  const togglePermission = (permId: string) => {
    setFormData((prev) => {
      if (prev.permissions.includes(permId)) {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => p !== permId),
        };
      }
      if (!canAssignStaffPermission(permId, schoolData?.packagePermissions)) {
        toast.error('هذه الصلاحية غير متاحة في باقة المدرسة');
        return prev;
      }
      return { ...prev, permissions: [...prev.permissions, permId] };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;

    if (!editingAssistant && (!formData.password || formData.password.length < 6)) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (!editingAssistant && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }

    const resolvedPermissions = formData.permissions.filter((p) =>
      canAssignStaffPermission(p, schoolData?.packagePermissions),
    );

    setIsSaving(true);
    try {
      if (editingAssistant) {
        await updateDoc(doc(db, 'users', editingAssistant.id), {
          name: formData.name,
          permissions: resolvedPermissions,
          salary: Number(formData.salary) || 0,
          updatedAt: serverTimestamp(),
        });
        toast.success('تم تحديث بيانات المساعد');
      } else {
        await adminCreateUser({
          email: formData.email.toLowerCase(),
          password: formData.password,
          displayName: formData.name,
          role: UserRole.SCHOOL_ASSISTANT,
          schoolId: profile.schoolId,
          additionalData: {
            assistantType: 'school',
            permissions: resolvedPermissions,
            salary: Number(formData.salary) || 0,
            status: 'active'
          }
        });
        toast.success('تم إنشاء حساب المساعد بنجاح');
      }
      setShowModal(false);
      setEditingAssistant(null);
      resetForm();
    } catch (error: any) {
      console.error('Error saving assistant:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await adminDeleteUser(id);
      toast.success('تم حذف المساعد');
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error('Delete assistant error:', error);
      toast.error(error.message || 'فشل في حذف المساعد');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      permissions: [],
      salary: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const filteredAssistants = assistants.filter(a => 
    a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h1 className="text-3xl font-bold text-slate-900 font-display">إدارة المساعدين</h1>
          <p className="text-slate-500 mt-1">تنسيب مساعدين وتخصيص صلاحياتهم لإدارة أقسام محددة</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="بحث عن مساعد..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition-all text-right"
              dir="rtl"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <button 
            onClick={() => {
              resetForm();
              setEditingAssistant(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
          >
             <UserPlus size={20} />
             إضافة مساعد جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssistants.map(assistant => (
          <motion.div 
            layout
            key={assistant.id} 
            className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all"
          >
            <div className="flex items-start gap-4 text-right">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                 {assistant.name?.[0]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-lg">{assistant.name}</h3>
                <p className="text-xs text-slate-500 font-medium mb-1">{assistant.email}</p>
                {assistant.salary > 0 && (
                  <p className="text-xs font-bold text-emerald-600 mb-3">الراتب: {assistant.salary.toLocaleString()} د.ع</p>
                )}
                
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {assistant.permissions?.map((pId: string) => (
                    <span key={pId} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md border border-indigo-100">
                      {permissionOptions.find((opt) => opt.id === pId)?.label || pId}
                    </span>
                  ))}
                  {(!assistant.permissions || assistant.permissions.length === 0) && (
                    <span className="text-[10px] text-slate-400 italic">لا توجد صلاحيات مخصصة</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  setEditingAssistant(assistant);
                  setFormData({
                    name: assistant.name || '',
                    email: assistant.email || '',
                    password: '',
                    permissions: assistant.permissions || [],
                    salary: assistant.salary || ''
                  });
                  setShowModal(true);
                }}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm active:scale-95"
              >
                تعديل الصلاحيات
              </button>
              <button 
                onClick={() => setConfirmDeleteId(assistant.id)}
                className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 border border-rose-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AppModalPortal
        open={showModal}
        onClose={() => setShowModal(false)}
        dir="rtl"
        size="lg"
        ariaLabel={editingAssistant ? 'تعديل صلاحيات المساعد' : 'إضافة مساعد جديد'}
      >
        <div className="sx-app-modal-panel__header">
          <div>
            <h2 className="sx-app-modal-panel__title">
              {editingAssistant ? 'تعديل صلاحيات المساعد' : 'إضافة مساعد جديد'}
            </h2>
            <p className="sx-app-modal-panel__subtitle">
              خصص البيانات والصلاحيات — القائمة قابلة للتمرير بالكامل
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="sx-app-modal-panel__close"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="sx-app-modal-panel__body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم المساعد</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 transition-all font-bold min-h-11"
                    placeholder="الاسم الكامل..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">البريد الإلكتروني</label>
                  <input
                    required
                    type="email"
                    disabled={!!editingAssistant}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 transition-all font-bold disabled:bg-slate-50 min-h-11"
                    placeholder="assistant@school.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الراتب الشهري (د.ع)</label>
                  <input
                    type="number"
                    value={Number.isNaN(formData.salary) ? '' : formData.salary}
                    onChange={e => setFormData({ ...formData, salary: e.target.value === '' ? 0 : Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 transition-all font-bold min-h-11"
                    placeholder="0"
                  />
                </div>
                {!editingAssistant && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">كلمة المرور</label>
                    <div className="relative">
                      <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pr-12 pl-12 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 transition-all font-bold min-h-11"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10 flex items-center justify-center p-1 min-w-10 min-h-10"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
                {!editingAssistant && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">تأكيد كلمة المرور (اختياري)</label>
                    <div className="relative">
                      <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pr-12 pl-12 py-3 rounded-xl border border-slate-200 outline-none focus:border-slate-400 transition-all font-bold min-h-11"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer z-10 flex items-center justify-center p-1 min-w-10 min-h-10"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col min-h-0">
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  الصلاحيات المتاحة (اختر الأقسام)
                </label>
                <div className="sx-selection-panel" role="listbox" aria-multiselectable="true">
                  {permissionOptions.map((opt) => {
                    const selected = formData.permissions.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => togglePermission(opt.id)}
                        className={`sx-selection-panel__option${selected ? ' is-selected' : ''}`}
                      >
                        {selected ? <CheckSquare size={18} /> : <Square size={18} className="opacity-40" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="sx-app-modal-panel__footer flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 bg-[#0b1f3a] text-white rounded-xl font-bold hover:bg-[#122a4a] transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 min-h-12"
            >
              <Save size={18} />
              {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات المساعد'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all active:scale-[0.99] min-h-12"
            >
              إلغاء
            </button>
          </div>
        </form>
      </AppModalPortal>

      <AppModalPortal
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        dir="rtl"
        size="sm"
        ariaLabel="تأكيد حذف المساعد"
      >
        <div className="sx-app-modal-panel__body text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <Trash2 size={32} />
          </div>
          <h2 className="sx-app-modal-panel__title">تأكيد حذف المساعد</h2>
          <p className="text-slate-500 text-sm font-bold">
            هل أنت متأكد من حذف حساب المساعد؟ سيتم فقدان صلاحية الوصول لهذا الحساب فوراً.
          </p>
        </div>
        <div className="sx-app-modal-panel__footer flex gap-4">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 min-h-12"
          >
            {isDeleting ? 'جاري الحذف...' : 'نعم، احذف الحساب'}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setConfirmDeleteId(null)}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 min-h-12"
          >
            تراجع
          </button>
        </div>
      </AppModalPortal>
    </div>
  );
}

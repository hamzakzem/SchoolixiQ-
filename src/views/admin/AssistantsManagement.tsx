import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, serverTimestamp, doc, updateDoc, onSnapshot, limit } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { UserPlus, ShieldCheck, Trash2, Save, X, Search, Lock, CheckSquare, Square } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { adminCreateUser, adminDeleteUser } from '../../lib/adminApi';
import { UserRole } from '../../types';
import { useMobileMockupShell } from '../../lib/useMobileMockupShell';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

const PERMISSION_OPTIONS = [
  { id: 'classes', label: 'إدارة الصفوف' },
  { id: 'students', label: 'إدارة الطلاب' },
  { id: 'parents', label: 'حسابات أولياء الأمور' },
  { id: 'staff', label: 'الموظفين والمعلمين' },
  { id: 'tuition', label: 'أقساط الطلاب' },
  { id: 'behavior', label: 'السلوك والتبليغات' },
  { id: 'attendance', label: 'الحضور والغياب' },
  { id: 'grades', label: 'النتائج والدرجات' },
  { id: 'announcements', label: 'الإعلانات والتعليمات' },
  { id: 'payroll', label: 'الرواتب والمالية' },
  { id: 'inventory', label: 'مخزن المدرسة' },
  { id: 'market', label: 'المتجر الداخلي' },
  { id: 'settings', label: 'الإعدادات العامة' },
];

export default function AssistantsManagement() {
  const { profile } = useAuth();
  const inApp = useMobileMockupShell();
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
    permissions: [] as string[],
    salary: '' as string | number
  });

  useEffect(() => {
    if (!profile?.schoolId) return;
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', profile.schoolId),
      where('role', '==', UserRole.ASSISTANT),
      limit(100),
    );
    return onSnapshot(
      q,
      (snap) => setAssistants(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, 'AssistantsManagement:users'),
    );
  }, [profile?.schoolId]);

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;

    if (!editingAssistant && (!formData.password || formData.password.length < 6)) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAssistant) {
        await updateDoc(doc(db, 'users', editingAssistant.id), {
          name: formData.name,
          permissions: formData.permissions,
          salary: Number(formData.salary) || 0,
          updatedAt: serverTimestamp(),
        });
        toast.success('تم تحديث بيانات المساعد');
      } else {
        await adminCreateUser({
          email: formData.email.toLowerCase(),
          password: formData.password,
          displayName: formData.name,
          role: UserRole.ASSISTANT,
          schoolId: profile.schoolId,
          additionalData: {
            permissions: formData.permissions,
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
      setAssistants((prev) => prev.filter((a) => a.id !== id));
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
      permissions: [],
      salary: ''
    });
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
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0B2345] text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
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
              <div className="w-16 h-16 rounded-2xl bg-[#0B2345] text-white flex items-center justify-center font-bold text-xl shadow-lg">
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
                    <span key={pId} className="px-2 py-0.5 bg-indigo-50 text-[#0B2345] text-[10px] font-bold rounded-md border border-indigo-100">
                      {PERMISSION_OPTIONS.find(opt => opt.id === pId)?.label || pId}
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

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingAssistant ? 'تعديل صلاحيات المساعد' : 'إضافة مساعد جديد'}
        icon={<ShieldCheck size={22} className="text-[#0B2345]" />}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <Button type="submit" form="assistant-form" fullWidth disabled={isSaving}>
              {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات المساعد'}
            </Button>
            <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <form id="assistant-form" onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم المساعد</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">البريد الإلكتروني</label>
            <input
              required
              type="email"
              disabled={!!editingAssistant}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">الراتب الشهري (د.ع)</label>
            <input
              type="number"
              value={Number.isNaN(formData.salary) ? '' : formData.salary}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salary: e.target.value === '' ? 0 : Number(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
            />
          </div>
          {!editingAssistant && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">كلمة المرور</label>
              <input
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">الصلاحيات</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {PERMISSION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => togglePermission(opt.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border ${
                    formData.permissions.includes(opt.id)
                      ? 'bg-[#0B2345] text-white border-transparent'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {formData.permissions.includes(opt.id) ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} className="opacity-40" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <AnimatePresence>
        {confirmDeleteId && (
          <div className={`fixed inset-0 bg-slate-900/60 z-[110] flex justify-center p-4 backdrop-blur-sm ${inApp ? 'items-end pt-[72px] pb-[84px]' : 'items-center'}`} dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center font-display">تأكيد حذف المساعد</h2>
              <p className="text-slate-500 text-center mb-8">
                هل أنت متأكد من حذف حساب المساعد؟ سيتم فقدان صلاحية الوصول لهذا الحساب فوراً.
              </p>
              
              <div className="flex gap-4">
                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف الحساب'}
                </button>
                <button
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
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

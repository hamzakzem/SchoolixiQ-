import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { Package, AlertCircle, Plus, Trash2, Edit2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../../lib/firebase';

export default function Inventory() {
  const { profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({ itemName: '', category: '', quantity: 0, status: 'جديد' });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId || !auth.currentUser) return;

    const fetchInventory = async () => {
      try {
        const q = query(
          collection(db, 'inventory'), 
          where('schoolId', '==', profile.schoolId),
          limit(200)
        );
        const snap = await getDocs(q);
        if (!isMounted) return;
        setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'inventory');
      }
    };

    fetchInventory();
    return () => { isMounted = false; };
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('تم التحديث بنجاح');
      } else {
        await addDoc(collection(db, 'inventory'), {
          ...formData,
          schoolId: profile.schoolId,
          createdAt: serverTimestamp()
        });
        toast.success('تمت الإضافة بنجاح');
      }
      closeModal();
    } catch (error) {
      console.error('Inventory Save Error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'inventory');
      toast.error('حدث خطأ ما');
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'inventory', showDeleteConfirm));
      toast.success('تم الحذف بنجاح');
      setShowDeleteConfirm(null);
      if (editingItem?.id === showDeleteConfirm) closeModal();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inventory');
      toast.error('خطأ في الحذف');
    }
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ 
      itemName: item.itemName, 
      category: item.category, 
      quantity: item.quantity,
      status: item.status || 'جديد'
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData({ itemName: '', category: '', quantity: 0, status: 'جديد' });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">مخزن المدرسة والأصول</h1>
          <p className="text-slate-500 mt-1">تتبع الأثاث، الأجهزة، والكتب المدرسية</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <Plus size={20} />
          إضافة مادة
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm lg:col-span-2">
           <h3 className="text-xl font-bold text-slate-800 mb-6 font-display">قائمة المواد</h3>
           <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[500px]">
                 <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200">
                    <tr>
                       <th className="p-4">اسم المادة</th>
                       <th className="p-4">الفئة</th>
                       <th className="p-4">الكمية</th>
                       <th className="p-4">الحالة</th>
                       <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {items.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 font-bold text-slate-900">{item.itemName}</td>
                          <td className="p-4 text-slate-600 text-sm">{item.category}</td>
                          <td className="p-4 font-mono text-slate-700">{item.quantity}</td>
                          <td className="p-4">
                             <div className="flex flex-col gap-1">
                               <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                 item.status === 'تالف' ? 'bg-red-50 text-red-700 border-red-100' :
                                 item.status === 'بحاجة لصيانة' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                 item.status === 'مستعمل' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                 'bg-emerald-50 text-emerald-700 border-emerald-100'
                               }`}>
                                 {item.status || 'جديد'}
                               </span>
                               {item.quantity < 5 && (
                                 <span className="text-[9px] text-red-500 font-bold flex items-center justify-center gap-0.5">
                                   <AlertCircle size={8} /> مخزون منخفض
                                 </span>
                               )}
                             </div>
                          </td>
                          <td className="p-4 text-center">
                             <div className="flex items-center justify-center gap-1">
                               <button 
                                 onClick={() => openEdit(item)} 
                                 className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                 title="تعديل"
                               >
                                 <Edit2 size={16} />
                               </button>
                               <button 
                                 onClick={() => setShowDeleteConfirm(item.id)} 
                                 className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                 title="حذف"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                          </td>
                       </tr>
                    ))}
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic font-medium">لا توجد مواد مسجلة في المخزن</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[2rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden group">
           <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Package size={32} strokeWidth={1.5} className="text-slate-300" />
              </div>
              <h2 className="text-3xl font-bold mb-4 font-display leading-tight">إحصائيات المخزن</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">إجمالي المواد</span>
                  <span className="font-bold">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">مواد قاربت على النفاذ</span>
                  <span className="font-bold text-red-400">{items.filter(i => i.quantity < 5).length}</span>
                </div>
              </div>
           </div>
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform"></div>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-10 shadow-2xl relative border border-slate-200"
            >
              <button 
                onClick={closeModal}
                className="absolute top-6 left-6 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-8 font-display">
                {editingItem ? 'تعديل مادة' : 'إضافة مادة للمخزن'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">اسم المادة</label>
                  <input
                    required
                    type="text"
                    value={formData.itemName}
                    onChange={e => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">الفئة</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all font-bold appearance-none"
                  >
                    <option value="">اختر الفئة</option>
                    <option value="قرطاسية">قرطاسية</option>
                    <option value="أثاث">أثاث</option>
                    <option value="أجهزة إلكترونية">أجهزة إلكترونية</option>
                    <option value="مختبر">مختبر</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">الكمية</label>
                    <input
                      required
                      type="number"
                      value={Number.isNaN(formData.quantity) ? '' : formData.quantity}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData({ ...formData, quantity: val === '' ? 0 : Number(val) || 0 });
                      }}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">الحالة</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all font-bold appearance-none"
                    >
                      <option value="جديد">جديد</option>
                      <option value="مستعمل">مستعمل</option>
                      <option value="بحاجة لصيانة">بحاجة لصيانة</option>
                      <option value="تالف">تالف</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95">
                    {editingItem ? 'تحديث البيانات' : 'حفظ المادة'}
                  </button>
                  {editingItem && (
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(editingItem.id)}
                      className="px-4 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95"
                      title="حذف المادة"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">تأكيد الحذف</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                هل أنت متأكد من حذف هذه المادة من المخزن؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                 <button 
                   onClick={confirmDelete}
                   className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
                 >
                   حذف نهائي
                 </button>
                 <button 
                   onClick={() => setShowDeleteConfirm(null)}
                   className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                 >
                   إلغاء
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

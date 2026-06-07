import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, addDoc, deleteDoc, doc, updateDoc, getDoc, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { Plus, ShoppingBag, Trash2, Camera, Image as ImageIcon, X, Loader2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { notificationService } from '../../lib/notificationService';
import { useLanguage } from '../../lib/LanguageContext';
import { useSystemConfig } from '../../lib/SystemConfigContext';
import {
  STORE_COLLECTION,
  LEGACY_STORE_COLLECTION,
  buildStoreProductCreatePayload,
  getProductImageUrl,
  getProductName,
  getProductStock,
  isPersistableImageUrl,
  subscribeSchoolStoreProducts,
  uploadStoreProductImage,
  MAX_STORE_IMAGE_BYTES,
} from '../../lib/storeProducts';

export default function Marketplace() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const { config } = useSystemConfig();
  const [items, setItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ itemName: '', price: 0, description: '', stock: 0, imageUrl: '' });

  useEffect(() => {
    if (!profile?.schoolId) return;

    const unsubProducts = subscribeSchoolStoreProducts(
      profile.schoolId,
      (products) => setItems(products),
      {
        includeInactive: true,
        onError: (error) => handleFirestoreError(error, OperationType.LIST, STORE_COLLECTION),
      },
    );

    const ordersQ = query(
      collection(db, 'orders'),
      where('schoolId', '==', profile.schoolId),
      limit(200),
    );
    const unsubOrders = onSnapshot(
      ordersQ,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders'),
    );

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, [profile?.schoolId]);

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) {
      try {
        setUploading(true); // Reuse uploading state for deletion loading if needed, or just perform logic
        try {
          await deleteDoc(doc(db, STORE_COLLECTION, id));
        } catch {
          await deleteDoc(doc(db, LEGACY_STORE_COLLECTION, id));
        }
        toast.success('تم حذف المنتج بنجاح');
        setDeletingId(null);
      } catch (error) {
        toast.error('حدث خطأ أثناء الحذف');
      } finally {
        setUploading(false);
      }
    } else {
      setDeletingId(id);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => setDeletingId(prev => prev === id ? null : prev), 3000);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'completed' | 'cancelled') => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        toast.error('الطلب غير موجود');
        return;
      }
      
      const orderData = orderDoc.data();
      
      // If completed, decrement stock
      if (status === 'completed') {
        const orderItems = orderData.items || [];
        for (const item of orderItems) {
          if (item.id) {
            const itemRef = doc(db, STORE_COLLECTION, item.id);
            const itemSnap = await getDoc(itemRef);
            if (itemSnap.exists()) {
              const currentStock = itemSnap.data().stock || 0;
              const quantity = item.quantity || 1;
              await updateDoc(itemRef, {
                stock: Math.max(0, currentStock - quantity)
              });
            }
          }
        }
      }

      await updateDoc(orderRef, { status });
      
      // Send notification
      if (orderData.parentId) {
        const itemName = orderData.items?.[0]?.name || 'منتج';
        await notificationService.send({
          userId: orderData.parentId,
          schoolId: profile.schoolId,
          title: status === 'completed' ? 'تم تأكيد طلبك' : 'تم إلغاء الطلب',
          message: status === 'completed' 
            ? `تم تأكيد استلام طلبك (${itemName}) بنجاح.` 
            : `نعتذر، لقد تم إلغاء طلبك لـ (${itemName}). يرجى مراجعة الإدارة.`,
          type: 'payment',
          metadata: { orderId, status }
        });
      }

      toast.success(status === 'completed' ? 'تم تأكيد الطلب بنجاح' : 'تم إلغاء الطلب');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('فشل في تحديث حالة الطلب');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (deletingOrderId === orderId) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        toast.success('تم حذف الطلب بنجاح');
        setDeletingOrderId(null);
      } catch (error) {
        toast.error('فشل في حذف الطلب');
      }
    } else {
      setDeletingOrderId(orderId);
      setTimeout(() => setDeletingOrderId(prev => prev === orderId ? null : prev), 3000);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !profile?.uid) return;

    if (uploading) {
      toast.error(isRtl ? 'يرجى انتظار اكتمال رفع الصورة' : 'Please wait for the image upload to finish');
      return;
    }

    if (!newItem.itemName.trim()) {
      toast.error(isRtl ? 'يرجى إدخال اسم المنتج' : 'Please enter a product name');
      return;
    }

    if (!isPersistableImageUrl(newItem.imageUrl)) {
      toast.error(isRtl ? 'رابط الصورة غير صالح. يرجى رفع الصورة أو إدخال رابط صحيح' : 'Invalid image URL. Upload an image or enter a valid link');
      return;
    }

    try {
      await addDoc(
        collection(db, STORE_COLLECTION),
        buildStoreProductCreatePayload(newItem, {
          uid: profile.uid,
          schoolId: profile.schoolId,
        }),
      );
      toast.success('تمت إضافة المنتج بنجاح');
      setShowAddModal(false);
      setNewItem({ itemName: '', price: 0, description: '', stock: 0, imageUrl: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, STORE_COLLECTION);
      toast.error('خطأ في الإضافة');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.schoolId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صحيح');
      return;
    }

    if (file.size > MAX_STORE_IMAGE_BYTES) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }

    setUploading(true);
    try {
      const url = await uploadStoreProductImage(file, profile.schoolId);
      setNewItem((prev) => ({ ...prev, imageUrl: url }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading image:', error);
      const code = error instanceof Error ? error.message : '';
      if (code === 'INVALID_IMAGE_TYPE') {
        toast.error('يرجى اختيار ملف صورة صحيح');
      } else if (code === 'FILE_TOO_LARGE') {
        toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      } else {
        toast.error('فشل رفع الصورة. تحقق من الاتصال والصلاحيات');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">المتجر المدرسي (الإعلانات)</h1>
          <p className="text-slate-500 mt-1">بيوعات القرطاسية، المناهج والزي الموحد</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <Plus size={20} />
          إضافة منتج
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map(item => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition-all group relative">
            <div className="absolute top-2 left-2 z-20 flex gap-2">
              {deletingId === item.id ? (
                <div className="flex flex-col gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                    className="px-2 py-1 bg-white text-slate-600 hover:bg-slate-50 rounded-lg shadow-md border border-slate-200 text-[8px] font-bold"
                  >
                    إلغاء
                  </button>
                  <button 
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md text-[8px] font-bold"
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeletingId(item.id); }}
                  className="p-1.5 md:p-2 bg-white/90 backdrop-blur-sm text-slate-400 hover:text-red-500 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-slate-100"
                  title="حذف المنتج"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="aspect-square bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-slate-100 transition-colors relative overflow-hidden">
               {getProductImageUrl(item) ? (
                 <img 
                   src={getProductImageUrl(item) || undefined} 
                   alt={getProductName(item)} 
                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                   referrerPolicy="no-referrer"
                 />
               ) : (
                 <ShoppingBag size={32} strokeWidth={1.5} />
               )}
            </div>
            <div className="p-3 md:p-5 flex-1 flex flex-col justify-between">
               <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-lg line-clamp-1">{getProductName(item)}</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 mt-1 line-clamp-1 md:line-clamp-2 md:leading-relaxed">{item.description}</p>
               </div>
               <div className="mt-3 md:mt-5 flex flex-col md:flex-row md:items-center justify-between gap-1">
                 <span className="text-indigo-600 font-bold text-sm md:text-lg">{item.price.toLocaleString()} د.ع</span>
                 <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 w-fit">متبقي: {getProductStock(item)}</span>
               </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
           <div className="col-span-full py-16 md:py-24 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
             <ShoppingBag size={40} className="opacity-20 mb-3" />
             <p className="font-medium text-sm">لا توجد منتجات معروضة حالياً</p>
           </div>
        )}
      </div>

      <div className="space-y-4 md:space-y-5">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display">أحدث الطلبات</h2>
        
        {/* Desktop View Table */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
           <table className="w-full text-right min-w-[600px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800">
                 <tr>
                    <th className="p-4">المنتج</th>
                    <th className="p-4">ولي الأمر</th>
                    <th className="p-4">الطالب</th>
                    <th className="p-4">السعر</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4 text-center">الإجراءات</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.map(order => (
                    <tr key={order.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <td className="p-4 font-bold text-slate-900 dark:text-white">{order.items?.[0]?.name || 'منتج'}</td>
                       <td className="p-4 text-slate-600 dark:text-slate-400">{order.parentName || '--'}</td>
                       <td className="p-4 text-slate-600 dark:text-slate-400">{order.studentName || '--'}</td>
                       <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{order.total?.toLocaleString()} د.ع</td>
                       <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap transition-all duration-300 ${
                            order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100/50' :
                            order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                          }`}>
                            {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                          </span>
                       </td>
                       <td className="p-4">
                          <div className="flex items-center gap-1 justify-center">
                            {order.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                  title="تأكيد الاستلام"
                                >
                                  <Check size={18} />
                                </button>
                                <button 
                                  onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                  title="إلغاء الطلب"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            )}
                            {deletingOrderId === order.id ? (
                              <button 
                                onClick={() => handleDeleteOrder(order.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-red-700 transition-all active:scale-95"
                              >
                                تأكيد الحذف
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-95"
                                title="حذف السجل"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                       </td>
                    </tr>
                  ))}
                 {orders.length === 0 && (
                   <tr><td colSpan={6} className="p-16 text-center text-slate-400 italic font-medium">لا توجد طلبات حالياً</td></tr>
                 )}
              </tbody>
           </table>
        </div>

        {/* Mobile View List */}
        <div className="md:hidden space-y-3">
           {orders.map(order => (
             <div key={order.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                   <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{order.items?.[0]?.name || 'منتج'}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">#{order.id.slice(0,8)}</p>
                   </div>
                   <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border transition-all duration-300 ${
                     order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                     order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                     'bg-amber-50 text-amber-700 border-amber-100'
                   }`}>
                     {order.status === 'completed' ? 'مكتمل' : order.status === 'cancelled' ? 'ملغي' : 'قيد الانتظار'}
                   </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                   <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                      <p className="text-slate-400 mb-0.5 text-right">ولي الأمر</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300 truncate text-right">{order.parentName || '--'}</p>
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                      <p className="text-slate-400 mb-0.5 text-right">الطالب</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300 truncate text-right">{order.studentName || '--'}</p>
                   </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                   <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{order.total?.toLocaleString()} د.ع</span>
                   <div className="flex items-center gap-1">
                      {order.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="p-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg transition-all active:scale-95"
                          >
                             <Check size={14} />
                          </button>
                          <button 
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg transition-all active:scale-95"
                          >
                             <X size={14} />
                          </button>
                        </>
                      )}
                      {deletingOrderId === order.id ? (
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg text-[8px] font-bold shadow-sm"
                        >
                          حذف
                        </button>
                      ) : (
                        <button 
                          onClick={() => setDeletingOrderId(order.id)}
                          className="p-2 text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg transition-all active:scale-95"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                   </div>
                </div>
             </div>
           ))}
           {orders.length === 0 && (
             <div className="py-12 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-700">لا توجد طلبات حالياً</div>
           )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl relative border border-slate-200">
             <h2 className="text-2xl font-bold text-slate-900 mb-8 font-display">إضافة منتج للمتجر</h2>
             <form onSubmit={handleAddItem} className="space-y-6">
                <div className="space-y-4">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">صورة المنتج</label>
                   
                   {/* Upload Area */}
                   <div className="flex items-center gap-6">
                      {newItem.imageUrl ? (
                        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200">
                          <img src={newItem.imageUrl || undefined} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setNewItem({...newItem, imageUrl: ''})}
                            className="absolute top-1.5 left-1.5 p-1.5 bg-white/90 text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all cursor-pointer bg-slate-50/50 group">
                          {uploading ? (
                            <Loader2 className="animate-spin" size={24} />
                          ) : (
                            <>
                              <Camera size={26} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] mt-2 font-bold">رفع ملف</span>
                            </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                        </label>
                      )}
                      
                      <div className="flex-1 space-y-2">
                        <p className="text-[10px] text-slate-400 font-medium">ارفع ملفاً من جهازك أو ضع رابط صورة مباشر أدناه:</p>
                        <div className="relative">
                          <ImageIcon size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="url"
                            value={newItem.imageUrl}
                            onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-9 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all"
                          />
                        </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">اسم المنتج</label>
                  <input
                    required
                    type="text"
                    value={newItem.itemName}
                    onChange={e => setNewItem({...newItem, itemName: e.target.value})}
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all"
                    placeholder={isRtl ? `مثال: حقيبة مدرسية ${config.appName}` : `Example: ${config.appName} Backpack`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">السعر (دينار عراقي)</label>
                    <input
                      required
                      type="number"
                      value={Number.isNaN(newItem.price) ? '' : newItem.price}
                      onChange={e => {
                        const val = e.target.value;
                        setNewItem({...newItem, price: val === '' ? 0 : Number(val) || 0});
                      }}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">الكمية المتوفرة</label>
                    <input
                      required
                      type="number"
                      value={Number.isNaN(newItem.stock) ? '' : newItem.stock}
                      onChange={e => {
                        const val = e.target.value;
                        setNewItem({...newItem, stock: val === '' ? 0 : Number(val) || 0});
                      }}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none focus:border-slate-900 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">وصف المنتج</label>
                  <textarea
                    value={newItem.description}
                    onChange={e => setNewItem({...newItem, description: e.target.value})}
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none h-32 focus:border-slate-900 transition-all resize-none"
                    placeholder="اكتب وصفاً مختصراً للمنتج..."
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="submit" disabled={uploading} className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50">حفظ المنتج</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
}

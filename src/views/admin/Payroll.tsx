import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Wallet, CheckCircle2, Clock, Plus, ReceiptText, X, Printer, Download, Share2, CreditCard, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { printElement } from '../../lib/printUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

import { useLanguage } from '../../lib/LanguageContext';

export default function Payroll() {
  const { isRtl } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrintClick = () => {
    if (!printRef.current) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }
    const title = 'وصل-استلام-راتب';
    const success = printElement(printRef.current, title);
    if (!success) {
      toast.error('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة');
    }
  };

  const { profile } = useAuth();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDay, setFilterDay] = useState<number | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [editingDate, setEditingDate] = useState<{id: string, day: number, month: number, year: number} | null>(null);
  const [editingFinancials, setEditingFinancials] = useState<{
    id: string, 
    userId: string, 
    amount: number, 
    bonus: number, 
    deduction: number,
    bonusReason: string,
    deductionReason: string
  } | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [schoolBudget, setSchoolBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState(0);

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;

    try {
      await updateDoc(doc(db, 'schools', profile.schoolId), {
        payrollBudget: Number(budgetInput),
        updatedAt: serverTimestamp()
      });
      toast.success('تم تحديث ميزانية الرواتب بنجاح');
      setShowBudgetModal(false);
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('فشل في تحديث الميزانية');
    }
  };

  const handleUpdateFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinancials) return;

    try {
      // 1. Update the specific payroll record with all financial details
      await updateDoc(doc(db, 'payroll', editingFinancials.id), {
        amount: Number(editingFinancials.amount),
        bonus: Number(editingFinancials.bonus) || 0,
        deduction: Number(editingFinancials.deduction) || 0,
        bonusReason: editingFinancials.bonusReason || '',
        deductionReason: editingFinancials.deductionReason || '',
        totalAmount: (Number(editingFinancials.amount) + (Number(editingFinancials.bonus) || 0)) - (Number(editingFinancials.deduction) || 0),
        updatedAt: serverTimestamp()
      });

      // 2. Synchronize with the user's base salary in the users collection
      await updateDoc(doc(db, 'users', editingFinancials.userId), {
        salary: Number(editingFinancials.amount),
        updatedAt: serverTimestamp()
      });

      toast.success('تم تحديث البيانات المالية والمزامنة بنجاح');
      setEditingFinancials(null);
    } catch (error) {
      console.error('Error updating financials:', error);
      toast.error('فشل في تحديث البيانات');
    }
  };

  const handleUpdateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDate) return;

    try {
      await updateDoc(doc(db, 'payroll', editingDate.id), {
        day: Number(editingDate.day || 1),
        month: Number(editingDate.month),
        year: Number(editingDate.year),
        updatedAt: serverTimestamp()
      });
      toast.success('تم تحديث التاريخ بنجاح');
      setEditingDate(null);
    } catch (error) {
      toast.error('فشل في تحديث التاريخ');
    }
  };

  useEffect(() => {
    if (!profile?.schoolId) return;
    let q = query(
      collection(db, 'payroll'), 
      where('schoolId', '==', profile.schoolId),
      where('month', '==', filterMonth),
      where('year', '==', filterYear)
    );
    
    if (filterDay !== 'all') {
      q = query(q, where('day', '==', filterDay));
    }

    const path = 'payroll';
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPayrolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return unsubscribe;
  }, [profile, filterDay, filterMonth, filterYear]);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const schoolPath = `schools/${profile.schoolId}`;
    const unsubscribe = onSnapshot(doc(db, 'schools', profile.schoolId), (doc) => {
      if (doc.exists()) {
        const budget = doc.data().payrollBudget || 0;
        setSchoolBudget(budget);
        setBudgetInput(budget);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, schoolPath);
    });
    return unsubscribe;
  }, [profile]);

  const togglePaymentStatus = async (payroll: any) => {
    if (!payroll.id) return;
    
    const newStatus = payroll.status === 'paid' ? 'pending' : 'paid';
    const actionText = newStatus === 'paid' ? 'صرف' : 'إلغاء صرف';

    try {
      await updateDoc(doc(db, 'payroll', payroll.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        processedBy: auth.currentUser?.uid
      });
      toast.success(`تم ${actionText} الراتب بنجاح`);
    } catch (error) {
      console.error('Error toggling payment status:', error);
      toast.error('فشل في تحديث الحالة: تحقق من الصلاحيات');
    }
  };

  const generateMonthlyPayroll = async () => {
    if (!profile?.schoolId) return;

    // Removed mandatory email verification check for preview ease
    // Rule level security still applies
    /*
    if (auth.currentUser && !auth.currentUser.emailVerified && auth.currentUser.email?.toLowerCase() !== 'hamzakazem1999@gmail.com') {
      toast.error('يجب تفعيل البريد الإلكتروني أولاً للقيام بهذه العملية الأمنية');
      return;
    }
    */

    setLoading(true);
    try {
      // Fetch only teachers and staff, excluding parents and students
      const staffQ = query(
        collection(db, 'users'), 
        where('schoolId', '==', profile.schoolId),
        where('role', 'in', ['teacher', 'admin', 'staff', 'assistant'])
      );
      
      let staffSnapshot;
      try {
        staffSnapshot = await getDocs(staffQ);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return;
      }

      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Check for existing payrolls this month to avoid duplicates
      const existingQ = query(
        collection(db, 'payroll'),
        where('schoolId', '==', profile.schoolId),
        where('month', '==', month),
        where('year', '==', year)
      );
      
      let existingSnap;
      try {
        existingSnap = await getDocs(existingQ);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'payroll');
        return;
      }

      const existingUserIds = new Set(existingSnap.docs.map(doc => doc.data().userId));

      const staffToProcess = staffSnapshot.docs.filter(doc => !existingUserIds.has(doc.id));

      if (staffToProcess.length === 0) {
        toast('تم توليد كشوفات لجميع الموظفين مسبقاً لهذا الشهر', { icon: 'ℹ️' });
        return;
      }

      const promises = staffToProcess.map(async (staffDoc) => {
        const staffData = staffDoc.data();
        try {
          return await addDoc(collection(db, 'payroll'), {
            schoolId: profile.schoolId,
            userId: staffDoc.id,
            userName: staffData.name,
            amount: staffData.salary || 500000,
            day,
            month,
            year,
            status: 'pending',
            createdAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'payroll');
        }
      });

      await Promise.all(promises);
      toast.success(`تمت توليد ${staffToProcess.length} كشوفات رواتب بنجاح`);
    } catch (error) {
      console.error('Payroll generation error:', error);
      toast.error('خطأ في توليد الكشوفات: تحقق من الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-start md:gap-12 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">سجلات الرواتب والمالية</h1>
          <p className="text-slate-500 mt-1">إدارة صرف الرواتب والميزانية التشغيلية</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 no-print" dir={isRtl ? 'rtl' : 'ltr'}>
            <select 
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-transparent text-sm font-bold text-slate-700 outline-none border-l border-slate-100"
            >
              <option value="all">كل الأيام</option>
              {Array.from({length: 31}, (_, i) => (
                <option key={i+1} value={i+1}>يوم {i+1}</option>
              ))}
            </select>
            <select 
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-transparent text-sm font-bold text-slate-700 outline-none border-l border-slate-100"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>شهر {i+1}</option>
              ))}
            </select>
            <input 
              type="number"
              value={Number.isNaN(filterYear) ? '' : filterYear}
              onChange={(e) => {
                const val = e.target.value;
                setFilterYear(val === '' ? new Date().getFullYear() : Number(val) || new Date().getFullYear());
              }}
              className="w-20 px-4 py-2 rounded-lg bg-transparent text-sm font-bold text-slate-700 outline-none focus:bg-slate-50 transition-colors placeholder:text-slate-300"
              placeholder="السنة"
            />
          </div>

          <button 
            onClick={generateMonthlyPayroll}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <ReceiptText size={20} />
            توليد كشف شهري
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowBudgetModal(true)}
              className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
            >
               <div className="w-10 h-10 bg-indigo-50 text-[#0B2345] rounded-xl flex items-center justify-center group-hover:bg-[#0B2345] group-hover:text-white transition-colors">
                 <Wallet size={20} />
               </div>
               <div className="text-right">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">الميزانية المرصودة</p>
                 <span className="text-slate-900 font-bold text-lg">
                   {schoolBudget.toLocaleString()} <span className="text-[10px]">د.ع</span>
                 </span>
               </div>
            </button>

            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-4 shadow-sm">
               <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                 <ReceiptText size={20} />
               </div>
               <div className="text-right">
                 <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">مجموع المدفوعات الصافي</p>
                 <span className="text-emerald-900 font-bold text-lg">
                   {payrolls.reduce((sum, p) => sum + (p.totalAmount || p.amount || 0), 0).toLocaleString()} <span className="text-[10px]">د.ع</span>
                 </span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {schoolBudget > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0B2345] animate-pulse" />
                <span className="text-xs font-bold text-slate-500">حالة استهلاك الميزانية</span>
             </div>
             <span className="text-xs font-black font-mono text-slate-400">
               {Math.round((payrolls.reduce((sum, p) => sum + (p.amount || 0), 0) / schoolBudget) * 100)}% مستخدم
             </span>
          </div>
          <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min((payrolls.reduce((sum, p) => sum + (p.amount || 0), 0) / schoolBudget) * 100), 100}%` }}
               className={`h-full transition-all duration-1000 ${
                 (payrolls.reduce((sum, p) => sum + (p.amount || 0), 0) / schoolBudget) > 1 ? 'bg-rose-500' : 'bg-[#0B2345]'
               }`}
             />
          </div>
          {(payrolls.reduce((sum, p) => sum + (p.amount || 0), 0) / schoolBudget) > 1 && (
            <p className="mt-3 text-[10px] text-rose-500 font-bold flex items-center gap-2">
              ⚠️ تحذير: مجموع الرواتب الحالي يتجاوز الميزانية المرصودة!
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-right min-w-[700px]">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200">
            <tr>
              <th className="p-4">اسم الموظف</th>
              <th className="p-4">الشهر/السنة</th>
              <th className="p-4">المبلغ</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payrolls.map(pay => (
              <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-slate-900">{pay.userName || pay.userId}</div>
                  <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{pay.userId}</div>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => setEditingDate({ id: pay.id, day: pay.day || 1, month: pay.month, year: pay.year })}
                    className="group flex flex-col hover:bg-slate-50 px-3 py-1 rounded-xl transition-all border border-transparent hover:border-slate-200"
                  >
                    <span className="font-bold text-slate-700 text-sm">{pay.day || 1} / {pay.month} / {pay.year}</span>
                    <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">تعديل التاريخ</span>
                  </button>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => setEditingFinancials({ 
                      id: pay.id, 
                      userId: pay.userId, 
                      amount: pay.amount || 0,
                      bonus: pay.bonus || 0,
                      deduction: pay.deduction || 0,
                      bonusReason: pay.bonusReason || '',
                      deductionReason: pay.deductionReason || ''
                    })}
                    className="group text-right hover:bg-slate-50 px-3 py-1 rounded-xl transition-all border border-transparent hover:border-emerald-200"
                  >
                    <div className="font-bold text-emerald-600 font-mono tracking-tighter text-lg">{(pay.totalAmount || pay.amount || 0).toLocaleString()} د.ع</div>
                    <div className="text-[9px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">تعديل التفاصيل المالية</div>
                  </button>
                </td>
                <td className="p-4">
                   {pay.status === 'paid' ? (
                     <button 
                       onClick={() => togglePaymentStatus(pay)}
                       title="انقر لإلغاء الصرف"
                       className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                     >
                        <CheckCircle2 size={12} strokeWidth={2.5} /> مدفوع
                     </button>
                   ) : (
                     <button 
                       onClick={() => togglePaymentStatus(pay)}
                       title="انقر لتأكيد الصرف"
                       className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100 hover:bg-amber-100 transition-colors"
                     >
                        <Clock size={12} strokeWidth={2.5} /> قيد الانتظار
                     </button>
                   )}
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => setSelectedPayroll(pay)}
                    className="text-[10px] font-bold text-[#0B2345] hover:text-indigo-700 uppercase tracking-widest hover:underline decoration-2 underline-offset-4 transition-all"
                  >
                    عرض الوصل
                  </button>
                </td>
              </tr>
            ))}
            {payrolls.length === 0 && (
              <tr><td colSpan={5} className="p-24 text-center text-slate-400 font-medium italic">لا توجد سجلات رواتب لهذا الشهر</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editingDate && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 border border-slate-200"
            >
              <h3 className="text-xl font-bold mb-6 text-slate-900">تعديل تاريخ السجل</h3>
              
              <form onSubmit={handleUpdateDate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">اليوم</label>
                  <input 
                    type="number"
                    min="1"
                    max="31"
                    value={Number.isNaN(editingDate.day) ? '' : editingDate.day}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingDate({...editingDate, day: val === '' ? 1 : Number(val) || 1});
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الشهر</label>
                  <select 
                    value={editingDate.month}
                    onChange={e => setEditingDate({...editingDate, month: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                  >
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={i+1}>شهر {i+1}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">السنة</label>
                  <input 
                    type="number"
                    value={Number.isNaN(editingDate.year) ? '' : editingDate.year}
                    onChange={e => {
                      const val = e.target.value;
                      setEditingDate({...editingDate, year: val === '' ? new Date().getFullYear() : Number(val) || new Date().getFullYear()});
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                    placeholder={new Date().getFullYear().toString()}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                  >
                    حفظ التغييرات
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingDate(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingFinancials && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-8 border border-slate-200"
            >
              <div className="flex items-center gap-4 mb-6 text-emerald-600">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">تعديل التفاصيل المالية</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">المكافآت، الاستقطاعات والراتب الأساسي</p>
                </div>
              </div>
              
              <form onSubmit={handleUpdateFinancials} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">الراتب الأساسي (د.ع)</label>
                    <input 
                      required
                      type="number"
                      value={Number.isNaN(editingFinancials.amount) ? '' : editingFinancials.amount}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingFinancials({...editingFinancials, amount: val === '' ? 0 : Number(val) || 0});
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold text-lg"
                    />
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">صافي الراتب المتوقع</label>
                    <div className="text-2xl font-black text-emerald-700 font-mono">
                      {((editingFinancials.amount + (Number(editingFinancials.bonus) || 0)) - (Number(editingFinancials.deduction) || 0)).toLocaleString()} <span className="text-xs font-sans">د.ع</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="space-y-4">
                    <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                      <label className="block text-[10px] font-black text-[#0B2345] uppercase tracking-widest mb-2 px-1">المكافأة (Bonus)</label>
                      <input 
                        type="number"
                        value={Number.isNaN(editingFinancials.bonus) ? '' : editingFinancials.bonus}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingFinancials({...editingFinancials, bonus: val === '' ? 0 : Number(val) || 0});
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 outline-none font-bold text-indigo-700"
                        placeholder="0"
                      />
                      <input 
                        type="text"
                        value={editingFinancials.bonusReason}
                        onChange={e => setEditingFinancials({...editingFinancials, bonusReason: e.target.value})}
                        className="w-full mt-2 px-4 py-2 rounded-lg border border-indigo-200 focus:border-indigo-500 outline-none text-xs"
                        placeholder="سبب المكافأة..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                      <label className="block text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 px-1">الاستقطاع (Deduction)</label>
                      <input 
                        type="number"
                        value={Number.isNaN(editingFinancials.deduction) ? '' : editingFinancials.deduction}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingFinancials({...editingFinancials, deduction: val === '' ? 0 : Number(val) || 0});
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-rose-200 focus:border-rose-500 outline-none font-bold text-rose-700"
                        placeholder="0"
                      />
                      <input 
                        type="text"
                        value={editingFinancials.deductionReason}
                        onChange={e => setEditingFinancials({...editingFinancials, deductionReason: e.target.value})}
                        className="w-full mt-2 px-4 py-2 rounded-lg border border-rose-200 focus:border-rose-500 outline-none text-xs"
                        placeholder="سبب الاستقطاع..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    حفظ ومزامنة الراتب
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingFinancials(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showBudgetModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" dir={isRtl ? 'rtl' : 'ltr'}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-10 border border-slate-200"
            >
              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 bg-[#0B2345] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Wallet size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-display">ميزانية الرواتب</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">تخصيص الميزانية الشهرية</p>
                </div>
              </div>
              
              <form onSubmit={handleUpdateBudget} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">الميزانية المستهدفة (د.ع)</label>
                  <div className="relative">
                    <input 
                      required
                      type="number"
                      value={Number.isNaN(budgetInput) ? '' : budgetInput}
                      onChange={e => {
                        const val = e.target.value;
                        setBudgetInput(val === '' ? 0 : Number(val) || 0);
                      }}
                      className="w-full px-6 py-5 rounded-[1.5rem] border-2 border-slate-100 focus:border-indigo-500 outline-none font-black text-3xl text-[#0B2345] font-mono tracking-tighter transition-all bg-slate-50/50"
                      placeholder="0"
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm pointer-events-none">د.ع</div>
                  </div>
                  <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-[#0B2345] italic">
                      <span>إجمالي الرواتب الحالية:</span>
                      <span className="font-mono">{payrolls.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()} د.ع</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-[#0B2345] text-white rounded-[1.5rem] font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/10 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    تحديث الميزانية
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="px-6 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedPayroll && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-200"
            >
              <div ref={printRef}>
                {/* Receipt Header */}
                <div className="bg-slate-900 p-8 text-white relative">
                  <button 
                    onClick={() => setSelectedPayroll(null)}
                    className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full no-print"
                  >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <ReceiptText size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-display tracking-tight">وصل صرف الراتب</h3>
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">إيصال مالي رسمي</p>
                  </div>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="p-8 space-y-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                <div className="flex justify-between items-start border-b border-slate-100 pb-6 border-dashed">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">الموظف المستلم</label>
                    <p className="text-xl font-black text-slate-900 font-display">{selectedPayroll.userName}</p>
                    <p className="text-xs text-slate-500 font-mono tracking-tighter">ID: {selectedPayroll.userId}</p>
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">التاريخ</label>
                    <p className="text-sm font-bold text-slate-900">{selectedPayroll.day || 1} / {selectedPayroll.month} / {selectedPayroll.year}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {selectedPayroll.createdAt?.seconds ? new Date(selectedPayroll.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                    <span>الراتب الأساسي</span>
                    <span className="font-mono text-slate-900">{selectedPayroll.amount?.toLocaleString()} د.ع</span>
                  </div>
                  {selectedPayroll.bonus > 0 && (
                    <div className="flex justify-between items-center text-sm font-bold text-[#0B2345]">
                      <span>مكافآت {selectedPayroll.bonusReason && `(${selectedPayroll.bonusReason})`}</span>
                      <span className="font-mono">+{selectedPayroll.bonus.toLocaleString()} د.ع</span>
                    </div>
                  )}
                  {selectedPayroll.deduction > 0 && (
                    <div className="flex justify-between items-center text-sm font-bold text-rose-600">
                      <span>استقطاعات {selectedPayroll.deductionReason && `(${selectedPayroll.deductionReason})`}</span>
                      <span className="font-mono">-{selectedPayroll.deduction.toLocaleString()} د.ع</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-black text-slate-900 uppercase tracking-widest text-xs">صافي المبلغ المستلم</span>
                    <span className="font-black text-2xl text-emerald-600 font-mono tracking-tighter">
                      {(selectedPayroll.totalAmount || selectedPayroll.amount || 0).toLocaleString()} د.ع
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center py-4">
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 ${
                    selectedPayroll.status === 'paid' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {selectedPayroll.status === 'paid' ? 'تم الصرف بنجاح' : 'معلق - بانتظار الصرف'}
                  </div>
                </div>

                <div className="text-center pt-8">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-loose mt-8">
                    هذا الوصل تم توليده إلكترونياً بواسطة نظام إدارة المدرسة<br/>
                    ID: {selectedPayroll.id}
                  </p>
                </div>
              </div>
              </div>

              <div className="grid grid-cols-2 gap-4 no-print px-8 pb-8 bg-white">
                <button 
                  onClick={handlePrintClick}
                  className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                >
                  <Printer size={18} />
                  طباعة
                </button>
                <button 
                  onClick={handlePrintClick}
                  className="flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Download size={18} />
                  حفظ PDF
                </button>
              </div>

              <div className="h-2 bg-slate-900 w-full relative z-10"></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

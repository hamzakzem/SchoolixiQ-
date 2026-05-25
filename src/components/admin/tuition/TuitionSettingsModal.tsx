import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings2, X, Users, RefreshCw, AlertCircle, CalendarRange } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { doc, updateDoc, collection, serverTimestamp, setDoc, query, where, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface TuitionSettingsProps {
  onClose: () => void;
  classes: any[];
  students: any[];
  schoolId: string;
}

export default function TuitionSettingsModal({ onClose, classes, students, schoolId }: TuitionSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [baseTuition, setBaseTuition] = useState<number | ''>('');
  const [scheduleType, setScheduleType] = useState<'monthly' | 'quarterly' | 'custom'>('custom');
  const [installmentDuration, setInstallmentDuration] = useState<number>(4);
  const [academicYear, setAcademicYear] = useState<string>(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [applyToExisting, setApplyToExisting] = useState(false);

  useEffect(() => {
    if (selectedClassId) {
      const cls = classes.find(c => c.id === selectedClassId);
      if (cls && cls.baseTuition) {
        setBaseTuition(cls.baseTuition.amount);
        setScheduleType(cls.baseTuition.scheduleType || 'custom');
        setInstallmentDuration(cls.baseTuition.duration || 4);
        if (cls.baseTuition.academicYear) {
           setAcademicYear(cls.baseTuition.academicYear);
        }
      } else {
        setBaseTuition('');
        setScheduleType('custom');
        setInstallmentDuration(4);
      }
    }
  }, [selectedClassId, classes]);

  const handleScheduleChange = (type: 'monthly' | 'quarterly' | 'custom') => {
    setScheduleType(type);
    if (type === 'monthly') setInstallmentDuration(9); // typical school year months
    else if (type === 'quarterly') setInstallmentDuration(4);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !baseTuition || isNaN(Number(baseTuition))) return;
    if (Number(baseTuition) < 0) {
      toast.error('لا يمكن تعيين قسط سالب');
      return;
    }
    setLoading(true);

    try {
      const amount = Number(baseTuition);
      const duration = Number(installmentDuration);

      // Save to class settings
      await updateDoc(doc(db, 'classes', selectedClassId), {
        baseTuition: {
          amount,
          duration,
          scheduleType,
          academicYear
        }
      });

      // Apply to students if selected
      if (applyToExisting) {
         const classStudents = students.filter(s => s.classId === selectedClassId);
         if (classStudents.length > 0) {
           const batch = writeBatch(db);

           for (const student of classStudents) {
             // 1. Update Student totalTuition
             batch.update(doc(db, 'students', student.id), {
               totalTuition: amount,
               academicYear: academicYear
             });

             // 2. Fetch existing pending installments for this student and clear them 
             // (to replace with the new plan). 
             const q = query(
                collection(db, 'installments'), 
                where('studentId', '==', student.id),
                where('status', '==', 'pending')
             );
             const installmentsSnap = await getDocs(q);
             installmentsSnap.docs.forEach(docSnap => {
                batch.delete(docSnap.ref);
             });

             // 3. Generate new installments based on remaining tuition balance
             const paidBalance = student.tuitionBalance || 0;
             const remainingBalance = Math.max(0, amount - paidBalance);

             if (remainingBalance > 0 && duration > 0) {
                const amountPerInstallment = Math.floor(remainingBalance / duration);
                const remainder = remainingBalance - (amountPerInstallment * duration);
                const today = new Date();

                for (let i = 0; i < duration; i++) {
                  const dueDate = new Date(today);
                  if (scheduleType === 'quarterly') {
                    dueDate.setMonth(today.getMonth() + (i * 3) + 3);
                  } else {
                    dueDate.setMonth(today.getMonth() + i + 1);
                  }
                  
                  const instRef = doc(collection(db, 'installments'));
                  
                  let instAmount = amountPerInstallment;
                  if (i === duration - 1) {
                    instAmount += remainder;
                  }

                  batch.set(instRef, {
                    studentId: student.id,
                    schoolId: schoolId,
                    amount: instAmount,
                    dueDate: dueDate.toISOString(),
                    status: 'pending',
                    createdAt: serverTimestamp()
                  });
                }
             }
           }
           await batch.commit();
         }
      }

      toast.success('تم حفظ إعدادات الرسوم بنجاح');
      onClose();
    } catch (error: any) {
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl relative my-auto"
      >
        <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
          <X size={18} className="text-slate-500" />
        </button>

        <div className="text-center mb-5 mt-2">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Settings2 size={24} />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">إعدادات الرسوم الدراسية</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">تحديد القسط الأساسي لكل مرحلة دراسية</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">اختر الصف / المرحلة</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="" disabled>-- يرجى الاختيار --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {selectedClassId && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">العام الدراسي</label>
                <div className="relative">
                  <CalendarRange className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    className="w-full pl-3 pr-8 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 2024-2025"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {selectedClassId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="block text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">إجمالي القسط السنوي (الأساسي)</label>
                <div className="relative group">
                  <input 
                    required
                    type="number"
                    min="0"
                    className="w-full text-center bg-transparent text-2xl font-black text-slate-900 dark:text-white outline-none font-mono tracking-tighter placeholder:text-slate-300 dark:placeholder:text-slate-700"
                    placeholder="000,000"
                    value={baseTuition}
                    onChange={(e) => setBaseTuition(Number(e.target.value))}
                  />
                  <div className="text-center mt-1 text-slate-400 font-bold text-xs">دينار عراقي</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">كيفية التوزيع التلقائي للأقساط؟</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button type="button" onClick={() => handleScheduleChange('monthly')} className={`py-2 rounded-xl font-bold text-xs transition-all ${scheduleType === 'monthly' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    شهري (9 اشهر)
                  </button>
                  <button type="button" onClick={() => handleScheduleChange('quarterly')} className={`py-2 rounded-xl font-bold text-xs transition-all ${scheduleType === 'quarterly' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    فصلي (4 فصول)
                  </button>
                  <button type="button" onClick={() => handleScheduleChange('custom')} className={`py-2 rounded-xl font-bold text-xs transition-all ${scheduleType === 'custom' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    مخصص
                  </button>
                </div>

                {scheduleType === 'custom' && (
                  <div className="mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {[2, 3, 5, 6, 8, 10, 12].map(num => (
                        <button 
                          key={num}
                          type="button"
                          onClick={() => setInstallmentDuration(num)}
                          className={`flex-1 min-w-[40px] py-1.5 rounded-lg font-bold text-xs transition-all ${installmentDuration === num ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-xs">
                   <span className="font-bold text-indigo-700 dark:text-indigo-400">قيمة الدفعة التقريبية:</span>
                   <span className="font-mono font-black text-indigo-800 dark:text-indigo-300">
                     {baseTuition && installmentDuration ? Math.round(Number(baseTuition) / installmentDuration).toLocaleString() : 0} د.ع
                   </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30">
                 <input 
                   type="checkbox"
                   id="applyToExisting"
                   className="w-4 h-4 mt-0.5 rounded text-orange-600 focus:ring-orange-500 cursor-pointer shrink-0"
                   checked={applyToExisting}
                   onChange={(e) => setApplyToExisting(e.target.checked)}
                 />
                 <label htmlFor="applyToExisting" className="flex-1 cursor-pointer">
                    <p className="text-[12px] font-bold text-orange-800 dark:text-orange-400 flex items-center gap-1.5 leading-tight">
                      <RefreshCw size={12} className="shrink-0" /> تطبيق الإعدادات كأقساط جديدة للطلاب الحاليين في الصف
                    </p>
                 </label>
              </div>

              <button 
                type="submit"
                disabled={loading || !baseTuition}
                className="w-full py-3 mt-1 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ والجدولة...' : 'تأكيد وحفظ الإعدادات'}
              </button>
            </motion.div>
          )}
        </form>
      </motion.div>
    </div>
  );
}

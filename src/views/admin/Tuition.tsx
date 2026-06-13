import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, doc, updateDoc, increment, limit, deleteDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Wallet, Receipt, Plus, Search, Filter, CheckCircle2, AlertCircle, DollarSign, Calendar, MessageSquare, ExternalLink, Trash2, Clock, Edit2, Settings2, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { notificationService } from '../../lib/notificationService';
import { resolveStudentParentIds } from '../../lib/schoolSync';
import {
  buildTuitionReminderPayload,
  computeLateInstallments,
  computeTotalArrears,
  formatTuitionAmountLabel,
  formatTuitionDueLabel,
  getInstallmentsForStudent,
  getPendingInstallmentsForStudent,
  getStudentRemainingBalance,
  isOverdueInstallment,
  isStudentLate,
  isUnpaidInstallment,
  parseTuitionDueDate,
  tuitionInstallmentsQuery,
  tuitionPaymentsQuery,
  tuitionStudentsQuery,
} from '../../lib/tuitionModel';
import TuitionSettingsModal from '../../components/admin/tuition/TuitionSettingsModal';

export default function Tuition() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const paymentInFlightRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // Installment Planning State
  const [planCount, setPlanCount] = useState('4');
  const [planTotal, setPlanTotal] = useState('');

  // Editing Tuition State
  const [isEditingTuition, setIsEditingTuition] = useState(false);
  const [tempTuitionAmount, setTempTuitionAmount] = useState('');
  const [showTuitionSettings, setShowTuitionSettings] = useState(false);
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [tempInstallmentAmount, setTempInstallmentAmount] = useState('');

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (!profile?.schoolId) return;
    
    try {
      setLoading(true);
      
      const classesQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId), limit(100));
      unsubs.push(onSnapshot(classesQ, snap => {
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));

      unsubs.push(onSnapshot(tuitionStudentsQuery(profile.schoolId), snap => {
        setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));

      unsubs.push(onSnapshot(tuitionPaymentsQuery(profile.schoolId), snap => {
        setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));

      unsubs.push(onSnapshot(tuitionInstallmentsQuery(profile.schoolId), snap => {
        setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }));

    } catch (error) {
      console.error("Error setting up real-time tuition listeners:", error);
    } finally {
      setLoading(false);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [profile]);

  const toggleInstallmentStatus = async (inst: any) => {
    if (!inst.id) return;
    const newStatus = inst.status === 'paid' ? 'pending' : 'paid';
    const actionText = newStatus === 'paid' ? 'تسديد' : 'إلغاء تسديد';
    
    try {
      await updateDoc(doc(db, 'installments', inst.id), {
        status: newStatus,
        paidAt: newStatus === 'paid' ? serverTimestamp() : null
      });
      setInstallments(prev => prev.map(i => i.id === inst.id ? { ...i, status: newStatus, paidAt: newStatus === 'paid' ? { seconds: Math.floor(Date.now() / 1000) } : null } : i));
      toast.success(`تم ${actionText} القسط بنجاح`);
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث حالة القسط');
    }
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentInFlightRef.current) return;
    if (!profile?.schoolId || !selectedStudent) return;

    const amountNum = parseFloat(paymentAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح وموجب');
      return;
    }

    const remainingTuition = (selectedStudent.totalTuition || 0) - (selectedStudent.tuitionBalance || 0);
    if (remainingTuition > 0 && amountNum > remainingTuition) {
      toast.error('المبلغ يتجاوز إجمالي الرسوم المتبقية للطالب');
      return;
    }

    paymentInFlightRef.current = true;
    setIsProcessingPayment(true);

    try {
      const pendingInstallments = getPendingInstallmentsForStudent(installments, selectedStudent.id);
      const installmentToPay = pendingInstallments[0];
      const installmentLabel = installmentToPay
        ? `الدفعة رقم ${installments.filter(i => i.studentId === selectedStudent.id).indexOf(installmentToPay) + 1}`
        : 'دفعة إضافية';

      const batch = writeBatch(db);
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: amountNum,
        type: 'tuition',
        note: installmentLabel,
        createdAt: serverTimestamp(),
        authorId: profile.uid,
      });

      batch.update(doc(db, 'students', selectedStudent.id), {
        tuitionBalance: increment(amountNum),
      });

      if (installmentToPay?.id) {
        batch.update(doc(db, 'installments', installmentToPay.id), {
          status: 'paid',
          paidAt: serverTimestamp(),
          paidAmount: amountNum,
        });
      }

      await batch.commit();

      await notificationService.notifyStudentParents(selectedStudent.id, {
        title: 'تأكيد استلام دفعة',
        message: `تم استلام مبلغ ${amountNum.toLocaleString()} د.ع (${installmentLabel}) للأقساط الدراسية.`,
        type: 'payment',
        schoolId: profile.schoolId,
      });

      toast.success(`تم تسجيل ${installmentLabel} بنجاح`);
      setShowPayModal(false);
      setPaymentAmount('');
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments_and_students');
      toast.error('حدث خطأ أثناء معالجة الدفعة');
    } finally {
      paymentInFlightRef.current = false;
      setIsProcessingPayment(false);
    }
  };

  const handleSaveTuition = async () => {
    if (!selectedStudent || !tempTuitionAmount) return;
    const newTotal = parseFloat(tempTuitionAmount);
    if (isNaN(newTotal) || newTotal < 0) {
      toast.error('الرجاء إدخال مبلغ صحيح وموجب');
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Update Student totalTuition
      batch.update(doc(db, 'students', selectedStudent.id), {
        totalTuition: newTotal
      });

      // 2. Recalculate pending installments
      const paidBalance = selectedStudent.tuitionBalance || 0;
      const remainingBalance = Math.max(0, newTotal - paidBalance);

      const pendingInsts = installments.filter(i => i.studentId === selectedStudent.id && i.status === 'pending');
      
      if (pendingInsts.length > 0) {
         // Distribute new remaining balance over existing pending installments
         const amountPerInst = Math.floor(remainingBalance / pendingInsts.length);
         const remainder = remainingBalance - (amountPerInst * pendingInsts.length);

         pendingInsts.forEach((inst, idx) => {
            let instAmount = amountPerInst;
            if (idx === pendingInsts.length - 1) {
               instAmount += remainder;
            }
            batch.update(doc(db, 'installments', inst.id), {
               amount: instAmount
            });
         });
      }

      await batch.commit();

      // Update local state
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, totalTuition: newTotal } : s));
      setSelectedStudent((prev: any) => ({ ...prev, totalTuition: newTotal }));
      
      if (pendingInsts.length > 0) {
         const amountPerInst = Math.floor(remainingBalance / pendingInsts.length);
         const remainder = remainingBalance - (amountPerInst * pendingInsts.length);
         
         setInstallments(prev => prev.map(i => {
           if (i.studentId === selectedStudent.id && i.status === 'pending') {
             const idx = pendingInsts.findIndex(p => p.id === i.id);
             let instAmount = amountPerInst;
             if (idx === pendingInsts.length - 1) instAmount += remainder;
             return { ...i, amount: instAmount };
           }
           return i;
         }));
      }

      setIsEditingTuition(false);
      toast.success('تم تحديث القسط الدراسي وإعادة الجدولة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث القسط');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstallmentAmount = async (inst: any) => {
    if (!tempInstallmentAmount) return;
    const newAmount = parseFloat(tempInstallmentAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast.error('الرجاء إدخال مبلغ صحيح وموجب');
      return;
    }

    const difference = newAmount - inst.amount;

    if (difference === 0) {
       setEditingInstallmentId(null);
       return;
    }

    const otherPending = installments.filter(i => i.studentId === inst.studentId && i.status === 'pending' && i.id !== inst.id);
    const sumOtherPending = otherPending.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    if (difference > sumOtherPending) {
        toast.error('المبلغ يتجاوز إجمالي الأقساط المتبقية. يرجى تعديل القسط السنوي الكلي أولاً.');
        return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Update this installment
      batch.update(doc(db, 'installments', inst.id), {
        amount: newAmount
      });

      // Distribute the remaining required sum over the other pending installments
      const targetSumForOthers = sumOtherPending - difference;
      
      let amountPerOther = 0;
      let remainder = 0;

      if (otherPending.length > 0) {
         amountPerOther = Math.floor(targetSumForOthers / otherPending.length);
         remainder = targetSumForOthers - (amountPerOther * otherPending.length);

         otherPending.forEach((otherInst, idx) => {
            let updateAmt = amountPerOther;
            if (idx === otherPending.length - 1) updateAmt += remainder;
            
            batch.update(doc(db, 'installments', otherInst.id), {
               amount: updateAmt
            });
         });
      }

      await batch.commit();

      setInstallments(prev => prev.map(i => {
         if (i.id === inst.id) return { ...i, amount: newAmount };
         
         const isOther = otherPending.find(o => o.id === i.id);
         if (isOther) {
             const idx = otherPending.findIndex(o => o.id === i.id);
             let updateAmt = amountPerOther;
             if (idx === otherPending.length - 1) updateAmt += remainder;
             return { ...i, amount: updateAmt };
         }
         return i;
      }));

      setEditingInstallmentId(null);
      toast.success('تم تعديل الدفعة وإعادة توزيع الباقي بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء تعديل الدفعة');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!selectedStudent || !planTotal || !planCount) return;
    setLoading(true);
    try {
      const totalAmount = parseFloat(planTotal);
      const count = parseInt(planCount);
      const amountPerInstallment = Math.floor(totalAmount / count);
      const remainder = totalAmount - (amountPerInstallment * count);
      
      const today = new Date();
      for (let i = 0; i < count; i++) {
        const dueDate = new Date(today);
        dueDate.setMonth(today.getMonth() + i + 1);
        
        let instAmount = amountPerInstallment;
        if (i === count - 1) {
          instAmount += remainder; // Add any remainder to the last installment
        }

        await addDoc(collection(db, 'installments'), {
          studentId: selectedStudent.id,
          schoolId: profile?.schoolId,
          amount: instAmount,
          dueDate: dueDate.toISOString(),
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'students', selectedStudent.id), {
        totalTuition: totalAmount
      });

      toast.success('تم إنشاء خطة التقسيط بنجاح');
      setShowPlanModal(false);
    } catch (error) {
      toast.error('خطأ في إنشاء الخطة');
    } finally {
      setLoading(false);
    }
  };



  const sendTuitionReminder = async (
    student: { id: string; name?: string; schoolId?: string },
    installment: { id?: string; amount?: number; dueDate?: string | Date },
  ): Promise<'sent' | 'no_parent' | 'failed'> => {
    if (!profile?.schoolId || !profile.uid) return 'failed';
    if (student.schoolId && student.schoolId !== profile.schoolId) return 'failed';

    const parentIds = await resolveStudentParentIds(student.id, profile.schoolId);
    if (parentIds.length === 0) {
      return 'no_parent';
    }

    const dueLabel = formatTuitionDueLabel(installment.dueDate);
    const amountLabel = formatTuitionAmountLabel(installment.amount);

    const ok = await notificationService.notifyStudentParents(student.id, {
      ...buildTuitionReminderPayload(
        student,
        installment,
        profile.uid,
        profile.schoolId,
        `تذكير بقسط الطالب ${student.name || ''} بمبلغ ${amountLabel} د.ع مستحق بتاريخ ${dueLabel}.`,
      ),
    });

    return ok ? 'sent' : 'failed';
  };

  const sendReminder = async (student: any, installment: any) => {
    if (!profile?.schoolId) return;
    try {
      const result = await sendTuitionReminder(student, installment);
      if (result === 'sent') {
        toast.success('تم إرسال تذكير القسط لولي الأمر');
      } else if (result === 'no_parent') {
        toast.error('لا يوجد ولي أمر مرتبط بهذا الطالب');
      } else {
        toast.error('أخفق إرسال التذكير');
      }
    } catch (err) {
      console.error('Tuition reminder failed:', err);
      toast.error('أخفق إرسال التذكير');
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.registrationNumber?.includes(searchTerm)
  );

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalArrears = computeTotalArrears(installments);
  const lateInstallments = computeLateInstallments(installments, students);

  const sendAllReminders = async () => {
    if (lateInstallments.length === 0 || !profile?.schoolId) return;
    setLoading(true);
    let sentCount = 0;
    let noParentCount = 0;
    let failedCount = 0;
    try {
      for (const late of lateInstallments) {
        if (!late.student || late.student.schoolId !== profile.schoolId) continue;

        const dueLabel = formatTuitionDueLabel(late.dueDate);
        const amountLabel = formatTuitionAmountLabel(late.amount);

        const parentIds = await resolveStudentParentIds(late.student.id, profile.schoolId);
        if (parentIds.length === 0) {
          noParentCount++;
          continue;
        }

        const ok = await notificationService.notifyStudentParents(late.student.id, {
          ...buildTuitionReminderPayload(
            late.student,
            late,
            profile.uid,
            profile.schoolId,
            `تذكير بتأخر سداد قسط الطالب ${late.student.name || ''} بمبلغ ${amountLabel} د.ع وكان مستحقاً بتاريخ ${dueLabel}.`,
          ),
        });

        if (ok) sentCount++;
        else failedCount++;
      }

      if (sentCount > 0) {
        toast.success(`تم إرسال ${sentCount} إشعار تذكير للأولياء`);
      }
      if (noParentCount > 0) {
        toast.error(`${noParentCount} طالب بدون ولي أمر مرتبط — لم يُرسل لهم تذكير`);
      }
      if (failedCount > 0) {
        toast.error(`فشل إرسال ${failedCount} تذكير`);
      }
      if (sentCount === 0 && noParentCount === 0 && failedCount === 0) {
        toast.error('لا توجد متأخرات صالحة للتذكير');
      }
    } catch (err) {
      console.error('Batch tuition reminders failed:', err);
      toast.error('حدث خطأ أثناء إرسال الإشعارات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="text-right md:text-right">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight leading-tight">نظام الأقساط والتحصيل</h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-bold mt-1">جدولة الدفعات، متابعة المتأخرات، وإدارة التدفقات المالية</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
          <button 
            onClick={() => setShowTuitionSettings(true)}
            className="bg-slate-100 dark:bg-slate-800 p-4 md:px-6 md:py-4 rounded-[2rem] text-slate-700 dark:text-slate-300 flex items-center justify-center md:justify-start gap-2 shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-bold"
          >
            <Settings2 size={18} />
            إعدادات الرسوم
          </button>
          <div className="grid grid-cols-2 gap-3 md:gap-4 flex-1">
            <div className="bg-emerald-600 p-4 md:px-6 md:py-4 rounded-[2rem] text-white flex flex-col md:flex-row md:items-center gap-2 md:gap-4 shadow-xl shadow-emerald-600/20">
              <div className="bg-white/20 p-2 rounded-xl w-fit">
                 <DollarSign size={18} />
              </div>
              <div>
                <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">إجمالي المحصل</p>
                <p className="text-base md:text-xl font-black font-mono tracking-tighter">
                  {totalCollected.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-rose-600 p-4 md:px-6 md:py-4 rounded-[2rem] text-white flex flex-col md:flex-row md:items-center gap-2 md:gap-4 shadow-xl shadow-rose-600/20">
              <div className="bg-white/20 p-2 rounded-xl w-fit">
                 <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-80 leading-none mb-1">المتأخرات</p>
                <p className="text-base md:text-xl font-black font-mono tracking-tighter">
                  {totalArrears.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar: Student Actions & Search */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="relative mb-6">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                placeholder="ابحث عن طالب بالأسم أو الرقم التعريفي..."
                className="w-full pr-12 pl-6 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 transition-all font-bold text-slate-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2 pt-2">
              {filteredStudents.map((student) => {
                const studentInstallments = getInstallmentsForStudent(installments, student.id);
                const isLate = isStudentLate(student, installments);
                
                return (
                  <div 
                    key={student.id}
                    className={`flex flex-col p-6 rounded-3xl border transition-all group relative overflow-hidden h-full ${
                      selectedStudent?.id === student.id 
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm'
                    }`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center font-bold text-slate-400 group-hover:scale-110 transition-transform">
                          {student.name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{student.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">#{student.registrationNumber}</p>
                          
                          {/* Parent Phone under Name */}
                          <p className="text-[10px] text-blue-600 font-black mt-1 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full w-fit">
                            <span className="opacity-70">ولي الأمر:</span>
                            {student.parentPhone || 'غير محدد'}
                          </p>

                          {/* Remaining Balance under Name */}
                          <div className="mt-2 flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-rose-500 uppercase leading-none">المتبقي:</span>
                            <span className="font-black text-rose-600 text-sm font-mono tracking-tighter">
                              {getStudentRemainingBalance(student).toLocaleString()} د.ع
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {isLate && (
                          <div className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg flex items-center gap-1 animate-pulse">
                            <AlertCircle size={12} />
                            <span className="text-[10px] font-black">متأخر</span>
                          </div>
                        )}
                        {studentInstallments.length > 0 && (
                          <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black">
                            {studentInstallments.filter(i => i.status === 'paid').length} / {studentInstallments.length} دفعات
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">المدفوع (المحصل)</p>
                        <p className="font-mono font-bold text-emerald-600 text-sm">{student.tuitionBalance?.toLocaleString() || 0} د.ع</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                            setShowPayModal(true);
                          }}
                          className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 text-[10px] font-black"
                        >
                          <Plus size={14} />
                          تسجيل دفعة
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(student);
                            setShowPlanModal(true);
                          }}
                          className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-[10px] font-bold"
                        >
                          <Calendar size={14} />
                          خطة الأقساط
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Details & Reports */}
        <div className="space-y-6">
          {/* Selected Student Details */}
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div 
                key={selectedStudent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center font-black text-2xl mb-4">
                    {selectedStudent.name[0]}
                  </div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white line-clamp-1">{selectedStudent.name}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 capitalize">{classes.find(c => c.id === selectedStudent.classId)?.name || 'بدون صف'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center relative group">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">المبلغ الكلي</p>
                    {isEditingTuition ? (
                      <div className="flex items-center gap-1 mt-1 font-mono">
                        <input
                          type="number"
                          value={tempTuitionAmount}
                          onChange={(e) => setTempTuitionAmount(e.target.value)}
                          className="w-full text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-xs outline-none"
                          autoFocus
                        />
                        <button onClick={handleSaveTuition} disabled={loading} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
                          <CheckCircle2 size={12} />
                        </button>
                        <button onClick={() => setIsEditingTuition(false)} className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                          <Plus size={12} className="rotate-45" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="font-mono font-black text-slate-900 dark:text-white text-xs cursor-pointer flex items-center justify-center gap-1 group-hover:text-blue-600 transition-colors"
                        onClick={() => {
                          setTempTuitionAmount(selectedStudent.totalTuition?.toString() || '0');
                          setIsEditingTuition(true);
                        }}
                        title="انقر لتعديل القسط"
                      >
                        {selectedStudent.totalTuition?.toLocaleString() || 0}
                        <Edit2 size={12} className="text-slate-400 group-hover:text-blue-500" />
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">المتبقي</p>
                    <p className="font-mono font-black text-rose-600 text-xs">
                      {((selectedStudent.totalTuition || 0) - (selectedStudent.tuitionBalance || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Clock size={14} className="text-blue-600" />
                    جدول الأقساط
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {installments.filter(i => i.studentId === selectedStudent.id).map((inst, idx) => (
                      <div key={inst.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleInstallmentStatus(inst)}
                            title={inst.status === 'paid' ? "إلغاء التسديد" : "تحديد كمرفوع"}
                            className={`w-3 h-3 rounded-full transition-all hover:scale-125 ${inst.status === 'paid' ? 'bg-emerald-500' : isOverdueInstallment(inst) ? 'bg-rose-500' : 'bg-slate-300'}`}
                          ></button>
                          <div>
                            <p className="font-bold text-[10px] text-slate-900 dark:text-white">قسط #{idx + 1}</p>
                            <p className="text-[9px] text-slate-400 font-bold">{parseTuitionDueDate(inst.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingInstallmentId === inst.id ? (
                            <div className="flex items-center gap-1 font-mono">
                              <input
                                type="number"
                                value={tempInstallmentAmount}
                                onChange={(e) => setTempInstallmentAmount(e.target.value)}
                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-1 px-1 text-[10px] outline-none"
                                autoFocus
                              />
                              <button onClick={() => handleSaveInstallmentAmount(inst)} disabled={loading} className="text-emerald-600 hover:scale-110">
                                <CheckCircle2 size={12} />
                              </button>
                              <button onClick={() => setEditingInstallmentId(null)} className="text-slate-400 hover:text-slate-600 hover:scale-110">
                                <Plus size={12} className="rotate-45" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className={`font-mono text-[10px] font-bold cursor-pointer hover:underline ${inst.status === 'paid' ? 'text-emerald-600' : 'text-slate-600'}`}
                              onClick={() => {
                                setTempInstallmentAmount(inst.amount?.toString() || '0');
                                setEditingInstallmentId(inst.id);
                              }}
                              title="انقر لتعديل الدفعة"
                            >
                              {inst.amount?.toLocaleString()} د.ع
                            </div>
                          )}
                          {isUnpaidInstallment(inst) && (
                            <button 
                              onClick={() => sendReminder(selectedStudent, inst)}
                              className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                              title="إرسال إشعار تذكير"
                            >
                              <Bell size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {installments.filter(i => i.studentId === selectedStudent.id).length === 0 && (
                      <p className="text-center py-6 text-slate-400 font-bold text-xs">لا توجد أقساط مجدولة</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-12 text-center">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full w-fit mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-slate-400 text-sm font-bold leading-relaxed">اختر طالباً من القائمة لعرض تفاصيل الأقساط والتوقعات</p>
              </div>
            )}
          </AnimatePresence>

          {/* Late Payments Report Section */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                جدول المتأخرات
                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black">{lateInstallments.length}</span>
              </h3>
              {lateInstallments.length > 0 && (
                <button 
                  onClick={sendAllReminders}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black hover:bg-rose-100 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Bell size={14} />
                  إرسال الكل
                </button>
              )}
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {lateInstallments.map((late) => {
                const isCritical = late.delayLevel === 'critical';
                const isMedium = late.delayLevel === 'medium';
                
                const bgColors = isCritical 
                  ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30' 
                  : isMedium 
                    ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30' 
                    : 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30';
                                 
                const textColors = isCritical 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : isMedium 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-amber-600 dark:text-amber-400';
              
                const badgeBg = isCritical 
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' 
                  : isMedium 
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
              
                const labelText = isCritical ? 'تأخير حرج' : isMedium ? 'تأخير متوسط' : 'تأخير مبكر';

                return (
                  <div key={late.id} className={`p-4 rounded-2xl border flex items-center justify-between group ${bgColors}`}>
                    <div className="flex-1">
                      <h5 className="font-bold text-[10px] text-slate-900 dark:text-white line-clamp-1">{late.studentName}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-[9px] font-bold uppercase tracking-tighter ${textColors}`}>{formatTuitionDueLabel(late.dueDate)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${badgeBg}`}>
                          {labelText} ({late.delayDays} يوم)
                        </span>
                      </div>
                    </div>
                    <div className="text-left flex flex-col items-end">
                      <p className={`font-mono font-black text-[10px] ${textColors}`}>{late.amount?.toLocaleString()}</p>
                      <button 
                        onClick={() => {
                          if (late.student) sendReminder(late.student, late);
                        }}
                        className="text-[9px] text-emerald-600 font-black mt-1 flex items-center gap-1 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        title="إرسال إشعار تذكير"
                      >
                        <Bell size={10} />
                        تذكير مباشر
                      </button>
                    </div>
                  </div>
                );
              })}
              {lateInstallments.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-bold text-xs italic">لا يوجد متأخرات حالياً</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-14 w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl relative"
              >
                <div className="text-center mb-6 md:mb-10">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                    <Wallet size={32} />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">تسجيل عملية دفع</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-2">تسجيل القسط الدراسي للطالب: <span className="text-blue-600">{selectedStudent?.name}</span></p>
                </div>

                <form onSubmit={handleProcessPayment} className="space-y-6 md:space-y-8">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <label className="block text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">أدخل المبلغ المدفوع (بالدينار)</label>
                    <div className="relative group">
                      <input 
                        required
                        autoFocus
                        type="number"
                        className="w-full text-center bg-transparent text-3xl md:text-5xl font-black text-slate-900 dark:text-white outline-none font-mono tracking-tighter placeholder:text-slate-200 dark:placeholder:text-slate-800"
                        placeholder="000,000"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      <div className="text-center mt-2 text-slate-400 font-bold text-sm">دينار عراقي</div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowPayModal(false)}
                      className="flex-1 py-4 md:py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-display"
                    >
                      إلغاء
                    </button>
                    <button 
                      type="submit"
                      disabled={isProcessingPayment || !paymentAmount}
                      className="flex-[2] py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 active:scale-95 disabled:opacity-50"
                    >
                      {isProcessingPayment ? 'جاري المعالجة...' : 'تأكيد العملية'}
                    </button>
                  </div>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plan Installments Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-12 w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl"
            >
              <div className="text-center mb-6 md:mb-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Calendar size={32} />
                </div>
                <h2 className="text-2xl md:text-2xl font-black text-slate-900 dark:text-white">إنشاء نظام أقساط</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-2">تحديد الدفعات للطالب {selectedStudent?.name}</p>
              </div>

              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">إجمالي القسط السنوي</label>
                  <input 
                    type="number"
                    className="w-full px-5 md:px-6 py-3 md:py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white text-sm md:text-base"
                    placeholder="مثلاً: 2,000,000"
                    value={planTotal}
                    onChange={(e) => setPlanTotal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3">عدد الدفعات (أشهر)</label>
                  <div className="flex gap-2">
                    {['4', '6', '10'].map(num => (
                      <button 
                        key={num}
                        onClick={() => setPlanCount(num)}
                        className={`flex-1 py-3 rounded-xl font-bold text-xs md:text-sm transition-all ${planCount === num ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        {num}
                      </button>
                    ))}
                    <input 
                      type="number"
                      className="w-16 md:w-20 px-2 md:px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white text-center text-xs md:text-sm"
                      value={planCount}
                      onChange={(e) => setPlanCount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[10px] md:text-xs font-bold text-slate-500 mb-2">
                    <span>قيمة الدفعة الواحدة:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {Math.round((parseFloat(planTotal) || 0) / (parseInt(planCount) || 1)).toLocaleString()} د.ع
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-2 md:pt-4">
                  <button 
                    onClick={() => setShowPlanModal(false)}
                    className="flex-1 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold text-sm"
                  >
                    إلغاء
                  </button>
                  <button 
                    disabled={loading || !planTotal || !planCount}
                    onClick={handleGeneratePlan}
                    className="flex-[2] py-3 md:py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 text-sm"
                  >
                    {loading ? 'جاري الإنشاء...' : 'بدء خطة التقسيط'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTuitionSettings && profile?.schoolId && (
          <TuitionSettingsModal
            onClose={() => setShowTuitionSettings(false)}
            classes={classes}
            students={students}
            schoolId={profile.schoolId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

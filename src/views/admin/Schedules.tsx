import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Calendar, Save, Printer, Share2, Plus, Trash2, Clock, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { printElement } from '../../lib/printUtils';

const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

export default function Schedules() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedule, setSchedule] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!profile?.schoolId) return;
    
    // Listen for classes
    const classesQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsubscribeClasses = onSnapshot(classesQ, (snapshot) => {
      const clsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(clsData);
      
      // Select first class if none selected
      if (!selectedClassId && clsData.length > 0) {
        setSelectedClassId(clsData[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'Schedules:classes');
    });

    return () => {
      unsubscribeClasses();
    };
  }, [profile]);

  // Load schedule when class changes
  useEffect(() => {
    if (selectedClassId) {
      const cls = classes.find(c => c.id === selectedClassId);
      if (cls && cls.schedule) {
        setSchedule(cls.schedule);
      } else {
        setSchedule({}); // Empty schedule
      }
    }
  }, [selectedClassId, classes]);

  const handleUpdatePeriod = (day: string, periodIndex: number, field: string, value: string) => {
    setSchedule((prev: any) => {
      const newSchedule = { ...prev };
      if (!newSchedule[day]) newSchedule[day] = [];
      
      // Ensure array has enough elements
      while (newSchedule[day].length <= periodIndex) {
        newSchedule[day].push({ subject: '', teacher: '', time: '' });
      }
      
      newSchedule[day][periodIndex] = {
        ...newSchedule[day][periodIndex],
        [field]: value
      };
      
      return newSchedule;
    });
  };

  const handleAddPeriod = (day: string) => {
    setSchedule((prev: any) => {
      const newSchedule = { ...prev };
      if (!newSchedule[day]) newSchedule[day] = [];
      newSchedule[day].push({ subject: '', teacher: '', time: '' });
      return newSchedule;
    });
  };

  const handleRemovePeriod = (day: string, periodIndex: number) => {
    setSchedule((prev: any) => {
      const newSchedule = { ...prev };
      if (newSchedule[day]) {
        newSchedule[day] = newSchedule[day].filter((_: any, idx: number) => idx !== periodIndex);
      }
      return newSchedule;
    });
  };

  const handleSave = async () => {
    if (!selectedClassId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'classes', selectedClassId), {
        schedule,
        updatedAt: serverTimestamp()
      });
      toast.success('تم حفظ الجدول بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
      toast.error('حدث خطأ أثناء حفظ الجدول');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!selectedClassId) return;
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return;
    setIsSharing(true);
    try {
      const annRef = await addDoc(collection(db, 'announcements'), {
        title: `تحديث الجدول الأسبوعي: ${cls.name}`,
        content: `تم تحديث الجدول الأسبوعي الخاص بـ ${cls.name}. يرجى من المعلمين وأولياء الأمور مراجعة الجدول الجديد.`,
        target: 'all',
        schoolId: profile?.schoolId || '',
        authorId: profile?.uid || '',
        authorName: profile?.name || '',
        createdAt: serverTimestamp()
      });
      
      const { notificationService } = await import('../../lib/notificationService');
      await notificationService.notifyAllSchool(profile.schoolId, {
        title: `تحديث الجدول الأسبوعي: ${cls.name}`,
        message: `تم تحديث الجدول الأسبوعي الخاص بـ ${cls.name}. يرجى من المعلمين وأولياء الأمور مراجعة الجدول الجديد.`,
        type: 'announcement',
        schoolId: profile.schoolId,
        metadata: { sourceId: annRef.id, tab: 'schedules' }
      });
      
      toast.success('تم إرسال إشعار للجميع بتحديث الجدول');
      setShowShareModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
      toast.error('حدث خطأ أثناء الإرسال');
    } finally {
      setIsSharing(false);
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrintClick = () => {
    if (!printRef.current) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }
    const title = `جدول-${classes.find(c => c.id === selectedClassId)?.name || 'الدروس'}`;
    const success = printElement(printRef.current, title);
    if (!success) {
      toast.error('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة');
    }
  };

  const handlePrint = () => {
    handlePrintClick();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2rem] border border-blue-500 shadow-xl shadow-blue-500/20 print:hidden text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner">
            <Calendar size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md pb-1">الجداول الاسبوعية</h1>
            <p className="text-sm font-bold text-blue-100 mt-1 max-w-sm leading-relaxed">إدارة وتخصيص الجداول الدراسية. يمكنك إضافة حصص جديدة، تعديل المواد، ومشاركة الجدول مع الجميع.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto z-10">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="flex-1 w-full sm:w-56 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3.5 text-sm font-black text-white focus:ring-4 focus:ring-white/20 outline-none transition-all cursor-pointer appearance-none shadow-inner"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'left 1rem center',
              backgroundSize: '1em'
            }}
          >
            <option value="" disabled className="text-slate-900 font-bold">اختر الصف الأكاديمي...</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id} className="text-slate-900 font-bold">{cls.name}</option>
            ))}
          </select>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedClassId}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-[#0B2345] px-6 py-3.5 rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 font-black shadow-lg shadow-white/10 hover:scale-[1.02] active:scale-95"
            >
              <Save size={18} />
              <span>حفظ</span>
            </button>
            
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!selectedClassId}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3.5 rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 font-black shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95"
              title="مشاركة وإرسال الجدول"
            >
              <Share2 size={18} />
              <span className="hidden md:inline">نشر الجدول</span>
            </button>
            
            <button
              onClick={handlePrint}
              disabled={!selectedClassId}
              className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-3.5 rounded-xl hover:bg-white/20 transition-all disabled:opacity-50 font-black hover:scale-[1.02] active:scale-95"
              title="طباعة الجدول"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Schedule UI */}
      {selectedClassId ? (
        <div ref={printRef} className="bg-transparent md:bg-white dark:md:bg-slate-900 rounded-2xl border-none md:border md:border-slate-100 dark:md:border-slate-800 shadow-none md:shadow-sm overflow-hidden print:shadow-none print:border-none print:bg-transparent" dir="rtl">
          
          <div className="hidden print:block text-center py-6 border-b border-slate-200 dark:border-slate-800 mb-6 font-black text-2xl text-slate-900 dark:text-white">
            الجدول الأسبوعي - {classes.find(c => c.id === selectedClassId)?.name}
          </div>

          {/* Desktop View Table */}
          <div className="hidden md:block overflow-x-auto print:hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-lg w-32 tracking-wide">اليوم</th>
                  <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-lg tracking-wide">الحصص الدراسية (اضغط للإضافة والتعديل)</th>
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.slice(0, 5).map((day) => ( // Sunday to Thursday
                  <tr key={day} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors print:hover:bg-transparent group">
                    <td className="p-5 align-top bg-slate-50/30 dark:bg-slate-800/20">
                      <div className="font-black text-[#0B2345] dark:text-blue-400 text-xl flex items-center h-full pt-4">{day}</div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-4">
                        {(schedule[day] || []).map((period: any, idx: number) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={idx} 
                            className="relative bg-white dark:bg-slate-800/80 rounded-2xl p-5 min-w-[220px] max-w-[220px] shadow-sm border border-slate-200 dark:border-slate-700 group/item hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                          >
                            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-[#0B2345] dark:text-blue-400 font-black rounded-bl-2xl rounded-tr-2xl flex items-center justify-center text-sm">
                              {idx + 1}
                            </div>
                            <button 
                              onClick={() => handleRemovePeriod(day, idx)}
                              className="absolute -top-3 -left-3 bg-red-100 text-red-600 rounded-full p-1.5 opacity-0 group-hover/item:opacity-100 transition-all hover:scale-110 print:hidden hover:bg-red-200 shadow-sm z-10"
                            >
                              <X size={14} />
                            </button>
                            <div className="space-y-4 mt-2">
                              <input 
                                type="text"
                                value={period.subject}
                                onChange={(e) => handleUpdatePeriod(day, idx, 'subject', e.target.value)}
                                placeholder="المادة الدراسية"
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-black text-slate-900 dark:text-white placeholder-slate-400 print:border-none print:text-center text-lg transition-all"
                              />
                              <input 
                                type="text"
                                value={period.teacher}
                                onChange={(e) => handleUpdatePeriod(day, idx, 'teacher', e.target.value)}
                                placeholder="اسم المعلم"
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-sm text-slate-600 dark:text-slate-400 placeholder-slate-400 print:border-none print:text-center transition-all"
                              />
                              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                <Clock size={14} className="text-slate-400 print:hidden"/>
                                <input 
                                  type="text"
                                  value={period.time}
                                  onChange={(e) => handleUpdatePeriod(day, idx, 'time', e.target.value)}
                                  placeholder="وقت الحصة"
                                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-slate-600 dark:text-slate-400 print:text-center placeholder-slate-400"
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                        
                        <button 
                          onClick={() => handleAddPeriod(day)}
                          className="flex flex-col items-center justify-center gap-3 min-w-[220px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#0B2345] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all p-6 print:hidden opacity-70 hover:opacity-100 group/add"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover/add:bg-blue-100 dark:group-hover/add:bg-blue-900/50 group-hover/add:text-[#0B2345] transition-colors">
                            <Plus size={24} />
                          </div>
                          <span className="font-bold">إضافة حصة جديدة</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View List */}
          <div className="md:hidden space-y-6 pb-20 print:hidden">
            {DAYS_OF_WEEK.slice(0, 5).map((day) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#0B2345] rounded-full"></div>
                      {day}
                   </h3>
                   <button 
                     onClick={() => handleAddPeriod(day)}
                     className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#0B2345] dark:text-blue-400 rounded-lg"
                   >
                     <Plus size={20} />
                   </button>
                </div>
                
                <div className="space-y-4">
                   {(schedule[day] || []).map((period: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-[#0B2345] dark:text-blue-400 text-xs font-black rounded-lg flex items-center justify-center">
                               {idx + 1}
                            </span>
                            <button 
                               onClick={() => handleRemovePeriod(day, idx)}
                               className="p-1 text-slate-300 hover:text-red-500"
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                         
                         <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">المادة</label>
                               <input 
                                 type="text"
                                 value={period.subject}
                                 onChange={(e) => handleUpdatePeriod(day, idx, 'subject', e.target.value)}
                                 className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                                 placeholder="اسم المادة"
                               />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                               <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">المعلم</label>
                                  <input 
                                    type="text"
                                    value={period.teacher}
                                    onChange={(e) => handleUpdatePeriod(day, idx, 'teacher', e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none focus:border-blue-500"
                                    placeholder="المعلم"
                                  />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">الوقت</label>
                                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2.5">
                                     <Clock size={12} className="text-slate-400" />
                                     <input 
                                       type="text"
                                       value={period.time}
                                       onChange={(e) => handleUpdatePeriod(day, idx, 'time', e.target.value)}
                                       className="flex-1 bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 dark:text-slate-400"
                                       placeholder="الوقت"
                                     />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                   {(schedule[day] || []).length === 0 && (
                     <div className="py-8 text-center text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">لا توجد حصص مضافة لهذا اليوم</div>
                   )}
                </div>
              </div>
            ))}
          </div>

          {/* Print View Table */}
          <div className="hidden print:block overflow-hidden border-[1.5pt] border-slate-900 bg-white">
            <table className="w-full text-center border-collapse border-[1.5pt] border-slate-900 bg-white">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b-[1.5pt] border-slate-900">
                  <th className="py-4 px-2 font-black text-sm border-l-[1.5pt] border-slate-900 w-32">اليوم / الحصة</th>
                  {Array.from({ length: Math.max(1, ...DAYS_OF_WEEK.slice(0, 5).map(day => (schedule[day] || []).length)) }).map((_, i) => (
                    <th key={i} className="py-4 px-2 font-bold text-sm border-l border-slate-400">
                      الحصة {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {DAYS_OF_WEEK.slice(0, 5).map(day => {
                  const daySchedule = schedule[day] || [];
                  const maxPeriodsInTable = Math.max(1, ...DAYS_OF_WEEK.slice(0, 5).map(d => (schedule[d] || []).length));
                  return (
                    <tr key={day} className="text-slate-900 border-b last:border-b-0 border-slate-400">
                      <td className="py-4 px-2 font-black text-sm bg-slate-50 border-l-[1.5pt] border-slate-900">{day}</td>
                      {Array.from({ length: maxPeriodsInTable }).map((_, i) => {
                        const period = daySchedule[i];
                        return (
                          <td key={i} className="py-3 px-2 align-middle border-l border-slate-400 last:border-l-0">
                            {period ? (
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <span className="font-black text-base">{period.subject || '-'}</span>
                                {period.time && (
                                  <span className="font-bold text-xs text-slate-600 tracking-wider" dir="ltr">{period.time}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-500 font-bold">
          <Calendar size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
          <p>الرجاء إنشاء بعض الصفوف أولاً</p>
        </div>
      )}
      
      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 print:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 md:p-8">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                  <Share2 size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">إرسال تعميم للجميع</h3>
                <p className="text-center text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-8">
                  إرسال إشعار إلى جميع المعلمين وأولياء الأمور لإبلاغهم بتحديث الجدول الدراسي الخاص بـ 
                  <span className="text-emerald-600 dark:text-emerald-400 mx-1">
                    {classes.find(c => c.id === selectedClassId)?.name}
                  </span>.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSharing ? 'جاري الإرسال...' : 'تأكيد الإرسال'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:text-center { text-align: center !important; }
          input::placeholder { color: transparent !important; }
        }
      `}} />
    </div>
  );
}

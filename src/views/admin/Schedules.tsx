import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { CalendarDays, Save, Printer, Share2, Plus, Trash2, Clock, GraduationCap, LayoutGrid, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { printElement } from '../../lib/printUtils';
import { useMobileMockupShell } from '../../lib/useMobileMockupShell';

const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

// School week (Sunday → Thursday)
const SCHOOL_DAYS = DAYS_OF_WEEK.slice(0, 5);

interface Period {
  subject: string;
  teacher: string;
  time: string;
}

export default function Schedules() {
  const { profile } = useAuth();
  const inApp = useMobileMockupShell();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedule, setSchedule] = useState<Record<string, Period[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.schoolId) return;

    const classesQ = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId));
    const unsubscribeClasses = onSnapshot(classesQ, (snapshot) => {
      const clsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClasses(clsData);
      setSelectedClassId(prev => (prev || (clsData.length > 0 ? clsData[0].id : '')));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'Schedules:classes');
    });

    return () => unsubscribeClasses();
  }, [profile]);

  // Load schedule when the selected class changes (and stay in sync with remote updates
  // unless the user has unsaved local edits).
  useEffect(() => {
    if (!selectedClassId) return;
    const cls = classes.find(c => c.id === selectedClassId);
    if (!isDirty) {
      setSchedule(cls?.schedule || {});
    }
  }, [selectedClassId, classes, isDirty]);

  const totalPeriods = SCHOOL_DAYS.reduce((sum, day) => sum + (schedule[day]?.length || 0), 0);
  const activeDays = SCHOOL_DAYS.filter(day => (schedule[day]?.length || 0) > 0).length;
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleUpdatePeriod = (day: string, periodIndex: number, field: keyof Period, value: string) => {
    setIsDirty(true);
    setSchedule((prev) => {
      const newSchedule: Record<string, Period[]> = { ...prev };
      const dayArr = [...(newSchedule[day] || [])];
      while (dayArr.length <= periodIndex) dayArr.push({ subject: '', teacher: '', time: '' });
      dayArr[periodIndex] = { ...dayArr[periodIndex], [field]: value };
      newSchedule[day] = dayArr;
      return newSchedule;
    });
  };

  const handleAddPeriod = (day: string) => {
    setIsDirty(true);
    setSchedule((prev) => {
      const newSchedule: Record<string, Period[]> = { ...prev };
      newSchedule[day] = [...(newSchedule[day] || []), { subject: '', teacher: '', time: '' }];
      return newSchedule;
    });
  };

  const handleRemovePeriod = (day: string, periodIndex: number) => {
    setIsDirty(true);
    setSchedule((prev) => {
      const newSchedule: Record<string, Period[]> = { ...prev };
      newSchedule[day] = (newSchedule[day] || []).filter((_, idx) => idx !== periodIndex);
      return newSchedule;
    });
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      toast.error('اختر صفاً أولاً');
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'classes', selectedClassId), {
        schedule,
        updatedAt: serverTimestamp()
      });
      setIsDirty(false);
      toast.success('تم حفظ الجدول ومزامنته بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'classes');
      toast.error('حدث خطأ أثناء حفظ الجدول');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!selectedClassId || !selectedClass) return;
    setIsSharing(true);
    try {
      const annRef = await addDoc(collection(db, 'announcements'), {
        title: `تحديث الجدول الأسبوعي: ${selectedClass.name}`,
        content: `تم تحديث الجدول الأسبوعي الخاص بـ ${selectedClass.name}. يرجى من المعلمين وأولياء الأمور مراجعة الجدول الجديد.`,
        target: 'all',
        schoolId: profile?.schoolId || '',
        authorId: profile?.uid || '',
        authorName: profile?.name || '',
        createdAt: serverTimestamp()
      });

      const { notificationService } = await import('../../lib/notificationService');
      await notificationService.notifyAllSchool(profile!.schoolId, {
        title: `تحديث الجدول الأسبوعي: ${selectedClass.name}`,
        message: `تم تحديث الجدول الأسبوعي الخاص بـ ${selectedClass.name}. يرجى من المعلمين وأولياء الأمور مراجعة الجدول الجديد.`,
        type: 'announcement',
        schoolId: profile!.schoolId,
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

  const handlePrint = () => {
    if (!printRef.current) {
      toast.error('لا توجد بيانات للطباعة');
      return;
    }
    const title = `جدول-${selectedClass?.name || 'الدروس'}`;
    const success = printElement(printRef.current, title);
    if (!success) {
      toast.error('يرجى السماح بالنوافذ المنبثقة (Pop-ups) للطباعة');
    }
  };

  return (
    <div className={`${inApp ? 'p-0' : 'p-4 md:p-6'} max-w-[1500px] mx-auto space-y-5`} dir="rtl">
      {/* ===== Premium Header ===== */}
      <div className={`relative overflow-hidden text-white print:hidden ${
        inApp ? 'rounded-[1.5rem] p-4' : 'rounded-[2rem] p-6 md:p-8'
      } bg-gradient-to-br from-[#0B2345] via-[#12325c] to-[#0B2345] shadow-xl shadow-[#0B2345]/20`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(212,166,74,0.22),transparent)]" />
        <div className="absolute -bottom-12 -left-10 w-44 h-44 rounded-full bg-[#D4A64A]/10 blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4A64A]/60 to-transparent" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`${inApp ? 'w-12 h-12' : 'w-16 h-16'} rounded-2xl bg-white/12 backdrop-blur-xl border border-white/20 flex items-center justify-center shrink-0 shadow-inner`}>
              <CalendarDays size={inApp ? 24 : 32} className="text-[#D4A64A]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-[#D4A64A] uppercase tracking-[0.25em] mb-1">SchoolixiQ</p>
              <h1 className={`${inApp ? 'text-xl' : 'text-3xl'} font-black tracking-tight leading-none`}>الجداول الأسبوعية</h1>
              {!inApp && (
                <p className="text-sm font-semibold text-blue-100/80 mt-2 max-w-md leading-relaxed">
                  صمّم وأدِر الجداول الدراسية لكل صف، وشاركها فوراً مع المعلمين وأولياء الأمور.
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          {selectedClassId && (
            <div className="flex items-center gap-2.5 shrink-0">
              <StatChip icon={<LayoutGrid size={16} />} label="إجمالي الحصص" value={totalPeriods} />
              <StatChip icon={<CalendarDays size={16} />} label="أيام فعّالة" value={`${activeDays}/5`} />
            </div>
          )}
        </div>
      </div>

      {/* ===== Toolbar ===== */}
      <div className={`flex flex-col sm:flex-row gap-3 print:hidden ${inApp ? '' : 'items-stretch sm:items-center'}`}>
        {/* Class selector */}
        <div className="relative flex-1 min-w-0">
          <GraduationCap size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B2345] dark:text-blue-400 pointer-events-none" />
          <select
            value={selectedClassId}
            onChange={(e) => { setIsDirty(false); setSelectedClassId(e.target.value); }}
            className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pr-11 pl-10 py-3.5 text-sm font-black text-slate-900 dark:text-white focus:ring-4 focus:ring-[#0B2345]/10 focus:border-[#0B2345] outline-none transition-all cursor-pointer shadow-sm"
          >
            <option value="" disabled>اختر الصف الأكاديمي...</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>

        {/* Actions (web / tablet). The app gets a fixed bottom bar instead. */}
        {!inApp && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedClassId}
              className="flex items-center justify-center gap-2 bg-[#0B2345] text-white px-6 py-3.5 rounded-2xl hover:bg-[#12325c] transition-all disabled:opacity-50 font-black shadow-lg shadow-[#0B2345]/20 hover:scale-[1.02] active:scale-95"
            >
              <Save size={18} />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ الجدول'}</span>
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!selectedClassId}
              className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 font-black shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-95"
              title="نشر الجدول"
            >
              <Share2 size={18} />
              <span className="hidden lg:inline">نشر</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!selectedClassId}
              className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 font-black hover:scale-[1.02] active:scale-95"
              title="طباعة"
            >
              <Printer size={18} />
            </button>
          </div>
        )}
      </div>

      {/* ===== Schedule grid ===== */}
      {selectedClassId ? (
        <div ref={printRef}>
          {/* Print title */}
          <div className="hidden print:block text-center py-6 mb-6 border-b border-slate-300 font-black text-2xl text-slate-900">
            الجدول الأسبوعي - {selectedClass?.name}
          </div>

          {/* Editable weekly grid (screen) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 ${inApp ? 'pb-28' : ''} print:hidden`}>
            {SCHOOL_DAYS.map((day, dayIndex) => {
              const periods = schedule[day] || [];
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.04 }}
                  className="flex flex-col rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  {/* Day header */}
                  <div className="relative px-4 py-3 bg-gradient-to-l from-[#0B2345] to-[#12325c] text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-[11px] font-black text-[#D4A64A]">
                        {dayIndex + 1}
                      </span>
                      <h3 className="font-black text-base tracking-tight !text-white">{day}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-white bg-white/12 border border-white/15 rounded-full px-2.5 py-1">
                      {periods.length} حصة
                    </span>
                  </div>

                  {/* Periods */}
                  <div className="flex-1 p-3 space-y-2.5 bg-slate-50/40 dark:bg-slate-950/30">
                    {periods.map((period, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 shadow-sm hover:border-[#0B2345]/40 dark:hover:border-blue-500/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="w-6 h-6 rounded-lg bg-[#0B2345]/5 dark:bg-blue-900/30 text-[#0B2345] dark:text-blue-400 text-[11px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <button
                            onClick={() => handleRemovePeriod(day, idx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 transition-colors"
                            title="حذف الحصة"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="relative">
                            <BookOpen size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                              type="text"
                              value={period.subject}
                              onChange={(e) => handleUpdatePeriod(day, idx, 'subject', e.target.value)}
                              placeholder="المادة الدراسية"
                              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2.5 text-sm font-black text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[#0B2345] focus:ring-2 focus:ring-[#0B2345]/10 transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={period.teacher}
                              onChange={(e) => handleUpdatePeriod(day, idx, 'teacher', e.target.value)}
                              placeholder="المعلم"
                              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none focus:border-[#0B2345] transition-all"
                            />
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 focus-within:border-[#0B2345] transition-all">
                              <Clock size={12} className="text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={period.time}
                                onChange={(e) => handleUpdatePeriod(day, idx, 'time', e.target.value)}
                                placeholder="الوقت"
                                className="w-full min-w-0 bg-transparent border-none outline-none text-[11px] font-bold text-slate-600 dark:text-slate-300 placeholder-slate-400"
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {periods.length === 0 && (
                      <div className="py-5 text-center text-slate-400 dark:text-slate-600 text-[11px] font-bold">
                        لا توجد حصص بعد
                      </div>
                    )}

                    <button
                      onClick={() => handleAddPeriod(day)}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#0B2345] dark:hover:text-blue-400 hover:border-[#0B2345]/40 hover:bg-[#0B2345]/5 dark:hover:bg-blue-900/10 transition-all py-2.5 font-black text-xs active:scale-95"
                    >
                      <Plus size={16} />
                      إضافة حصة
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Print view (print only) */}
          <div className="hidden print:block border-[1.5pt] border-slate-900">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-[1.5pt] border-slate-900">
                  <th className="py-4 px-2 font-black text-sm border-l-[1.5pt] border-slate-900 w-28">اليوم</th>
                  {Array.from({ length: Math.max(1, ...SCHOOL_DAYS.map(d => (schedule[d] || []).length)) }).map((_, i) => (
                    <th key={i} className="py-4 px-2 font-bold text-sm border-l border-slate-400">الحصة {i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {SCHOOL_DAYS.map(day => {
                  const daySchedule = schedule[day] || [];
                  const maxPeriods = Math.max(1, ...SCHOOL_DAYS.map(d => (schedule[d] || []).length));
                  return (
                    <tr key={day} className="text-slate-900 border-b last:border-b-0 border-slate-400">
                      <td className="py-4 px-2 font-black text-sm bg-slate-50 border-l-[1.5pt] border-slate-900">{day}</td>
                      {Array.from({ length: maxPeriods }).map((_, i) => {
                        const period = daySchedule[i];
                        return (
                          <td key={i} className="py-3 px-2 align-middle border-l border-slate-400 last:border-l-0">
                            {period ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-black text-base">{period.subject || '-'}</span>
                                {period.time && <span className="font-bold text-xs text-slate-600" dir="ltr">{period.time}</span>}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 text-center print:hidden">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
            <CalendarDays size={32} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">لا توجد صفوف بعد</h3>
          <p className="text-sm font-bold text-slate-400">أنشئ صفاً أولاً من قسم "الصفوف" لتتمكن من إعداد جدوله الأسبوعي.</p>
        </div>
      )}

      {/* ===== App fixed action bar ===== */}
      {inApp && selectedClassId && (
        <div className="fixed bottom-[84px] inset-x-0 z-[55] px-3 pointer-events-none">
          <div className="pointer-events-auto flex gap-2 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-lg">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 min-h-[46px] rounded-xl bg-gradient-to-b from-[#12325c] to-[#0B2345] text-white text-sm font-black disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Save size={18} />
              {isSaving ? 'جاري الحفظ...' : 'حفظ الجدول'}
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="min-h-[46px] px-4 rounded-xl bg-emerald-500 text-white font-black active:scale-95 transition-transform"
              title="نشر الجدول"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[46px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black active:scale-95 transition-transform"
              title="طباعة"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ===== Share modal ===== */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
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
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 -rotate-6">
                  <Share2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">نشر الجدول للجميع</h3>
                <p className="text-center text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-8">
                  سيتم إرسال إشعار إلى جميع المعلمين وأولياء الأمور بتحديث جدول
                  <span className="text-emerald-600 dark:text-emerald-400 mx-1">{selectedClass?.name}</span>.
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

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}} />
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2.5">
      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#D4A64A]">
        {icon}
      </div>
      <div className="leading-none">
        <p className="text-[9px] font-bold text-blue-100/70 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-base font-black text-white">{value}</p>
      </div>
    </div>
  );
}

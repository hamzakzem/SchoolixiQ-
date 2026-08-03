import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { useLanguage } from '../../lib/LanguageContext';
import { Calendar, Save, Printer, Share2, Plus, Trash2, Clock, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { AppModalPortal } from '../../components/AppModalPortal';
import { printElement } from '../../lib/printUtils';

/** Firestore schedule keys remain Arabic day names — display labels are presentation-only. */
const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
] as const;

const DAY_LABEL_EN: Record<string, string> = {
  الأحد: 'Sunday',
  الإثنين: 'Monday',
  الثلاثاء: 'Tuesday',
  الأربعاء: 'Wednesday',
  الخميس: 'Thursday',
  الجمعة: 'Friday',
  السبت: 'Saturday',
};

const WORK_DAYS = DAYS_OF_WEEK.slice(0, 5);

export default function Schedules() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const dayLabel = (day: string) => (isRtl ? day : DAY_LABEL_EN[day] || day);
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
        metadata: { sourceId: annRef.id, routeTarget: 'announcements' }
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3.5 rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 font-black shadow-lg shadow-white/10 hover:scale-[1.02] active:scale-95"
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

      {/* Schedule UI — presentation only */}
      {selectedClassId ? (
        <div
          ref={printRef}
          className="sx-schedule print:shadow-none print:border-none print:bg-transparent"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="hidden print:block text-center py-6 mb-6 font-black text-2xl text-slate-900">
            {isRtl ? 'الجدول الأسبوعي' : 'Weekly Schedule'} - {classes.find(c => c.id === selectedClassId)?.name}
          </div>

          {/* Desktop weekly grid */}
          <div className="sx-schedule__desktop sx-schedule__panel print:hidden">
            <table className="sx-schedule__table">
              <thead>
                <tr>
                  <th scope="col">{isRtl ? 'اليوم' : 'Day'}</th>
                  <th scope="col">{isRtl ? 'الحصص الدراسية' : 'Class periods'}</th>
                </tr>
              </thead>
              <tbody>
                {WORK_DAYS.map((day) => {
                  const periods = schedule[day] || [];
                  return (
                    <tr key={day}>
                      <td className="sx-schedule__day-cell">{dayLabel(day)}</td>
                      <td>
                        <div className="sx-schedule__desktop-periods">
                          {periods.map((period: any, idx: number) => (
                            <div key={idx} className="sx-schedule__period group/item">
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className="sx-schedule__period-num">{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePeriod(day, idx)}
                                  className="sx-schedule__remove-btn print:hidden"
                                  aria-label={isRtl ? 'حذف الحصة' : 'Remove period'}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <div className="space-y-3">
                                <div className="sx-schedule__field">
                                  <label className="sx-schedule__label">{isRtl ? 'المادة' : 'Subject'}</label>
                                  <input
                                    type="text"
                                    value={period.subject}
                                    onChange={(e) => handleUpdatePeriod(day, idx, 'subject', e.target.value)}
                                    placeholder={isRtl ? 'المادة الدراسية' : 'Subject'}
                                    className="sx-schedule__input"
                                  />
                                </div>
                                <div className="sx-schedule__field">
                                  <label className="sx-schedule__label">{isRtl ? 'المعلم' : 'Teacher'}</label>
                                  <input
                                    type="text"
                                    value={period.teacher}
                                    onChange={(e) => handleUpdatePeriod(day, idx, 'teacher', e.target.value)}
                                    placeholder={isRtl ? 'اسم المعلم' : 'Teacher name'}
                                    className="sx-schedule__input sx-schedule__input--sm"
                                  />
                                </div>
                                <div className="sx-schedule__field">
                                  <label className="sx-schedule__label">{isRtl ? 'الوقت' : 'Time'}</label>
                                  <div className="relative">
                                    <Clock size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none print:hidden" />
                                    <input
                                      type="text"
                                      value={period.time}
                                      onChange={(e) => handleUpdatePeriod(day, idx, 'time', e.target.value)}
                                      placeholder={isRtl ? 'وقت الحصة' : 'Period time'}
                                      className="sx-schedule__input sx-schedule__input--time ps-9"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddPeriod(day)}
                            className="sx-schedule__add-tile print:hidden"
                          >
                            <Plus size={22} />
                            <span>{isRtl ? 'إضافة حصة' : 'Add period'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile + tablet day cards */}
          <div className="sx-schedule__mobile sx-schedule__stack pb-16 print:hidden">
            {WORK_DAYS.map((day) => {
              const periods = schedule[day] || [];
              return (
                <section key={day} className="sx-schedule__day-card">
                  <div className="sx-schedule__day-head">
                    <div>
                      <h3 className="sx-schedule__day-name">{dayLabel(day)}</h3>
                      <p className="sx-schedule__day-count">
                        {periods.length === 0
                          ? (isRtl ? 'لا حصص بعد' : 'No periods yet')
                          : (isRtl ? `${periods.length} حصص` : `${periods.length} periods`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddPeriod(day)}
                      className="sx-schedule__add-btn"
                      aria-label={isRtl ? 'إضافة حصة' : 'Add period'}
                    >
                      <Plus size={18} />
                      <span className="hidden sm:inline">{isRtl ? 'إضافة' : 'Add'}</span>
                    </button>
                  </div>

                  <div className="sx-schedule__periods sx-schedule__periods--edit">
                    {periods.map((period: any, idx: number) => (
                      <div key={idx} className="sx-schedule__period">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="sx-schedule__period-num">{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePeriod(day, idx)}
                            className="sx-schedule__remove-btn"
                            aria-label={isRtl ? 'حذف الحصة' : 'Remove period'}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="sx-schedule__field">
                            <label className="sx-schedule__label">{isRtl ? 'المادة' : 'Subject'}</label>
                            <input
                              type="text"
                              value={period.subject}
                              onChange={(e) => handleUpdatePeriod(day, idx, 'subject', e.target.value)}
                              className="sx-schedule__input"
                              placeholder={isRtl ? 'اسم المادة' : 'Subject'}
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sx-schedule__field">
                              <label className="sx-schedule__label">{isRtl ? 'المعلم' : 'Teacher'}</label>
                              <input
                                type="text"
                                value={period.teacher}
                                onChange={(e) => handleUpdatePeriod(day, idx, 'teacher', e.target.value)}
                                className="sx-schedule__input sx-schedule__input--sm"
                                placeholder={isRtl ? 'المعلم' : 'Teacher'}
                              />
                            </div>
                            <div className="sx-schedule__field">
                              <label className="sx-schedule__label">{isRtl ? 'الوقت' : 'Time'}</label>
                              <div className="relative">
                                <Clock size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={period.time}
                                  onChange={(e) => handleUpdatePeriod(day, idx, 'time', e.target.value)}
                                  className="sx-schedule__input sx-schedule__input--time ps-9"
                                  placeholder={isRtl ? 'الوقت' : 'Time'}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {periods.length === 0 && (
                      <div className="sx-schedule__empty sm:col-span-2">
                        <Calendar size={28} strokeWidth={1.75} />
                        <p className="sx-schedule__empty-title">
                          {isRtl ? 'لا توجد حصص لهذا اليوم' : 'No classes for this day'}
                        </p>
                        <p className="sx-schedule__empty-text">
                          {isRtl ? 'اضغط إضافة لبدء بناء جدول اليوم.' : 'Tap Add to start building this day’s schedule.'}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Print View Table */}
          <div className="hidden print:block overflow-hidden border-[1.5pt] border-slate-900 bg-white">
            <table className="w-full text-center border-collapse border-[1.5pt] border-slate-900 bg-white">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b-[1.5pt] border-slate-900">
                  <th className="py-4 px-2 font-black text-sm border-l-[1.5pt] border-slate-900 w-32">
                    {isRtl ? 'اليوم / الحصة' : 'Day / Period'}
                  </th>
                  {Array.from({ length: Math.max(1, ...WORK_DAYS.map(day => (schedule[day] || []).length)) }).map((_, i) => (
                    <th key={i} className="py-4 px-2 font-bold text-sm border-l border-slate-400">
                      {isRtl ? `الحصة ${i + 1}` : `Period ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-400">
                {WORK_DAYS.map(day => {
                  const daySchedule = schedule[day] || [];
                  const maxPeriodsInTable = Math.max(1, ...WORK_DAYS.map(d => (schedule[d] || []).length));
                  return (
                    <tr key={day} className="text-slate-900 border-b last:border-b-0 border-slate-400">
                      <td className="py-4 px-2 font-black text-sm bg-slate-50 border-l-[1.5pt] border-slate-900">{dayLabel(day)}</td>
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
        <div className="sx-schedule">
          <div className="sx-schedule__empty">
            <Calendar size={40} strokeWidth={1.75} />
            <p className="sx-schedule__empty-title">
              {isRtl ? 'لا توجد صفوف بعد' : 'No classes yet'}
            </p>
            <p className="sx-schedule__empty-text">
              {isRtl ? 'أنشئ صفوفاً أولاً لبدء إعداد الجدول الأسبوعي.' : 'Create classes first to set up the weekly schedule.'}
            </p>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      <AppModalPortal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        dir={isRtl ? 'rtl' : 'ltr'}
        size="sm"
        ariaLabel={isRtl ? 'إرسال تعميم للجميع' : 'Share schedule update'}
      >
        <div className="print:hidden">
          <div className="sx-app-modal-panel__header">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 transform -rotate-6">
                <Share2 size={24} />
              </div>
              <div>
                <h3 className="sx-app-modal-panel__title">إرسال تعميم للجميع</h3>
                <p className="sx-app-modal-panel__subtitle">
                  {classes.find(c => c.id === selectedClassId)?.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="sx-app-modal-panel__close"
              onClick={() => setShowShareModal(false)}
              aria-label={isRtl ? 'إغلاق' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
          <div className="sx-app-modal-panel__body">
            <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-center">
              إرسال إشعار إلى جميع المعلمين وأولياء الأمور لإبلاغهم بتحديث الجدول الدراسي الخاص بـ{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {classes.find(c => c.id === selectedClassId)?.name}
              </span>.
            </p>
          </div>
          <div className="sx-app-modal-panel__footer flex flex-col sm:flex-row gap-3">
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
      </AppModalPortal>

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

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Calendar, CalendarDays, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت'
];

interface ParentSchedulesProps {
  selectedStudent: any;
}

export default function ParentSchedules({ selectedStudent }: ParentSchedulesProps) {
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('');

  useEffect(() => {
    if (!selectedStudent?.schoolId || !selectedStudent?.classId) {
      if (selectedStudent?.class) {
        // Fallback to searching by class name if classId is not available
        const classesQ = query(
          collection(db, 'classes'),
          where('schoolId', '==', selectedStudent.schoolId),
          where('name', '==', selectedStudent.class)
        );
        const unsubscribe = onSnapshot(classesQ, (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setSchedule(data.schedule || {});
            setClassName(data.name || '');
          } else {
            setSchedule({});
            setClassName(selectedStudent.class);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'ParentSchedules:classes');
          setLoading(false);
        });
        return unsubscribe;
      }
      setLoading(false);
      return;
    }

    const classesQ = query(
      collection(db, 'classes'),
      where('schoolId', '==', selectedStudent.schoolId)
    );
    
    // In Parent view, we get all classes for the school (since we might not have a direct doc listener if we don't know the ID exactly, or we can filter client-side)
    // Assuming the user has access. Alternatively, query by doc(db, 'classes', selectedStudent.classId)
    // But since the parent might not have direct get access to the specific class doc unless rule allows, we use list with schoolId (which is allowed)
    const unsubscribe = onSnapshot(classesQ, (snapshot) => {
      const clsDoc = snapshot.docs.find(d => d.id === selectedStudent.classId || d.data().name === selectedStudent.class);
      if (clsDoc) {
        setSchedule(clsDoc.data().schedule || {});
        setClassName(clsDoc.data().name || '');
      } else {
        setSchedule({});
        setClassName(selectedStudent.class || '');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ParentSchedules:classes');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedStudent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!schedule || Object.keys(schedule).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-slate-500 font-bold">
        <Calendar size={64} className="text-slate-300 dark:text-slate-700 mb-6" />
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">لا يوجد جدول متاح</h3>
        <p>لم يتم إضافة جدول دراسي لهذا الصف حتى الآن.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Premium header */}
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 md:p-6 text-white bg-gradient-to-br from-[#0B2345] via-[#12325c] to-[#0B2345] shadow-xl shadow-[#0B2345]/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(212,166,74,0.22),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4A64A]/60 to-transparent" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/12 backdrop-blur-xl border border-white/20 flex items-center justify-center shrink-0">
              <CalendarDays size={24} className="text-[#D4A64A]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-[#D4A64A] uppercase tracking-[0.25em] mb-1">SchoolixiQ</p>
              <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none">الجدول الأسبوعي</h2>
            </div>
          </div>
          {className && (
            <div className="bg-white/12 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black border border-white/20 shrink-0">
              {className}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {DAYS_OF_WEEK.slice(0, 5).map((day, dayIndex) => {
          const periods = schedule[day] || [];

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.04 }}
              className="flex flex-col rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 bg-gradient-to-l from-[#0B2345] to-[#12325c] text-white flex items-center justify-between">
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

              <div className="flex-1 p-3 space-y-2.5 bg-slate-50/40 dark:bg-slate-950/30">
                {periods.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 dark:text-slate-600 text-[11px] font-bold">
                    لا توجد حصص لهذا اليوم
                  </div>
                ) : (
                  periods.map((period: any, idx: number) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      key={idx}
                      className="relative rounded-2xl bg-white dark:bg-slate-900 p-3.5 pr-12 border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                      <div className="absolute top-0 right-0 w-8 h-8 bg-[#0B2345]/5 dark:bg-blue-900/40 text-[#0B2345] dark:text-blue-400 font-black rounded-bl-2xl rounded-tr-2xl flex items-center justify-center text-sm">
                        {idx + 1}
                      </div>
                      <div className="space-y-2">
                        <div className="font-black text-slate-900 dark:text-white text-base leading-tight">{period.subject || 'بدون مادة'}</div>
                        {period.teacher && (
                          <div className="font-bold text-xs text-slate-600 dark:text-slate-400">{period.teacher}</div>
                        )}
                        {period.time && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 w-fit">
                            <Clock size={11} className="text-slate-400" />
                            <span dir="ltr">{period.time}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

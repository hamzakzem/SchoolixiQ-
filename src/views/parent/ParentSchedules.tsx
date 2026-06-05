import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Calendar, Clock } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-display">الجدول الأسبوعي</h2>
        <div className="bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 transition-colors">
          صف: {className}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-lg w-32 tracking-wide">اليوم</th>
                <th className="p-5 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black text-lg tracking-wide">الحصص الدراسية</th>
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.slice(0, 5).map((day) => {
                const periods = schedule[day] || [];
                if (periods.length === 0) return null;

                return (
                  <tr key={day} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 align-top bg-slate-50/30 dark:bg-slate-800/20">
                      <div className="font-black text-blue-600 dark:text-blue-400 text-xl flex items-center h-full pt-2">{day}</div>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-4">
                        {periods.map((period: any, idx: number) => (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            key={idx} 
                            className="relative bg-white dark:bg-slate-800/80 rounded-2xl p-5 min-w-[200px] border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                          >
                            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-black rounded-bl-2xl rounded-tr-2xl flex items-center justify-center text-sm">
                              {idx + 1}
                            </div>
                            <div className="space-y-3 mt-2 pr-2">
                              <div className="font-black text-slate-900 dark:text-white text-lg">{period.subject || 'بدون مادة'}</div>
                              {period.teacher && (
                                <div className="font-bold text-sm text-slate-600 dark:text-slate-400">{period.teacher}</div>
                              )}
                              {period.time && (
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <Clock size={12} className="text-slate-400" />
                                  <span>{period.time}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

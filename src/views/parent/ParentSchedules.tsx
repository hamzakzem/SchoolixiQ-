import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Calendar, Clock, UserRound } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useLanguage } from '../../lib/LanguageContext';

/** Firestore schedule keys remain Arabic day names — display labels are presentation-only. */
const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
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

interface ParentSchedulesProps {
  selectedStudent: any;
}

export default function ParentSchedules({ selectedStudent }: ParentSchedulesProps) {
  const { isRtl } = useLanguage();
  const [schedule, setSchedule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('');

  const dayLabel = (day: string) => (isRtl ? day : DAY_LABEL_EN[day] || day);

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
      <div className="sx-schedule flex items-center justify-center p-12" dir={isRtl ? 'rtl' : 'ltr'}>
        <div
          className="w-11 h-11 rounded-full border-[3px] border-[color:var(--sx-sch-navy,#0b1f3a)] border-t-transparent animate-spin"
          aria-label={isRtl ? 'جاري التحميل' : 'Loading'}
        />
      </div>
    );
  }

  const hasAnyPeriod = WORK_DAYS.some((day) => (schedule?.[day] || []).length > 0);

  if (!schedule || !hasAnyPeriod) {
    return (
      <div className="sx-schedule" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="sx-schedule__empty">
          <Calendar size={40} strokeWidth={1.75} />
          <h3 className="sx-schedule__empty-title">
            {isRtl ? 'لا يوجد جدول متاح' : 'No schedule available'}
          </h3>
          <p className="sx-schedule__empty-text">
            {isRtl
              ? 'لم يتم إضافة جدول دراسي لهذا الصف حتى الآن.'
              : 'A weekly schedule has not been added for this class yet.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sx-schedule space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="sx-schedule__title">
          {isRtl ? 'الجدول الأسبوعي' : 'Weekly Schedule'}
        </h2>
        {className ? (
          <span className="sx-schedule__badge">
            {isRtl ? `صف: ${className}` : `Class: ${className}`}
          </span>
        ) : null}
      </div>

      {/* Desktop weekly grid */}
      <div className="sx-schedule__desktop sx-schedule__panel">
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
              if (periods.length === 0) return null;

              return (
                <tr key={day}>
                  <td className="sx-schedule__day-cell">{dayLabel(day)}</td>
                  <td>
                    <div className="sx-schedule__desktop-periods">
                      {periods.map((period: any, idx: number) => (
                        <article key={idx} className="sx-schedule__period">
                          <div className="flex items-start gap-3">
                            <span className="sx-schedule__period-num">{idx + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="sx-schedule__subject">
                                {period.subject || (isRtl ? 'بدون مادة' : 'No subject')}
                              </div>
                              <div className="sx-schedule__meta">
                                {period.teacher ? (
                                  <span className="sx-schedule__meta-item">
                                    <UserRound size={14} aria-hidden />
                                    <span>{period.teacher}</span>
                                  </span>
                                ) : null}
                                {period.time ? (
                                  <span className="sx-schedule__meta-item" dir="ltr">
                                    <Clock size={14} aria-hidden />
                                    <span>{period.time}</span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile + tablet day cards */}
      <div className="sx-schedule__mobile sx-schedule__stack">
        {WORK_DAYS.map((day) => {
          const periods = schedule[day] || [];
          if (periods.length === 0) return null;

          return (
            <section key={day} className="sx-schedule__day-card">
              <div className="sx-schedule__day-head">
                <h3 className="sx-schedule__day-name">{dayLabel(day)}</h3>
                <span className="sx-schedule__day-count">
                  {isRtl ? `${periods.length} حصص` : `${periods.length} periods`}
                </span>
              </div>
              <div className="sx-schedule__periods">
                {periods.map((period: any, idx: number) => (
                  <article key={idx} className="sx-schedule__period">
                    <div className="flex items-start gap-3">
                      <span className="sx-schedule__period-num">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="sx-schedule__subject">
                          {period.subject || (isRtl ? 'بدون مادة' : 'No subject')}
                        </div>
                        <div className="sx-schedule__meta">
                          {period.teacher ? (
                            <span className="sx-schedule__meta-item">
                              <UserRound size={15} aria-hidden />
                              <span>{period.teacher}</span>
                            </span>
                          ) : null}
                          {period.time ? (
                            <span className="sx-schedule__meta-item" dir="ltr">
                              <Clock size={15} aria-hidden />
                              <span>{period.time}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { useAuth } from '../../lib/AuthContext';
import { ClipboardCheck, Users, Search, CheckCircle2, XCircle, Clock, Save, ChevronRight, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../../lib/notificationService';
import { useLanguage } from '../../lib/LanguageContext';

const AttendanceButton = ({ active, type, onClick, label }: { 
  active: boolean, 
  type: 'present' | 'absent' | 'late' | 'leave', 
  onClick: () => void,
  label: string
}) => {
  const configs = {
    present: { active: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    absent: { active: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
    late: { active: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    leave: { active: 'bg-blue-50 text-blue-700 border-blue-200', icon: ClipboardCheck }
  };
  
  const Icon = configs[type].icon;
  
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
        active ? configs[type].active : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
};

export default function Attendance() {
  const { profile } = useAuth();
  const { t, isRtl, language } = useLanguage();
  const isAdmin = profile?.role === 'admin';

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late' | 'leave'>>({});
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId) return;
    
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'classes'), where('schoolId', '==', profile.schoolId), limit(100));
        const snap = await getDocs(q);
        if (!isMounted) return;
        setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'classes');
      }
    };
    
    fetchClasses();
    return () => { isMounted = false; };
  }, [profile]);

  useEffect(() => {
    if (selectedClassId) {
      setSelectedClass(classes.find(c => c.id === selectedClassId) || null);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes]);

  useEffect(() => {
    let isMounted = true;
    if (!profile?.schoolId || !selectedClassId) return;
    
    const fetchStudents = async () => {
      try {
        const path = 'students';
        const q = query(
          collection(db, path), 
          where('schoolId', '==', profile.schoolId),
          where('classId', '==', selectedClassId),
          limit(500)
        );

        const snap = await getDocs(q);
        if (!isMounted) return;

        const studentData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(studentData);
        
        // Initialize attendance state
        const initialAttendance: Record<string, 'present' | 'absent' | 'late' | 'leave'> = {};
        studentData.forEach(s => {
          initialAttendance[s.id] = 'present';
        });
        setAttendance(initialAttendance);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'Attendance:students');
      }
    };

    fetchStudents();

    return () => { isMounted = false; };
  }, [profile, selectedClassId]);

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'leave') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!profile?.schoolId || !selectedClass) return;
    setLoading(true);
    const path = 'attendance';
    try {
      const attendanceId = `${selectedClassId}_${date}`;
      const { setDoc, doc } = await import('firebase/firestore');
      
      await setDoc(doc(db, path, attendanceId), {
        schoolId: profile.schoolId,
        classId: selectedClassId,
        className: selectedClass?.name,
        date,
        records: attendance,
        recordedBy: profile.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Notify parents for absent or late students
      const studentIds = Object.keys(attendance);
      for (const studentId of studentIds) {
        const status = attendance[studentId];
        if (status === 'absent' || status === 'late') {
          const statusText = status === 'absent' ? t('absent') : status === 'late' ? t('late') : t('leave');
          await notificationService.notifyStudentParents(studentId, {
            title: `${t('attendance')}: ${statusText}`,
            message: `${isRtl ? 'تم تسجيل الطالب كـ' : 'Student recorded as'} ${statusText} ${isRtl ? 'لليوم' : 'for today'} (${date})`,
            type: 'attendance',
            schoolId: profile.schoolId
          });
        }
      }

      toast.success(t('success'));
      setSelectedClass(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
        <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-3xl flex items-center justify-center shadow-inner">
          <XCircle size={48} strokeWidth={1.5} />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isRtl ? "صلاحية محدودة" : "Limited Access"}
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            {isRtl 
              ? "تسجيل الحضور والغياب متاح حصراً لإدارة المدرسة. يرجى التواصل مع الإدارة إذا كنت تعتقد أنك تملك هذا الحق."
              : "Attendance recording is exclusively available to school administration. Please contact the admin if you believe you should have access."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? 'text-right' : 'text-left'}`}>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display">{t('attendance')}</h1>
          <p className="text-slate-500 mt-1">{t('takeAttendance')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
           <Calendar size={18} className="text-slate-400 mx-2" />
           <input 
             type="date" 
             className={`bg-transparent border-none outline-none font-bold text-slate-700 p-1 ${isRtl ? 'text-right' : 'text-left'}`}
             value={date}
             onChange={e => setDate(e.target.value)}
           />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedClass ? (
          <motion.div 
            key="class-selector"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm text-center"
          >
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl">
               <Users size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-slate-900 font-display">{t('selectClassFirst')}</h2>
            <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">{t('browseClassesDesc')}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {classes.map(cls => (
                <button 
                  key={cls.id} 
                  onClick={() => setSelectedClassId(cls.id)}
                  className="group p-6 bg-slate-50 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded-3xl font-bold text-slate-700 hover:text-white transition-all shadow-sm hover:shadow-xl active:scale-95"
                >
                   <span className="block text-xs uppercase tracking-widest opacity-50 mb-1">{t('class')}</span>
                   <span className="text-lg">{cls.name}</span>
                </button>
              ))}
              {classes.length === 0 && (
                 <div className="col-span-full p-12 bg-white rounded-[2rem] border border-dashed border-slate-200 text-center text-slate-400 font-bold">
                   {t('noClassesFound')}
                 </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="student-list"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <div className={`flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
               <button 
                 onClick={() => setSelectedClass(null)}
                 className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-900"
               >
                 <ChevronRight size={24} className={isRtl ? '' : 'rotate-180'} />
               </button>
               <div className="h-6 w-px bg-slate-200"></div>
               <div className={`flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                 <h2 className="font-bold text-slate-900">{t('attendance')}: {selectedClass?.name}</h2>
                 <p className="text-xs text-slate-500">{t('todayDate')}: {date}</p>
               </div>
               <button 
                onClick={handleSave}
                disabled={loading || students.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
               >
                 <Save size={18} />
                 {t('saveAttendance')}
               </button>
            </div>
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
               {/* Desktop View */}
               <div className="hidden md:block overflow-x-auto custom-scrollbar">
                 <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                       <tr>
                          <th className="p-5">{t('student')}</th>
                          <th className="p-5 text-center">{t('attendanceStatus')}</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {students.map(student => (
                         <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                               <div className={`flex items-center gap-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                                     {student.photoUrl ? <img src={student.photoUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : student.name[0]}
                                  </div>
                                  <span className="font-bold text-slate-900">{student.name}</span>
                               </div>
                            </td>
                            <td className="p-5">
                               <div className={`flex items-center justify-center gap-2 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                                  <AttendanceButton 
                                    active={attendance[student.id] === 'present'} 
                                    type="present" 
                                    onClick={() => handleStatusChange(student.id, 'present')} 
                                    label={t('present')}
                                  />
                                  <AttendanceButton 
                                    active={attendance[student.id] === 'absent'} 
                                    type="absent" 
                                    onClick={() => handleStatusChange(student.id, 'absent')} 
                                    label={t('absent')}
                                  />
                                  <AttendanceButton 
                                    active={attendance[student.id] === 'late'} 
                                    type="late" 
                                    onClick={() => handleStatusChange(student.id, 'late')} 
                                    label={t('late')}
                                  />
                                  <AttendanceButton 
                                    active={attendance[student.id] === 'leave'} 
                                    type="leave" 
                                    onClick={() => handleStatusChange(student.id, 'leave')} 
                                    label={isRtl ? 'إجازة' : 'Leave'}
                                  />
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>

               {/* Mobile View */}
               <div className="md:hidden divide-y divide-slate-100">
                  {students.map(student => (
                    <div key={student.id} className="p-4 flex flex-col gap-3">
                       <div className={`flex items-center gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold overflow-hidden">
                             {student.photoUrl ? <img src={student.photoUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : student.name[0]}
                          </div>
                          <div className={`flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                             <p className="font-bold text-sm text-slate-900 leading-tight">{student.name}</p>
                             <p className="text-[10px] text-slate-400 font-medium">#{student.registrationNumber || student.id.slice(0,6)}</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                              attendance[student.id] === 'present' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-100'
                            }`}
                          >
                             <CheckCircle2 size={12} /> {t('present')}
                          </button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                              attendance[student.id] === 'absent' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-400 border-slate-100'
                            }`}
                          >
                             <XCircle size={12} /> {t('absent')}
                          </button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                              attendance[student.id] === 'late' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-400 border-slate-100'
                            }`}
                          >
                             <Clock size={12} /> {t('late')}
                          </button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'leave')}
                            className={`py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                              attendance[student.id] === 'leave' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100'
                            }`}
                          >
                             <ClipboardCheck size={12} /> {isRtl ? 'إجازة' : 'Leave'}
                          </button>
                       </div>
                    </div>
                  ))}
               </div>

               {students.length === 0 && (
                  <div className="p-12 text-center text-slate-400 bg-slate-50 italic text-sm">{t('noStudentsInClass')}</div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

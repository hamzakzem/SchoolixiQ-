import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'react-hot-toast';
import { DoorOpen, Megaphone, UserCheck } from 'lucide-react';
import {
  subscribeSchoolDismissals,
  teacherUpdateDismissalStatus,
} from '../../lib/dismissalService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  DISMISSAL_STATUS_LABELS,
  type DismissalRequest,
} from '../../lib/dismissalTypes';
import { teacherHasAssignedClass, TEACHER_NO_CLASS_MSG } from '../../lib/teacherClass';
import DismissalStudentCard from '../../components/dismissal/DismissalStudentCard';

type Props = {
  assignedClassId: string;
  assignedClassName?: string;
  isRtl?: boolean;
};

export default function TeacherDismissalTab({
  assignedClassId,
  assignedClassName,
  isRtl = true,
}: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hasClass = teacherHasAssignedClass(profile as Record<string, unknown>);

  useEffect(() => {
    if (!profile?.schoolId || !assignedClassId) return;
    return subscribeSchoolDismissals(profile.schoolId, setRequests);
  }, [profile?.schoolId, assignedClassId]);

  const classRequests = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.classId === assignedClassId &&
          ACTIVE_DISMISSAL_STATUSES.includes(r.status),
      ),
    [requests, assignedClassId],
  );

  const updateStatus = async (id: string, status: 'called' | 'ready') => {
    if (!profile || !assignedClassId) return;
    setBusyId(id);
    try {
      await teacherUpdateDismissalStatus(id, status, {
        uid: profile.uid,
        name: profile.name || 'معلم',
      }, assignedClassId);
      toast.success(status === 'called' ? 'تم النداء' : 'الطالب جاهز');
    } catch (e: any) {
      toast.error(e.message || 'فشل التحديث');
    } finally {
      setBusyId(null);
    }
  };

  if (!hasClass || !assignedClassId) {
    return (
      <div className="py-20 text-center text-slate-400 font-bold" dir="rtl">
        {TEACHER_NO_CLASS_MSG}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <DoorOpen size={24} />
          {isRtl ? 'طلبات التسريح — صفي' : 'Dismissal requests — my class'}
        </h2>
        <p className="text-sm text-slate-500 font-bold mt-1">
          {isRtl
            ? `الصف المعين: ${assignedClassName || assignedClassId} — طلبات مرتبطة بهذا الصف فقط`
            : `Assigned class: ${assignedClassName || assignedClassId}`}
        </p>
      </div>

      <div className="space-y-4">
        {classRequests.map((r) => (
          <div
            key={r.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <DismissalStudentCard request={r} />
              <p className="text-xs text-slate-500 mt-2">
                ولي الأمر: {r.pickupPersonName || r.parentName || r.requestedByName}
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                {DISMISSAL_STATUS_LABELS[r.status].ar}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              {r.status === 'waiting' && (
                <button
                  onClick={() => updateStatus(r.id, 'called')}
                  disabled={busyId === r.id}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  <Megaphone size={16} />
                  تم النداء
                </button>
              )}
              {(r.status === 'waiting' || r.status === 'called') && (
                <button
                  onClick={() => updateStatus(r.id, 'ready')}
                  disabled={busyId === r.id}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  <UserCheck size={16} />
                  الطالب جاهز
                </button>
              )}
            </div>
          </div>
        ))}
        {classRequests.length === 0 && (
          <p className="text-center text-slate-400 py-16 font-bold">
            {isRtl ? 'لا توجد طلبات تسريح نشطة لصفك' : 'No active dismissal requests for your class'}
          </p>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'react-hot-toast';
import { DoorOpen, QrCode, Clock, CheckCircle } from 'lucide-react';
import {
  createDismissalRequest,
  subscribeParentDismissals,
} from '../../lib/dismissalService';
import {
  DISMISSAL_STATUS_LABELS,
  type DismissalRequest,
} from '../../lib/dismissalTypes';

type StudentOption = {
  id: string;
  name: string;
  classId?: string;
  class?: string;
  className?: string;
};

type Props = {
  students: StudentOption[];
  selectedStudent: StudentOption | null;
  isRtl?: boolean;
};

export default function ParentDismissalTab({
  students,
  selectedStudent,
  isRtl = true,
}: Props) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [pickupName, setPickupName] = useState('');
  const [pickupRelation, setPickupRelation] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastToken, setLastToken] = useState('');

  useEffect(() => {
    if (!profile?.uid || !profile?.schoolId) return;
    return subscribeParentDismissals(profile.uid, profile.schoolId, setRequests);
  }, [profile?.uid, profile?.schoolId]);

  const student = selectedStudent || students[0];
  const activeForStudent = student
    ? requests.find(
        (r) =>
          r.studentId === student.id &&
          ['waiting', 'called', 'ready'].includes(r.status),
      )
    : null;

  const handleRequest = async () => {
    if (!profile?.schoolId || !student) {
      toast.error('اختر طالباً أولاً');
      return;
    }
    setSubmitting(true);
    try {
      const classId = student.classId || '';
      const className = student.className || student.class || '';
      const result = await createDismissalRequest({
        schoolId: profile.schoolId,
        studentId: student.id,
        studentName: student.name,
        classId,
        className,
        parentId: profile.uid,
        parentName: profile.name || '',
        requestedByName: pickupName.trim() || profile.name || 'ولي أمر',
        pickupPersonName: pickupName.trim() || profile.name || '',
        pickupPersonRelation: pickupRelation.trim() || 'ولي أمر',
        pickupNote: pickupNote.trim(),
      });
      setLastToken(result.token);
      toast.success('تم إرسال طلب التسريح');
    } catch (e: any) {
      toast.error(e.message || 'فشل إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <DoorOpen size={24} />
          {isRtl ? 'طلب تسريح الطالب' : 'Student dismissal request'}
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-bold">
          {isRtl
            ? 'أنا عند البوابة — أرسل طلباً آمناً لتسليم طفلك'
            : 'At the gate — request safe student pickup'}
        </p>
      </div>

      {student && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {isRtl ? 'الطالب:' : 'Student:'} {student.name}
          </p>

          {!activeForStudent ? (
            <>
              <input
                value={pickupName}
                onChange={(e) => setPickupName(e.target.value)}
                placeholder={isRtl ? 'اسم المستلم (اختياري)' : 'Pickup person name'}
                className="w-full px-4 py-3 rounded-xl border font-bold"
              />
              <input
                value={pickupRelation}
                onChange={(e) => setPickupRelation(e.target.value)}
                placeholder={isRtl ? 'صلة القرابة' : 'Relation'}
                className="w-full px-4 py-3 rounded-xl border font-bold"
              />
              <textarea
                value={pickupNote}
                onChange={(e) => setPickupNote(e.target.value)}
                placeholder={isRtl ? 'ملاحظة للبوابة (اختياري)' : 'Note for guard'}
                className="w-full px-4 py-3 rounded-xl border font-bold min-h-[80px]"
              />
              <button
                onClick={handleRequest}
                disabled={submitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black disabled:opacity-50"
              >
                {isRtl ? 'أنا عند البوابة — إرسال الطلب' : 'I am at the gate — Send request'}
              </button>
            </>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-3">
              <p className="font-bold text-emerald-800 flex items-center gap-2">
                <Clock size={16} />
                {DISMISSAL_STATUS_LABELS[activeForStudent.status].ar}
              </p>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border">
                <QrCode size={32} className="text-slate-700" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">رمز التسليم</p>
                  <p className="text-2xl font-black font-mono tracking-widest text-slate-900">
                    {activeForStudent.token}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">صالح لمدة 10 دقائق</p>
                </div>
              </div>
            </div>
          )}

          {lastToken && !activeForStudent && (
            <p className="text-xs font-mono text-center text-slate-500">آخر رمز: {lastToken}</p>
          )}
        </div>
      )}

      {requests.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border p-6 space-y-3">
          <h3 className="font-bold text-slate-800">{isRtl ? 'سجل الطلبات' : 'Request history'}</h3>
          {requests.slice(0, 10).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-sm"
            >
              <span className="font-bold">{r.studentName}</span>
              <span className="text-xs font-bold text-slate-500">
                {DISMISSAL_STATUS_LABELS[r.status].ar}
              </span>
              {r.status === 'completed' && (
                <CheckCircle size={14} className="text-emerald-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

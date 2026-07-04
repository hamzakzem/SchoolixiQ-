import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { toast } from 'react-hot-toast';
import { QrCode, User } from 'lucide-react';
import { createDismissalRequest, subscribeParentDismissals } from '../../lib/dismissalService';
import {
  ACTIVE_DISMISSAL_STATUSES,
  resolveDismissalStatus,
  DISMISSAL_STATUS_LABELS,
  type DismissalRequest,
} from '../../lib/dismissalTypes';
import { DismissalWorkflow } from '../../components/dismissal/DismissalWorkflow';
import '../../styles/dismissal-workflow.css';

type StudentOption = {
  id: string;
  name: string;
  classId?: string;
  class?: string;
  className?: string;
  registrationNumber?: string;
  photoUrl?: string;
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
  const locale = isRtl ? 'ar' : 'en';
  const { profile } = useAuth();
  const [requests, setRequests] = useState<DismissalRequest[]>([]);
  const [pickupName, setPickupName] = useState('');
  const [pickupRelation, setPickupRelation] = useState('');
  const [pickupNote, setPickupNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pickedStudentId, setPickedStudentId] = useState('');

  useEffect(() => {
    if (!profile?.uid || !profile?.schoolId) return;
    return subscribeParentDismissals(profile.uid, profile.schoolId, setRequests);
  }, [profile?.uid, profile?.schoolId]);

  useEffect(() => {
    setPickedStudentId(selectedStudent?.id || students[0]?.id || '');
  }, [selectedStudent?.id, students]);

  const student = students.find((s) => s.id === pickedStudentId) || null;
  const activeForStudent = student
    ? requests.find(
        (r) =>
          r.studentId === student.id &&
          ACTIVE_DISMISSAL_STATUSES.includes(resolveDismissalStatus(r)),
      )
    : null;

  const handleRequest = async () => {
    if (!profile?.schoolId || !student) {
      toast.error('اختر طالباً مرتبطاً بحسابك');
      return;
    }
    setSubmitting(true);
    try {
      await createDismissalRequest({
        schoolId: profile.schoolId,
        studentId: student.id,
        parentId: profile.uid,
        parentName: profile.name || '',
        requestedByName: pickupName.trim() || profile.name || 'ولي أمر',
        pickupPersonName: pickupName.trim() || profile.name || '',
        pickupPersonRelation: pickupRelation.trim() || 'ولي أمر',
        pickupNote: pickupNote.trim(),
      });
      toast.success('تم إرسال طلب التسريح');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'فشل إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="dw-root dw-root--embedded" dir="rtl">
        <p className="dw-empty">لا يوجد أبناء مرتبطون بحسابك</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DismissalWorkflow
        request={activeForStudent}
        locale={locale}
        viewerRole="parent"
        embedded
        title={isRtl ? 'التسريح الآمن' : 'Safe dismissal'}
        subtitle={
          isRtl
            ? 'عملية محكومة — أين نحن الآن + ماذا حدث'
            : 'Controlled process — state + history'
        }
      >
        <div className="space-y-4">
          {students.length > 1 && (
            <div className="dw-glass-card dw-glass-card--flat">
              <label className="dw-zone-label" htmlFor="dw-student-pick">
                {isRtl ? 'اختر الطالب' : 'Select student'}
              </label>
              <select
                id="dw-student-pick"
                value={pickedStudentId}
                onChange={(e) => setPickedStudentId(e.target.value)}
                className="dw-input"
                aria-label={isRtl ? 'اختيار الطالب' : 'Student selection'}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.className || s.class ? ` — ${s.className || s.class}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {student && (
            <div className="dw-glass-card">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-black/30 border border-[var(--dw-glass-border)] flex items-center justify-center overflow-hidden shrink-0">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-[var(--dw-gold-400)]" aria-hidden />
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg text-white">{student.name}</p>
                  <p className="text-sm text-[var(--dw-slate-muted)]">{student.className || student.class}</p>
                  {student.registrationNumber && (
                    <p className="text-xs font-mono text-[var(--dw-gold-400)] mt-1">
                      #{student.registrationNumber}
                    </p>
                  )}
                </div>
              </div>

              {!activeForStudent ? (
                <div className="space-y-3">
                  <input
                    value={pickupName}
                    onChange={(e) => setPickupName(e.target.value)}
                    placeholder={isRtl ? 'اسم المستلم (اختياري)' : 'Pickup person'}
                    className="dw-input"
                    aria-label={isRtl ? 'اسم المستلم' : 'Pickup name'}
                  />
                  <input
                    value={pickupRelation}
                    onChange={(e) => setPickupRelation(e.target.value)}
                    placeholder={isRtl ? 'صلة القرابة' : 'Relation'}
                    className="dw-input"
                  />
                  <textarea
                    value={pickupNote}
                    onChange={(e) => setPickupNote(e.target.value)}
                    placeholder={isRtl ? 'ملاحظة للبوابة' : 'Note for guard'}
                    className="dw-input min-h-[72px] resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleRequest}
                    disabled={submitting}
                    className="dw-btn dw-btn--gold w-full"
                    aria-busy={submitting}
                  >
                    {isRtl ? 'أنا عند البوابة — طلب تسريح' : 'Request dismissal at gate'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="dw-token-box" role="group" aria-label={isRtl ? 'رمز التسليم' : 'Pickup token'}>
                    <QrCode size={36} className="text-[var(--dw-gold-400)] shrink-0" aria-hidden />
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--dw-slate-muted)] uppercase">
                        {isRtl ? 'رمز التسليم' : 'Pickup code'}
                      </p>
                      <p className="dw-token-box__code">{activeForStudent.token}</p>
                      <p className="text-[10px] text-[var(--dw-slate-muted)] mt-1">
                        {isRtl ? 'صالح 10 دقائق' : 'Valid 10 min'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--dw-slate-muted)]" aria-live="polite">
                    {DISMISSAL_STATUS_LABELS[resolveDismissalStatus(activeForStudent)]?.[locale]}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DismissalWorkflow>

      {requests.length > 0 && (
        <div className="dw-root dw-root--embedded" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="dw-shell">
            <p className="dw-zone-label">{isRtl ? 'سجل الطلبات' : 'History'}</p>
            <div className="dw-panel-grid space-y-3">
              {requests.slice(0, 8).map((r) => (
                <div key={r.id} className="dw-glass-card dw-glass-card--flat">
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">{r.studentName}</span>
                    <span className="dw-badge dw-badge--pending">
                      {DISMISSAL_STATUS_LABELS[resolveDismissalStatus(r)]?.[locale]}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--dw-slate-muted)]">{r.className}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

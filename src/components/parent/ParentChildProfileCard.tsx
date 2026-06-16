import React from 'react';
import { ChevronDown, GraduationCap, School } from 'lucide-react';

type Student = {
  id: string;
  name: string;
  photoUrl?: string;
  className?: string;
  class?: string;
  grade?: string;
  registrationNumber?: string;
};

type Props = {
  students: Student[];
  selectedStudent: Student | null;
  onSelectStudent: (s: Student) => void;
  schoolName?: string;
  isRtl: boolean;
  onAddStudent?: () => void;
  addStudentLabel?: string;
};

export function ParentChildProfileCard({
  students,
  selectedStudent,
  onSelectStudent,
  schoolName,
  isRtl,
  onAddStudent,
  addStudentLabel,
}: Props) {
  const s = selectedStudent;
  const classLabel = s?.className || s?.class || s?.grade || (isRtl ? 'الصف غير محدد' : 'Class N/A');

  return (
    <div className="parent-child-card">
      <div className="flex items-start gap-4">
        <div className="parent-child-card__avatar shrink-0">
          {s?.photoUrl ? (
            <img src={s.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-xl font-black text-[#0B2345]">{s?.name?.[0] || '?'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-start">
          {students.length > 1 ? (
            <div className="relative mb-1">
              <label className="sr-only">{isRtl ? 'اختر الطالب' : 'Select child'}</label>
              <select
                value={s?.id || ''}
                onChange={(e) => {
                  const next = students.find((st) => st.id === e.target.value);
                  if (next) onSelectStudent(next);
                }}
                className="parent-child-card__select w-full appearance-none bg-transparent border-none font-black text-[#0B2345] dark:text-white text-lg outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded-lg pe-8"
                aria-label={isRtl ? 'اختر الطالب' : 'Select child'}
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className={`absolute top-1/2 -translate-y-1/2 text-[#0B2345]/40 pointer-events-none ${isRtl ? 'left-0' : 'right-0'}`}
                aria-hidden
              />
            </div>
          ) : (
            <h2 className="text-lg font-black text-[#0B2345] dark:text-white truncate">{s?.name}</h2>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="parent-badge">
              <GraduationCap size={12} aria-hidden />
              {classLabel}
            </span>
            {schoolName ? (
              <span className="parent-badge parent-badge--muted">
                <School size={12} aria-hidden />
                <span className="truncate max-w-[140px]">{schoolName}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {onAddStudent && students.length < 5 ? (
        <button type="button" onClick={onAddStudent} className="parent-link-btn mt-3 text-sm">
          + {addStudentLabel}
        </button>
      ) : null}
    </div>
  );
}

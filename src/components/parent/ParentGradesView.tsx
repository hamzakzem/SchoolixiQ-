import React from 'react';
import { BookOpen, Star } from 'lucide-react';

type Grade = {
  id?: string;
  subject?: string;
  term?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
};

type Props = {
  isRtl: boolean;
  t: (key: string) => string;
  studentName?: string;
  grades: Grade[];
  loading?: boolean;
};

export function ParentGradesView({ isRtl, t, studentName, grades, loading }: Props) {
  return (
    <div className="parent-tab space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="parent-page-title">
            {t('resultsFor')} {studentName}
          </h2>
          <p className="parent-page-subtitle">{isRtl ? 'درجات حسب المادة والفصل' : 'Grades by subject and term'}</p>
        </div>
        <span className="parent-badge parent-badge--gold">{t('firstSemester')}</span>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="parent-skeleton h-20 rounded-2xl" aria-hidden />
          ))}
        </div>
      ) : grades.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {grades.map((grade, idx) => {
            const pct =
              grade.maxScore === 100
                ? grade.percentage
                : grade.maxScore
                  ? Math.round((Number(grade.score) / Number(grade.maxScore)) * 100)
                  : 0;
            const isLow = pct != null && pct < 50;
            return (
              <article key={`${grade.subject}-${grade.term}-${idx}`} className="parent-grade-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="parent-grade-card__icon">
                    <BookOpen size={18} aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#0B2345] dark:text-white truncate">{grade.subject}</h3>
                    <p className="text-[10px] font-semibold text-[#0B2345]/45">{grade.term}</p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className={`text-2xl font-black tabular-nums ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {grade.maxScore === 100 ? `${grade.percentage}%` : `${grade.score}/${grade.maxScore}`}
                  </p>
                  {grade.maxScore === 100 && (
                    <p className="text-[9px] font-bold text-[#0B2345]/40">{t('outOf100')}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="parent-empty-state">
          <Star size={32} className="text-[#D4AF37] mb-3" aria-hidden />
          <p>{isRtl ? 'لم يتم تسجيل درجات بعد' : 'No grades recorded yet'}</p>
        </div>
      )}
    </div>
  );
}

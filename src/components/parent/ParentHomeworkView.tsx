import React from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { getHomeworkSubjectDisplay } from '../../lib/homeworkSubjects';
import { groupHomeworkByTimeline, type HomeworkItem } from './parentUiHelpers';

type Props = {
  isRtl: boolean;
  t: (key: string) => string;
  homework: HomeworkItem[];
  onDelete: (id: string, title?: string) => void;
};

export function ParentHomeworkView({ isRtl, t, homework, onDelete }: Props) {
  const groups = groupHomeworkByTimeline(homework, isRtl);

  return (
    <div className="parent-tab space-y-6">
      <header>
        <h2 className="parent-page-title">{t('homeworkList')}</h2>
        <p className="parent-page-subtitle">{isRtl ? 'واجبات ابنك/ابنتك مرتّبة حسب الموعد' : 'Homework sorted by due date'}</p>
      </header>

      {groups.length > 0 ? (
        groups.map(([label, items]) => (
          <section key={label} className="space-y-3">
            <h3 className="parent-group-label">{label}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map((hw) => (
                <article key={hw.id} className="parent-section-card relative">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="parent-badge">
                      {getHomeworkSubjectDisplay(hw, undefined, isRtl)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(hw.id, hw.title)}
                      className="parent-icon-btn text-rose-400"
                      aria-label={t('hide')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-[#0B2345] dark:text-white text-sm mb-2">{hw.title}</h4>
                  {hw.content ? (
                    <p className="text-xs text-[#0B2345]/65 leading-relaxed whitespace-pre-wrap mb-3 line-clamp-4">
                      {hw.content}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between pt-3 border-t border-[#0B2345]/8 text-[10px] font-semibold text-[#0B2345]/45">
                    <span>
                      {t('dueDateLabel')}: <span className="text-rose-600">{hw.dueDate}</span>
                    </span>
                    <span>{hw.teacherName || t('teacher')}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="parent-empty-state">
          <BookOpen size={32} className="text-[#D4AF37] mb-3" aria-hidden />
          <p>{isRtl ? 'لا توجد واجبات حالياً' : 'No homework right now'}</p>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  MessageSquare,
  Trash2,
  Wallet,
} from 'lucide-react';
import { getHomeworkSubjectDisplay } from '../../lib/homeworkSubjects';
import { ParentChildProfileCard } from './ParentChildProfileCard';
import { ParentTuitionWarning } from './ParentTuitionWarning';
import { computeGradeAverage, tuitionRemaining } from './parentUiHelpers';

type Props = {
  isRtl: boolean;
  language: string;
  t: (key: string) => string;
  students: any[];
  selectedStudent: any;
  onSelectStudent: (s: any) => void;
  schoolInfo: any;
  onAddStudent: () => void;
  linkStudentLabel: string;
  studentGrades: any[];
  loadingGrades: boolean;
  homework: any[];
  announcements: any[];
  attendanceSummary: { absent: number; late: number };
  installmentBanners: any[];
  tuitionEscalationAlert: any;
  onDismissBanner: (id: string) => void;
  onNavigate: (tab: string) => void;
  onDeleteHomework: (id: string, title?: string) => void;
  showDismissal: boolean;
  behaviorPreview: any | null;
};

function SummaryTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
  loading,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: 'gold' | 'navy' | 'danger' | 'success';
  onClick?: () => void;
  loading?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`parent-summary-tile parent-summary-tile--${accent || 'navy'} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="parent-summary-tile__icon">
        <Icon size={18} aria-hidden />
      </div>
      <p className="parent-summary-tile__label">{label}</p>
      {loading ? (
        <div className="parent-skeleton h-8 w-16 rounded-lg mt-1" aria-hidden />
      ) : (
        <p className="parent-summary-tile__value">{value}</p>
      )}
      {sub ? <p className="parent-summary-tile__sub">{sub}</p> : null}
    </Tag>
  );
}

export function ParentHomeView({
  isRtl,
  language,
  t,
  students,
  selectedStudent,
  onSelectStudent,
  schoolInfo,
  onAddStudent,
  linkStudentLabel,
  studentGrades,
  loadingGrades,
  homework,
  announcements,
  attendanceSummary,
  installmentBanners,
  tuitionEscalationAlert,
  onDismissBanner,
  onNavigate,
  onDeleteHomework,
  showDismissal,
  behaviorPreview,
}: Props) {
  const avg = computeGradeAverage(studentGrades);
  const remaining = tuitionRemaining(selectedStudent);
  const hasTuitionIssue = Boolean(tuitionEscalationAlert) || installmentBanners.length > 0;

  const quickActions = [
    { id: 'chat', label: 'فتح الدردشة', en: 'Open chat', icon: MessageSquare },
    { id: 'tuition', label: 'عرض الأقساط', en: 'View tuition', icon: Wallet },
    { id: 'homework', label: 'متابعة الواجبات', en: 'Homework', icon: BookOpen },
    { id: 'inbox', label: 'الإعلانات', en: 'Announcements', icon: Bell },
  ];

  return (
    <div className="parent-home space-y-5 md:space-y-6">
      <ParentChildProfileCard
        students={students}
        selectedStudent={selectedStudent}
        onSelectStudent={onSelectStudent}
        schoolName={schoolInfo?.name || schoolInfo?.schoolName}
        isRtl={isRtl}
        onAddStudent={onAddStudent}
        addStudentLabel={linkStudentLabel}
      />

      <ParentTuitionWarning
        escalation={tuitionEscalationAlert}
        banners={installmentBanners}
        isRtl={isRtl}
        onDismissBanner={onDismissBanner}
        onGoTuition={() => onNavigate('tuition')}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryTile
          icon={CalendarCheck}
          label={isRtl ? 'الحضور' : 'Attendance'}
          value={String(attendanceSummary.absent)}
          sub={
            attendanceSummary.late > 0
              ? `${attendanceSummary.late} ${isRtl ? 'تأخير' : 'late'}`
              : isRtl
                ? 'غياب'
                : 'absences'
          }
          accent={attendanceSummary.absent > 3 ? 'danger' : 'navy'}
        />
        <SummaryTile
          icon={BookOpen}
          label={isRtl ? 'الواجبات' : 'Homework'}
          value={String(homework.length)}
          sub={isRtl ? 'نشطة' : 'active'}
          accent="gold"
          onClick={() => onNavigate('homework')}
        />
        <SummaryTile
          icon={BarChart3}
          label={isRtl ? 'المعدل' : 'Average'}
          value={avg != null ? String(avg) : '—'}
          sub={isRtl ? 'من 100' : 'of 100'}
          accent="success"
          loading={loadingGrades}
          onClick={() => onNavigate('grades')}
        />
        <SummaryTile
          icon={Wallet}
          label={isRtl ? 'المتبقي' : 'Remaining'}
          value={remaining > 0 ? remaining.toLocaleString('ar-IQ') : '0'}
          sub={isRtl ? 'د.ع' : 'IQD'}
          accent={hasTuitionIssue ? 'danger' : 'navy'}
          onClick={() => onNavigate('tuition')}
        />
        <SummaryTile
          icon={Bell}
          label={isRtl ? 'الإعلانات' : 'Announcements'}
          value={String(announcements.length)}
          sub={isRtl ? 'جديد' : 'new'}
          accent="gold"
          onClick={() => onNavigate('inbox')}
        />
      </div>

      {/* Attendance mini timeline */}
      <section className="parent-section-card">
        <h3 className="parent-section-title">{isRtl ? 'ملخص الحضور' : 'Attendance summary'}</h3>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {[
            { label: isRtl ? 'غائب' : 'Absent', count: attendanceSummary.absent, tone: 'danger' },
            { label: isRtl ? 'متأخر' : 'Late', count: attendanceSummary.late, tone: 'amber' },
            {
              label: isRtl ? 'سليم' : 'OK',
              count: Math.max(0, 30 - attendanceSummary.absent - attendanceSummary.late),
              tone: 'success',
            },
          ].map((item) => (
            <div key={item.label} className={`parent-attendance-pill parent-attendance-pill--${item.tone}`}>
              <span className="text-lg font-black tabular-nums">{item.count}</span>
              <span className="text-[10px] font-bold opacity-80">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#0B2345]/45 mt-2">
          {isRtl ? 'بناءً على إشعارات الحضور المسجّلة' : 'Based on recorded attendance notifications'}
        </p>
      </section>

      {/* Quick actions */}
      <section>
        <h3 className="parent-section-title mb-3">{isRtl ? 'إجراءات سريعة' : 'Quick actions'}</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onNavigate(action.id)}
              className="parent-quick-action"
              aria-label={isRtl ? action.label : action.en}
            >
              <action.icon size={20} className="text-[#D4AF37]" aria-hidden />
              <span>{isRtl ? action.label : action.en}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Announcements feed preview */}
      <section className="parent-section-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="parent-section-title mb-0">{t('latestAnnouncements')}</h3>
          <button type="button" onClick={() => onNavigate('inbox')} className="parent-link-btn text-xs">
            {t('seeAll')}
          </button>
        </div>
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <article key={ann.id} className="parent-feed-card">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold text-[#0B2345]/50">
                    {ann.authorName || t('schoolAdmin')}
                  </span>
                  {ann.target === 'individual' && (
                    <span className="parent-badge parent-badge--gold text-[9px]">{t('privateMessage')}</span>
                  )}
                </div>
                <h4 className="font-bold text-sm text-[#0B2345] dark:text-white line-clamp-1">{ann.title}</h4>
                <p className="text-xs text-[#0B2345]/65 mt-1 line-clamp-2">{ann.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="parent-empty-inline">{isRtl ? 'لا توجد إعلانات جديدة' : 'No new announcements'}</p>
        )}
      </section>

      {/* Homework preview */}
      <section className="parent-section-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="parent-section-title mb-0">{t('recentHomework')}</h3>
          <button type="button" onClick={() => onNavigate('homework')} className="parent-link-btn text-xs flex items-center gap-1">
            {t('seeAll')}
            <ArrowRight size={12} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>
        {homework.length > 0 ? (
          <div className="space-y-2">
            {homework.slice(0, 2).map((hw) => (
              <div
                key={hw.id}
                className="parent-feed-card flex items-start justify-between gap-2 cursor-pointer"
                onClick={() => onNavigate('homework')}
                onKeyDown={(e) => e.key === 'Enter' && onNavigate('homework')}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{hw.title}</p>
                  <p className="text-[10px] text-[#D4AF37] font-bold mt-0.5">
                    {getHomeworkSubjectDisplay(hw, undefined, isRtl)}
                  </p>
                  <p className="text-[10px] text-[#0B2345]/45 mt-1">
                    {t('deliveryDate')}: {hw.dueDate}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHomework(hw.id, hw.title);
                  }}
                  className="parent-icon-btn shrink-0 text-rose-400"
                  aria-label={t('delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="parent-empty-inline">{isRtl ? 'لا توجد واجبات حالياً' : 'No homework right now'}</p>
        )}
      </section>

      {showDismissal && (
        <button type="button" onClick={() => onNavigate('dismissal')} className="parent-action-btn w-full">
          {isRtl ? 'طلب تسريح الطالب' : 'Request student dismissal'}
        </button>
      )}

      {behaviorPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`parent-feed-card cursor-pointer border-s-4 ${
            behaviorPreview.type === 'positive' ? 'border-s-emerald-500' : 'border-s-rose-500'
          }`}
          onClick={() => onNavigate('behavior')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('behavior')}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#0B2345]/50 mb-1">
            {t('latestBehavior')}
          </p>
          <p className="text-sm font-medium line-clamp-2">{behaviorPreview.description}</p>
        </motion.div>
      )}
    </div>
  );
}

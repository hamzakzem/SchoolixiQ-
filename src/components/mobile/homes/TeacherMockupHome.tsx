import { BookOpen, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { useAuth } from '../../../lib/AuthContext';
import {
  MobileBtnPrimary,
  MobileCard,
  MobileIconAction,
  MobilePage,
  MobileSchoolHero,
  MobileSectionTitle,
} from '../mobileUiKit';

type Props = {
  classLabel?: string;
  homeworkCount?: number;
  onTabChange: (tab: string) => void;
};

export default function TeacherMockupHome({
  classLabel,
  homeworkCount = 0,
  onTabChange,
}: Props) {
  const { isRtl } = useLanguage();
  const { schoolData } = useAuth();

  const quick = [
    { id: 'attendance', icon: CheckSquare, ar: 'الحضور', en: 'Attendance' },
    { id: 'grades', icon: BookOpen, ar: 'الدرجات', en: 'Grades' },
    { id: 'chat', icon: MessageSquare, ar: 'الرسائل', en: 'Messages' },
  ];

  return (
    <MobilePage>
      <MobileSchoolHero
        schoolName={schoolData?.name || 'SchoolixiQ'}
        logoUrl={schoolData?.logoUrl}
        badge={isRtl ? 'المعلم' : 'Teacher'}
        isRtl={isRtl}
      />

      <MobileSectionTitle
        title={isRtl ? 'اختصارات سريعة' : 'Quick actions'}
        icon={CheckSquare}
      />
      <div className="flex justify-around gap-2 py-1">
        {quick.map((q) => (
          <MobileIconAction
            key={q.id}
            icon={q.icon}
            label={isRtl ? q.ar : q.en}
            onClick={() => onTabChange(q.id)}
          />
        ))}
      </div>

      <MobileCard className="p-4 bg-gradient-to-br from-[#0B2345] to-[#163a6b] border-0 text-white shadow-[0_12px_36px_rgba(11,35,69,0.35)]">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-wide">
              {isRtl ? 'الفصل الحالي' : 'Current class'}
            </p>
            <p className="text-xl font-black mt-1 truncate">{classLabel || '—'}</p>
          </div>
          <span className="text-[10px] font-bold bg-emerald-500 text-white px-2.5 py-1 rounded-lg shadow-sm shrink-0">
            {isRtl ? 'نشط' : 'Active'}
          </span>
        </div>
      </MobileCard>

      <section>
        <MobileSectionTitle
          title={isRtl ? 'جدول اليوم' : "Today's schedule"}
          icon={Calendar}
        />
        <MobileCard className="p-4 mt-3">
          <ul className="space-y-3">
            {['08:00', '09:30', '11:00'].map((t) => (
              <li
                key={t}
                className="flex justify-between items-center text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <span className="font-mono font-bold text-[#0B2345] tabular-nums">
                  {t}
                </span>
                <span className="text-slate-600 font-medium">
                  {isRtl ? 'حصة دراسية' : 'Class period'}
                </span>
              </li>
            ))}
          </ul>
        </MobileCard>
      </section>

      <section>
        <MobileSectionTitle
          title={isRtl ? 'المهام' : 'Tasks'}
          icon={BookOpen}
        />
        <MobileCard className="p-4 mt-3">
          <p className="text-sm text-slate-600 font-medium">
            {isRtl
              ? `${homeworkCount} واجبات منشورة`
              : `${homeworkCount} homework items posted`}
          </p>
          <div className="mt-4">
            <MobileBtnPrimary onClick={() => onTabChange('homework')}>
              {isRtl ? 'عرض الواجبات' : 'View homework'}
            </MobileBtnPrimary>
          </div>
        </MobileCard>
      </section>
    </MobilePage>
  );
}

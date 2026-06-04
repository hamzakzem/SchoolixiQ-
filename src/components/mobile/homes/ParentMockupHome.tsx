import { Award, Bell } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import {
  MobileBtnPrimary,
  MobileBtnSecondary,
  MobileCard,
  MobileListRow,
  MobilePage,
  MobileSectionTitle,
  MobileSchoolHero,
  MobileStatCard,
  SchoolLogoAvatar,
} from '../mobileUiKit';

type Student = {
  id: string;
  name: string;
  photoUrl?: string;
};

type Props = {
  students: Student[];
  announcements: { id: string; title: string; content?: string }[];
  avgGrade: number | null;
  attendancePct: number;
  schoolLogoUrl?: string | null;
  schoolName?: string;
  onTabChange: (tab: string) => void;
};

export default function ParentMockupHome({
  students,
  announcements,
  avgGrade,
  attendancePct,
  schoolLogoUrl,
  schoolName,
  onTabChange,
}: Props) {
  const { isRtl } = useLanguage();

  return (
    <MobilePage>
      {schoolName ? (
        <MobileSchoolHero
          schoolName={schoolName}
          logoUrl={schoolLogoUrl}
          badge={isRtl ? 'ولي الأمر' : 'Parent'}
          isRtl={isRtl}
        />
      ) : (
        <MobileSectionTitle
          title={isRtl ? 'ولي الأمر' : 'Parent'}
          icon={Bell}
        />
      )}

      <div className="space-y-4">
        {students.slice(0, 2).map((s, i) => (
          <MobileCard key={s.id} className="p-4">
            <div className="flex gap-4">
              <SchoolLogoAvatar
                name={s.name}
                logoUrl={s.photoUrl}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  {isRtl ? `الابن ${i + 1}` : `Child ${i + 1}`}
                </p>
                <p className="font-black text-slate-900 truncate text-base mt-0.5">
                  {s.name}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <MobileStatCard
                    label={isRtl ? 'المعدل' : 'GPA'}
                    value={avgGrade != null ? String(avgGrade) : '—'}
                    icon={Award}
                  />
                  <div className="bg-white rounded-[1.25rem] p-4 border border-slate-200/80 shadow-[0_6px_24px_rgba(11,35,69,0.05)]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {isRtl ? 'الحضور' : 'Attendance'}
                    </p>
                    <p className="text-2xl font-black text-[#0B2345] tabular-nums mt-2">
                      {attendancePct}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <MobileBtnPrimary onClick={() => onTabChange('reports')}>
                    {isRtl ? 'التقارير' : 'Reports'}
                  </MobileBtnPrimary>
                  <MobileBtnSecondary onClick={() => onTabChange('schedules')}>
                    {isRtl ? 'الامتحانات' : 'Exams'}
                  </MobileBtnSecondary>
                </div>
              </div>
            </div>
          </MobileCard>
        ))}
      </div>

      <section>
        <MobileSectionTitle
          title={isRtl ? 'إشعارات المدرسة' : 'School notifications'}
          icon={Bell}
        />
        <MobileCard className="p-4 mt-3">
          <ul className="space-y-3">
            {announcements.length > 0 ? (
              announcements.slice(0, 3).map((a) => (
                <li
                  key={a.id}
                  className="text-xs border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="font-bold text-slate-900">{a.title}</span>
                  {a.content ? (
                    <p className="line-clamp-2 mt-1 text-slate-500 leading-relaxed">
                      {a.content}
                    </p>
                  ) : null}
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-400 font-bold py-2 text-center">
                {isRtl ? 'لا إشعارات حالياً' : 'No notifications'}
              </li>
            )}
          </ul>
        </MobileCard>
      </section>

      <MobileListRow
        title={isRtl ? 'الرسوم الدراسية' : 'Tuition & fees'}
        subtitle={isRtl ? 'عرض التفاصيل والمدفوعات' : 'View balance & payments'}
        onClick={() => onTabChange('tuition')}
        isRtl={isRtl}
      />
    </MobilePage>
  );
}

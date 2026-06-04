import { Bell, ChevronLeft, Wallet } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';

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
  onTabChange: (tab: string) => void;
};

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

export default function ParentMockupHome({
  students,
  announcements,
  avgGrade,
  attendancePct,
  onTabChange,
}: Props) {
  const { isRtl } = useLanguage();

  return (
    <div className="px-4 py-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-[#0B2345]">
          {isRtl ? 'ولي الأمر' : 'Parent'}
        </h1>
      </div>

      <div className="space-y-3">
        {students.slice(0, 2).map((s, i) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex gap-3"
          >
            <div className="w-14 h-14 rounded-xl bg-[#0B2345]/10 flex items-center justify-center text-[#0B2345] font-black text-lg shrink-0 overflow-hidden">
              {s.photoUrl ? (
                <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                s.name[0]
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-bold">
                {isRtl ? `الابن ${i + 1}` : `Child ${i + 1}`}
              </p>
              <p className="font-black text-slate-900 truncate">{s.name}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <StatPill
                  label={isRtl ? 'المعدل' : 'GPA'}
                  value={avgGrade != null ? String(avgGrade) : '—'}
                  accent="text-emerald-600"
                />
                <StatPill
                  label={isRtl ? 'الحضور' : 'Attendance'}
                  value={`${attendancePct}%`}
                  accent="text-[#0B2345]"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => onTabChange('reports')}
                  className="flex-1 py-2 rounded-xl bg-[#0B2345] text-white text-xs font-bold"
                >
                  {isRtl ? 'التقارير' : 'Reports'}
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('schedules')}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-[#0B2345] text-xs font-bold"
                >
                  {isRtl ? 'الامتحانات' : 'Exams'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-[#0B2345]" />
          <h2 className="text-sm font-black text-slate-800">
            {isRtl ? 'إشعارات المدرسة' : 'School notifications'}
          </h2>
        </div>
        <ul className="space-y-2">
          {announcements.length > 0 ? (
            announcements.slice(0, 3).map((a) => (
              <li
                key={a.id}
                className="text-xs text-slate-600 border-b border-slate-50 pb-2 last:border-0"
              >
                <span className="font-bold text-slate-900">{a.title}</span>
                {a.content ? (
                  <p className="line-clamp-1 mt-0.5 text-slate-400">{a.content}</p>
                ) : null}
              </li>
            ))
          ) : (
            <li className="text-xs text-slate-400 font-bold">
              {isRtl ? 'لا إشعارات حالياً' : 'No notifications'}
            </li>
          )}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => onTabChange('tuition')}
        className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400">
              {isRtl ? 'الرسوم' : 'Fees'}
            </p>
            <p className="text-sm font-black text-slate-900">
              {isRtl ? 'عرض التفاصيل' : 'View details'}
            </p>
          </div>
        </div>
        <ChevronLeft size={18} className={isRtl ? '' : 'rotate-180'} />
      </button>
    </div>
  );
}

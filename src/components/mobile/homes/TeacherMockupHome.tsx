import { BookOpen, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';

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

  const quick = [
    { id: 'attendance', icon: CheckSquare, ar: 'الحضور', en: 'Attendance' },
    { id: 'grades', icon: BookOpen, ar: 'الدرجات', en: 'Grades' },
    { id: 'chat', icon: MessageSquare, ar: 'الرسائل', en: 'Messages' },
  ];

  return (
    <div className="px-4 py-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <h1 className="text-lg font-black text-[#0B2345]">
        {isRtl ? 'جدول المعلم' : "Teacher's schedule"}
      </h1>

      <div className="flex justify-center gap-6">
        {quick.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onTabChange(q.id)}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-[#0B2345]">
              <q.icon size={22} />
            </div>
            <span className="text-[10px] font-bold text-slate-600">
              {isRtl ? q.ar : q.en}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-[#0B2345] text-white rounded-2xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-white/70 font-bold">
              {isRtl ? 'الفصل الحالي' : 'Current class'}
            </p>
            <p className="text-lg font-black mt-1">{classLabel || '—'}</p>
          </div>
          <span className="text-[10px] font-bold bg-emerald-500/90 px-2 py-1 rounded-lg">
            {isRtl ? 'نشط' : 'Active'}
          </span>
        </div>
      </div>

      <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-[#0B2345]" />
          <h2 className="text-sm font-black">{isRtl ? 'جدول اليوم' : "Today's schedule"}</h2>
        </div>
        <ul className="space-y-2 text-xs text-slate-600">
          {['08:00', '09:30', '11:00'].map((t) => (
            <li key={t} className="flex justify-between border-b border-slate-50 pb-2">
              <span className="font-mono font-bold">{t}</span>
              <span>{isRtl ? 'حصة' : 'Period'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-black mb-2">{isRtl ? 'المهام' : 'Tasks'}</h2>
        <p className="text-xs text-slate-500 font-bold">
          {isRtl
            ? `${homeworkCount} واجبات منشورة`
            : `${homeworkCount} homework posted`}
        </p>
        <button
          type="button"
          onClick={() => onTabChange('homework')}
          className="mt-3 w-full py-2.5 rounded-xl bg-slate-100 text-[#0B2345] text-xs font-bold"
        >
          {isRtl ? 'عرض الواجبات' : 'View homework'}
        </button>
      </section>
    </div>
  );
}

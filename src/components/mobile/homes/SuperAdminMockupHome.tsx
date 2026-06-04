import { Building2, Globe2, Users } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';

type Props = {
  schoolCount?: number;
  adminCount?: number;
  teacherCount?: number;
  eventCount?: number;
  onTabChange: (tab: string) => void;
};

export default function SuperAdminMockupHome({
  schoolCount = 0,
  adminCount = 0,
  teacherCount = 0,
  eventCount = 0,
  onTabChange,
}: Props) {
  const { isRtl } = useLanguage();

  const stats = [
    { v: schoolCount, ar: 'المدارس', en: 'Schools', icon: Building2 },
    { v: adminCount, ar: 'الأدمن', en: 'Admins', icon: Users },
    { v: teacherCount, ar: 'المعلمون', en: 'Teachers', icon: Users },
    { v: eventCount, ar: 'الفعاليات', en: 'Events', icon: Globe2 },
  ];

  return (
    <div className="px-4 py-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl px-3 py-2 border border-slate-100 flex items-center gap-2">
        <span className="text-slate-400 text-sm">🔍</span>
        <span className="text-xs text-slate-400 font-bold flex-1">
          {isRtl ? 'بحث...' : 'Search...'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm"
          >
            <s.icon size={18} className="text-[#0B2345] mb-1" />
            <p className="text-[10px] font-bold text-slate-400">
              {isRtl ? s.ar : s.en}
            </p>
            <p className="text-xl font-black text-slate-900">{s.v}</p>
          </div>
        ))}
      </div>

      <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-black text-[#0B2345] mb-2">
          {isRtl ? 'توزيع المدارس' : 'School distribution'}
        </h2>
        <div className="h-32 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
          {isRtl ? 'خريطة العراق (قريباً)' : 'Iraq map (coming soon)'}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <h2 className="text-sm font-black mb-2">
          {isRtl ? 'نشاط المدارس الأخير' : 'Recent school activity'}
        </h2>
        <p className="text-xs text-slate-500 font-bold mb-3">
          {isRtl ? 'آخر التحديثات على المنصة' : 'Latest platform updates'}
        </p>
        <button
          type="button"
          onClick={() => onTabChange('schools')}
          className="w-full py-2.5 rounded-xl bg-[#0B2345] text-white text-xs font-bold"
        >
          {isRtl ? 'عرض كل المدارس' : 'View all schools'}
        </button>
      </section>
    </div>
  );
}

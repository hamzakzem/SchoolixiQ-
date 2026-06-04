import {
  Building2,
  Calendar,
  GraduationCap,
  LayoutGrid,
  Users,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { useAuth } from '../../../lib/AuthContext';

type Props = {
  studentCount?: number;
  teacherCount?: number;
  attendancePct?: number;
  onTabChange: (tab: string) => void;
};

export default function AdminMockupHome({
  studentCount = 0,
  teacherCount = 0,
  attendancePct = 90,
  onTabChange,
}: Props) {
  const { isRtl } = useLanguage();
  const { schoolData } = useAuth();

  const menu = [
    { id: 'classes', icon: LayoutGrid, labelAr: 'الفصول', labelEn: 'Classes', color: 'bg-blue-50 text-blue-700' },
    { id: 'staff', icon: Users, labelAr: 'المعلمون', labelEn: 'Teachers', color: 'bg-emerald-50 text-emerald-700' },
    { id: 'announcements', icon: Calendar, labelAr: 'الفعاليات', labelEn: 'Events', color: 'bg-violet-50 text-violet-700' },
    { id: 'tuition', icon: Wallet, labelAr: 'المالية', labelEn: 'Finance', color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="px-4 py-4 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-[#0B2345] text-white rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Building2 size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-white/70 font-bold">
            {isRtl ? 'المدرسة' : 'School'}
          </p>
          <p className="font-black truncate">{schoolData?.name || 'SchoolixiQ'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { v: teacherCount, l: isRtl ? 'المعلمون' : 'Teachers', icon: GraduationCap },
          { v: studentCount, l: isRtl ? 'الطلاب' : 'Students', icon: Users },
          { v: `${attendancePct}%`, l: isRtl ? 'الحضور' : 'Attendance', icon: Calendar },
          { v: '—', l: isRtl ? 'الإيرادات' : 'Revenue', icon: Wallet },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm"
          >
            <s.icon size={18} className="text-[#0B2345] mb-2" />
            <p className="text-[10px] font-bold text-slate-400">{s.l}</p>
            <p className="text-xl font-black text-slate-900">{s.v}</p>
          </div>
        ))}
      </div>

      <p className="text-xs font-black text-slate-500 px-1">
        {isRtl ? 'القائمة الرئيسية' : 'Main menu'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {menu.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onTabChange(m.id)}
            className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center active:scale-[0.98] transition-transform"
          >
            <div
              className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${m.color}`}
            >
              <m.icon size={22} />
            </div>
            <span className="text-xs font-black text-slate-800">
              {isRtl ? m.labelAr : m.labelEn}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

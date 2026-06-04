import { Building2, Globe2, Search, Users } from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { useSystemConfig } from '../../../lib/SystemConfigContext';
import {
  MobileBtnPrimary,
  MobileCard,
  MobilePage,
  MobileSchoolHero,
  MobileSectionTitle,
  MobileStatCard,
} from '../mobileUiKit';

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
  const { config } = useSystemConfig();

  const stats = [
    { v: schoolCount, ar: 'المدارس', en: 'Schools', icon: Building2 },
    { v: adminCount, ar: 'الأدمن', en: 'Admins', icon: Users },
    { v: teacherCount, ar: 'المعلمون', en: 'Teachers', icon: Users },
    { v: eventCount, ar: 'الفعاليات', en: 'Events', icon: Globe2 },
  ];

  return (
    <MobilePage>
      <MobileSchoolHero
        schoolName={config.appName}
        logoUrl={config.appLogo}
        badge={isRtl ? 'إدارة المنصة' : 'Platform admin'}
        isRtl={isRtl}
      />

      <MobileCard className="p-3 flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#0B2345]/8 flex items-center justify-center text-[#0B2345]">
          <Search size={18} strokeWidth={2.25} />
        </span>
        <span className="text-sm text-slate-400 font-medium flex-1">
          {isRtl ? 'بحث في المدارس والحسابات...' : 'Search schools & accounts...'}
        </span>
      </MobileCard>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <MobileStatCard
            key={i}
            label={isRtl ? s.ar : s.en}
            value={s.v}
            icon={s.icon}
          />
        ))}
      </div>

      <section>
        <MobileSectionTitle
          title={isRtl ? 'توزيع المدارس' : 'School distribution'}
          icon={Globe2}
        />
        <MobileCard className="p-4 mt-3">
          <div className="h-36 rounded-2xl bg-gradient-to-br from-slate-100 via-slate-50 to-[#0B2345]/5 border border-slate-200/80 flex items-center justify-center">
            <p className="text-xs font-bold text-slate-500 text-center px-4">
              {isRtl ? 'خريطة العراق — قريباً' : 'Iraq map — coming soon'}
            </p>
          </div>
        </MobileCard>
      </section>

      <section>
        <MobileSectionTitle
          title={isRtl ? 'نشاط المدارس' : 'School activity'}
          icon={Building2}
        />
        <MobileCard className="p-4 mt-3 space-y-3">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {isRtl
              ? 'آخر التحديثات والمدارس المسجّلة على المنصة'
              : 'Latest updates and schools on the platform'}
          </p>
          <MobileBtnPrimary onClick={() => onTabChange('schools')}>
            {isRtl ? 'عرض كل المدارس' : 'View all schools'}
          </MobileBtnPrimary>
        </MobileCard>
      </section>
    </MobilePage>
  );
}

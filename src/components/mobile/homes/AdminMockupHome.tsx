import {
  Calendar,
  GraduationCap,
  LayoutGrid,
  Users,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../../../lib/LanguageContext';
import { useAuth } from '../../../lib/AuthContext';
import {
  MobileMenuTile,
  MobilePage,
  MobileSchoolHero,
  MobileSectionTitle,
  MobileStatCard,
} from '../mobileUiKit';

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
    { id: 'classes', icon: LayoutGrid, labelAr: 'الفصول', labelEn: 'Classes' },
    { id: 'staff', icon: Users, labelAr: 'المعلمون', labelEn: 'Teachers' },
    { id: 'announcements', icon: Calendar, labelAr: 'الفعاليات', labelEn: 'Events' },
    { id: 'tuition', icon: Wallet, labelAr: 'المالية', labelEn: 'Finance' },
  ];

  return (
    <MobilePage>
      <MobileSchoolHero
        schoolName={schoolData?.name || 'SchoolixiQ'}
        logoUrl={schoolData?.logoUrl}
        badge={isRtl ? 'مدير المدرسة' : 'School admin'}
        isRtl={isRtl}
      />

      <div className="grid grid-cols-2 gap-3">
        <MobileStatCard
          label={isRtl ? 'المعلمون' : 'Teachers'}
          value={teacherCount}
          icon={GraduationCap}
        />
        <MobileStatCard
          label={isRtl ? 'الطلاب' : 'Students'}
          value={studentCount}
          icon={Users}
        />
        <MobileStatCard
          label={isRtl ? 'الحضور' : 'Attendance'}
          value={`${attendancePct}%`}
          icon={Calendar}
        />
        <MobileStatCard
          label={isRtl ? 'الإيرادات' : 'Revenue'}
          value="—"
          icon={Wallet}
        />
      </div>

      <MobileSectionTitle
        title={isRtl ? 'القائمة الرئيسية' : 'Main menu'}
        icon={LayoutGrid}
      />
      <div className="grid grid-cols-2 gap-3">
        {menu.map((m) => (
          <MobileMenuTile
            key={m.id}
            icon={m.icon}
            label={isRtl ? m.labelAr : m.labelEn}
            onClick={() => onTabChange(m.id)}
          />
        ))}
      </div>
    </MobilePage>
  );
}

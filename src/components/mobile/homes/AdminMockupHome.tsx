import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  ClipboardCheck,
  GraduationCap,
  Users,
  Wallet,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useLanguage } from '../../../lib/LanguageContext';
import { useAuth } from '../../../lib/AuthContext';
import {
  MobilePage,
  MobilePermissionChip,
  MobileSchoolHero,
  MobileSectionTitle,
  MobileStatCard,
} from '../mobileUiKit';

export type AdminHomeMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type Props = {
  permissions: AdminHomeMenuItem[];
  onTabChange: (tab: string) => void;
};

export default function AdminMockupHome({
  permissions,
  onTabChange,
}: Props) {
  const { isRtl, t } = useLanguage();
  const { schoolData, profile } = useAuth();
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);

  useEffect(() => {
    if (!profile?.schoolId) return;
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'students'),
          where('schoolId', '==', profile.schoolId),
          limit(2000),
        ),
        (snap) => setStudentCount(snap.size),
      ),
    );

    unsubs.push(
      onSnapshot(
        query(
          collection(db, 'users'),
          where('schoolId', '==', profile.schoolId),
          where('role', '==', 'teacher'),
          limit(500),
        ),
        (snap) => setTeacherCount(snap.size),
      ),
    );

    return () => unsubs.forEach((u) => u());
  }, [profile?.schoolId]);

  const quickStats = [
    {
      id: 'staff',
      label: isRtl ? 'المعلمون' : 'Teachers',
      value: teacherCount,
      icon: GraduationCap,
    },
    {
      id: 'students',
      label: isRtl ? 'الطلاب' : 'Students',
      value: studentCount,
      icon: Users,
    },
    {
      id: 'attendance',
      label: isRtl ? 'الحضور' : 'Attendance',
      value: '—',
      icon: ClipboardCheck,
    },
    {
      id: 'tuition',
      label: isRtl ? 'الإيرادات' : 'Revenue',
      value: '—',
      icon: Wallet,
    },
  ];

  const pinned = permissions.filter((p) =>
    ['classes', 'schedules', 'announcements', 'chat'].includes(p.id),
  );
  const rest = permissions.filter(
    (p) => !['classes', 'schedules', 'announcements', 'chat'].includes(p.id),
  );

  return (
    <MobilePage>
      <MobileSchoolHero
        schoolName={schoolData?.name || 'SchoolixiQ'}
        logoUrl={schoolData?.logoUrl}
        badge={isRtl ? 'مدير المدرسة' : 'School admin'}
        isRtl={isRtl}
      />

      <div className="grid grid-cols-2 gap-2.5">
        {quickStats.map((s) => (
          <MobileStatCard
            key={s.id}
            label={s.label}
            value={s.value}
            icon={s.icon}
            onClick={() => onTabChange(s.id)}
          />
        ))}
      </div>

      {pinned.length > 0 ? (
        <section>
          <MobileSectionTitle
            title={isRtl ? 'اختصارات سريعة' : 'Quick access'}
            icon={Calendar}
          />
          <div className="grid grid-cols-3 gap-2 mt-2">
            {pinned.map((m) => (
              <MobilePermissionChip
                key={m.id}
                icon={m.icon}
                label={m.label}
                onClick={() => onTabChange(m.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <MobileSectionTitle
          title={isRtl ? 'صلاحيات المدرسة' : 'School modules'}
          icon={Users}
        />
        <p className="text-[11px] text-slate-500 font-medium px-0.5 -mt-2 mb-2">
          {isRtl
            ? 'نفس الصلاحيات المعرفة في باقة المدرسة — متزامنة مع الموقع'
            : 'Same package permissions as the website — live sync'}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {rest.map((m) => (
            <MobilePermissionChip
              key={m.id}
              icon={m.icon}
              label={m.label}
              onClick={() => onTabChange(m.id)}
            />
          ))}
        </div>
        {permissions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 font-bold">
            {t('loading') || (isRtl ? 'جاري التحميل...' : 'Loading...')}
          </p>
        ) : null}
      </section>
    </MobilePage>
  );
}

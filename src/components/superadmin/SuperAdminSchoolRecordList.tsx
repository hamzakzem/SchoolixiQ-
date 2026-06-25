import React, { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Building,
  Copy,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Settings as SettingsIcon,
  Star,
  User,
} from 'lucide-react';
import { SubscriptionTimer } from '../SubscriptionTimer';
import { SchoolPresenceBadge } from './SchoolPresenceBadge';
import type { SchoolPresenceRecord } from '../../lib/schoolPresence';
import {
  SchoolLifecycleButtons,
  SchoolStatusBadge,
} from './SchoolLifecycleButtons';

export type SuperAdminSchoolRecord = {
  id: string;
  name: string;
  logoUrl?: string;
  address?: string;
  governorate?: string;
  directorate?: string;
  stage?: string;
  educationLevel?: string;
  shift?: string;
  genderType?: string;
  approximateStudents?: string | number;
  adminName?: string;
  adminEmail?: string;
  planId?: string;
  studentCount?: number;
  featured?: boolean;
  showSubscriptionTimer?: boolean;
  status?: string;
  createdAt?: { toDate?: () => Date };
  subscriptionExpiresAt?: unknown;
};

type PackageRow = {
  id: string;
  name?: string;
  maxStudents?: number;
};

type SuperAdminSchoolRecordListProps = {
  schools: SuperAdminSchoolRecord[];
  packages: PackageRow[];
  presenceMap: Record<string, SchoolPresenceRecord | undefined>;
  isRtl: boolean;
  emptyMessage: string;
  onEdit: (school: SuperAdminSchoolRecord) => void;
  onToggleFeatured: (schoolId: string, featured?: boolean) => void;
  onToggleTimer: (schoolId: string, currentShow: boolean) => void;
  onExtendSubscription: (schoolId: string, subscriptionExpiresAt: unknown) => void;
};

function planForSchool(school: SuperAdminSchoolRecord, packages: PackageRow[]) {
  return packages.find((p) => p.id === school.planId);
}

function SchoolChip({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value == null || value === '') return null;
  return (
    <span className="sx-school-chip" title={`${label}: ${value}`}>
      <span className="sx-school-chip__label">{label}</span>
      <span className="sx-school-chip__value">{value}</span>
    </span>
  );
}

function SchoolLogo({ school }: { school: SuperAdminSchoolRecord }) {
  if (school.logoUrl) {
    return (
      <div className="sx-school-record-logo">
        <img src={school.logoUrl} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="sx-school-record-logo sx-school-record-logo--placeholder">
      <Building size={22} strokeWidth={2} />
    </div>
  );
}

function SchoolIdCopy({ id, isRtl }: { id: string; isRtl: boolean }) {
  const copy = useCallback(() => {
    if (!id) return;
    void navigator.clipboard?.writeText(id).then(() => {
      toast.success(isRtl ? 'تم نسخ المعرّف' : 'ID copied');
    });
  }, [id, isRtl]);

  return (
    <button
      type="button"
      onClick={copy}
      className="sx-school-record-id"
      title={isRtl ? 'نسخ المعرّف الكامل' : 'Copy full ID'}
    >
      <span className="font-mono">ID: {id?.slice(0, 8)}…</span>
      <Copy size={12} className="shrink-0 opacity-80" aria-hidden />
    </button>
  );
}

function SchoolQuickActions({
  school,
  isRtl,
  onEdit,
  onToggleFeatured,
  onToggleTimer,
  onExtendSubscription,
  layout,
}: {
  school: SuperAdminSchoolRecord;
  isRtl: boolean;
  onEdit: (school: SuperAdminSchoolRecord) => void;
  onToggleFeatured: (schoolId: string, featured?: boolean) => void;
  onToggleTimer: (schoolId: string, currentShow: boolean) => void;
  onExtendSubscription: (schoolId: string, subscriptionExpiresAt: unknown) => void;
  layout: 'inline' | 'stacked';
}) {
  return (
    <div
      className={
        layout === 'inline'
          ? 'sx-school-record-quick-actions'
          : 'sx-school-record-quick-actions sx-school-record-quick-actions--stacked'
      }
    >
      <button
        type="button"
        onClick={() => onToggleFeatured(school.id, school.featured)}
        title={
          school.featured
            ? 'إزالة من شركاء النجاح'
            : 'إضافة كشريك نجاح'
        }
        className={`sx-school-record-quick-btn ${school.featured ? 'sx-school-record-quick-btn--featured' : ''}`}
      >
        <Star size={16} fill={school.featured ? 'currentColor' : 'none'} />
      </button>
      <button
        type="button"
        onClick={() => onToggleTimer(school.id, !!school.showSubscriptionTimer)}
        title={school.showSubscriptionTimer ? 'إخفاء المؤقت' : 'إظهار المؤقت'}
        className={`sx-school-record-quick-btn ${school.showSubscriptionTimer ? 'sx-school-record-quick-btn--active' : ''}`}
      >
        {school.showSubscriptionTimer ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
      <button
        type="button"
        onClick={() => onEdit(school)}
        className="sx-school-record-quick-btn"
        title={isRtl ? 'إعدادات المدرسة' : 'School settings'}
      >
        <SettingsIcon size={16} />
      </button>
      <button
        type="button"
        onClick={() => onExtendSubscription(school.id, school.subscriptionExpiresAt)}
        className="sx-school-record-quick-btn sx-school-record-quick-btn--extend"
        title={isRtl ? 'تمديد الاشتراك' : 'Extend subscription'}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function SchoolPlanUsage({
  school,
  packages,
}: {
  school: SuperAdminSchoolRecord;
  packages: PackageRow[];
}) {
  const plan = planForSchool(school, packages);
  const maxStudents = plan?.maxStudents || 500;
  const count = school.studentCount || 0;
  const pct = Math.min(100, (count / maxStudents) * 100);

  return (
    <div className="sx-school-record-plan">
      <span className="sx-school-record-plan__badge">
        {plan?.name || 'BASIC_PLAN'}
      </span>
      <div className="sx-school-record-plan__bar" aria-hidden>
        <div className="sx-school-record-plan__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="sx-school-record-plan__count font-mono">
        {count}/{maxStudents} طالب
      </span>
    </div>
  );
}

function SchoolRecordCard({
  school,
  packages,
  presenceMap,
  isRtl,
  onEdit,
  onToggleFeatured,
  onToggleTimer,
  onExtendSubscription,
}: {
  school: SuperAdminSchoolRecord;
  packages: PackageRow[];
  presenceMap: Record<string, SchoolPresenceRecord | undefined>;
  isRtl: boolean;
  onEdit: (school: SuperAdminSchoolRecord) => void;
  onToggleFeatured: (schoolId: string, featured?: boolean) => void;
  onToggleTimer: (schoolId: string, currentShow: boolean) => void;
  onExtendSubscription: (schoolId: string, subscriptionExpiresAt: unknown) => void;
}) {
  const stage = school.stage || school.educationLevel;

  return (
    <article className="sx-school-record-card" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="sx-school-record-header">
        <SchoolLogo school={school} />
        <div className="sx-school-record-header__text min-w-0 flex-1">
          <h4 className="sx-school-record-title" title={school.name}>
            {school.name}
          </h4>
          <SchoolIdCopy id={school.id} isRtl={isRtl} />
        </div>
        <SchoolStatusBadge school={school} isRtl={isRtl} />
      </header>

      <div className="sx-school-record-chips">
        <SchoolChip label="المحافظة" value={school.governorate || 'غير محدد'} />
        <SchoolChip label="المديرية" value={school.directorate} />
        <SchoolChip label="المرحلة" value={stage} />
        <SchoolChip label="الدوام" value={school.shift} />
        <SchoolChip label="الفئة" value={school.genderType} />
        <SchoolChip
          label="السعة"
          value={
            school.approximateStudents
              ? `${school.approximateStudents} طالب`
              : undefined
          }
        />
      </div>

      {school.address ? (
        <p className="sx-school-record-address" title={school.address}>
          <MapPin size={14} className="shrink-0" aria-hidden />
          <span>{school.address}</span>
        </p>
      ) : null}

      <div className="sx-school-record-section">
        <p className="sx-school-record-section__label">الباقة والاستخدام</p>
        <SchoolPlanUsage school={school} packages={packages} />
      </div>

      <div className="sx-school-record-section sx-school-record-section--split">
        <div>
          <p className="sx-school-record-section__label">تاريخ التسجيل</p>
          <p className="sx-school-record-meta font-mono">
            {school.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || '—'}
          </p>
        </div>
        <div>
          <p className="sx-school-record-section__label">الاشتراك</p>
          {school.subscriptionExpiresAt ? (
            <SubscriptionTimer expiryDate={school.subscriptionExpiresAt} variant="compact" />
          ) : (
            <span className="sx-school-record-meta">وصول دائم</span>
          )}
        </div>
      </div>

      <div className="sx-school-record-section sx-school-record-section--split">
        <div>
          <p className="sx-school-record-section__label">النشاط المباشر</p>
          <SchoolPresenceBadge presence={presenceMap[school.id]} />
        </div>
        {school.adminName ? (
          <div className="min-w-0">
            <p className="sx-school-record-section__label">مدير المدرسة</p>
            <p className="sx-school-record-meta flex items-center gap-1.5" title={school.adminName}>
              <User size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{school.adminName}</span>
            </p>
          </div>
        ) : null}
      </div>

      <SchoolQuickActions
        school={school}
        isRtl={isRtl}
        onEdit={onEdit}
        onToggleFeatured={onToggleFeatured}
        onToggleTimer={onToggleTimer}
        onExtendSubscription={onExtendSubscription}
        layout="stacked"
      />

      <div className="sx-school-record-actions">
        <SchoolLifecycleButtons school={school} isRtl={isRtl} compact />
      </div>
    </article>
  );
}

function SchoolRecordTableRow({
  school,
  packages,
  presenceMap,
  isRtl,
  onEdit,
  onToggleFeatured,
  onToggleTimer,
  onExtendSubscription,
}: {
  school: SuperAdminSchoolRecord;
  packages: PackageRow[];
  presenceMap: Record<string, SchoolPresenceRecord | undefined>;
  isRtl: boolean;
  onEdit: (school: SuperAdminSchoolRecord) => void;
  onToggleFeatured: (schoolId: string, featured?: boolean) => void;
  onToggleTimer: (schoolId: string, currentShow: boolean) => void;
  onExtendSubscription: (schoolId: string, subscriptionExpiresAt: unknown) => void;
}) {
  const stage = school.stage || school.educationLevel;

  return (
    <tr className="sx-school-table__row group">
      <td className="sx-school-table__cell sx-school-table__cell--school">
        <div className="flex items-start gap-3">
          <SchoolLogo school={school} />
          <div className="min-w-0 flex-1">
            <p className="sx-school-record-title" title={school.name}>
              {school.name}
            </p>
            <SchoolIdCopy id={school.id} isRtl={isRtl} />
            {school.adminName ? (
              <p className="sx-school-record-meta mt-2 flex items-center gap-1.5" title={school.adminName}>
                <User size={13} className="shrink-0" aria-hidden />
                <span className="truncate">{school.adminName}</span>
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="sx-school-table__cell">
        <div className="sx-school-record-chips sx-school-record-chips--compact">
          <SchoolChip label="المحافظة" value={school.governorate || 'غير محدد'} />
          <SchoolChip label="المديرية" value={school.directorate} />
        </div>
        {school.address ? (
          <p className="sx-school-record-address sx-school-record-address--table" title={school.address}>
            <MapPin size={13} className="shrink-0" aria-hidden />
            <span className="line-clamp-2">{school.address}</span>
          </p>
        ) : null}
      </td>
      <td className="sx-school-table__cell">
        <div className="sx-school-record-chips sx-school-record-chips--compact">
          <SchoolChip label="المرحلة" value={stage} />
          <SchoolChip label="الدوام" value={school.shift} />
          <SchoolChip label="الفئة" value={school.genderType} />
          <SchoolChip
            label="السعة"
            value={
              school.approximateStudents
                ? `${school.approximateStudents}`
                : undefined
            }
          />
        </div>
      </td>
      <td className="sx-school-table__cell">
        <SchoolPlanUsage school={school} packages={packages} />
      </td>
      <td className="sx-school-table__cell">
        <p className="sx-school-record-meta font-mono">
          {school.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || '—'}
        </p>
        <p className="sx-school-record-section__label mt-2">الاشتراك</p>
        {school.subscriptionExpiresAt ? (
          <SubscriptionTimer expiryDate={school.subscriptionExpiresAt} variant="compact" />
        ) : (
          <span className="sx-school-record-meta">وصول دائم</span>
        )}
      </td>
      <td className="sx-school-table__cell">
        <div className="flex flex-col gap-3 items-start">
          <SchoolPresenceBadge presence={presenceMap[school.id]} />
          <SchoolStatusBadge school={school} isRtl={isRtl} />
        </div>
      </td>
      <td className="sx-school-table__cell sx-school-table__cell--actions">
        <SchoolQuickActions
          school={school}
          isRtl={isRtl}
          onEdit={onEdit}
          onToggleFeatured={onToggleFeatured}
          onToggleTimer={onToggleTimer}
          onExtendSubscription={onExtendSubscription}
          layout="inline"
        />
        <div className="sx-school-record-actions sx-school-record-actions--table">
          <SchoolLifecycleButtons school={school} isRtl={isRtl} compact />
        </div>
      </td>
    </tr>
  );
}

export function SuperAdminSchoolRecordList({
  schools,
  packages,
  presenceMap,
  isRtl,
  emptyMessage,
  onEdit,
  onToggleFeatured,
  onToggleTimer,
  onExtendSubscription,
}: SuperAdminSchoolRecordListProps) {
  if (schools.length === 0) {
    return (
      <p className="sx-school-record-empty">{emptyMessage}</p>
    );
  }

  return (
    <>
      <div className="sx-school-record-cards lg:hidden sx-school-record-list-scroll custom-scrollbar">
        {schools.map((school) => (
          <SchoolRecordCard
            key={school.id}
            school={school}
            packages={packages}
            presenceMap={presenceMap}
            isRtl={isRtl}
            onEdit={onEdit}
            onToggleFeatured={onToggleFeatured}
            onToggleTimer={onToggleTimer}
            onExtendSubscription={onExtendSubscription}
          />
        ))}
      </div>

      <div className="hidden lg:block sx-school-record-list-scroll sx-school-record-list-scroll--table custom-scrollbar w-full">
        <table className="sx-school-table sx-table sx-table--wide w-full text-right border-collapse">
          <thead>
            <tr>
              <th>المدرسة</th>
              <th>الموقع والعنوان</th>
              <th>المواصفات</th>
              <th>الباقة والطلاب</th>
              <th>الاشتراك</th>
              <th>النشاط والحالة</th>
              <th className="text-center">التحكم</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <SchoolRecordTableRow
                key={school.id}
                school={school}
                packages={packages}
                presenceMap={presenceMap}
                isRtl={isRtl}
                onEdit={onEdit}
                onToggleFeatured={onToggleFeatured}
                onToggleTimer={onToggleTimer}
                onExtendSubscription={onExtendSubscription}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

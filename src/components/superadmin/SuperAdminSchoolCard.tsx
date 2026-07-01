import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Building,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  MapPin,
  MoreHorizontal,
  Plus,
  Settings,
  Star,
  User,
} from 'lucide-react';
import { SubscriptionTimer } from '../SubscriptionTimer';
import { SchoolPresenceBadge } from './SchoolPresenceBadge';
import { SchoolLifecycleButtons } from './SchoolLifecycleButtons';
import type { SchoolPresenceRecord } from '../../lib/schoolPresence';
import { getSchoolStatusLabel } from '../../lib/schoolLifecycle';
import type { SuperAdminSchoolRecord } from './SuperAdminSchoolRecordList';

export type SchoolEnrichedStats = {
  staffCount: number;
  studentCount: number;
};

type PackageRow = { id: string; name?: string; maxStudents?: number };

type SuperAdminSchoolCardProps = {
  school: SuperAdminSchoolRecord;
  packages: PackageRow[];
  presenceMap: Record<string, SchoolPresenceRecord | undefined>;
  stats?: SchoolEnrichedStats;
  isRtl: boolean;
  lazy?: boolean;
  onEdit: (school: SuperAdminSchoolRecord) => void;
  onToggleFeatured: (schoolId: string, featured?: boolean) => void;
  onToggleTimer: (schoolId: string, currentShow: boolean) => void;
  onExtendSubscription: (schoolId: string, subscriptionExpiresAt: unknown) => void;
  onSchoolPermanentDeleted?: (schoolId: string) => void;
};

function planForSchool(school: SuperAdminSchoolRecord, packages: PackageRow[]) {
  return packages.find((p) => p.id === school.planId);
}

type DisplayStatus = 'active' | 'pending' | 'expired' | 'trial' | 'suspended';

function resolveDisplayStatus(
  school: SuperAdminSchoolRecord,
  planName?: string,
): DisplayStatus {
  const status = school.status || 'inactive';
  if (status === 'suspended' || status === 'archived') return 'suspended';
  if (status === 'pending_subscription' || status === 'pending_approval') {
    return 'pending';
  }
  const planLower = (planName || '').toLowerCase();
  if (planLower.includes('trial') || planLower.includes('تجرب')) return 'trial';

  const exp = school.subscriptionExpiresAt;
  if (exp) {
    const expMs = new Date(exp as string | number | Date).getTime();
    if (!Number.isNaN(expMs) && expMs < Date.now()) return 'expired';
  }

  if (status === 'active') return 'active';
  return 'pending';
}

function statusBadgeLabel(status: DisplayStatus, isRtl: boolean): string {
  const map: Record<DisplayStatus, { ar: string; en: string }> = {
    active: { ar: 'نشط', en: 'Active' },
    pending: { ar: 'قيد الانتظار', en: 'Pending' },
    expired: { ar: 'منتهي', en: 'Expired' },
    trial: { ar: 'تجريبي', en: 'Trial' },
    suspended: { ar: 'موقوف', en: 'Suspended' },
  };
  return isRtl ? map[status].ar : map[status].en;
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
      className="sx-sa-info-cell__value flex items-center gap-1 font-mono text-xs"
      aria-label={isRtl ? 'نسخ معرّف المدرسة' : 'Copy school ID'}
    >
      <span className="truncate">{id.slice(0, 10)}…</span>
      <Copy size={12} aria-hidden />
    </button>
  );
}

function IconAction({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`sx-sa-icon-btn ${active ? 'sx-sa-icon-btn--active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function SuperAdminSchoolCard({
  school,
  packages,
  presenceMap,
  stats,
  isRtl,
  lazy = false,
  onEdit,
  onToggleFeatured,
  onToggleTimer,
  onExtendSubscription,
  onSchoolPermanentDeleted,
}: SuperAdminSchoolCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [visible, setVisible] = useState(!lazy);
  const rootRef = useRef<HTMLElement | null>(null);
  const moreId = useId();

  const plan = planForSchool(school, packages);
  const stage = school.stage || school.educationLevel;
  const displayStatus = resolveDisplayStatus(school, plan?.name);
  const studentCount = stats?.studentCount ?? school.studentCount ?? 0;
  const staffCount = stats?.staffCount ?? 0;
  const presence = presenceMap[school.id];
  const legacyStatusLabel = getSchoolStatusLabel(school.status, isRtl);

  useEffect(() => {
    if (!lazy || visible) return;
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, visible]);

  const toggleExpand = () => setExpanded((v) => !v);

  if (!visible) {
    return (
      <div
        ref={(n) => {
          rootRef.current = n;
        }}
        className="sx-sa-school-card-placeholder"
        aria-hidden
      />
    );
  }

  return (
    <article
      ref={rootRef}
      className={`sx-sa-school-card ${expanded ? 'sx-sa-school-card--expanded' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <header className="sx-sa-school-card__head">
        <div className="sx-sa-school-card__avatar" aria-hidden>
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="" />
          ) : (
            <Building size={24} strokeWidth={2} />
          )}
        </div>
        <div className="sx-sa-school-card__title-block">
          <h4 className="sx-sa-school-card__title">{school.name}</h4>
          <p className="sx-sa-school-card__subtitle">
            {plan?.name || (isRtl ? 'باقة أساسية' : 'Basic plan')}
            {school.governorate ? ` · ${school.governorate}` : ''}
          </p>
        </div>
      </header>

      <div className="sx-sa-school-card__badges">
        <span
          className={`sx-sa-status-badge sx-sa-status-badge--${displayStatus}`}
          title={legacyStatusLabel}
        >
          {statusBadgeLabel(displayStatus, isRtl)}
        </span>
        <SchoolPresenceBadge presence={presence} compact />
      </div>

      <div className="sx-sa-stat-chips">
        <span className="sx-sa-stat-chip sx-sa-stat-chip--students">
          <span aria-hidden>👨‍🎓</span>
          <span>
            {studentCount} {isRtl ? 'طالب' : 'students'}
          </span>
        </span>
        <span className="sx-sa-stat-chip sx-sa-stat-chip--staff">
          <span aria-hidden>👩‍🏫</span>
          <span>
            {staffCount} {isRtl ? 'موظف' : 'staff'}
          </span>
        </span>
        <span className="sx-sa-stat-chip sx-sa-stat-chip--plan">
          <span aria-hidden>💰</span>
          <span>{plan?.name || 'Basic'}</span>
        </span>
      </div>

      <button
        type="button"
        className="sx-sa-school-card__expand"
        onClick={toggleExpand}
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            <ChevronUp size={16} aria-hidden />
            {isRtl ? 'إخفاء التفاصيل' : 'Hide details'}
          </>
        ) : (
          <>
            <ChevronDown size={16} aria-hidden />
            {isRtl ? 'عرض التفاصيل' : 'Show details'}
          </>
        )}
      </button>

      <div className="sx-sa-school-card__info-grid sx-sa-school-card__info-grid--details">
        <div className="sx-sa-info-cell">
          <p className="sx-sa-info-cell__label">{isRtl ? 'المحافظة' : 'Governorate'}</p>
          <p className="sx-sa-info-cell__value">{school.governorate || '—'}</p>
        </div>
        <div className="sx-sa-info-cell">
          <p className="sx-sa-info-cell__label">{isRtl ? 'المرحلة' : 'Stage'}</p>
          <p className="sx-sa-info-cell__value">{stage || '—'}</p>
        </div>
        <div className="sx-sa-info-cell">
          <p className="sx-sa-info-cell__label">{isRtl ? 'تاريخ التسجيل' : 'Registered'}</p>
          <p className="sx-sa-info-cell__value font-mono">
            {school.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || '—'}
          </p>
        </div>
        <div className="sx-sa-info-cell">
          <p className="sx-sa-info-cell__label">{isRtl ? 'الاشتراك المتبقي' : 'Subscription'}</p>
          <p className="sx-sa-info-cell__value">
            {school.subscriptionExpiresAt ? (
              <SubscriptionTimer expiryDate={school.subscriptionExpiresAt} variant="compact" />
            ) : (
              isRtl ? 'وصول دائم' : 'Unlimited'
            )}
          </p>
        </div>
        <div className="sx-sa-info-cell">
          <p className="sx-sa-info-cell__label">{isRtl ? 'آخر نشاط' : 'Last activity'}</p>
          <p className="sx-sa-info-cell__value">
            <SchoolPresenceBadge presence={presence} />
          </p>
        </div>
        {school.adminName ? (
          <div className="sx-sa-info-cell">
            <p className="sx-sa-info-cell__label">{isRtl ? 'مدير المدرسة' : 'Admin'}</p>
            <p className="sx-sa-info-cell__value flex items-center gap-1.5 min-w-0">
              <User size={14} className="shrink-0" aria-hidden />
              <span className="truncate">{school.adminName}</span>
            </p>
          </div>
        ) : null}
        {school.address ? (
          <div className="sx-sa-info-cell" style={{ gridColumn: '1 / -1' }}>
            <p className="sx-sa-info-cell__label">{isRtl ? 'العنوان' : 'Address'}</p>
            <p className="sx-sa-info-cell__value flex items-start gap-1.5">
              <MapPin size={14} className="shrink-0 mt-0.5" aria-hidden />
              <span>{school.address}</span>
            </p>
          </div>
        ) : null}
        <div className="sx-sa-info-cell">
          <p className="sx-sa-info-cell__label">{isRtl ? 'معرّف المدرسة' : 'School ID'}</p>
          <SchoolIdCopy id={school.id} isRtl={isRtl} />
        </div>
      </div>

      <footer className="sx-sa-school-card__toolbar">
        <div className="sx-sa-icon-btn-group max-sm:hidden">
          <IconAction
            label={school.featured ? 'إزالة من شركاء النجاح' : 'إضافة كشريك نجاح'}
            onClick={() => onToggleFeatured(school.id, school.featured)}
            active={!!school.featured}
          >
            <Star size={18} fill={school.featured ? 'currentColor' : 'none'} />
          </IconAction>
          <IconAction
            label={school.showSubscriptionTimer ? 'إخفاء المؤقت' : 'إظهار المؤقت'}
            onClick={() => onToggleTimer(school.id, !!school.showSubscriptionTimer)}
            active={!!school.showSubscriptionTimer}
          >
            {school.showSubscriptionTimer ? <Eye size={18} /> : <EyeOff size={18} />}
          </IconAction>
          <IconAction
            label={isRtl ? 'تعديل المدرسة' : 'Edit school'}
            onClick={() => onEdit(school)}
          >
            <Settings size={18} />
          </IconAction>
          <IconAction
            label={isRtl ? 'تمديد الاشتراك' : 'Extend subscription'}
            onClick={() => onExtendSubscription(school.id, school.subscriptionExpiresAt)}
          >
            <Plus size={18} />
          </IconAction>
        </div>

        <div className="sx-sa-more-menu sm:hidden">
          <button
            type="button"
            className="sx-sa-icon-btn"
            aria-label={isRtl ? 'المزيد من الإجراءات' : 'More actions'}
            aria-expanded={moreOpen}
            aria-controls={moreId}
            onClick={() => setMoreOpen((v) => !v)}
          >
            <MoreHorizontal size={20} />
          </button>
          {moreOpen ? (
            <div id={moreId} className="sx-sa-more-menu__panel" role="menu">
              <div className="sx-sa-icon-btn-group mb-3">
                <IconAction
                  label={school.featured ? 'إزالة من شركاء النجاح' : 'إضافة كشريك نجاح'}
                  onClick={() => {
                    onToggleFeatured(school.id, school.featured);
                    setMoreOpen(false);
                  }}
                  active={!!school.featured}
                >
                  <Star size={18} fill={school.featured ? 'currentColor' : 'none'} />
                </IconAction>
                <IconAction
                  label={school.showSubscriptionTimer ? 'إخفاء المؤقت' : 'إظهار المؤقت'}
                  onClick={() => {
                    onToggleTimer(school.id, !!school.showSubscriptionTimer);
                    setMoreOpen(false);
                  }}
                  active={!!school.showSubscriptionTimer}
                >
                  {school.showSubscriptionTimer ? <Eye size={18} /> : <EyeOff size={18} />}
                </IconAction>
                <IconAction
                  label={isRtl ? 'تعديل' : 'Edit'}
                  onClick={() => {
                    onEdit(school);
                    setMoreOpen(false);
                  }}
                >
                  <Settings size={18} />
                </IconAction>
                <IconAction
                  label={isRtl ? 'الاشتراك' : 'Subscription'}
                  onClick={() => {
                    onExtendSubscription(school.id, school.subscriptionExpiresAt);
                    setMoreOpen(false);
                  }}
                >
                  <Plus size={18} />
                </IconAction>
              </div>
              <div className="sx-sa-school-card__lifecycle">
                <SchoolLifecycleButtons
                  school={school}
                  isRtl={isRtl}
                  compact
                  onPermanentDeleted={onSchoolPermanentDeleted}
                />
              </div>
            </div>
          ) : null}
        </div>
      </footer>

      <div className="hidden sm:block sx-sa-school-card__lifecycle">
        <SchoolLifecycleButtons
          school={school}
          isRtl={isRtl}
          compact
          onPermanentDeleted={onSchoolPermanentDeleted}
        />
      </div>
    </article>
  );
}

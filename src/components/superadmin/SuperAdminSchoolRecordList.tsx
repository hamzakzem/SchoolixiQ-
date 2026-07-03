import React from 'react';
import {
  SuperAdminSchoolCard,
  type SchoolEnrichedStats,
} from './SuperAdminSchoolCard';
import type { SchoolPresenceRecord } from '../../lib/schoolPresence';

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
  isDeleted?: boolean;
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
  schoolStatsMap?: Record<string, SchoolEnrichedStats>;
  isRtl: boolean;
  emptyMessage: string;
  onEdit: (school: SuperAdminSchoolRecord) => void;
  onToggleFeatured: (schoolId: string, featured?: boolean) => void;
  onToggleTimer: (schoolId: string, currentShow: boolean) => void;
  onExtendSubscription: (schoolId: string, subscriptionExpiresAt: unknown) => void;
  onSchoolPermanentDeleted?: (schoolId: string) => void;
};

const LAZY_THRESHOLD = 20;

export function SuperAdminSchoolRecordList({
  schools,
  packages,
  presenceMap,
  schoolStatsMap,
  isRtl,
  emptyMessage,
  onEdit,
  onToggleFeatured,
  onToggleTimer,
  onExtendSubscription,
  onSchoolPermanentDeleted,
}: SuperAdminSchoolRecordListProps) {
  if (schools.length === 0) {
    return <p className="sx-sa-schools-empty">{emptyMessage}</p>;
  }

  const useLazy = schools.length > LAZY_THRESHOLD;

  return (
    <div className="sx-schools-grid-root sx-sa-schools-grid-wrap">
      <div className="sx-schools-grid sx-sa-schools-grid" role="list">
        {schools.map((school) => (
          <div key={school.id} role="listitem" className="sx-schools-grid__item">
            <SuperAdminSchoolCard
              school={school}
              packages={packages}
              presenceMap={presenceMap}
              stats={schoolStatsMap?.[school.id]}
              isRtl={isRtl}
              lazy={useLazy}
              onEdit={onEdit}
              onToggleFeatured={onToggleFeatured}
              onToggleTimer={onToggleTimer}
              onExtendSubscription={onExtendSubscription}
              onSchoolPermanentDeleted={onSchoolPermanentDeleted}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

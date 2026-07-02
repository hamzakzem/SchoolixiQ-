import type { DistributorRecord } from '../types/distributor';

export type DistributorAccessState = 'loading' | 'active' | 'pending' | 'rejected' | 'blocked';

export function resolveDistributorApprovalStatus(
  distributor: Pick<DistributorRecord, 'status' | 'active' | 'canLogin'> | null | undefined,
): DistributorAccessState {
  if (!distributor) return 'loading';

  const rawStatus = String(distributor.status || '').toLowerCase();
  if (rawStatus === 'pending') return 'pending';
  if (rawStatus === 'rejected') return 'rejected';

  if (rawStatus === 'active' || distributor.active === true) {
    if (distributor.canLogin === false) return 'blocked';
    return 'active';
  }

  // Legacy records created before approval workflow
  if (!rawStatus && distributor.active !== false) {
    return distributor.canLogin === false ? 'blocked' : 'active';
  }

  return 'blocked';
}

export function canDistributorAccessDashboard(
  distributor: Pick<DistributorRecord, 'status' | 'active' | 'canLogin'> | null | undefined,
): boolean {
  return resolveDistributorApprovalStatus(distributor) === 'active';
}

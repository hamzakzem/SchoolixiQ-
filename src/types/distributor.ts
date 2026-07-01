export type DistributorCommissionStatus = 'pending' | 'earned' | 'paid' | 'canceled';

export type DistributorRecord = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  commissionPercent: number;
  active?: boolean;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type DistributorCouponRecord = {
  id: string;
  code: string;
  distributorId: string;
  distributorName?: string;
  discountPercent?: number;
  discountAmount?: number;
  commissionPercent?: number;
  active?: boolean;
  maxRedemptions?: number;
  redemptionCount?: number;
  createdAt?: unknown;
};

export type DistributorMonthlyCommission = {
  id: string;
  distributorId: string;
  distributorName: string;
  schoolId: string;
  schoolName: string;
  monthKey: string;
  planId: string;
  planName: string;
  subscriptionAmount: number;
  discountAmount: number;
  netAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: DistributorCommissionStatus;
  generatedAt?: unknown;
  earnedAt?: unknown;
  paidAt?: unknown;
  paidBy?: string;
  canceledAt?: unknown;
  notes?: string;
};

export type GenerateMonthlyCommissionsResult = {
  ok?: boolean;
  generated: number;
  skippedInactive: number;
  skippedUnpaid: number;
  alreadyExists: number;
  monthKey: string;
};

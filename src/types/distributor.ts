export type DistributorCommissionStatus = 'pending' | 'earned' | 'paid' | 'canceled';

export type DistributorStatus = 'active' | 'inactive' | 'suspended';

export type DistributorRecord = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  commissionPercent: number;
  active?: boolean;
  notes?: string;
  governorate?: string;
  region?: string;
  distributorType?: string;
  parentDistributorId?: string;
  parentDistributorName?: string;
  status?: DistributorStatus;
  userId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type DistributorSchoolSummary = {
  id: string;
  name: string;
  governorate?: string;
  planId?: string;
  planName?: string;
  status?: string;
  subscriptionStatus?: string;
  paymentStatus?: string;
  distributorLinkedAt?: unknown;
  lastPaymentAt?: string;
  distributorCommissionPaused?: boolean;
  currentMonthCommission?: number;
  totalCommissionFromSchool?: number;
  isActive?: boolean;
};

export type DistributorDashboardStats = {
  totalSchools: number;
  activeSchools: number;
  thisMonthCommission: number;
  totalDue: number;
  totalPaid: number;
  pendingCommissions: number;
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
  maxUses?: number;
  expiresAt?: unknown;
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

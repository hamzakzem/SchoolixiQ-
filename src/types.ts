export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  ASSISTANT = 'assistant',
  TEACHER = 'teacher',
  PARENT = 'parent',
  STAFF = 'staff',
  GUARD = 'guard',
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  status?: 'active' | 'pending' | 'suspended';
  subscriptionStatus?: 'active' | 'pending' | 'expired';
  pendingRegistrationId?: string;
  phoneNumber?: string;
  phone?: string;
  photoURL?: string;
  subject?: string;
  assignedClassId?: string;
  assignedClassName?: string;
  preferredClassId?: string;
  preferredSubject?: string;
  permissions?: Record<string, boolean>;
  salary?: number;
}

export interface School {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'suspended' | 'archived' | 'pending_subscription' | 'pending_approval' | 'rejected' | 'inactive';
  isDeleted?: boolean;
  ownerUid: string;
  logoUrl?: string;
  subscriptionExpiresAt?: any; // Timestamp
  showSubscriptionTimer?: boolean;
  notificationsEnabled?: boolean;
  featured?: boolean;
}

export interface Student {
  id: string;
  name: string;
  schoolId: string;
  classId: string;
  parentIds: string[];
  registrationNumber: string;
  dateOfBirth?: string;
  tuitionBalance: number;
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  score: number;
  maxScore: number;
  type: 'daily' | 'monthly' | 'semester' | 'yearly';
  date: string;
  schoolId: string;
  teacherId: string;
}

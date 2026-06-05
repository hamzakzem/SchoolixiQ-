export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  ASSISTANT = 'assistant',
  TEACHER = 'teacher',
  PARENT = 'parent',
  STAFF = 'staff'
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
  phoneNumber?: string;
  phone?: string;
  schoolPhone?: string;
  schoolName?: string;
  language?: string;
  photoURL?: string;
  subject?: string;
  preferredClassId?: string;
  preferredSubject?: string;
  permissions?: Record<string, boolean>;
  certificateColumns?: string[];
  salary?: number;
}

export interface School {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'suspended' | 'pending_subscription' | 'pending_approval' | 'rejected';
  ownerUid: string;
  logoUrl?: string;
  adminEmail?: string;
  adminPhone?: string;
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

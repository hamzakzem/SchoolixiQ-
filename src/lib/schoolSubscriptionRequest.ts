import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import {
  buildRegistrationCustomerInfo,
  buildSchoolFirestoreFields,
  type SchoolRegistrationFormValues,
} from '../components/auth/SchoolRegistrationFields';

export type BillingCycle = 'monthly' | 'annually';

export function packageDisplayPrice(
  pkg: { price?: number; priceMonthly?: number; priceYearly?: number },
  billingCycle: BillingCycle,
): number {
  const isMonthly = billingCycle === 'monthly';
  if (isMonthly) {
    return pkg.priceMonthly !== undefined
      ? pkg.priceMonthly
      : Math.round((pkg.price || 0) / 12);
  }
  return pkg.priceYearly !== undefined ? pkg.priceYearly : pkg.price || 0;
}

export type SchoolSubscriptionRegistrationInput = {
  uid?: string;
  email: string;
  adminPassword?: string;
  schoolName: string;
  adminName?: string;
  phone: string;
  schoolRegistration: SchoolRegistrationFormValues;
  package: {
    id: string;
    name: string;
    price?: number;
    priceMonthly?: number;
    priceYearly?: number;
  };
  billingCycle: BillingCycle;
  type?: 'direct_school_signup' | 'subscription_request';
};

export async function createSchoolSubscriptionRegistration(
  input: SchoolSubscriptionRegistrationInput,
): Promise<string> {
  const isMonthly = input.billingCycle === 'monthly';
  const actualPrice = packageDisplayPrice(input.package, input.billingCycle);
  const schoolFields = buildSchoolFirestoreFields(input.schoolRegistration);
  const email = input.email.toLowerCase().trim();
  const customerInfo = buildRegistrationCustomerInfo(
    input.schoolName.trim(),
    email,
    input.phone.trim(),
    input.schoolRegistration,
  );

  const ref = await addDoc(collection(db, 'registrations'), {
    type: input.type || 'direct_school_signup',
    uid: input.uid || null,
    email,
    schoolName: input.schoolName.trim(),
    name: input.adminName?.trim() || input.schoolName.trim(),
    adminName: input.adminName?.trim() || input.schoolName.trim(),
    adminEmail: email,
    adminPhone: input.phone.trim(),
    adminPassword: input.adminPassword || null,
    password: input.adminPassword || null,
    customerInfo,
    ...schoolFields,
    packageId: input.package.id,
    packageName: input.package.name,
    planId: input.package.id,
    price: actualPrice,
    billingCycle: input.billingCycle,
    durationDays: isMonthly ? 30 : 365,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

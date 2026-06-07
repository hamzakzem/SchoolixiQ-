export {
  isNativeApp,
  isInIframe,
  isInAppWebView,
  openAndroidChromeIntent,
} from './environment';

export {
  classifyAuthError,
  getAuthErrorMessage,
  toAuthAppError,
  type AuthErrorKind,
} from './errors';

export {
  signInWithGoogle,
  authenticateWithGoogle,
  type GoogleSignInOptions,
} from './googleSignIn';

export {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  validatePasswordComplexity,
  type EmailSignUpInput,
} from './emailAuth';

export {
  provisionUserProfile,
  healSchoolDataOnLogin,
  type SchoolSignupFields,
  type ProvisionProfileInput,
} from './profileProvisioning';

export {
  submitPendingAdminSubscription,
  isPendingSchoolAdmin,
  isActiveSchoolAdmin,
  isSchoolDraftComplete,
  draftToCustomerInfo,
  draftToSubscriptionForm,
  type AdminRegistrationCustomerInfo,
  type AdminSchoolDraft,
  type PendingAdminPackage,
} from './adminRegistration';

export {
  activateSchoolRegistration,
  activateExistingSchoolAdmin,
  activateSubscriptionSchool,
  resolveAdminUidFromRequest,
  healAdminActivationOnLogin,
  type SchoolRegistrationRequest,
  type ActivationResult,
} from './schoolActivation';

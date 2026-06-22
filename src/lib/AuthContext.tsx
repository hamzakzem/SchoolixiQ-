import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  doc, 
  query, 
  collection, 
  where, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from './firestore-errors';
import { buildTeacherRedactionContext } from './userProfile';
import { resolveProfilePermissions } from './staffPermissions';
import { normalizePackagePermissions } from './featureRegistry';
import { useLanguage } from './LanguageContext';
import {
  startWebPushAutoRegistration,
  stopWebPushAutoRegistration,
  setPushLogoutInProgress,
  isPushLogoutInProgress,
} from './webPushService';
import {
  isLogoutInProgress,
  setLogoutInProgress,
  setLogoutLogSnapshot,
  shouldIgnoreFirestoreListenerError,
  shouldSkipFirestoreListeners,
  subscribeGuardedFirestore,
} from './logoutGuard';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  schoolData: any | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  schoolData: null, 
  loading: true 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolData, setSchoolData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  /** Set only after SAVE_TOKEN_SUCCESS or permission denied — never on default/skip. */
  const pushRegistrationDoneRef = useRef<'success' | 'denied' | null>(null);
  const loginLoggedRef = useRef<string | null>(null);
  const profileSnapshotRef = useRef<{
    uid: string;
    role: string;
    schoolId?: string;
    email?: string | null;
  } | null>(null);
  
  const { language, setLanguage } = useLanguage();
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const triggerNativePushRegistration = (uid: string, source: string) => {
    if (!uid || !Capacitor.isNativePlatform()) return;
    if (isLogoutInProgress()) {
      console.info('[NativePush] AUTH_CONTEXT_SKIP', { uid, source, reason: 'logging_out' });
      return;
    }
    console.info('[NativePush] AUTH_CONTEXT_START', { uid, source, platform: Capacitor.getPlatform() });
    void import('./pushService').then(({ registerForPushNotifications }) =>
      registerForPushNotifications(uid),
    );
  };

  const triggerWebPushRegistration = (uid: string, source: string) => {
    if (!uid) return;
    if (Capacitor.isNativePlatform()) {
      console.info('[FCM] AUTH_CONTEXT_CALL_SKIP', { uid, source, reason: 'native_platform' });
      return;
    }
    if (isPushLogoutInProgress()) {
      console.info('[FCM] AUTH_CONTEXT_CALL_SKIP', {
        uid,
        source,
        reason: 'logging_out',
      });
      return;
    }
    if (pushRegistrationDoneRef.current === 'success') {
      console.info('[FCM] AUTH_CONTEXT_CALL_SKIP', {
        uid,
        source,
        reason: 'already_registered',
      });
      return;
    }
    if (pushRegistrationDoneRef.current === 'denied') {
      console.info('[FCM] AUTH_CONTEXT_CALL_SKIP', {
        uid,
        source,
        reason: 'permission_denied',
      });
      return;
    }
    console.info('[FCM] AUTH_CONTEXT_CALL_START', { uid, source });
    startWebPushAutoRegistration(uid, {
      onSettled: (result) => {
        if (result?.ok) {
          pushRegistrationDoneRef.current = 'success';
        } else if (result?.reason === 'permission_denied') {
          pushRegistrationDoneRef.current = 'denied';
        }
      },
    });
  };

  useEffect(() => {
    // Basic connection test as per skill guidelines
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'system', 'connection-test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection check failed: Client is offline");
        }
      }
    }
    testConnection();

    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeSchool: (() => void) | null = null;
    let unsubscribePackage: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        lastUserIdRef.current = authUser.uid;
      } else {
        const logoutSnapshot = profileSnapshotRef.current;
        profileSnapshotRef.current = null;
        loginLoggedRef.current = null;
        setLogoutLogSnapshot(null);

        lastUserIdRef.current = null;
        pushRegistrationDoneRef.current = null;
        setLogoutInProgress(true);
        setPushLogoutInProgress(true);
        stopWebPushAutoRegistration('logout');
      }
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeSchool) {
        unsubscribeSchool();
        unsubscribeSchool = null;
      }
      if (unsubscribePackage) {
        unsubscribePackage();
        unsubscribePackage = null;
      }

      if (authUser) {
        setLogoutInProgress(false);
        setPushLogoutInProgress(false);
        lastUserIdRef.current = authUser.uid;
        triggerNativePushRegistration(authUser.uid, 'auth_state_changed');
        triggerWebPushRegistration(authUser.uid, 'auth_state_changed');

        const docRef = doc(db, 'users', authUser.uid);
        unsubscribeProfile = subscribeGuardedFirestore(docRef, async (docSnap) => {
          if (shouldSkipFirestoreListeners()) return;
          if (docSnap.exists()) {
            const rawProfile = docSnap.data() as Record<string, unknown>;
            const redactionCtx =
              buildTeacherRedactionContext(rawProfile) || rawProfile;
            const { _credentialValues: _profileCreds, ...data } =
              redactionCtx as Record<string, unknown>;
            
            // Sync user language from firestore database, or save local default
            if (data.language && data.language !== languageRef.current) {
              setLanguage(data.language);
            } else if (!data.language && languageRef.current) {
              try {
                await updateDoc(docRef, { language: languageRef.current });
              } catch (e) {
                console.warn('Failed to save default user language to database:', e);
              }
            }

            let claims: any = {};
            try {
              let tokenResult = await authUser.getIdTokenResult();
              claims = tokenResult.claims || {};
              
              if (data.role && (claims.role !== data.role || claims.schoolId !== data.schoolId)) {
                console.log("Stale or mismatched claims detected on snapshot. Forcing ID token refresh...");
                try {
                  tokenResult = await authUser.getIdTokenResult(true);
                  claims = tokenResult.claims || {};
                } catch (refreshErr) {
                  console.warn("Failed to force refresh token:", refreshErr);
                }
              }
            } catch (tokenError) {
              console.warn("Failed to get ID token result or session revoked, using firestore backup:", tokenError);
            }
            
            const resolvedPermissions = resolveProfilePermissions(
              data.permissions,
              claims.p,
            );

            const nextProfile = {
              uid: authUser.uid,
              ...data,
              permissions: resolvedPermissions as UserProfile['permissions'],
            } as UserProfile;

            setProfile(nextProfile);

            profileSnapshotRef.current = {
              uid: authUser.uid,
              role: String(data.role || 'unknown'),
              schoolId: data.schoolId ? String(data.schoolId) : undefined,
              email: authUser.email,
            };
            setLogoutLogSnapshot(profileSnapshotRef.current);

            if (loginLoggedRef.current !== authUser.uid) {
              loginLoggedRef.current = authUser.uid;
              import('./loginLog').then(({ writeLoginLog }) =>
                writeLoginLog({
                  userId: authUser.uid,
                  role: String(data.role || 'unknown'),
                  schoolId: data.schoolId ? String(data.schoolId) : undefined,
                  event: 'login',
                  email: authUser.email,
                }),
              );
            }

            if (
              Array.isArray(resolvedPermissions) &&
              JSON.stringify(resolvedPermissions) !== JSON.stringify(claims.p)
            ) {
              try {
                await authUser.getIdToken(true);
              } catch (refreshErr) {
                console.warn('Failed to refresh token after permissions update:', refreshErr);
              }
            }

            // Active school admins can render while school/package data streams in
            if (
              data.role === 'admin' &&
              data.schoolId &&
              (data.status === 'active' ||
                data.subscriptionStatus === 'active' ||
                (!data.pendingRegistrationId && data.schoolId))
            ) {
              setLoading(false);
            }
            
            // Native Capacitor push — independent from web FCM; retries after profile load.
            triggerNativePushRegistration(
              authUser.uid,
              'profile_snapshot',
            );

            // Retry web FCM once profile is confirmed (all roles).
            triggerWebPushRegistration(authUser.uid, 'profile_snapshot');

            // Listen to school data if schoolId exists
            if (data.schoolId) {
              if (!schoolData || schoolData.id !== data.schoolId) {
                if (unsubscribeSchool) unsubscribeSchool();
                unsubscribeSchool = subscribeGuardedFirestore(doc(db, 'schools', data.schoolId), (s) => {
                  if (shouldSkipFirestoreListeners()) return;
                  if (s.exists()) {
                    const schoolInfo = { id: s.id, ...s.data() } as any;
                    setSchoolData(schoolInfo);
                    
                    // Listen to active active package for the school
                    if (schoolInfo.planId && unsubscribePackage === null) {
                      unsubscribePackage = subscribeGuardedFirestore(doc(db, 'packages', schoolInfo.planId), (pkgSnap) => {
                        if (shouldSkipFirestoreListeners()) return;
                        if (pkgSnap.exists()) {
                          setSchoolData((currVal: any) => ({
                            ...currVal,
                            packagePermissions: normalizePackagePermissions(
                              pkgSnap.data().permissions || {},
                            ),
                          }));
                        }
                        setLoading(false);
                      }, (error) => {
                        if (shouldIgnoreFirestoreListenerError(error)) return;
                        console.error("Error fetching package for school", error);
                        setLoading(false);
                      });
                    } else {
                      if (!schoolInfo.planId && unsubscribePackage) {
                        unsubscribePackage();
                        unsubscribePackage = null;
                      }
                      setLoading(false);
                    }
                  } else {
                    setSchoolData(null);
                    setLoading(false);
                  }
                }, (error) => {
                  if (shouldIgnoreFirestoreListenerError(error)) return;
                  handleFirestoreError(error, OperationType.GET, `AuthContext:schools/${data.schoolId}`);
                  setLoading(false);
                });
              } else {
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          } else {
            // Check claims first - if server already set them, we can trust them
            let claims: any = {};
            try {
              const tokenResult = await authUser.getIdTokenResult();
              claims = tokenResult.claims || {};
            } catch (tokenErr) {
              console.warn("Failed to retrieve ID token before profile load:", tokenErr);
            }
            
            console.log(`[AUTH DIAG] Profile not found in Firestore for UID ${authUser.uid}. Claims:`, claims);
            
            if (claims && claims.role) {
              const fallbackRole = claims.role;
              const fallbackSchoolId = claims.schoolId || '';
              const fallbackName = authUser.displayName || claims.name || (authUser.email ? authUser.email.split('@')[0] : 'مستخدم');
              const fallbackEmail = authUser.email ? authUser.email.toLowerCase() : '';

              console.log(`[AUTH PROFILE FALLBACK] Creating missing Firestore profile for UID ${authUser.uid} from Firebase claims/auth:`, {
                email: fallbackEmail,
                role: fallbackRole,
                schoolId: fallbackSchoolId,
                name: fallbackName
              });

              try {
                // Ensure profile document is created
                await setDoc(doc(db, 'users', authUser.uid), {
                  uid: authUser.uid,
                  email: fallbackEmail,
                  name: fallbackName,
                  role: fallbackRole,
                  schoolId: fallbackSchoolId,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  autoProv: true // indicator for logging
                }, { merge: true });
                
                // Return immediately, the onSnapshot listener will be reactively updated and correctly fetch it in the next cycle
                return;
              } catch (createErr) {
                console.error("[AUTH PROFILE FALLBACK] Failed to auto-create missing user profile:", createErr);
              }
            }

            // Profile doesn't exist for this UID, check if it was pre-registered by email
            if (!authUser.email) {
              if (!claims.role) setProfile(null);
              setLoading(false);
              return;
            }

            try {
              const q = query(collection(db, 'users'), where('email', '==', authUser.email.toLowerCase()));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const provisionedDoc = querySnapshot.docs[0];
                const oldId = provisionedDoc.id;
                
                // Only claim if it's a random ID profile (not already a UID)
                if (oldId !== authUser.uid) {
                  const data = provisionedDoc.data();
                  
                  // 1. Create the correct profile doc with UID
                  await setDoc(doc(db, 'users', authUser.uid), {
                    ...data,
                    claimedAt: serverTimestamp(),
                    uid: authUser.uid
                  });

                  // We don't set loading to false here, because the onSnapshot for authUser.uid will trigger
                  // and set the profile and loading = false then.
                  
                  // 2. Update all students who point to the old ID
                  const studentsQ = query(collection(db, 'students'), where('parentIds', 'array-contains', oldId));
                  const studentsSnap = await getDocs(studentsQ);
                  
                  const updatePromises = studentsSnap.docs.map(studentDoc => {
                    const currentIds = studentDoc.data().parentIds || [];
                    const updatedIds = currentIds.map((id: string) => id === oldId ? authUser.uid : id);
                    return updateDoc(doc(db, 'students', studentDoc.id), { parentIds: updatedIds });
                  });
                  
                  try {
                    await Promise.all(updatePromises);
                  } catch (e) {
                    console.warn("Failed to update some students during claim:", e);
                  }
                  
                  // 3. Delete the provisioned doc
                  await deleteDoc(doc(db, 'users', oldId));
                } else {
                  setLoading(false);
                }
              } else {
                setProfile(null);
                setLoading(false);
              }
            } catch (error) {
              console.error("Error claiming profile:", error);
              setProfile(null);
              setLoading(false);
            }
          }
        }, (error) => {
          if (shouldIgnoreFirestoreListenerError(error)) return;
          handleFirestoreError(error, OperationType.GET, `AuthContext:users/${authUser.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setSchoolData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeSchool) unsubscribeSchool();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, schoolData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  doc, 
  onSnapshot, 
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
import { useLanguage } from './LanguageContext';
import { isSchoolRegistrationInProgress } from './schoolRegistrationSession';
import { waitForGoogleRedirectBootstrap } from './googleRedirectBootstrap';

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

const AUTH_LOADING_TIMEOUT_MS = 12000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolData, setSchoolData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { language, setLanguage } = useLanguage();
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const startLoadingTimeout = () => {
    clearLoadingTimeout();
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('[Auth] Loading timeout — continuing without blocking UI');
      setLoading(false);
    }, AUTH_LOADING_TIMEOUT_MS);
  };

  const finishLoading = () => {
    clearLoadingTimeout();
    setLoading(false);
  };

  useEffect(() => {
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

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      void (async () => {
        await waitForGoogleRedirectBootstrap();

      const previousUid = lastUserIdRef.current;
      const isNewSession = authUser?.uid !== previousUid;

      if (authUser) {
        lastUserIdRef.current = authUser.uid;
      } else {
        lastUserIdRef.current = null;
      }

      setUser(authUser);

      if (authUser && isSchoolRegistrationInProgress()) {
        setProfile(null);
        setSchoolData(null);
        finishLoading();
        return;
      }

      if (!authUser) {
        if (previousUid) {
          void import('./pushService').then(({ unregisterPushToken }) =>
            unregisterPushToken(previousUid)
          ).catch(() => {});
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
        setProfile(null);
        setSchoolData(null);
        finishLoading();
        return;
      }

      if (isNewSession) {
        setLoading(true);
        startLoadingTimeout();
        setProfile(null);
        setSchoolData(null);
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

      const docRef = doc(db, 'users', authUser.uid);
      unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
        void (async () => {
          try {
            if (docSnap.exists()) {
              const data = docSnap.data() as any;

              if (data.language && data.language !== languageRef.current) {
                setLanguage(data.language);
              } else if (!data.language && languageRef.current) {
                updateDoc(docRef, { language: languageRef.current }).catch(() => {});
              }

              let claims: Record<string, unknown> = {};
              try {
                let tokenResult = await authUser.getIdTokenResult();
                claims = tokenResult.claims || {};

                if (data.role && (claims.role !== data.role || claims.schoolId !== data.schoolId)) {
                  try {
                    tokenResult = await authUser.getIdTokenResult(true);
                    claims = tokenResult.claims || {};
                  } catch {
                    /* use existing claims */
                  }
                }
              } catch {
                /* firestore profile is source of truth */
              }

              setProfile({
                uid: authUser.uid,
                ...data,
                permissions: (claims.p as UserProfile['permissions']) || data.permissions || null,
              } as UserProfile);

              void import('./pushService')
                .then(({ registerForPushNotifications }) =>
                  registerForPushNotifications(authUser.uid, data.role, data.schoolId || '')
                )
                .catch(() => {});

              if (data.schoolId) {
                if (unsubscribeSchool) unsubscribeSchool();
                unsubscribeSchool = onSnapshot(
                  doc(db, 'schools', data.schoolId),
                  (s) => {
                    if (s.exists()) {
                      const schoolInfo = { id: s.id, ...s.data() } as any;
                      setSchoolData(schoolInfo);

                      if (schoolInfo.planId && !unsubscribePackage) {
                        unsubscribePackage = onSnapshot(
                          doc(db, 'packages', schoolInfo.planId),
                          (pkgSnap) => {
                            if (pkgSnap.exists()) {
                              setSchoolData((currVal: any) => ({
                                ...currVal,
                                packagePermissions: pkgSnap.data().permissions || {},
                              }));
                            }
                          },
                          (error) => console.error('Error fetching package for school', error)
                        );
                      } else if (!schoolInfo.planId && unsubscribePackage) {
                        unsubscribePackage();
                        unsubscribePackage = null;
                      }
                    } else {
                      setSchoolData(null);
                    }
                  },
                  (error) => {
                    handleFirestoreError(error, OperationType.GET, `AuthContext:schools/${data.schoolId}`);
                    setSchoolData(null);
                  }
                );
              }

              finishLoading();
              return;
            }

            let claims: Record<string, unknown> = {};
            try {
              const tokenResult = await authUser.getIdTokenResult();
              claims = tokenResult.claims || {};
            } catch {
              /* continue */
            }

            if (claims.role) {
              const fallbackEmail = authUser.email?.toLowerCase() || '';
              try {
                await setDoc(
                  doc(db, 'users', authUser.uid),
                  {
                    uid: authUser.uid,
                    email: fallbackEmail,
                    name:
                      authUser.displayName ||
                      (claims.name as string) ||
                      (fallbackEmail ? fallbackEmail.split('@')[0] : 'مستخدم'),
                    role: claims.role,
                    schoolId: (claims.schoolId as string) || '',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    autoProv: true,
                  },
                  { merge: true }
                );
                return;
              } catch (createErr) {
                console.error('[AUTH PROFILE FALLBACK] Failed to auto-create profile:', createErr);
              }
            }

            if (!authUser.email) {
              if (!claims.role) setProfile(null);
              finishLoading();
              return;
            }

            const q = query(
              collection(db, 'users'),
              where('email', '==', authUser.email.toLowerCase())
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const provisionedDoc = querySnapshot.docs[0];
              const oldId = provisionedDoc.id;

              if (oldId !== authUser.uid) {
                const data = provisionedDoc.data();
                await setDoc(doc(db, 'users', authUser.uid), {
                  ...data,
                  claimedAt: serverTimestamp(),
                  uid: authUser.uid,
                });

                const studentsQ = query(
                  collection(db, 'students'),
                  where('parentIds', 'array-contains', oldId)
                );
                const studentsSnap = await getDocs(studentsQ);
                await Promise.all(
                  studentsSnap.docs.map((studentDoc) => {
                    const currentIds = studentDoc.data().parentIds || [];
                    const updatedIds = currentIds.map((id: string) =>
                      id === oldId ? authUser.uid : id
                    );
                    return updateDoc(doc(db, 'students', studentDoc.id), {
                      parentIds: updatedIds,
                    });
                  })
                ).catch(() => {});

                await deleteDoc(doc(db, 'users', oldId));
              } else {
                finishLoading();
              }
            } else {
              setProfile(null);
              finishLoading();
            }
          } catch (error) {
            console.error('Auth profile handler error:', error);
            finishLoading();
          }
        })();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `AuthContext:users/${authUser.uid}`);
        finishLoading();
      });
      })();
    });

    return () => {
      clearLoadingTimeout();
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeSchool) unsubscribeSchool();
      if (unsubscribePackage) unsubscribePackage();
    };
  }, [setLanguage]);

  return (
    <AuthContext.Provider value={{ user, profile, schoolData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

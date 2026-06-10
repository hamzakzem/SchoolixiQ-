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
import { buildTeacherRedactionContext } from './userProfile';
import { resolveProfilePermissions } from './staffPermissions';
import { normalizePackagePermissions } from './featureRegistry';
import { useLanguage } from './LanguageContext';

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
  
  const { language, setLanguage } = useLanguage();
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

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
        if (lastUserIdRef.current) {
          try {
            const { unregisterPushToken } = await import('./pushService');
            await unregisterPushToken(lastUserIdRef.current);
          } catch (e) {}
          lastUserIdRef.current = null;
        }
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
        const docRef = doc(db, 'users', authUser.uid);
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
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

            setProfile({
              uid: authUser.uid,
              ...data,
              permissions: resolvedPermissions as UserProfile['permissions'],
            } as UserProfile);

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
            
            // Register for Push Notifications automatically (only native)
            try {
              const { registerForPushNotifications } = await import('./pushService');
              await registerForPushNotifications(authUser.uid, data.role, data.schoolId || '');
            } catch (err) {
              console.error('Failed to init push notifications', err);
            }

            // Listen to school data if schoolId exists
            if (data.schoolId) {
              if (!schoolData || schoolData.id !== data.schoolId) {
                if (unsubscribeSchool) unsubscribeSchool();
                unsubscribeSchool = onSnapshot(doc(db, 'schools', data.schoolId), (s) => {
                  if (s.exists()) {
                    const schoolInfo = { id: s.id, ...s.data() } as any;
                    setSchoolData(schoolInfo);
                    
                    // Listen to active active package for the school
                    if (schoolInfo.planId && unsubscribePackage === null) {
                      unsubscribePackage = onSnapshot(doc(db, 'packages', schoolInfo.planId), (pkgSnap) => {
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
          handleFirestoreError(error, OperationType.GET, `AuthContext:users/${authUser.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
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

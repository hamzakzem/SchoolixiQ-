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
  getDoc,
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  updateDoc,
  getDocFromServer,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { UserProfile } from '../types';
import {
  resolveProfileSchoolId,
  roleRequiresSchoolBootstrap,
  type SchoolContextStatus,
  isFirestorePermissionDenied,
  isFirestoreNetworkError,
  SCHOOL_CONTEXT_TIMEOUT_MS,
} from './schoolId';
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
import { initOfflineSystem, pauseOfflineSync, resumeOfflineSync } from './offline/offlineSync';
import {
  CACHE_COLLECTION_KEYS,
  cacheSnapshot,
  clearUserDataCache,
  getCachedProfileForUser,
  getCachedSnapshot,
  isFirestoreOfflineError,
} from './offline/offlineDataCache';
import { setOfflineDataStale } from './offline/offlineStatus';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  schoolData: any | null;
  loading: boolean;
  profileLoaded: boolean;
  schoolContextLoading: boolean;
  schoolContextLoaded: boolean;
  schoolContextStatus: SchoolContextStatus;
  authReady: boolean;
  offlineStale: boolean;
  profileFromCache: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  schoolData: null, 
  loading: true,
  profileLoaded: false,
  schoolContextLoading: false,
  schoolContextLoaded: false,
  schoolContextStatus: 'idle',
  authReady: false,
  offlineStale: false,
  profileFromCache: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schoolData, setSchoolData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [schoolContextLoading, setSchoolContextLoading] = useState(false);
  const [schoolContextLoaded, setSchoolContextLoaded] = useState(false);
  const [schoolContextStatus, setSchoolContextStatus] = useState<SchoolContextStatus>('idle');
  const [offlineStale, setOfflineStale] = useState(false);
  const [profileFromCache, setProfileFromCache] = useState(false);
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
  const boundSchoolIdRef = useRef<string | null>(null);
  const schoolReadyRef = useRef(false);
  const profileLoadedRef = useRef(false);
  const schoolFetchGenRef = useRef(0);
  const schoolContextTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { language, setLanguage } = useLanguage();
  const languageRef = useRef(language);

  const applySchoolContext = (status: SchoolContextStatus) => {
    setSchoolContextStatus(status);
    setSchoolContextLoading(status === 'loading');
    setSchoolContextLoaded(
      status === 'ready' ||
        status === 'unlinked' ||
        status === 'not_found' ||
        status === 'permission_denied' ||
        status === 'network_error',
    );
    if (status !== 'loading') {
      if (schoolContextTimeoutRef.current) {
        clearTimeout(schoolContextTimeoutRef.current);
        schoolContextTimeoutRef.current = null;
      }
    }
  };

  const logSchoolBootstrap = (payload: {
    uid?: string;
    role?: string;
    schoolId?: string | null;
    userLoaded?: boolean;
    schoolLoaded?: boolean;
    error?: unknown;
    event?: string;
  }) => {
    if (!import.meta.env.DEV) return;
    console.info('[SchoolBootstrap]', {
      uid: payload.uid,
      role: payload.role,
      schoolId: payload.schoolId ?? null,
      userLoaded: payload.userLoaded,
      schoolLoaded: payload.schoolLoaded,
      error: payload.error != null ? String((payload.error as Error)?.message || payload.error) : undefined,
      event: payload.event,
    });
  };

  const startSchoolContextTimeout = (uid: string, schoolId: string, role: string) => {
    if (schoolContextTimeoutRef.current) {
      clearTimeout(schoolContextTimeoutRef.current);
    }
    schoolContextTimeoutRef.current = setTimeout(() => {
      if (schoolReadyRef.current) return;
      logSchoolBootstrap({
        uid,
        role,
        schoolId,
        userLoaded: profileLoadedRef.current,
        schoolLoaded: false,
        error: 'school_context_exceeded_10s',
        event: 'TIMEOUT',
      });
      schoolReadyRef.current = false;
      applySchoolContext('network_error');
      setLoading(false);
    }, SCHOOL_CONTEXT_TIMEOUT_MS);
  };

  const resetSchoolContext = () => {
    if (schoolContextTimeoutRef.current) {
      clearTimeout(schoolContextTimeoutRef.current);
      schoolContextTimeoutRef.current = null;
    }
    boundSchoolIdRef.current = null;
    schoolReadyRef.current = false;
    profileLoadedRef.current = false;
    schoolFetchGenRef.current += 1;
    applySchoolContext('idle');
    setSchoolContextLoaded(false);
  };

  const hydrateProfileFromCache = async (uid: string): Promise<boolean> => {
    const cached = await getCachedProfileForUser(uid);
    if (!cached) return false;
    const data = cached.data;
    const nextProfile = {
      uid,
      ...data,
    } as UserProfile;
    setProfile(nextProfile);
    setProfileFromCache(true);
    setProfileLoaded(true);
    profileLoadedRef.current = true;
    setOfflineStale(true);
    setOfflineDataStale(true);
    setLoading(false);

    const schoolId = resolveProfileSchoolId(data);
    const needsSchool = roleRequiresSchoolBootstrap(data.role);

    if (!needsSchool) {
      applySchoolContext('ready');
      return true;
    }

    if (!schoolId) {
      applySchoolContext('unlinked');
      return true;
    }

    const schoolCached = await getCachedSnapshot<Record<string, unknown>>(
      CACHE_COLLECTION_KEYS.school,
      uid,
      schoolId,
    );
    if (schoolCached?.data) {
      setSchoolData(schoolCached.data);
      schoolReadyRef.current = true;
      applySchoolContext('ready');
    } else {
      applySchoolContext('network_error');
    }
    console.info('[OfflineCache] PROFILE_HYDRATE', { uid, updatedAt: cached.updatedAt });
    return true;
  };

  const persistProfileCache = (uid: string, data: Record<string, unknown>) => {
    const { _credentialValues: _creds, password: _pw, parentPassword: _ppw, ...safe } = data;
    void cacheSnapshot(
      CACHE_COLLECTION_KEYS.profile,
      uid,
      data.schoolId ? String(data.schoolId) : '_',
      safe,
    );
    setProfileFromCache(false);
    if (navigator.onLine) {
      setOfflineStale(false);
      setOfflineDataStale(false);
    }
  };

  const persistSchoolCache = (uid: string, schoolId: string, schoolInfo: Record<string, unknown>) => {
    void cacheSnapshot(CACHE_COLLECTION_KEYS.school, uid, schoolId, schoolInfo);
  };

  useEffect(() => {
    const stopOffline = initOfflineSystem();
    return stopOffline;
  }, []);

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
        const uidToClear = lastUserIdRef.current;
        profileSnapshotRef.current = null;
        loginLoggedRef.current = null;
        setLogoutLogSnapshot(null);

        if (uidToClear) {
          void clearUserDataCache(uidToClear);
        }
        setOfflineStale(false);
        setProfileFromCache(false);
        setOfflineDataStale(false);

        lastUserIdRef.current = null;
        pushRegistrationDoneRef.current = null;
        setLogoutInProgress(true);
        setPushLogoutInProgress(true);
        pauseOfflineSync();
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
        setLoading(true);
        setProfileLoaded(false);
        resetSchoolContext();
        setLogoutInProgress(false);
        setPushLogoutInProgress(false);
        resumeOfflineSync();
        lastUserIdRef.current = authUser.uid;
        triggerNativePushRegistration(authUser.uid, 'auth_state_changed');
        triggerWebPushRegistration(authUser.uid, 'auth_state_changed');

        if (!navigator.onLine) {
          void hydrateProfileFromCache(authUser.uid);
        }

        const docRef = doc(db, 'users', authUser.uid);

        const fetchDocWithRetry = async (
          label: string,
          fetcher: () => Promise<DocumentSnapshot>,
        ): Promise<{ snap: DocumentSnapshot | null; error: unknown | null }> => {
          try {
            return { snap: await fetcher(), error: null };
          } catch (firstError) {
            logSchoolBootstrap({
              uid: authUser.uid,
              event: `${label}_retry`,
              error: firstError,
            });
            try {
              await new Promise((resolve) => setTimeout(resolve, 600));
              return { snap: await fetcher(), error: null };
            } catch (secondError) {
              return { snap: null, error: secondError };
            }
          }
        };

        const loadPackagePermissionsLazy = (planId: string, schoolInfo: Record<string, unknown>) => {
          if (!planId || unsubscribePackage) return;
          unsubscribePackage = subscribeGuardedFirestore(doc(db, 'packages', planId), (pkgSnap) => {
            if (shouldSkipFirestoreListeners()) return;
            if (!pkgSnap.exists()) return;
            setSchoolData((currVal: Record<string, unknown> | null) => ({
              ...(currVal || schoolInfo),
              packagePermissions: normalizePackagePermissions(pkgSnap.data().permissions || {}),
            }));
          }, (pkgError) => {
            if (shouldIgnoreFirestoreListenerError(pkgError)) return;
            logSchoolBootstrap({
              uid: authUser.uid,
              event: 'package_listener_non_blocking',
              error: pkgError,
            });
          });
        };

        const resolveSchoolFetchFailure = async (
          schoolId: string,
          roleLabel: string,
          error: unknown,
        ) => {
          if (isFirestorePermissionDenied(error)) {
            setSchoolData(null);
            schoolReadyRef.current = false;
            applySchoolContext('permission_denied');
            logSchoolBootstrap({
              uid: authUser.uid,
              role: roleLabel,
              schoolId,
              userLoaded: profileLoadedRef.current,
              schoolLoaded: false,
              error,
              event: 'school_permission_denied',
            });
            return;
          }

          const cached = await getCachedSnapshot<Record<string, unknown>>(
            CACHE_COLLECTION_KEYS.school,
            authUser.uid,
            schoolId,
          );
          if (cached?.data) {
            setSchoolData(cached.data);
            setOfflineStale(true);
            setOfflineDataStale(true);
            schoolReadyRef.current = true;
            applySchoolContext('ready');
            logSchoolBootstrap({
              uid: authUser.uid,
              role: roleLabel,
              schoolId,
              userLoaded: profileLoadedRef.current,
              schoolLoaded: true,
              event: 'school_offline_cache',
            });
            return;
          }

          schoolReadyRef.current = false;
          applySchoolContext(
            isFirestoreNetworkError(error) || isFirestoreOfflineError(error)
              ? 'network_error'
              : 'not_found',
          );
          logSchoolBootstrap({
            uid: authUser.uid,
            role: roleLabel,
            schoolId,
            userLoaded: profileLoadedRef.current,
            schoolLoaded: false,
            error,
            event: 'school_fetch_failed',
          });
        };

        const applySchoolSnapshot = (
          schoolId: string,
          roleLabel: string,
          snap: DocumentSnapshot,
          source: 'getDoc' | 'snapshot',
        ) => {
          if (!snap.exists()) {
            setSchoolData(null);
            schoolReadyRef.current = false;
            applySchoolContext('not_found');
            logSchoolBootstrap({
              uid: authUser.uid,
              role: roleLabel,
              schoolId,
              userLoaded: profileLoadedRef.current,
              schoolLoaded: false,
              event: `school_${source}_not_found`,
            });
            return;
          }

          const schoolInfo = { id: snap.id, ...snap.data() } as Record<string, unknown>;
          setSchoolData(schoolInfo);
          persistSchoolCache(authUser.uid, schoolId, schoolInfo);
          schoolReadyRef.current = true;
          applySchoolContext('ready');
          setLoading(false);
          logSchoolBootstrap({
            uid: authUser.uid,
            role: roleLabel,
            schoolId,
            userLoaded: profileLoadedRef.current,
            schoolLoaded: true,
            event: `school_${source}_ready`,
          });

          const planId = schoolInfo.planId ? String(schoolInfo.planId) : '';
          if (planId) loadPackagePermissionsLazy(planId, schoolInfo);
        };

        const bindSchoolDocument = async (schoolId: string, roleLabel: string) => {
          if (boundSchoolIdRef.current === schoolId && schoolReadyRef.current) {
            applySchoolContext('ready');
            setLoading(false);
            return;
          }
          if (boundSchoolIdRef.current === schoolId && unsubscribeSchool && !schoolReadyRef.current) {
            return;
          }

          const fetchGen = ++schoolFetchGenRef.current;
          boundSchoolIdRef.current = schoolId;
          schoolReadyRef.current = false;
          applySchoolContext('loading');
          startSchoolContextTimeout(authUser.uid, schoolId, roleLabel);

          const schoolRef = doc(db, 'schools', schoolId);
          const { snap, error } = await fetchDocWithRetry('school_getDoc', () => getDoc(schoolRef));

          if (fetchGen !== schoolFetchGenRef.current) return;

          if (snap) {
            applySchoolSnapshot(schoolId, roleLabel, snap, 'getDoc');
          } else if (error) {
            await resolveSchoolFetchFailure(schoolId, roleLabel, error);
            setLoading(false);
          }

          if (unsubscribeSchool) {
            unsubscribeSchool();
            unsubscribeSchool = null;
          }

          unsubscribeSchool = subscribeGuardedFirestore(schoolRef, (liveSnap) => {
            if (shouldSkipFirestoreListeners()) return;
            if (!liveSnap.exists()) {
              if (schoolReadyRef.current) {
                schoolReadyRef.current = false;
                setSchoolData(null);
                applySchoolContext('not_found');
              }
              return;
            }
            const schoolInfo = { id: liveSnap.id, ...liveSnap.data() } as Record<string, unknown>;
            setSchoolData(schoolInfo);
            persistSchoolCache(authUser.uid, schoolId, schoolInfo);
            if (!schoolReadyRef.current) {
              schoolReadyRef.current = true;
              applySchoolContext('ready');
              setLoading(false);
            }
            const planId = schoolInfo.planId ? String(schoolInfo.planId) : '';
            if (planId) loadPackagePermissionsLazy(planId, schoolInfo);
          }, (listenerError) => {
            if (shouldIgnoreFirestoreListenerError(listenerError)) return;
            if (schoolReadyRef.current) {
              logSchoolBootstrap({
                uid: authUser.uid,
                role: roleLabel,
                schoolId,
                userLoaded: profileLoadedRef.current,
                schoolLoaded: true,
                error: listenerError,
                event: 'school_listener_non_blocking',
              });
              return;
            }
            void resolveSchoolFetchFailure(schoolId, roleLabel, listenerError).then(() => {
              setLoading(false);
            });
          });
        };

        const processExistingUserProfile = async (
          docSnap: DocumentSnapshot,
          source: 'getDoc' | 'snapshot',
        ) => {
          if (shouldSkipFirestoreListeners()) return;
          if (!docSnap.exists()) return;

          const rawProfile = docSnap.data() as Record<string, unknown>;
          const redactionCtx = buildTeacherRedactionContext(rawProfile) || rawProfile;
          const { _credentialValues: _profileCreds, ...data } = redactionCtx as Record<string, unknown>;

          if (data.language && data.language !== languageRef.current) {
            setLanguage(data.language as string);
          } else if (!data.language && languageRef.current && source === 'snapshot') {
            try {
              await updateDoc(docRef, { language: languageRef.current });
            } catch (e) {
              console.warn('Failed to save default user language to database:', e);
            }
          }

          let claims: Record<string, unknown> = {};
          try {
            let tokenResult = await authUser.getIdTokenResult();
            claims = tokenResult.claims || {};
            if (data.role && (claims.role !== data.role || claims.schoolId !== data.schoolId)) {
              try {
                tokenResult = await authUser.getIdTokenResult(true);
                claims = tokenResult.claims || {};
              } catch (refreshErr) {
                console.warn('Failed to force refresh token:', refreshErr);
              }
            }
          } catch (tokenError) {
            console.warn('Failed to get ID token result, using Firestore profile:', tokenError);
          }

          const resolvedPermissions = resolveProfilePermissions(
            data.permissions,
            claims.p as string[] | undefined,
          );

          const resolvedSchoolId = resolveProfileSchoolId(data);
          const normalizedSchoolId = resolvedSchoolId || '';
          const roleLabel = String(data.role || 'unknown');

          logSchoolBootstrap({
            uid: authUser.uid,
            role: roleLabel,
            schoolId: normalizedSchoolId || null,
            userLoaded: true,
            schoolLoaded: schoolReadyRef.current,
            event: `profile_${source}`,
          });

          const nextProfile = {
            uid: authUser.uid,
            ...data,
            schoolId: normalizedSchoolId,
            permissions: resolvedPermissions as UserProfile['permissions'],
          } as UserProfile;

          setProfile(nextProfile);
          setProfileLoaded(true);
          profileLoadedRef.current = true;
          persistProfileCache(authUser.uid, { ...data, schoolId: normalizedSchoolId });

          profileSnapshotRef.current = {
            uid: authUser.uid,
            role: roleLabel,
            schoolId: normalizedSchoolId || undefined,
            email: authUser.email,
          };
          setLogoutLogSnapshot(profileSnapshotRef.current);

          if (loginLoggedRef.current !== authUser.uid) {
            loginLoggedRef.current = authUser.uid;
            import('./loginLog').then(({ writeLoginLog }) =>
              writeLoginLog({
                userId: authUser.uid,
                role: roleLabel,
                schoolId: normalizedSchoolId || undefined,
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

          triggerNativePushRegistration(authUser.uid, 'profile_snapshot');
          triggerWebPushRegistration(authUser.uid, 'profile_snapshot');

          if (normalizedSchoolId && roleRequiresSchoolBootstrap(data.role)) {
            await bindSchoolDocument(normalizedSchoolId, roleLabel);
          } else if (roleRequiresSchoolBootstrap(data.role)) {
            if (unsubscribeSchool) {
              unsubscribeSchool();
              unsubscribeSchool = null;
            }
            if (unsubscribePackage) {
              unsubscribePackage();
              unsubscribePackage = null;
            }
            boundSchoolIdRef.current = null;
            schoolReadyRef.current = false;
            setSchoolData(null);
            applySchoolContext('unlinked');
            setLoading(false);
            logSchoolBootstrap({
              uid: authUser.uid,
              role: roleLabel,
              schoolId: null,
              userLoaded: true,
              schoolLoaded: false,
              event: 'profile_unlinked',
            });
          } else {
            applySchoolContext('ready');
            setLoading(false);
          }
        };

        void (async () => {
          const { snap: initialUserSnap, error: initialUserError } = await fetchDocWithRetry(
            'user_getDoc',
            () => getDoc(docRef),
          );

          if (initialUserSnap?.exists()) {
            await processExistingUserProfile(initialUserSnap, 'getDoc');
          } else if (initialUserError) {
            const hydrated = await hydrateProfileFromCache(authUser.uid);
            if (!hydrated) {
              logSchoolBootstrap({
                uid: authUser.uid,
                userLoaded: false,
                schoolLoaded: false,
                error: initialUserError,
                event: 'user_getDoc_failed',
              });
              if (isFirestoreNetworkError(initialUserError) || isFirestoreOfflineError(initialUserError)) {
                applySchoolContext('network_error');
              }
              setLoading(false);
            }
          }
        })();

        unsubscribeProfile = subscribeGuardedFirestore(docRef, async (docSnap) => {
          if (shouldSkipFirestoreListeners()) return;
          if (docSnap.exists()) {
            await processExistingUserProfile(docSnap, 'snapshot');
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
              const fallbackName = authUser.displayName || claims.name || (authUser.email ? authUser.email.split('@')[0] : 'مستخدم');
              const fallbackEmail = authUser.email ? authUser.email.toLowerCase() : '';

              console.log(`[AUTH PROFILE FALLBACK] Creating missing Firestore profile for UID ${authUser.uid}:`, {
                email: fallbackEmail,
                role: fallbackRole,
                name: fallbackName,
              });

              try {
                await setDoc(doc(db, 'users', authUser.uid), {
                  uid: authUser.uid,
                  email: fallbackEmail,
                  name: fallbackName,
                  role: fallbackRole,
                  schoolId: '',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  autoProv: true,
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
        }, async (error) => {
          if (shouldIgnoreFirestoreListenerError(error)) return;
          if (profileLoadedRef.current) {
            logSchoolBootstrap({
              uid: authUser.uid,
              userLoaded: true,
              schoolLoaded: schoolReadyRef.current,
              error,
              event: 'profile_listener_non_blocking',
            });
            return;
          }
          if (isFirestoreOfflineError(error) || isFirestoreNetworkError(error) || !navigator.onLine) {
            const hydrated = await hydrateProfileFromCache(authUser.uid);
            if (hydrated) return;
            applySchoolContext('network_error');
          }
          handleFirestoreError(error, OperationType.GET, `AuthContext:users/${authUser.uid}`);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setSchoolData(null);
        setProfileLoaded(false);
        resetSchoolContext();
        setOfflineStale(false);
        setProfileFromCache(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeSchool) unsubscribeSchool();
      if (unsubscribePackage) unsubscribePackage();
      if (schoolContextTimeoutRef.current) {
        clearTimeout(schoolContextTimeoutRef.current);
        schoolContextTimeoutRef.current = null;
      }
    };
  }, []);

  const authReady = !user || (profileLoaded && schoolContextLoaded);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        schoolData,
        loading,
        profileLoaded,
        schoolContextLoading,
        schoolContextLoaded,
        schoolContextStatus,
        authReady,
        offlineStale,
        profileFromCache,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

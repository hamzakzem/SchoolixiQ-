import React, { createContext, useContext, useEffect, useState } from 'react';
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
            const data = docSnap.data() as any;
            const tokenResult = await authUser.getIdTokenResult();
            const claims = tokenResult.claims as any;
            
            setProfile({ 
              uid: authUser.uid, 
              ...data,
              permissions: claims.p || data.permissions 
            } as UserProfile);

            // Listen to school data if schoolId exists
            if (data.schoolId && (!schoolData || schoolData.id !== data.schoolId)) {
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
                            packagePermissions: pkgSnap.data().permissions || {}
                          }));
                        }
                     }, (error) => {
                       console.error("Error fetching package for school", error);
                     });
                   } else if (!schoolInfo.planId && unsubscribePackage) {
                     unsubscribePackage();
                     unsubscribePackage = null;
                   }
                 }
               }, (error) => {
                 handleFirestoreError(error, OperationType.GET, `AuthContext:schools/${data.schoolId}`);
                 setLoading(false);
               });
            }

            setLoading(false);
          } else {
            // Check claims first - if server already set them, we can trust them
            const tokenResult = await authUser.getIdTokenResult();
            const claims = tokenResult.claims as any;
            
            if (claims.role) {
              setProfile({
                uid: authUser.uid,
                email: authUser.email,
                name: authUser.displayName || claims.name || 'مستخدم',
                role: claims.role,
                schoolId: claims.schoolId || '',
                permissions: claims.p || null
              } as UserProfile);
              // Don't set loading to false yet if we're brand new, 
              // let the claiming process below or firestore catch up
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

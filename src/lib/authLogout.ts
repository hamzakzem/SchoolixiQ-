import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  getLogoutLogSnapshot,
  isLogoutInProgress,
  setLogoutInProgress,
  setLogoutLogSnapshot,
  unregisterAllFirestoreListeners,
} from './logoutGuard';
import {
  setPushLogoutInProgress,
  stopWebPushAutoRegistration,
  unregisterWebPushToken,
} from './webPushService';
import { unregisterPushToken } from './pushService';
import { writeLoginLog } from './loginLog';

/** Tear down listeners, remove tokens while authenticated, write logout log, then sign out. */
export async function signOutWithCleanup(): Promise<void> {
  if (isLogoutInProgress()) return;

  setLogoutInProgress(true);
  setPushLogoutInProgress(true);

  unregisterAllFirestoreListeners();

  stopWebPushAutoRegistration('logout');

  const logoutSnap = getLogoutLogSnapshot();
  if (logoutSnap && auth.currentUser?.uid === logoutSnap.userId) {
    await writeLoginLog({
      userId: logoutSnap.userId,
      role: logoutSnap.role,
      schoolId: logoutSnap.schoolId,
      event: 'logout',
      email: logoutSnap.email,
    });
  }

  const uid = auth.currentUser?.uid ?? null;
  if (uid && auth.currentUser?.uid === uid) {
    await unregisterWebPushToken(uid);
    await unregisterPushToken(uid);
  }

  setLogoutLogSnapshot(null);
  await signOut(auth);
}

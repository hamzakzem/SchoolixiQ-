import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  setPushLogoutInProgress,
  stopWebPushAutoRegistration,
  unregisterWebPushToken,
} from './webPushService';
import { unregisterPushToken } from './pushService';

/** Stop push retries, remove tokens while authenticated, then sign out. */
export async function signOutWithCleanup(): Promise<void> {
  const uid = auth.currentUser?.uid ?? null;

  setPushLogoutInProgress(true);
  stopWebPushAutoRegistration('logout');

  if (uid && auth.currentUser?.uid === uid) {
    await unregisterWebPushToken(uid);
    await unregisterPushToken(uid);
  }

  await signOut(auth);
}

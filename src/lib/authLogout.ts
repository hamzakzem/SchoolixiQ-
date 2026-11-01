import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import {
  getLogoutLogSnapshot,
  isLogoutInProgress,
  setLogoutInProgress,
  setLogoutLogSnapshot,
  setSigningOut,
  unregisterAllFirestoreListeners,
} from './logoutGuard';
import {
  setPushLogoutInProgress,
  stopWebPushAutoRegistration,
  unregisterWebPushToken,
} from './webPushService';
import { unregisterPushToken } from './pushService';
import { writeLoginLog } from './loginLog';

/** Cleanup must never keep someone signed in: each step gets a few seconds, then we move on. */
const CLEANUP_TIMEOUT_MS = 4000;

function withTimeout(task: Promise<unknown>, ms = CLEANUP_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    task
      .catch((err) => console.warn('[Logout] cleanup step failed', err))
      .finally(() => {
        clearTimeout(timer);
        resolve();
      });
  });
}

/** Let React commit the "signing out" screen so dashboards unmount and close their listeners. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 16);
    }
  });
}

/** Same-document navigation to /login; React Router picks it up from popstate. */
function goToLoginScreen(): void {
  if (typeof window === 'undefined' || window.location.pathname === '/login') return;
  try {
    window.history.replaceState(null, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    /* ignore */
  }
}

/**
 * Sign out from any screen:
 * 1. show the signing-out screen (dashboards unmount → their listeners close),
 * 2. while still authenticated: write the logout log and remove this device's
 *    push token so it stops receiving the account's notifications,
 * 3. end the Firebase session — always, even if a cleanup step failed or the
 *    network is down.
 */
export async function signOutWithCleanup(): Promise<void> {
  if (isLogoutInProgress()) return;

  setLogoutInProgress(true);
  setPushLogoutInProgress(true);
  setSigningOut(true);

  try {
    await nextFrame();
    unregisterAllFirestoreListeners();
    stopWebPushAutoRegistration('logout');

    const uid = auth.currentUser?.uid ?? null;
    const logoutSnap = getLogoutLogSnapshot();
    const steps: Promise<unknown>[] = [];
    if (logoutSnap && uid && uid === logoutSnap.userId) {
      steps.push(
        writeLoginLog({
          userId: logoutSnap.userId,
          role: logoutSnap.role,
          schoolId: logoutSnap.schoolId,
          event: 'logout',
          email: logoutSnap.email,
        }),
      );
    }
    if (uid) {
      steps.push(unregisterWebPushToken(uid, { duringLogout: true }));
      steps.push(unregisterPushToken(uid));
    }
    await Promise.all(steps.map((step) => withTimeout(step)));
    setLogoutLogSnapshot(null);

    await signOut(auth);
    goToLoginScreen();
  } catch (error) {
    // Sign-out itself failed (rare): let the user try again.
    setLogoutInProgress(false);
    setPushLogoutInProgress(false);
    throw error;
  } finally {
    setSigningOut(false);
  }
}

import { useSchoolPresence } from '../lib/useSchoolPresence';

/** Invisible global heartbeat — school users only; no UI. */
export default function SchoolPresenceTracker() {
  useSchoolPresence();
  return null;
}

/**
 * Signs the user out after 1 hour with no mouse, keyboard, scroll, or touch activity.
 * Timer keeps running when the tab is in the background (stricter session security).
 */
import { useEffect, useRef } from 'react';
import { signOutUser } from './authService';
import { logLoginEventNonBlocking } from '../API/loginLogApi';

// (Function meaning): One hour in milliseconds — no activity longer than this triggers sign-out.
const INACTIVITY_MS = 60 * 60 * 1000;

// (Function meaning): How often we re-check idle time while signed in (every 60 seconds).
const CHECK_INTERVAL_MS = 60 * 1000;

// (Function meaning): At most one sessionStorage write per 30 seconds when the user is active.
const ACTIVITY_THROTTLE_MS = 30 * 1000;

// (Function meaning): sessionStorage key for the last time we saw user activity in this tab.
const LAST_ACTIVITY_KEY = 'lynkfi_lastActivityAt';

// (Function meaning): Browser events that count as the user still using the app.
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

// (Function meaning): Read the stored timestamp from sessionStorage, or use now if missing or invalid.
function readLastActivityAt() {
  const raw = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

// (Function meaning): Save the current time as last activity so refresh within the tab keeps the idle clock.
function writeLastActivityAt(timestamp = Date.now()) {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

// (Function meaning): Remove the idle timestamp when the user signs out or the hook unmounts.
function clearLastActivityAt() {
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * @param {import('firebase/auth').User | null} user
 */
// (Function meaning): When `user` is set, watch for activity and sign out after INACTIVITY_MS of idle time.
export function useInactivityLogout(user) {
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!user) {
      clearLastActivityAt();
      return undefined;
    }

    writeLastActivityAt(readLastActivityAt());

    // (Function meaning): Record activity at most once per ACTIVITY_THROTTLE_MS to limit sessionStorage writes.
    const markActive = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return;
      lastWriteRef.current = now;
      writeLastActivityAt(now);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });

    // (Function meaning): Every CHECK_INTERVAL_MS, if idle too long, log inactivity (non-blocking) then sign out.
    const intervalId = window.setInterval(async () => {
      const idleFor = Date.now() - readLastActivityAt();
      if (idleFor < INACTIVITY_MS) return;

      try {
        await logLoginEventNonBlocking({
          user,
          eventType: 'inactivity_logout',
          method: 'unknown',
        });
      } catch (err) {
        console.error('[useInactivityLogout] log inactivity_logout', err);
      }

      clearLastActivityAt();
      try {
        await signOutUser();
      } catch (err) {
        console.error('[useInactivityLogout] sign out', err);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
      window.clearInterval(intervalId);
    };
  }, [user]);
}

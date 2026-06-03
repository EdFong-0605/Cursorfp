/**
 * Signs the user out after 1 hour with no mouse, keyboard, scroll, or touch activity.
 * Timer keeps running when the tab is in the background (stricter session security).
 */
import { useEffect, useRef } from 'react';
import { signOutUser } from './authService';
import { logLoginEventNonBlocking } from '../API/loginLogApi';

// (Function meaning): One hour in milliseconds — no activity longer than this triggers sign-out.
// (Function meaning): 30 minutes in milliseconds — no activity longer than this triggers sign-out, even if the browser or computer was closed and reopened.
const INACTIVITY_MS = 30 * 60 * 1000;

// (Function meaning): How often we re-check idle time while signed in (every 60 seconds).
const CHECK_INTERVAL_MS = 60 * 1000;

// (Function meaning): At most one sessionStorage write per 30 seconds when the user is active.
const ACTIVITY_THROTTLE_MS = 30 * 1000;

// (Function meaning): sessionStorage key for the last time we saw user activity in this tab.
// (Function meaning): localStorage key for the last time the user was active — stored browser-wide so the timer survives tab closes and browser restarts.
const LAST_ACTIVITY_KEY = 'lynkfi_lastActivityAt';

// (Function meaning): Browser events that count as the user still using the app.
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

// (Function meaning): Read the stored timestamp from sessionStorage, or use now if missing or invalid.
// (Function meaning): Read the stored timestamp from localStorage — if the app reopens after a shutdown, this still has the last known activity time so we can check if too much time passed.
function readLastActivityAt() {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

// (Function meaning): Save the current time as last activity so refresh within the tab keeps the idle clock.
// (Function meaning): Write the current time into localStorage so the timestamp survives browser and computer restarts.
function writeLastActivityAt(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

// (Function meaning): Remove the idle timestamp when the user signs out or the hook unmounts.
// (Function meaning): Remove the timestamp from localStorage so the next sign-in starts the idle clock fresh.
function clearLastActivityAt() {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
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

    // (Function meaning): On startup — when the app opens or the browser restarts — immediately check if the saved activity time is already older than 30 minutes. If it is, sign out right away instead of waiting for the interval to fire.
    const idleAtStartup = Date.now() - readLastActivityAt();
    if (idleAtStartup >= INACTIVITY_MS) {
      logLoginEventNonBlocking({ user, eventType: 'inactivity_logout', method: 'unknown' }).catch(() => {});
      clearLastActivityAt();
      signOutUser().catch((err) => console.error('[useInactivityLogout] startup sign out', err));
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

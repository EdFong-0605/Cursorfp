/**
 * Appends login audit rows to MongoDB via Cloud Function `log_login`.
 *
 * (External references): URL building matches [userProfileApi.js] and [clientfetch.js].
 */

import {
  getCloudFunctionUrl,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_LOCAL_FIREBASE_PROJECT_ID,
} from '../../unAuth/Component/API/clientfetch';

// (Function meaning): Must match the Python function name in [functions/main.py].
export const LOG_LOGIN_FUNCTION_NAME = 'log_login';

/** @typedef {'sign_in' | 'sign_up' | 'inactivity_logout'} LoginEventType */
/** @typedef {'email' | 'google' | 'unknown'} LoginMethod */

// (Function meaning): Build the full URL for the log_login endpoint.
function getLogLoginUrl() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID || DEFAULT_LOCAL_FIREBASE_PROJECT_ID;
  return getCloudFunctionUrl(LOG_LOGIN_FUNCTION_NAME, projectId, region);
}

/**
 * @param {{ user: import('firebase/auth').User, eventType: LoginEventType, method: LoginMethod }} params
 */
// (Function meaning): POST eventType and method to the backend; throws if the server rejects the request.
export async function logLoginEvent({ user, eventType, method }) {
  const token = await user.getIdToken();
  const url = getLogLoginUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ eventType, method }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const serverMsg = data?.error;
    const message =
      typeof serverMsg === 'string' && serverMsg.trim()
        ? serverMsg
        : `Could not log login event (${res.status})`;
    throw new Error(message);
  }

  return data;
}

/**
 * @param {{ user: import('firebase/auth').User, eventType: LoginEventType, method: LoginMethod }} params
 */
// (Function meaning): Try to log the event; on failure only console.error so sign-in is not blocked.
export async function logLoginEventNonBlocking({ user, eventType, method }) {
  try {
    await logLoginEvent({ user, eventType, method });
  } catch (err) {
    console.error('[loginLogApi] logLoginEvent', err);
  }
}

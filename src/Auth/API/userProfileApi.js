/**
 * Saves Lynkfi sign-up profile fields to MongoDB via Cloud Function `save_user_profile`.
 *
 * (External references): URL building matches [clientfetch.js] `getCloudFunctionUrl`.
 */

import {
  getCloudFunctionUrl,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_LOCAL_FIREBASE_PROJECT_ID,
} from '../../unAuth/Component/API/clientfetch';

// (Function meaning): Constant string that must match the Python function name exported in [functions/main.py].
export const SAVE_USER_PROFILE_FUNCTION_NAME = 'save_user_profile';

// (Function meaning): Constant string that must match the Python function name `check_firm_admin` in [functions/main.py].
export const CHECK_FIRM_ADMIN_FUNCTION_NAME = 'check_firm_admin';

// (Function meaning): Build the full URL for the save profile endpoint using project id and region from env or local defaults.
function getSaveUserProfileUrl() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID || DEFAULT_LOCAL_FIREBASE_PROJECT_ID;
  return getCloudFunctionUrl(SAVE_USER_PROFILE_FUNCTION_NAME, projectId, region);
}

// (Function meaning): Build the full URL for the firm-admin check endpoint using project id and region from env or local defaults.
function getCheckFirmAdminUrl() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID || DEFAULT_LOCAL_FIREBASE_PROJECT_ID;
  return getCloudFunctionUrl(CHECK_FIRM_ADMIN_FUNCTION_NAME, projectId, region);
}

/**
 * @param {{ user: import('firebase/auth').User, firstName: string, lastName: string, role?: string, firmId?: string, firmRole?: string }} params
 */
// (Function meaning): Ask Firebase for a proof-of-login token, POST profile fields to the backend, and throw if the server says no.
export async function saveUserProfile({ user, firstName, lastName, role, firmId, firmRole }) {
  const token = await user.getIdToken();
  const url = getSaveUserProfileUrl();
  const body = { firstName, lastName };
  if (firmId && firmRole) {
    body.firmId = firmId;
    body.firmRole = firmRole;
  } else if (role) {
    body.role = role;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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
        : `Could not save profile (${res.status})`;
    const err = new Error(message);
    err.code = 'profile/save-failed';
    throw err;
  }

  return data;
}

/**
 * @param {{ user: import('firebase/auth').User }} params
 * @returns {Promise<boolean>}
 */
// (Function meaning): Ask Firebase for a proof-of-login token, GET the backend check, and return true only when the server says this user is a firm admin.
export async function checkFirmAdmin({ user }) {
  const token = await user.getIdToken();
  const url = getCheckFirmAdminUrl();
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
        : `Could not check firm admin (${res.status})`;
    const err = new Error(message);
    err.code = 'profile/check-firm-admin-failed';
    throw err;
  }

  return Boolean(data?.isFirmAdmin);
}

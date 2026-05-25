/**
 * Firm onboarding API: save and verify firm records via Cloud Functions (no auth).
 *
 * (External references): URL building matches [userProfileApi.js] and [clientfetch.js].
 */

import {
  getCloudFunctionUrl,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_LOCAL_FIREBASE_PROJECT_ID,
} from '../../unAuth/Component/API/clientfetch';

// (Function meaning): Python function names in [functions/main.py].
export const SAVE_FIRM_FUNCTION_NAME = 'save_firm';
export const VERIFY_FIRM_FUNCTION_NAME = 'verify_firm';

function getFunctionUrl(functionName) {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID || DEFAULT_LOCAL_FIREBASE_PROJECT_ID;
  return getCloudFunctionUrl(functionName, projectId, region);
}

/**
 * @param {Record<string, unknown>} firmPayload
 */
// (Function meaning): POST firm details to `save_firm` and return `{ ok, firmId }` or throw.
export async function saveFirm(firmPayload) {
  const url = getFunctionUrl(SAVE_FIRM_FUNCTION_NAME);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firmPayload),
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
        : `Could not save firm (${res.status})`;
    const err = new Error(message);
    err.code = 'firm/save-failed';
    throw err;
  }

  return data;
}

/**
 * @param {string} firmId
 */
// (Function meaning): GET `verify_firm?firmId=` to confirm the firm row exists in MongoDB.
export async function verifyFirm(firmId) {
  const baseUrl = getFunctionUrl(VERIFY_FIRM_FUNCTION_NAME);
  const url = `${baseUrl}?firmId=${encodeURIComponent(firmId)}`;
  const res = await fetch(url, { method: 'GET' });

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
        : res.status === 404
          ? 'Firm not found'
          : `Could not verify firm (${res.status})`;
    const err = new Error(message);
    err.code = res.status === 404 ? 'firm/not-found' : 'firm/verify-failed';
    throw err;
  }

  return data;
}

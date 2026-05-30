/**
 * HTTP client for the signed-in user's client tasks, backed by Cloud Functions in `functions/main.py`.
 *
 * Two endpoints are used:
 *   - `get_my_client_tasks` (GET ?clientId=) -> `{ tasks: [ { taskId, stepId, title, stepTitle, priority, assignedDate, dueDate, stepNumber } ] }`
 *   - `complete_task_step`  (POST { taskId, stepId }) -> `{ ok, stepsCompleted, stepsTotal, overallCompleted }`
 *
 * (External references): URL building reuses [clientfetch.js] `getCloudFunctionUrl`; the token pattern matches [userProfileApi.js].
 */

import {
  getCloudFunctionUrl,
  DEFAULT_FUNCTIONS_REGION,
  DEFAULT_LOCAL_FIREBASE_PROJECT_ID,
} from './clientfetch';

// (Function meaning): Constant string that must match the Python function name `get_my_client_tasks` exported in [functions/main.py]; if the names drift apart the browser would call a URL that does not exist.
export const GET_MY_CLIENT_TASKS_FUNCTION_NAME = 'get_my_client_tasks';

// (Function meaning): Constant string that must match the Python function name `complete_task_step` exported in [functions/main.py].
export const COMPLETE_TASK_STEP_FUNCTION_NAME = 'complete_task_step';

// (Function meaning): Work out the region and project id the same way [clientfetch.js] does (env first, dev defaults second), then build the full callable URL for the given Cloud Function name and return it.
// (External references): `getCloudFunctionUrl` is imported from [clientfetch.js]; the dev defaults keep the emulator path working during `npm start`.
function buildFunctionUrl(functionName) {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID || DEFAULT_LOCAL_FIREBASE_PROJECT_ID;
  return getCloudFunctionUrl(functionName, projectId, region);
}

/**
 * @param {{ getIdToken: () => Promise<string> } | null | undefined} user - signed-in Firebase user; its token proves who is asking so the backend can scope to firm + assignee.
 * @param {string} clientId - which client's tasks to load (the selected client in the UI).
 * @param {AbortSignal} [signal] - optional cancel handle; when the caller aborts it, the underlying `fetch` rejects with an `AbortError` so a stale request can be thrown away.
 * @returns {Promise<{ taskId: string, stepId: string, title: string, stepTitle: string, priority: string, assignedDate: string|null, dueDate: string|null, stepNumber: number }[]>}
 */
// (Function meaning): Ask the backend for the current task steps assigned to this user for one client; attach the login token, send the clientId in the query string, and return the parsed rows — or an empty list if anything goes wrong so the table never crashes.
// (External references): Calls `get_my_client_tasks` in [functions/main.py]; the returned rows are consumed by [Clienttask.js] and rendered by [taskformat.js].
export async function fetchMyClientTasks(user, clientId, signal) {
  // (Function meaning): With no signed-in user or no chosen client there is nothing to fetch, so return an empty list straight away instead of calling the network.
  if (!user || !clientId) {
    return [];
  }

  // (Function meaning): Start from the base function URL, then add the clientId as a query parameter (URL-encoded so odd characters cannot break the address).
  const baseUrl = buildFunctionUrl(GET_MY_CLIENT_TASKS_FUNCTION_NAME);
  const url = `${baseUrl}?clientId=${encodeURIComponent(clientId)}`;

  // (Function meaning): Ask Firebase for a fresh proof-of-login token and put it in the Authorization header; if that fails we leave the header off and the backend will answer 401.
  const headers = {};
  try {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  } catch {
    console.warn('[taskfetch] Could not get ID token; tasks request will be unauthenticated.');
  }

  // (Function meaning): Send the request, passing the optional cancel handle so that if the caller aborts (for example because the user picked a different client), this fetch stops and rejects with an AbortError instead of finishing late.
  const res = await fetch(url, { headers, signal });
  if (!res.ok) {
    console.warn('[taskfetch] HTTP', res.status, url);
    return [];
  }

  const data = await res.json();
  const raw = data?.tasks;
  // (Function meaning): The backend promises a `{ tasks: [...] }` shape; if we got something else, warn and return an empty list so the UI stays stable.
  if (!Array.isArray(raw)) {
    console.warn('[taskfetch] Expected JSON `{ "tasks": [ ... ] }` from `get_my_client_tasks`.');
    return [];
  }

  // (Function meaning): Pass each row through with safe string fallbacks so the table never has to handle missing fields; dates stay as-is (text or null) and the live counter handles parsing.
  return raw.map((row) => ({
    taskId: String(row.taskId ?? ''),
    stepId: String(row.stepId ?? ''),
    stepNumber: Number(row.stepNumber ?? 0),
    title: String(row.title ?? ''),
    stepTitle: String(row.stepTitle ?? ''),
    priority: String(row.priority ?? ''),
    assignedDate: row.assignedDate ?? null,
    dueDate: row.dueDate ?? null,
  }));
}

/**
 * @param {{ getIdToken: () => Promise<string> }} user - signed-in Firebase user.
 * @param {string} taskId - the task that owns the step.
 * @param {string} stepId - the step to mark complete (must be the user's current active step).
 * @returns {Promise<{ ok: boolean, stepsCompleted: number, stepsTotal: number, overallCompleted: boolean }>}
 */
// (Function meaning): Tell the backend to mark one step complete; attach the login token, POST the two ids as JSON, and throw a clear error if the server says no so the caller can show a message and not silently pretend it worked.
// (External references): Calls `complete_task_step` in [functions/main.py]; the error-throwing pattern matches [userProfileApi.js] `saveUserProfile`.
export async function completeTaskStep(user, taskId, stepId) {
  const token = await user.getIdToken();
  const url = buildFunctionUrl(COMPLETE_TASK_STEP_FUNCTION_NAME);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ taskId, stepId }),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  // (Function meaning): If the server returned an error status, prefer its message text; otherwise build a generic one, then throw so the UI's catch block can react.
  if (!res.ok) {
    const serverMsg = data?.error;
    const message =
      typeof serverMsg === 'string' && serverMsg.trim()
        ? serverMsg
        : `Could not complete step (${res.status})`;
    const err = new Error(message);
    err.code = 'task/complete-failed';
    throw err;
  }

  return data;
}

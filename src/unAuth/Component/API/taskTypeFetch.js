/**
 * HTTP clients for task-type data served by `functions/main.py`.
 *
 * Two endpoints are covered here:
 *
 * 1. `get_task_type`      → `{ taskTypes: [{ id, label }] }`
 *    Workflow-category filter options for the dropdown in [DynamicSideBar.js].
 *    Import `fetchTaskTypes`.
 *
 * 2. `get_firm_task_types` → `{ firmTaskTypes: [{ id, label, detail, category }] }`
 *    The actual task-type card items shown in the [TaskEdit.js] sidebar.
 *    Import `fetchFirmTaskTypes`.
 */

/** Must match the Python `@https_fn.on_request()` function name (deployed / emulated). */
// (Rename note): Must stay in sync with the function name in [functions/main.py]; if the Python function is renamed, update this string too.
export const TASK_TYPES_FUNCTION_NAME = 'get_task_type';

/** Default region if `REACT_APP_FIREBASE_FUNCTIONS_REGION` is not set in `.env`. */
export const DEFAULT_FUNCTIONS_REGION = 'us-central1';

/**
 * Used when `REACT_APP_FIREBASE_PROJECT_ID` is not set during `npm start` so the emulator path still matches Firebase CLI.
 * (External references): same value as `"default"` in [.firebaserc] at the repo root.
 */
export const DEFAULT_LOCAL_FIREBASE_PROJECT_ID = 'lynkfiprod';

// (Function meaning): Ask the Firebase backend for the static list of workflow-type options; build the URL from env variables or dev defaults, send a plain GET (no auth token needed because this data is not sensitive), then parse and return the rows — or an empty array if anything goes wrong.
// (External references): URL construction mirrors [clientfetch.js]; the backend endpoint is `get_task_type` in [functions/main.py]; the returned rows are consumed by [TaskEdit.js] to populate the filter dropdown.
export async function fetchTaskTypes() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    (process.env.NODE_ENV === 'development' ? DEFAULT_LOCAL_FIREBASE_PROJECT_ID : '');

  if (!projectId) {
    console.warn(
      '[taskTypeFetch] REACT_APP_FIREBASE_PROJECT_ID is missing; set it in `.env` for production builds so the browser can reach `get_task_type` in `functions/main.py`.',
    );
    return [];
  }

  // (Function meaning): When running on the developer's machine (`development` mode), use a relative path like `/lynkfiprod/us-central1/get_task_type` so the local proxy in [setupProxy.js] can forward it to the emulator; in production use the full `https://` URL instead.
  const runningOnDevMachine = process.env.NODE_ENV === 'development';
  const url = runningOnDevMachine
    ? `/${projectId}/${region}/${TASK_TYPES_FUNCTION_NAME}`
    : `https://${region}-${projectId}.cloudfunctions.net/${TASK_TYPES_FUNCTION_NAME}`;

  let res;
  try {
    res = await fetch(url);
  } catch {
    console.warn('[taskTypeFetch] Network error fetching', url);
    return [];
  }

  if (!res.ok) {
    console.warn('[taskTypeFetch] HTTP', res.status, url);
    return [];
  }

  const data = await res.json();
  const raw = data?.taskTypes;
  if (!Array.isArray(raw)) {
    console.warn(
      '[taskTypeFetch] Expected JSON `{ "taskTypes": [ ... ] }` from `get_task_type` in `functions/main.py`.',
    );
    return [];
  }

  // (Function meaning): One filter-option object per backend entry; each has `id` (the filter key the dropdown passes to `onFilterChange`) and `label` (the human-readable name shown in the list).
  return raw.map((row) => ({ id: String(row.id), label: String(row.label) }));
}

/** Must match the Python `@https_fn.on_request()` function name (deployed / emulated). */
// (Rename note): Must stay in sync with the function name in [functions/main.py]; if the Python function is renamed, update this string too.
export const FIRM_TASK_TYPES_FUNCTION_NAME = 'get_firm_task_types';

// (Function meaning): Ask the Firebase backend for the firm's task-type item list (the cards shown in the [TaskEdit.js] sidebar); build the URL from env variables or dev defaults, send a plain GET (no auth token needed because this is static reference data), then parse and return the rows — or an empty array if anything goes wrong.
// (External references): The backend endpoint is `get_firm_task_types` in [functions/main.py]; the returned rows are consumed by [TaskEdit.js] to populate the sidebar card list and replace the former hardcoded `TASK_TYPES` array.
export async function fetchFirmTaskTypes() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    (process.env.NODE_ENV === 'development' ? DEFAULT_LOCAL_FIREBASE_PROJECT_ID : '');

  if (!projectId) {
    console.warn(
      '[taskTypeFetch] REACT_APP_FIREBASE_PROJECT_ID is missing; set it in `.env` for production builds so the browser can reach `get_firm_task_types` in `functions/main.py`.',
    );
    return [];
  }

  // (Function meaning): When running on the developer's machine (`development` mode), use a relative path so the local proxy in [setupProxy.js] can forward it to the emulator; in production use the full `https://` URL instead.
  const runningOnDevMachine = process.env.NODE_ENV === 'development';
  const url = runningOnDevMachine
    ? `/${projectId}/${region}/${FIRM_TASK_TYPES_FUNCTION_NAME}`
    : `https://${region}-${projectId}.cloudfunctions.net/${FIRM_TASK_TYPES_FUNCTION_NAME}`;

  let res;
  try {
    res = await fetch(url);
  } catch {
    console.warn('[taskTypeFetch] Network error fetching', url);
    return [];
  }

  if (!res.ok) {
    console.warn('[taskTypeFetch] HTTP', res.status, url);
    return [];
  }

  const data = await res.json();
  const raw = data?.firmTaskTypes;
  if (!Array.isArray(raw)) {
    console.warn(
      '[taskTypeFetch] Expected JSON `{ "firmTaskTypes": [ ... ] }` from `get_firm_task_types` in `functions/main.py`.',
    );
    return [];
  }

  // (Function meaning): One card-item object per backend entry; each has `id`, `label`, `detail` (the short description line), and `category` (the workflow type id used to match the dropdown filter).
  return raw.map((row) => ({
    id:       String(row.id),
    label:    String(row.label),
    detail:   row.detail   != null ? String(row.detail)   : '',
    category: row.category != null ? String(row.category) : '',
  }));
}

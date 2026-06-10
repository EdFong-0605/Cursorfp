/**
 * HTTP clients for task-type data served by `functions/main.py`.
 *
 * `get_firm_task_types` returns both the sidebar card list and the filter
 * category options in one response, so a single call at startup is enough:
 *   `{ firmTaskTypes: [{ id, label, detail, category, steps }], taskCategories: [{ id, label }] }`
 *
 * Import `fetchFirmTaskTypes` in [LandingPage.js] — it returns `{ types, categories }`.
 */

/** Default region if `REACT_APP_FIREBASE_FUNCTIONS_REGION` is not set in `.env`. */
export const DEFAULT_FUNCTIONS_REGION = 'us-central1';

/**
 * Used when `REACT_APP_FIREBASE_PROJECT_ID` is not set during `npm start` so the emulator path still matches Firebase CLI.
 * (External references): same value as `"default"` in [.firebaserc] at the repo root.
 */
export const DEFAULT_LOCAL_FIREBASE_PROJECT_ID = 'lynkfiprod';

/** Must match the Python `@https_fn.on_request()` function name (deployed / emulated). */
// (Rename note): Must stay in sync with the function name in [functions/main.py]; if the Python function is renamed, update this string too.
export const FIRM_TASK_TYPES_FUNCTION_NAME = 'get_firm_task_types';

// (Function meaning): Ask the Firebase backend for the firm's task-type items and filter categories in a single GET call; build the URL from env variables or dev defaults, parse both `firmTaskTypes` and `taskCategories` from the response, and return them together as `{ types, categories }` — or `{ types: [], categories: [] }` on any failure so callers always get a safe shape.
// (External references): The backend endpoint is `get_firm_task_types` in [functions/main.py]; `types` populates the sidebar cards in [TaskEdit.js] and `categories` populates the workflow-filter dropdown in [DynamicSideBar.js].
export async function fetchFirmTaskTypes() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    (process.env.NODE_ENV === 'development' ? DEFAULT_LOCAL_FIREBASE_PROJECT_ID : '');

  if (!projectId) {
    console.warn(
      '[taskTypeFetch] REACT_APP_FIREBASE_PROJECT_ID is missing; set it in `.env` for production builds so the browser can reach `get_firm_task_types` in `functions/main.py`.',
    );
    return { types: [], categories: [] };
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
    return { types: [], categories: [] };
  }

  if (!res.ok) {
    console.warn('[taskTypeFetch] HTTP', res.status, url);
    return { types: [], categories: [] };
  }

  const data = await res.json();
  const rawTypes = data?.firmTaskTypes;
  const rawCats  = data?.taskCategories;

  if (!Array.isArray(rawTypes)) {
    console.warn(
      '[taskTypeFetch] Expected JSON `{ "firmTaskTypes": [ ... ] }` from `get_firm_task_types` in `functions/main.py`.',
    );
    return { types: [], categories: [] };
  }

  // (Function meaning): Map each task-type entry to the shape [TaskEdit.js] and [DynamicSideBar.js] expect — `id`, `label`, `detail`, `category`, and the embedded `steps` array so no extra per-selection fetch is needed.
  const types = rawTypes.map((row) => ({
    id:       String(row.id),
    label:    String(row.label),
    detail:   row.detail   != null ? String(row.detail)   : '',
    category: row.category != null ? String(row.category) : '',
    steps:    mapTemplateSteps(row.steps),
  }));

  // (Function meaning): Map each category entry to `{ id, label }` for the workflow-filter dropdown; if the key is missing or not an array, fall back to an empty list so the filter simply does not show rather than crashing.
  const categories = Array.isArray(rawCats)
    ? rawCats.map((c) => ({ id: String(c.id), label: String(c.label) }))
    : [];

  return { types, categories };
}

// (Function meaning): Turn raw step objects from the backend into the shape [OutputArea.js] expects — shared by [fetchFirmTaskTypes] and [fetchTaskTemplate].
function mapTemplateSteps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((step) => ({
    StepID:            String(step.StepID           ?? ''),
    StepNumber:        Number(step.StepNumber        ?? 0),
    StepTitle:         String(step.StepTitle         ?? ''),
    Reason:            String(step.Reason            ?? ''),
    NeededInformation: Array.isArray(step.NeededInformation) ? step.NeededInformation.map(String) : [],
    TeamResponsible:   String(step.TeamResponsible   ?? ''),
    Notes:             String(step.Notes             ?? ''),
  }));
}

/** Must match the Python `@https_fn.on_request()` function name (deployed / emulated). */
// (Rename note): Must stay in sync with the function name in [functions/main.py]; if the Python function is renamed, update this string too.
export const TASK_TEMPLATE_FUNCTION_NAME = 'get_task_template';

// (Function meaning): Ask the Firebase backend for the steps that belong to one task template by name; build the URL from env variables or dev defaults, add the task name as a query parameter, send a plain GET, then parse and return the steps array — or an empty array if the template does not exist yet or anything goes wrong.
// (External references): The backend endpoint is `get_task_template` in [functions/main.py]; the returned steps are consumed by [TaskEdit.js] and passed to [OutputArea.js] for display.
// (Function meaning): `signal` is an optional AbortSignal passed in by [TaskEdit.js] via an AbortController; when the controller is aborted (because the user switched task types or the component unmounted), the fetch is cancelled immediately so no stale data updates the UI.
export async function fetchTaskTemplate(taskLabel, signal) {
  // (Function meaning): If the caller did not pass a task label, return an empty array immediately — there is nothing to search for.
  if (!taskLabel) return [];

  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    (process.env.NODE_ENV === 'development' ? DEFAULT_LOCAL_FIREBASE_PROJECT_ID : '');

  if (!projectId) {
    console.warn(
      '[taskTypeFetch] REACT_APP_FIREBASE_PROJECT_ID is missing; set it in `.env` for production builds so the browser can reach `get_task_template` in `functions/main.py`.',
    );
    return [];
  }

  // (Function meaning): When running on the developer's machine, use a relative path so the local proxy can forward it to the emulator; in production use the full `https://` URL instead.
  const runningOnDevMachine = process.env.NODE_ENV === 'development';
  const base = runningOnDevMachine
    ? `/${projectId}/${region}/${TASK_TEMPLATE_FUNCTION_NAME}`
    : `https://${region}-${projectId}.cloudfunctions.net/${TASK_TEMPLATE_FUNCTION_NAME}`;

  // (Function meaning): Attach the task name as a URL query parameter (URL-encoded so spaces and special characters do not break the address), producing a URL like `/lynkfiprod/us-central1/get_task_template?taskName=Client+Onboarding`.
  const url = `${base}?taskName=${encodeURIComponent(taskLabel)}`;

  let res;
  try {
    // (Function meaning): Pass `signal` into fetch so the browser can abort the in-flight network request the moment the AbortController fires — this matches the pattern used by `fetchMyClientTasks` in [clientfetch.js].
    res = await fetch(url, { signal });
  } catch {
    console.warn('[taskTypeFetch] Network error fetching', url);
    return [];
  }

  if (!res.ok) {
    console.warn('[taskTypeFetch] HTTP', res.status, url);
    return [];
  }

  const data = await res.json();
  const raw = data?.steps;
  if (!Array.isArray(raw)) {
    console.warn(
      '[taskTypeFetch] Expected JSON `{ "steps": [ ... ] }` from `get_task_template` in `functions/main.py`.',
    );
    return [];
  }

  return mapTemplateSteps(raw);
}

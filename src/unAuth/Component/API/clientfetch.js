/**
 * HTTP client for the dummy client list from `on_request_example` in `functions/main.py`.
 *
 * Response shape from Python (dummy endpoint):
 *   `{ clients: [{ SystemID, FirstName, LastName, AUM?, StartDate?, ... }] }`
 *
 * This module maps that to UI rows:
 *   `{ id, label, aum?, startDate? }[]` — `id` = SystemID, `label` = full name; optional `AUM` / `StartDate` from API for cards.
 *
 * Import `fetchDummyClientsFromMainPy` from UI (SearchBar, LandingPage, etc.).
 * Import `getClientsEndpointUrl` only if you need the raw URL elsewhere.
 */

/** Must match the Python `@https_fn.on_request()` function name (deployed / emulated). */
export const DUMMY_CLIENTS_FUNCTION_NAME = 'on_request_example';

/** Default region if `REACT_APP_FIREBASE_FUNCTIONS_REGION` is not set in `.env`. */
export const DEFAULT_FUNCTIONS_REGION = 'us-central1';

/**
 * Used when `REACT_APP_FIREBASE_PROJECT_ID` is not set during `npm start` so the emulator path still matches Firebase CLI.
 * (External references): same value as `"default"` in [.firebaserc] at the repo root.
 */
export const DEFAULT_LOCAL_FIREBASE_PROJECT_ID = 'lynkfiprod';

/**
 * Builds the URL that `fetch` uses to load the client list.
 *
 * - **Production:** `https://<region>-<project>.cloudfunctions.net/on_request_example`
 * - **Local (`npm start`):** `http://127.0.0.1:5001/<project>/<region>/on_request_example` (or set `REACT_APP_FUNCTIONS_EMULATOR_ORIGIN`)
 * - **Local + CRA proxy:** set `REACT_APP_USE_RELATIVE_FUNCTIONS_PROXY=true` in `.env` → same path but relative (`/project/...`) so [package.json] `"proxy"` forwards it
 */
export function getClientsEndpointUrl(projectId, region) {
  const fn = DUMMY_CLIENTS_FUNCTION_NAME;
  const pathOnly = `/${projectId}/${region}/${fn}`;

  const runningOnDevMachine = process.env.NODE_ENV === 'development';
  if (!runningOnDevMachine) {
    return `https://${region}-${projectId}.cloudfunctions.net/${fn}`;
  }

  const useCreateReactAppProxy = process.env.REACT_APP_USE_RELATIVE_FUNCTIONS_PROXY === 'true';
  if (useCreateReactAppProxy) {
    return pathOnly;
  }

  const emulatorBase =
    process.env.REACT_APP_FUNCTIONS_EMULATOR_ORIGIN || 'http://127.0.0.1:5001';
  const baseNoTrailingSlash = emulatorBase.replace(/\/$/, '');
  return `${baseNoTrailingSlash}${pathOnly}`;
}

/**
 * Fetches clients and returns rows ready for a `<select>`.
 *
 * @returns {Promise<{ id: string, label: string, aum?: number, startDate?: string }[]>}
 */
export async function fetchDummyClientsFromMainPy() {
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const projectId =
    process.env.REACT_APP_FIREBASE_PROJECT_ID ||
    (process.env.NODE_ENV === 'development' ? DEFAULT_LOCAL_FIREBASE_PROJECT_ID : '');
  if (!projectId) {
    console.warn(
      '[clientfetch] REACT_APP_FIREBASE_PROJECT_ID is missing; set it in `.env` for production builds so the browser can reach `on_request_example` in `functions/main.py`.',
    );
    return [];
  }
  const url = getClientsEndpointUrl(projectId, region);

  const res = await fetch(url);
  if (!res.ok) {
    console.warn('[clientfetch] HTTP', res.status, url);
    return [];
  }
  const data = await res.json();
  const raw = data?.clients;
  if (!Array.isArray(raw)) {
    console.warn(
      '[clientfetch] Expected JSON `{ "clients": [ ... ] }` from `on_request_example` in `functions/main.py`.',
    );
    return [];
  }
  // (Function meaning): One UI row per backend object; nothing is skipped so [Clientbar.js] can list every client the function returned.
  return raw.map((row) => {
    const rawAum = row.AUM;
    const aum =
      rawAum == null || rawAum === ''
        ? undefined
        : Number(rawAum);
    return {
      id: String(row.SystemID),
      label: `${row.FirstName} ${row.LastName}`.trim(),
      ...(Number.isFinite(aum) ? { aum } : {}),
      ...(row.StartDate != null && row.StartDate !== ''
        ? { startDate: String(row.StartDate) }
        : {}),
    };
  });
}

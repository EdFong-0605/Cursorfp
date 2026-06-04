/**
 * HTTP client for the dummy client list from `on_request_example` in `functions/main.py`.
 *
 * Response shape from Python (dummy endpoint):
 *   `{ clients: [{ ClientID, FirstName, LastName, AUM?, StartDate?, ... }] }`
 *
 * This module maps that to UI rows:
 *   `{ id, label, aum?, startDate? }[]` — `id` = ClientID, `label` = full name; optional `AUM` / `StartDate` from API for cards.
 *
 * Import `fetchDummyClientsFromMainPy` from UI (SearchBar, LandingPage, etc.).
 * Import `getClientsEndpointUrl` only if you need the raw URL elsewhere.
 */

/** Must match the Python `@https_fn.on_request()` function name (deployed / emulated). */
// (Rename note): Python function was renamed from `on_request_example` to `request_Clients_info`; this string must stay in sync with the function name in [functions/main.py].
export const DUMMY_CLIENTS_FUNCTION_NAME = 'request_Clients_info';

/** Default region if `REACT_APP_FIREBASE_FUNCTIONS_REGION` is not set in `.env`. */
export const DEFAULT_FUNCTIONS_REGION = 'us-central1';

/**
 * Used when `REACT_APP_FIREBASE_PROJECT_ID` is not set during `npm start` so the emulator path still matches Firebase CLI.
 * (External references): same value as `"default"` in [.firebaserc] at the repo root.
 */
export const DEFAULT_LOCAL_FIREBASE_PROJECT_ID = 'lynkfiprod';

/**
 * Builds the HTTPS / emulator URL for any callable HTTP Cloud Function by exported name.
 *
 * - **Production:** `https://<region>-<project>.cloudfunctions.net/<functionName>`
 * - **Local (`npm start`):** `/<project>/<region>/<functionName>` → [setupProxy.js] forwards to the emulator
 * (External references): Used by [getClientsEndpointUrl] and [openaiChat.js].
 */
export function getCloudFunctionUrl(functionName, projectId, region) {
  const pathOnly = `/${projectId}/${region}/${functionName}`;

  const runningOnDevMachine = process.env.NODE_ENV === 'development';
  if (!runningOnDevMachine) {
    return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
  }

  return pathOnly;
}

/**
 * Builds the URL that `fetch` uses to load the client list.
 *
 * - **Production:** `https://<region>-<project>.cloudfunctions.net/on_request_example`
 * - **Local (`npm start`):** `/<project>/<region>/on_request_example` — [setupProxy.js] forwards only these paths to the emulator
 */
export function getClientsEndpointUrl(projectId, region) {
  return getCloudFunctionUrl(DUMMY_CLIENTS_FUNCTION_NAME, projectId, region);
}

/**
 * Fetches clients and returns rows ready for a `<select>`.
 *
 * @param {{ getIdToken: () => Promise<string> } | null | undefined} user - the signed-in Firebase user object; when provided its ID token is sent as `Authorization: Bearer <token>` so the backend can identify the firm.
 * @returns {Promise<{ id: string, label: string, aum?: number, startDate?: string }[]>}
 */
// (Function meaning): Ask the Firebase backend for this user's firm-scoped client list; build the URL from env variables or dev defaults, attach the user's login proof token in the Authorization header, then parse and return the rows — or an empty array if anything goes wrong.
// (External references): URL is built by [getClientsEndpointUrl] above; the backend endpoint is `on_request_example` in [functions/main.py]; the returned rows are consumed by [LandingPage.js] and [SearchBar.js].
export async function fetchDummyClientsFromMainPy(user) {
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

  // (Function meaning): If a signed-in user object was passed in, ask Firebase for a fresh proof-of-login token string and attach it to the request headers so the server can verify who is asking; if no user was given, send the request without an Authorization header (server will return 401).
  const headers = {};
  if (user) {
    try {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      console.warn('[clientfetch] Could not get ID token; request will be unauthenticated.');
    }
  }

  const res = await fetch(url, { headers });
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
      id: String(row.ClientID),
      label: `${row.FirstName} ${row.LastName}`.trim(),
      ...(Number.isFinite(aum) ? { aum } : {}),
      ...(row.StartDate != null && row.StartDate !== ''
        ? { startDate: String(row.StartDate) }
        : {}),
    };
  });
}

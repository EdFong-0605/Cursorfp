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
 * Builds the HTTP URL for the dummy-clients function.
 *
 * - Development (`npm start`): relative path → CRA `package.json` `"proxy"` → Functions emulator :5001.
 * - Production (`npm run build`): HTTPS URL on `cloudfunctions.net`.
 *
 * @param {string} projectId - `REACT_APP_FIREBASE_PROJECT_ID`
 * @param {string} region - e.g. `us-central1`
 */
export function getClientsEndpointUrl(projectId, region) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const devRelativePath = `/${projectId}/${region}/${DUMMY_CLIENTS_FUNCTION_NAME}`;
  const prodFirebaseUrl = `https://${region}-${projectId}.cloudfunctions.net/${DUMMY_CLIENTS_FUNCTION_NAME}`;
  // If you skip the proxy, call the emulator directly (watch CORS): `http://localhost:5001/${projectId}/${region}/${DUMMY_CLIENTS_FUNCTION_NAME}`
  return isDevelopment ? devRelativePath : prodFirebaseUrl;
}

/**
 * Fetches clients and returns rows ready for a `<select>`.
 *
 * @returns {Promise<{ id: string, label: string, aum?: number, startDate?: string }[]>}
 */
export async function fetchDummyClientsFromMainPy() {
  const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
  const region = process.env.REACT_APP_FIREBASE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
  const url = getClientsEndpointUrl(projectId, region);

  const res = await fetch(url);
  const data = await res.json();
  return data.clients.map((row) => {
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

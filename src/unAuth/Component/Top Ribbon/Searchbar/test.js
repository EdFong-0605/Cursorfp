/**
 * Educational mock only — not wired into the app.
 *
 * Shows what a “load options for the client dropdown” HTTP call typically
 * entails: method, full URL (with optional query when a scope is selected),
 * and headers. No auth checks, no validation, no real network unless you
 * uncomment the fetch line.
 */
import { useMemo, useState } from 'react';

/** Example key you asked to assume for this exercise. */
const API_KEY = 'asd1234';

/**
 * Replace with your real list endpoint (same idea as REACT_APP_CLIENTS_URL
 * in SearchBar.js).
 */
const EXAMPLE_CLIENTS_LIST_URL = 'https://your-database-host.example/v1/clients';

/** Fake rows as if they already came from your DB — shape matches SearchBar. */
const MOCK_DATABASE_ROWS = [
  { id: 'client-acme', label: 'Acme Corp' },
  { id: 'client-northwind', label: 'Northwind LLC' },
];

/**
 * Builds the exact request your UI would use after the user picks a scope
 * in the dropdown (optional query param is illustrative only).
 *
 * @param {string} selectedClientId — value from `<select>`; empty means “all”.
 * @returns {{ method: string, url: string, headers: Record<string, string>, credentials: RequestCredentials }}
 */
function buildClientsListRequest(selectedClientId) {
  const url = new URL(EXAMPLE_CLIENTS_LIST_URL);
  if (selectedClientId) {
    url.searchParams.set('clientScope', selectedClientId);
  }

  return {
    method: 'GET',
    url: url.toString(),
    headers: {
      // Common patterns — use what your backend actually documents:
      'x-api-key': API_KEY,
      // 'Authorization': `Bearer ${API_KEY}`,
      Accept: 'application/json',
    },
    // Mirrors SearchBar’s fetchClientOptionsFromBackend (cookies if you use them).
    credentials: 'include',
  };
}

/**
 * Simulates latency and returns the same shape a real JSON body might use
 * for dropdown options `{ id, label }[]`.
 *
 * @param {string} selectedClientId
 * @returns {Promise<{ id: string, label: string }[]>}
 */
async function mockFetchClientsForDropdown(selectedClientId) {
  const spec = buildClientsListRequest(selectedClientId);
  // eslint-disable-next-line no-console
  console.info('[education mock] would call:', spec);

  await new Promise((r) => setTimeout(r, 350));

  const base = [{ id: '', label: 'All clients' }, ...MOCK_DATABASE_ROWS];
  if (!selectedClientId) return base;
  return base.filter((row) => !row.id || row.id === selectedClientId);
}

/**
 * Drop-in demo: dropdown + button prints the request object and runs a mock
 * “database” response into state.
 *
 * To try a real call later, replace mockFetchClientsForDropdown with:
 *
 *   const spec = buildClientsListRequest(selectedClientId);
 *   const res = await fetch(spec.url, {
 *     method: spec.method,
 *     headers: spec.headers,
 *     credentials: spec.credentials,
 *   });
 *   const data = await res.json();
 */
export function EducationalDatabaseDropdownMock() {
  const [clientId, setClientId] = useState('');
  const [lastRequest, setLastRequest] = useState(null);
  const [rows, setRows] = useState(() => [{ id: '', label: 'All clients' }, ...MOCK_DATABASE_ROWS]);
  const [loading, setLoading] = useState(false);

  const selectOptions = useMemo(
    () => [{ id: '', label: 'All clients' }, ...MOCK_DATABASE_ROWS],
    [],
  );

  const runMock = async () => {
    setLastRequest(buildClientsListRequest(clientId));
    setLoading(true);
    try {
      const next = await mockFetchClientsForDropdown(clientId);
      setRows(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 640, fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>What a “clients for dropdown” API call entails</h2>

      <label style={{ display: 'block', fontSize: 13 }}>
        Client scope (dropdown)
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          style={{ display: 'block', marginTop: 6, width: '100%', padding: 8 }}
        >
          {selectOptions.map((o) => (
            <option key={o.id || 'all'} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" onClick={runMock} disabled={loading} style={{ marginTop: 12, padding: '8px 12px' }}>
        {loading ? 'Mocking request…' : 'Run mock request (see below)'}
      </button>

      {lastRequest && (
        <section style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Request your code would send</h3>
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: '#0f0f0f',
              color: '#f3f3f3',
              fontSize: 12,
              overflow: 'auto',
              borderRadius: 6,
            }}
          >
            {JSON.stringify(lastRequest, null, 2)}
          </pre>
          <p style={{ fontSize: 12, color: '#444', marginTop: 8 }}>
            Equivalent: <code>fetch(lastRequest.url, {'{ method, headers, credentials }'})</code>
          </p>
        </section>
      )}

      <section style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 13, margin: '0 0 8px' }}>Options after mock “response” (for the dropdown)</h3>
        <ul style={{ fontSize: 13, margin: 0, paddingLeft: 18 }}>
          {rows.map((r) => (
            <li key={r.id || 'all'}>
              <code>{r.id || '(empty)'}</code> — {r.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default EducationalDatabaseDropdownMock;

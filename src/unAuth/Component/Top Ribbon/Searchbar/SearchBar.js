/** Site search: query field, submit, and client scope (render inside TopRibbon). */
import { useEffect, useState } from 'react';
import './SearchBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

// =============================================================================
// BACKEND — Client list for the “search which client” dropdown
// ---------------------------------------------------------------------------
// Loaded once when this component mounts (until a full page reload).
// Set `REACT_APP_CLIENTS_URL` in `.env` to your API endpoint (trimmed; no
// trailing spaces). The response should be a JSON array of
// `{ id: string, label: string }`, or `{ clients | data | results: [...] }`,
// or see mapper for `clientId` / `name`.
// Optional: `REACT_APP_CLIENTS_API_KEY` → sent as `x-api-key` (only for keys
// meant to be used from the browser; prefer cookies/session otherwise).
// If you pass a `clients` prop from a parent instead, this file will NOT
// fetch — the parent owns the list.
// =============================================================================
const PLACEHOLDER_CLIENT_OPTIONS = [
  { id: '', label: 'All clients (placeholder)' },
  { id: 'placeholder-client-1', label: 'XYZ Inc. (placeholder)' },
  { id: 'placeholder-client-2', label: 'Northwind LLC (placeholder)' },
];

/**
 * @param {unknown} payload
 * @returns {{ id: string, label: string }[]}
 */
function normalizeClientOptions(payload) {
  if (!Array.isArray(payload) || payload.length === 0) {
    return PLACEHOLDER_CLIENT_OPTIONS;
  }
  const mapped = payload
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      if (typeof row.id === 'string' && typeof row.label === 'string') {
        return { id: row.id, label: row.label };
      }
      const id = row.clientId ?? row.id;
      const label = row.name ?? row.label;
      if (id == null || label == null) return null;
      return { id: String(id), label: String(label) };
    })
    .filter(Boolean);
  return mapped.length > 0 ? mapped : PLACEHOLDER_CLIENT_OPTIONS;
}

/**
 * Single fetch for the session (see BACKEND block above).
 * @returns {Promise<{ id: string, label: string }[]>}
 */
async function fetchClientOptionsFromBackend() {
  const url = process.env.REACT_APP_CLIENTS_URL;
  if (!url) {
    return PLACEHOLDER_CLIENT_OPTIONS;
  }
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Clients request failed: ${res.status}`);
  }
  const data = await res.json();
  return normalizeClientOptions(data);
}

/**
 * @param {object} props
 * @param {string} [props.placeholder]
 * @param {{ id: string, label: string }[]} [props.clients] — if set, internal fetch is skipped
 * @param {(query: string, context: { clientId: string }) => void} [props.onSearch]
 */
function SearchBar({ placeholder = 'Search…', clients: clientsProp, onSearch }) {
  const parentProvidesList = clientsProp !== undefined;
  const [fetchedClients, setFetchedClients] = useState(null);
  const [query, setQuery] = useState('');
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    if (parentProvidesList) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchClientOptionsFromBackend();
        if (!cancelled) setFetchedClients(rows);
      } catch {
        if (!cancelled) setFetchedClients(PLACEHOLDER_CLIENT_OPTIONS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [parentProvidesList]);

  const clientOptions = parentProvidesList
    ? clientsProp
    : (fetchedClients ?? PLACEHOLDER_CLIENT_OPTIONS);

  useEffect(() => {
    if (!clientOptions.length) return;
    setClientId((prev) =>
      clientOptions.some((c) => c.id === prev) ? prev : (clientOptions[0]?.id ?? ''),
    );
  }, [clientOptions]);

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (onSearch) {
      onSearch(trimmed, { clientId });
    }
  }

  return (
    <form
      className="searchbar__form"
      role="search"
      aria-label="Site search"
      onSubmit={handleSubmit}
    >
      <label className="searchbar__label" htmlFor="landing-client-scope">
        Client to search
      </label>
      <select
        id="landing-client-scope"
        className="searchbar__client"
        name="client"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      >
        {clientOptions.map((c) => (
          <option key={c.id || '__all__'} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <label className="searchbar__label" htmlFor="landing-site-search">
        Search
      </label>
      <input
        id="landing-site-search"
        className="searchbar__input"
        type="search"
        name="q"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="submit" className="searchbar__submit" aria-label="Submit search">
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      </button>
    </form>
  );
}

export default SearchBar;

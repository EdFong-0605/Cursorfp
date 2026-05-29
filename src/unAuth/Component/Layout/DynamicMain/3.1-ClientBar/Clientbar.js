/*
 * (External references):
 * - Parent: [Clienttask.js] or [ProgressBar.js] via [MainLanding.js]. Data: [LandingPage.js] → [Component/API/clientfetch.js] (`id`, `label`, optional `aum`, `startDate`). `pageName` comes from the parent screen.
 * - Theme: [NavBar.css] `.navbar-sheet__body-right`.
 */
import { useState } from 'react';
import './Clientbar.css';

// (Function meaning): Official titles for the top of the client rail — must stay in sync with [NavBar.js] icon labels and [TaskFormat] section titles in [Clienttask.js] / [ProgressBar.js].
export const CLIENT_BAR_PAGE_LABELS = {
  tasks: 'Tasks',
  progress: 'Client progress',
};

// (Function meaning): Turn a stored number into a short US dollar string for the card (uses “compact” for big numbers so it fits the narrow bar).
function formatAum(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(Number(value));
}

// (Function meaning): Turn an API date string (usually YYYY-MM-DD) into a friendly “Jan 10, 2023” style label; if it fails, show the raw string or a dash.
function formatStartDate(iso) {
  if (iso == null || iso === '') return '—';
  const d = new Date(`${String(iso).trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// (Function meaning): `clients` = rows from the parent; `selectedClientId` = which card is active; `onSelectClient` = tell parent when user picks a card; `onRefresh` asks the parent to fetch client data again; `pageKey` = which screen you are on (`tasks` or `progress`) so we look up the title in `CLIENT_BAR_PAGE_LABELS`; `pageName` is only a fallback if you pass a custom string instead of a key.
function Clientbar({
  clients = [],
  selectedClientId,
  onSelectClient,
  onRefresh,
  pageKey = '',
  pageName = '',
}) {
  // (Function meaning): `refreshing` is true only while we wait for the parent refresh call to finish, so the button can disable itself and show a waiting animation.
  const [refreshing, setRefreshing] = useState(false);

  // (Function meaning): When the refresh button is clicked, skip if no refresh callback exists or one is already running; otherwise call the parent refresh function and reset loading state when done.
  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // (Function meaning): Pick the title from `CLIENT_BAR_PAGE_LABELS` when `pageKey` is `tasks` or `progress`; otherwise use a trimmed custom `pageName`; if both are empty, hide the page row at the top.
  const pageLabelFromKey =
    pageKey && CLIENT_BAR_PAGE_LABELS[pageKey] ? CLIENT_BAR_PAGE_LABELS[pageKey] : null;
  const pageLabelFromProp =
    pageName && String(pageName).trim() ? String(pageName).trim() : null;
  const pageLabel = pageLabelFromKey ?? pageLabelFromProp;

  return (
    <aside className="client-bar" aria-label="Client list">
      {pageLabel ? (
        <div className="client-bar__page">
          <p className="client-bar__page-name">{pageLabel}</p>
        </div>
      ) : null}
      <div className="client-bar__head">
        <h2 className="client-bar__title">Clients</h2>
        <button
          type="button"
          className={refreshing ? 'client-bar__refresh client-bar__refresh--busy' : 'client-bar__refresh'}
          onClick={handleRefresh}
          aria-label="Refresh client list"
          title="Refresh clients"
          disabled={!onRefresh || refreshing}
        >
          {refreshing ? (
            <span className="client-bar__refresh-dots" aria-hidden="true">
              <span className="client-bar__refresh-dot" />
              <span className="client-bar__refresh-dot" />
              <span className="client-bar__refresh-dot" />
            </span>
          ) : (
            <svg
              className="client-bar__refresh-icon"
              viewBox="0 0 24 24"
              width="12"
              height="13"
              aria-hidden="true"
            >
              <path
                d="M20 6v5h-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1."
              />
              <path
                d="M20 11a8 8 0 1 0 2.34 5.66"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.9"
              />
            </svg>
          )}
        </button>
      </div>

      {/* (Function meaning): One scrollable region below the title row so long client lists scroll inside the rail, not the whole page. */}
      <div className="client-bar__scroll">
        {clients.length === 0 ? (
          <p className="client-bar__empty">Loading clients…</p>
        ) : (
          <ul className="client-bar__list">
            {clients.map((c) => {
              const isActive = c.id === selectedClientId;
              return (
                <li key={c.id} className="client-bar__item">
                  <button
                    type="button"
                    className={
                      isActive ? 'client-bar__card client-bar__card--active' : 'client-bar__card'
                    }
                    onClick={() => onSelectClient?.(c.id)}
                    aria-pressed={isActive}
                    title={`${c.label} · AUM ${formatAum(c.aum)} · since ${formatStartDate(c.startDate)}`}
                  >
                    <span className="client-bar__card-main">
                      <span className="client-bar__card-name">{c.label}</span>
                      <span className="client-bar__card-row">
                        <span className="client-bar__card-aum">{formatAum(c.aum)}</span>
                        <span className="client-bar__card-sep" aria-hidden>
                          ·
                        </span>
                        <span className="client-bar__card-date">{formatStartDate(c.startDate)}</span>
                      </span>
                    </span>
                    <span className="client-bar__card-chevron" aria-hidden="true">
                      <svg
                        className="client-bar__card-chevron-svg"
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        focusable="false"
                      >
                        <path
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 6l6 6-6 6"
                        />
                      </svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default Clientbar;

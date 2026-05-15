/*
 * (External references):
 * - Parent: [MainLanding.js]. Data: [LandingPage.js] → [Component/API/clientfetch.js] (`id`, `label`, optional `aum`, `startDate`).
 * - Theme: [NavBar.css] `.navbar-sheet__body-right`.
 */
import './Clientbar.css';

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

// (Function meaning): `clients` = rows from the parent; `selectedClientId` = which card is active; `onSelectClient` = tell parent when user picks a card.
function Clientbar({ clients = [], selectedClientId, onSelectClient }) {
  return (
    <aside className="client-bar" aria-label="Client list">
      <div className="client-bar__head">
        <h2 className="client-bar__title">Clients</h2>
      </div>

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
    </aside>
  );
}

export default Clientbar;

/*
 * (External references):
 * - Parent: [Clienttask.js] or [ProgressBar.js] via [MainLanding.js]. Data: [LandingPage.js] → [Component/API/clientfetch.js] (`id`, `label`, optional `aum`, `startDate`). `pageName` comes from the parent screen.
 * - Theme: [NavBar.css] `.navbar-sheet__body-right`.
 */
import { useState, useRef, useEffect } from 'react';
import './DynamicSideBar.css';

// (Function meaning): Official titles for the top of the client rail — must stay in sync with [NavBar.js] icon labels and [TaskFormat] section titles in [Clienttask.js] / [ProgressBar.js].
export const CLIENT_BAR_PAGE_LABELS = {
  tasks: 'Tasks',
  progress: 'Client progress',
  taskedit: 'Task Edit',
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

// (Function meaning): Small searchable dropdown (combobox) shown above the task-type list when `options` is provided — the user can type to narrow down which workflow category to pick; selecting "All workflow types" clears the filter and shows every task type again; selecting a specific category shows only the task types that belong to it.
// (External references): Rendered inside [Clientbar] below when `filterOptions` prop is passed; calls `onChange` which is wired to `setSelectedWorkflowType` in [TaskEdit.js].
function WorkflowFilterDropdown({ options, value, onChange, placeholder }) {
  // (Function meaning): `searchText` is what the user has typed into the input box so far; it narrows the visible options list but does NOT change the actual selected filter until the user clicks an option.
  const [searchText, setSearchText] = useState('');
  // (Function meaning): `open` tracks whether the dropdown list is currently visible (`true`) or hidden (`false`); toggled by clicking the field and closed when an option is chosen or the user clicks away.
  const [open, setOpen] = useState(false);
  // (Function meaning): `containerRef` points to the outer wrapper `<div>` of the combobox so the "click outside" listener below can tell whether the click landed inside or outside the dropdown.
  const containerRef = useRef(null);

  // (Function meaning): Attach a listener to the whole document that watches for mouse clicks; if the click lands outside the dropdown wrapper (`containerRef.current`), close the list — this is the standard way to dismiss a dropdown when the user clicks away.
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    // (Function meaning): Return a cleanup function so the listener is removed when this component is taken off the page, which prevents memory leaks and ghost events.
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // (Function meaning): Look up the label of the currently selected option so we can display it in the closed-state input box; if nothing is selected yet, `selectedOption` will be `undefined` and `displayLabel` will be an empty string (the placeholder text will show instead).
  const selectedOption = options.find((o) => o.id === value);
  const displayLabel = selectedOption ? selectedOption.label : '';

  // (Function meaning): `filteredOptions` is the subset of workflow-type options that pass the search — only entries whose `label` text contains what the user typed (case is ignored); when the search box is empty every option passes through unchanged.
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    // (Function meaning): The outer `<div>` uses `position: relative` in the CSS so the dropdown list (`position: absolute`) appears directly below the input field without shifting the rest of the page layout.
    <div className="wf-filter" ref={containerRef}>
      {/* (Function meaning): The visible "button-like" field — clicking anywhere on it opens or closes the dropdown list. */}
      <div
        className="wf-filter__field"
        onClick={() => setOpen((v) => !v)}
      >
        {/* (Function meaning): The text input serves double duty — when the list is closed it shows the selected label (read-only); when the list is open the user can type to search, so `readOnly` is toggled and the value switches between the display label and the live search text. */}
        <input
          className="wf-filter__input"
          placeholder={placeholder}
          value={open ? searchText : displayLabel}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={() => { setOpen(true); setSearchText(''); }}
          readOnly={!open}
          aria-haspopup="listbox"
          aria-expanded={open}
        />
        {/* (Function meaning): The small arrow symbol on the right side of the field is purely decorative — it hints that clicking opens a list, like a regular select box. `pointer-events: none` in the CSS lets clicks fall through to the parent `<div>` handler above. */}
        <span className="wf-filter__chevron" aria-hidden="true">▾</span>
      </div>

      {/* (Function meaning): The drop-down list is only inserted into the page when `open` is true — when closed it is completely removed from the DOM so it does not block clicks on other elements. */}
      {open && (
        <ul className="wf-filter__list" role="listbox" aria-label="Workflow type options">
          {/* (Function meaning): The first option is always "All workflow types" — clicking it passes an empty string to `onChange`, which tells [TaskEdit.js] to clear the filter and show every task type; `onMouseDown` with `e.preventDefault()` stops the browser from firing a blur event on the input before our click handler runs, which would accidentally close the list before the selection is registered. */}
          <li
            className={`wf-filter__option${value === '' ? ' wf-filter__option--selected' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); onChange(''); setSearchText(''); setOpen(false); }}
            role="option"
            aria-selected={value === ''}
          >
            All workflow types
            {value === '' && <span className="wf-filter__check" aria-hidden="true">✓</span>}
          </li>

          {/* (Function meaning): One `<li>` per option that survived the search filter — clicking it passes that option's `id` to `onChange` in [TaskEdit.js], which updates `selectedWorkflowType` and re-filters the task-type list. */}
          {filteredOptions.map((o) => (
            <li
              key={o.id}
              className={`wf-filter__option${value === o.id ? ' wf-filter__option--selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(o.id); setSearchText(''); setOpen(false); }}
              role="option"
              aria-selected={value === o.id}
            >
              {o.label}
              {/* (Function meaning): Show a check mark next to the option that is currently active so the user can immediately see which filter is applied. */}
              {value === o.id && <span className="wf-filter__check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// (Function meaning): `clients` = rows from the parent; `selectedClientId` = which card is active; `onSelectClient` = tell parent when user picks a card; `onRefresh` asks the parent to fetch client data again; `pageKey` = which screen you are on (`tasks` or `progress`) so we look up the title in `CLIENT_BAR_PAGE_LABELS`; `pageName` is only a fallback if you pass a custom string instead of a key.
// (Function meaning): New optional props for non-client pages: `items` replaces `clients` when provided — an array of `{ id, label, detail? }` where `detail` is a short extra line shown under the name; `selectedItemId` and `onSelectItem` replace `selectedClientId` and `onSelectClient`; `sidebarTitle` overrides the "Clients" heading; `emptyMessage` overrides the "Loading clients…" default text.
// (Function meaning): New optional filter props (Task Edit only): `filterOptions` is the array of `{ id, label }` workflow categories fetched from the backend; `filterValue` is the currently selected category id (empty string = no filter); `onFilterChange` is called with the new id when the user picks a category; `filterPlaceholder` is the hint text shown in the search box when nothing is typed. Passing none of these props leaves the sidebar unchanged for [Clienttask.js] and [ProgressBar.js].
// (Function meaning): `showSearch` (default `false`) — when `true`, a plain text input appears above the card list and filters entries by name as the user types; the search state lives entirely inside this component so the parent does not need to track it.
function Clientbar({
  clients = [],
  selectedClientId,
  onSelectClient,
  onRefresh,
  pageKey = '',
  pageName = '',
  items,
  selectedItemId,
  onSelectItem,
  sidebarTitle,
  emptyMessage,
  filterOptions,
  filterValue = '',
  onFilterChange,
  filterPlaceholder = 'Search workflow types',
  showSearch = false,
}) {
  // (Function meaning): `refreshing` is true only while we wait for the parent refresh call to finish, so the button can disable itself and show a waiting animation.
  const [refreshing, setRefreshing] = useState(false);

  // (Function meaning): `searchText` holds whatever the user has typed into the client-name search box; it starts as an empty string (no filter) and is only used when `showSearch` is true.
  const [searchText, setSearchText] = useState('');

  // (Function meaning): `isItemMode` is true when the parent passed an `items` array (for example Task Edit); false means we are in the normal client mode used by Clienttask and ProgressBar. This one boolean lets the rendering below pick the right list, selected id, click handler, heading, and empty text without duplicating any JSX.
  const isItemMode = items !== undefined;
  // (Function meaning): Point `activeList` at whichever array the parent wants us to show — generic items on Task Edit, or clients everywhere else — so the mapping below never has to branch on which mode we are in.
  const activeList = isItemMode ? (items ?? []) : clients;
  // (Function meaning): `activeSelectedId` is the id of whichever card is currently highlighted — from `selectedItemId` on Task Edit or `selectedClientId` on client pages.
  const activeSelectedId = isItemMode ? selectedItemId : selectedClientId;
  // (Function meaning): `handleSelect` is the callback we call when the user clicks a card — `onSelectItem` on Task Edit or `onSelectClient` on client pages.
  const handleSelect = isItemMode ? onSelectItem : onSelectClient;
  // (Function meaning): Choose the sidebar heading text: a custom `sidebarTitle` wins if provided; otherwise use "Task Types" in item mode or "Clients" in client mode.
  const heading = sidebarTitle ?? (isItemMode ? 'Task Types' : 'Clients');
  // (Function meaning): Choose the text shown when the list is empty: a custom `emptyMessage` wins; otherwise show a sensible default for each mode.
  const emptyText = emptyMessage ?? (isItemMode ? 'No task types available.' : 'Loading clients…');

  // (Function meaning): `displayList` is what actually gets mapped into cards — when `showSearch` is on and the user has typed something, keep only the entries whose `label` contains that text (case-insensitive); otherwise show everything in `activeList` unchanged.
  const displayList =
    showSearch && searchText.trim() !== ''
      ? activeList.filter((c) =>
          c.label.toLowerCase().includes(searchText.toLowerCase()),
        )
      : activeList;

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
    <aside className="client-bar" aria-label={isItemMode ? 'Task type list' : 'Client list'}>
      {pageLabel ? (
        <div className="client-bar__page">
          <p className="client-bar__page-name">{pageLabel}</p>
        </div>
      ) : null}
      <div className="client-bar__head">
        <h2 className="client-bar__title">{heading}</h2>
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

      {/* (Function meaning): When `showSearch` is true (set by [Clienttask.js] and [ProgressBar.js]), show a plain text input that lets the user type any part of a client name; the list below shrinks in real time to only the matching cards; when `showSearch` is false this block renders nothing so [TaskEdit.js] is completely unaffected. */}
      {showSearch && (
        <div className="cb-search">
          {/* (Function meaning): The magnifying-glass SVG icon is purely decorative — `aria-hidden="true"` hides it from screen readers since the `<input>` already has its own `aria-label`. */}
          <svg className="cb-search__icon" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className="cb-search__input"
            type="text"
            placeholder="Search clients…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Search clients by name"
          />
          {/* (Function meaning): Only show the clear button when the user has typed something — clicking it wipes `searchText` back to empty so the full client list reappears. */}
          {searchText && (
            <button
              type="button"
              className="cb-search__clear"
              onClick={() => setSearchText('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* (Function meaning): When the parent passes a `filterOptions` array (currently only [TaskEdit.js] does this), show the searchable workflow-type dropdown between the title row and the scrollable card list; when `filterOptions` is absent or empty, this block renders nothing so [Clienttask.js] and [ProgressBar.js] are completely unaffected. */}
      {filterOptions && filterOptions.length > 0 && (
        <WorkflowFilterDropdown
          options={filterOptions}
          value={filterValue}
          onChange={onFilterChange ?? (() => {})}
          placeholder={filterPlaceholder}
        />
      )}

      {/* (Function meaning): One scrollable region below the title row so long client lists scroll inside the rail, not the whole page. */}
      <div className="client-bar__scroll">
        {/* (Function meaning): Use `displayList` (which is `activeList` filtered by the search text when search is on) so the cards update live as the user types; when search is off or the box is empty, `displayList` equals `activeList` and nothing changes. */}
        {displayList.length === 0 ? (
          <p className="client-bar__empty">
            {searchText.trim() !== '' ? 'No clients match that name.' : emptyText}
          </p>
        ) : (
          <ul className="client-bar__list">
            {displayList.map((c) => {
              const isActive = c.id === activeSelectedId;
              return (
                <li key={c.id} className="client-bar__item">
                  <button
                    type="button"
                    className={
                      isActive ? 'client-bar__card client-bar__card--active' : 'client-bar__card'
                    }
                    onClick={() => handleSelect?.(c.id)}
                    aria-pressed={isActive}
                    title={
                      isItemMode
                        ? c.label
                        : `${c.label} · AUM ${formatAum(c.aum)} · since ${formatStartDate(c.startDate)}`
                    }
                  >
                    <span className="client-bar__card-main">
                      <span className="client-bar__card-name">{c.label}</span>
                      {/* (Function meaning): In item mode show the optional detail line (like a task category); in client mode show the AUM amount and start date that [LandingPage] provides. */}
                      {isItemMode ? (
                        c.detail ? (
                          <span className="client-bar__card-row">
                            <span className="client-bar__card-date">{c.detail}</span>
                          </span>
                        ) : null
                      ) : (
                        <span className="client-bar__card-row">
                          <span className="client-bar__card-aum">{formatAum(c.aum)}</span>
                          <span className="client-bar__card-sep" aria-hidden>
                            ·
                          </span>
                          <span className="client-bar__card-date">{formatStartDate(c.startDate)}</span>
                        </span>
                      )}
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

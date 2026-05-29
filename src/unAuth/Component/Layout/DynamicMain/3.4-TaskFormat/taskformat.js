/*
 * (External references):
 * - Parents: [Clienttask.js] (`variant="list"`), [ProgressBar.js] (`variant="progress"`) pass `columns`.
 * - Styles: [taskformat.css].
 * - Layout-only skeleton: column headers and rows come from the `columns` prop each parent defines.
 */
import './taskformat.css';

// (Function meaning): How many blank rows to draw before real `tasks` arrive — six matches the reference screenshot row count.
const DEFAULT_SKELETON_ROW_COUNT = 6;

// (Function meaning): Small circular-arrow icon drawn with SVG — same shape as the refresh button in [Clientbar.js]; `currentColor` lets CSS control the icon color.
function RefreshIcon() {
  return (
    <svg
      className="task-format__refresh-icon"
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
        strokeWidth="1.9"
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
  );
}

// (Function meaning): A gray rounded bar that stands in for text or a badge — `width` picks how long the bar is; `shape` is `"bar"` for normal lines or `"pill"` for badge-shaped slots.
function PlaceholderLine({ width = 'md', shape = 'bar' }) {
  return (
    <span
      className={`task-format__line task-format__line--${width} task-format__line--${shape}`}
      aria-hidden="true"
    />
  );
}

// (Function meaning): Turn a column's `placeholder` setting into `{ width, shape }` for [PlaceholderLine] — `"pill"` becomes a pill bar; `"lg"` / `"md"` / `"sm"` become normal bars.
function placeholderProps(placeholder = 'md') {
  if (placeholder === 'pill') {
    return { width: 'pill', shape: 'pill' };
  }
  return { width: placeholder, shape: 'bar' };
}

// (Function meaning): Join every column's `width` (or `"1fr"` if missing) into one CSS grid string like `"2.4fr 1.25fr 1fr"`.
function buildGridTemplate(columns) {
  return columns.map((col) => col.width || '1fr').join(' ');
}

// (Function meaning): One table row — loops over `columns` and draws one empty placeholder cell per column; odd/even rows get alternating stripe backgrounds.
function TaskRowSkeleton({ columns, rowIndex }) {
  // (Function meaning): Even index (0, 2, 4…) uses stripe A; odd index uses stripe B so neighboring rows look slightly different.
  const stripeClass =
    rowIndex % 2 === 0
      ? ' task-format__row--stripe-a'
      : ' task-format__row--stripe-b';

  const gridStyle = { gridTemplateColumns: buildGridTemplate(columns) };

  return (
    <li
      className={`task-format__row task-format__row--skeleton${stripeClass}`}
      style={gridStyle}
      aria-hidden="true"
    >
      {columns.map((col) => {
        const alignClass =
          col.align === 'center' ? ' task-format__cell--align-center' : '';
        const line = placeholderProps(col.placeholder);

        return (
          <div
            key={col.key}
            className={`task-format__cell task-format__cell--${col.key}${alignClass}`}
          >
            <PlaceholderLine width={line.width} shape={line.shape} />
          </div>
        );
      })}
    </li>
  );
}

// (Function meaning): Shared task-table shell — parents pass `columns` (key, label, width, align, placeholder); this file only draws the grid, headers, and skeleton rows.
function TaskFormat({
  variant = 'list',
  hasClient = false,
  columns = [],
  tasks = [],
  rowCount = DEFAULT_SKELETON_ROW_COUNT,
  sectionTitle = '',
  emptyNoClientMessage = 'Pick a client to see tasks.',
}) {
  // (Function meaning): Root class is always `task-format`, plus `task-format--list` or `task-format--progress` from the `variant` prop.
  const rootClass = `task-format task-format--${variant}`;

  // (Function meaning): When no client is picked, show only the centered hint — no card or table yet.
  if (!hasClient) {
    return (
      <div className={rootClass} aria-label={sectionTitle || 'Tasks'}>
        <p className="task-format__empty task-format__empty--no-client">
          {emptyNoClientMessage}
        </p>
      </div>
    );
  }

  // (Function meaning): One skeleton row per real task when data exists; otherwise draw `rowCount` placeholder rows (default six).
  const rowsToDraw = tasks.length > 0 ? tasks.length : rowCount;
  const gridStyle = { gridTemplateColumns: buildGridTemplate(columns) };
  const colCount = columns.length;

  return (
    <div className={rootClass} aria-label={sectionTitle || 'Tasks'}>
      <div className="task-format__card">
        {sectionTitle ? (
          <header className="task-format__header">
            <div className="task-format__header-main">
              <h2 className="task-format__section-title">{sectionTitle}</h2>
              {/* (Function meaning): Refresh, Start Task, and three-dot menu are visible placeholders (no click actions yet). */}
              <div className="task-format__header-actions">
                <button type="button" className="task-format__refresh-btn" aria-label="Refresh tasks">
                  <RefreshIcon />
                </button>
                <button type="button" className="task-format__start-btn">
                  Start Task
                </button>
                <button type="button" className="task-format__menu-btn" aria-label="More options">
                  <span className="task-format__menu-dots" aria-hidden="true">⋯</span>
                </button>
              </div>
            </div>
          </header>
        ) : null}

        <div className="task-format__scroll">
          {colCount > 0 ? (
            <>
              {/* (Function meaning): Sticky header row — one label per entry in `columns`; grid widths match the skeleton rows below. */}
              <div
                className="task-format__col-header"
                style={gridStyle}
                role="row"
                aria-hidden="true"
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'center' ? ' task-format__col--align-center' : '';

                  return (
                    <div
                      key={col.key}
                      className={`task-format__col task-format__col--${col.key}${alignClass}`}
                    >
                      {col.label}
                    </div>
                  );
                })}
              </div>

              <ul className="task-format__list" role="list" aria-label="Task rows placeholder">
                {Array.from({ length: rowsToDraw }, (_, index) => (
                  <TaskRowSkeleton
                    key={`skeleton-row-${index}`}
                    columns={columns}
                    rowIndex={index}
                  />
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TaskFormat;

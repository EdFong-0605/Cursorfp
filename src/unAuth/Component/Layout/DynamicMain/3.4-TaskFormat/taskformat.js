/*
 * (External references):
 * - Parents: [Clienttask.js] (`variant="list"`), [ProgressBar.js] (`variant="progress"`).
 * - Styles: [taskformat.css].
 * - Layout-only skeleton: six-column table, header toolbar slots — no task cell content yet.
 */
import './taskformat.css';

// (Function meaning): How many blank rows to draw before real `tasks` arrive — six matches the reference screenshot row count.
const DEFAULT_SKELETON_ROW_COUNT = 6;

// (Function meaning): A gray rounded bar that stands in for text or a badge — `width` picks how long the bar is; `shape` is `"bar"` for normal lines or `"pill"` for status/priority slots.
function PlaceholderLine({ width = 'md', shape = 'bar' }) {
  return (
    <span
      className={`task-format__line task-format__line--${width} task-format__line--${shape}`}
      aria-hidden="true"
    />
  );
}

// (Function meaning): One table row with six columns; each column holds a placeholder bar; odd/even rows get different background classes for alternating stripes.
function TaskRowSkeleton({ rowIndex }) {
  // (Function meaning): Even index (0, 2, 4…) uses stripe A; odd index (1, 3, 5…) uses stripe B so neighboring rows look slightly different.
  const stripeClass =
    rowIndex % 2 === 0
      ? ' task-format__row--stripe-a'
      : ' task-format__row--stripe-b';

  return (
    <li
      className={`task-format__row task-format__row--skeleton${stripeClass}`}
      aria-hidden="true"
    >
      <div className="task-format__cell task-format__cell--task">
        <PlaceholderLine width="lg" />
      </div>
      <div className="task-format__cell task-format__cell--client">
        <PlaceholderLine width="md" />
      </div>
      <div className="task-format__cell task-format__cell--category">
        <PlaceholderLine width="sm" />
      </div>
      <div className="task-format__cell task-format__cell--status">
        <PlaceholderLine width="pill" shape="pill" />
      </div>
      <div className="task-format__cell task-format__cell--due">
        <PlaceholderLine width="md" />
      </div>
      <div className="task-format__cell task-format__cell--priority">
        <PlaceholderLine width="pill" shape="pill" />
      </div>
    </li>
  );
}

// (Function meaning): Shared task-table shell — rounded card, title + empty action slots on top, sticky six-column headers, then skeleton rows; `variant` adds a CSS hook for list vs progress styling later.
function TaskFormat({
  variant = 'list',
  hasClient = false,
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

  return (
    <div className={rootClass} aria-label={sectionTitle || 'Tasks'}>
      <div className="task-format__card">
        {sectionTitle ? (
          <header className="task-format__header">
            <div className="task-format__header-main">
              <h2 className="task-format__section-title">{sectionTitle}</h2>
              {/* (Function meaning): “Start Task” and the three-dot menu are visible placeholders (no click actions yet). */}
              <div className="task-format__header-actions">
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
          {/* (Function meaning): Sticky six-column label row — same grid as data rows; Status and Priority headings sit centered like the reference UI. */}
          <div className="task-format__col-header" role="row" aria-hidden="true">
            <div className="task-format__col task-format__col--task">Task</div>
            <div className="task-format__col task-format__col--client">Client</div>
            <div className="task-format__col task-format__col--category">Category</div>
            <div className="task-format__col task-format__col--status">Status</div>
            <div className="task-format__col task-format__col--due">Due Date</div>
            <div className="task-format__col task-format__col--priority">Priority</div>
          </div>

          <ul className="task-format__list" role="list" aria-label="Task rows placeholder">
            {Array.from({ length: rowsToDraw }, (_, index) => (
              <TaskRowSkeleton key={`skeleton-row-${index}`} rowIndex={index} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TaskFormat;

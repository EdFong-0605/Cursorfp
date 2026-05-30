/*
 * (External references):
 * - Parents: [Clienttask.js] (`variant="list"`), [ProgressBar.js] (`variant="progress"`) pass `columns`.
 * - Styles: [taskformat.css].
 * - Layout-only skeleton: column headers and rows come from the `columns` prop each parent defines.
 */
import { useEffect, useState } from 'react';
import './taskformat.css';

// (Function meaning): How many blank rows to draw before real `tasks` arrive — six matches the reference screenshot row count.
const DEFAULT_SKELETON_ROW_COUNT = 6;

// (Function meaning): How often the live "days in step" counter recalculates — 60000 milliseconds is one minute, often enough that a day rollover shows up quickly without doing pointless work every second.
const DAYS_TICK_INTERVAL_MS = 60000;

// (Function meaning): Turn a backend date string (like "2026-05-22T00:00:00+00:00") into a friendly "May 22, 2026" label; if the value is missing or unreadable we show a dash so the cell never looks broken.
function formatAssignedDate(value) {
  if (value == null || value === '') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// (Function meaning): Count how many whole days have passed between when the step started (`value`) and now (`nowMs`); if the start date is missing or unreadable we return null so the caller can show a dash, and we never return a negative number.
function computeDaysInStep(value, nowMs) {
  if (value == null || value === '') return null;
  const startMs = new Date(value).getTime();
  if (Number.isNaN(startMs)) return null;
  const elapsedMs = nowMs - startMs;
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / 86400000);
}

// (Function meaning): Turn a day count into readable words: a dash when unknown, "Today" for zero, "1 day" for one, and "N days" for the rest, so the column reads like plain English.
function formatDaysLabel(days) {
  if (days == null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

// (Function meaning): Pick a CSS modifier class from the priority word (high / medium / low) so the colored badge can match the urgency; anything unexpected falls back to the neutral default style.
function priorityClass(priority) {
  const key = String(priority || '').trim().toLowerCase();
  if (key === 'high' || key === 'medium' || key === 'low') {
    return ` task-format__pill--priority-${key}`;
  }
  return '';
}

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

// (Function meaning): Draw one cell of a real (non-skeleton) row — it looks at the column's `type` to decide what to render: the Mark complete button, a date, the live day counter, a colored pill, or plain text read from the row by the column's `field`.
// (Function meaning): `column` is the column config from the parent; `task` is the one data row; `nowMs` is the current time used by the day counter; `onComplete` runs when the button is pressed; `isBusy` disables the button while its request is in flight.
function TaskCell({ column, task, nowMs, onComplete, isBusy }) {
  // (Function meaning): The "action" column is the leftmost Mark complete button; pressing it asks the parent to complete this exact task+step, and it disables itself while the request runs so it cannot be double-clicked.
  if (column.type === 'action') {
    return (
      <button
        type="button"
        className="task-format__complete-btn"
        onClick={() => onComplete?.(task.taskId, task.stepId)}
        disabled={isBusy}
      >
        {isBusy ? 'Saving…' : 'Mark complete'}
      </button>
    );
  }

  // (Function meaning): The "date" column shows when this step became active, formatted as a friendly date.
  if (column.type === 'date') {
    return <span className="task-format__text">{formatAssignedDate(task[column.field])}</span>;
  }

  // (Function meaning): The "days" column shows how long the step has been active, recomputed from `nowMs` so it ticks upward on its own.
  if (column.type === 'days') {
    const days = computeDaysInStep(task[column.field], nowMs);
    return <span className="task-format__text task-format__text--days">{formatDaysLabel(days)}</span>;
  }

  // (Function meaning): The "pill" column shows a small rounded badge (used for Priority), colored by the value; an empty value shows a dash.
  if (column.type === 'pill') {
    const value = task[column.field];
    const text = value == null || value === '' ? '—' : String(value);
    return (
      <span className={`task-format__pill${priorityClass(value)}`}>{text}</span>
    );
  }

  // (Function meaning): Any other column ("text") just shows the row's value for that field as plain words, with a dash when it is empty.
  const value = task[column.field];
  const text = value == null || value === '' ? '—' : String(value);
  return <span className="task-format__text">{text}</span>;
}

// (Function meaning): Draw one real data row — loops over the columns and draws a real cell for each; the grid widths match the header so columns line up, and the alternating stripe matches the skeleton look.
function TaskRow({ columns, task, rowIndex, nowMs, onComplete, busyStepId }) {
  const stripeClass =
    rowIndex % 2 === 0 ? ' task-format__row--stripe-a' : ' task-format__row--stripe-b';
  const gridStyle = { gridTemplateColumns: buildGridTemplate(columns) };
  // (Function meaning): This row's button is "busy" only when the step currently saving is this row's step, so other rows stay clickable.
  const isBusy = busyStepId != null && busyStepId === task.stepId;

  return (
    <li className={`task-format__row task-format__row--data${stripeClass}`} style={gridStyle}>
      {columns.map((col) => {
        const alignClass =
          col.align === 'center' ? ' task-format__cell--align-center' : '';
        return (
          <div
            key={col.key}
            className={`task-format__cell task-format__cell--${col.key}${alignClass}`}
          >
            <TaskCell
              column={col}
              task={task}
              nowMs={nowMs}
              onComplete={onComplete}
              isBusy={isBusy}
            />
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
  loading = false,
  onCompleteStep,
  onRefresh,
  rowCount = DEFAULT_SKELETON_ROW_COUNT,
  sectionTitle = '',
  emptyNoClientMessage = 'Pick a client to see tasks.',
  emptyNoTasksMessage = 'No tasks to show.',
}) {
  // (Function meaning): "Live list" mode means the parent gave us a real complete-handler ([Clienttask.js] does, [ProgressBar.js] does not); only in this mode do we draw real rows instead of skeletons, which keeps the progress pane unchanged.
  const isLiveList = typeof onCompleteStep === 'function';

  // (Function meaning): `nowMs` is the current time in milliseconds that the days-in-step counter reads; we keep it in state so updating it re-draws the rows.
  const [nowMs, setNowMs] = useState(() => Date.now());

  // (Function meaning): Which step is currently being saved, so its button can show "Saving…" and disable itself; null means no row is saving.
  const [busyStepId, setBusyStepId] = useState(null);

  // (Function meaning): Once per minute, refresh `nowMs` so the live day counter keeps up with the clock; only run this timer in live-list mode (the skeleton pane has no counter), and always clear the timer when the component goes away so it does not leak.
  useEffect(() => {
    if (!isLiveList) return undefined;
    const timerId = setInterval(() => setNowMs(Date.now()), DAYS_TICK_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, [isLiveList]);

  // (Function meaning): Wrap the parent's complete handler so this file can flip the busy flag on before the request and off after, giving the button its "Saving…" state without the parent having to manage it.
  const handleComplete = async (taskId, stepId) => {
    if (busyStepId != null) return;
    setBusyStepId(stepId);
    try {
      await onCompleteStep(taskId, stepId);
    } finally {
      setBusyStepId(null);
    }
  };
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
              {/* (Function meaning): In live-list mode the refresh button now re-fetches the user's tasks via `onRefresh`; Start Task and the three-dot menu stay visible placeholders. */}
              {/* (Function meaning): Refresh, Start Task, and three-dot menu are visible placeholders (no click actions yet). */}
              <div className="task-format__header-actions">
                <button
                  type="button"
                  className="task-format__refresh-btn"
                  aria-label="Refresh tasks"
                  onClick={onRefresh ? () => onRefresh() : undefined}
                >
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

              {/* (Function meaning): In live-list mode: while loading show shimmering placeholder rows, then show real rows when tasks exist, or a plain "no tasks" message when this client has none for the user; in skeleton mode (the progress pane) keep drawing placeholder rows as before. */}
              {isLiveList ? (
                loading ? (
                  <ul
                    className="task-format__list task-format__list--loading"
                    role="list"
                    aria-label="Loading tasks"
                    aria-busy="true"
                  >
                    {Array.from({ length: rowCount }, (_, index) => (
                      <TaskRowSkeleton
                        key={`loading-row-${index}`}
                        columns={columns}
                        rowIndex={index}
                      />
                    ))}
                  </ul>
                ) : tasks.length > 0 ? (
                  <ul className="task-format__list" role="list" aria-label="Task rows">
                    {tasks.map((task, index) => (
                      <TaskRow
                        key={`${task.taskId}-${task.stepId}`}
                        columns={columns}
                        task={task}
                        rowIndex={index}
                        nowMs={nowMs}
                        onComplete={handleComplete}
                        busyStepId={busyStepId}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="task-format__empty task-format__empty--no-tasks">
                    {emptyNoTasksMessage}
                  </p>
                )
              ) : (
                <ul className="task-format__list" role="list" aria-label="Task rows placeholder">
                  {Array.from({ length: rowsToDraw }, (_, index) => (
                    <TaskRowSkeleton
                      key={`skeleton-row-${index}`}
                      columns={columns}
                      rowIndex={index}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default TaskFormat;

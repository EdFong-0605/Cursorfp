/*
 * (External references):
 * - Parents: [Clienttask.js], [ProgressBar.js] pass `clientLabel` from the selected client row; [TaskEdit.js] passes the selected task type name the same way.
 * - Theme: colors match [../3.1-ClientBar/Clientbar.css]. Styles: [clientnametop.css].
 */
import './OutputAreaTop.css';

// (Function meaning): This bar sits at the top of the white main column (above tasks/progress content); the parent already picked which client is active and passes that person's display name as `clientLabel`.
// (Function meaning): `clientLabel` is the display name string for whoever is selected; if it is missing we show a short muted hint so the dark bar still keeps the same height.
function ClientNameTop({ clientLabel = null }) {
  const displayText = clientLabel && String(clientLabel).trim() ? String(clientLabel).trim() : null;

  return (
    <header className="client-name-top" aria-label="Selected client">
      <div className="client-name-top__inner">
        {displayText ? (
          <span className="client-name-top__label">{displayText}</span>
        ) : (
          <span className="client-name-top__label client-name-top__label--empty">No client selected</span>
        )}
      </div>
    </header>
  );
}

export default ClientNameTop;

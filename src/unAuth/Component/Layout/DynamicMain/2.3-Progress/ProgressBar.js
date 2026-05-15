/*
 * (External references):
 * - Parent: [MainLanding.js] passes `clients`, `selectedClientId`, `onSelectClient`.
 * - Client strip: [../3.1-ClientBar/Clientbar.js]. Styles: [ProgressBar.css].
 */
import Clientbar from '../3.1-ClientBar/Clientbar';
import './ProgressBar.css';

// (Function meaning): Second band under tasks: same client picker on the left, progress placeholder on the right.
function ProgressBar({ clients = [], selectedClientId, onSelectClient }) {
  const selected = clients.find((c) => c.id === selectedClientId);

  return (
    <section className="progress-bar-panel" aria-label="Client progress">
      <Clientbar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={onSelectClient}
      />
      <div className="progress-bar-panel__body">
        {selected ? (
          <div>
            <p className="progress-bar-panel__title">Progress for {selected.label}</p>
            <p className="progress-bar-panel__meta">Progress details will go here.</p>
          </div>
        ) : (
          <p className="progress-bar-panel__meta">Pick a client to see progress.</p>
        )}
      </div>
    </section>
  );
}

export default ProgressBar;

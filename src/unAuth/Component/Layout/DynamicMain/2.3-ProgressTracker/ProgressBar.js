/*
 * (External references):
 * - Parent: [MainLanding.js] passes `clients`, `selectedClientId`, `onSelectClient`.
 * - Client strip: [../3.1-ClientBar/Clientbar.js]. Styles: [ProgressBar.css].
 */
import Clientbar from '../3.1-ClientBar/Clientbar';
import ClientNameTop from '../3.3-Clientnametop/clientnametop';
import TaskFormat from '../3.4-TaskFormat/taskformat';
import './ProgressBar.css';

// (Function meaning): Second band under tasks: same client picker on the left, progress placeholder on the right; `onRefreshClients` lets the left bar ask for fresh data.
function ProgressBar({ clients = [], selectedClientId, onSelectClient, onRefreshClients }) {
  const selected = clients.find((c) => c.id === selectedClientId);

  return (
    <section className="progress-bar-panel" aria-label="Task Progress">
      <Clientbar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={onSelectClient}
        onRefresh={onRefreshClients}
        pageKey="progress"
      />
      <div className="progress-bar-panel__body">
        <ClientNameTop clientLabel={selected?.label ?? null} />
        <div className="progress-bar-panel__content">
          <TaskFormat
            variant="progress"
            hasClient={Boolean(selected)}
            sectionTitle="Progress Updates"
            emptyNoClientMessage="Pick a client to see progress."
          />
        </div>
      </div>
    </section>
  );
}

export default ProgressBar;

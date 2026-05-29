/*
 * (External references):
 * - Parent: [MainLanding.js] passes `clients`, `selectedClientId`, `onSelectClient`.
 * - Client strip: [../3.1-ClientBar/Clientbar.js]. Styles: [ProgressBar.css].
 */
import Clientbar from '../3.1-ClientBar/Clientbar';
import ClientNameTop from '../3.3-Clientnametop/clientnametop';
import TaskFormat from '../3.4-TaskFormat/taskformat';
import './ProgressBar.css';

// (Function meaning): Column headers and widths for the progress table — different from [Clienttask.js] TASK_COLUMNS; edit here only when the Progress pane changes.
const PROGRESS_COLUMNS = [
  { key: 'task', label: 'Task', width: '2.2fr', placeholder: 'lg' },
  { key: 'owner', label: 'Assigned To', width: '1.2fr', placeholder: 'md' },
  { key: 'percent', label: 'Progress', width: '1fr', align: 'center', placeholder: 'pill' },
  { key: 'updated', label: 'Last Updated', width: '1.2fr', placeholder: 'md' },
];

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
            columns={PROGRESS_COLUMNS}
            sectionTitle="Progress Updates"
            emptyNoClientMessage="Pick a client to see progress."
          />
        </div>
      </div>
    </section>
  );
}

export default ProgressBar;

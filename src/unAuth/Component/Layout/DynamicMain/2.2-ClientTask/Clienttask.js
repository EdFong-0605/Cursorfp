/*
 * (External references):
 * - Data path (browser): [LandingPage.js] calls [Component/API/clientfetch.js] `fetchDummyClientsFromMainPy` → Cloud Function `on_request_example` in [functions/main.py] (`{ "clients": [ ... ] }`). Same `clients` array is passed into [MainLanding.js], then here, then [../3.1-ClientBar/Clientbar.js] maps every row.
 * - Parent: [MainLanding.js] passes `clients`, `selectedClientId`, `onSelectClient` so the highlighted client matches progress/tasks when you switch panes.
 * - Styles: [clienttask.css].
 */
import Clientbar from '../3.1-ClientBar/Clientbar';
import ClientNameTop from '../3.3-Clientnametop/clientnametop';
import TaskFormat from '../3.4-TaskFormat/taskformat';
import './clienttask.css';

// (Function meaning): Column headers and widths for the task list table — edit here when the Tasks pane needs different labels or columns; [taskformat.js] reads this array and draws the grid.
const TASK_COLUMNS = [
  { key: 'task', label: 'Task', width: '2.4fr', placeholder: 'lg' },
  { key: 'client', label: 'Client', width: '1.25fr', placeholder: 'md' },
  { key: 'category', label: 'Category', width: '1fr', placeholder: 'sm' },
  { key: 'status', label: 'Status', width: '1.05fr', align: 'center', placeholder: 'pill' },
  { key: 'due', label: 'Due Date', width: '1.05fr', placeholder: 'md' },
  { key: 'priority', label: 'Priority', width: '0.85fr', align: 'center', placeholder: 'pill' },
];

// (Function meaning): One horizontal band: left = scrollable client cards; right = placeholder until real task UI exists; `onRefreshClients` lets the left bar ask for the newest client list.
function Clienttask({ clients = [], selectedClientId, onSelectClient, onRefreshClients }) {
  const selected = clients.find((c) => c.id === selectedClientId);

  return (
    <section className="client-task-panel" aria-label="Client Tasks">
      <Clientbar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={onSelectClient}
        onRefresh={onRefreshClients}
        pageKey="tasks"
      />
      <div className="client-task-panel__body">
        <ClientNameTop clientLabel={selected?.label ?? null} />
        <div className="client-task-panel__content">
          <TaskFormat
            variant="list"
            hasClient={Boolean(selected)}
            columns={TASK_COLUMNS}
            sectionTitle="Tasks"
            emptyNoClientMessage="Pick a client to see tasks."
          />
        </div>
      </div>
    </section>
  );
}

export default Clienttask;

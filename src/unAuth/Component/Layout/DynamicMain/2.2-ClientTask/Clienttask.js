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
            sectionTitle="Tasks"
            emptyNoClientMessage="Pick a client to see tasks."
          />
        </div>
      </div>
    </section>
  );
}

export default Clienttask;

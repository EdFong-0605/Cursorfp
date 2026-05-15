/*
 * (External references):
 * - Data path (browser): [LandingPage.js] calls [Component/API/clientfetch.js] `fetchDummyClientsFromMainPy` → Cloud Function `on_request_example` in [functions/main.py] (`{ "clients": [ ... ] }`). Same `clients` array is passed into [MainLanding.js], then here, then [../3.1-ClientBar/Clientbar.js] maps every row.
 * - Parent: [MainLanding.js] passes `clients`, `selectedClientId`, `onSelectClient` so the highlighted client matches progress/tasks when you switch panes.
 * - Styles: [clienttask.css].
 */
import Clientbar from '../3.1-ClientBar/Clientbar';
import './clienttask.css';

// (Function meaning): One horizontal band: left = scrollable client cards; right = placeholder until real task UI exists.
function Clienttask({ clients = [], selectedClientId, onSelectClient }) {
  const selected = clients.find((c) => c.id === selectedClientId);

  return (
    <section className="client-task-panel" aria-label="Client tasks">
      <Clientbar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelectClient={onSelectClient}
      />
      <div className="client-task-panel__body">
        {selected ? (
          <div>
            <p className="client-task-panel__title">Tasks for {selected.label}</p>
            <p className="client-task-panel__meta">Task list will go here.</p>
          </div>
        ) : (
          <p className="client-task-panel__meta">Pick a client to see tasks.</p>
        )}
      </div>
    </section>
  );
}

export default Clienttask;

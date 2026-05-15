/**
 * Unauthenticated landing layout: left sidebar (NavBar) + main column.
 * landing-page__content stacks search, primary main area, and footer.
 *
 * Client list for the whole landing shell: fetched once here, then passed down
 * so SearchBar (and any sibling) does not each run its own network call.
 */
import { useCallback, useEffect, useState } from 'react';
import './LandingPage.css';
import NavBar from '../Component/Layout/NavBar/1.1 NavBar/NavBar';
import TopRibbon from '../Component/Layout/TopRibbon/1.1 TopRibbon/TopRibbon';
import MainLanding from '../Component/Layout/DynamicMain/1.1-Mainlanding/MainLanding';
import Brain from '../Component/Layout/DynamicMain/2.1-Brain/Brain';
import TaskEdit from '../Component/Layout/DynamicMain/2.4-TaskEdit/TaskEdit';
import Footer from '../Component/Layout/Footer/1.1 Footer/Footer';
import { fetchDummyClientsFromMainPy } from '../Component/API/clientfetch';

function LandingPage() {
  // Start as [] so children always receive an array: empty means "still loading or none yet".
  const [clients, setClients] = useState([]);
  // (Function meaning): `false` shows progress in [MainLanding.js]; `true` shows [Clienttask.js]. The person icon only turns this on — it does nothing if you are already on client tasks (see `onUserIconClick`).
  const [clientTaskOpen, setClientTaskOpen] = useState(false);
  // (Function meaning): When `true`, the middle column shows [Brain.js] instead of [MainLanding.js]. Starts `true` so the first screen is the brain page; the brain icon in [NavBar.js] only selects this view again (it does not turn it off).
  const [brainViewOpen, setBrainViewOpen] = useState(true);
  // (Function meaning): When `true`, the middle column shows [TaskEdit.js]. Clipboard sets this on and clears brain + client-task (same style as progress: no “tap again to close” on that icon).
  const [taskEditViewOpen, setTaskEditViewOpen] = useState(false);

  // (Function meaning): `fetchDummyClientsFromMainPy` runs in the browser and calls `on_request_example` in [functions/main.py]; the JSON `clients` array becomes `id` / `label` rows for [MainLanding.js] → [Clienttask.js] → [Clientbar.js].
  const pullClientsFromBackend = useCallback(async () => {
    try {
      const rows = await fetchDummyClientsFromMainPy();
      setClients(rows);
    } catch (e) {
      console.error('[LandingPage] fetch clients', e);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    pullClientsFromBackend();
  }, [pullClientsFromBackend]);

  // (Function meaning): When the user opens the client-task pane (`clientTaskOpen` becomes `true`), ask the backend again so the strip shows the full current list, not a stale empty array from before the emulator answered.
  useEffect(() => {
    if (!clientTaskOpen) return;
    pullClientsFromBackend();
  }, [clientTaskOpen, pullClientsFromBackend]);

  return (
    <div className="landing-page">
      {/* (External references): `onUserIconClick` / `userTaskPanelOpen`, `onProgressIconClick` / `progressPanelOpen`, brain + clipboard props are read in [NavBar.js]; `showClientTask` is read in [MainLanding.js] (false = [ProgressBar.js], true = [Clienttask.js]). Brain / clipboard swap the main pane to [Brain.js] or [TaskEdit.js]. */}
      <NavBar
        clients={clients}
        onUserIconClick={() => {
          setBrainViewOpen(false);
          setTaskEditViewOpen(false);
          // (Function meaning): If `clientTaskOpen` is already `true`, keep it `true` so another tap on the person icon does not leave the task page.
          setClientTaskOpen((wasOpen) => (wasOpen ? wasOpen : true));
        }}
        userTaskPanelOpen={clientTaskOpen}
        onBrainIconClick={() => {
          setBrainViewOpen(true);
          setClientTaskOpen(false);
          setTaskEditViewOpen(false);
        }}
        brainPanelOpen={brainViewOpen}
        onProgressIconClick={() => {
          setBrainViewOpen(false);
          setClientTaskOpen(false);
          setTaskEditViewOpen(false);
        }}
        progressPanelOpen={!brainViewOpen && !clientTaskOpen && !taskEditViewOpen}
        onClipboardIconClick={() => {
          setBrainViewOpen(false);
          setClientTaskOpen(false);
          setTaskEditViewOpen(true);
        }}
        clipboardPanelOpen={taskEditViewOpen}
      />
      <div className="landing-page__content">
        <TopRibbon clients={clients} />
        {brainViewOpen ? (
          <Brain />
        ) : taskEditViewOpen ? (
          <TaskEdit />
        ) : (
          <MainLanding clients={clients} showClientTask={clientTaskOpen} />
        )}
        <Footer />
      </div>
    </div>
  );
}

export default LandingPage;

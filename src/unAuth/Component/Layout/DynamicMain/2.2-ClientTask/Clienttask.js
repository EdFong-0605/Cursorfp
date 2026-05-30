/*
 * (External references):
 * - Data path (browser): [LandingPage.js] calls [Component/API/clientfetch.js] `fetchDummyClientsFromMainPy` → Cloud Function `on_request_example` in [functions/main.py] (`{ "clients": [ ... ] }`). Same `clients` array is passed into [MainLanding.js], then here, then [../3.1-ClientBar/Clientbar.js] maps every row.
 * - Parent: [MainLanding.js] passes `clients`, `selectedClientId`, `onSelectClient` so the highlighted client matches progress/tasks when you switch panes.
 * - Styles: [clienttask.css].
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Clientbar from '../3.1-ClientBar/Clientbar';
import ClientNameTop from '../3.3-Clientnametop/clientnametop';
import TaskFormat from '../3.4-TaskFormat/taskformat';
import { useAuth } from '../../../../../Auth/Events/AuthContext';
import { fetchMyClientTasks, completeTaskStep } from '../../../../Component/API/taskfetch';
import './clienttask.css';

// (Function meaning): Column headers and widths for the task list table — edit here when the Tasks pane needs different labels or columns; [taskformat.js] reads this array and draws the grid. `field` says which property of a task row to show, and `type` says how to draw it (`action` = the Mark complete button, `text` = plain words, `date` = a friendly date, `days` = a live day counter, `pill` = a small rounded badge).
const TASK_COLUMNS = [
  { key: 'complete', label: '', width: '1.1fr', align: 'center', placeholder: 'pill', type: 'action' },
  { key: 'task', label: 'Task', width: '2.4fr', placeholder: 'lg', type: 'text', field: 'title' },
  { key: 'assigned', label: 'Assigned Date', width: '1.2fr', placeholder: 'md', type: 'date', field: 'assignedDate' },
  { key: 'daysInStep', label: 'Days In Step', width: '1fr', align: 'center', placeholder: 'sm', type: 'days', field: 'assignedDate' },
  { key: 'priority', label: 'Priority', width: '0.9fr', align: 'center', placeholder: 'pill', type: 'pill', field: 'priority' },
];

// (Function meaning): One horizontal band: left = scrollable client cards; right = the real task table for the selected client; `onRefreshClients` lets the left bar ask for the newest client list.
function Clienttask({ clients = [], selectedClientId, onSelectClient, onRefreshClients }) {
  // (Function meaning): Find the full client row whose id matches the one the parent says is selected, so we can show its name and load its tasks.
  const selected = clients.find((c) => c.id === selectedClientId);

  // (Function meaning): Read the signed-in user from the shared auth box; we need its login token so the backend can prove which steps belong to this person.
  // (External references): `useAuth` comes from [src/Auth/Events/AuthContext.js], the same hook [LandingPage.js] uses.
  const { user } = useAuth();

  // (Function meaning): `tasks` holds the rows the backend returned for the selected client; `setTasks` is React's way to swap that list when new data arrives. We start empty.
  const [tasks, setTasks] = useState([]);

  // (Function meaning): `loading` is true only while we are waiting for the backend to answer; the table reads it to show the shimmering placeholder rows instead of the real list. We start false because nothing is loading yet.
  const [loading, setLoading] = useState(false);

  // (Function meaning): A box that remembers the "cancel handle" (AbortController) of the request that is currently in flight; we keep it in a ref so changing it does not re-render the component, and so any new request can reach in and cancel the previous one. `null` means no request is running.
  const abortRef = useRef(null);

  // (Function meaning): Ask the backend for this user's current steps on the selected client; if there is no user or no client we clear the list instead of calling the network, and on any failure we fall back to an empty list so the table never crashes. `showLoading` lets the caller hide the shimmer for quiet background refreshes (like right after marking a step complete) so the table does not flash.
  // (External references): `fetchMyClientTasks` is defined in [src/unAuth/Component/API/taskfetch.js] and calls `get_my_client_tasks` in [functions/main.py].
  const loadTasks = useCallback(
    async (showLoading = true) => {
      if (!user || !selectedClientId) {
        setTasks([]);
        return;
      }
      // (Function meaning): If a previous request is still running, cancel it first so we never have two task loads racing each other; then make a fresh AbortController for this request and remember it as the current one.
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      // (Function meaning): Turn the shimmer on before the request (unless this is a quiet refresh), then always turn it back off in `finally` whether the request succeeds or fails.
      if (showLoading) {
        setLoading(true);
      }
      try {
        const rows = await fetchMyClientTasks(user, selectedClientId, controller.signal);
        setTasks(rows);
      } catch (e) {
        // (Function meaning): An AbortError means we cancelled this request on purpose (a newer one took over), so we quietly stop here and do NOT wipe the list — letting it fall through would clobber the newer request's data.
        if (e?.name === 'AbortError') {
          return;
        }
        console.error('[Clienttask] load tasks', e);
        setTasks([]);
      } finally {
        // (Function meaning): Only the newest request is allowed to turn the shimmer off and clear the ref; if this request was already replaced by a newer one, leave everything for that newer request to manage so the shimmer stays on until it finishes.
        if (abortRef.current === controller) {
          if (showLoading) {
            setLoading(false);
          }
          abortRef.current = null;
        }
      }
    },
    [user, selectedClientId],
  );

  // (Function meaning): Run `loadTasks` again whenever the function identity changes — that happens when the signed-in user or the selected client changes — so the table always matches the client on screen. The cleanup runs right before the next run (or when this pane is removed) and aborts whatever request is still in flight, which is what cancels the old client's load when you pick a new client mid-fetch.
  useEffect(() => {
    loadTasks();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [loadTasks]);

  // (Function meaning): When the user presses Mark complete on a row, tell the backend to complete that step, then reload the list so the finished step disappears and the next step (now this user's, if assigned to them) shows up; if the server refuses we log it and still reload to stay truthful.
  // (External references): `completeTaskStep` is in [taskfetch.js] and calls `complete_task_step` in [functions/main.py].
  const handleCompleteStep = useCallback(
    async (taskId, stepId) => {
      if (!user) return;
      try {
        await completeTaskStep(user, taskId, stepId);
      } catch (e) {
        console.error('[Clienttask] complete step', e);
      } finally {
        // (Function meaning): Reload quietly (no shimmer) so the finished step disappears smoothly without the whole table flashing back to placeholder bars.
        await loadTasks(false);
      }
    },
    [user, loadTasks],
  );

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
            tasks={tasks}
            loading={loading}
            onCompleteStep={handleCompleteStep}
            onRefresh={loadTasks}
            sectionTitle="Tasks"
            emptyNoClientMessage="Pick a client to see tasks."
            emptyNoTasksMessage="No tasks assigned to you for this client."
          />
        </div>
      </div>
    </section>
  );
}

export default Clienttask;

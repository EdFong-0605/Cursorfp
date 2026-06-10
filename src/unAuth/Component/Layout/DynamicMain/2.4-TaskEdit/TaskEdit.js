/*
 * (External references):
 * - Styles: [TaskEdit.css]. For a similar "single middle column page" pattern, see [../2.1-Brain/Brain.js].
 * - Sidebar: [../3.1-DynamicSideBar/DynamicSideBar.js] — same component used by [Clienttask.js] and [ProgressBar.js] but passed `items` instead of `clients` so it shows task types rather than clients.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import DynamicSideBar from '../3.1-DynamicSideBar/DynamicSideBar';
// (Function meaning): Bring in the dark name strip from [../3.3-OutputAreaTop/OutputAreaTop.js] so the top of the white body shows whichever task type is currently selected, the same way client pages show the selected client name.
import ClientNameTop from '../3.3-OutputAreaTop/OutputAreaTop';
// (Function meaning): Bring in the `InputArea` typing box from the [1.1 InputArea] folder so we can place it at the bottom of the white body area below.
import InputArea from './1.1 InputArea/Inputarea';
// (Function meaning): Bring in the `OutputArea` steps display from the [1.2 OuputArea] folder so the parent can show template step cards in the upper section of the right-side body.
import OutputArea from './1.2 OuputArea/OutputArea';
// (Function meaning): Bring in the `ChatArea` dialogue display from the [1.3 ChatArea] folder so the parent can show chat bubbles in the lower section of the right-side body, below the step cards.
import ChatArea from './1.3 ChatArea/ChatArea';
// (Function meaning): Pull in `fetchTaskTemplate` so this component can ask the backend for step cards whenever the user clicks a different task type in the sidebar.
import { fetchTaskTemplate } from '../../../API/taskTypeFetch';
import './TaskEdit.css';

// (Function meaning): `TaskEdit` is the task-type editor page: a sidebar on the left lists all the firm's task types; the right side shows template steps and chat. `taskTypes` and `workflowTypes` are fetched by [LandingPage.js] at app startup and passed in as props — `onRefreshTaskTypes` is the callback [LandingPage.js] provides so the sidebar refresh button can re-fetch the list from MongoDB on demand, the same way `onRefreshClients` works on the client pages.
// (External references): Props are populated by [LandingPage.js] using `fetchFirmTaskTypes` from [taskTypeFetch.js].
function TaskEdit({ taskTypes = [], workflowTypes = [], onRefreshTaskTypes }) {
  // (Function meaning): `selectedTypeId` holds the `id` of whichever task-type card the user clicked most recently; starts as `null` (nothing selected yet) and is set to the first item as soon as `taskTypes` arrives from the parent.
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  // (Function meaning): `selectedWorkflowType` holds the `id` of the workflow category the user chose in the dropdown; an empty string means "no filter — show all task types".
  const [selectedWorkflowType, setSelectedWorkflowType] = useState('');

  // (Function meaning): `inputText` holds the exact text currently inside the bottom typing box; it lives here in the parent so the parent controls the chatbox instead of the input component controlling itself.
  const [inputText, setInputText] = useState('');

  // (Function meaning): `chatMessagesByTaskId` stores chat output separately for each task type; the object key is the selected task type id, and the value is that task type's own list of chat bubbles.
  const [chatMessagesByTaskId, setChatMessagesByTaskId] = useState({});

  // (Function meaning): Once the parent passes a non-empty `taskTypes` array and we still have no selection, automatically pick the first item so the right side is never blank on arrival.
  useEffect(() => {
    if (taskTypes.length > 0 && selectedTypeId === null) {
      setSelectedTypeId(taskTypes[0].id);
    }
  }, [taskTypes, selectedTypeId]);

  // (Function meaning): `visibleTaskTypes` is the slice of task types the sidebar actually shows — when a workflow filter is active, keep only types whose `category` value matches the selected id; when the filter is cleared (empty string), pass the full list through unchanged.
  const visibleTaskTypes =
    selectedWorkflowType === ''
      ? taskTypes
      : taskTypes.filter((t) => t.category === selectedWorkflowType);

  // (Function meaning): `safeSelectedId` protects against the selected card disappearing when a filter is applied — if the current selection is still in the visible list, keep it; otherwise fall back to the first visible item so the right side is never blank; if the filtered list is empty, set it to null.
  const safeSelectedId = visibleTaskTypes.find((t) => t.id === selectedTypeId)
    ? selectedTypeId
    : (visibleTaskTypes[0]?.id ?? null);

  // (Function meaning): Find the full task-type object whose `id` matches `safeSelectedId` so we can show its name, detail, and embedded `steps` on the right side; if nothing is selected this is `undefined`.
  const selected = taskTypes.find((t) => t.id === safeSelectedId);

  // (Function meaning): `templateSteps` holds the step cards fetched from MongoDB for the currently selected task type; starts empty and is replaced every time the user picks a different type.
  const [templateSteps, setTemplateSteps] = useState([]);

  // (Function meaning): `templateStepsLoading` is true only while the backend network request for step cards is still travelling — [OutputArea.js] reads this flag to swap real cards for shimmering grey placeholders so the area never looks blank.
  const [templateStepsLoading, setTemplateStepsLoading] = useState(false);

  // (Function meaning): `templateAbortRef` stores the AbortController of the currently running fetch; keeping it in a ref means updating it never causes a re-render, and any new request can reach in and cancel the previous one. `null` means nothing is in flight.
  const templateAbortRef = useRef(null);

  // (Function meaning): `loadTemplateSteps` is the function that fires whenever the user picks a task type — it follows the exact same AbortController pattern as `loadTasks` in [Clienttask.js]: cancel the old request, create a new controller, turn the shimmer on, call the backend, and then turn the shimmer off only when THIS request is still the newest one.
  // (External references): Calls `fetchTaskTemplate` from [src/unAuth/Component/API/taskTypeFetch.js], which reaches `get_task_template` in [functions/main.py]; the result flows into [OutputArea.js] via props.
  const loadTemplateSteps = useCallback(async (label) => {
    if (!label) {
      setTemplateSteps([]);
      setTemplateStepsLoading(false);
      return;
    }
    // (Function meaning): If an older request is still in flight, abort it right now so we never have two fetches racing to update the same state at the same time.
    if (templateAbortRef.current) {
      templateAbortRef.current.abort();
    }
    // (Function meaning): Create a brand-new controller for this request and remember it; any future request will be able to abort this one by calling `templateAbortRef.current.abort()`.
    const controller = new AbortController();
    templateAbortRef.current = controller;

    setTemplateStepsLoading(true);
    try {
      const steps = await fetchTaskTemplate(label, controller.signal);
      setTemplateSteps(steps);
    } catch (e) {
      // (Function meaning): An AbortError is not a real error — it just means we cancelled this request on purpose (user switched task types or the component unmounted), so bail silently and do NOT overwrite the newer request's data.
      if (e?.name === 'AbortError') return;
      console.error('[TaskEdit] loadTemplateSteps error', e);
      setTemplateSteps([]);
    } finally {
      // (Function meaning): Only the newest request gets to turn the shimmer off; if `templateAbortRef.current` has already been replaced by a newer controller, leave `templateStepsLoading` as-is so the newer request can manage it.
      if (templateAbortRef.current === controller) {
        setTemplateStepsLoading(false);
        templateAbortRef.current = null;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // (Function meaning): Run `loadTemplateSteps` whenever the selected task type changes, and abort any in-flight request in the cleanup so switching tasks quickly never causes stale step cards to flash on screen.
  useEffect(() => {
    loadTemplateSteps(selected?.label ?? null);
    return () => {
      // (Function meaning): This cleanup runs before the next effect fires (i.e., before the next task type loads) AND when the component is removed from the page — both cases need the current request cancelled.
      if (templateAbortRef.current) {
        templateAbortRef.current.abort();
      }
    };
  }, [safeSelectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Function meaning): `chatMessages` is the list of chat bubbles shown in the output area for the currently selected task type only; if no task type is selected yet, or this task type has no messages yet, use an empty list.
  const chatMessages = safeSelectedId ? (chatMessagesByTaskId[safeSelectedId] ?? []) : [];

  // (Function meaning): `handleSendChatMessage` receives the typed text from [Inputarea.js], adds it as a user chat bubble, adds a temporary output reply below it, then clears `inputText` so the input box becomes empty again.
  const handleSendChatMessage = (text) => {
    // (Function meaning): If there is no selected task type, stop here because there is no task id to save this chat output under.
    if (!safeSelectedId) return;
    // (Function meaning): `timestamp` creates a simple unique base value for this send action, so the user bubble and placeholder output bubble each get a stable `id` for React's list rendering.
    const timestamp = Date.now();
    // (Function meaning): `selectedLabel` uses the selected task type's name when one exists; if nothing is selected, it falls back to the plain words "this task type".
    const selectedLabel = selected?.label ?? 'this task type';

    // (Function meaning): `newMessages` is the pair of bubbles created by this send action: first the user's text, then a temporary placeholder output reply.
    const newMessages = [
      {
        id: `user-${timestamp}`,
        role: 'user',
        text,
      },
      {
        id: `output-${timestamp}`,
        role: 'output',
        text: `Placeholder output for ${selectedLabel}: ${text}`,
      },
    ];

    // (Function meaning): `setChatMessages((currentMessages) => [...])` means "take the messages we already have, then return a new array with two extra bubbles at the end" — one from the user and one placeholder output reply.
    // (Function meaning): `setChatMessagesByTaskId((currentMessagesByTaskId) => ({ ... }))` keeps every other task type's chat untouched, then replaces only the currently selected task type's list with its old messages plus `newMessages`.
    setChatMessagesByTaskId((currentMessagesByTaskId) => ({
      ...currentMessagesByTaskId,
      [safeSelectedId]: [
        ...(currentMessagesByTaskId[safeSelectedId] ?? []),
        ...newMessages,
      ],
    }));
    // (Function meaning): Clear the parent-owned input text after sending, which also clears what the user sees in the bottom input box.
    setInputText('');
  };

  return (
    // (Function meaning): `role="main"` tells assistive tech this is the main page content; `task-edit-page` is the class name the stylesheet in [TaskEdit.css] can target for layout and spacing.
    <main className="task-edit-page" role="main">
      {/* (Function meaning): The left sidebar — same DynamicSideBar component used by Clienttask and ProgressBar, but given `items` (task types) instead of `clients`, and `pageKey="taskedit"` so the page label at the top reads "Task Edit"; the four filter props (`filterOptions`, `filterValue`, `onFilterChange`, `filterPlaceholder`) are new and only used on this page — other pages that use DynamicSideBar are not affected because those props are optional. */}
      {/* (Function meaning): `onRefresh` is wired to `onRefreshTaskTypes` from [LandingPage.js] so the refresh button in the sidebar header re-fetches task types and categories from MongoDB on demand, exactly the same pattern as the client list refresh in [Clienttask.js] and [ProgressBar.js]. */}
      <DynamicSideBar
        items={visibleTaskTypes}
        selectedItemId={safeSelectedId}
        onSelectItem={setSelectedTypeId}
        onRefresh={onRefreshTaskTypes}
        pageKey="taskedit"
        filterOptions={workflowTypes}
        filterValue={selectedWorkflowType}
        onFilterChange={setSelectedWorkflowType}
        filterPlaceholder="Search workflow types"
      />
      {/* (Function meaning): The right-side body grows to fill all the remaining width next to the sidebar; it will hold the real task-type editor fields once they are built. */}
      {/* (Function meaning): The body is now a vertical column — the content region sits on top and the InputArea typing box is pinned to the very bottom of this white area. */}
      <div className="task-edit-page__body">
        {/* (Function meaning): `ClientNameTop` is the dark bar pinned to the top of the white body; we pass `selected?.label` so it shows the name of the task type the user picked in the sidebar, or the muted empty hint when nothing is selected yet. */}
        <ClientNameTop clientLabel={selected?.label ?? null} />
        {/* (Function meaning): `task-edit-page__content` is the upper region that grows to fill all the leftover height above the input bar; it is now a vertical column so `OutputArea` (step cards) sits on top and `ChatArea` (chat bubbles) sits below it. */}
        <div className="task-edit-page__content task-edit-page__content--split">
          {/* (Function meaning): `OutputArea` shows the template step cards fetched from MongoDB for the selected task type; it no longer handles chat messages — those live in `ChatArea` below. */}
          {/* (Function meaning): `loading` is passed down so OutputArea can show shimmering ghost cards while the step fetch is in flight instead of a blank area. */}
          <OutputArea templateSteps={templateSteps} loading={templateStepsLoading} />
          {/* (Function meaning): `ChatArea` shows the chat dialogue the user sends through the input bar below; it is a separate scrollable region beneath the step cards. */}
          <ChatArea messages={chatMessages} />
        </div>
        {/* (Function meaning): The typing box, fixed to the bottom edge of the white area; `value` is the parent-owned text, `onChange` updates that parent text on each keystroke, and `onSend` adds the chat bubbles above. */}
        <InputArea
          value={inputText}
          onChange={setInputText}
          onSend={handleSendChatMessage}
        />
      </div>
    </main>
  );
}

export default TaskEdit;

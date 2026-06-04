/*
 * (External references):
 * - Styles: [TaskEdit.css]. For a similar "single middle column page" pattern, see [../2.1-Brain/Brain.js].
 * - Sidebar: [../3.1-DynamicSideBar/DynamicSideBar.js] — same component used by [Clienttask.js] and [ProgressBar.js] but passed `items` instead of `clients` so it shows task types rather than clients.
 */
import { useState, useEffect } from 'react';
import DynamicSideBar from '../3.1-DynamicSideBar/DynamicSideBar';
// (Function meaning): Bring in the `InputArea` typing box from the [1.1 InputArea] folder so we can place it at the bottom of the white body area below.
import InputArea from './1.1 InputArea/Inputarea';
// (Function meaning): Bring in the `OutputArea` chat display from the [1.2 OuputArea] folder so the parent can show messages above the input box.
import OutputArea from './1.2 OuputArea/OutputArea';
import './TaskEdit.css';

// (Function meaning): `TaskEdit` is the task-type editor page: a sidebar on the left lists all the firm's task types; the right side will hold the editor for the selected type. Both `taskTypes` and `workflowTypes` are fetched by [LandingPage.js] at app startup and passed in as props — so the sidebar data is already in memory by the time the user opens this pane and it appears instantly.
// (External references): Props are populated by [LandingPage.js] using `fetchFirmTaskTypes` and `fetchTaskTypes` from [taskTypeFetch.js].
function TaskEdit({ taskTypes = [], workflowTypes = [] }) {
  // (Function meaning): `selectedTypeId` holds the `id` of whichever task-type card the user clicked most recently; starts as `null` (nothing selected yet) and is set to the first item as soon as `taskTypes` arrives from the parent.
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  // (Function meaning): `selectedWorkflowType` holds the `id` of the workflow category the user chose in the dropdown; an empty string means "no filter — show all task types".
  const [selectedWorkflowType, setSelectedWorkflowType] = useState('');

  // (Function meaning): `inputText` holds the exact text currently inside the bottom typing box; it lives here in the parent so the parent controls the chatbox instead of the input component controlling itself.
  const [inputText, setInputText] = useState('');

  // (Function meaning): `chatMessagesByTaskId` stores chat output separately for each task type; the object key is the selected task type id, and the value is that task type's own list of chat bubbles.
  const [chatMessagesByTaskId, setChatMessagesByTaskId] = useState({});

  // (Function meaning): `chatMessages` is the list of chat bubbles shown in the output area; it lives here in the parent so [OutputArea.js] only displays messages and [Inputarea.js] only reports new text.

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

  // (Function meaning): Find the full task-type object whose `id` matches `safeSelectedId` so we can show its name and detail on the right side; if nothing is selected this is `undefined`.
  const selected = taskTypes.find((t) => t.id === safeSelectedId);

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
      <DynamicSideBar
        items={visibleTaskTypes}
        selectedItemId={safeSelectedId}
        onSelectItem={setSelectedTypeId}
        pageKey="taskedit"
        filterOptions={workflowTypes}
        filterValue={selectedWorkflowType}
        onFilterChange={setSelectedWorkflowType}
        filterPlaceholder="Search workflow types"
      />
      {/* (Function meaning): The right-side body grows to fill all the remaining width next to the sidebar; it will hold the real task-type editor fields once they are built. */}
      {/* (Function meaning): The body is now a vertical column — the content region sits on top and the InputArea typing box is pinned to the very bottom of this white area. */}
      <div className="task-edit-page__body">
        {/* (Function meaning): `task-edit-page__content` is the upper region that grows to fill all the leftover height above the input bar, keeping its message centred while the input stays at the bottom. */}
        <div className="task-edit-page__content">
          {/* (Function meaning): `OutputArea` receives the parent-owned `chatMessages` array, so the output component only displays the chat bubbles and does not decide what gets added. */}
          <OutputArea messages={chatMessages} />
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

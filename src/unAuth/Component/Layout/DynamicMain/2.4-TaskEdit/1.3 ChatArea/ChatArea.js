/*
 * (External references):
 * - Parent: [../TaskEdit.js] renders this below [../1.2 OuputArea/OutputArea.js] in the right-side white body, above the [../1.1 InputArea/Inputarea.js] typing box.
 * - Styles: [ChatArea.css].
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import './ChatArea.css';

// (Function meaning): `DEFAULT_PANEL_HEIGHT` is the starting height in pixels when the chat panel first opens — tall enough to read a few messages without taking over the whole page.
const DEFAULT_PANEL_HEIGHT = 260;
// (Function meaning): `MIN_PANEL_HEIGHT` is the smallest height the user is allowed to drag the panel down to — below this it would be too cramped to read chat bubbles.
const MIN_PANEL_HEIGHT = 120;
// (Function meaning): `MAX_PANEL_HEIGHT` is the tallest the panel can be dragged — stops it from covering the entire step list above.
const MAX_PANEL_HEIGHT = 560;

// (Function meaning): `ChatArea` receives the `messages` array from [../TaskEdit.js] and renders each one as a chat bubble; it does not create, store, or change messages itself — the parent owns the data.
// (Function meaning): `{ messages }` — an array of chat message objects passed down from [TaskEdit.js]; each object has an `id` (unique key for React), a `role` ("user" for messages the person typed, or "output" for replies), and `text` (the words to display); when the array is empty, a faint placeholder hint is shown so the area is never blank.
function ChatArea({ messages = [] }) {
  // (Function meaning): `isOpen` tracks whether the chat panel is expanded (true) or collapsed (false); it starts open so the user sees the chat area as soon as the page loads.
  const [isOpen, setIsOpen] = useState(true);
  // (Function meaning): `panelHeight` stores how tall the open chat panel is in pixels; the user can change it by dragging the resize handle, and it stays at that size until they drag again or collapse the panel.
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  // (Function meaning): `isResizing` is true only while the user is actively dragging the resize handle; when true we turn off the CSS height transition so the panel follows the mouse instantly instead of lagging behind.
  const [isResizing, setIsResizing] = useState(false);
  // (Function meaning): `resizeRef` holds temporary numbers during a drag — the mouse Y position when the drag started and the panel height at that moment — so we can calculate the new height on every mouse move without re-rendering stale values.
  const resizeRef = useRef({ startY: 0, startHeight: DEFAULT_PANEL_HEIGHT });

  // (Function meaning): When the user presses the mouse down on the resize handle, remember the starting mouse position and current panel height, then set `isResizing` to true so the effect below starts listening for mouse moves.
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    resizeRef.current = { startY: e.clientY, startHeight: panelHeight };
    setIsResizing(true);
  }, [panelHeight]);

  // (Function meaning): While `isResizing` is true, listen for mouse moves anywhere on the page to update `panelHeight`, and listen for mouse up to stop resizing; also lock the cursor to `row-resize` so it looks like a drag handle until the user releases.
  useEffect(() => {
    if (!isResizing) return undefined;

    const handleMouseMove = (e) => {
      // (Function meaning): `delta` is how many pixels the mouse moved upward (positive) or downward (negative) since the drag started; moving up makes the panel taller because the handle sits on top of the panel.
      const delta = resizeRef.current.startY - e.clientY;
      const nextHeight = Math.min(
        MAX_PANEL_HEIGHT,
        Math.max(MIN_PANEL_HEIGHT, resizeRef.current.startHeight + delta),
      );
      setPanelHeight(nextHeight);
    };

    const handleMouseUp = () => setIsResizing(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div className="chat-area__wrapper">
      {/* (Function meaning): The header floats on the top center of this component; the resize grip sits above the Chat tab, and the tab sits directly below it — both stay visible even when the panel is collapsed (resize only shows when open). */}
      <div className="chat-area__header">
        {/* (Function meaning): The resize handle only appears when the panel is open; it sits above the Chat tab so the user drags from the very top of the control stack to make the panel taller or shorter. */}
        {isOpen && (
          <div
            className="chat-area__resize-handle"
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize chat panel height"
            aria-valuenow={panelHeight}
            aria-valuemin={MIN_PANEL_HEIGHT}
            aria-valuemax={MAX_PANEL_HEIGHT}
          />
        )}
        {/* (Function meaning): The tab-bar holds the Chat pill button; clicking it toggles `isOpen` which slides the chat body up or down smoothly. */}
        <div className="chat-area__tab-bar">
          <button
            type="button"
            className="chat-area__tab"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Collapse chat panel' : 'Expand chat panel'}
          >
            <span className="chat-area__tab-label">Chat</span>
            {/* (Function meaning): The chevron arrow rotates 180° when the panel opens so it always points in the direction the panel will move if clicked — down when open (will collapse), up when closed (will expand). */}
            <span className={`chat-area__chevron${isOpen ? ' chat-area__chevron--open' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* (Function meaning): The collapsible body holds the actual scrollable chat content; its `height` is set inline from `panelHeight` when open or `0` when closed, and the CSS transition animates between those values unless the user is actively dragging. */}
      <div
        className={`chat-area__body${isOpen ? ' chat-area__body--open' : ''}${isResizing ? ' chat-area__body--resizing' : ''}`}
        style={{ height: isOpen ? panelHeight : 0 }}
        role="region"
        aria-label="Chat area"
      >
        {messages.length > 0 ? (
          <div className="chat-area__messages">
            {/* (Function meaning): Loop over every message object and render one bubble per item; `key={message.id}` gives React a stable name for each row so the list updates correctly when new messages arrive. */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-area__message chat-area__message--${message.role}`}
              >
                {/* (Function meaning): The small label above the bubble text shows who sent the message; "You" for the user's own messages, "Output" for the automatic replies. */}
                <span className="chat-area__speaker">
                  {message.role === 'user' ? 'You' : 'Output'}
                </span>
                {/* (Function meaning): The paragraph tag displays the actual message text; `pre-wrap` in the CSS keeps any line breaks the user typed. */}
                <p className="chat-area__text">{message.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="chat-area__placeholder">Type below to start a conversation.</p>
        )}
      </div>
    </div>
  );
}

export default ChatArea;

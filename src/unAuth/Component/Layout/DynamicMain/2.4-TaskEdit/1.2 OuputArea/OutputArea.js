/*
 * (External references):
 * - Parent: [../TaskEdit.js] renders this as the upper region of the right-side white body, above the [../1.1 InputArea/Inputarea.js] typing box.
 * - Styles: [outputarea.css].
 */
import './OutputArea.css';

// (Function meaning): Parent-controlled version: `OutputArea` receives `messages` from [../TaskEdit.js] and only displays them; it does not create, store, or change chat messages itself.
// (Function meaning): `OutputArea` is the scrollable region at the top of the white area where results/output will eventually be shown; for now it is a placeholder. The parent can pass `children` (anything to display inside) — when nothing is passed, a faint "Output will appear here…" hint is shown instead so the space is never blank.
// (Function meaning): `{ children }` pulls out the `children` value, which React automatically fills with whatever tags the parent nests inside `<OutputArea>...</OutputArea>`.
// (Function meaning): `{ messages }` means the parent gives this component an array of chat messages; each message is expected to have an `id`, `role`, and `text`, so this component can draw each one in the chatbox.
function OutputArea({ messages = [] }) {
  return (
    <div className="output-area" role="region" aria-label="Output area">
      {/* (Function meaning): The outer box that grows to fill the leftover height and scrolls when its content is taller than the space; `output-area` is the class the stylesheet targets. */}
      {/* (Function meaning): `children ? (...) : (...)` is a quick yes/no check — if the parent passed something to show, render that; otherwise fall back to the muted placeholder message below. */}
      {messages.length > 0 ? (
        <div className="output-area__messages">
          {/* (Function meaning): The message list renders one chat bubble for every object inside `messages`; `key={message.id}` gives React a stable name for each row so it can update the list correctly when new messages are added. */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`output-area__message output-area__message--${message.role}`}
            >
              {/* (Function meaning): The label shows who the message came from; user messages say "You", and automatic placeholder replies say "Output". */}
              <span className="output-area__speaker">
                {message.role === 'user' ? 'You' : 'Output'}
              </span>
              {/* (Function meaning): The paragraph shows the actual message text stored in `message.text`. */}
              <p className="output-area__text">{message.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* (Function meaning): The placeholder hint shown while there is no real output yet, so the user understands this empty area is where output will land later. */}
          <p className="output-area__placeholder">Type below to start a chat-style output preview.</p>
        </>
      )}
    </div>
  );
}

export default OutputArea;

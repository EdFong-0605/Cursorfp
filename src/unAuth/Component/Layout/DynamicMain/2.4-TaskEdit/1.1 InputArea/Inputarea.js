/*
 * (External references):
 * - Parent: [../TaskEdit.js] renders this at the bottom of the right-side white body area.
 * - Styles: [InputArea.css].
 */
import './InputArea.css';

// (Function meaning): Parent-controlled version: `InputArea` no longer remembers the typed text itself; instead, `TaskEdit` owns `value`, gives us `onChange` to report each keystroke, and gives us `onSend` to report the final submitted text.
// (Function meaning): `InputArea` is the typing box that sits at the very bottom of the white area on the Task Edit page; the user types text into it and presses Send (or the Enter key) to submit. The parent can pass an `onSend` function as a prop, and this component calls it with whatever text was typed.
// (Function meaning): `{ onSend }` means we pull the `onSend` function out of the props object the parent gives us, so we can call it later when the user submits.
// (Function meaning): `{ value, onChange, onSend }` means the parent gives this component the current input text (`value`), a function to call when the user types (`onChange`), and a function to call when the user submits (`onSend`).
function InputArea({ value, onChange, onSend }) {
  // (Function meaning): `text` holds the live string the user is currently typing; `setText` is the only way to change it; it starts as `''` (an empty string) because the box is empty when the page first loads.

  // (Function meaning): `handleSubmit` runs when the user submits the form (clicks Send or presses Enter). `e` is the browser's event object describing what happened.
  const handleSubmit = (e) => {
    // (Function meaning): `e.preventDefault()` stops the browser's default form behaviour, which would reload the whole page — we want to handle the text ourselves instead.
    e.preventDefault();
    // (Function meaning): `trimmed` is the typed text with any spaces at the start and end removed, so a box containing only spaces counts as empty.
    const trimmed = value.trim();
    // (Function meaning): If `trimmed` is an empty string there is nothing to send, so `return` here stops the function early and does nothing.
    if (trimmed === '') return;
    // (Function meaning): `onSend?.(trimmed)` calls the parent's `onSend` function with the typed text, but only if the parent actually passed one — the `?.` (optional chaining) safely skips the call when `onSend` is missing, avoiding a crash.
    onSend?.(trimmed);
  };

  return (
    // (Function meaning): A `<form>` wraps the input and button so pressing Enter inside the box also triggers `handleSubmit`, not just clicking the button; `input-area` is the class the stylesheet targets.
    <form className="input-area" onSubmit={handleSubmit}>
      {/* (Function meaning): The text box itself — `value={text}` ties what is shown to our `text` state, and `onChange` updates that state on every keystroke so React and the box always agree (this is called a "controlled input"). */}
      <input
        className="input-area__field"
        type="text"
        placeholder="Type here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Task edit input"
      />
      {/* (Function meaning): The Send button submits the form; `disabled={text.trim() === ''}` greys it out and blocks clicks while the box is empty or only spaces, so nothing blank can be sent. */}
      <button
        type="submit"
        className="input-area__send"
        disabled={value.trim() === ''}
      >
        Send
      </button>
    </form>
  );
}

export default InputArea;

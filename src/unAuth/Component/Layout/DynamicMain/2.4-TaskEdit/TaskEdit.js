/*
 * (External references):
 * - Styles: [TaskEdit.css]. For a similar “single middle column page” pattern, see [../2.1-Brain/Brain.js].
 */
import './TaskEdit.css';

// (Function meaning): `TaskEdit` is a small placeholder page: one `<main>` landmark and one sentence that tells the user they are on the task edit screen, so this route or slot is never blank while you build the real editor UI.
function TaskEdit() {
  return (
    // (Function meaning): `role="main"` tells assistive tech this is the main page content; `task-edit-page` is the class name the stylesheet in [TaskEdit.css] can target for layout and spacing.
    <main className="task-edit-page" role="main">
      {/* (Function meaning): One paragraph only — it prints the words “This is the task edit page” on screen so beginners immediately see which screen loaded. */}
      <p className="task-edit-page__message">This is the task edit page</p>
    </main>
  );
}

export default TaskEdit;

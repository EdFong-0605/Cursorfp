/*
 * (External references):
 * - Styles: [Admin.css]. Same “single middle column page” pattern as [../2.4-TaskEdit/TaskEdit.js].
 */
import './Admin.css';

// (Function meaning): `Admin` is a placeholder page: one `<main>` landmark and one sentence so the admin-only slot is never blank while you build the real admin UI.
function Admin() {
  return (
    // (Function meaning): `role="main"` tells assistive tech this is the main page content; `admin-page` is the class name [Admin.css] uses for layout and spacing.
    <main className="admin-page" role="main">
      {/* (Function meaning): One paragraph that prints “this is the admin only page” on screen so you can see which view loaded. */}
      <p className="admin-page__message">this is the admin only page</p>
    </main>
  );
}

export default Admin;

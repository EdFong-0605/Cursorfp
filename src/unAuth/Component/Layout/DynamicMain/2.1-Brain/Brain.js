/*
 * (External references):
 * - Shown instead of [MainLanding.js] when brain view is on in [LandingPage.js], toggled from [NavBar.js].
 */
import './Brain.css';

// (Function meaning): `Brain` is a tiny placeholder screen: one `<main>` landmark and one line of text so the middle column is never empty when the user picks the brain icon.
function Brain() {
  return (
    // (Function meaning): `role="main"` marks this block as the primary page content for screen readers; `brain-page` hooks the layout rules in [Brain.css].
    <main className="brain-page" role="main">
      {/* (Function meaning): Plain paragraph with the welcome line only — no buttons, lists, or other widgets on this page yet. */}
      <p className="brain-page__message">Welcome to brain page</p>
    </main>
  );
}

export default Brain;

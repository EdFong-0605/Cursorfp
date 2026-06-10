/*
 * (External references):
 * - Parent: [../TaskEdit.js] renders this as the upper region of the right-side white body, above the [../1.1 InputArea/Inputarea.js] typing box.
 * - Styles: [outputarea.css].
 */
import './OutputArea.css';

// (Function meaning): `OutputArea` receives `templateSteps` from [../TaskEdit.js] and only displays them as numbered step cards; it does not create, store, or change any data itself. The chat dialogue has moved to [../1.3 ChatArea/ChatArea.js].
// (Function meaning): `OutputArea` is the scrollable region at the top of the right-side white body. It now has three display modes: (1) when `loading` is true it renders shimmering placeholder cards so the area never appears blank during a fetch; (2) when `templateSteps` are present it renders each step as a numbered card; (3) when both are false/empty it shows a faint placeholder hint.
// (Function meaning): `{ templateSteps }` — the array of step objects fetched from MongoDB by [../TaskEdit.js]; each step has StepNumber, StepTitle, Reason, NeededInformation (a list of strings), TeamResponsible, and Notes.
// (Function meaning): `{ loading }` — a boolean that [../TaskEdit.js] sets to true while the network request is in flight and back to false when it finishes or is aborted; OutputArea uses it to decide whether to show shimmer cards.
function OutputArea({ templateSteps = [], loading = false }) {
  return (
    <div className="output-area" role="region" aria-label="Output area">
      {loading ? (
        // (Function meaning): While the fetch is running, render 4 ghost cards that pulse silver — these are pure CSS shapes with no real text; the animation is handled entirely by [outputarea.css] so React only needs to put them in the DOM.
        <ul className="output-area__shimmer-list" aria-label="Loading…" aria-busy="true">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="output-area__shimmer-card">
              {/* (Function meaning): The pill sits in the top-left corner and mimics the "Step N" badge of a real card. */}
              <span className="output-area__shimmer-pill" />
              {/* (Function meaning): A wide line represents the step title text. */}
              <span className="output-area__shimmer-line output-area__shimmer-line--title" />
              {/* (Function meaning): A short narrow line represents the team badge. */}
              <span className="output-area__shimmer-line output-area__shimmer-line--team" />
              {/* (Function meaning): Two shorter lines mimic the body text / reason paragraph. */}
              <span className="output-area__shimmer-line" />
              <span className="output-area__shimmer-line output-area__shimmer-line--short" />
            </li>
          ))}
        </ul>
      ) : templateSteps.length > 0 ? (
        <div className="output-area__steps">
          {/* (Function meaning): Loop over every step and render one card per step; `key={step.StepID}` gives React a stable name for each card so the list updates correctly. */}
          {templateSteps.map((step) => (
            <div key={step.StepID} className="output-area__step">
              {/* (Function meaning): The header row shows the numbered badge on the left and the step title on the right so the user can scan down the list quickly. */}
              <div className="output-area__step-header">
                <span className="output-area__step-number">Step {step.StepNumber}</span>
                <span className="output-area__step-title">{step.StepTitle}</span>
              </div>
              {/* (Function meaning): The team badge shows which role is responsible for this step. */}
              <span className="output-area__step-team">{step.TeamResponsible}</span>
              {/* (Function meaning): The reason paragraph explains why this step exists so the user understands its purpose. */}
              {step.Reason && (
                <p className="output-area__step-reason">{step.Reason}</p>
              )}
              {/* (Function meaning): The needed-information list gives the user a checklist of every piece of data required before this step can be completed. */}
              {step.NeededInformation.length > 0 && (
                <div className="output-area__step-info">
                  <span className="output-area__step-info-label">Needed information</span>
                  <ul className="output-area__step-info-list">
                    {step.NeededInformation.map((item, idx) => (
                      <li key={idx} className="output-area__step-info-item">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="output-area__placeholder">Select a task type with a template to see its steps here.</p>
      )}
    </div>
  );
}

export default OutputArea;

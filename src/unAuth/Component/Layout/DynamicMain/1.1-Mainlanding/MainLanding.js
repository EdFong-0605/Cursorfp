/** Primary main content region between TopRibbon and Footer on the landing layout. */
/*
 * (External references):
 * - `clients`: [LandingPage.js] (browser `fetch`) → [Component/API/clientfetch.js] → HTTP `on_request_example` in [functions/main.py]; [MainLanding.js] forwards the same array to [Clienttask.js] / [ProgressBar.js] / [Clientbar.js].
 * - Client list UI: either [DynamicMain/2.2-ClientTask/Clienttask.js] or [DynamicMain/2.3-Progress/ProgressBar.js] (not both); each embeds [3.1-ClientBar/Clientbar.js]. Sheet: [MainLanding.css].
 */
import { useEffect, useState } from 'react';
import Clienttask from '../2.2-ClientTask/Clienttask';
import ProgressBar from '../2.3-Progress/ProgressBar';
import './MainLanding.css';

// (Function meaning): `clients` is the list the parent page hands down; `= []` means “if missing, use an empty list” so we never crash on undefined. `showClientTask` comes from [LandingPage.js] after the user taps the person icon in [NavBar.js]; when `true` you see only [Clienttask.js], when `false` you see only [ProgressBar.js] — never both in the same main pane.
function MainLanding({ clients = [], showClientTask = false }) {
  // (Function meaning): `selectedClientId` = which client looks chosen; `setSelectedClientId` = React’s button to change that value. We start at null until the effect picks someone.
  const [selectedClientId, setSelectedClientId] = useState(null);

  // (Function meaning): Run this whole block again whenever `clients` changes (new fetch, new data).
  useEffect(() => {
    // (Function meaning): If the list has zero people, clear the highlight and stop here.
    if (clients.length === 0) {
      setSelectedClientId(null);
      return;
    }
    // (Function meaning): Otherwise, set a safe highlight: keep the old id if it still exists, else use the first row’s id.
    setSelectedClientId((prev) => {
      // (Function meaning): If we already had a pick and that id is still in the new list, keep the same pick.
      if (prev && clients.some((c) => c.id === prev)) return prev;
      // (Function meaning): If the old pick vanished, default to the first client so the bar always has someone selected when there is data.
      return clients[0].id;
    });
  }, [clients]);

  return (
    // (Function meaning): `<main>` wraps the whole middle band; `role="main"` tells assistive tech this is the primary content area.
    <main className="main-landing-sheet" role="main">
      {/*
        (Function meaning): One main view at a time — tasks or progress — so the two bands are never stacked in one column.
        (External references): [Clienttask.js], [ProgressBar.js] — same three props: `clients`, `selectedClientId`, `onSelectClient` = setSelectedClientId.
      */}
      <div className="main-landing-sheet__stack">
        {showClientTask ? (
          <Clienttask
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />
        ) : (
          <ProgressBar
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
          />
        )}
      </div>
    </main>
  );
}

export default MainLanding;

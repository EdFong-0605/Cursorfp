/** Primary main content region between TopRibbon and Footer on the landing layout. */
/*
 * (External references):
 * - `clients`: [LandingPage.js] → [Component/API/clientfetch.js] (`id`, `label`, optional `aum`, `startDate`).
 * - Left strip: [DynamicMain/2.5-ClientBar/Clientbar.js]. Sheet: [MainLanding.css].
 */
import { useEffect, useState } from 'react';
import Clientbar from '../2.5-ClientBar/Clientbar';
import './MainLanding.css';

// (Function meaning): `clients` is the list the parent page hands down; `= []` means “if missing, use an empty list” so we never crash on undefined.
function MainLanding({ clients = [] }) {
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
        (Function meaning): Clientbar draws the dark left column.
        (External references): [Clientbar.js] — props: `clients` = full list; `selectedClientId` = lit row; `onSelectClient` = same as setSelectedClientId so clicks update state here.
      */}
      <Clientbar
        clients={clients}
        selectedClientId={selectedClientId} //the memory of which is clicked 
        onSelectClient={setSelectedClientId} //the updating the memory of which is clicked
      />

      {/* (Function meaning): Right side white workspace; placeholder text until Brain / tasks are built. */}
      <div className="main-landing-sheet__body">
        {/* (Function meaning): Static label so you can see this component on screen while building. */}
        <span className="main-landing-sheet__title">MainLanding</span>
        {/* (Function meaning): Shows `clients.length` so you can confirm how many rows arrived from the parent. */}
        <span className="main-landing-sheet__meta"> ({clients.length} clients)</span>
      </div>
    </main>
  );
}

export default MainLanding;

/**
 * Unauthenticated landing layout: left sidebar (NavBar) + main column.
 * landing-page__content stacks search, primary main area, and footer.
 *
 * Client list for the whole landing shell: fetched once here, then passed down
 * so SearchBar (and any sibling) does not each run its own network call.
 */
import { useEffect, useState } from 'react';
import './LandingPage.css';
import NavBar from '../Component/Layout/NavBar/1.1 NavBar/NavBar';
import TopRibbon from '../Component/Layout/TopRibbon/1.1 TopRibbon/TopRibbon';
import MainLanding from '../Component/Layout/DynamicMain/1.1Mainlanding/MainLanding';
import Footer from '../Component/Layout/Footer/1.1 Footer/Footer';
import { fetchDummyClientsFromMainPy } from '../Component/API/clientfetch';

function LandingPage() {
  // Start as [] so children always receive an array: empty means "still loading or none yet".
  const [clients, setClients] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await fetchDummyClientsFromMainPy();
      if (!cancelled) setClients(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="landing-page">
      <NavBar clients={clients} />
      <div className="landing-page__content">
        <TopRibbon clients={clients} />
        <MainLanding clients={clients} />
        <Footer />
      </div>
    </div>
  );
}

export default LandingPage;

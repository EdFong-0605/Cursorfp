/**
 * Unauthenticated landing layout: left sidebar (NavBar) + main column.
 * landing-page__content stacks search, primary main area, and footer.
 */
import './LandingPage.css';
import NavBar from '../Component/Layout/NavBar';
import SearchBar from '../Component/Layout/SearchBar';
import MainLanding from '../Component/Layout/DynamicMain/MainLanding';
import Footer from '../Component/Layout/Footer';

function LandingPage() {
  return (
    <div className="landing-page">
      <NavBar />
      <div className="landing-page__content">
        <SearchBar />
        <MainLanding />
        <Footer />
      </div>
    </div>
  );
}

export default LandingPage;

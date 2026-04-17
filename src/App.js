/**
 * Root React component. Currently renders the unauthenticated landing shell;
 * add routing here when you split auth vs. unauth experiences.
 */
import './App.css';
import LandingPage from './unAuth/Landing Page/LandingPage';

function App() {
  return (
    <div className="App">
      
      <LandingPage />
    </div>
  );
}

export default App;

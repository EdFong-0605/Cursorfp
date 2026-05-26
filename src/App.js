/**
 * Root React component: shows auth screens until signed in, then the main landing shell.
 */
import { useEffect, useState } from 'react';
import './App.css';
import './Auth/authShared.css';
import LandingPage from './unAuth/Landing Page/LandingPage';
import { AuthProvider, useAuth } from './Auth/Events/AuthContext';
import Login from './Auth/loginPage/1.1-MainLoginPage/Login';
import Createuser from './Auth/loginPage/2.1-Createuser/Createuser';
import Createfirm from './Auth/loginPage/2.2-Createfirm/Createfirm';

// (Function meaning): `login` = sign-in form, `signup` = create-account form, `setup_firm` = firm onboarding.
const AUTH_SCREEN_LOGIN = 'login';
const AUTH_SCREEN_SIGNUP = 'signup';
const AUTH_SCREEN_SETUP_FIRM = 'setup_firm';

// (Function meaning): While Firebase checks for an existing session, show a simple loading message.
function AuthLoading({ message = 'Loading…' }) {
  return (
    <div className="auth-page">
      <p className="auth-card__subtitle">{message}</p>
    </div>
  );
}

// (Function meaning): Pick auth screen or main app based on whether [AuthContext.js] has a `user`.
function AppRoutes() {
  const { user, loading, firmSetupInProgress, sessionReady } = useAuth();
  const [authScreen, setAuthScreen] = useState(AUTH_SCREEN_LOGIN);

  // (Function meaning): After sign-out (or session expires), show the sign-in screen again — same on localhost and production.
  // (External references): Skip while [Createfirm.js] is creating multiple accounts so we do not jump to the login screen between sign-up and sign-out steps.
  useEffect(() => {
    if (!user && !firmSetupInProgress) {
      setAuthScreen(AUTH_SCREEN_LOGIN);
    }
  }, [user, firmSetupInProgress]);

  if (loading) {
    return <AuthLoading />;
  }

  if (firmSetupInProgress) {
    return (
      <AuthLoading message="Creating firm and team accounts…" />
    );
  }

  if (user && !sessionReady) {
    return <AuthLoading message="Loading…" />;
  }

  if (!user) {
    if (authScreen === AUTH_SCREEN_SIGNUP) {
      return (
        <Createuser
          onBack={() => setAuthScreen(AUTH_SCREEN_LOGIN)}
          onGoLogin={() => setAuthScreen(AUTH_SCREEN_LOGIN)}
        />
      );
    }
    if (authScreen === AUTH_SCREEN_SETUP_FIRM) {
      return <Createfirm onBack={() => setAuthScreen(AUTH_SCREEN_LOGIN)} />;
    }
    return (
      <Login
        onGoSignup={() => setAuthScreen(AUTH_SCREEN_SIGNUP)}
        onGoSetupFirm={() => setAuthScreen(AUTH_SCREEN_SETUP_FIRM)}
      />
    );
  }

  return <LandingPage />;
}

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;

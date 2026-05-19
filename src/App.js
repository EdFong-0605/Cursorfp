/**
 * Root React component: shows auth screens until signed in, then the main landing shell.
 */
import { useEffect, useState } from 'react';
import './App.css';
import './Auth/authShared.css';
import LandingPage from './unAuth/Landing Page/LandingPage';
import { AuthProvider, useAuth } from './Auth/AuthContext';
import LoginLanding from './Auth/LoginLanding';
import Login from './Auth/loginPage/Login';
import Createuser from './Auth/Createuser/Createuser';

// (Function meaning): `landing` = welcome buttons, `login` = sign-in form, `signup` = create-account form.
const AUTH_SCREEN_LANDING = 'landing';
const AUTH_SCREEN_LOGIN = 'login';
const AUTH_SCREEN_SIGNUP = 'signup';

// (Function meaning): While Firebase checks for an existing session, show a simple loading message.
function AuthLoading() {
  return (
    <div className="auth-page">
      <p className="auth-card__subtitle">Loading…</p>
    </div>
  );
}

// (Function meaning): Pick auth screen or main app based on whether [AuthContext.js] has a `user`.
function AppRoutes() {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState(AUTH_SCREEN_LANDING);

  // (Function meaning): After sign-out (or session expires), show the welcome screen again — same on localhost and production.
  useEffect(() => {
    if (!user) {
      setAuthScreen(AUTH_SCREEN_LANDING);
    }
  }, [user]);

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    if (authScreen === AUTH_SCREEN_LOGIN) {
      return (
        <Login
          onBack={() => setAuthScreen(AUTH_SCREEN_LANDING)}
          onGoSignup={() => setAuthScreen(AUTH_SCREEN_SIGNUP)}
        />
      );
    }
    if (authScreen === AUTH_SCREEN_SIGNUP) {
      return (
        <Createuser
          onBack={() => setAuthScreen(AUTH_SCREEN_LANDING)}
          onGoLogin={() => setAuthScreen(AUTH_SCREEN_LOGIN)}
        />
      );
    }
    return (
      <LoginLanding
        onGoLogin={() => setAuthScreen(AUTH_SCREEN_LOGIN)}
        onGoSignup={() => setAuthScreen(AUTH_SCREEN_SIGNUP)}
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

/**
 * Sign-in screen: email/password and Google.
 */
import { useState } from 'react';
import './Login.css';
import '../authShared.css';
import {
  getAuthErrorMessage,
  signInWithEmail,
  signInWithGoogle,
} from '../authService';

// (Function meaning): Form where an existing user enters email and password (or uses Google) to get into the app.
function Login({ onBack, onGoSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // (Function meaning): Read the email and password fields, call Firebase sign-in, and show a friendly error if it fails.
  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // (Function meaning): Open Google sign-in popup; on success [AuthContext.js] receives the user automatically.
  const handleGoogleSignIn = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Sign in</h1>
        <p className="auth-card__subtitle">Use your email or continue with Google.</p>

        {error ? <p className="auth-error" role="alert">{error}</p> : null}

        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <button type="submit" className="auth-btn auth-btn--primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <button
          type="button"
          className="auth-btn auth-btn--google"
          onClick={handleGoogleSignIn}
          disabled={busy}
        >
          Continue with Google
        </button>

        <p className="auth-footer">
          New here?{' '}
          <button type="button" className="auth-link" onClick={onGoSignup}>
            Create an account
          </button>
        </p>
        <p className="auth-footer">
          <button type="button" className="auth-link" onClick={onBack}>
            Back
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;

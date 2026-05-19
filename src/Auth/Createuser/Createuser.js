/**
 * Sign-up screen: create account with email/password or Google.
 */
import { useState } from 'react';
import './Createuser.css';
import '../authShared.css';
import {
  getAuthErrorMessage,
  signUpWithEmail,
} from '../authService';

// (Function meaning): Form where a new user picks email and password (or uses Google) to register.
function Createuser({ onBack, onGoLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // (Function meaning): Check passwords match, then call Firebase to create the account.
  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !role.trim()) {
      setError('Please enter your first name, last name, and role.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role.trim(),
      });
    } catch (err) {
      if (err?.code === 'profile/save-failed') {
        setError(
          'Account created but profile could not be saved. Try signing in or contact support.',
        );
      } else {
        setError(getAuthErrorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page createuser-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Create account</h1>
        <p className="auth-card__subtitle">Register with your email to get started.</p>

        {error ? <p className="auth-error" role="alert">{error}</p> : null}

        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <div className="auth-field">
            <label htmlFor="signup-first-name">First name</label>
            <input
              id="signup-first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-last-name">Last name</label>
            <input
              id="signup-last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-role">Role</label>
            <input
              id="signup-role"
              type="text"
              autoComplete="organization-title"
              placeholder="e.g. Advisor, Admin"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <button type="submit" className="auth-btn auth-btn--primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <button type="button" className="auth-link" onClick={onGoLogin}>
            Sign in
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

export default Createuser;

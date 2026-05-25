/**
 * Sign-up screen: create account with email/password or Google.
 */
import { useState } from 'react';
import './Createuser.css';
import '../../authShared.css';
import {
  getAuthErrorMessage,
  signUpWithEmail,
} from '../../Events/authService';
import SignupUserFields, {
  createEmptySignupUser,
  validateSignupUserFields,
} from '../shared/SignupUserFields';

// (Function meaning): Form where a new user picks email and password (or uses Google) to register.
function Createuser({ onBack, onGoLogin }) {
  const [signupUser, setSignupUser] = useState(createEmptySignupUser);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const roleField = { type: 'text' };

  // (Function meaning): Check passwords match, then call Firebase to create the account.
  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    setError('');
    const validationError = validateSignupUserFields(signupUser, roleField);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(signupUser.email.trim(), signupUser.password, {
        firstName: signupUser.firstName.trim(),
        lastName: signupUser.lastName.trim(),
        role: signupUser.role.trim(),
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
          <SignupUserFields
            idPrefix="signup"
            values={signupUser}
            onChange={(patch) => setSignupUser((prev) => ({ ...prev, ...patch }))}
            disabled={busy}
            roleField={roleField}
          />
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

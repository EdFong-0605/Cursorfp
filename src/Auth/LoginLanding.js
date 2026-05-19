/**
 * First auth screen: choose sign in or create account.
 */
import './LoginLanding.css';
import './authShared.css';

// (Function meaning): Show the welcome card with two buttons that tell the parent which screen to open next.
function LoginLanding({ onGoLogin, onGoSignup }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Welcome to Lynkfi</h1>
        <p className="auth-card__subtitle">
          Sign in to open your workspace, or create an account to get started.
        </p>
        <div className="auth-actions-row">
          <button type="button" className="auth-btn auth-btn--primary" onClick={onGoLogin}>
            Sign in
          </button>
          <button type="button" className="auth-btn auth-btn--ghost" onClick={onGoSignup}>
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginLanding;

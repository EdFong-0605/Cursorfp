/**
 * Shares the signed-in user (or null) with the whole app via React context.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, authPersistenceReady } from '../../firebase';
import { signOutUser } from './authService';
import { useInactivityLogout } from './useInactivityLogout';

// (Function meaning): Empty box that child components fill with `useAuth()` to read user and loading state.
const AuthContext = createContext(null);

// (Function meaning): Wrap the app so every screen can ask "is someone logged in?" without calling Firebase directly.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // (Function meaning): Wait for session-only persistence in [firebase.js], then listen for sign-in, sign-out, or an existing tab session (survives refresh, not tab close).
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    const startAuthListener = () => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        setLoading(false);
      });
    };

    authPersistenceReady.then(startAuthListener).catch((err) => {
      console.error('[AuthContext] authPersistenceReady', err);
      startAuthListener();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // (Function meaning): While signed in, sign out after 1 hour with no pointer/keyboard/scroll/touch activity.
  useInactivityLogout(user);

  // (Function meaning): Bundle user, loading flag, and sign-out into one object for children.
  const value = {
    user,
    loading,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// (Function meaning): Hook used in [App.js] and auth screens to read `user`, `loading`, and `signOut` from the provider above.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

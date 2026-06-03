/**
 * Shares the signed-in user (or null) with the whole app via React context.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, authPersistenceReady } from '../../firebase';
import { checkFirmAdmin } from '../API/userProfileApi';
import { signOutUser } from './authService';
import { useInactivityLogout } from './useInactivityLogout';

// (Function meaning): Empty box that child components fill with `useAuth()` to read user and loading state.
const AuthContext = createContext(null);

// (Function meaning): Wrap the app so every screen can ask "is someone logged in?" without calling Firebase directly.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // (Function meaning): While `true`, [App.js] stays on the firm-setup flow even if Firebase briefly has a signed-in user between account creations.
  const [firmSetupInProgress, setFirmSetupInProgress] = useState(false);
  // (Function meaning): `false` while we ask the server if the signed-in user is a firm admin; [App.js] waits before showing [LandingPage.js].
  const [sessionReady, setSessionReady] = useState(true);
  // (Function meaning): `true` when [check_firm_admin] in [functions/main.py] says this user's MongoDB profile has `firmRole` firm_admin.
  const [isFirmAdmin, setIsFirmAdmin] = useState(false);

  // (Function meaning): Wait for browser-wide persistence in [firebase.js], then listen for sign-in, sign-out, or a different tab changing the current browser user.
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

  // (Function meaning): On every login (or when firm setup finishes), ask [userProfileApi.js] `checkFirmAdmin`; skip while [Createfirm.js] is still creating accounts.
  // (External references): [App.js] gates landing on `sessionReady`; [LandingPage.js] reads `isFirmAdmin` for the admin icon.
  useEffect(() => {
    if (!user) {
      setSessionReady(true);
      setIsFirmAdmin(false);
      return undefined;
    }
    if (firmSetupInProgress) {
      setSessionReady(false);
      return undefined;
    }

    let cancelled = false;
    setSessionReady(false);

    checkFirmAdmin({ user })
      .then((ok) => {
        if (!cancelled) {
          setIsFirmAdmin(ok);
        }
      })
      .catch((err) => {
        console.error('[AuthContext] check firm admin', err);
        if (!cancelled) {
          setIsFirmAdmin(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSessionReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, firmSetupInProgress]);

  // (Function meaning): Bundle user, loading flag, and sign-out into one object for children.
  const value = {
    user,
    loading,
    signOut: signOutUser,
    firmSetupInProgress,
    setFirmSetupInProgress,
    sessionReady,
    isFirmAdmin,
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

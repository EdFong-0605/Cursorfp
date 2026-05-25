/**
 * Unauthenticated landing layout: left sidebar (NavBar) + main column.
 * landing-page__content stacks search, primary main area, and footer.
 *
 * Client list for the whole landing shell: fetched once here, then passed down
 * so SearchBar (and any sibling) does not each run its own network call.
 */
import { useCallback, useEffect, useState } from 'react';
import '../../Auth/authShared.css';
import './LandingPage.css';
import NavBar from '../Component/Layout/NavBar/1.1 NavBar/NavBar';
import TopRibbon from '../Component/Layout/TopRibbon/1.1 TopRibbon/TopRibbon';
import MainLanding from '../Component/Layout/DynamicMain/1.1-Mainlanding/MainLanding';
import Brain from '../Component/Layout/DynamicMain/2.1-Brain/Brain';
import TaskEdit from '../Component/Layout/DynamicMain/2.4-TaskEdit/TaskEdit';
import Admin from '../Component/Layout/DynamicMain/2.5 Admin Task/Admin';
import Footer from '../Component/Layout/Footer/1.1 Footer/Footer';
import { fetchDummyClientsFromMainPy } from '../Component/API/clientfetch';
import { useAuth } from '../../Auth/Events/AuthContext';
import { checkFirmAdmin } from '../../Auth/API/userProfileApi';

// (Function meaning): Turn the signed-in Firebase user into one or two letters for the round profile button in [NavBar.js].
function getProfileInitials(user) {
  const displayName = user?.displayName?.trim();
  if (displayName) {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }
  const localPart = (user?.email?.trim().split('@')[0] || '');
  if (localPart.length >= 2) return localPart.slice(0, 2).toUpperCase();
  if (localPart.length === 1) return localPart.toUpperCase();
  return '?';
}

// (Function meaning): Full-screen “Loading…” while [checkFirmAdmin] runs; same layout classes as [App.js] `AuthLoading`.
function SessionLoading() {
  return (
    <div className="auth-page">
      <p className="auth-card__subtitle">Loading…</p>
    </div>
  );
}

function LandingPage() {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  // Start as [] so children always receive an array: empty means "still loading or none yet".
  const [clients, setClients] = useState([]);
  // (Function meaning): `false` shows progress in [MainLanding.js]; `true` shows [Clienttask.js]. The person icon only turns this on — it does nothing if you are already on client tasks (see `onUserIconClick`).
  const [clientTaskOpen, setClientTaskOpen] = useState(false);
  // (Function meaning): When `true`, the middle column shows [Brain.js] instead of [MainLanding.js]. Starts `true` so the first screen is the brain page; the brain icon in [NavBar.js] only selects this view again (it does not turn it off).
  const [brainViewOpen, setBrainViewOpen] = useState(true);
  // (Function meaning): When `true`, the middle column shows [TaskEdit.js]. Clipboard sets this on and clears brain + client-task (same style as progress: no “tap again to close” on that icon).
  const [taskEditViewOpen, setTaskEditViewOpen] = useState(false);
  // (Function meaning): When `true`, the middle column shows [Admin.js]. User-tie icon sets this on and clears brain, client-task, and task edit (same style as clipboard).
  const [adminViewOpen, setAdminViewOpen] = useState(false);
  // (Function meaning): When `true`, [NavBar.js] shows the user-tie icon; set only after [checkFirmAdmin] confirms firm_admin on the server.
  const [showAdminIcon, setShowAdminIcon] = useState(false);
  // (Function meaning): `false` until [checkFirmAdmin] finishes so the landing shell does not flash before the admin icon decision.
  const [sessionReady, setSessionReady] = useState(false);

  // (Function meaning): `fetchDummyClientsFromMainPy` runs in the browser and calls `on_request_example` in [functions/main.py]; the JSON `clients` array becomes `id` / `label` rows for [MainLanding.js] → [Clienttask.js] → [Clientbar.js].
  const pullClientsFromBackend = useCallback(async () => {
    try {
      const rows = await fetchDummyClientsFromMainPy();
      setClients(rows);
    } catch (e) {
      console.error('[LandingPage] fetch clients', e);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    pullClientsFromBackend();
  }, [pullClientsFromBackend]);

  // (Function meaning): When the user opens the client-task pane (`clientTaskOpen` becomes `true`), ask the backend again so the strip shows the full current list, not a stale empty array from before the emulator answered.
  useEffect(() => {
    if (!clientTaskOpen) return;
    pullClientsFromBackend();
  }, [clientTaskOpen, pullClientsFromBackend]);

  // (Function meaning): When a user is signed in, ask the backend if they are a firm admin; hide the admin icon and close the admin pane if not; then allow the landing shell to render.
  useEffect(() => {
    if (!user) {
      setSessionReady(false);
      setShowAdminIcon(false);
      setAdminViewOpen(false);
      return;
    }
    setSessionReady(false);
    let cancelled = false;
    checkFirmAdmin({ user })
      .then((ok) => {
        if (cancelled) return;
        setShowAdminIcon(ok);
        if (!ok) setAdminViewOpen(false);
      })
      .catch((err) => {
        console.error('[LandingPage] check firm admin', err);
        if (!cancelled) {
          setShowAdminIcon(false);
          setAdminViewOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // (Function meaning): Call Firebase sign-out when the user taps their initials; [App.js] then shows the welcome screen again.
  const handleProfileLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('[LandingPage] sign out', err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (!sessionReady) {
    return <SessionLoading />;
  }

  return (
    <div className="landing-page">
      {/* (External references): `onUserIconClick` / `userTaskPanelOpen`, `onProgressIconClick` / `progressPanelOpen`, brain + clipboard props are read in [NavBar.js]; `showClientTask` is read in [MainLanding.js] (false = [ProgressBar.js], true = [Clienttask.js]). Brain / clipboard swap the main pane to [Brain.js] or [TaskEdit.js]. */}
      <NavBar
        clients={clients}
        onUserIconClick={() => {
          setBrainViewOpen(false);
          setTaskEditViewOpen(false);
          setAdminViewOpen(false);
          // (Function meaning): If `clientTaskOpen` is already `true`, keep it `true` so another tap on the person icon does not leave the task page.
          setClientTaskOpen((wasOpen) => (wasOpen ? wasOpen : true));
        }}
        userTaskPanelOpen={clientTaskOpen}
        onBrainIconClick={() => {
          setBrainViewOpen(true);
          setClientTaskOpen(false);
          setTaskEditViewOpen(false);
          setAdminViewOpen(false);
        }}
        brainPanelOpen={brainViewOpen}
        onProgressIconClick={() => {
          setBrainViewOpen(false);
          setClientTaskOpen(false);
          setTaskEditViewOpen(false);
          setAdminViewOpen(false);
        }}
        progressPanelOpen={
          !brainViewOpen && !clientTaskOpen && !taskEditViewOpen && !adminViewOpen
        }
        onClipboardIconClick={() => {
          setBrainViewOpen(false);
          setClientTaskOpen(false);
          setTaskEditViewOpen(true);
          setAdminViewOpen(false);
        }}
        clipboardPanelOpen={taskEditViewOpen}
        onAdminIconClick={() => {
          setBrainViewOpen(false);
          setClientTaskOpen(false);
          setTaskEditViewOpen(false);
          setAdminViewOpen(true);
        }}
        adminPanelOpen={adminViewOpen}
        showAdminIcon={showAdminIcon}
        profileInitials={getProfileInitials(user)}
        onProfileClick={handleProfileLogout}
        profileBusy={loggingOut}
      />
      <div className="landing-page__content">
        <TopRibbon clients={clients} />
        {brainViewOpen ? (
          <Brain />
        ) : taskEditViewOpen ? (
          <TaskEdit />
        ) : showAdminIcon && adminViewOpen ? (
          <Admin />
        ) : (
          <MainLanding clients={clients} showClientTask={clientTaskOpen} />
        )}
        <Footer />
      </div>
    </div>
  );
}

export default LandingPage;

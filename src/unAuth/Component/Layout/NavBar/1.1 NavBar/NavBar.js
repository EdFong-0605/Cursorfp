/**
 * Left sidebar: top band, then a row with a narrow left strip and the interactive nav.
 * Right column: buttons 1–4 grouped at the top, 5–6 at the bottom (see NavBar.css).
 * Layout scales with viewport (fluid widths and icon sizes); under 480px the shell becomes
 * a full-width horizontal strip so very narrow phones do not keep a narrow side column.
 */

import './NavBar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain,
  faUser,
  faBarsProgress,
  faClipboard,
  faGear,
} from '@fortawesome/free-solid-svg-icons';


function Button({ children, className = '', type = 'button', ...rest }) {
  const combined = ['btn', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={combined} {...rest}>
      {children}
    </button>
  );
}

/**
 * @param {object} props
 * @param {{ id: string, label: string }[]} [props.clients] — shared list from `LandingPage` (same fetch as SearchBar).
 * @param {() => void} [props.onUserIconClick] — opens the client-task panel in `MainLanding`; parent ignores the click if that panel is already open (wired from `LandingPage`).
 * @param {boolean} [props.userTaskPanelOpen] — mirrors whether that panel is visible (for `aria-pressed` on the user icon).
 * @param {() => void} [props.onBrainIconClick] — selects the brain placeholder main pane; parent keeps you on brain if you click again (wired from `LandingPage`).
 * @param {boolean} [props.brainPanelOpen] — mirrors whether the brain main pane is visible (for `aria-pressed` on the brain icon).
 * @param {() => void} [props.onProgressIconClick] — shows the progress band in `MainLanding` (`ProgressBar.js`); wired from `LandingPage`.
 * @param {boolean} [props.progressPanelOpen] — true when main column is `MainLanding` with client tasks off (for `aria-pressed` on the bars-progress icon).
 * @param {() => void} [props.onClipboardIconClick] — shows `TaskEdit.js` in the main column; wired from `LandingPage` (sets mode on, same idea as progress — not a tap-to-toggle-off control).
 * @param {boolean} [props.clipboardPanelOpen] — true when main column is `TaskEdit` (for `aria-pressed` on the clipboard icon).
 */
function NavBar({
  clients = [],
  onUserIconClick,
  userTaskPanelOpen = false,
  onBrainIconClick = () => {},
  brainPanelOpen = false,
  onProgressIconClick = () => {},
  progressPanelOpen = false,
  onClipboardIconClick = () => {},
  clipboardPanelOpen = false,
}) {
  return (
    <header
      className="navbar-sheet"
      role="banner"
      data-clients-loaded={clients.length}
    >
      {/* Fixed-height header band (decorative / branding area) */}
      <div className="navbar-sheet__top">
        <img
          className="navbar-sheet__logo"
          src={`${process.env.PUBLIC_URL}/LynkFi_Color_White.png`}
          alt="LynkFi"
        />
      </div>
      <div className="navbar-sheet__body">
        {/* Narrow vertical strip beside the button column */}
        <div className="navbar-sheet__body-left" aria-hidden="true" />
        <nav className="navbar-sheet__body-right" aria-label="Sidebar">
          <div className="navbar-sheet__body-right-top">
            
            <Button
              type="button"
              className="btn-square-main"
              aria-label="Brain"
              aria-pressed={brainPanelOpen}
              onClick={onBrainIconClick}
            >
              <FontAwesomeIcon icon={faBrain} />
            </Button>
            
            <Button
              type="button"
              className="btn-square-main"
              aria-label="User — client tasks"
              aria-pressed={userTaskPanelOpen}
              onClick={onUserIconClick}
            >
              <FontAwesomeIcon icon={faUser} />
            </Button>
            
            <Button
              type="button"
              className="btn-square-main"
              aria-label="Client progress"
              aria-pressed={progressPanelOpen}
              onClick={onProgressIconClick}
            >
              <FontAwesomeIcon icon={faBarsProgress} />
            </Button>
            
            <Button
              type="button"
              className="btn-square-main"
              aria-label="Task edit"
              aria-pressed={clipboardPanelOpen}
              onClick={onClipboardIconClick}
            >
              <FontAwesomeIcon icon={faClipboard} />
            </Button>

          </div>
          <div className="navbar-sheet__right-bottom">
            <Button type="button" className="btn-setting" aria-label="Settings">
              <FontAwesomeIcon icon={faGear} />
            </Button>
            {/* this is for the profile button HARD CODED EF!! */}
            <Button type="button" className="btn-profile" aria-label="Profile">
              EF 
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default NavBar;

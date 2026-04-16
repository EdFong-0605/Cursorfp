/**
 * Left sidebar: top band, then a row with a narrow left strip and the interactive nav.
 * Right column: buttons 1–4 grouped at the top, 5–6 at the bottom (see NavBar.css).
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

function NavBar() {
  return (
    <header className="navbar-sheet" role="banner">
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
            
            <Button type="button" className="btn-square-main" aria-label="Brain">
              <FontAwesomeIcon icon={faBrain} />
            </Button>
            
            <Button type="button" className="btn-square-main" aria-label="user">
              <FontAwesomeIcon icon={faUser} />
            </Button>
            
            <Button type="button" className="btn-square-main" aria-label="bars progress">
              <FontAwesomeIcon icon={faBarsProgress} />
            </Button>
            
            <Button type="button" className="btn-square-main" aria-label="clipboard">
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

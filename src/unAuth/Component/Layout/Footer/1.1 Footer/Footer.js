/**
 * (Function meaning): This file defines the `Footer` component and loads [Footer.css] so the bar at the bottom of the screen has the right colors and spacing. `export default Footer` lets [LandingPage.js] import it as the default export from this file.
 * (External references): Styles in [Footer.css].
 */
import './Footer.css';

/**
 * (Function meaning): `Footer` renders a small strip: text links first, then the current year in the copyright line. `new Date().getFullYear()` picks this calendar year so you do not edit the year by hand each January.
 * (External references): Used inside [LandingPage.js] at the bottom of the main column.
 */
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-sheet" role="contentinfo">
      <div className="footer-sheet__inner">
        {/*
         * (Function meaning): The `nav` row shows Privacy, Terms, and Contact side by side (centered), then the copyright line sits under that row. `aria-label` names the link group for screen readers. `href="#"` is a placeholder until real routes exist.
         * (External references): [Footer.css] classes `footer-sheet__inner`, `footer-sheet__nav`, `footer-sheet__legal`, etc.
         */}
        <nav className="footer-sheet__nav" aria-label="Footer">
          <a className="footer-sheet__link" href="#">
            Privacy
          </a>
          <a className="footer-sheet__link" href="#">
            Terms
          </a>
          <a className="footer-sheet__link" href="#">
            Contact
          </a>
        </nav>

        <p className="footer-sheet__legal">© {year} LynkFi</p>
      </div>
    </footer>
  );
}

export default Footer;

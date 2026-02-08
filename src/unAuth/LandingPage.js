import './LandingPage.css';

const RAINBOW = ['#e81416', '#ffa500', '#faeb36', '#79c314', '#487de7', '#4b369d', '#70369d'];

function LandingPage() {
  const text = 'This is kinda hard yo';
  return (
    <div className="landing-page">
      <h1 className="rainbow-text">
        {text.split('').map((char, i) => (
          <span key={i} style={{ color: RAINBOW[i % RAINBOW.length] }}>
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </h1>
    </div>
  );
}

export default LandingPage;

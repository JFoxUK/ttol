import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { createRoot } from 'react-dom/client';
import logo from './logo.jpg';

export function Splash() {
  return (
    <main className="shell splash-shell">
      <section className="card splash-card">
        <div className="splash-copy">
          <div className="badge-row">
            <span className="badge">Two truths · one lie</span>
          </div>
          <div>
            <h2>Guess the lie</h2>
            <p className="muted tiny">
              {context.username ? `Hey u/${context.username} — ` : ''}
              lock in a guess, compare with everyone else, then wait for the reveal.
            </p>
          </div>
          <div className="actions">
            <button
              className="primary"
              onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
            >
              Play now
            </button>
          </div>
        </div>

        <div className="splash-logo-wrap">
          <img className="splash-logo" src={logo} alt="Two truths and a lie" />
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Splash />);

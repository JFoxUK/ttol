import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { createRoot } from 'react-dom/client';

export function Splash() {
  return (
    <main className="shell">
      <section className="card hero">
        <div className="badge-row">
          <span className="badge">Reddit party game</span>
        </div>
        <div>
          <h2>Two truths and one lie</h2>
          <p className="muted tiny">
            {context.username ? `Hey u/${context.username},` : 'Open the game'} guess the lie,
            compare your instincts with everyone else, and wait for the creator reveal.
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
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Splash />);

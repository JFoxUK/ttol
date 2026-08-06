import './index.css';

import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import type { InitResponse } from '../shared/api';
import logo from './logo.jpg';

export function Splash() {
  const [title, setTitle] = useState('Guess the lie');
  const [theme, setTheme] = useState('');
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/init');
        const json = (await response.json()) as InitResponse;
        if (!response.ok || json.status !== 'ok') {
          return;
        }

        setTitle(json.game.title || 'Guess the lie');
        setTheme(json.game.theme || '');
        setCreatorUsername(json.game.creatorUsername);
        setIsConfigured(json.game.isConfigured);
      } catch {
        // Keep the default splash copy if init is unavailable.
      }
    })();
  }, []);

  return (
    <main className="shell splash-shell">
      <section className="card splash-card">
        <div className="splash-copy">
          <div className="badge-row">
            <span className="badge">Two truths · one lie</span>
            {theme ? <span className="badge theme-badge">{theme}</span> : null}
            {creatorUsername ? <span className="badge">u/{creatorUsername}</span> : null}
          </div>
          <div>
            <h2>{isConfigured ? title : 'Guess the lie'}</h2>
            <p className="muted tiny">
              {context.username ? `Hey u/${context.username} — ` : ''}
              {theme
                ? `this round’s theme is ${theme}. Lock in a guess, then wait for the reveal.`
                : 'lock in a guess, compare with everyone else, then wait for the reveal.'}
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

import './index.css';

import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  ApiResponse,
  InitResponse,
  RevealResponse,
  SaveGameRequest,
  SaveGameResponse,
  VoteRequest,
  VoteResponse,
} from '../shared/api';
import type { GameSetup, GameState, StatementId } from '../shared/types';

const initialSetup: GameSetup = {
  title: 'Two truths and one lie',
  theme: '',
  truth1: '',
  truth2: '',
  lie: '',
};

async function callApi<T extends ApiResponse>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const json = (await response.json()) as T;

  if (!response.ok || json.status === 'error') {
    throw new Error(json.status === 'error' ? json.message : 'Request failed');
  }

  return json;
}

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<StatementId | null>(null);
  const [setup, setSetup] = useState<GameSetup>(initialSetup);

  useEffect(() => {
    void (async () => {
      try {
        const response = await callApi<InitResponse>('/api/init');
        setGame(response.game);
        setSetup({
          title: response.game.title || initialSetup.title,
          theme: response.game.theme,
          truth1: response.game.statements.find((statement) => statement.id === 0)?.text ?? '',
          truth2: response.game.statements.find((statement) => statement.id === 1)?.text ?? '',
          lie: response.game.statements.find((statement) => statement.id === 2)?.text ?? '',
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load the game.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const orderedStatements = useMemo(() => {
    if (!game) {
      return [];
    }

    return game.orderedStatementIds
      .map((id) => game.statements.find((statement) => statement.id === id))
      .filter((statement): statement is NonNullable<typeof statement> => Boolean(statement));
  }, [game]);

  const submitSetup = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await callApi<SaveGameResponse>('/api/setup', {
        method: 'POST',
        body: JSON.stringify(setup satisfies SaveGameRequest),
      });
      setGame(response.game);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to save the game.');
    } finally {
      setSaving(false);
    }
  };

  const submitVote = async () => {
    if (selection === null) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await callApi<VoteResponse>('/api/vote', {
        method: 'POST',
        body: JSON.stringify({ statementId: selection } satisfies VoteRequest),
      });
      setGame(response.game);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to submit vote.');
    } finally {
      setSaving(false);
    }
  };

  const reveal = async () => {
    try {
      setSaving(true);
      setError(null);
      const response = await callApi<RevealResponse>('/api/reveal', {
        method: 'POST',
      });
      setGame(response.game);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to reveal the lie.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="shell">
        <section className="card hero empty-state">
          <h2>Loading game...</h2>
          <p className="muted">Pulling the truths, the lie, and the vote totals.</p>
        </section>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="shell">
        <section className="card hero empty-state">
          <h2>Could not load this post</h2>
          <p className="error">{error ?? 'Unknown error'}</p>
        </section>
      </main>
    );
  }

  const userPickedLie = game.userVote !== null && game.userVote === 2;

  return (
    <main className="shell">
      <section className="card hero">
        <div className="badge-row">
          <span className="badge">u/{game.creatorUsername ?? 'unknown'}</span>
          {game.theme ? <span className="badge">{game.theme}</span> : null}
          <span className="badge">{game.totalVotes} guesses locked in</span>
        </div>

        <div>
          <h1>{game.title}</h1>
          <p className="muted tiny">
            Pick the lie. Results unlock right after your guess, and the creator can reveal the
            answer once the round is ready.
          </p>
        </div>

        {error ? <p className="error">{error}</p> : null}

        {game.canEdit ? (
          <>
            <div>
              <h3>Finish setting up your game</h3>
              <p className="muted tiny">
                Improvement from the old version: creators can now create the post first, then
                finish authoring it inside the game with better validation.
              </p>
            </div>

            <div className="field-grid">
              <label>
                Title
                <input
                  value={setup.title}
                  maxLength={90}
                  onChange={(event) => setSetup((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label>
                Theme (optional)
                <input
                  value={setup.theme}
                  maxLength={40}
                  placeholder="Icebreaker, travel, college, food..."
                  onChange={(event) => setSetup((current) => ({ ...current, theme: event.target.value }))}
                />
              </label>
              <label>
                Truth #1
                <textarea
                  value={setup.truth1}
                  maxLength={140}
                  onChange={(event) =>
                    setSetup((current) => ({ ...current, truth1: event.target.value }))
                  }
                />
              </label>
              <label>
                Truth #2
                <textarea
                  value={setup.truth2}
                  maxLength={140}
                  onChange={(event) =>
                    setSetup((current) => ({ ...current, truth2: event.target.value }))
                  }
                />
              </label>
              <label>
                Lie
                <textarea
                  value={setup.lie}
                  maxLength={140}
                  onChange={(event) => setSetup((current) => ({ ...current, lie: event.target.value }))}
                />
              </label>
            </div>

            <div className="footer-actions">
              <button className="primary" disabled={saving} onClick={submitSetup}>
                {saving ? 'Saving...' : 'Publish game'}
              </button>
            </div>
          </>
        ) : !game.isConfigured ? (
          <div className="empty-state">
            <h3>Waiting on the creator</h3>
            <p className="muted">
              The post exists, but the creator has not finished writing their truths and lie yet.
            </p>
          </div>
        ) : !game.hasVoted && !game.canReveal ? (
          <>
            <div className="statement-list">
              {orderedStatements.map((statement) => (
                <button
                  key={statement.id}
                  className={`statement-card ${selection === statement.id ? 'selected' : ''}`}
                  onClick={() => setSelection(statement.id)}
                >
                  <div className="statement-title">
                    <strong>
                      {selection === statement.id ? 'Your pick' : 'Choose this'}
                    </strong>
                    <span className="badge">{statement.id === 2 ? '???' : 'Maybe true'}</span>
                  </div>
                  <div>{statement.text}</div>
                </button>
              ))}
            </div>

            <div className="footer-actions">
              <button className="primary" disabled={selection === null || saving} onClick={submitVote}>
                {saving ? 'Locking in...' : 'Lock in my guess'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="statement-list">
              {orderedStatements.map((statement) => {
                const votes = game.voteCounts[statement.id];
                const percentage = game.totalVotes ? Math.round((votes / game.totalVotes) * 100) : 0;
                const isUserChoice = game.userVote === statement.id;
                const revealLie = game.isRevealed && statement.isLie;

                return (
                  <div
                    key={statement.id}
                    className={`statement-card ${isUserChoice ? 'selected' : ''} ${revealLie ? 'correct' : ''}`}
                  >
                    <div className="statement-title">
                      <strong>
                        {isUserChoice ? 'Your guess' : 'Community result'}
                      </strong>
                      <span className="badge">
                        {votes} vote{votes === 1 ? '' : 's'} - {percentage}%
                      </span>
                    </div>
                    <div>{statement.text}</div>
                    {revealLie ? (
                      <p className="badge" style={{ marginTop: '0.8rem' }}>
                        The creator revealed this was the lie.
                      </p>
                    ) : null}
                    <div className="bar">
                      <span className={revealLie ? 'lie' : ''} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ padding: '1rem 1.1rem' }}>
              <h3 style={{ marginTop: 0 }}>
                {game.isRevealed
                  ? userPickedLie
                    ? 'Nice read - you found the lie.'
                    : 'The lie is out. Better luck next round.'
                  : game.canReveal
                    ? 'You can reveal the answer when you are ready.'
                    : 'Results are live. Waiting on the creator reveal.'}
              </h3>
              <p className="muted tiny" style={{ marginBottom: 0 }}>
                Improved from the old version: the statement order is stable per viewer, vote
                submission is server-authoritative, and your own guess stays highlighted in results.
              </p>
            </div>

            {game.canReveal ? (
              <div className="footer-actions">
                <button className="danger" disabled={saving} onClick={reveal}>
                  {saving ? 'Revealing...' : 'Reveal the lie'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

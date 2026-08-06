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
      <section className={`card hero ${game.canEdit ? 'setup-card' : ''}`}>
        {game.canEdit ? (
          <>
            <div className="setup-header">
              <div>
                <h1>Set up your game</h1>
                <p className="muted tiny">Write two truths and one lie. Keep each statement under 140 characters.</p>
              </div>
              <span className="badge">u/{game.creatorUsername ?? 'unknown'}</span>
            </div>

            <div className="field-grid compact">
              <div className="field-row">
                <label>
                  Title
                  <input
                    value={setup.title}
                    maxLength={90}
                    onChange={(event) => {
                      setError(null);
                      setSetup((current) => ({ ...current, title: event.target.value }));
                    }}
                  />
                </label>
                <label>
                  Theme
                  <input
                    value={setup.theme}
                    maxLength={40}
                    placeholder="Optional"
                    onChange={(event) => {
                      setError(null);
                      setSetup((current) => ({ ...current, theme: event.target.value }));
                    }}
                  />
                </label>
              </div>
              <label>
                Truth #1
                <input
                  value={setup.truth1}
                  maxLength={140}
                  placeholder="A true statement"
                  onChange={(event) => {
                    setError(null);
                    setSetup((current) => ({ ...current, truth1: event.target.value }));
                  }}
                />
              </label>
              <label>
                Truth #2
                <input
                  value={setup.truth2}
                  maxLength={140}
                  placeholder="Another true statement"
                  onChange={(event) => {
                    setError(null);
                    setSetup((current) => ({ ...current, truth2: event.target.value }));
                  }}
                />
              </label>
              <label>
                The lie
                <input
                  value={setup.lie}
                  maxLength={140}
                  placeholder="A believable lie"
                  onChange={(event) => {
                    setError(null);
                    setSetup((current) => ({ ...current, lie: event.target.value }));
                  }}
                />
              </label>
            </div>

            <div className="footer-actions sticky-actions">
              {error ? <p className="error action-error">{error}</p> : null}
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
        ) : (
          <>
            <div className="badge-row">
              <span className="badge">u/{game.creatorUsername ?? 'unknown'}</span>
              {game.theme ? <span className="badge">{game.theme}</span> : null}
              <span className="badge">{game.totalVotes} guesses locked in</span>
            </div>

            <div>
              <h1>{game.title}</h1>
              <p className="muted tiny">Pick the lie. Results unlock after your guess.</p>
            </div>

            {!game.hasVoted && !game.isCreator ? (
              <>
                <div className="statement-list compact">
                  {orderedStatements.map((statement) => (
                    <button
                      key={statement.id}
                      className={`statement-card ${selection === statement.id ? 'selected' : ''}`}
                      onClick={() => setSelection(statement.id)}
                    >
                      <div className="statement-title">
                        <strong>{selection === statement.id ? 'Your pick' : 'Guess'}</strong>
                      </div>
                      <div>{statement.text}</div>
                    </button>
                  ))}
                </div>

                <div className="footer-actions sticky-actions">
                  {error ? <p className="error action-error">{error}</p> : null}
                  <button className="primary" disabled={selection === null || saving} onClick={submitVote}>
                    {saving ? 'Locking in...' : 'Lock in my guess'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="statement-list compact">
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
                            {game.isCreator
                              ? revealLie
                                ? 'The lie'
                                : 'Statement'
                              : isUserChoice
                                ? 'Your guess'
                                : 'Result'}
                          </strong>
                          <span className="badge">
                            {votes} · {percentage}%
                          </span>
                        </div>
                        <div>{statement.text}</div>
                        {revealLie ? <p className="lie-flag">This was the lie</p> : null}
                        <div className="bar">
                          <span className={revealLie ? 'lie' : ''} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="status-line">
                  <p>
                    {game.isRevealed
                      ? game.isCreator
                        ? 'You revealed the lie for everyone.'
                        : userPickedLie
                          ? 'Nice read — you found the lie.'
                          : 'The lie is out.'
                      : game.isCreator
                        ? 'You can reveal the lie anytime — no vote needed.'
                        : 'Waiting on the creator reveal.'}
                  </p>
                </div>

                {game.canReveal ? (
                  <div className="footer-actions sticky-actions">
                    {error ? <p className="error action-error">{error}</p> : null}
                    <button className="danger" disabled={saving} onClick={reveal}>
                      {saving ? 'Revealing...' : 'Reveal the lie'}
                    </button>
                  </div>
                ) : error ? (
                  <p className="error action-error">{error}</p>
                ) : null}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

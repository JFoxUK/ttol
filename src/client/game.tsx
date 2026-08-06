import './index.css';

import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { showToast } from '@devvit/web/client';
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
import logo from './logo.jpg';

const initialSetup: GameSetup = {
  title: 'Two truths and one lie',
  theme: '',
  truth1: '',
  truth2: '',
  lie: '',
};

type SetupStep = 0 | 1 | 2 | 3 | 4;

const setupSteps = [
  {
    title: 'Name the round',
    hint: 'This is what people see first on your post.',
  },
  {
    title: 'Truth #1',
    hint: 'A real fact about you. Keep it short and believable.',
  },
  {
    title: 'Truth #2',
    hint: 'Another real fact. Make it different from the first.',
  },
  {
    title: 'The lie',
    hint: 'A false statement that still sounds plausible.',
  },
  {
    title: 'Ready to publish?',
    hint: 'Check everything looks right before sharing.',
  },
] as const;

function FieldTip({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="field-tip-row">
      <span>{label}</span>
      <span className="tip" tabIndex={0} aria-label={tip}>
        ?
        <span className="tip-bubble" role="tooltip">
          {tip}
        </span>
      </span>
    </span>
  );
}

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

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

function validateStep(step: SetupStep, setup: GameSetup): string | null {
  if (step === 0) {
    const title = normalize(setup.title);
    const theme = normalize(setup.theme);
    if (!title) return 'Add a title for this round.';
    if (title.length > 90) return 'Keep the title under 90 characters.';
    if (theme.length > 40) return 'Keep the theme under 40 characters.';
    return null;
  }

  if (step === 1 || step === 2 || step === 3) {
    const value =
      step === 1 ? normalize(setup.truth1) : step === 2 ? normalize(setup.truth2) : normalize(setup.lie);
    if (!value) return 'Write something before continuing.';
    if (value.length < 8) return 'Use at least 8 characters.';
    if (value.length > 140) return 'Keep it under 140 characters.';
    return null;
  }

  const values = [normalize(setup.truth1), normalize(setup.truth2), normalize(setup.lie)];
  if (new Set(values.map((value) => value.toLowerCase())).size !== 3) {
    return 'All three statements must be different.';
  }

  return null;
}

function reportError(message: string, setError: (value: string | null) => void) {
  setError(message);
  try {
    showToast({ text: message, appearance: 'caution' });
  } catch {
    // Toast is unavailable outside Reddit; the inline error remains.
  }
}

export function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<StatementId | null>(null);
  const [setup, setSetup] = useState<GameSetup>(initialSetup);
  const [step, setStep] = useState<SetupStep>(0);

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
        reportError(
          caughtError instanceof Error ? caughtError.message : 'Failed to load the game.',
          setError
        );
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

  const updateSetup = <K extends keyof GameSetup>(key: K, value: GameSetup[K]) => {
    setError(null);
    setSetup((current) => ({ ...current, [key]: value }));
  };

  const goNext = () => {
    const message = validateStep(step, setup);
    if (message) {
      reportError(message, setError);
      return;
    }

    setError(null);
    setStep((current) => Math.min(4, current + 1) as SetupStep);
  };

  const goBack = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1) as SetupStep);
  };

  const submitSetup = async () => {
    const message = validateStep(4, setup);
    if (message) {
      reportError(message, setError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const response = await callApi<SaveGameResponse>('/api/setup', {
        method: 'POST',
        body: JSON.stringify(setup satisfies SaveGameRequest),
      });
      setGame(response.game);
    } catch (caughtError) {
      reportError(
        caughtError instanceof Error ? caughtError.message : 'Failed to save the game.',
        setError
      );
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
      reportError(
        caughtError instanceof Error ? caughtError.message : 'Failed to submit vote.',
        setError
      );
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
      reportError(
        caughtError instanceof Error ? caughtError.message : 'Failed to reveal the lie.',
        setError
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="shell">
        <section className="card hero empty-state">
          <img className="inline-logo" src={logo} alt="" />
          <h2>Loading game...</h2>
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
  const currentStep = setupSteps[step];

  return (
    <main className="shell">
      <section className={`card hero ${game.canEdit ? 'setup-card' : ''}`}>
        {game.canEdit ? (
          <>
            <div className="setup-top">
              <img className="brand-mark" src={logo} alt="" />
              <div className="setup-progress" aria-hidden="true">
                {setupSteps.map((_, index) => (
                  <span key={index} className={`dot ${index <= step ? 'active' : ''}`} />
                ))}
              </div>
              <span className="badge">Step {step + 1}/{setupSteps.length}</span>
            </div>

            <div>
              <h1>{currentStep.title}</h1>
              <p className="muted tiny">{currentStep.hint}</p>
            </div>

            <div className="wizard-body">
              {step === 0 ? (
                <div className="field-grid compact">
                  <label>
                    <FieldTip
                      label="Title"
                      tip="The headline for this post, e.g. “Travel stories” or “College edition”."
                    />
                    <input
                      autoFocus
                      value={setup.title}
                      maxLength={90}
                      placeholder="e.g. Two truths and one lie"
                      onChange={(event) => updateSetup('title', event.target.value)}
                    />
                    <span className="field-help">Shown at the top of the game for everyone.</span>
                  </label>
                  <label>
                    <FieldTip
                      label="Theme"
                      tip="Optional category that helps set the vibe, like food, work, or dating."
                    />
                    <input
                      value={setup.theme}
                      maxLength={40}
                      placeholder="Optional — e.g. Travel"
                      onChange={(event) => updateSetup('theme', event.target.value)}
                    />
                    <span className="field-help">Appears as a small tag. Skip if you don’t need one.</span>
                  </label>
                </div>
              ) : null}

              {step === 1 ? (
                <label className="wizard-field">
                  <FieldTip
                    label="Truth #1"
                    tip="Something true about you. Other people will try to guess which statement is fake."
                  />
                  <input
                    autoFocus
                    value={setup.truth1}
                    maxLength={140}
                    placeholder="e.g. I have lived in three countries"
                    onChange={(event) => updateSetup('truth1', event.target.value)}
                  />
                  <span className="field-help">Must be true. Aim for something interesting but not obvious.</span>
                </label>
              ) : null}

              {step === 2 ? (
                <label className="wizard-field">
                  <FieldTip
                    label="Truth #2"
                    tip="A second true statement. Keep it different from Truth #1 so the lie isn’t easy to spot."
                  />
                  <input
                    autoFocus
                    value={setup.truth2}
                    maxLength={140}
                    placeholder="e.g. I once met my favourite band"
                    onChange={(event) => updateSetup('truth2', event.target.value)}
                  />
                  <span className="field-help">Also true. Mix surprising with everyday for better guessing.</span>
                </label>
              ) : null}

              {step === 3 ? (
                <label className="wizard-field">
                  <FieldTip
                    label="The lie"
                    tip="This is the fake one. Make it sound real so people have a hard time spotting it."
                  />
                  <input
                    autoFocus
                    value={setup.lie}
                    maxLength={140}
                    placeholder="e.g. I am afraid of roller coasters"
                    onChange={(event) => updateSetup('lie', event.target.value)}
                  />
                  <span className="field-help">False on purpose. You’ll reveal this later for everyone.</span>
                </label>
              ) : null}

              {step === 4 ? (
                <div className="review-list">
                  <div className="review-item">
                    <span className="muted tiny">Title — post headline</span>
                    <strong>{normalize(setup.title)}</strong>
                  </div>
                  {normalize(setup.theme) ? (
                    <div className="review-item">
                      <span className="muted tiny">Theme — optional category tag</span>
                      <strong>{normalize(setup.theme)}</strong>
                    </div>
                  ) : null}
                  <div className="review-item">
                    <span className="muted tiny">Truth #1 — real statement</span>
                    <strong>{normalize(setup.truth1)}</strong>
                  </div>
                  <div className="review-item">
                    <span className="muted tiny">Truth #2 — real statement</span>
                    <strong>{normalize(setup.truth2)}</strong>
                  </div>
                  <div className="review-item lie">
                    <span className="muted tiny">The lie — fake statement to guess</span>
                    <strong>{normalize(setup.lie)}</strong>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? <p className="error banner-error">{error}</p> : null}

            <div className="footer-actions wizard-actions">
              {step > 0 ? (
                <button className="secondary" disabled={saving} onClick={goBack}>
                  Back
                </button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <button className="primary" onClick={goNext}>
                  Next
                </button>
              ) : (
                <button className="primary" disabled={saving} onClick={submitSetup}>
                  {saving ? 'Publishing...' : 'Publish game'}
                </button>
              )}
            </div>
          </>
        ) : !game.isConfigured ? (
          <div className="empty-state">
            <img className="inline-logo" src={logo} alt="" />
            <h3>Waiting on the creator</h3>
            <p className="muted">
              The post exists, but the creator has not finished writing their truths and lie yet.
            </p>
          </div>
        ) : (
          <>
            <div className="play-header">
              <img className="brand-mark" src={logo} alt="" />
              <div className="badge-row">
                <span className="badge">u/{game.creatorUsername ?? 'unknown'}</span>
                {game.theme ? <span className="badge">{game.theme}</span> : null}
                <span className="badge">{game.totalVotes} guesses</span>
              </div>
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

                {error ? <p className="error banner-error">{error}</p> : null}

                <div className="footer-actions wizard-actions">
                  <span />
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

                {error ? <p className="error banner-error">{error}</p> : null}

                {game.canReveal ? (
                  <div className="footer-actions wizard-actions">
                    <span />
                    <button className="danger" disabled={saving} onClick={reveal}>
                      {saving ? 'Revealing...' : 'Reveal the lie'}
                    </button>
                  </div>
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

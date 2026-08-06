import { context, redis, reddit } from '@devvit/web/server';
import type { GameSetup, GameState, StatementId, StoredGame } from '../../shared/types';

const DEFAULT_SETUP: GameSetup = {
  title: 'Two truths and one lie',
  theme: '',
  truth1: '',
  truth2: '',
  lie: '',
};

const statementIds: StatementId[] = [0, 1, 2];

const postKey = (postId: string) => `post:${postId}`;
const voteCountsKey = (postId: string) => `post:${postId}:voteCounts`;
const voteKey = (postId: string, username: string) => `post:${postId}:vote:${username.toLowerCase()}`;

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

const sameUser = (left: string | null | undefined, right: string | null | undefined) =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const stableOrder = (postId: string, username: string | null): StatementId[] => {
  const items: StatementId[] = [...statementIds];
  let seed = hashSeed(`${postId}:${username ?? 'anonymous'}`);
  for (let i = items.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export const validateSetup = (setup: GameSetup): string | null => {
  const title = normalize(setup.title);
  const theme = normalize(setup.theme);
  const truth1 = normalize(setup.truth1);
  const truth2 = normalize(setup.truth2);
  const lie = normalize(setup.lie);

  if (!title || !truth1 || !truth2 || !lie) {
    return 'Add a title plus all three statements.';
  }

  if (title.length > 90) {
    return 'Keep the title under 90 characters.';
  }

  if (theme.length > 40) {
    return 'Keep the theme under 40 characters.';
  }

  for (const statement of [truth1, truth2, lie]) {
    if (statement.length < 8) {
      return 'Each statement should be at least 8 characters long.';
    }

    if (statement.length > 140) {
      return 'Each statement must stay under 140 characters.';
    }
  }

  const uniqueStatements = new Set([truth1.toLowerCase(), truth2.toLowerCase(), lie.toLowerCase()]);
  if (uniqueStatements.size !== 3) {
    return 'All three statements must be different.';
  }

  return null;
};

export const sanitizeSetup = (setup: GameSetup): GameSetup => ({
  title: normalize(setup.title),
  theme: normalize(setup.theme),
  truth1: normalize(setup.truth1),
  truth2: normalize(setup.truth2),
  lie: normalize(setup.lie),
});

const parseStoredGame = (stored: Record<string, string>): StoredGame => ({
  title: stored.title ?? DEFAULT_SETUP.title,
  theme: stored.theme ?? DEFAULT_SETUP.theme,
  truth1: stored.truth1 ?? DEFAULT_SETUP.truth1,
  truth2: stored.truth2 ?? DEFAULT_SETUP.truth2,
  lie: stored.lie ?? DEFAULT_SETUP.lie,
  creatorId: stored.creatorId ?? '',
  creatorUsername: stored.creatorUsername ?? '',
  createdAt: stored.createdAt ?? new Date(0).toISOString(),
  isConfigured: stored.isConfigured === 'true',
  isRevealed: stored.isRevealed === 'true',
});

const readVoteCounts = async (postId: string): Promise<Record<StatementId, number>> => {
  const stored = await redis.hGetAll(voteCountsKey(postId));
  return {
    0: Number.parseInt(stored?.['0'] ?? '0', 10) || 0,
    1: Number.parseInt(stored?.['1'] ?? '0', 10) || 0,
    2: Number.parseInt(stored?.['2'] ?? '0', 10) || 0,
  };
};

const getViewerIdentity = async () => {
  const username = (await reddit.getCurrentUsername()) ?? context.username ?? null;
  return {
    userId: context.userId ?? null,
    username,
  };
};

const isCreatorOf = (
  game: StoredGame,
  viewer: { userId: string | null; username: string | null }
) => {
  if (game.creatorId && viewer.userId && game.creatorId === viewer.userId) {
    return true;
  }

  return sameUser(game.creatorUsername, viewer.username);
};

export const initializePost = async (
  postId: string,
  creator: { userId: string | null; username: string | null }
) => {
  await redis.hSet(postKey(postId), {
    ...DEFAULT_SETUP,
    creatorId: creator.userId ?? '',
    creatorUsername: creator.username ?? '',
    createdAt: new Date().toISOString(),
    isConfigured: 'false',
    isRevealed: 'false',
  });

  await redis.hSet(voteCountsKey(postId), {
    0: '0',
    1: '0',
    2: '0',
  });
};

export const buildGameState = async (postId: string): Promise<GameState> => {
  const [stored, voteCounts, viewer] = await Promise.all([
    redis.hGetAll(postKey(postId)),
    readVoteCounts(postId),
    getViewerIdentity(),
  ]);

  const game = parseStoredGame(stored ?? {});
  const username = viewer.username;
  const isCreator = isCreatorOf(game, viewer);
  const canEdit = Boolean(isCreator && !game.isConfigured);
  const canReveal = Boolean(isCreator && game.isConfigured && !game.isRevealed);
  const savedVote = username ? await redis.get(voteKey(postId, username)) : null;
  const userVote = savedVote == null ? null : (Number.parseInt(savedVote, 10) as StatementId);
  const hasVoted = userVote !== null;
  const orderedStatementIds = stableOrder(postId, username);
  const statements = [
    { id: 0 as StatementId, text: game.truth1, isLie: false },
    { id: 1 as StatementId, text: game.truth2, isLie: false },
    { id: 2 as StatementId, text: game.lie, isLie: false },
  ].map((statement) =>
    game.isRevealed
      ? {
          ...statement,
          isLie: statement.id === 2,
        }
      : statement
  );

  return {
    postId,
    viewerUsername: username,
    creatorUsername: game.creatorUsername || null,
    isCreator,
    canEdit,
    canReveal,
    isConfigured: game.isConfigured,
    isRevealed: game.isRevealed,
    hasVoted,
    userVote,
    totalVotes: voteCounts[0] + voteCounts[1] + voteCounts[2],
    title: game.title,
    theme: game.theme,
    statements,
    orderedStatementIds,
    voteCounts,
  };
};

export const saveGame = async (postId: string, setup: GameSetup) => {
  const viewer = await getViewerIdentity();
  const stored = parseStoredGame((await redis.hGetAll(postKey(postId))) ?? {});

  if (!isCreatorOf(stored, viewer)) {
    throw new Error('Only the creator can finish setting up this game.');
  }

  if (stored.isConfigured) {
    throw new Error('This game is already configured.');
  }

  const validationError = validateSetup(setup);
  if (validationError) {
    throw new Error(validationError);
  }

  const sanitized = sanitizeSetup(setup);
  await redis.hSet(postKey(postId), {
    ...sanitized,
    creatorId: stored.creatorId || viewer.userId || '',
    creatorUsername: stored.creatorUsername || viewer.username || '',
    createdAt: stored.createdAt,
    isConfigured: 'true',
    isRevealed: 'false',
  });
};

export const submitVote = async (postId: string, statementId: StatementId) => {
  const viewer = await getViewerIdentity();
  if (!viewer.username) {
    throw new Error('Sign in to vote.');
  }

  if (!statementIds.includes(statementId)) {
    throw new Error('That answer is not valid.');
  }

  const stored = parseStoredGame((await redis.hGetAll(postKey(postId))) ?? {});
  if (!stored.isConfigured) {
    throw new Error('This game has not been configured yet.');
  }

  if (isCreatorOf(stored, viewer)) {
    throw new Error('Creators cannot vote on their own game. Use Reveal instead.');
  }

  const existingVote = await redis.get(voteKey(postId, viewer.username));
  if (existingVote !== null) {
    throw new Error('You already locked in a guess for this game.');
  }

  await redis.set(voteKey(postId, viewer.username), String(statementId));
  await redis.hSet(voteCountsKey(postId), {
    [statementId]: String((await readVoteCounts(postId))[statementId] + 1),
  });
};

export const revealLie = async (postId: string) => {
  const viewer = await getViewerIdentity();
  const stored = parseStoredGame((await redis.hGetAll(postKey(postId))) ?? {});

  if (!isCreatorOf(stored, viewer)) {
    throw new Error('Only the creator can reveal the lie.');
  }

  if (!stored.isConfigured) {
    throw new Error('Finish setting up the game before revealing.');
  }

  await redis.hSet(postKey(postId), {
    ...stored,
    creatorId: stored.creatorId || viewer.userId || '',
    creatorUsername: stored.creatorUsername || viewer.username || '',
    isConfigured: 'true',
    isRevealed: 'true',
  });
};

import { Hono } from 'hono';
import type {
  ErrorResponse,
  InitResponse,
  RevealResponse,
  SaveGameRequest,
  SaveGameResponse,
  VoteRequest,
  VoteResponse,
} from '../../shared/api';
import { context } from '@devvit/web/server';
import { buildGameState, revealLie, saveGame, submitVote } from '../core/game';

export const api = new Hono();

const requirePostId = () => {
  if (!context.postId) {
    throw new Error('postId is required but missing from the current context.');
  }

  return context.postId;
};

const handleError = (error: unknown): ErrorResponse => ({
  status: 'error',
  message: error instanceof Error ? error.message : 'Unknown error',
});

api.get('/init', async (c) => {
  try {
    const postId = requirePostId();
    const game = await buildGameState(postId);
    return c.json<InitResponse>({ status: 'ok', game });
  } catch (error) {
    console.error('Init failed:', error);
    return c.json(handleError(error), 400);
  }
});

api.post('/setup', async (c) => {
  try {
    const postId = requirePostId();
    const body = (await c.req.json()) as SaveGameRequest;
    await saveGame(postId, body);
    const game = await buildGameState(postId);
    return c.json<SaveGameResponse>({ status: 'ok', game });
  } catch (error) {
    console.error('Setup failed:', error);
    return c.json(handleError(error), 400);
  }
});

api.post('/vote', async (c) => {
  try {
    const postId = requirePostId();
    const body = (await c.req.json()) as VoteRequest;
    await submitVote(postId, body.statementId);
    const game = await buildGameState(postId);
    return c.json<VoteResponse>({ status: 'ok', game });
  } catch (error) {
    console.error('Vote failed:', error);
    return c.json(handleError(error), 400);
  }
});

api.post('/reveal', async (c) => {
  try {
    const postId = requirePostId();
    await revealLie(postId);
    const game = await buildGameState(postId);
    return c.json<RevealResponse>({ status: 'ok', game });
  } catch (error) {
    console.error('Reveal failed:', error);
    return c.json(handleError(error), 400);
  }
});

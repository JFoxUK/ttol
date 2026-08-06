import type { GameSetup, GameState, StatementId } from './types';

export interface ErrorResponse {
  status: 'error';
  message: string;
}

export interface InitResponse {
  status: 'ok';
  game: GameState;
}

export type SaveGameRequest = GameSetup;

export interface SaveGameResponse {
  status: 'ok';
  game: GameState;
}

export interface VoteRequest {
  statementId: StatementId;
}

export interface VoteResponse {
  status: 'ok';
  game: GameState;
}

export interface RevealResponse {
  status: 'ok';
  game: GameState;
}

export type ApiResponse = InitResponse | SaveGameResponse | VoteResponse | RevealResponse | ErrorResponse;

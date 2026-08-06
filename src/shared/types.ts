export type StatementId = 0 | 1 | 2;

export interface GameSetup {
  title: string;
  theme: string;
  truth1: string;
  truth2: string;
  lie: string;
}

export interface StoredGame extends GameSetup {
  creatorId: string;
  creatorUsername: string;
  createdAt: string;
  isConfigured: boolean;
  isRevealed: boolean;
}

export interface StatementView {
  id: StatementId;
  text: string;
  isLie: boolean;
}

export interface GameState {
  postId: string;
  viewerUsername: string | null;
  creatorUsername: string | null;
  isCreator: boolean;
  canEdit: boolean;
  canReveal: boolean;
  isConfigured: boolean;
  isRevealed: boolean;
  hasVoted: boolean;
  userVote: StatementId | null;
  totalVotes: number;
  title: string;
  theme: string;
  statements: StatementView[];
  orderedStatementIds: StatementId[];
  voteCounts: Record<StatementId, number>;
}

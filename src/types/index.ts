// ─── Game Types ───────────────────────────────────────────────

export type GameStatus = 'waiting' | 'active' | 'paused' | 'finished' | 'revealing_answer';
export type RevealOrder = 'random' | 'sequential';
export type RevealMode = 'auto' | 'manual';

export interface Photo {
  id: string;
  gameId: string;
  title: string;           // The correct answer
  hints: string[];
  filePath: string;
  sortOrder: number;
  category: string;
}

export interface GameSettings {
  revealDuration: number;     // total seconds for full reveal
  revealInterval: number;     // seconds between each tile reveal
  gridRows: number;
  gridCols: number;
  revealOrder: RevealOrder;
  revealMode: RevealMode;
  hintsEnabled: boolean;
  timerEnabled: boolean;
  multipleAttempts: boolean;
}

export interface RevealState {
  photoId: string;
  revealedTiles: number[];    // indices of tiles that have been revealed
  timerRemaining: number;
  isAnswerShown: boolean;
  currentHintIndex: number;
}

export interface GameState {
  id: string;
  gameId?: string;
  name: string;
  status: GameStatus;
  currentPhotoIndex: number;
  totalPhotos?: number;
  photos: Photo[];
  currentPhoto?: Photo | null;
  settings: GameSettings;
  revealState: RevealState | null;
  scores: PlayerScore[];
  createdAt?: string;
}

export interface PlayerScore {
  id: string;
  playerName: string;
  score: number;
  correctAnswers: number;
  totalAttempts: number;
}

export interface Submission {
  id: string;
  gameId: string;
  photoId: string;
  playerName: string;
  guess: string;
  isCorrect: boolean;
  submittedAt: string;
  tilesRevealedAtGuess: number;
}

// ─── Socket Events ────────────────────────────────────────────

export interface ServerToClientEvents {
  'game:state': (state: GameState) => void;
  'game:state-update': (state: GameState) => void;
  'game:reveal-tile': (data: { tileIndex: number; revealedTiles: number[] }) => void;
  'game:tile-revealed'?: (data: { tileIndex: number; revealedTiles: number[] }) => void;
  'game:timer-tick': (data: { remaining: number }) => void;
  'game:answer-result': (data: { isCorrect: boolean; message: string; score?: number }) => void;
  'game:show-answer': (data: { answer: string; photoUrl: string }) => void;
  'game:scores-update': (scores: PlayerScore[]) => void;
  'game:hint': (data: { hint: string; index: number }) => void;
  'game:photo-changed': (data: { photoIndex: number }) => void;
  'game:finished': (data: { scores: PlayerScore[] }) => void;
}

export interface ClientToServerEvents {
  'admin:create-game': (data: { name: string }, cb: (game: GameState) => void) => void;
  'admin:upload-photo': (data: { gameId: string; photoId: string }) => void;
  'admin:update-settings': (data: { gameId: string; settings: Partial<GameSettings> }) => void;
  'admin:start-game': (data: { gameId: string }) => void;
  'admin:pause-game': (data: { gameId: string }) => void;
  'admin:resume-game': (data: { gameId: string }) => void;
  'admin:reveal-next': (data: { gameId: string }) => void;
  'admin:reveal-all': (data: { gameId: string }) => void;
  'admin:skip-photo': (data: { gameId: string }) => void;
  'admin:next-photo': (data: { gameId: string }) => void;
  'admin:show-answer': (data: { gameId: string }) => void;
  'admin:restart-round': (data: { gameId: string }) => void;
  'admin:end-game': (data: { gameId: string }) => void;
  'admin:show-hint': (data: { gameId: string }) => void;
  'admin:reorder-photos': (data: { gameId: string; photoIds: string[] }) => void;
  'admin:delete-photo': (data: { gameId: string; photoId: string }) => void;
  'player:join': (data: { gameId: string; playerName: string }, cb: (result: { success: boolean; playerId?: string }) => void) => void;
  'player:guess': (data: { gameId: string; playerId: string; guess: string }) => void;
  'game:request-state': (data: { gameId: string; isAdmin?: boolean }) => void;
}

export const DEFAULT_SETTINGS: GameSettings = {
  revealDuration: 60,
  revealInterval: 3,
  gridRows: 4,
  gridCols: 4,
  revealOrder: 'random',
  revealMode: 'auto',
  hintsEnabled: true,
  timerEnabled: true,
  multipleAttempts: true,
};

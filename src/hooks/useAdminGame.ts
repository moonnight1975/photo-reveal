import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';
import type { GameState, GameSettings, Photo, PlayerScore } from '../types';

function getGameId(game: GameState): string {
  return game.id || game.gameId || '';
}

interface UseAdminGameReturn {
  game: GameState | null;
  games: GameState[];
  loading: boolean;
  error: string | null;
  createGame: (name: string) => Promise<void>;
  selectGame: (gameId: string) => Promise<void>;
  deselectGame: () => void;
  uploadPhoto: (gameId: string, file: File, title: string, hints: string[], category: string) => Promise<void>;
  updatePhoto: (gameId: string, photoId: string, data: Partial<Photo>) => Promise<void>;
  deletePhoto: (gameId: string, photoId: string) => void;
  reorderPhotos: (gameId: string, photoIds: string[]) => Promise<void>;
  updateSettings: (gameId: string, settings: Partial<GameSettings>) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  revealNext: () => void;
  revealAll: () => void;
  skipPhoto: () => void;
  nextPhoto: () => void;
  showAnswer: () => void;
  restartRound: () => void;
  endGame: () => void;
  showHint: () => void;
}

export function useAdminGame(): UseAdminGameReturn {
  const [game, setGame] = useState<GameState | null>(null);
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentGameIdRef = useRef<string | null>(null);

  // Fetch all games on mount
  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/games');
        if (!res.ok) throw new Error('Failed to fetch games');
        const data = await res.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch games');
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();

    const handleGameState = (state: GameState) => {
      const stateId = getGameId(state);
      if (stateId === currentGameIdRef.current) {
        setGame(state);
      }
      setGames((prev) =>
        prev.map((g) => (getGameId(g) === stateId ? { ...g, ...state } : g))
      );
    };

    const handleRevealTile = (data: { tileIndex: number; revealedTiles: number[] }) => {
      setGame((prev) => {
        if (!prev || !prev.revealState) return prev;
        return {
          ...prev,
          revealState: {
            ...prev.revealState,
            revealedTiles: data.revealedTiles,
          },
        };
      });
    };

    const handleTimerTick = (data: { remaining: number }) => {
      setGame((prev) => {
        if (!prev || !prev.revealState) return prev;
        return {
          ...prev,
          revealState: {
            ...prev.revealState,
            timerRemaining: data.remaining,
          },
        };
      });
    };

    const handleScoresUpdate = (scores: PlayerScore[]) => {
      setGame((prev) => {
        if (!prev) return prev;
        return { ...prev, scores };
      });
    };

    const handleFinished = (data: { scores: PlayerScore[] }) => {
      setGame((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'finished', scores: data.scores };
      });
    };

    const handleShowAnswer = (_data: { answer: string; photoUrl: string }) => {
      setGame((prev) => {
        if (!prev || !prev.revealState) return prev;
        return {
          ...prev,
          status: 'revealing_answer',
          revealState: {
            ...prev.revealState,
            isAnswerShown: true,
          },
        };
      });
    };

    const handlePhotoChanged = (_data: { photoIndex: number }) => {
      // Will be picked up by the next game:state
    };

    socket.on('game:state', handleGameState);
    socket.on('game:state-update', handleGameState);
    socket.on('game:reveal-tile', handleRevealTile);
    socket.on('game:timer-tick', handleTimerTick);
    socket.on('game:scores-update', handleScoresUpdate);
    socket.on('game:finished', handleFinished);
    socket.on('game:show-answer', handleShowAnswer);
    socket.on('game:photo-changed', handlePhotoChanged);

    return () => {
      socket.off('game:state', handleGameState);
      socket.off('game:state-update', handleGameState);
      socket.off('game:reveal-tile', handleRevealTile);
      socket.off('game:timer-tick', handleTimerTick);
      socket.off('game:scores-update', handleScoresUpdate);
      socket.off('game:finished', handleFinished);
      socket.off('game:show-answer', handleShowAnswer);
      socket.off('game:photo-changed', handlePhotoChanged);
    };
  }, []);

  const createGame = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create game');
      const newGame = await res.json();
      currentGameIdRef.current = newGame.id;

      // Join the socket room so we get real-time updates
      const socket = getSocket();
      socket.emit('game:request-state', { gameId: newGame.id, isAdmin: true });

      setGames((prev) => [newGame, ...prev]);
      setGame(newGame);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectGame = useCallback(async (gameId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error('Failed to load game');
      const gameData = await res.json();
      setGame(gameData);
      currentGameIdRef.current = gameId;
      // Join the admin socket room
      const socket = getSocket();
      socket.emit('game:request-state', { gameId, isAdmin: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = useCallback(async (gameId: string, file: File, title: string, hints: string[], category: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category || 'general');
      if (hints.length > 0) {
        formData.append('hints', hints.filter(h => h.trim()).join('||'));
      }

      const res = await fetch(`/api/games/${gameId}/photos`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to upload photo');
      }

      // Refresh game state
      const gameRes = await fetch(`/api/games/${gameId}`);
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGame(gameData);
        setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? gameData : g)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePhoto = useCallback(async (gameId: string, photoId: string, data: Partial<Photo>) => {
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update photo');

      const gameRes = await fetch(`/api/games/${gameId}`);
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGame(gameData);
        setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? gameData : g)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update photo');
    }
  }, []);

  const deletePhoto = useCallback((gameId: string, photoId: string) => {
    // Optimistic update
    setGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        photos: prev.photos.filter((p) => p.id !== photoId),
      };
    });

    // Delete via REST (which also reloads in-memory state)
    fetch(`/api/games/${gameId}/photos/${photoId}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Delete failed');
        return fetch(`/api/games/${gameId}`);
      })
      .then((res) => res.ok ? res.json() : null)
      .then((gameData) => {
        if (gameData) {
          setGame(gameData);
          setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? gameData : g)));
        }
      })
      .catch(() => {
        // Refresh anyway
        fetch(`/api/games/${gameId}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) setGame(d); });
      });
  }, []);

  const reorderPhotos = useCallback(async (gameId: string, photoIds: string[]) => {
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/photos/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
      });
      if (!res.ok) throw new Error('Failed to reorder photos');

      const gameRes = await fetch(`/api/games/${gameId}`);
      if (gameRes.ok) {
        const gameData = await gameRes.json();
        setGame(gameData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder photos');
    }
  }, []);

  const updateSettings = useCallback((gameId: string, settings: Partial<GameSettings>) => {
    const socket = getSocket();
    socket.emit('admin:update-settings', { gameId, settings });
    // Optimistic update
    setGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: { ...prev.settings, ...settings },
      };
    });
  }, []);

  // Game control helpers — emit with game's id
  const emitAction = useCallback((event: string) => {
    const gid = currentGameIdRef.current || (game ? getGameId(game) : null);
    if (!gid) return;
    const socket = getSocket();
    socket.emit(event as any, { gameId: gid }, (res: any) => {
      if (res && !res.success && res.error) {
        setError(res.error);
      }
    });
  }, [game]);

  const startGame  = useCallback(() => emitAction('admin:start-game'), [emitAction]);
  const pauseGame  = useCallback(() => emitAction('admin:pause-game'), [emitAction]);
  const resumeGame = useCallback(() => emitAction('admin:resume-game'), [emitAction]);
  const revealNext = useCallback(() => emitAction('admin:reveal-next'), [emitAction]);
  const revealAll  = useCallback(() => emitAction('admin:reveal-all'), [emitAction]);
  const skipPhoto  = useCallback(() => emitAction('admin:skip-photo'), [emitAction]);
  const nextPhoto  = useCallback(() => emitAction('admin:next-photo'), [emitAction]);
  const showAnswer = useCallback(() => emitAction('admin:show-answer'), [emitAction]);
  const restartRound = useCallback(() => emitAction('admin:restart-round'), [emitAction]);
  const endGame    = useCallback(() => emitAction('admin:end-game'), [emitAction]);
  const showHint   = useCallback(() => emitAction('admin:show-hint'), [emitAction]);

  const deselectGame = useCallback(() => {
    setGame(null);
    currentGameIdRef.current = null;
  }, []);

  return {
    game,
    games,
    loading,
    error,
    createGame,
    selectGame,
    deselectGame,
    uploadPhoto,
    updatePhoto,
    deletePhoto,
    reorderPhotos,
    updateSettings,
    startGame,
    pauseGame,
    resumeGame,
    revealNext,
    revealAll,
    skipPhoto,
    nextPhoto,
    showAnswer,
    restartRound,
    endGame,
    showHint,
  };
}

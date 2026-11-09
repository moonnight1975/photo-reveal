import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseGameService, generateTileOrder } from '../services/supabaseGameService';
import { realtimeBridge } from '../lib/supabaseRealtime';
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
  const gameRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  // Fetch all games on mount
  const refreshGames = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supabaseGameService.getAllGames();
      setGames(data);
      if (currentGameIdRef.current) {
        const found = data.find((g) => getGameId(g) === currentGameIdRef.current);
        if (found) setGame(found);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to fetch games from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshGames();
  }, [refreshGames]);

  // Subscribe to real-time events for the active game
  useEffect(() => {
    const activeId = currentGameIdRef.current;
    if (!activeId) return;

    const handleGameState = (state: GameState) => {
      if (getGameId(state) === currentGameIdRef.current) {
        setGame(state);
      }
      setGames((prev) =>
        prev.map((g) => (getGameId(g) === getGameId(state) ? { ...g, ...state } : g))
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

    realtimeBridge.on(activeId, 'game:state', handleGameState);
    realtimeBridge.on(activeId, 'game:state-update', handleGameState);
    realtimeBridge.on(activeId, 'game:reveal-tile', handleRevealTile);
    realtimeBridge.on(activeId, 'game:timer-tick', handleTimerTick);
    realtimeBridge.on(activeId, 'game:scores-update', handleScoresUpdate);
    realtimeBridge.on(activeId, 'game:finished', handleFinished);
    realtimeBridge.on(activeId, 'game:show-answer', handleShowAnswer);

    return () => {
      realtimeBridge.off(activeId, 'game:state', handleGameState);
      realtimeBridge.off(activeId, 'game:state-update', handleGameState);
      realtimeBridge.off(activeId, 'game:reveal-tile', handleRevealTile);
      realtimeBridge.off(activeId, 'game:timer-tick', handleTimerTick);
      realtimeBridge.off(activeId, 'game:scores-update', handleScoresUpdate);
      realtimeBridge.off(activeId, 'game:finished', handleFinished);
      realtimeBridge.off(activeId, 'game:show-answer', handleShowAnswer);
    };
  }, [game?.id]);

  const selectGame = useCallback(async (gameId: string) => {
    setLoading(true);
    setError(null);
    try {
      const gameData = await supabaseGameService.getGame(gameId, true);
      if (!gameData) throw new Error('Game not found');
      setGame(gameData);
      currentGameIdRef.current = gameId;
      realtimeBridge.getChannel(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, []);

  const deselectGame = useCallback(() => {
    if (currentGameIdRef.current) {
      realtimeBridge.leaveChannel(currentGameIdRef.current);
    }
    setGame(null);
    currentGameIdRef.current = null;
  }, []);

  const createGame = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const newGame = await supabaseGameService.createGame(name);
      currentGameIdRef.current = newGame.id;
      setGames((prev) => [newGame, ...prev]);
      setGame(newGame);
      realtimeBridge.getChannel(newGame.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPhoto = useCallback(
    async (gameId: string, file: File, title: string, hints: string[], category: string) => {
      setLoading(true);
      setError(null);
      try {
        await supabaseGameService.uploadPhoto(gameId, file, title, hints, category);
        const updated = await supabaseGameService.getGame(gameId, true);
        if (updated) {
          setGame(updated);
          setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? updated : g)));
          await realtimeBridge.broadcast(gameId, 'game:state', updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload photo');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updatePhoto = useCallback(
    async (gameId: string, photoId: string, data: Partial<Photo>) => {
      setError(null);
      try {
        await supabaseGameService.updatePhoto(photoId, data);
        const updated = await supabaseGameService.getGame(gameId, true);
        if (updated) {
          setGame(updated);
          setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? updated : g)));
          await realtimeBridge.broadcast(gameId, 'game:state', updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update photo');
      }
    },
    []
  );

  const deletePhoto = useCallback((gameId: string, photoId: string) => {
    setGame((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        photos: prev.photos.filter((p) => p.id !== photoId),
      };
    });

    supabaseGameService
      .deletePhoto(photoId)
      .then(async () => {
        const updated = await supabaseGameService.getGame(gameId, true);
        if (updated) {
          setGame(updated);
          setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? updated : g)));
          await realtimeBridge.broadcast(gameId, 'game:state', updated);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const reorderPhotos = useCallback(async (gameId: string, photoIds: string[]) => {
    setError(null);
    try {
      await supabaseGameService.reorderPhotos(gameId, photoIds);
      const updated = await supabaseGameService.getGame(gameId, true);
      if (updated) {
        setGame(updated);
        setGames((prev) => prev.map((g) => (getGameId(g) === gameId ? updated : g)));
        await realtimeBridge.broadcast(gameId, 'game:state', updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder photos');
    }
  }, []);

  const updateSettings = useCallback(async (gameId: string, settings: Partial<GameSettings>) => {
    try {
      await supabaseGameService.updateSettings(gameId, settings);
      setGame((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          settings: { ...prev.settings, ...settings },
        };
        realtimeBridge.broadcast(gameId, 'game:state', updated);
        return updated;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ─── Game Control Actions ───────────────────────────────────────────────────

  const showAnswer = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    const gameId = getGameId(cur);
    realtimeBridge.stopAutoTimer(gameId);

    const totalTiles = cur.settings.gridRows * cur.settings.gridCols;
    const allRevealed = Array.from({ length: totalTiles }, (_, i) => i);
    const currentPhoto = cur.photos[cur.currentPhotoIndex];

    const updatedState: GameState = {
      ...cur,
      status: 'revealing_answer',
      revealState: cur.revealState
        ? {
            ...cur.revealState,
            isAnswerShown: true,
            revealedTiles: allRevealed,
          }
        : null,
    };

    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'revealing_answer');
    await supabaseGameService.updateRevealState(gameId, {
      is_answer_shown: true,
      revealed_tiles: allRevealed,
    });

    const answerData = {
      answer: currentPhoto?.title || '',
      photoUrl: currentPhoto?.filePath || '',
    };

    await realtimeBridge.broadcast(gameId, 'game:show-answer', answerData);
    await realtimeBridge.broadcast(gameId, 'game:reveal-tile', {
      tileIndex: -1,
      revealedTiles: allRevealed,
    });
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);
  }, []);

  const revealNext = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur || !cur.revealState) return;
    const gameId = getGameId(cur);

    const totalTiles = cur.settings.gridRows * cur.settings.gridCols;
    const currentRevealed = cur.revealState.revealedTiles;

    if (currentRevealed.length >= totalTiles) {
      if (!cur.revealState.isAnswerShown) {
        await showAnswer();
      }
      return;
    }

    // Determine unrevealed tiles
    const unrevealed = Array.from({ length: totalTiles }, (_, i) => i).filter(
      (idx) => !currentRevealed.includes(idx)
    );

    let nextTileIndex: number;
    if (cur.settings.revealOrder === 'sequential') {
      nextTileIndex = unrevealed[0];
    } else {
      nextTileIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    }

    const nextRevealed = [...currentRevealed, nextTileIndex];

    const updatedState: GameState = {
      ...cur,
      revealState: {
        ...cur.revealState,
        revealedTiles: nextRevealed,
      },
    };

    setGame(updatedState);

    await supabaseGameService.updateRevealState(gameId, {
      revealed_tiles: nextRevealed,
    });

    await realtimeBridge.broadcast(gameId, 'game:reveal-tile', {
      tileIndex: nextTileIndex,
      revealedTiles: nextRevealed,
    });
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);

    if (nextRevealed.length >= totalTiles) {
      realtimeBridge.stopAutoTimer(gameId);
      await showAnswer();
    }
  }, [showAnswer]);

  const startAutoRevealLoop = useCallback(
    (gameId: string) => {
      const cur = gameRef.current;
      if (!cur) return;
      const intervalSec = Math.max(1, cur.settings.revealInterval || 3);

      realtimeBridge.startAutoTimer(
        gameId,
        (_elapsed) => {
          const g = gameRef.current;
          if (!g || !g.revealState || g.status !== 'active') return;
          const remaining = Math.max(0, g.revealState.timerRemaining - 1);

          setGame((prev) =>
            prev && prev.revealState
              ? {
                  ...prev,
                  revealState: { ...prev.revealState, timerRemaining: remaining },
                }
              : prev
          );

          realtimeBridge.broadcast(gameId, 'game:timer-tick', { remaining });

          if (g.settings.timerEnabled && remaining <= 0) {
            showAnswer();
          }
        },
        () => {
          revealNext();
        },
        () => {
          showAnswer();
        },
        intervalSec
      );
    },
    [revealNext, showAnswer]
  );

  const startGame = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    if (cur.photos.length === 0) {
      setError('Please upload at least one photo to start the game.');
      return;
    }

    const gameId = getGameId(cur);
    const totalTiles = cur.settings.gridRows * cur.settings.gridCols;
    const initialTileOrder = generateTileOrder(totalTiles, cur.settings.revealOrder);
    const firstPhoto = cur.photos[0];

    const updatedState: GameState = {
      ...cur,
      status: 'active',
      currentPhotoIndex: 0,
      revealState: {
        photoId: firstPhoto?.id || '',
        revealedTiles: [],
        timerRemaining: cur.settings.revealDuration || 60,
        isAnswerShown: false,
        currentHintIndex: -1,
      },
    };

    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'active', 0);
    await supabaseGameService.updateRevealState(gameId, {
      photo_id: firstPhoto?.id || '',
      revealed_tiles: [],
      tile_order: initialTileOrder,
      timer_remaining: cur.settings.revealDuration || 60,
      is_answer_shown: false,
      current_hint_index: -1,
    });

    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);

    if (cur.settings.revealMode === 'auto') {
      startAutoRevealLoop(gameId);
    }
  }, [startAutoRevealLoop]);

  const pauseGame = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    const gameId = getGameId(cur);
    realtimeBridge.stopAutoTimer(gameId);

    const updatedState: GameState = { ...cur, status: 'paused' };
    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'paused');
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);
  }, []);

  const resumeGame = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    const gameId = getGameId(cur);

    const updatedState: GameState = { ...cur, status: 'active' };
    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'active');
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);

    if (cur.settings.revealMode === 'auto') {
      startAutoRevealLoop(gameId);
    }
  }, [startAutoRevealLoop]);

  const revealAll = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur || !cur.revealState) return;
    const gameId = getGameId(cur);
    realtimeBridge.stopAutoTimer(gameId);

    const totalTiles = cur.settings.gridRows * cur.settings.gridCols;
    const allRevealed = Array.from({ length: totalTiles }, (_, i) => i);

    const updatedState: GameState = {
      ...cur,
      revealState: {
        ...cur.revealState,
        revealedTiles: allRevealed,
      },
    };

    setGame(updatedState);

    await supabaseGameService.updateRevealState(gameId, {
      revealed_tiles: allRevealed,
    });

    await realtimeBridge.broadcast(gameId, 'game:reveal-tile', {
      tileIndex: -1,
      revealedTiles: allRevealed,
    });
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);
  }, []);

  const endGame = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    const gameId = getGameId(cur);
    realtimeBridge.stopAutoTimer(gameId);

    const updatedState: GameState = { ...cur, status: 'finished' };
    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'finished');
    await realtimeBridge.broadcast(gameId, 'game:finished', { scores: cur.scores });
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);
  }, []);

  const nextPhoto = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    const gameId = getGameId(cur);
    realtimeBridge.stopAutoTimer(gameId);

    const nextIndex = cur.currentPhotoIndex + 1;
    if (nextIndex >= cur.photos.length) {
      await endGame();
      return;
    }

    const nextPhotoObj = cur.photos[nextIndex];
    const totalTiles = cur.settings.gridRows * cur.settings.gridCols;
    const newTileOrder = generateTileOrder(totalTiles, cur.settings.revealOrder);

    const updatedState: GameState = {
      ...cur,
      status: 'active',
      currentPhotoIndex: nextIndex,
      revealState: {
        photoId: nextPhotoObj?.id || '',
        revealedTiles: [],
        timerRemaining: cur.settings.revealDuration || 60,
        isAnswerShown: false,
        currentHintIndex: -1,
      },
    };

    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'active', nextIndex);
    await supabaseGameService.updateRevealState(gameId, {
      photo_id: nextPhotoObj?.id || '',
      revealed_tiles: [],
      tile_order: newTileOrder,
      timer_remaining: cur.settings.revealDuration || 60,
      is_answer_shown: false,
      current_hint_index: -1,
    });

    await realtimeBridge.broadcast(gameId, 'game:photo-changed', { photoIndex: nextIndex });
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);

    if (cur.settings.revealMode === 'auto') {
      startAutoRevealLoop(gameId);
    }
  }, [endGame, startAutoRevealLoop]);

  const restartRound = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur) return;
    const gameId = getGameId(cur);
    realtimeBridge.stopAutoTimer(gameId);

    const currentPhotoObj = cur.photos[cur.currentPhotoIndex];
    const totalTiles = cur.settings.gridRows * cur.settings.gridCols;
    const newTileOrder = generateTileOrder(totalTiles, cur.settings.revealOrder);

    const updatedState: GameState = {
      ...cur,
      status: 'active',
      revealState: {
        photoId: currentPhotoObj?.id || '',
        revealedTiles: [],
        timerRemaining: cur.settings.revealDuration || 60,
        isAnswerShown: false,
        currentHintIndex: -1,
      },
    };

    setGame(updatedState);

    await supabaseGameService.updateGameStatus(gameId, 'active');
    await supabaseGameService.updateRevealState(gameId, {
      photo_id: currentPhotoObj?.id || '',
      revealed_tiles: [],
      tile_order: newTileOrder,
      timer_remaining: cur.settings.revealDuration || 60,
      is_answer_shown: false,
      current_hint_index: -1,
    });

    await realtimeBridge.broadcast(gameId, 'game:photo-changed', {
      photoIndex: cur.currentPhotoIndex,
    });
    await realtimeBridge.broadcast(gameId, 'game:state', updatedState);

    if (cur.settings.revealMode === 'auto') {
      startAutoRevealLoop(gameId);
    }
  }, [startAutoRevealLoop]);

  const showHint = useCallback(async () => {
    const cur = gameRef.current;
    if (!cur || !cur.revealState) return;
    const currentPhoto = cur.photos[cur.currentPhotoIndex];
    if (!currentPhoto) return;

    const hints = Array.isArray(currentPhoto.hints) ? currentPhoto.hints : [];
    if (cur.revealState.currentHintIndex < hints.length - 1) {
      const nextIndex = cur.revealState.currentHintIndex + 1;
      const gameId = getGameId(cur);

      const updatedState: GameState = {
        ...cur,
        revealState: {
          ...cur.revealState,
          currentHintIndex: nextIndex,
        },
      };

      setGame(updatedState);

      await supabaseGameService.updateRevealState(gameId, {
        current_hint_index: nextIndex,
      });

      const hintData = {
        index: nextIndex,
        hint: hints[nextIndex],
      };

      await realtimeBridge.broadcast(gameId, 'game:hint', hintData);
      await realtimeBridge.broadcast(gameId, 'game:state', updatedState);
    }
  }, []);

  const skipPhoto = useCallback(() => {
    showAnswer();
  }, [showAnswer]);

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

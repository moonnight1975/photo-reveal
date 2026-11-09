import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseGameService } from '../services/supabaseGameService';
import { realtimeBridge } from '../lib/supabaseRealtime';
import type { GameState, PlayerScore } from '../types';

const STORAGE_KEY_PLAYER_ID = 'photoReveal_playerId';
const STORAGE_KEY_GAME_ID = 'photoReveal_gameId';
const STORAGE_KEY_PLAYER_NAME = 'photoReveal_playerName';

interface GuessResult {
  isCorrect: boolean;
  message: string;
  score?: number;
}

export function usePlayerGame(initialGameId?: string, autoJoinName?: string) {
  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY_PLAYER_ID)
  );
  const [playerName, setPlayerName] = useState<string>(
    () => autoJoinName || localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || ''
  );
  const [joined, setJoined] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState<GuessResult | null>(null);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [gameFinished, setGameFinished] = useState(false);
  const [finalScores, setFinalScores] = useState<PlayerScore[]>([]);

  const guessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameIdRef = useRef<string | null>(initialGameId || localStorage.getItem(STORAGE_KEY_GAME_ID));
  const gameRef = useRef<GameState | null>(null);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const joinGame = useCallback(async (gameId: string, name: string) => {
    try {
      const player = await supabaseGameService.joinPlayer(gameId, name);
      const gameState = await supabaseGameService.getGame(gameId, false);

      setPlayerId(player.id);
      setPlayerName(name);
      setJoined(true);
      if (gameState) setGame(gameState);
      gameIdRef.current = gameId;

      localStorage.setItem(STORAGE_KEY_PLAYER_ID, player.id);
      localStorage.setItem(STORAGE_KEY_GAME_ID, gameId);
      localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);

      // Join Realtime channel
      realtimeBridge.getChannel(gameId);

      // Notify host/admin that a player joined
      if (gameState) {
        const updatedScores = gameState.scores;
        await realtimeBridge.broadcast(gameId, 'game:scores-update', updatedScores);
      }
    } catch (err) {
      console.error('Failed to join game via Supabase:', err);
    }
  }, []);

  const leaveGame = useCallback(() => {
    if (gameIdRef.current) {
      realtimeBridge.leaveChannel(gameIdRef.current);
    }
    localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
    localStorage.removeItem(STORAGE_KEY_GAME_ID);
    setJoined(false);
    setGame(null);
    setPlayerId(null);
    gameIdRef.current = null;
  }, []);

  const requestState = useCallback(async (gameId: string) => {
    const state = await supabaseGameService.getGame(gameId, false);
    if (state) setGame(state);
  }, []);

  const submitGuess = useCallback(
    async (guess: string) => {
      const activeGame = gameRef.current;
      const pid = playerId;
      const gid = gameIdRef.current;

      if (!pid || !gid || !activeGame || !activeGame.currentPhoto) return;
      if (activeGame.revealState?.isAnswerShown || activeGame.status !== 'active') {
        setLastGuessResult({ isCorrect: false, message: 'Guesses are not open right now.' });
        return;
      }

      const totalTiles = activeGame.settings.gridRows * activeGame.settings.gridCols;
      const revealedTilesCount = activeGame.revealState?.revealedTiles.length || 0;

      try {
        const result = await supabaseGameService.submitGuess(
          gid,
          pid,
          guess,
          activeGame.currentPhoto,
          revealedTilesCount,
          totalTiles,
          activeGame.settings.multipleAttempts
        );

        setLastGuessResult(result);
        if (guessTimerRef.current) clearTimeout(guessTimerRef.current);
        guessTimerRef.current = setTimeout(() => {
          setLastGuessResult(null);
        }, 3000);

        if (result.isCorrect) {
          // Refresh scores
          const refreshed = await supabaseGameService.getGame(gid, false);
          if (refreshed) {
            setGame(refreshed);
            await realtimeBridge.broadcast(gid, 'game:scores-update', refreshed.scores);
          }
        }
      } catch (err) {
        console.error('Failed to submit guess:', err);
      }
    },
    [playerId]
  );

  useEffect(() => {
    const targetGameId = initialGameId || localStorage.getItem(STORAGE_KEY_GAME_ID);
    const storedName = autoJoinName || localStorage.getItem(STORAGE_KEY_PLAYER_NAME);

    if (targetGameId && storedName) {
      joinGame(targetGameId, storedName);
    }
  }, [initialGameId, autoJoinName, joinGame]);

  // Subscribe to real-time events
  useEffect(() => {
    const activeGameId = gameIdRef.current || initialGameId;
    if (!activeGameId) return;

    const onGameState = (state: GameState) => {
      setGame(state);
      setJoined(true);
      if (state.status === 'active' || state.status === 'waiting') {
        setGameFinished(false);
      }
    };

    const onRevealTile = (data: { tileIndex: number; revealedTiles: number[] }) => {
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

    const onTimerTick = (data: { remaining: number }) => {
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

    const onShowAnswer = (data: { answer: string; photoUrl: string }) => {
      setGame((prev) => {
        if (!prev) return prev;
        const photos = prev.photos ? [...prev.photos] : [];
        if (photos[prev.currentPhotoIndex]) {
          photos[prev.currentPhotoIndex] = {
            ...photos[prev.currentPhotoIndex],
            title: data.answer || photos[prev.currentPhotoIndex].title,
            filePath: data.photoUrl || photos[prev.currentPhotoIndex].filePath,
          };
        }
        return {
          ...prev,
          photos,
          status: 'revealing_answer',
          revealState: prev.revealState
            ? {
                ...prev.revealState,
                isAnswerShown: true,
              }
            : null,
        };
      });
    };

    const onScoresUpdate = (scores: PlayerScore[]) => {
      setGame((prev) => {
        if (!prev) return prev;
        return { ...prev, scores };
      });
    };

    const onHint = (data: { hint: string; index: number }) => {
      setRevealedHints((prev) => {
        if (prev.includes(data.hint)) return prev;
        const next = [...prev];
        next[data.index] = data.hint;
        return next;
      });
    };

    const onPhotoChanged = (_data: { photoIndex: number }) => {
      setRevealedHints([]);
      setLastGuessResult(null);
      if (guessTimerRef.current) clearTimeout(guessTimerRef.current);
    };

    const onFinished = (data: { scores: PlayerScore[] }) => {
      setGameFinished(true);
      setFinalScores(data.scores);
      setGame((prev) => {
        if (!prev) return prev;
        return { ...prev, status: 'finished', scores: data.scores };
      });
    };

    realtimeBridge.on(activeGameId, 'game:state', onGameState);
    realtimeBridge.on(activeGameId, 'game:state-update', onGameState);
    realtimeBridge.on(activeGameId, 'game:reveal-tile', onRevealTile);
    realtimeBridge.on(activeGameId, 'game:timer-tick', onTimerTick);
    realtimeBridge.on(activeGameId, 'game:show-answer', onShowAnswer);
    realtimeBridge.on(activeGameId, 'game:scores-update', onScoresUpdate);
    realtimeBridge.on(activeGameId, 'game:hint', onHint);
    realtimeBridge.on(activeGameId, 'game:photo-changed', onPhotoChanged);
    realtimeBridge.on(activeGameId, 'game:finished', onFinished);

    return () => {
      realtimeBridge.off(activeGameId, 'game:state', onGameState);
      realtimeBridge.off(activeGameId, 'game:state-update', onGameState);
      realtimeBridge.off(activeGameId, 'game:reveal-tile', onRevealTile);
      realtimeBridge.off(activeGameId, 'game:timer-tick', onTimerTick);
      realtimeBridge.off(activeGameId, 'game:show-answer', onShowAnswer);
      realtimeBridge.off(activeGameId, 'game:scores-update', onScoresUpdate);
      realtimeBridge.off(activeGameId, 'game:hint', onHint);
      realtimeBridge.off(activeGameId, 'game:photo-changed', onPhotoChanged);
      realtimeBridge.off(activeGameId, 'game:finished', onFinished);
      if (guessTimerRef.current) clearTimeout(guessTimerRef.current);
    };
  }, [initialGameId]);

  return {
    game,
    playerId,
    playerName,
    joined,
    lastGuessResult,
    revealedHints,
    gameFinished,
    finalScores,
    joinGame,
    leaveGame,
    submitGuess,
    requestState,
  };
}

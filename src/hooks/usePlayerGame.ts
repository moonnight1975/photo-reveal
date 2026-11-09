import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';
import type { GameState, PlayerScore } from '../types';

const STORAGE_KEY_PLAYER_ID = 'photoReveal_playerId';
const STORAGE_KEY_GAME_ID = 'photoReveal_gameId';
const STORAGE_KEY_PLAYER_NAME = 'photoReveal_playerName';

interface GuessResult {
  isCorrect: boolean;
  message: string;
  score?: number;
}

export function usePlayerGame(initialGameId?: string) {
  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY_PLAYER_ID)
  );
  const [playerName, setPlayerName] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_PLAYER_NAME) || ''
  );
  const [joined, setJoined] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState<GuessResult | null>(null);
  const [revealedHints, setRevealedHints] = useState<string[]>([]);
  const [gameFinished, setGameFinished] = useState(false);
  const [finalScores, setFinalScores] = useState<PlayerScore[]>([]);

  const guessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameIdRef = useRef<string | null>(initialGameId || localStorage.getItem(STORAGE_KEY_GAME_ID));

  const joinGame = useCallback((gameId: string, name: string) => {
    const socket = getSocket();
    socket.emit('player:join', { gameId, playerName: name }, (result: any) => {
      if (result && result.success && result.playerId) {
        setPlayerId(result.playerId);
        setPlayerName(name);
        setJoined(true);
        if (result.state) {
          setGame(result.state);
        }
        gameIdRef.current = gameId;

        localStorage.setItem(STORAGE_KEY_PLAYER_ID, result.playerId);
        localStorage.setItem(STORAGE_KEY_GAME_ID, gameId);
        localStorage.setItem(STORAGE_KEY_PLAYER_NAME, name);

        socket.emit('game:request-state', { gameId });
      }
    });
  }, []);

  const leaveGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
    localStorage.removeItem(STORAGE_KEY_GAME_ID);
    setJoined(false);
    setGame(null);
    setPlayerId(null);
    gameIdRef.current = null;
  }, []);

  const submitGuess = useCallback((guess: string) => {
    if (!playerId || !gameIdRef.current) return;
    const socket = getSocket();
    socket.emit('player:guess', {
      gameId: gameIdRef.current,
      playerId,
      guess,
    });
  }, [playerId]);

  const requestState = useCallback((gameId: string) => {
    const socket = getSocket();
    socket.emit('game:request-state', { gameId });
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const storedPlayerId = localStorage.getItem(STORAGE_KEY_PLAYER_ID);
    const storedGameId = localStorage.getItem(STORAGE_KEY_GAME_ID);
    const storedName = localStorage.getItem(STORAGE_KEY_PLAYER_NAME);

    // Target game is URL param if provided, otherwise stored game
    const targetGameId = initialGameId || storedGameId;

    if (targetGameId && storedName) {
      setPlayerName(storedName);
      gameIdRef.current = targetGameId;

      socket.emit('player:join', { gameId: targetGameId, playerName: storedName }, (result: any) => {
        if (result && result.success && result.playerId) {
          setPlayerId(result.playerId);
          localStorage.setItem(STORAGE_KEY_PLAYER_ID, result.playerId);
          localStorage.setItem(STORAGE_KEY_GAME_ID, targetGameId);
          setJoined(true);
          if (result.state) {
            setGame(result.state);
          }
          socket.emit('game:request-state', { gameId: targetGameId });
        } else {
          // If stored game is no longer valid, clear stale data
          if (!initialGameId) {
            localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
            localStorage.removeItem(STORAGE_KEY_GAME_ID);
          }
          setJoined(false);
          setGame(null);
        }
      });
    }

    // Re-join room on socket reconnect
    const onConnect = () => {
      const activeGameId = gameIdRef.current || initialGameId || localStorage.getItem(STORAGE_KEY_GAME_ID);
      const activeName = playerName || localStorage.getItem(STORAGE_KEY_PLAYER_NAME);
      if (activeGameId && activeName) {
        socket.emit('player:join', { gameId: activeGameId, playerName: activeName }, (result: any) => {
          if (result && result.success) {
            setJoined(true);
            if (result.state) setGame(result.state);
            socket.emit('game:request-state', { gameId: activeGameId });
          }
        });
      }
    };
    socket.on('connect', onConnect);

    // ─── Socket Listeners ──────────────────────────────────────

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

    const onAnswerResult = (data: GuessResult) => {
      setLastGuessResult(data);
      if (guessTimerRef.current) clearTimeout(guessTimerRef.current);
      guessTimerRef.current = setTimeout(() => {
        setLastGuessResult(null);
      }, 3000);
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
      // Reset local state for new photo
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

    socket.on('game:state', onGameState);
    socket.on('game:state-update', onGameState);
    socket.on('game:reveal-tile', onRevealTile);
    socket.on('game:tile-revealed', onRevealTile);
    socket.on('game:timer-tick', onTimerTick);
    socket.on('game:answer-result', onAnswerResult);
    socket.on('game:show-answer', onShowAnswer);
    socket.on('game:scores-update', onScoresUpdate);
    socket.on('game:hint', onHint);
    socket.on('game:photo-changed', onPhotoChanged);
    socket.on('game:finished', onFinished);

    return () => {
      socket.off('connect', onConnect);
      socket.off('game:state', onGameState);
      socket.off('game:state-update', onGameState);
      socket.off('game:reveal-tile', onRevealTile);
      socket.off('game:tile-revealed', onRevealTile);
      socket.off('game:timer-tick', onTimerTick);
      socket.off('game:answer-result', onAnswerResult);
      socket.off('game:show-answer', onShowAnswer);
      socket.off('game:scores-update', onScoresUpdate);
      socket.off('game:hint', onHint);
      socket.off('game:photo-changed', onPhotoChanged);
      socket.off('game:finished', onFinished);
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

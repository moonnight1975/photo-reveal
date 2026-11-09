import {
  getGame,
  getPhotosByGameId,
  getGameSettings,
  getPlayersByGameId,
  updateGameStatus,
  updateGamePhotoIndex,
  updatePlayerScore,
  createSubmission,
  getSubmissionsByPhoto,
} from './db.js';

class GameManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.games = new Map();
  }

  /**
   * Helper to format a photo object for client consumption
   */
  _formatPhoto(p, includeAnswer = true) {
    let hintsArray = [];
    if (Array.isArray(p.hints)) {
      hintsArray = p.hints;
    } else if (typeof p.hints === 'string' && p.hints) {
      hintsArray = p.hints.split('||').map(h => h.trim()).filter(Boolean);
    }

    return {
      id: p.id,
      gameId: p.game_id || p.gameId,
      title: includeAnswer ? (p.title || '') : '',
      hints: hintsArray,
      filePath: p.file_path || p.filePath,
      sortOrder: p.sort_order ?? p.sortOrder ?? 0,
      category: p.category || 'general',
    };
  }

  /**
   * Load a game from the database into memory.
   */
  loadGame(gameId) {
    const game = getGame(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const rawPhotos = getPhotosByGameId(gameId);
    const rawSettings = getGameSettings(gameId) || {};
    const rawPlayers = getPlayersByGameId(gameId);

    const gridRows = rawSettings.grid_rows ?? rawSettings.gridRows ?? 4;
    const gridCols = rawSettings.grid_cols ?? rawSettings.gridCols ?? 4;
    const totalTiles = gridRows * gridCols;
    const revealOrder = rawSettings.reveal_order ?? rawSettings.revealOrder ?? 'random';

    const formattedPhotos = rawPhotos.map(p => this._formatPhoto(p, true));

    const existingMem = this.games.get(gameId);
    if (existingMem?.timer) {
      clearInterval(existingMem.timer);
    }

    const gameState = {
      id: game.id,
      name: game.name,
      status: game.status === 'playing' ? 'active' : game.status,
      currentPhotoIndex: game.current_photo_index ?? game.currentPhotoIndex ?? 0,
      photos: formattedPhotos,
      settings: {
        revealDuration: rawSettings.reveal_duration ?? rawSettings.revealDuration ?? 60,
        revealInterval: rawSettings.reveal_interval ?? rawSettings.revealInterval ?? 3,
        gridRows,
        gridCols,
        revealOrder,
        revealMode: rawSettings.reveal_mode ?? rawSettings.revealMode ?? 'auto',
        hintsEnabled: Boolean(rawSettings.hints_enabled ?? rawSettings.hintsEnabled ?? 1),
        timerEnabled: Boolean(rawSettings.timer_enabled ?? rawSettings.timerEnabled ?? 1),
        multipleAttempts: Boolean(rawSettings.multiple_attempts ?? rawSettings.multipleAttempts ?? 1),
      },
      revealState: {
        photoId: formattedPhotos[0]?.id || '',
        revealedTiles: [],
        tileOrder: this._generateTileOrder(totalTiles, revealOrder),
        timerRemaining: rawSettings.reveal_duration ?? rawSettings.revealDuration ?? 60,
        isAnswerShown: false,
        currentHintIndex: -1,
      },
      scores: rawPlayers.map(p => ({
        id: p.id,
        playerName: p.name,
        score: p.score || 0,
        correctAnswers: p.correct_answers ?? p.correctAnswers ?? 0,
        totalAttempts: p.total_attempts ?? p.totalAttempts ?? 0,
      })),
      timer: null,
    };

    if (formattedPhotos[gameState.currentPhotoIndex]) {
      gameState.revealState.photoId = formattedPhotos[gameState.currentPhotoIndex].id;
    }

    this.games.set(gameId, gameState);
    return gameState;
  }

  /**
   * Safe state for players — answers hidden unless isAnswerShown is true
   */
  getGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    const isAnswerShown = game.revealState?.isAnswerShown || false;

    const safePhotos = game.photos.map((p, idx) => {
      const isCurrent = idx === game.currentPhotoIndex;
      return {
        ...p,
        title: (isCurrent && isAnswerShown) ? p.title : '',
      };
    });

    return {
      id: game.id,
      gameId: game.id,
      name: game.name,
      status: game.status,
      currentPhotoIndex: game.currentPhotoIndex,
      totalPhotos: game.photos.length,
      photos: safePhotos,
      currentPhoto: safePhotos[game.currentPhotoIndex] || null,
      settings: { ...game.settings },
      revealState: game.revealState
        ? {
            photoId: game.revealState.photoId,
            revealedTiles: [...game.revealState.revealedTiles],
            timerRemaining: game.revealState.timerRemaining,
            isAnswerShown: game.revealState.isAnswerShown,
            currentHintIndex: game.revealState.currentHintIndex,
          }
        : null,
      scores: game.scores.map(s => ({ ...s })),
    };
  }

  /**
   * Full admin state — includes correct answers
   */
  getAdminGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    return {
      id: game.id,
      gameId: game.id,
      name: game.name,
      status: game.status,
      currentPhotoIndex: game.currentPhotoIndex,
      totalPhotos: game.photos.length,
      photos: game.photos.map(p => ({ ...p })),
      currentPhoto: game.photos[game.currentPhotoIndex] || null,
      settings: { ...game.settings },
      revealState: game.revealState
        ? {
            photoId: game.revealState.photoId,
            revealedTiles: [...game.revealState.revealedTiles],
            timerRemaining: game.revealState.timerRemaining,
            isAnswerShown: game.revealState.isAnswerShown,
            currentHintIndex: game.revealState.currentHintIndex,
          }
        : null,
      scores: game.scores.map(s => ({ ...s })),
    };
  }

  /**
   * Broadcast state to all clients in the game room
   */
  broadcastState(gameId, io) {
    const adminState = this.getAdminGameState(gameId);
    const playerState = this.getGameState(gameId);

    if (!adminState || !playerState) return;

    // Send player state to general room
    io.to(`game:${gameId}`).emit('game:state', playerState);
    io.to(`game:${gameId}`).emit('game:state-update', playerState);

    // Send admin state to admin room
    io.to(`game:${gameId}:admin`).emit('game:state', adminState);
    io.to(`game:${gameId}:admin`).emit('game:state-update', adminState);
  }

  /**
   * Start the game
   */
  startGame(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);
    if (game.photos.length === 0) throw new Error('No photos in this game');

    game.status = 'active';
    game.currentPhotoIndex = 0;
    this._resetRevealState(game);
    updateGameStatus(gameId, 'active');
    updateGamePhotoIndex(gameId, 0);

    if (game.settings.revealMode === 'auto') {
      this._startAutoReveal(gameId, io);
    }

    this.broadcastState(gameId, io);
  }

  /**
   * Pause the game
   */
  pauseGame(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    game.status = 'paused';
    this._stopTimer(gameId);
    updateGameStatus(gameId, 'paused');

    if (io) this.broadcastState(gameId, io);
  }

  /**
   * Resume the game
   */
  resumeGame(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    game.status = 'active';
    updateGameStatus(gameId, 'active');

    if (game.settings.revealMode === 'auto') {
      this._startAutoReveal(gameId, io);
    }

    this.broadcastState(gameId, io);
  }

  /**
   * Reveal next tile
   */
  revealNextTile(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const totalTiles = game.settings.gridRows * game.settings.gridCols;
    if (game.revealState.revealedTiles.length >= totalTiles) {
      if (!game.revealState.isAnswerShown) {
        this.showAnswer(gameId, io);
      }
      return;
    }

    const tileOrder = game.revealState.tileOrder || this._generateTileOrder(totalTiles, game.settings.revealOrder);
    const nextIndex = game.revealState.revealedTiles.length;
    const tileIndex = tileOrder[nextIndex];

    game.revealState.revealedTiles.push(tileIndex);

    const revealData = {
      tileIndex,
      revealedTiles: [...game.revealState.revealedTiles],
    };

    io.to(`game:${gameId}`).emit('game:reveal-tile', revealData);
    io.to(`game:${gameId}:admin`).emit('game:reveal-tile', revealData);
    io.to(`game:${gameId}`).emit('game:tile-revealed', revealData);

    this.broadcastState(gameId, io);

    if (game.revealState.revealedTiles.length >= totalTiles) {
      this._stopTimer(gameId);
      this.showAnswer(gameId, io);
    }
  }

  /**
   * Reveal all tiles
   */
  revealAllTiles(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const totalTiles = game.settings.gridRows * game.settings.gridCols;
    game.revealState.revealedTiles = Array.from({ length: totalTiles }, (_, i) => i);

    this._stopTimer(gameId);

    const revealData = {
      tileIndex: -1,
      revealedTiles: [...game.revealState.revealedTiles],
    };

    io.to(`game:${gameId}`).emit('game:reveal-tile', revealData);
    io.to(`game:${gameId}:admin`).emit('game:reveal-tile', revealData);

    this.broadcastState(gameId, io);
  }

  /**
   * Skip current photo
   */
  skipPhoto(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    this._stopTimer(gameId);
    this.showAnswer(gameId, io);
  }

  /**
   * Next photo
   */
  nextPhoto(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    this._stopTimer(gameId);
    game.currentPhotoIndex += 1;

    if (game.currentPhotoIndex >= game.photos.length) {
      this.endGame(gameId, io);
      return;
    }

    updateGamePhotoIndex(gameId, game.currentPhotoIndex);
    game.status = 'active';
    updateGameStatus(gameId, 'active');
    this._resetRevealState(game);

    if (game.settings.revealMode === 'auto') {
      this._startAutoReveal(gameId, io);
    }

    io.to(`game:${gameId}`).emit('game:photo-changed', { photoIndex: game.currentPhotoIndex });
    io.to(`game:${gameId}:admin`).emit('game:photo-changed', { photoIndex: game.currentPhotoIndex });

    this.broadcastState(gameId, io);
  }

  /**
   * Show answer
   */
  showAnswer(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    this._stopTimer(gameId);
    game.status = 'revealing_answer';
    updateGameStatus(gameId, 'revealing_answer');
    game.revealState.isAnswerShown = true;

    // Reveal all remaining tiles when answer is shown
    const totalTiles = game.settings.gridRows * game.settings.gridCols;
    game.revealState.revealedTiles = Array.from({ length: totalTiles }, (_, i) => i);

    const currentPhoto = game.photos[game.currentPhotoIndex];
    const answerData = {
      answer: currentPhoto?.title || '',
      photoUrl: currentPhoto?.filePath || '',
    };

    io.to(`game:${gameId}`).emit('game:show-answer', answerData);
    io.to(`game:${gameId}:admin`).emit('game:show-answer', answerData);
    io.to(`game:${gameId}`).emit('game:answer-shown', answerData);

    this.broadcastState(gameId, io);
  }

  /**
   * Restart round
   */
  restartRound(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    this._stopTimer(gameId);
    game.status = 'active';
    updateGameStatus(gameId, 'active');
    this._resetRevealState(game);

    if (game.settings.revealMode === 'auto') {
      this._startAutoReveal(gameId, io);
    }

    io.to(`game:${gameId}`).emit('game:photo-changed', { photoIndex: game.currentPhotoIndex });
    this.broadcastState(gameId, io);
  }

  /**
   * End game
   */
  endGame(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    this._stopTimer(gameId);
    game.status = 'finished';
    updateGameStatus(gameId, 'finished');

    io.to(`game:${gameId}`).emit('game:finished', { scores: game.scores });
    io.to(`game:${gameId}:admin`).emit('game:finished', { scores: game.scores });
    io.to(`game:${gameId}`).emit('game:ended', { scores: game.scores });

    this.broadcastState(gameId, io);
  }

  /**
   * Show hint
   */
  showHint(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const currentPhoto = game.photos[game.currentPhotoIndex];
    if (!currentPhoto) return;

    const hints = Array.isArray(currentPhoto.hints) ? currentPhoto.hints : [];
    if (game.revealState.currentHintIndex < hints.length - 1) {
      game.revealState.currentHintIndex += 1;
      const hintData = {
        index: game.revealState.currentHintIndex,
        hint: hints[game.revealState.currentHintIndex],
      };

      io.to(`game:${gameId}`).emit('game:hint', hintData);
      io.to(`game:${gameId}:admin`).emit('game:hint', hintData);
      io.to(`game:${gameId}`).emit('game:hint-shown', hintData);

      this.broadcastState(gameId, io);
    }
  }

  /**
   * Submit guess from player
   */
  submitGuess(gameId, playerId, guess, io, socket) {
    const game = this.games.get(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const currentPhoto = game.photos[game.currentPhotoIndex];
    if (!currentPhoto) throw new Error('No current photo');

    if (game.revealState.isAnswerShown || game.status !== 'active') {
      const res = { isCorrect: false, message: 'Guesses are not open right now.' };
      if (socket) socket.emit('game:answer-result', res);
      return res;
    }

    // Check if player has already guessed correctly on this photo
    const existing = getSubmissionsByPhoto(gameId, currentPhoto.id);
    const alreadyGuessedCorrectly = existing.some(s => (s.player_id === playerId || s.playerId === playerId) && (s.is_correct === 1 || s.is_correct === true));
    if (alreadyGuessedCorrectly) {
      const res = { isCorrect: false, message: 'You have already identified this photo correctly!' };
      if (socket) socket.emit('game:answer-result', res);
      return res;
    }

    // Check single attempt restriction
    if (!game.settings.multipleAttempts) {
      const alreadyAttempted = existing.some(s => (s.player_id === playerId || s.playerId === playerId));
      if (alreadyAttempted) {
        const res = { isCorrect: false, message: 'Only one attempt allowed per photo.' };
        if (socket) socket.emit('game:answer-result', res);
        return res;
      }
    }

    // Clean comparison: ignore punctuation, spaces, case
    const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanGuess = normalize(guess);
    const cleanAnswer = normalize(currentPhoto.title);
    const isCorrect = cleanGuess.length > 0 && cleanGuess === cleanAnswer;

    const totalTiles = game.settings.gridRows * game.settings.gridCols;
    const tilesRevealed = game.revealState.revealedTiles.length;

    createSubmission(gameId, currentPhoto.id, playerId, guess, isCorrect, tilesRevealed);

    const playerScore = game.scores.find(s => s.id === playerId);
    if (playerScore) {
      playerScore.totalAttempts += 1;

      if (isCorrect) {
        // Calculate points based on hidden tiles remaining
        const points = Math.max(100, Math.round(1000 * (1 - tilesRevealed / totalTiles)));
        playerScore.score += points;
        playerScore.correctAnswers += 1;

        updatePlayerScore(playerId, playerScore.score, playerScore.correctAnswers, playerScore.totalAttempts);

        const resultData = {
          isCorrect: true,
          message: 'Correct answer!',
          score: points,
        };

        if (socket) socket.emit('game:answer-result', resultData);

        io.to(`game:${gameId}`).emit('game:scores-update', game.scores);
        io.to(`game:${gameId}:admin`).emit('game:scores-update', game.scores);

        this.broadcastState(gameId, io);
        return resultData;
      } else {
        updatePlayerScore(playerId, playerScore.score, playerScore.correctAnswers, playerScore.totalAttempts);

        const resultData = {
          isCorrect: false,
          message: 'Incorrect guess. Try again!',
        };

        if (socket) socket.emit('game:answer-result', resultData);
        return resultData;
      }
    }

    return { isCorrect: false, message: 'Player not registered in this game.' };
  }

  // ─── Private Methods ──────────────────────────────────────────

  _startAutoReveal(gameId, io) {
    const game = this.games.get(gameId);
    if (!game) return;

    this._stopTimer(gameId);

    const intervalSeconds = Math.max(1, game.settings.revealInterval || 3);
    const totalTiles = (game.settings.gridRows || 4) * (game.settings.gridCols || 4);
    let elapsedSeconds = 0;

    // Tick every 1 second for smooth countdown timer
    game.timer = setInterval(() => {
      const g = this.games.get(gameId);
      if (!g || g.status !== 'active') {
        this._stopTimer(gameId);
        return;
      }

      elapsedSeconds += 1;
      g.revealState.timerRemaining -= 1;

      io.to(`game:${gameId}`).emit('game:timer-tick', { remaining: Math.max(0, g.revealState.timerRemaining) });
      io.to(`game:${gameId}:admin`).emit('game:timer-tick', { remaining: Math.max(0, g.revealState.timerRemaining) });

      // Check if it's time to reveal a tile based on revealInterval
      if (elapsedSeconds % intervalSeconds === 0) {
        if (g.revealState.revealedTiles.length < totalTiles) {
          this.revealNextTile(gameId, io);
        }
      }

      if (g.settings.timerEnabled && g.revealState.timerRemaining <= 0) {
        g.revealState.timerRemaining = 0;
        this._stopTimer(gameId);
        this.showAnswer(gameId, io);
        return;
      }
    }, 1000);
  }

  _stopTimer(gameId) {
    const game = this.games.get(gameId);
    if (game?.timer) {
      clearInterval(game.timer);
      game.timer = null;
    }
  }

  _generateTileOrder(totalTiles, order) {
    const indices = Array.from({ length: totalTiles }, (_, i) => i);
    if (order === 'random') {
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
    }
    return indices;
  }

  _resetRevealState(game) {
    const totalTiles = (game.settings.gridRows || 4) * (game.settings.gridCols || 4);
    const currentPhoto = game.photos[game.currentPhotoIndex];

    game.revealState = {
      photoId: currentPhoto?.id || '',
      revealedTiles: [],
      tileOrder: this._generateTileOrder(totalTiles, game.settings.revealOrder),
      timerRemaining: game.settings.revealDuration || 60,
      isAnswerShown: false,
      currentHintIndex: -1,
    };
  }
}

export default GameManager;

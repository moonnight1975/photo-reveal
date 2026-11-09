import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import {
  initDb,
  createGame,
  getGame,
  getAllGames,
  deleteGame,
  createPhoto,
  getPhotosByGameId,
  getPhoto,
  updatePhoto,
  deletePhoto,
  reorderPhotos,
  getGameSettings,
  updateGameSettings,
  createPlayer,
  findPlayerByNameAndGame,
  getPlayersByGameId,
} from './db.js';

import GameManager from './gameManager.js';
import { seedDemoData } from './seed.js';

// ─── Initialize ──────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const gameManager = new GameManager();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: '*' }));
app.use(express.json());

// Static serve uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

// ─── Helper for formatting DB game to client GameState ──────────────────────

function formatGame(game) {
  if (!game) return null;
  const rawPhotos = getPhotosByGameId(game.id);
  const rawSettings = getGameSettings(game.id) || {};
  const rawPlayers = getPlayersByGameId(game.id) || [];

  const photos = rawPhotos.map(p => ({
    id: p.id,
    gameId: p.game_id || game.id,
    title: p.title || '',
    hints: p.hints ? (typeof p.hints === 'string' ? p.hints.split('||').map(h => h.trim()).filter(Boolean) : p.hints) : [],
    filePath: p.file_path,
    sortOrder: p.sort_order ?? 0,
    category: p.category || 'general',
  }));

  const settings = {
    revealDuration: rawSettings.reveal_duration ?? 60,
    revealInterval: rawSettings.reveal_interval ?? 3,
    gridRows: rawSettings.grid_rows ?? 4,
    gridCols: rawSettings.grid_cols ?? 4,
    revealOrder: rawSettings.reveal_order ?? 'random',
    revealMode: rawSettings.reveal_mode ?? 'auto',
    hintsEnabled: Boolean(rawSettings.hints_enabled ?? 1),
    timerEnabled: Boolean(rawSettings.timer_enabled ?? 1),
    multipleAttempts: Boolean(rawSettings.multiple_attempts ?? 1),
  };

  const scores = rawPlayers.map(p => ({
    id: p.id,
    playerName: p.name,
    score: p.score || 0,
    correctAnswers: p.correct_answers || 0,
    totalAttempts: p.total_attempts || 0,
  }));

  return {
    id: game.id,
    gameId: game.id,
    name: game.name,
    status: game.status,
    currentPhotoIndex: game.current_photo_index ?? 0,
    createdAt: game.created_at,
    photos,
    settings,
    revealState: null,
    scores,
  };
}

// ─── REST API Routes ─────────────────────────────────────────────────────────

// Create a new game
app.post('/api/games', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Game name is required' });
    const rawGame = createGame(name);
    gameManager.loadGame(rawGame.id);
    const adminState = gameManager.getAdminGameState(rawGame.id);
    res.status(201).json(adminState);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all games
app.get('/api/games', (_req, res) => {
  try {
    const rawGames = getAllGames();
    const games = rawGames.map(g => {
      if (gameManager.games.has(g.id)) {
        return gameManager.getAdminGameState(g.id);
      }
      return formatGame(g);
    });
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a game with photos and settings
app.get('/api/games/:id', (req, res) => {
  try {
    const gameId = req.params.id;
    if (!gameManager.games.has(gameId)) {
      const rawGame = getGame(gameId);
      if (!rawGame) return res.status(404).json({ error: 'Game not found' });
      gameManager.loadGame(gameId);
    }
    const adminState = gameManager.getAdminGameState(gameId);
    res.json(adminState);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload a photo for a game
app.post('/api/games/:id/photos', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), (req, res) => {
  try {
    const gameId = req.params.id;
    const game = getGame(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const uploadedFile = req.files?.file?.[0] || req.files?.photo?.[0];
    if (!uploadedFile) return res.status(400).json({ error: 'No file uploaded' });

    const { title, category } = req.body;
    let hints = req.body.hints || '';
    if (Array.isArray(hints)) {
      hints = hints.join('||');
    }

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const filePath = `/uploads/${uploadedFile.filename}`;
    const rawPhoto = createPhoto(gameId, title, hints, filePath, category || 'general');

    // Reload into memory
    gameManager.loadGame(gameId);
    gameManager.broadcastState(gameId, io);

    res.status(201).json({
      id: rawPhoto.id,
      gameId: rawPhoto.game_id,
      title: rawPhoto.title,
      hints: hints ? hints.split('||') : [],
      filePath: rawPhoto.file_path,
      sortOrder: rawPhoto.sort_order,
      category: rawPhoto.category,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update photo metadata
app.put('/api/games/:id/photos/:photoId', (req, res) => {
  try {
    const photo = getPhoto(req.params.photoId);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.hints !== undefined) updates.hints = Array.isArray(req.body.hints) ? req.body.hints.join('||') : req.body.hints;
    if (req.body.category !== undefined) updates.category = req.body.category;

    updatePhoto(req.params.photoId, updates);
    gameManager.loadGame(req.params.id);
    gameManager.broadcastState(req.params.id, io);

    const updated = getPhoto(req.params.photoId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a photo
app.delete('/api/games/:id/photos/:photoId', (req, res) => {
  try {
    const photo = deletePhoto(req.params.photoId);
    if (photo?.file_path) {
      const fullPath = path.join(process.cwd(), photo.file_path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    gameManager.loadGame(req.params.id);
    gameManager.broadcastState(req.params.id, io);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder photos
app.put('/api/games/:id/photos/reorder', (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds)) return res.status(400).json({ error: 'photoIds must be an array' });
    reorderPhotos(req.params.id, photoIds);
    gameManager.loadGame(req.params.id);
    gameManager.broadcastState(req.params.id, io);
    const photos = getPhotosByGameId(req.params.id);
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update game settings
app.put('/api/games/:id/settings', (req, res) => {
  try {
    const settings = updateGameSettings(req.params.id, req.body);
    gameManager.loadGame(req.params.id);
    gameManager.broadcastState(req.params.id, io);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a game
app.delete('/api/games/:id', (req, res) => {
  try {
    const photos = getPhotosByGameId(req.params.id);
    for (const photo of photos) {
      if (photo.file_path) {
        const fullPath = path.join(process.cwd(), photo.file_path.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }
    deleteGame(req.params.id);
    gameManager.games.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Socket.IO Events ───────────────────────────────────────────────────────

io.on('connection', (socket) => {
  // ── Admin events ──────────────────────────────────────────────────────────

  socket.on('admin:create-game', ({ name }, callback) => {
    try {
      const raw = createGame(name);
      gameManager.loadGame(raw.id);
      socket.join(`game:${raw.id}`);
      socket.join(`game:${raw.id}:admin`);
      const state = gameManager.getAdminGameState(raw.id);
      if (callback) callback({ success: true, game: state });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:update-settings', ({ gameId, settings }, callback) => {
    try {
      updateGameSettings(gameId, settings);
      gameManager.loadGame(gameId);
      gameManager.broadcastState(gameId, io);
      const state = gameManager.getAdminGameState(gameId);
      if (callback) callback({ success: true, settings: state.settings });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:start-game', ({ gameId }, callback) => {
    try {
      if (!gameManager.games.has(gameId)) {
        gameManager.loadGame(gameId);
      }
      socket.join(`game:${gameId}`);
      socket.join(`game:${gameId}:admin`);
      gameManager.startGame(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:pause-game', ({ gameId }, callback) => {
    try {
      gameManager.pauseGame(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:resume-game', ({ gameId }, callback) => {
    try {
      gameManager.resumeGame(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:reveal-next', ({ gameId }, callback) => {
    try {
      gameManager.revealNextTile(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:reveal-all', ({ gameId }, callback) => {
    try {
      gameManager.revealAllTiles(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:skip-photo', ({ gameId }, callback) => {
    try {
      gameManager.skipPhoto(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:next-photo', ({ gameId }, callback) => {
    try {
      gameManager.nextPhoto(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:show-answer', ({ gameId }, callback) => {
    try {
      gameManager.showAnswer(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:restart-round', ({ gameId }, callback) => {
    try {
      gameManager.restartRound(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:end-game', ({ gameId }, callback) => {
    try {
      gameManager.endGame(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:show-hint', ({ gameId }, callback) => {
    try {
      gameManager.showHint(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('admin:delete-photo', ({ gameId, photoId }, callback) => {
    try {
      const photo = deletePhoto(photoId);
      if (photo?.file_path) {
        const fullPath = path.join(process.cwd(), photo.file_path.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      gameManager.loadGame(gameId);
      gameManager.broadcastState(gameId, io);
      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // ── Player events ─────────────────────────────────────────────────────────

  socket.on('player:join', ({ gameId, playerName }, callback) => {
    try {
      const game = getGame(gameId);
      if (!game) {
        if (callback) callback({ success: false, error: 'Game not found' });
        return;
      }

      let player = findPlayerByNameAndGame(gameId, playerName);
      if (!player) {
        player = createPlayer(gameId, playerName);
      }

      socket.join(`game:${gameId}`);

      if (!gameManager.games.has(gameId)) {
        gameManager.loadGame(gameId);
      } else {
        const players = getPlayersByGameId(gameId);
        const memGame = gameManager.games.get(gameId);
        memGame.scores = players.map(p => ({
          id: p.id,
          playerName: p.name,
          score: p.score || 0,
          correctAnswers: p.correct_answers || 0,
          totalAttempts: p.total_attempts || 0,
        }));
      }

      const state = gameManager.getGameState(gameId);
      gameManager.broadcastState(gameId, io);

      if (callback) callback({ success: true, playerId: player.id, state });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('player:guess', ({ gameId, playerId, guess }, callback) => {
    try {
      const result = gameManager.submitGuess(gameId, playerId, guess, io, socket);
      if (callback) callback({ success: true, ...result });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // ── General events ────────────────────────────────────────────────────────

  socket.on('game:request-state', ({ gameId, isAdmin }, callback) => {
    try {
      if (!gameManager.games.has(gameId)) {
        const game = getGame(gameId);
        if (game) {
          gameManager.loadGame(gameId);
        } else {
          if (callback) callback({ success: false, error: 'Game not found' });
          return;
        }
      }

      socket.join(`game:${gameId}`);
      if (isAdmin) {
        socket.join(`game:${gameId}:admin`);
      }

      const state = isAdmin
        ? gameManager.getAdminGameState(gameId)
        : gameManager.getGameState(gameId);

      socket.emit('game:state', state);
      if (callback) callback({ success: true, state });
    } catch (err) {
      if (callback) callback({ success: false, error: err.message });
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3002;

// Initialize DB (async) then start server
initDb().then(() => {
  seedDemoData();
  httpServer.listen(PORT, () => {
    console.log(`🎮 Photo Reveal Game Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

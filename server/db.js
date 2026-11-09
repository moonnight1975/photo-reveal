import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

let db;

export function initDb() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(path.join(dataDir, 'game.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT DEFAULT 'waiting',
      current_photo_index INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      title TEXT,
      hints TEXT,
      file_path TEXT,
      sort_order INTEGER,
      category TEXT DEFAULT 'general',
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS game_settings (
      game_id TEXT PRIMARY KEY,
      reveal_duration INTEGER DEFAULT 60,
      reveal_interval INTEGER DEFAULT 3,
      grid_rows INTEGER DEFAULT 4,
      grid_cols INTEGER DEFAULT 4,
      reveal_order TEXT DEFAULT 'random',
      reveal_mode TEXT DEFAULT 'auto',
      hints_enabled INTEGER DEFAULT 1,
      timer_enabled INTEGER DEFAULT 1,
      multiple_attempts INTEGER DEFAULT 1,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      name TEXT,
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      total_attempts INTEGER DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      photo_id TEXT,
      player_id TEXT,
      guess TEXT,
      is_correct INTEGER,
      tiles_revealed INTEGER,
      submitted_at TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
  `);

  return db;
}

export function getDb() {
  return db;
}

// ─── Games CRUD ──────────────────────────────────────────────────────────────

export function createGame(name) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO games (id, name, status, current_photo_index, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, 'waiting', 0, createdAt);

  // Create default settings
  db.prepare('INSERT INTO game_settings (game_id) VALUES (?)').run(id);

  return { id, name, status: 'waiting', current_photo_index: 0, created_at: createdAt };
}

export function getGame(id) {
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id);
}

export function getAllGames() {
  return db.prepare('SELECT * FROM games ORDER BY created_at DESC').all();
}

export function updateGameStatus(id, status) {
  db.prepare('UPDATE games SET status = ? WHERE id = ?').run(status, id);
}

export function updateGamePhotoIndex(id, index) {
  db.prepare('UPDATE games SET current_photo_index = ? WHERE id = ?').run(index, id);
}

export function deleteGame(id) {
  db.prepare('DELETE FROM games WHERE id = ?').run(id);
}

// ─── Photos CRUD ─────────────────────────────────────────────────────────────

export function createPhoto(gameId, title, hints, filePath, category) {
  const id = uuidv4();
  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM photos WHERE game_id = ?'
  ).get(gameId);
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  db.prepare(
    'INSERT INTO photos (id, game_id, title, hints, file_path, sort_order, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, gameId, title, hints, filePath, sortOrder, category || 'general');

  return { id, game_id: gameId, title, hints, file_path: filePath, sort_order: sortOrder, category: category || 'general' };
}

export function getPhotosByGameId(gameId) {
  return db.prepare('SELECT * FROM photos WHERE game_id = ? ORDER BY sort_order ASC').all(gameId);
}

export function getPhoto(id) {
  return db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
}

export function updatePhoto(id, fields) {
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(value);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function deletePhoto(id) {
  const photo = getPhoto(id);
  db.prepare('DELETE FROM photos WHERE id = ?').run(id);
  return photo;
}

export function reorderPhotos(gameId, photoIds) {
  const stmt = db.prepare('UPDATE photos SET sort_order = ? WHERE id = ? AND game_id = ?');
  const transaction = db.transaction(() => {
    photoIds.forEach((photoId, index) => {
      stmt.run(index, photoId, gameId);
    });
  });
  transaction();
}

// ─── Game Settings CRUD ──────────────────────────────────────────────────────

export function getGameSettings(gameId) {
  return db.prepare('SELECT * FROM game_settings WHERE game_id = ?').get(gameId);
}

export function updateGameSettings(gameId, settings) {
  const existing = getGameSettings(gameId);
  if (!existing) {
    db.prepare('INSERT INTO game_settings (game_id) VALUES (?)').run(gameId);
  }

  const sets = [];
  const values = [];
  const allowedFields = [
    'reveal_duration', 'reveal_interval', 'grid_rows', 'grid_cols',
    'reveal_order', 'reveal_mode', 'hints_enabled', 'timer_enabled', 'multiple_attempts'
  ];

  for (const [key, value] of Object.entries(settings)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (allowedFields.includes(snakeKey)) {
      sets.push(`${snakeKey} = ?`);
      values.push(value);
    } else if (allowedFields.includes(key)) {
      sets.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (sets.length === 0) return getGameSettings(gameId);
  values.push(gameId);
  db.prepare(`UPDATE game_settings SET ${sets.join(', ')} WHERE game_id = ?`).run(...values);
  return getGameSettings(gameId);
}

// ─── Players CRUD ────────────────────────────────────────────────────────────

export function createPlayer(gameId, name) {
  const id = uuidv4();
  db.prepare(
    'INSERT INTO players (id, game_id, name, score, correct_answers, total_attempts) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, gameId, name, 0, 0, 0);
  return { id, game_id: gameId, name, score: 0, correct_answers: 0, total_attempts: 0 };
}

export function getPlayer(id) {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
}

export function getPlayersByGameId(gameId) {
  return db.prepare('SELECT * FROM players WHERE game_id = ? ORDER BY score DESC').all(gameId);
}

export function updatePlayerScore(id, score, correctAnswers, totalAttempts) {
  db.prepare(
    'UPDATE players SET score = ?, correct_answers = ?, total_attempts = ? WHERE id = ?'
  ).run(score, correctAnswers, totalAttempts, id);
}

export function findPlayerByNameAndGame(gameId, name) {
  return db.prepare('SELECT * FROM players WHERE game_id = ? AND name = ?').get(gameId, name);
}

// ─── Submissions CRUD ────────────────────────────────────────────────────────

export function createSubmission(gameId, photoId, playerId, guess, isCorrect, tilesRevealed) {
  const id = uuidv4();
  const submittedAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO submissions (id, game_id, photo_id, player_id, guess, is_correct, tiles_revealed, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, gameId, photoId, playerId, guess, isCorrect ? 1 : 0, tilesRevealed, submittedAt);
  return { id, game_id: gameId, photo_id: photoId, player_id: playerId, guess, is_correct: isCorrect, tiles_revealed: tilesRevealed, submitted_at: submittedAt };
}

export function getSubmissionsByPhoto(gameId, photoId) {
  return db.prepare('SELECT * FROM submissions WHERE game_id = ? AND photo_id = ?').all(gameId, photoId);
}

export function getSubmissionsByPlayer(gameId, playerId) {
  return db.prepare('SELECT * FROM submissions WHERE game_id = ? AND player_id = ?').all(gameId, playerId);
}

export function getSubmissionsByGame(gameId) {
  return db.prepare('SELECT * FROM submissions WHERE game_id = ?').all(gameId);
}

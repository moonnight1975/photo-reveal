import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

let db;
let dbPath;

// Helper: convert sql.js row arrays to objects
function rowsToObjects(stmt) {
  const cols = stmt.getColumnNames();
  const results = [];
  while (stmt.step()) {
    const row = stmt.get();
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    results.push(obj);
  }
  stmt.free();
  return results;
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = rowsToObjects(stmt);
  return results[0] || undefined;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  return rowsToObjects(stmt);
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function initDb() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbPath = path.join(dataDir, 'game.db');

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT DEFAULT 'waiting',
      current_photo_index INTEGER DEFAULT 0,
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      title TEXT,
      hints TEXT,
      file_path TEXT,
      sort_order INTEGER,
      category TEXT DEFAULT 'general',
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      name TEXT,
      score INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      total_attempts INTEGER DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  db.run(`
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
    )
  `);

  saveDb();
  return db;
}

export function getDb() {
  return db;
}

// ─── Games CRUD ──────────────────────────────────────────────────────────────

export function createGame(name) {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  runSql(
    'INSERT INTO games (id, name, status, current_photo_index, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, 'waiting', 0, createdAt]
  );

  // Create default settings
  runSql('INSERT INTO game_settings (game_id) VALUES (?)', [id]);

  return { id, name, status: 'waiting', current_photo_index: 0, created_at: createdAt };
}

export function getGame(id) {
  return getOne('SELECT * FROM games WHERE id = ?', [id]);
}

export function getAllGames() {
  return getAll('SELECT * FROM games ORDER BY created_at DESC');
}

export function updateGameStatus(id, status) {
  runSql('UPDATE games SET status = ? WHERE id = ?', [status, id]);
}

export function updateGamePhotoIndex(id, index) {
  runSql('UPDATE games SET current_photo_index = ? WHERE id = ?', [index, id]);
}

export function deleteGame(id) {
  runSql('DELETE FROM games WHERE id = ?', [id]);
}

// ─── Photos CRUD ─────────────────────────────────────────────────────────────

export function createPhoto(gameId, title, hints, filePath, category) {
  const id = uuidv4();
  const maxOrder = getOne(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM photos WHERE game_id = ?',
    [gameId]
  );
  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  runSql(
    'INSERT INTO photos (id, game_id, title, hints, file_path, sort_order, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, gameId, title, hints, filePath, sortOrder, category || 'general']
  );

  return { id, game_id: gameId, title, hints, file_path: filePath, sort_order: sortOrder, category: category || 'general' };
}

export function getPhotosByGameId(gameId) {
  return getAll('SELECT * FROM photos WHERE game_id = ? ORDER BY sort_order ASC', [gameId]);
}

export function getPhoto(id) {
  return getOne('SELECT * FROM photos WHERE id = ?', [id]);
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
  runSql(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`, values);
}

export function deletePhoto(id) {
  const photo = getPhoto(id);
  runSql('DELETE FROM photos WHERE id = ?', [id]);
  return photo;
}

export function reorderPhotos(gameId, photoIds) {
  db.run('BEGIN TRANSACTION');
  photoIds.forEach((photoId, index) => {
    db.run('UPDATE photos SET sort_order = ? WHERE id = ? AND game_id = ?', [index, photoId, gameId]);
  });
  db.run('COMMIT');
  saveDb();
}

// ─── Game Settings CRUD ──────────────────────────────────────────────────────

export function getGameSettings(gameId) {
  return getOne('SELECT * FROM game_settings WHERE game_id = ?', [gameId]);
}

export function updateGameSettings(gameId, settings) {
  const existing = getGameSettings(gameId);
  if (!existing) {
    runSql('INSERT INTO game_settings (game_id) VALUES (?)', [gameId]);
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
  runSql(`UPDATE game_settings SET ${sets.join(', ')} WHERE game_id = ?`, values);
  return getGameSettings(gameId);
}

// ─── Players CRUD ────────────────────────────────────────────────────────────

export function createPlayer(gameId, name) {
  const id = uuidv4();
  runSql(
    'INSERT INTO players (id, game_id, name, score, correct_answers, total_attempts) VALUES (?, ?, ?, ?, ?, ?)',
    [id, gameId, name, 0, 0, 0]
  );
  return { id, game_id: gameId, name, score: 0, correct_answers: 0, total_attempts: 0 };
}

export function getPlayer(id) {
  return getOne('SELECT * FROM players WHERE id = ?', [id]);
}

export function getPlayersByGameId(gameId) {
  return getAll('SELECT * FROM players WHERE game_id = ? ORDER BY score DESC', [gameId]);
}

export function updatePlayerScore(id, score, correctAnswers, totalAttempts) {
  runSql(
    'UPDATE players SET score = ?, correct_answers = ?, total_attempts = ? WHERE id = ?',
    [score, correctAnswers, totalAttempts, id]
  );
}

export function findPlayerByNameAndGame(gameId, name) {
  return getOne('SELECT * FROM players WHERE game_id = ? AND name = ?', [gameId, name]);
}

// ─── Submissions CRUD ────────────────────────────────────────────────────────

export function createSubmission(gameId, photoId, playerId, guess, isCorrect, tilesRevealed) {
  const id = uuidv4();
  const submittedAt = new Date().toISOString();
  runSql(
    'INSERT INTO submissions (id, game_id, photo_id, player_id, guess, is_correct, tiles_revealed, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, gameId, photoId, playerId, guess, isCorrect ? 1 : 0, tilesRevealed, submittedAt]
  );
  return { id, game_id: gameId, photo_id: photoId, player_id: playerId, guess, is_correct: isCorrect, tiles_revealed: tilesRevealed, submitted_at: submittedAt };
}

export function getSubmissionsByPhoto(gameId, photoId) {
  return getAll('SELECT * FROM submissions WHERE game_id = ? AND photo_id = ?', [gameId, photoId]);
}

export function getSubmissionsByPlayer(gameId, playerId) {
  return getAll('SELECT * FROM submissions WHERE game_id = ? AND player_id = ?', [gameId, playerId]);
}

export function getSubmissionsByGame(gameId) {
  return getAll('SELECT * FROM submissions WHERE game_id = ?', [gameId]);
}

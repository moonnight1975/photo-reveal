import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import type { GameState, GameSettings, Photo, PlayerScore, RevealState } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export function normalizeGuess(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const MEMORABLE_WORDS = [
  'PIXEL', 'FLASH', 'SHARP', 'FOCUS', 'GUESS',
  'PHOTO', 'SMART', 'SWIFT', 'BRAIN', 'SPARK',
  'TIGER', 'ALPHA', 'SUPER', 'MAGIC', 'QUEST',
  'CHAMP', 'NINJA', 'LUCKY', 'SHINE', 'SPEED',
  'TURBO', 'CROWN', 'STARS', 'SOLAR', 'RADAR',
  'VIVID', 'POWER', 'STORM', 'COMET', 'ORBIT'
];

export function generateGameCode(): string {
  // 5-character clean uppercase code (words or alphanumeric)
  if (Math.random() > 0.3) {
    const word = MEMORABLE_WORDS[Math.floor(Math.random() * MEMORABLE_WORDS.length)];
    return word;
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateTileOrder(totalTiles: number, order: string = 'random'): number[] {
  const indices = Array.from({ length: totalTiles }, (_, i) => i);
  if (order === 'random') {
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }
  return indices;
}

// Convert DB photo record to client Photo
export function formatPhoto(p: any, includeAnswer = true): Photo {
  let hintsArray: string[] = [];
  if (Array.isArray(p.hints)) {
    hintsArray = p.hints;
  } else if (typeof p.hints === 'string' && p.hints) {
    hintsArray = p.hints.split('||').map((h: string) => h.trim()).filter(Boolean);
  }

  return {
    id: p.id,
    gameId: p.game_id || p.gameId,
    title: includeAnswer ? (p.title || '') : '',
    hints: hintsArray,
    filePath: p.file_path || p.filePath || '',
    sortOrder: p.sort_order ?? p.sortOrder ?? 0,
    category: p.category || 'general',
  };
}

// Convert DB game + related data to client GameState
export function formatGameState(
  game: any,
  photos: any[] = [],
  settings: any = null,
  players: any[] = [],
  revealState: any = null,
  isAdmin = false
): GameState {
  const gridRows = settings?.grid_rows ?? settings?.gridRows ?? DEFAULT_SETTINGS.gridRows;
  const gridCols = settings?.grid_cols ?? settings?.gridCols ?? DEFAULT_SETTINGS.gridCols;
  const totalTiles = gridRows * gridCols;

  const currentIdx = game.current_photo_index ?? 0;
  const formattedPhotos = photos.map((p) => formatPhoto(p, isAdmin));

  // Determine reveal state
  let parsedRevealedTiles: number[] = [];
  if (revealState?.revealed_tiles) {
    parsedRevealedTiles = Array.isArray(revealState.revealed_tiles)
      ? revealState.revealed_tiles
      : typeof revealState.revealed_tiles === 'string'
      ? JSON.parse(revealState.revealed_tiles)
      : [];
  }

  const isAnswerShown = Boolean(revealState?.is_answer_shown || game.status === 'revealing_answer');

  // If answer is shown, players can see the title of the current photo
  const safePhotos = formattedPhotos.map((p, idx) => ({
    ...p,
    title: isAdmin || (idx === currentIdx && isAnswerShown) ? p.title : '',
  }));

  const formattedSettings: GameSettings = {
    revealDuration: settings?.reveal_duration ?? settings?.revealDuration ?? DEFAULT_SETTINGS.revealDuration,
    revealInterval: settings?.reveal_interval ?? settings?.revealInterval ?? DEFAULT_SETTINGS.revealInterval,
    gridRows,
    gridCols,
    revealOrder: settings?.reveal_order ?? settings?.revealOrder ?? DEFAULT_SETTINGS.revealOrder,
    revealMode: settings?.reveal_mode ?? settings?.revealMode ?? DEFAULT_SETTINGS.revealMode,
    hintsEnabled: Boolean(settings?.hints_enabled ?? settings?.hintsEnabled ?? DEFAULT_SETTINGS.hintsEnabled),
    timerEnabled: Boolean(settings?.timer_enabled ?? settings?.timerEnabled ?? DEFAULT_SETTINGS.timerEnabled),
    multipleAttempts: Boolean(settings?.multiple_attempts ?? settings?.multipleAttempts ?? DEFAULT_SETTINGS.multipleAttempts),
  };

  const scores: PlayerScore[] = players.map((p) => ({
    id: p.id,
    playerName: p.name,
    score: p.score || 0,
    correctAnswers: p.correct_answers ?? p.correctAnswers ?? 0,
    totalAttempts: p.total_attempts ?? p.totalAttempts ?? 0,
  }));

  const currentPhoto = safePhotos[currentIdx] || null;

  return {
    id: game.id,
    gameId: game.id,
    name: game.name,
    status: game.status,
    currentPhotoIndex: currentIdx,
    totalPhotos: safePhotos.length,
    photos: safePhotos,
    currentPhoto,
    settings: formattedSettings,
    revealState: {
      photoId: currentPhoto?.id || '',
      revealedTiles: parsedRevealedTiles,
      timerRemaining: revealState?.timer_remaining ?? formattedSettings.revealDuration,
      isAnswerShown,
      currentHintIndex: revealState?.current_hint_index ?? -1,
    },
    scores,
    createdAt: game.created_at,
  };
}

// ─── Supabase Data Operations ───────────────────────────────────────────────

export const supabaseGameService = {
  /**
   * Fetch all games with their photos and settings
   */
  async getAllGames(): Promise<GameState[]> {
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        photos (*),
        game_settings (*),
        players (*),
        game_reveal_state (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching games from Supabase:', error);
      throw error;
    }

    return (games || []).map((g) => {
      const photos = (g.photos || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const settings = Array.isArray(g.game_settings) ? g.game_settings[0] : g.game_settings;
      const revealState = Array.isArray(g.game_reveal_state) ? g.game_reveal_state[0] : g.game_reveal_state;
      return formatGameState(g, photos, settings, g.players || [], revealState, true);
    });
  },

  /**
   * Fetch single game by ID (supports case-insensitive short code match)
   */
  async getGame(gameId: string, isAdmin = false): Promise<GameState | null> {
    const cleanId = (gameId || '').trim();
    if (!cleanId) return null;

    let { data: g, error } = await supabase
      .from('games')
      .select(`
        *,
        photos (*),
        game_settings (*),
        players (*),
        game_reveal_state (*)
      `)
      .eq('id', cleanId)
      .maybeSingle();

    if (!g) {
      const { data: gIlike } = await supabase
        .from('games')
        .select(`
          *,
          photos (*),
          game_settings (*),
          players (*),
          game_reveal_state (*)
        `)
        .ilike('id', cleanId)
        .maybeSingle();
      g = gIlike;
    }

    if (!g) {
      return null;
    }

    const photos = (g.photos || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const settings = Array.isArray(g.game_settings) ? g.game_settings[0] : g.game_settings;
    const revealState = Array.isArray(g.game_reveal_state) ? g.game_reveal_state[0] : g.game_reveal_state;
    return formatGameState(g, photos, settings, g.players || [], revealState, isAdmin);
  },

  /**
   * Create a new game with a clean short 5-character code
   */
  async createGame(name: string, customCode?: string): Promise<GameState> {
    const id = (customCode?.trim().toUpperCase()) || generateGameCode();
    const createdAt = new Date().toISOString();

    // 1. Insert Game
    const { error: gameError } = await supabase.from('games').insert({
      id,
      name,
      status: 'waiting',
      current_photo_index: 0,
      created_at: createdAt,
    });
    if (gameError) throw gameError;

    // 2. Insert Settings
    const { error: settingsError } = await supabase.from('game_settings').insert({
      game_id: id,
      reveal_duration: DEFAULT_SETTINGS.revealDuration,
      reveal_interval: DEFAULT_SETTINGS.revealInterval,
      grid_rows: DEFAULT_SETTINGS.gridRows,
      grid_cols: DEFAULT_SETTINGS.gridCols,
      reveal_order: DEFAULT_SETTINGS.revealOrder,
      reveal_mode: DEFAULT_SETTINGS.revealMode,
      hints_enabled: DEFAULT_SETTINGS.hintsEnabled,
      timer_enabled: DEFAULT_SETTINGS.timerEnabled,
      multiple_attempts: DEFAULT_SETTINGS.multipleAttempts,
    });
    if (settingsError) throw settingsError;

    // 3. Insert initial Reveal State
    const { error: revealError } = await supabase.from('game_reveal_state').insert({
      game_id: id,
      photo_id: '',
      revealed_tiles: [],
      tile_order: generateTileOrder(DEFAULT_SETTINGS.gridRows * DEFAULT_SETTINGS.gridCols, 'random'),
      timer_remaining: DEFAULT_SETTINGS.revealDuration,
      is_answer_shown: false,
      current_hint_index: -1,
    });
    if (revealError) throw revealError;

    const game = await this.getGame(id, true);
    if (!game) throw new Error('Game was created but could not be retrieved');
    return game;
  },

  /**
   * Delete game
   */
  async deleteGame(gameId: string): Promise<void> {
    const { error } = await supabase.from('games').delete().eq('id', gameId);
    if (error) throw error;
  },

  /**
   * Upload a photo (to Supabase Storage + photos table)
   */
  async uploadPhoto(
    gameId: string,
    file: File,
    title: string,
    hints: string[],
    category: string
  ): Promise<Photo> {
    const id = uuidv4();
    const ext = file.name.split('.').pop() || 'png';
    const filePath = `${gameId}/${id}.${ext}`;

    let publicUrl = '';

    // Attempt upload to Supabase Storage bucket 'photos'
    try {
      const { error: storageError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (!storageError) {
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage bucket upload issue, converting to data URL:', e);
    }

    // Fallback if storage bucket doesn't exist or failed: convert to Data URL
    if (!publicUrl) {
      publicUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Determine next sort order
    const { data: existingPhotos } = await supabase
      .from('photos')
      .select('sort_order')
      .eq('game_id', gameId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const maxOrder = existingPhotos?.[0]?.sort_order ?? -1;
    const sortOrder = maxOrder + 1;

    const hintsStr = Array.isArray(hints) ? hints.join('||') : hints;

    const { data: inserted, error: insertError } = await supabase
      .from('photos')
      .insert({
        id,
        game_id: gameId,
        title,
        hints: hintsStr,
        file_path: publicUrl,
        sort_order: sortOrder,
        category: category || 'general',
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return formatPhoto(inserted, true);
  },

  /**
   * Update photo metadata
   */
  async updatePhoto(photoId: string, updates: Partial<Photo>): Promise<void> {
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.hints !== undefined) {
      payload.hints = Array.isArray(updates.hints) ? updates.hints.join('||') : updates.hints;
    }
    if (updates.category !== undefined) payload.category = updates.category;

    const { error } = await supabase.from('photos').update(payload).eq('id', photoId);
    if (error) throw error;
  },

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string): Promise<void> {
    const { error } = await supabase.from('photos').delete().eq('id', photoId);
    if (error) throw error;
  },

  /**
   * Reorder photos
   */
  async reorderPhotos(gameId: string, photoIds: string[]): Promise<void> {
    for (let index = 0; index < photoIds.length; index++) {
      await supabase
        .from('photos')
        .update({ sort_order: index })
        .eq('id', photoIds[index])
        .eq('game_id', gameId);
    }
  },

  /**
   * Update game settings
   */
  async updateSettings(gameId: string, settings: Partial<GameSettings>): Promise<void> {
    const payload: any = {};
    if (settings.revealDuration !== undefined) payload.reveal_duration = settings.revealDuration;
    if (settings.revealInterval !== undefined) payload.reveal_interval = settings.revealInterval;
    if (settings.gridRows !== undefined) payload.grid_rows = settings.gridRows;
    if (settings.gridCols !== undefined) payload.grid_cols = settings.gridCols;
    if (settings.revealOrder !== undefined) payload.reveal_order = settings.revealOrder;
    if (settings.revealMode !== undefined) payload.reveal_mode = settings.revealMode;
    if (settings.hintsEnabled !== undefined) payload.hints_enabled = settings.hintsEnabled;
    if (settings.timerEnabled !== undefined) payload.timer_enabled = settings.timerEnabled;
    if (settings.multipleAttempts !== undefined) payload.multiple_attempts = settings.multipleAttempts;

    const { error } = await supabase.from('game_settings').update(payload).eq('game_id', gameId);
    if (error) throw error;
  },

  /**
   * Join / register player
   */
  async joinPlayer(gameId: string, playerName: string): Promise<PlayerScore> {
    const game = await this.getGame(gameId, false);
    const resolvedGameId = game?.id || gameId;

    // Check if player with same name already exists in this game
    const { data: existing } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', resolvedGameId)
      .eq('name', playerName)
      .maybeSingle();

    if (existing) {
      return {
        id: existing.id,
        playerName: existing.name,
        score: existing.score || 0,
        correctAnswers: existing.correct_answers || 0,
        totalAttempts: existing.total_attempts || 0,
      };
    }

    const id = uuidv4();
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        id,
        game_id: resolvedGameId,
        name: playerName,
        score: 0,
        correct_answers: 0,
        total_attempts: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: newPlayer.id,
      playerName: newPlayer.name,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    };
  },

  /**
   * Submit guess from player
   */
  async submitGuess(
    gameId: string,
    playerId: string,
    guess: string,
    currentPhoto: Photo | null,
    revealedTilesCount: number,
    totalTiles: number,
    multipleAttempts: boolean
  ): Promise<{ isCorrect: boolean; message: string; score?: number }> {
    if (!currentPhoto) {
      return { isCorrect: false, message: 'No photo currently active.' };
    }

    // Check if player already guessed correctly
    const { data: priorSubmissions } = await supabase
      .from('submissions')
      .select('*')
      .eq('game_id', gameId)
      .eq('photo_id', currentPhoto.id)
      .eq('player_id', playerId);

    const alreadyCorrect = (priorSubmissions || []).some((s) => s.is_correct);
    if (alreadyCorrect) {
      return { isCorrect: false, message: 'You have already identified this photo correctly!' };
    }

    if (!multipleAttempts && priorSubmissions && priorSubmissions.length > 0) {
      return { isCorrect: false, message: 'Only one attempt allowed per photo.' };
    }

    // Evaluate answer
    const cleanGuess = normalizeGuess(guess);
    const cleanAnswer = normalizeGuess(currentPhoto.title);
    const isCorrect = cleanGuess.length > 0 && cleanGuess === cleanAnswer;

    // Insert submission
    await supabase.from('submissions').insert({
      id: uuidv4(),
      game_id: gameId,
      photo_id: currentPhoto.id,
      player_id: playerId,
      guess,
      is_correct: isCorrect,
      tiles_revealed: revealedTilesCount,
    });

    // Fetch current player stats
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (player) {
      const newAttempts = (player.total_attempts || 0) + 1;
      let points = 0;
      let newScore = player.score || 0;
      let newCorrect = player.correct_answers || 0;

      if (isCorrect) {
        points = Math.max(100, Math.round(1000 * (1 - revealedTilesCount / totalTiles)));
        newScore += points;
        newCorrect += 1;
      }

      await supabase
        .from('players')
        .update({
          score: newScore,
          correct_answers: newCorrect,
          total_attempts: newAttempts,
        })
        .eq('id', playerId);

      if (isCorrect) {
        return { isCorrect: true, message: 'Correct answer!', score: points };
      }
    }

    return { isCorrect: false, message: 'Incorrect guess. Try again!' };
  },

  /**
   * Update reveal state in database
   */
  async updateRevealState(
    gameId: string,
    state: Partial<{
      photo_id: string;
      revealed_tiles: number[];
      tile_order: number[];
      timer_remaining: number;
      is_answer_shown: boolean;
      current_hint_index: number;
    }>
  ): Promise<void> {
    await supabase
      .from('game_reveal_state')
      .upsert({
        game_id: gameId,
        ...state,
        updated_at: new Date().toISOString(),
      });
  },

  /**
   * Update game status
   */
  async updateGameStatus(
    gameId: string,
    status: GameState['status'],
    currentPhotoIndex?: number
  ): Promise<void> {
    const payload: any = { status };
    if (currentPhotoIndex !== undefined) {
      payload.current_photo_index = currentPhotoIndex;
    }
    await supabase.from('games').update(payload).eq('id', gameId);
  },
};

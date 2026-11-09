import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Upload,
  Plus,
  Image,
  Clock,
  Trophy,
  ChevronDown,
  Camera,
  Layers,
} from 'lucide-react';
import { useAdminGame } from '../hooks/useAdminGame';
import PhotoUpload from '../components/admin/PhotoUpload';
import PhotoList from '../components/admin/PhotoList';
import RevealSettings from '../components/admin/RevealSettings';
import GameControls from '../components/admin/GameControls';
import GamePreview from '../components/admin/GamePreview';
import { DEFAULT_SETTINGS } from '../types';

const statusBadge: Record<string, { label: string; cls: string }> = {
  waiting: { label: 'Waiting', cls: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30' },
  active: { label: 'Active', cls: 'bg-gaming-green/15 text-gaming-green border-gaming-green/30' },
  paused: { label: 'Paused', cls: 'bg-orange-400/15 text-orange-400 border-orange-400/30' },
  revealing_answer: { label: 'Revealing', cls: 'bg-electric-400/15 text-electric-400 border-electric-400/30' },
  finished: { label: 'Finished', cls: 'bg-white/10 text-white/50 border-white/10' },
};

export default function AdminPanel() {
  const {
    game,
    games,
    loading,
    error,
    createGame,
    selectGame,
    deselectGame,
    uploadPhoto,
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
  } = useAdminGame();

  const [newGameName, setNewGameName] = useState('');
  const [showNewGame, setShowNewGame] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const handleCreateGame = async () => {
    if (!newGameName.trim()) return;
    await createGame(newGameName.trim());
    setNewGameName('');
    setShowNewGame(false);
  };

  const handleSelectGame = async (gameId: string) => {
    await selectGame(gameId);
    setShowSelector(false);
  };

  const isGameActive = game && (game.status === 'active' || game.status === 'paused');

  return (
    <div className="min-h-screen bg-navy-950">
      {/* ─── Top Bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-lg border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-4 max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Camera className="w-6 h-6 text-gaming-purple" />
              <h1 className="text-lg font-bold text-white tracking-tight">
                Photo Reveal Game
                <span className="text-gaming-purple ml-1.5">— Admin</span>
              </h1>
            </div>

            {/* Game Selector */}
            <div className="relative ml-4 flex items-center gap-2">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
              >
                {game ? (
                  <>
                    <Layers className="w-4 h-4 text-gaming-purple" />
                    {game.name}
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Select Game
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>

              {game && (
                <button
                  onClick={() => deselectGame()}
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                  title="Back to all games overview"
                >
                  <span>← All Games</span>
                </button>
              )}

              <AnimatePresence>
                {showSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 left-0 w-64 bg-navy-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    {games.length === 0 ? (
                      <div className="p-4 text-sm text-white/40 text-center">No games yet</div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            deselectGame();
                            setShowSelector(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-purple-300 font-semibold hover:bg-white/5 border-b border-white/5 transition-colors flex items-center gap-1.5"
                        >
                          <span>← All Games Overview</span>
                        </button>
                        {games.map((g) => {
                          const badge = statusBadge[g.status] || statusBadge.waiting;
                          return (
                            <button
                              key={g.id}
                              onClick={() => handleSelectGame(g.id)}
                              className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between ${
                                game?.id === g.id ? 'bg-gaming-purple/10' : ''
                              }`}
                            >
                              <div>
                                <div className="text-sm font-medium text-white">{g.name}</div>
                                <div className="text-[10px] text-white/30 mt-0.5">
                                  {g.photos?.length ?? 0} photos
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* New Game Button & Player View Link */}
          <div className="flex items-center gap-3">
            {game && (
              <a
                href={`/play?gameId=${game.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-sm px-4 py-2 flex items-center gap-1.5 text-electric-400 hover:text-electric-300 border-electric-500/30 hover:border-electric-500/60"
              >
                <span>Launch Player View ↗</span>
              </a>
            )}

            {showNewGame ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Game name..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
                  className="input-field text-sm w-48 py-2"
                  autoFocus
                />
                <button onClick={handleCreateGame} disabled={loading} className="btn-primary text-sm px-4 py-2">
                  Create
                </button>
                <button
                  onClick={() => setShowNewGame(false)}
                  className="text-white/40 hover:text-white/70 text-sm px-2"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <button onClick={() => setShowNewGame(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Game
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Error Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 text-sm text-red-300"
          >
            <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-red-400">{error}</p>
                {error.includes('table') && (
                  <p className="text-xs text-white/60 mt-1">
                    Database tables need to be created in your Supabase project. Run the SQL script from{' '}
                    <code className="bg-black/40 px-1.5 py-0.5 rounded text-purple-300 font-mono">
                      supabase/schema.sql
                    </code>{' '}
                    in your Supabase SQL Editor.
                  </p>
                )}
              </div>
              {error.includes('table') && (
                <a
                  href="https://supabase.com/dashboard/project/floplvhatnjoihuycoxn/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-gaming-purple/20 border border-gaming-purple/40 text-purple-300 hover:bg-gaming-purple/30 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5"
                >
                  Open Supabase SQL Editor ↗
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Layout ──────────────────────────────────────── */}
      <div className="max-w-[1800px] mx-auto">
        {!game ? (
          /* ─── No Game Selected: Show Game Cards ──────────── */
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Your Games</h2>
              <p className="text-white/40 text-sm">Select a game to manage or create a new one</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-gaming-purple/30 border-t-gaming-purple rounded-full animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card text-center py-20 max-w-lg mx-auto"
              >
                <Image className="w-20 h-20 mx-auto mb-6 text-white/10" />
                <h3 className="text-xl font-semibold text-white/50 mb-2">No games yet</h3>
                <p className="text-sm text-white/30 mb-6">Create your first game to get started</p>
                <button onClick={() => setShowNewGame(true)} className="btn-primary">
                  <Plus className="w-4 h-4 inline mr-2" />
                  Create Your First Game
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {games.map((g, i) => {
                  const badge = statusBadge[g.status] || statusBadge.waiting;
                  return (
                    <motion.div
                      key={g.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="card cursor-pointer hover:border-gaming-purple/30 hover:shadow-gaming-purple/10 hover:shadow-lg transition-all group"
                      onClick={() => handleSelectGame(g.id)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-white group-hover:text-gaming-purple transition-colors">
                          {g.name}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <div className="flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5" />
                          {g.photos?.length ?? 0} photos
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5" />
                          {g.scores?.length ?? 0} players
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-white/20 mt-3">
                        <Clock className="w-3 h-3" />
                        {g.settings?.gridRows ?? 4}×{g.settings?.gridCols ?? 4} grid
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ─── Game Selected: Dashboard Layout ────────────── */
          <div className="flex min-h-[calc(100vh-65px)]">
            {/* Left Sidebar: Settings */}
            <aside className="w-80 flex-shrink-0 border-r border-white/5 p-5 overflow-y-auto">
              <RevealSettings
                settings={game.settings || DEFAULT_SETTINGS}
                onUpdate={(s) => updateSettings(game.id, s)}
                disabled={!!isGameActive}
              />
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 overflow-y-auto space-y-6">
              {(!game.photos || game.photos.length === 0) ? (
                /* No photos: prominent upload */
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white mb-1">Add Photos to "{game.name}"</h2>
                    <p className="text-sm text-white/40">Upload photos for players to guess</p>
                  </div>
                  <PhotoUpload gameId={game.id} onUpload={uploadPhoto} />
                </div>
              ) : (
                /* Has photos: full dashboard */
                <>
                  {/* Upload Toggle */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">{game.name}</h2>
                    <button
                      onClick={() => setShowUpload(!showUpload)}
                      className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {showUpload ? 'Hide Upload' : 'Add Photos'}
                    </button>
                  </div>

                  {/* Upload Area (collapsible) */}
                  <AnimatePresence>
                    {showUpload && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <PhotoUpload gameId={game.id} onUpload={uploadPhoto} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Photo List */}
                  <PhotoList
                    photos={game.photos}
                    gameId={game.id}
                    onDelete={deletePhoto}
                    onReorder={reorderPhotos}
                    currentPhotoIndex={game.currentPhotoIndex}
                  />

                  {/* Game Controls */}
                  <GameControls
                    game={game}
                    onStart={startGame}
                    onPause={pauseGame}
                    onResume={resumeGame}
                    onRevealNext={revealNext}
                    onRevealAll={revealAll}
                    onSkip={skipPhoto}
                    onNext={nextPhoto}
                    onShowAnswer={showAnswer}
                    onRestartRound={restartRound}
                    onEndGame={endGame}
                    onShowHint={showHint}
                  />

                  {/* Game Preview */}
                  <GamePreview game={game} />
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

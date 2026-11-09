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
  Copy,
  Check,
  ExternalLink,
  Shield,
  Eye,
  Share2,
} from 'lucide-react';
import { useAdminGame } from '../hooks/useAdminGame';
import PhotoUpload from '../components/admin/PhotoUpload';
import PhotoList from '../components/admin/PhotoList';
import RevealSettings from '../components/admin/RevealSettings';
import GameControls from '../components/admin/GameControls';
import GamePreview from '../components/admin/GamePreview';
import { UserPanel } from './UserPanel';
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
  const [viewMode, setViewMode] = useState<'admin' | 'player'>('admin');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/play?gameId=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) return;
    await createGame(newGameName.trim());
    setNewGameName('');
    setShowNewGame(false);
    setViewMode('admin');
  };

  const handleSelectGame = async (gameId: string) => {
    await selectGame(gameId);
    setShowSelector(false);
    setViewMode('admin');
  };

  const isGameActive = game && (game.status === 'active' || game.status === 'paused');

  return (
    <div className="min-h-screen bg-navy-950">
      {/* ─── Top Bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-navy-950/95 backdrop-blur-lg border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-gaming-purple shrink-0" />
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center">
                <span>Photo Reveal</span>
                <span className="text-gaming-purple ml-1.5 text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">Admin</span>
              </h1>
            </div>

            {/* Game Selector */}
            <div className="relative flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="btn-secondary text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2 max-w-[180px] sm:max-w-xs truncate"
              >
                {game ? (
                  <>
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gaming-purple shrink-0" />
                    <span className="truncate">{game.name}</span>
                  </>
                ) : (
                  <>
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Select Game</span>
                  </>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
              </button>

              {game && (
                <button
                  onClick={() => deselectGame()}
                  className="text-xs text-white/50 hover:text-white flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 whitespace-nowrap"
                  title="Back to all games overview"
                >
                  <span>← All</span>
                </button>
              )}

              <AnimatePresence>
                {showSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 left-0 w-72 max-w-[90vw] bg-navy-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
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
                              <div className="min-w-0 mr-2">
                                <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                                  <span>{g.name}</span>
                                  <span className="font-mono text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-semibold shrink-0">
                                    {g.id}
                                  </span>
                                </div>
                                <div className="text-[10px] text-white/30 mt-0.5">
                                  {g.photos?.length ?? 0} photos
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${badge.cls}`}
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

          {/* Right Header Actions: Game Code, View Toggle & New Game */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {game && (
              <>
                {/* 5-Character Game Code Badge */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-sm">
                  <span className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wider font-semibold">Code:</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-gaming-purple tracking-widest">{game.id}</span>
                  <button
                    onClick={() => handleCopyCode(game.id)}
                    className="p-1 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-colors"
                    title="Copy 5-letter game code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-gaming-green" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopyLink(game.id)}
                    className="p-1 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-colors"
                    title="Copy player invite link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-gaming-green" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* View Mode Toggle: Host Controls vs Player View */}
                <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-xl">
                  <button
                    onClick={() => setViewMode('admin')}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'admin'
                        ? 'bg-gaming-purple text-white shadow-md shadow-gaming-purple/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Host Controls</span>
                  </button>
                  <button
                    onClick={() => setViewMode('player')}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'player'
                        ? 'bg-electric-500 text-navy-950 font-bold shadow-md shadow-electric-500/30'
                        : 'text-electric-400 hover:text-electric-300 hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Player View</span>
                  </button>
                </div>

                {/* External Tab Launcher */}
                <a
                  href={`/play?gameId=${game.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 sm:p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-colors"
                  title="Open Player View in separate tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              </>
            )}

            {showNewGame ? (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                className="flex items-center gap-1.5 sm:gap-2 flex-wrap"
              >
                <input
                  type="text"
                  placeholder="Game name..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
                  className="input-field text-xs sm:text-sm w-36 sm:w-48 py-1.5 sm:py-2"
                  autoFocus
                />
                <button onClick={handleCreateGame} disabled={loading} className="btn-primary text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2">
                  Create
                </button>
                <button
                  onClick={() => setShowNewGame(false)}
                  className="text-white/40 hover:text-white/70 text-xs sm:text-sm px-1.5 sm:px-2"
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <button onClick={() => setShowNewGame(true)} className="btn-primary text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>New Game</span>
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-purple-300">
                          <span className="text-white/40 text-[10px]">CODE:</span>
                          <span className="tracking-wider text-gaming-purple font-bold">{g.id}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-gaming-purple transition-colors mb-3.5 truncate">
                        {g.name}
                      </h3>

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
        ) : viewMode === 'player' ? (
          /* ─── Player View: Embedded User Panel ────────────── */
          <div className="flex flex-col min-h-[calc(100vh-65px)]">
            <div className="bg-gradient-to-r from-electric-950/60 via-purple-950/40 to-navy-900 border-b border-electric-500/20 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="w-2 h-2 rounded-full bg-electric-400 animate-pulse" />
                <span className="text-white/70">Player Live View for:</span>
                <span className="font-bold text-white">{game.name}</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-electric-300 font-semibold text-xs ml-1">
                  {game.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(game.id)}
                  className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 text-white/70 hover:text-white"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-gaming-green" /> : <Share2 className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Share Link'}</span>
                </button>
                <button
                  onClick={() => setViewMode('admin')}
                  className="btn-primary text-xs px-3 py-1 flex items-center gap-1 shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Back to Host Controls</span>
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              <UserPanel
                embeddedGameId={game.id}
                autoJoinName="Host Preview"
                onExit={() => setViewMode('admin')}
              />
            </div>
          </div>
        ) : (
          /* ─── Game Selected: Dashboard Layout ────────────── */
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
            {/* Left Sidebar: Settings */}
            <aside className="w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 p-4 sm:p-5 overflow-y-auto">
              <RevealSettings
                settings={game.settings || DEFAULT_SETTINGS}
                onUpdate={(s) => updateSettings(game.id, s)}
                disabled={!!isGameActive}
              />
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
              {(!game.photos || game.photos.length === 0) ? (
                /* No photos: prominent upload */
                <div>
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Add Photos to "{game.name}"</h2>
                    <p className="text-xs sm:text-sm text-white/40">Upload photos for players to guess</p>
                  </div>
                  <PhotoUpload gameId={game.id} onUpload={uploadPhoto} />
                </div>
              ) : (
                /* Has photos: full dashboard */
                <>
                  {/* Upload Toggle */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate max-w-xs sm:max-w-md">{game.name}</h2>
                    <button
                      onClick={() => setShowUpload(!showUpload)}
                      className="btn-secondary text-xs sm:text-sm px-3.5 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2"
                    >
                      <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{showUpload ? 'Hide Upload' : 'Add Photos'}</span>
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

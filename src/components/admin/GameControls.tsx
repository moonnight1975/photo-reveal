import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  Eye,
  RefreshCw,
  Square,
  ChevronRight,
  Trophy,
  Lightbulb,
  Clock,
  ArrowRight,
  RotateCcw,
  Camera,
} from 'lucide-react';
import type { GameState } from '../../types';

interface GameControlsProps {
  game: GameState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRevealNext: () => void;
  onRevealAll: () => void;
  onSkip: () => void;
  onNext: () => void;
  onShowAnswer: () => void;
  onRestartRound: () => void;
  onEndGame: () => void;
  onShowHint: () => void;
}

const statusConfig: Record<string, { label: string; color: string; dotClass: string }> = {
  waiting: { label: 'Waiting to Start', color: 'text-yellow-400', dotClass: 'bg-yellow-400' },
  active: { label: 'Game Active', color: 'text-gaming-green', dotClass: 'bg-gaming-green' },
  paused: { label: 'Paused', color: 'text-orange-400', dotClass: 'bg-orange-400' },
  revealing_answer: { label: 'Revealing Answer', color: 'text-electric-400', dotClass: 'bg-electric-400' },
  finished: { label: 'Finished', color: 'text-white/50', dotClass: 'bg-white/50' },
};

export default function GameControls({
  game,
  onStart,
  onPause,
  onResume,
  onRevealNext,
  onRevealAll,
  onSkip,
  onNext,
  onShowAnswer,
  onRestartRound,
  onEndGame,
  onShowHint,
}: GameControlsProps) {
  const { status } = game;
  const config = statusConfig[status] || statusConfig.waiting;

  const isActive = status === 'active';
  const isPaused = status === 'paused';
  const isWaiting = status === 'waiting';
  const isFinished = status === 'finished';
  const isRevealing = status === 'revealing_answer';

  const canReveal = isActive || isPaused;
  const canNavigate = isActive || isPaused || isRevealing;

  const photos = game.photos || [];
  const currentPhoto = photos[game.currentPhotoIndex];
  const timerRemaining = game.revealState?.timerRemaining ?? 0;
  const revealedCount = game.revealState?.revealedTiles?.length ?? 0;
  const totalTiles = (game.settings?.gridRows || 4) * (game.settings?.gridCols || 4);
  const scores = game.scores || [];
  const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);

  return (
    <div className="space-y-5">
      {/* Status Bar */}
      <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isActive ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`}
            />
            <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm text-white/60">
          {/* Current Photo */}
          {photos.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-gaming-purple shrink-0" />
              <span>
                Photo{' '}
                <span className="text-white font-semibold">{game.currentPhotoIndex + 1}</span> of{' '}
                <span className="text-white">{photos.length}</span>
              </span>
            </div>
          )}

          {/* Timer */}
          {game.settings.timerEnabled && game.revealState && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-electric-400 shrink-0" />
              <span className="font-mono text-white font-semibold">{timerRemaining}s</span>
            </div>
          )}

          {/* Revealed Tiles */}
          {game.revealState && (
            <div className="flex items-center gap-1.5 text-white/40">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                {revealedCount}/{totalTiles} tiles
              </span>
            </div>
          )}

          {/* Score */}
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
            <span>
              <span className="text-white font-semibold">{scores.length}</span> players ·{' '}
              <span className="text-yellow-400">{totalScore}</span> pts
            </span>
          </div>
        </div>
      </div>

      {/* Current Photo Info */}
      {currentPhoto && (
        <div className="text-xs text-white/40 px-1">
          Current: <span className="text-white/60 font-medium">{currentPhoto.title}</span>
          {currentPhoto.category && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-400 text-[10px]">
              {currentPhoto.category}
            </span>
          )}
        </div>
      )}

      {/* Control Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Group 1: Game Flow */}
        <div className="card space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Game Flow</h4>
          <div className="flex flex-wrap gap-2">
            {isWaiting && (
              <ControlButton
                onClick={onStart}
                icon={<Play className="w-4 h-4" />}
                label={photos.length === 0 ? 'Add Photos to Start' : 'Start Game'}
                variant="success"
                disabled={photos.length === 0}
              />
            )}
            {isFinished && (
              <ControlButton onClick={onStart} icon={<RotateCcw className="w-4 h-4" />} label="Play Again" variant="success" />
            )}
            {isActive && (
              <ControlButton onClick={onPause} icon={<Pause className="w-4 h-4" />} label="Pause" variant="warning" />
            )}
            {isPaused && (
              <ControlButton onClick={onResume} icon={<Play className="w-4 h-4" />} label="Resume" variant="success" />
            )}
            {!isWaiting && !isFinished && (
              <ControlButton onClick={onEndGame} icon={<Square className="w-4 h-4" />} label="End Game" variant="danger" />
            )}
          </div>
        </div>

        {/* Group 2: Reveal Controls */}
        <div className="card space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Reveal Controls</h4>
          <div className="flex flex-wrap gap-2">
            <ControlButton
              onClick={onRevealNext}
              icon={<ChevronRight className="w-4 h-4" />}
              label="Reveal Tile"
              variant="primary"
              disabled={!canReveal}
            />
            <ControlButton
              onClick={onRevealAll}
              icon={<Eye className="w-4 h-4" />}
              label="Reveal All"
              variant="primary"
              disabled={!canReveal}
            />
            <ControlButton
              onClick={onShowAnswer}
              icon={<ArrowRight className="w-4 h-4" />}
              label="Show Answer"
              variant="primary"
              disabled={!canReveal}
            />
          </div>
        </div>

        {/* Group 3: Navigation */}
        <div className="card space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Navigation</h4>
          <div className="flex flex-wrap gap-2">
            <ControlButton
              onClick={onSkip}
              icon={<SkipForward className="w-4 h-4" />}
              label="Skip Photo"
              variant="secondary"
              disabled={!canNavigate}
            />
            <ControlButton
              onClick={onNext}
              icon={<ChevronRight className="w-4 h-4" />}
              label="Next Photo"
              variant="secondary"
              disabled={!canNavigate}
            />
            <ControlButton
              onClick={onRestartRound}
              icon={<RotateCcw className="w-4 h-4" />}
              label="Restart Round"
              variant="secondary"
              disabled={!canNavigate}
            />
          </div>
        </div>

        {/* Group 4: Extras */}
        <div className="card space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">Extras</h4>
          <div className="flex flex-wrap gap-2">
            <ControlButton
              onClick={onShowHint}
              icon={<Lightbulb className="w-4 h-4" />}
              label="Show Hint"
              variant="secondary"
              disabled={!canReveal || !game.settings.hintsEnabled}
            />
            <ControlButton
              onClick={onRestartRound}
              icon={<RefreshCw className="w-4 h-4" />}
              label="Reset Tiles"
              variant="secondary"
              disabled={!canReveal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Control Button ─────────────────────────────────────────

function ControlButton({
  onClick,
  icon,
  label,
  variant = 'secondary',
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
}) {
  const variantClasses: Record<string, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success',
    warning: 'px-6 py-3 bg-orange-500/80 border border-orange-500/30 rounded-xl font-semibold text-white hover:bg-orange-500 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClasses[variant]} text-xs sm:text-sm px-3.5 py-2 sm:px-4 sm:py-2.5 flex items-center gap-1.5 sm:gap-2 justify-center`}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}

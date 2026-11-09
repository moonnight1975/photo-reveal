import { motion } from 'framer-motion';
import { Eye, Clock, Lightbulb, HelpCircle } from 'lucide-react';
import type { GameState } from '../../types';

interface GamePreviewProps {
  game: GameState;
}

export default function GamePreview({ game }: GamePreviewProps) {
  const { settings, revealState, photos, currentPhotoIndex } = game;
  const currentPhoto = photos[currentPhotoIndex];
  const { gridRows, gridCols } = settings;
  const totalTiles = gridRows * gridCols;
  const revealedTiles = revealState?.revealedTiles ?? [];
  const timerRemaining = revealState?.timerRemaining ?? 0;
  const currentHintIndex = revealState?.currentHintIndex ?? -1;
  const isAnswerShown = revealState?.isAnswerShown ?? false;

  if (!currentPhoto) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-gaming-purple" />
          <h3 className="font-semibold text-white/80">Live Preview</h3>
        </div>
        <div className="aspect-video bg-navy-900/60 rounded-xl flex items-center justify-center text-white/30">
          No photo to preview
        </div>
      </div>
    );
  }

  const photoUrl = currentPhoto.filePath?.startsWith('/') ? currentPhoto.filePath : `/${currentPhoto.filePath}`;
  const revealedCount = revealedTiles.length;
  const progressPercent = totalTiles > 0 ? (revealedCount / totalTiles) * 100 : 0;

  const hints = Array.isArray(currentPhoto.hints) ? currentPhoto.hints : [];
  const revealedHints =
    currentHintIndex >= 0 ? hints.slice(0, currentHintIndex + 1) : [];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-gaming-purple" />
          <h3 className="font-semibold text-white/80">Live Preview</h3>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gaming-green/20 text-gaming-green font-medium">
            Admin View
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/50">
          {settings.timerEnabled && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-electric-400" />
              <span className="font-mono font-semibold text-white">{timerRemaining}s</span>
            </div>
          )}
          <span>
            {revealedCount}/{totalTiles} tiles
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-navy-900 rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-gaming-purple to-electric-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: 'spring', stiffness: 100 }}
        />
      </div>

      {/* Grid Preview */}
      <div className="aspect-[4/3] bg-navy-900 rounded-xl overflow-hidden border border-white/10 relative shadow-inner">
        <img
          src={photoUrl}
          alt={currentPhoto.title}
          className="absolute inset-0 w-full h-full object-cover select-none"
          draggable={false}
        />
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: '2px',
            backgroundColor: 'rgba(7, 7, 20, 0.4)',
          }}
        >
          {Array.from({ length: totalTiles }).map((_, index) => {
            const isRevealed = revealedTiles.includes(index) || isAnswerShown;

            return (
              <div key={index} className="relative w-full h-full overflow-hidden">
                {!isRevealed && (
                  <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 border border-purple-500/10 flex items-center justify-center">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400/30" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Answer (Admin Only) */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gaming-purple/10 border border-gaming-purple/20">
          <span className="text-xs text-white/50">Answer:</span>
          <span className={`text-sm font-semibold ${isAnswerShown ? 'text-gaming-green' : 'text-gaming-purple'}`}>
            {currentPhoto.title}
          </span>
          {isAnswerShown && (
            <span className="ml-auto text-[10px] uppercase tracking-wider text-gaming-green bg-gaming-green/10 px-2 py-0.5 rounded-full">
              Revealed
            </span>
          )}
        </div>

        {/* Hints */}
        {hints.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <Lightbulb className="w-3.5 h-3.5" />
              Hints
            </div>
            <div className="space-y-1.5">
              {hints.map((hint, i) => {
                const shown = i < revealedHints.length;
                return (
                  <div
                    key={i}
                    className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                      shown
                        ? 'bg-yellow-400/10 border-yellow-400/20 text-yellow-300'
                        : 'bg-navy-900/40 border-white/5 text-white/20'
                    }`}
                  >
                    <span className="font-mono mr-2 text-[10px]">#{i + 1}</span>
                    {shown ? hint : '• • •'}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Sparkles } from 'lucide-react';

interface RevealGridProps {
  photoUrl: string;
  revealedTiles: number[];
  gridRows: number;
  gridCols: number;
  isAnswerShown: boolean;
  category?: string;
}

export const RevealGrid: React.FC<RevealGridProps> = ({
  photoUrl,
  revealedTiles,
  gridRows = 4,
  gridCols = 4,
  isAnswerShown,
  category,
}) => {
  const totalTiles = gridRows * gridCols;
  const revealedSet = new Set(isAnswerShown ? Array.from({ length: totalTiles }, (_, i) => i) : revealedTiles);

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/30 bg-navy-900 group">
        {/* Actual Image behind tiles */}
        <img
          src={photoUrl}
          alt="Guess the mystery subject"
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 select-none ${
            isAnswerShown ? 'scale-105 filter brightness-105' : 'scale-100'
          }`}
          draggable={false}
        />

        {/* Category Badge overlay */}
        {category && (
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-navy-950/80 backdrop-blur-md text-purple-300 border border-purple-500/40 shadow-lg flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {category.toUpperCase()}
            </span>
          </div>
        )}

        {/* Progress pill overlay */}
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-navy-950/80 backdrop-blur-md text-electric-400 border border-blue-500/40 shadow-lg">
            {revealedSet.size} / {totalTiles} REVEALED
          </span>
        </div>

        {/* Grid of covering tiles */}
        <div
          className="absolute inset-0 z-20 grid"
          style={{
            gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            gap: '2px',
            backgroundColor: 'rgba(7, 7, 20, 0.4)',
          }}
        >
          {Array.from({ length: totalTiles }).map((_, index) => {
            const isRevealed = revealedSet.has(index);

            return (
              <div key={index} className="relative w-full h-full overflow-hidden">
                <AnimatePresence mode="wait">
                  {!isRevealed && (
                    <motion.div
                      key={`tile-${index}`}
                      initial={{ opacity: 1, scale: 1, rotateY: 0 }}
                      exit={{
                        opacity: 0,
                        scale: 0.85,
                        rotateY: 90,
                        transition: { duration: 0.45, ease: 'easeInOut' },
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 border border-purple-500/10 hover:border-purple-500/30 transition-colors shadow-inner cursor-default"
                    >
                      <div className="flex flex-col items-center justify-center opacity-40 hover:opacity-75 transition-opacity">
                        <HelpCircle className="w-5 h-5 text-purple-400/80 mb-0.5" />
                        <span className="text-[10px] font-mono text-gray-400 select-none">
                          #{index + 1}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Full reveal glow effect when answer is revealed */}
        {isAnswerShown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 pointer-events-none ring-4 ring-emerald-500/50 rounded-2xl"
          />
        )}
      </div>
    </div>
  );
};

export default RevealGrid;

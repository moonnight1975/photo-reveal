import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { PlayerScore } from '../../types';

interface GameOverProps {
  photoUrl: string;
  answer: string;
  scores: PlayerScore[];
  playerName: string;
  isLastPhoto: boolean;
}

export const GameOver: React.FC<GameOverProps> = ({
  photoUrl,
  answer,
  scores = [],
  playerName,
  isLastPhoto = false,
}) => {
  // Sort scores descending
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center"
    >
      {/* Header Badge */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold text-sm mb-3"
        >
          {isLastPhoto ? (
            <>
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>GAME COMPLETE</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-electric-400" />
              <span>ROUND REVEAL</span>
            </>
          )}
        </motion.div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {isLastPhoto ? 'Final Standings' : 'The Answer Is...'}
        </h1>
      </div>

      {/* Answer Spotlight Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-lg bg-navy-900/90 border-2 border-purple-500/40 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col items-center mb-6 sm:mb-8 overflow-hidden relative"
      >
        <div className="w-full aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4 relative shadow-inner">
          <img
            src={photoUrl}
            alt={answer}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent pointer-events-none" />
        </div>

        <div className="text-center px-2">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-purple-400 font-semibold">
            Identified As
          </span>
          <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-electric-400 mt-0.5 sm:mt-1 uppercase truncate max-w-sm sm:max-w-md">
            {answer}
          </h2>
        </div>
      </motion.div>

      {/* Leaderboard Table */}
      <div className="w-full max-w-2xl bg-navy-900/80 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">Leaderboard</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            {sortedScores.length} {sortedScores.length === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        <div className="space-y-2 sm:space-y-2.5">
          {sortedScores.map((score, index) => {
            const isCurrentPlayer =
              score.playerName === playerName || (score as any).name === playerName;
            const displayName = score.playerName || (score as any).name || 'Anonymous';

            return (
              <motion.div
                key={score.id || index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className={`flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all ${
                  isCurrentPlayer
                    ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/50 shadow-lg'
                    : 'bg-navy-950/60 border border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                    {index === 0 ? (
                      <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                    ) : index === 1 ? (
                      <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                    ) : index === 2 ? (
                      <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                    ) : (
                      <span className="text-gray-500 font-mono">#{index + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-bold text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-xs">
                        {displayName}
                      </span>
                      {isCurrentPlayer && (
                        <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                        <span>{score.correctAnswers ?? (score as any).correct_answers ?? 0} Correct</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-extrabold text-base sm:text-lg text-electric-400">
                    {score.score.toLocaleString()}
                  </div>
                  <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                    PTS
                  </span>
                </div>
              </motion.div>
            );
          })}

          {sortedScores.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No player submissions yet.
            </div>
          )}
        </div>

        {/* Footer info message */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Clock className="w-4 h-4 animate-spin text-purple-400" />
          <span>
            {isLastPhoto
              ? 'Game has ended. Thank you for playing!'
              : 'Waiting for the host to start the next photo...'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default GameOver;

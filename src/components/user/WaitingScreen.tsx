import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Eye, Clock } from 'lucide-react';

interface WaitingScreenProps {
  gameName: string;
  playerName: string;
  playerCount?: number;
  onLeave?: () => void;
}

const tips = [
  { icon: Zap, text: 'Try to guess early for more points!' },
  { icon: Eye, text: 'Pay attention to colors and shapes as tiles reveal.' },
  { icon: Clock, text: 'The faster you guess, the higher your score!' },
  { icon: Zap, text: 'Look for distinctive patterns and outlines.' },
  { icon: Eye, text: 'Context clues from revealed tiles can help narrow it down.' },
];

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
  gameName,
  playerName,
  playerCount,
  onLeave,
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gray-950 overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/40 via-gray-950 to-indigo-950/40" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-lg"
      >
        {/* Game name */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-2"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium">
            {gameName}
          </span>
        </motion.div>

        {/* Welcome message */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-white/70 mt-4 mb-1"
        >
          Welcome, <span className="text-white font-semibold">{playerName}</span>!
        </motion.h2>

        {/* Animated dots loader */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-purple-500"
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <p className="text-white/50 text-sm">
            Waiting for the host to start the game...
          </p>
        </motion.div>

        {/* Get Ready */}
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-8"
        >
          <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Get Ready!
          </span>
        </motion.div>

        {/* Player count */}
        {playerCount !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 text-white/40 text-sm mb-8"
          >
            <Users size={16} />
            <span>
              {playerCount} player{playerCount !== 1 ? 's' : ''} connected
            </span>
          </motion.div>
        )}

        {/* Tips carousel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/[0.04] border border-white/[0.06] rounded-xl sm:rounded-2xl p-4 sm:p-5 min-h-[70px] sm:min-h-[80px] flex items-center justify-center"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 sm:gap-3"
            >
              {React.createElement(tips[tipIndex].icon, {
                size: 18,
                className: 'text-purple-400 shrink-0',
              })}
              <span className="text-white/60 text-xs sm:text-sm text-left">
                {tips[tipIndex].text}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {onLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6"
          >
            <button
              onClick={onLeave}
              className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
            >
              ← Leave Game / Switch Code
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameTimerProps {
  remaining: number;
  total: number;
  isPaused: boolean;
}

export const GameTimer: React.FC<GameTimerProps> = ({ remaining, total, isPaused }) => {
  const fraction = total > 0 ? remaining / total : 1;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - fraction);

  const getColor = () => {
    if (fraction > 0.6) return '#22c55e';  // green-500
    if (fraction > 0.3) return '#eab308';  // yellow-500
    return '#ef4444';                       // red-500
  };

  const isUrgent = remaining <= 10 && remaining > 0;
  const color = getColor();

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={isUrgent && !isPaused ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={isUrgent ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } : {}}
        className="relative w-20 h-20 sm:w-24 sm:h-24"
      >
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          {/* Progress ring */}
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'linear' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={remaining}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-2xl sm:text-3xl font-bold tabular-nums"
              style={{ color }}
            >
              {Math.ceil(remaining)}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-lg opacity-20"
          style={{ backgroundColor: color }}
        />
      </motion.div>

      {/* Paused overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-sm"
          >
            <span className="text-xs font-bold text-yellow-400 tracking-widest uppercase">
              Paused
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

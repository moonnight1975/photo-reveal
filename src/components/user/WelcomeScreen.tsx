import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, HelpCircle, Sparkles } from 'lucide-react';
import { supabaseGameService } from '../../services/supabaseGameService';

interface WelcomeScreenProps {
  onJoin: (gameId: string, playerName: string) => void;
  defaultGameId?: string;
}

const floatingIcons = [
  { Icon: HelpCircle, x: '10%', y: '15%', delay: 0, size: 28 },
  { Icon: Camera, x: '85%', y: '20%', delay: 1.2, size: 24 },
  { Icon: HelpCircle, x: '75%', y: '75%', delay: 0.6, size: 32 },
  { Icon: Camera, x: '15%', y: '80%', delay: 1.8, size: 22 },
  { Icon: Sparkles, x: '50%', y: '10%', delay: 0.3, size: 20 },
  { Icon: HelpCircle, x: '90%', y: '50%', delay: 2.1, size: 26 },
  { Icon: Camera, x: '5%', y: '50%', delay: 1.5, size: 30 },
  { Icon: Sparkles, x: '30%', y: '90%', delay: 0.9, size: 18 },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onJoin, defaultGameId }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState(defaultGameId || '');
  const [availableGames, setAvailableGames] = useState<{ id: string; name: string; status: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    supabaseGameService
      .getAllGames()
      .then((games) => {
        if (Array.isArray(games)) {
          setAvailableGames(games);
          if (!defaultGameId && games.length > 0) {
            const active = games.find((g: any) => g.status === 'active' || g.status === 'waiting') || games[0];
            if (active) setGameId(active.id);
          }
        }
      })
      .catch(() => {});
  }, [defaultGameId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = playerName.trim();
    const trimmedId = gameId.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (!trimmedId) {
      setError('Please enter a game code');
      return;
    }
    setError('');
    onJoin(trimmedId, trimmedName);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/80 via-gray-950 to-indigo-950/80 animate-gradient-shift" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Floating decorative icons */}
      {floatingIcons.map(({ Icon, x, y, delay, size }, i) => (
        <motion.div
          key={i}
          className="absolute text-white/[0.06] pointer-events-none"
          style={{ left: x, top: y }}
          animate={{
            y: [0, -18, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 5 + delay,
            repeat: Infinity,
            ease: 'easeInOut',
            delay,
          }}
        >
          <Icon size={size} />
        </motion.div>
      ))}

      {/* Main card */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-md mx-3 sm:mx-4"
      >
        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl">
          {/* Logo / Title */}
          <motion.div variants={item} className="text-center mb-1 sm:mb-2">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-3 sm:mb-4 shadow-lg shadow-purple-500/25">
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-2xl sm:text-4xl font-extrabold text-center bg-gradient-to-r from-purple-300 via-white to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_32px_rgba(168,85,247,0.35)]"
          >
            Photo Reveal Game
          </motion.h1>

          <motion.p
            variants={item}
            className="text-center text-xs sm:text-sm text-white/50 mt-2 sm:mt-3 mb-6 sm:mb-8"
          >
            Can you guess the image before it's fully revealed?
          </motion.p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <motion.div variants={item}>
              <label className="block text-xs font-medium text-white/60 mb-1.5 ml-1">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/30 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
              />
            </motion.div>

            <motion.div variants={item}>
              <label className="block text-xs font-medium text-white/60 mb-1.5 ml-1">
                Game Code
              </label>
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter game code"
                className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-mono text-xs sm:text-sm"
              />
              {availableGames.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-[11px] text-white/40">Available:</span>
                  {availableGames.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGameId(g.id)}
                      className={`text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border transition-all truncate max-w-[140px] sm:max-w-none ${
                        gameId === g.id
                          ? 'bg-purple-600/40 border-purple-500 text-purple-200 font-semibold shadow-sm'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs sm:text-sm text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.div variants={item} className="pt-2">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(168,85,247,0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base rounded-xl transition-all shadow-lg shadow-purple-600/20"
              >
                Join Game
              </motion.button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

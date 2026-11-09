import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Gamepad2, Shield, Users, Zap, Trophy, Eye, Sparkles } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-navy-950 selection:bg-purple-500 selection:text-white px-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/60 via-navy-950 to-indigo-950/60" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-electric-500/6 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Floating decorative icons */}
      {[
        { Icon: Camera, x: '8%', y: '18%', size: 22, delay: 0 },
        { Icon: Eye, x: '88%', y: '12%', size: 20, delay: 0.8 },
        { Icon: Trophy, x: '80%', y: '78%', size: 24, delay: 1.6 },
        { Icon: Sparkles, x: '12%', y: '75%', size: 18, delay: 0.4 },
        { Icon: Zap, x: '50%', y: '8%', size: 16, delay: 1.2 },
      ].map(({ Icon, x, y, size, delay }, i) => (
        <motion.div
          key={i}
          className="absolute text-purple-500/15 pointer-events-none"
          style={{ left: x, top: y }}
          animate={{ y: [0, -12, 0], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon size={size} />
        </motion.div>
      ))}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 text-center max-w-2xl"
      >
        {/* Logo */}
        <motion.div variants={item} className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-gaming-purple via-electric-600 to-gaming-blue flex items-center justify-center shadow-2xl shadow-purple-600/30">
            <Camera className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={item}
          className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-electric-400 tracking-tight leading-tight"
        >
          Photo Reveal
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-3 text-lg sm:text-xl text-white/50 font-medium"
        >
          Can you guess the image before it&apos;s fully revealed?
        </motion.p>

        {/* Divider */}
        <motion.div variants={item} className="my-10 flex items-center gap-4 justify-center">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500/40" />
          <span className="text-xs uppercase tracking-[0.2em] text-white/30 font-semibold">Choose Your Role</span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500/40" />
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-xl mx-auto">
          {/* Player Card */}
          <motion.div variants={item}>
            <Link
              to="/play"
              className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800/80 to-navy-900/80 border border-white/10 hover:border-gaming-purple/50 p-8 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-purple-600/15 hover:scale-[1.03] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gaming-purple/0 to-gaming-purple/5 group-hover:from-gaming-purple/5 group-hover:to-gaming-purple/15 transition-all duration-300" />

              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-gaming-purple/20 to-electric-500/20 border border-purple-500/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-purple-500/20 transition-all">
                  <Gamepad2 className="w-8 h-8 text-gaming-purple group-hover:text-purple-300 transition-colors" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Play Game</h2>
                <p className="text-sm text-white/40 leading-relaxed">
                  Join a game, watch tiles flip, and guess the hidden image before time runs out!
                </p>

                <div className="mt-5 flex items-center justify-center gap-3 text-xs text-white/30">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Multiplayer</span>
                  <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Leaderboard</span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Admin Card */}
          <motion.div variants={item}>
            <Link
              to="/admin"
              className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800/80 to-navy-900/80 border border-white/10 hover:border-electric-500/50 p-8 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-electric-500/15 hover:scale-[1.03] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-electric-500/0 to-electric-500/5 group-hover:from-electric-500/5 group-hover:to-electric-500/15 transition-all duration-300" />

              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-electric-500/20 to-gaming-blue/20 border border-electric-500/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-electric-500/20 transition-all">
                  <Shield className="w-8 h-8 text-electric-400 group-hover:text-electric-300 transition-colors" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Host / Admin</h2>
                <p className="text-sm text-white/40 leading-relaxed">
                  Upload photos, configure reveal settings, and control every round of the game.
                </p>

                <div className="mt-5 flex items-center justify-center gap-3 text-xs text-white/30">
                  <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Upload</span>
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Control</span>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Footer tagline */}
        <motion.p variants={item} className="mt-10 text-xs text-white/20">
          Built with React • Socket.IO • Framer Motion
        </motion.p>
      </motion.div>
    </div>
  );
}

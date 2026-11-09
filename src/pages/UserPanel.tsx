import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerGame } from '../hooks/usePlayerGame';
import { WelcomeScreen } from '../components/user/WelcomeScreen';
import { WaitingScreen } from '../components/user/WaitingScreen';
import { RevealGrid } from '../components/user/RevealGrid';
import { GuessInput } from '../components/user/GuessInput';
import { GameTimer } from '../components/user/GameTimer';
import { GameOver } from '../components/user/GameOver';
import { Lightbulb, Trophy, Sparkles } from 'lucide-react';

export const UserPanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const defaultGameId = searchParams.get('gameId') || undefined;

  const {
    game,
    playerName,
    joined,
    lastGuessResult,
    revealedHints,
    joinGame,
    submitGuess,
  } = usePlayerGame();

  // If user hasn't joined a game yet
  if (!joined || !game) {
    return <WelcomeScreen onJoin={joinGame} defaultGameId={defaultGameId} />;
  }

  // If joined but host hasn't started
  if (game.status === 'waiting') {
    return (
      <WaitingScreen
        gameName={game.name || 'Photo Reveal Game'}
        playerName={playerName}
        playerCount={game.scores?.length || 1}
      />
    );
  }

  const currentPhoto = game.photos?.[game.currentPhotoIndex];
  const photoUrl = currentPhoto?.filePath || '';
  const isAnswerShown = game.revealState?.isAnswerShown || false;
  const isGameOver = game.status === 'finished';
  const isRevealingAnswer = game.status === 'revealing_answer' || isAnswerShown;

  // Answer text if shown
  const answerText = currentPhoto?.title || '';

  // Check if current photo is the last photo
  const isLastPhoto =
    isGameOver ||
    (game.photos && game.currentPhotoIndex >= game.photos.length - 1);

  // If round ended and showing answer / game over
  if (isGameOver || isRevealingAnswer) {
    return (
      <div className="min-h-screen bg-navy-950 text-white flex flex-col justify-center items-center p-4">
        <GameOver
          photoUrl={photoUrl}
          answer={answerText || 'Mystery Subject'}
          scores={game.scores || []}
          playerName={playerName}
          isLastPhoto={isLastPhoto}
        />
      </div>
    );
  }

  const gridRows = game.settings?.gridRows || 4;
  const gridCols = game.settings?.gridCols || 4;
  const totalTiles = gridRows * gridCols;
  const revealedCount = game.revealState?.revealedTiles?.length || 0;
  const timerRemaining = game.revealState?.timerRemaining ?? game.settings?.revealDuration ?? 60;
  const totalDuration = game.settings?.revealDuration || 60;
  const isPaused = game.status === 'paused';

  // Hints to display
  const activeHints = revealedHints.length > 0 ? revealedHints : currentPhoto?.hints || [];

  return (
    <div className="min-h-screen bg-navy-950 text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white pb-6">
      {/* Top Navigation / Status Header */}
      <header className="w-full border-b border-white/10 bg-navy-900/60 backdrop-blur-xl sticky top-0 z-40 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Game Title & Player */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-electric-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/20">
              PR
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-tight">
                {game.name || 'Photo Reveal'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-purple-300 font-medium">
                <span>Player: <strong className="text-white">{playerName}</strong></span>
                <span>•</span>
                <span>Photo {game.currentPhotoIndex + 1} of {game.photos?.length || 1}</span>
              </div>
            </div>
          </div>

          {/* Timer and Progress */}
          <div className="flex items-center gap-4">
            {game.settings?.timerEnabled && (
              <GameTimer
                remaining={timerRemaining}
                total={totalDuration}
                isPaused={isPaused}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="flex-1 max-w-5xl w-full mx-auto flex flex-col justify-center items-center py-4 sm:py-6">
        {/* Hints Banner if available */}
        <AnimatePresence>
          {game.settings?.hintsEnabled && activeHints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex flex-wrap items-center justify-center gap-2 px-4"
            >
              {activeHints.map((hint, idx) => (
                <div
                  key={idx}
                  className="px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg"
                >
                  <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Hint #{idx + 1}: {hint}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Photo Reveal Grid */}
        <div className="w-full">
          <RevealGrid
            photoUrl={photoUrl}
            revealedTiles={game.revealState?.revealedTiles || []}
            gridRows={gridRows}
            gridCols={gridCols}
            isAnswerShown={isAnswerShown}
            category={currentPhoto?.category}
          />
        </div>

        {/* Guess Input Area */}
        <GuessInput
          onSubmit={submitGuess}
          disabled={isPaused}
          lastResult={lastGuessResult}
          multipleAttempts={game.settings?.multipleAttempts ?? true}
          isAnswerShown={isAnswerShown}
        />
      </main>

      {/* Footer Info */}
      <footer className="text-center text-xs text-gray-500 mt-2">
        {isPaused ? (
          <span className="text-amber-400 font-semibold animate-pulse">
            ⏸️ Game paused by host
          </span>
        ) : (
          <span>Identify the image as tiles appear! Guess early for maximum points.</span>
        )}
      </footer>
    </div>
  );
};

export default UserPanel;

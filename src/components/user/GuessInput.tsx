import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface GuessInputProps {
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  lastResult: { isCorrect: boolean; message: string; score?: number } | null;
  multipleAttempts: boolean;
  isAnswerShown: boolean;
}

export const GuessInput: React.FC<GuessInputProps> = ({
  onSubmit,
  disabled = false,
  lastResult,
  multipleAttempts = true,
  isAnswerShown = false,
}) => {
  const [guess, setGuess] = useState('');
  const [hasSucceeded, setHasSucceeded] = useState(false);

  React.useEffect(() => {
    if (lastResult?.isCorrect) {
      setHasSucceeded(true);
    }
  }, [lastResult]);

  React.useEffect(() => {
    if (!isAnswerShown) {
      setHasSucceeded(false);
    }
  }, [isAnswerShown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guess.trim();
    if (!trimmed || disabled || isAnswerShown) return;

    onSubmit(trimmed);
    setGuess('');
  };

  const isInputDisabled =
    disabled || isAnswerShown || (hasSucceeded && !multipleAttempts);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-6">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={isInputDisabled}
              placeholder={
                isAnswerShown
                  ? 'Round ended! Preparing next photo...'
                  : isInputDisabled
                  ? 'Guesses locked for this photo'
                  : 'Type your guess here...'
              }
              className={`w-full px-5 py-4 text-lg font-medium rounded-2xl bg-navy-900/90 text-white placeholder-gray-500 border-2 transition-all duration-300 shadow-xl focus:outline-none ${
                lastResult?.isCorrect
                  ? 'border-emerald-500 shadow-emerald-500/20'
                  : lastResult && !lastResult.isCorrect
                  ? 'border-red-500/80 shadow-red-500/20'
                  : 'border-purple-500/30 focus:border-purple-500 focus:shadow-purple-500/20'
              } ${isInputDisabled ? 'opacity-60 cursor-not-allowed bg-navy-950/50' : ''}`}
              autoComplete="off"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isInputDisabled || !guess.trim()}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-electric-500 hover:from-purple-500 hover:to-electric-400 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Send className="w-5 h-5" />
            <span>Submit Guess</span>
          </button>
        </div>

        {/* Feedback Animation Toast */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`mt-3 p-3.5 rounded-xl flex items-center gap-2.5 font-semibold text-sm border shadow-xl ${
                lastResult.isCorrect
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-red-950/80 text-red-300 border-red-500/50'
              }`}
            >
              {lastResult.isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>
                    🎉 Correct! You scored +{lastResult.score || 100} points!
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>{lastResult.message || 'Incorrect guess. Try again!'}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

export default GuessInput;

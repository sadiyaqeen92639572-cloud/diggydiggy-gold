'use client';

import { useGameStore } from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

// Only rendered once eligible — the button itself IS the "you're ready" signal,
// no text needed to explain it. Mines/trophies/lifetime gold are never touched.
export function PrestigeButton() {
  const { canPrestige, doPrestige, user } = useGameStore();
  const { playSound } = useAudio();
  const [justPrestiged, setJustPrestiged] = useState(false);

  if (!canPrestige()) return null;

  const handlePrestige = () => {
    if (doPrestige()) {
      playSound('streak');
      setJustPrestiged(true);
      setTimeout(() => setJustPrestiged(false), 2500);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 mb-2.5" id="prestige-button">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handlePrestige}
        className="bg-accent border-4 border-ink text-on-accent font-black text-xl px-6 py-3 rounded-full brutal-shadow flex items-center gap-2 cursor-pointer"
      >
        <span className="text-3xl">🌟</span>
        {user.prestigeStars > 0 && (
          <span className="tabular-nums">x{1 + user.prestigeStars * 2}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {justPrestiged && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-4xl"
          >
            🎉🌟🎉
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

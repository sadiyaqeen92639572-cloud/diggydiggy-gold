'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { formatNumber } from '@/lib/number-format';
import { RockTarget } from './RockTarget';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  drift: number;
  big: boolean;
}

export function DigButton() {
  const { dig } = useGameStore();
  // Mine-unlock progress (0-100) — only ever goes up within a tier and resets
  // solely on a genuine mine-level transition, unlike the per-strike crack
  // animation which cycles every few hits. Drives the rock's gold coverage
  // so it always reads as "more gold the closer to the next mine."
  const goldPercent = useGameStore((s) => s.getNextMineProgress().percent);
  const { digFeedback, playSound } = useAudio();
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [flash, setFlash] = useState(false);
  const [hitSignal, setHitSignal] = useState(0);
  const [lastBig, setLastBig] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleDig = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    digFeedback();

    const earned = dig();
    if (earned === 0) return; // rate limited

    // Escalate feedback for rare (big) outcomes — the gap between common and
    // rare feedback is what makes a rare drop feel rare, not the probability.
    const big = earned >= 10;
    if (big) {
      playSound('nugget');
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
    }

    // Drive the rock-crumble strike animation — extends the same big/flash
    // escalation into the tap target itself instead of just the reward text.
    setLastBig(big);
    setHitSignal((s) => s + 1);

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newFloating: FloatingText = {
        id: Date.now() + Math.random(),
        x,
        y: y - 20,
        text: `+${formatNumber(earned)}`,
        drift: Math.random() * 40 - 20,
        big,
      };

      setFloatingTexts((prev) => [...prev, newFloating]);

      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((t) => t.id !== newFloating.id));
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-3 relative" id="dig-button-container">
      {/* Decorative pulse background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="absolute w-52 h-52 rounded-full border-2 border-primary/25"
          animate={{ scale: [1, 1.35, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full border border-primary/15"
          animate={{ scale: [1, 1.45, 1], opacity: [0.08, 0.25, 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      <div className="relative z-10">
        {/* Rare-drop screen flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-primary-soft pointer-events-none z-50"
            />
          )}
        </AnimatePresence>

        {/* Satisfying Mining Button — the one obviously tappable thing on screen.
            The rock (RockTarget) is the visible target; this button is the
            (mostly transparent) tap surface + squash/stretch + floating text host. */}
        <motion.button
          ref={buttonRef}
          id="giant-gold-nugget"
          aria-label="Mine gold — tap the rock"
          onClick={handleDig}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-ink font-bold select-none cursor-pointer rounded-full transition-all"
        >
          <RockTarget hitSignal={hitSignal} big={lastBig} goldPercent={goldPercent} />

          {/* Dynamic Click Earned Numbers overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
              {floatingTexts.map((text) => (
                <motion.div
                  key={text.id}
                  initial={{ opacity: 1, scale: text.big ? 1.1 : 0.8, y: text.y, x: text.x }}
                  animate={{
                    opacity: 0,
                    scale: text.big ? 1.9 : 1.4,
                    y: text.y - 110,
                    x: text.x + text.drift,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`absolute font-display font-black select-none tabular-nums filter drop-shadow-[3px_3px_0px_var(--color-surface)] ${
                    text.big ? 'text-5xl text-accent' : 'text-4xl text-primary'
                  }`}
                >
                  {text.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

'use client';

import { useGameStore } from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { motion, AnimatePresence } from 'motion/react';
import { formatNumber } from '@/lib/number-format';
import { webAdProvider } from '@/lib/monetization/web-provider';

export function OfflineEarningsModal() {
  const { pendingOfflineEarnings, claimOfflineEarnings } = useGameStore();
  const { playSound } = useAudio();

  const isOpen = pendingOfflineEarnings !== null;
  // Only offer the "double via ad" path when a rewarded ad can actually play —
  // never show a button that does nothing (web has none right now, see web-provider.ts).
  const rewardedAvailable = webAdProvider.isRewardedAvailable();

  const handleCollect = () => {
    playSound('levelup');
    claimOfflineEarnings(false);
  };

  const handleWatchAdToDouble = async () => {
    const watched = await webAdProvider.showRewarded();
    playSound('levelup');
    claimOfflineEarnings(watched);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="bg-surface brutal-border brutal-shadow-lg rounded-3xl p-6 max-w-xs w-full text-center flex flex-col items-center gap-3"
          >
            <div className="text-6xl">🧑‍🦱</div>
            <div className="bg-primary-soft/30 brutal-border-2 rounded-full px-4 py-2 flex items-center gap-1.5">
              <span className="text-2xl">🪙</span>
              <span className="text-3xl font-display font-black tabular-nums">
                +{formatNumber(pendingOfflineEarnings ?? 0)}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleCollect}
              className="w-full mt-1 bg-primary text-on-primary font-black text-lg uppercase py-3 rounded-2xl brutal-border brutal-shadow-sm hover:bg-primary-soft cursor-pointer"
            >
              Collect
            </motion.button>

            {rewardedAvailable && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleWatchAdToDouble}
                className="w-full bg-accent-soft/60 text-ink font-black text-sm uppercase py-2 rounded-2xl brutal-border brutal-shadow-sm hover:bg-accent-soft cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>📺</span>
                <span>Watch to Double</span>
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

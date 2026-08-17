'use client';

import { useGameStore } from '@/store/game-store';
import { motion } from 'motion/react';

// Always visible, outside the tabs — "almost there" is the entire engine of
// an idle game, and a child can't navigate to a screen to check how close they are.
export function MineProgressBar() {
  const { getNextMineProgress } = useGameStore();
  const { current, next, percent } = getNextMineProgress();

  return (
    <div
      className="w-full bg-surface brutal-border brutal-shadow-sm rounded-full p-2 mb-2.5 flex items-center gap-2.5"
      id="mine-progress-bar"
    >
      <span className="text-xl shrink-0">{current.icon}</span>
      <div className="flex-1 bg-surface-muted h-3 brutal-border-2 rounded-full overflow-hidden">
        <motion.div
          className="bg-primary h-full"
          animate={{ width: `${next ? percent : 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-xl shrink-0 ${next ? 'grayscale opacity-50' : ''}`}>
        {next ? next.icon : '🏆'}
      </span>
    </div>
  );
}

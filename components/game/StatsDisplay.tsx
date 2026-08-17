'use client';

import { useGameStore } from '@/store/game-store';
import { motion } from 'motion/react';
import { Hammer, Zap, Award, Sparkles } from 'lucide-react';
import { formatNumber } from '@/lib/number-format';

export function StatsDisplay() {
  const { user, getPickaxeMultiplier, getPassiveRatePerHour, getGoldChance } = useGameStore();

  const multiplier = getPickaxeMultiplier();
  const passiveRate = getPassiveRatePerHour();
  const goldChance = getGoldChance();

  const xpRequired = user.level * 100;
  const xpPercent = Math.min(100, Math.floor((user.experience / xpRequired) * 100));

  return (
    <div className="w-full max-w-md mx-auto bg-surface brutal-border brutal-shadow rounded-3xl p-3 sm:p-4 text-ink mb-4" id="stats-dashboard">
      {/* Level badge + XP fill — icon/number only, no caption text needed:
          the badge number IS the level, the bar fill IS the progress. */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 shrink-0 bg-primary brutal-border rounded-2xl flex items-center justify-center text-on-primary font-display text-xl brutal-shadow-sm tabular-nums">
          {user.level}
        </div>
        <div className="flex-1 bg-surface-muted h-4 p-0.5 brutal-border rounded-full overflow-hidden">
          <motion.div
            className="bg-primary h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Core Miner Statistics — icon + big number, no text captions.
          Detailed labels for these same numbers still exist for a parent
          in SettingsSheet / this card's icons are figurative (pickaxe,
          buddy, taps, sparkle) so a child reads them without words. */}
      <div className="grid grid-cols-4 gap-2" id="stats-grid">
        <div className="bg-surface p-2 brutal-border-2 rounded-2xl flex flex-col items-center gap-1">
          <div className="p-1.5 bg-primary-soft/40 brutal-border rounded-xl text-ink">
            <Hammer className="w-4 h-4" />
          </div>
          <p className="text-xs font-black text-ink tabular-nums">x{multiplier}</p>
        </div>

        <div className="bg-surface p-2 brutal-border-2 rounded-2xl flex flex-col items-center gap-1">
          <div className="p-1.5 bg-accent-soft/50 brutal-border rounded-xl text-ink">
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-xs font-black text-ink tabular-nums">{formatNumber(passiveRate)}</p>
        </div>

        <div className="bg-surface p-2 brutal-border-2 rounded-2xl flex flex-col items-center gap-1">
          <div className="p-1.5 bg-rose-200 brutal-border rounded-xl text-ink">
            <Award className="w-4 h-4" />
          </div>
          <p className="text-xs font-black text-ink tabular-nums">{formatNumber(user.totalTaps)}</p>
        </div>

        <div className="bg-surface p-2 brutal-border-2 rounded-2xl flex flex-col items-center gap-1">
          <div className="p-1.5 bg-success/25 brutal-border rounded-xl text-ink">
            <Sparkles className="w-4 h-4" />
          </div>
          <p className="text-xs font-black text-ink tabular-nums">{Math.round(goldChance * 100)}%</p>
        </div>
      </div>
    </div>
  );
}

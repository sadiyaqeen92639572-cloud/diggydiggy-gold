'use client';

import { useGameStore } from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { motion } from 'motion/react';
import { Lock, Gift } from 'lucide-react';

// Icon-identified, not text-identified — a child navigates by picture, the
// title/description exist for the adult (parent) reading over their shoulder.
const STAR_ICONS: Record<string, string> = {
  star1: '⭐',
  star2: '⭐⭐',
  star3: '⭐⭐⭐',
  star4: '⭐⭐⭐⭐',
};
const RARE_ICONS: Record<string, string> = {
  rare_first: '✨🪨',
  rare_ten: '🌟⛰️',
};

export function TrophyCase() {
  const { achievements, claimAchievement } = useGameStore();
  const { playSound } = useAudio();

  const stars = achievements.filter((a) => a.id.startsWith('star'));
  const rares = achievements.filter((a) => a.id.startsWith('rare'));

  const handleClaim = (id: string) => {
    claimAchievement(id);
    playSound('levelup');
  };

  const renderTrophy = (id: string, icon: string, title: string) => {
    const ach = achievements.find((a) => a.id === id)!;
    const locked = !ach.completed;
    const claimable = ach.completed && !ach.claimed;

    return (
      <div
        key={id}
        className={`brutal-border-2 rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center ${
          locked ? 'bg-surface-muted grayscale opacity-60' : 'bg-surface'
        }`}
        id={`trophy-${id}`}
      >
        <div className="relative">
          <div className="text-3xl">{icon}</div>
          {locked && (
            <Lock className="w-4 h-4 text-ink absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 brutal-border-2" />
          )}
        </div>
        <span className="text-[9px] font-black uppercase text-ink-soft">{title}</span>
        {claimable && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleClaim(id)}
            className="mt-0.5 bg-primary text-on-primary border-2 border-ink rounded-full p-1.5 brutal-shadow-sm cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pb-12 text-ink" id="trophy-case">
      <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-2.5 mt-2">⭐ Stars</h3>
      <div className="grid grid-cols-4 gap-2.5 mb-6">
        {stars.map((a) => renderTrophy(a.id, STAR_ICONS[a.id], a.title))}
      </div>

      <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-2.5">✨ Rare Finds</h3>
      <div className="grid grid-cols-4 gap-2.5">
        {rares.map((a) => renderTrophy(a.id, RARE_ICONS[a.id], a.title))}
      </div>
    </div>
  );
}

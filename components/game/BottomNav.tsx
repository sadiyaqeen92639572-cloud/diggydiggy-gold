'use client';

import { motion } from 'motion/react';
import { Pickaxe, ShoppingCart, Backpack, Trophy, Globe } from 'lucide-react';
import { useAudio } from '@/hooks/use-audio';

export type NavTab = 'mine' | 'shop' | 'inventory' | 'achievements' | 'rank';

interface NavItem {
  value: Exclude<NavTab, 'mine'>;
  Icon: typeof ShoppingCart;
  label: string;
}

const SIDE_ITEMS: NavItem[] = [
  { value: 'shop', Icon: ShoppingCart, label: 'Shop' },
  { value: 'inventory', Icon: Backpack, label: 'Gear' },
  { value: 'achievements', Icon: Trophy, label: 'Trophies' },
  { value: 'rank', Icon: Globe, label: 'Rank' },
];

/**
 * Persistent bottom tab bar — always visible regardless of scroll.
 * Mine (the core loop) reads as the one obviously-primary action: a big,
 * elevated, accent-colored pickaxe button popping above the bar. The other
 * four tabs are quieter, smaller, evenly spaced siblings — icon-only so a
 * pre-reader can navigate by shape alone.
 */
export function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: NavTab;
  onChange: (tab: NavTab) => void;
}) {
  const { playSound, initAudioContext } = useAudio();

  const handleSelect = (tab: NavTab) => {
    // Still fire onChange when re-tapping the already-active tab — the page
    // uses that to scroll back to top, e.g. tapping the pickaxe while
    // scrolled down on the Mine screen.
    if (tab !== activeTab) {
      initAudioContext();
      playSound('coin');
    }
    onChange(tab);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t-4 border-ink rounded-t-3xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      id="bottom-nav"
    >
      <div className="max-w-xl mx-auto w-full flex items-end justify-between px-3 pt-2 pb-2 gap-1 relative">
        {/* Two quiet side tabs, left of the big Mine button */}
        <div className="flex-1 flex items-center justify-around">
          {SIDE_ITEMS.slice(0, 2).map((item) => (
            <NavIcon
              key={item.value}
              item={item}
              isActive={activeTab === item.value}
              onSelect={() => handleSelect(item.value)}
            />
          ))}
        </div>

        {/* Big primary Mine button — elevated above the bar, accent color,
            the only saturated element in the nav */}
        <div className="shrink-0 -mt-7 px-1">
          <motion.button
            type="button"
            onClick={() => handleSelect('mine')}
            whileTap={{ scale: 0.9 }}
            animate={{ scale: activeTab === 'mine' ? 1.06 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full flex items-center justify-center brutal-border brutal-shadow cursor-pointer select-none transition-colors bg-primary hover:bg-primary-soft"
            aria-label="Mine"
          >
            <Pickaxe className="w-8 h-8 sm:w-9 sm:h-9 text-on-primary" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* Two quiet side tabs, right of the big Mine button */}
        <div className="flex-1 flex items-center justify-around">
          {SIDE_ITEMS.slice(2, 4).map((item) => (
            <NavIcon
              key={item.value}
              item={item}
              isActive={activeTab === item.value}
              onSelect={() => handleSelect(item.value)}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavIcon({
  item,
  isActive,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { Icon, label } = item;
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] cursor-pointer select-none"
      aria-label={label}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border-2 ${
          isActive ? 'bg-ink border-ink' : 'bg-surface border-transparent'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${isActive ? 'text-surface' : 'text-ink/50'}`}
          strokeWidth={2.5}
        />
      </div>
    </motion.button>
  );
}

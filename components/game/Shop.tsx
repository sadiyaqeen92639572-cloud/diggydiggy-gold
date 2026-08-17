'use client';

import {
  useGameStore,
  PICKAXES,
  BUDDY_TIERS,
  GLASS_TIERS,
  MAGNET,
} from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { motion } from 'motion/react';
import { Coins, Lock, Check } from 'lucide-react';
import { formatNumber } from '@/lib/number-format';

type CardState = 'owned' | 'current' | 'next' | 'locked';

function ShopCard({
  icon,
  name,
  price,
  state,
  affordable,
  onBuy,
}: {
  icon: string;
  name: string;
  price: number;
  state: CardState;
  affordable: boolean;
  onBuy: () => void;
}) {
  const isBuyable = state === 'next' && affordable;

  return (
    <div
      className={`brutal-border-2 rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center transition-all ${
        state === 'locked' ? 'bg-surface-muted grayscale opacity-60' : 'bg-surface'
      } ${state === 'current' ? 'ring-4 ring-primary' : ''}`}
    >
      <div className="relative">
        <div className="text-4xl">{icon}</div>
        {state === 'locked' && (
          <Lock className="w-4 h-4 text-ink absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 brutal-border-2" />
        )}
        {state === 'owned' && (
          <Check className="w-4 h-4 text-surface absolute -bottom-1 -right-1 bg-success rounded-full p-0.5 brutal-border-2" />
        )}
      </div>

      {state === 'next' && (
        <motion.button
          whileTap={isBuyable ? { scale: 0.92 } : undefined}
          onClick={isBuyable ? onBuy : undefined}
          className={`mt-1 flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-xs brutal-shadow-sm border-2 tabular-nums ${
            isBuyable
              ? 'bg-primary border-ink text-on-primary hover:bg-primary-soft cursor-pointer'
              : 'bg-surface-muted border-surface-muted text-ink-soft cursor-not-allowed'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>{formatNumber(price)}</span>
        </motion.button>
      )}
    </div>
  );
}

export function Shop() {
  const { user, buyPickaxe, buyNextBuddyTier, buyNextGlassTier, buyMagnet } = useGameStore();
  const { playSound } = useAudio();

  const currentPickaxeIndex = PICKAXES.findIndex((p) => p.id === user.currentPickaxeId);

  const handleBuyPickaxe = (id: string) => {
    if (buyPickaxe(id)) playSound('purchase');
    else playSound('error');
  };
  const handleBuyBuddy = () => {
    if (buyNextBuddyTier()) playSound('purchase');
    else playSound('error');
  };
  const handleBuyGlass = () => {
    if (buyNextGlassTier()) playSound('purchase');
    else playSound('error');
  };
  const handleBuyMagnet = () => {
    if (buyMagnet()) playSound('purchase');
    else playSound('error');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pb-12 text-ink" id="game-shop">
      {/* Pickaxes */}
      <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-2.5 mt-2">⛏️ Pickaxes</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-6" id="pickaxe-grid">
        {PICKAXES.map((p, i) => {
          const state: CardState = i < currentPickaxeIndex ? 'owned' : i === currentPickaxeIndex ? 'current' : i === currentPickaxeIndex + 1 ? 'next' : 'locked';
          return (
            <ShopCard
              key={p.id}
              icon={p.icon}
              name={p.name}
              price={p.price}
              state={state}
              affordable={user.nuggets >= p.price}
              onBuy={() => handleBuyPickaxe(p.id)}
            />
          );
        })}
      </div>

      {/* Equipment */}
      <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-2.5">🎒 Gear</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5" id="equipment-grid">
        {BUDDY_TIERS.map((b, i) => {
          const state: CardState = i < user.buddyTier ? 'owned' : i === user.buddyTier ? 'next' : 'locked';
          return (
            <ShopCard
              key={b.id}
              icon={b.icon}
              name={b.name}
              price={b.price}
              state={state}
              affordable={user.nuggets >= b.price}
              onBuy={handleBuyBuddy}
            />
          );
        })}
        {GLASS_TIERS.map((g, i) => {
          const state: CardState = i < user.glassTier ? 'owned' : i === user.glassTier ? 'next' : 'locked';
          return (
            <ShopCard
              key={g.id}
              icon={g.icon}
              name={g.name}
              price={g.price}
              state={state}
              affordable={user.nuggets >= g.price}
              onBuy={handleBuyGlass}
            />
          );
        })}
        <ShopCard
          icon={MAGNET.icon}
          name={MAGNET.name}
          price={MAGNET.price}
          state={user.magnetOwned ? 'owned' : 'next'}
          affordable={user.nuggets >= MAGNET.price}
          onBuy={handleBuyMagnet}
        />
      </div>
    </div>
  );
}

export function Inventory() {
  const { user } = useGameStore();

  const pickaxe = PICKAXES.find((p) => p.id === user.currentPickaxeId) || PICKAXES[0];
  const buddy = user.buddyTier > 0 ? BUDDY_TIERS[user.buddyTier - 1] : null;
  const glass = user.glassTier > 0 ? GLASS_TIERS[user.glassTier - 1] : null;

  return (
    <div className="w-full max-w-2xl mx-auto px-2 py-4 pb-12 text-ink" id="inventory-panel">
      <h3 className="text-xs font-black text-ink uppercase tracking-widest mb-3">🎒 Your Gear</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface brutal-border-2 rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
          <span className="text-4xl">{pickaxe.icon}</span>
          <span className="text-[10px] font-black uppercase tabular-nums">x{pickaxe.multiplier}</span>
        </div>
        {buddy && (
          <div className="bg-surface brutal-border-2 rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-4xl">{buddy.icon}</span>
            <span className="text-[10px] font-black uppercase tabular-nums">+{formatNumber(buddy.ratePerHour)}/h</span>
          </div>
        )}
        {glass && (
          <div className="bg-surface brutal-border-2 rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-4xl">{glass.icon}</span>
            <span className="text-[10px] font-black uppercase tabular-nums">+{Math.round(glass.luckBonus * 100)}%</span>
          </div>
        )}
        {user.magnetOwned && (
          <div className="bg-surface brutal-border-2 rounded-2xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-4xl">{MAGNET.icon}</span>
            <span className="text-[10px] font-black uppercase tabular-nums">+{Math.round(MAGNET.valueBonus * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

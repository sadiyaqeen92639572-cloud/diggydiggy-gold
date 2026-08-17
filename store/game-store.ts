import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getISOWeekKey } from '@/lib/leaderboard-utils';

// CONSTANTS
export const REFINERY_BATCH_CLEAR_SECONDS = 30; // batches clear on a fixed timer, not a fixed rate
export const OFFLINE_EARNINGS_CAP_MS = 8 * 60 * 60 * 1000; // 8 hours

// LOOT TABLE — base value before pickaxe multiplier
const BASE_PLAIN_VALUE = 1;
const BASE_GOLD_VALUE = 10;
const BASE_SUPER_GOLD_VALUE = 50;
const BASE_GOLD_CHANCE = 0.15; // 15% chance of "gold-coated" (gold or super-gold)
const MAX_GOLD_CHANCE = 0.25; // cap — luck is a secondary variance dial, not the progression engine
const SUPER_GOLD_SHARE = 0.2; // of the gold-coated slice, this fraction is the rare super-gold tier

// PICKAXES — primary progression stat is a value MULTIPLIER, not luck.
// Wood EV/tap = 3.82 coins; Gold EV/tap ≈ 175 — matches the ×50 span between
// the first and last mine threshold, so tapping alone stays viable end to end.
export interface Pickaxe {
  id: string;
  name: string;
  multiplier: number;
  price: number;
  icon: string;
}

export const PICKAXES: Pickaxe[] = [
  { id: 'wood', name: 'Wood Pickaxe', multiplier: 1, price: 0, icon: '⛏️' },
  { id: 'stone', name: 'Stone Pickaxe', multiplier: 2, price: 200, icon: '🔨' },
  { id: 'iron', name: 'Iron Pickaxe', multiplier: 5, price: 1500, icon: '🪓' },
  { id: 'diamond', name: 'Diamond Pickaxe', multiplier: 15, price: 8000, icon: '💎' },
  { id: 'gold', name: 'Gold Pickaxe', multiplier: 50, price: 40000, icon: '👑' },
];

// MINING BUDDY — the passive backbone. ~1.8x per tier, top tier well above a
// sustained human tap rate. Also drives the offline-earnings calculation.
export interface BuddyTier {
  id: string;
  name: string;
  ratePerHour: number;
  price: number;
  icon: string;
}

export const BUDDY_TIERS: BuddyTier[] = [
  { id: 'buddy1', name: 'Mining Buddy', ratePerHour: 60, price: 300, icon: '🧑‍🦱' },
  { id: 'buddy2', name: 'Mining Buddy Duo', ratePerHour: 110, price: 2000, icon: '👥' },
  { id: 'buddy3', name: 'Mining Buddy Crew', ratePerHour: 200, price: 10000, icon: '👨‍👩‍👦' },
];

// MAGNIFYING GLASS — secondary luck bonus, stacks toward the MAX_GOLD_CHANCE cap.
export interface GlassTier {
  id: string;
  name: string;
  luckBonus: number;
  price: number;
  icon: string;
}

export const GLASS_TIERS: GlassTier[] = [
  { id: 'glass1', name: 'Magnifying Glass', luckBonus: 0.05, price: 500, icon: '🔍' },
  { id: 'glass2', name: 'Golden Lens', luckBonus: 0.1, price: 5000, icon: '🔍' },
];

// MAGNET — single item, boosts the value of gold-coated finds specifically.
export const MAGNET = { id: 'magnet', name: 'Magnet', valueBonus: 0.2, price: 1500, icon: '🧲' };

// MINES — content milestones unlocked by LIFETIME gold (never decreases, even
// when spent) so prestige never relocks a mine already reached.
export interface Mine {
  id: string;
  name: string;
  threshold: number;
  icon: string;
}

export const MINES: Mine[] = [
  { id: 'surface', name: 'Surface', threshold: 0, icon: '⛰️' },
  { id: 'cave', name: 'Cave', threshold: 500, icon: '🕳️' },
  { id: 'volcano', name: 'Volcano', threshold: 2000, icon: '🌋' },
  { id: 'glacier', name: 'Glacier', threshold: 8000, icon: '🧊' },
  { id: 'space', name: 'Space', threshold: 25000, icon: '🌌' },
];

// PRESTIGE — resets gear/currency only, never lifetime gold/mines/trophies.
// Eligible at 2x the final mine's threshold, so there's end-game time before
// the reset is offered. Each star gives +2x (first prestige = x3 total).
export const PRESTIGE_THRESHOLD = 50000;
export const PRESTIGE_STAR_MULTIPLIER = 2;

// TYPES
export interface UserState {
  id: string | null;
  username: string;
  nuggets: number;          // Total accumulated (raw score)
  availableNuggets: number; // Cleared out of the refinery, ready to spend in-game
  pendingNuggets: number;   // In processing at the refinery
  gems: number;
  level: number;
  experience: number;
  totalTaps: number;
  currentPickaxeId: string;
  buddyTier: number;  // 0 = none owned, 1-3 = BUDDY_TIERS index+1
  glassTier: number;  // 0 = none owned, 1-2 = GLASS_TIERS index+1
  magnetOwned: boolean;
  lifetimeNuggets: number; // monotonic — never decreases, drives mines/stars/prestige
  superGoldCount: number;  // lifetime count of doré+++ rolls, drives Rare trophies
  prestigeStars: number;
  nickname: string;        // auto-generated, no free-text field — safe for a public leaderboard
  weeklyGold: number;      // earned this ISO week only — resets on week rollover, not on prestige
  weeklyGoldWeekKey: string;
}

export interface MiningState {
  lastTapAt: number | null;
  sessionTaps: number;
  lastPassiveIncomeAt: number | null;
  totalPassiveIncome: number;
  lastActiveAt: number; // used for the offline-earnings calculation
}

export interface RefineryBatch {
  id: string;
  nuggetsAmount: number;
  depositedAt: number;
  clearsAt: number; // Timestamp of clearance
  status: 'processing' | 'ready' | 'withdrawn';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  rewardNuggets: number;
  rewardGems: number;
  claimed: boolean;
}

export interface GameState {
  user: UserState;
  mining: MiningState;
  refineryBatches: RefineryBatch[];
  achievements: Achievement[];
  isDigging: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  lastSyncAt: number | null;
  isOffline: boolean;
  dailyStreak: {
    streakCount: number;
    lastClaimedAt: number | null;
  };
  language: 'fr' | 'en';
  pendingOfflineEarnings: number | null; // set on mount if the buddy earned while away
}

export interface GameActions {
  dig: () => number;
  levelUp: () => void;
  setUser: (user: Partial<UserState>) => void;
  addGems: (amount: number) => void;
  claimAchievement: (id: string) => void;
  buyPickaxe: (id: string) => boolean;
  buyNextBuddyTier: () => boolean;
  buyNextGlassTier: () => boolean;
  buyMagnet: () => boolean;
  applyRefineryFastPass: (batchId: string) => boolean;
  checkRefinery: () => void;
  processPassiveIncome: () => number;
  getPickaxeMultiplier: () => number;
  getGoldChance: () => number;
  getPassiveRatePerHour: () => number;
  getCurrentMineIndex: () => number;
  getNextMineProgress: () => { current: Mine; next: Mine | null; percent: number };
  getPrestigeMultiplier: () => number;
  canPrestige: () => boolean;
  doPrestige: () => boolean;
  toggleSound: () => void;
  toggleVibration: () => void;
  resetGame: () => void;
  syncWithServer: () => Promise<void>;
  setOffline: (isOffline: boolean) => void;
  claimDailyBonus: () => { nuggets: number; gems: number; streak: number } | null;
  getStreakReward: () => { nuggets: number; gems: number };
  setLanguage: (lang: 'fr' | 'en') => void;
  computeOfflineEarnings: () => void;
  claimOfflineEarnings: (doubled: boolean) => void;
  submitLeaderboardScore: () => Promise<void>;
}

// TROPHIES — exactly 2 families. Star tiers are guaranteed (lifetime gold),
// Rares are the super-gold roll (icon-identified, name is for parents only).
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'star1', title: '1 Star', description: 'Reach 10 lifetime gold.', progress: 0, target: 10, completed: false, rewardNuggets: 20, rewardGems: 1, claimed: false },
  { id: 'star2', title: '2 Stars', description: 'Reach 50 lifetime gold.', progress: 0, target: 50, completed: false, rewardNuggets: 80, rewardGems: 2, claimed: false },
  { id: 'star3', title: '3 Stars', description: 'Reach 200 lifetime gold.', progress: 0, target: 200, completed: false, rewardNuggets: 300, rewardGems: 4, claimed: false },
  { id: 'star4', title: '4 Stars', description: 'Reach 1,000 lifetime gold.', progress: 0, target: 1000, completed: false, rewardNuggets: 1200, rewardGems: 8, claimed: false },
  { id: 'rare_first', title: 'Giant Nugget', description: 'Find your first super-gold rock.', progress: 0, target: 1, completed: false, rewardNuggets: 100, rewardGems: 2, claimed: false },
  { id: 'rare_ten', title: 'Magic Vein', description: 'Find 10 super-gold rocks.', progress: 0, target: 10, completed: false, rewardNuggets: 1000, rewardGems: 10, claimed: false },
];

const defaultUser: UserState = {
  id: null,
  username: 'Gold Digger',
  nuggets: 0,
  availableNuggets: 0,
  pendingNuggets: 0,
  gems: 10, // Starting bonus
  level: 1,
  experience: 0,
  totalTaps: 0,
  currentPickaxeId: 'wood',
  buddyTier: 0,
  glassTier: 0,
  magnetOwned: false,
  lifetimeNuggets: 0,
  superGoldCount: 0,
  prestigeStars: 0,
  nickname: '',
  weeklyGold: 0,
  weeklyGoldWeekKey: '',
};

// Adds an earned amount to the weekly counter, rolling it over to 0 first if
// the ISO week has changed since the last earn — keeps weeklyGold meaning
// "earned this week" without needing a separate cron/reset job.
function bumpWeeklyGold(user: UserState, amount: number): { weeklyGold: number; weeklyGoldWeekKey: string } {
  const currentWeek = getISOWeekKey();
  const base = user.weeklyGoldWeekKey === currentWeek ? user.weeklyGold : 0;
  return { weeklyGold: base + amount, weeklyGoldWeekKey: currentWeek };
}

const defaultMining: MiningState = {
  lastTapAt: null,
  sessionTaps: 0,
  lastPassiveIncomeAt: null,
  totalPassiveIncome: 0,
  lastActiveAt: Date.now(),
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// STORE IMPLEMENTATION
export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      // INITIAL STATE
      user: defaultUser,
      mining: defaultMining,
      refineryBatches: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      isDigging: false,
      soundEnabled: true,
      vibrationEnabled: true,
      lastSyncAt: null,
      isOffline: false,
      dailyStreak: {
        streakCount: 0,
        lastClaimedAt: null,
      },
      language: 'en',
      pendingOfflineEarnings: null,

      // =====================================
      // DERIVED GETTERS
      // =====================================
      getPickaxeMultiplier: () => {
        const pickaxe = PICKAXES.find((p) => p.id === get().user.currentPickaxeId);
        return pickaxe ? pickaxe.multiplier : 1;
      },

      getGoldChance: () => {
        const glassTier = get().user.glassTier;
        const glassBonus = glassTier > 0 ? GLASS_TIERS[glassTier - 1].luckBonus : 0;
        return clamp(BASE_GOLD_CHANCE + glassBonus, 0, MAX_GOLD_CHANCE);
      },

      getPassiveRatePerHour: () => {
        const buddyTier = get().user.buddyTier;
        const base = buddyTier > 0 ? BUDDY_TIERS[buddyTier - 1].ratePerHour : 0;
        return base * get().getPrestigeMultiplier();
      },

      getCurrentMineIndex: () => {
        const lifetime = get().user.lifetimeNuggets;
        let idx = 0;
        for (let i = 0; i < MINES.length; i++) {
          if (lifetime >= MINES[i].threshold) idx = i;
        }
        return idx;
      },

      getNextMineProgress: () => {
        const lifetime = get().user.lifetimeNuggets;
        const idx = get().getCurrentMineIndex();
        const current = MINES[idx];
        if (idx >= MINES.length - 1) {
          return { current, next: null, percent: 100 };
        }
        const next = MINES[idx + 1];
        const percent = Math.min(
          100,
          Math.floor(((lifetime - current.threshold) / (next.threshold - current.threshold)) * 100)
        );
        return { current, next, percent };
      },

      getPrestigeMultiplier: () => 1 + get().user.prestigeStars * PRESTIGE_STAR_MULTIPLIER,

      canPrestige: () => {
        const lifetime = get().user.lifetimeNuggets;
        return lifetime >= MINES[MINES.length - 1].threshold && lifetime >= PRESTIGE_THRESHOLD;
      },

      doPrestige: () => {
        if (!get().canPrestige()) return false;
        set((prev) => ({
          user: {
            ...prev.user,
            nuggets: 0,
            availableNuggets: 0,
            pendingNuggets: 0,
            currentPickaxeId: 'wood',
            buddyTier: 0,
            glassTier: 0,
            magnetOwned: false,
            prestigeStars: prev.user.prestigeStars + 1,
            // lifetimeNuggets, superGoldCount, level, experience, gems, totalTaps,
            // and achievements are deliberately NOT reset — mines/trophies stay earned.
          },
          refineryBatches: [],
        }));
        return true;
      },

      // =====================================
      // DIGGING ACTION (Satisfying Tapping)
      // =====================================
      dig: () => {
        const state = get();
        const now = Date.now();

        const multiplier = state.getPickaxeMultiplier();
        const goldChance = state.getGoldChance();
        const superGoldChance = goldChance * SUPER_GOLD_SHARE;

        const roll = Math.random();
        let base: number;
        let isGoldCoated: boolean;
        if (roll < superGoldChance) {
          base = BASE_SUPER_GOLD_VALUE;
          isGoldCoated = true;
        } else if (roll < goldChance) {
          base = BASE_GOLD_VALUE;
          isGoldCoated = true;
        } else {
          base = BASE_PLAIN_VALUE;
          isGoldCoated = false;
        }

        let nuggetsEarned = base * multiplier;
        if (isGoldCoated && state.user.magnetOwned) {
          nuggetsEarned = Math.round(nuggetsEarned * (1 + MAGNET.valueBonus));
        }
        nuggetsEarned = Math.round(nuggetsEarned * state.getPrestigeMultiplier());

        const isSuperGold = base === BASE_SUPER_GOLD_VALUE;
        const xpEarned = Math.max(1, Math.floor(nuggetsEarned * 0.1));
        const newLifetime = state.user.lifetimeNuggets + nuggetsEarned;
        const newSuperGoldCount = state.user.superGoldCount + (isSuperGold ? 1 : 0);

        // Update Trophy Progress (Star tiers off lifetime gold, Rares off super-gold count)
        const updatedAchievements = state.achievements.map((ach) => {
          if (ach.completed) return ach;
          let progress = ach.progress;
          if (ach.id.startsWith('star')) progress = Math.min(ach.target, newLifetime);
          if (ach.id.startsWith('rare')) progress = Math.min(ach.target, newSuperGoldCount);

          const completed = progress >= ach.target;
          return { ...ach, progress, completed };
        });

        // Update Game State
        set((prev) => {
          const totalNuggets = prev.user.nuggets + nuggetsEarned;
          const pendingNuggets = prev.user.pendingNuggets + nuggetsEarned;
          const totalTaps = prev.user.totalTaps + 1;
          const newXp = prev.user.experience + xpEarned;

          const weekly = bumpWeeklyGold(prev.user, nuggetsEarned);

          return {
            user: {
              ...prev.user,
              nuggets: totalNuggets,
              pendingNuggets,
              totalTaps,
              experience: newXp,
              lifetimeNuggets: newLifetime,
              superGoldCount: newSuperGoldCount,
              weeklyGold: weekly.weeklyGold,
              weeklyGoldWeekKey: weekly.weeklyGoldWeekKey,
            },
            mining: {
              ...prev.mining,
              lastTapAt: now,
              sessionTaps: prev.mining.sessionTaps + 1,
              lastActiveAt: now,
            },
            achievements: updatedAchievements,
            isDigging: true,
          };
        });

        // Add to a batch — batches clear on a FIXED TIMER, not a fixed rate, so a
        // bigger multiplier means bigger batches at the same cadence (no throughput cap).
        const latestBatch = state.refineryBatches.find(
          (b) => b.status === 'processing' && now - b.depositedAt < 15000
        );

        if (latestBatch) {
          set((prev) => ({
            refineryBatches: prev.refineryBatches.map((b) =>
              b.id === latestBatch.id
                ? { ...b, nuggetsAmount: b.nuggetsAmount + nuggetsEarned }
                : b
            ),
          }));
        } else {
          const newBatchId = `batch_${Math.random().toString(36).substring(2, 9)}`;
          set((prev) => ({
            refineryBatches: [
              ...prev.refineryBatches,
              {
                id: newBatchId,
                nuggetsAmount: nuggetsEarned,
                depositedAt: now,
                clearsAt: now + REFINERY_BATCH_CLEAR_SECONDS * 1000,
                status: 'processing',
              },
            ],
          }));
        }

        setTimeout(() => {
          set({ isDigging: false });
        }, 120);

        // Check Level Up
        const currentLevel = get().user.level;
        const xpRequired = currentLevel * 100;
        if (get().user.experience >= xpRequired) {
          get().levelUp();
        }

        return nuggetsEarned;
      },

      levelUp: () => {
        set((prev) => {
          const nextLevel = prev.user.level + 1;
          const remainingXp = prev.user.experience - prev.user.level * 100;

          return {
            user: {
              ...prev.user,
              level: nextLevel,
              experience: Math.max(0, remainingXp),
            },
          };
        });
      },

      setUser: (updates) => {
        set((prev) => ({ user: { ...prev.user, ...updates } }));
      },

      addGems: (amount) => {
        set((prev) => ({
          user: { ...prev.user, gems: prev.user.gems + amount },
        }));
      },

      claimAchievement: (id) => {
        const ach = get().achievements.find((a) => a.id === id);
        if (ach && ach.completed && !ach.claimed) {
          set((prev) => {
            const weekly = bumpWeeklyGold(prev.user, ach.rewardNuggets);
            return {
            user: {
              ...prev.user,
              nuggets: prev.user.nuggets + ach.rewardNuggets,
              lifetimeNuggets: prev.user.lifetimeNuggets + ach.rewardNuggets,
              gems: prev.user.gems + ach.rewardGems,
              weeklyGold: weekly.weeklyGold,
              weeklyGoldWeekKey: weekly.weeklyGoldWeekKey,
            },
            achievements: prev.achievements.map((a) =>
              a.id === id ? { ...a, claimed: true } : a
            ),
            };
          });
        }
      },

      // =====================================
      // SHOP PURCHASES — each is instant, no refinery delay. A purchase should
      // feel immediate, not gate behind a wait on top of the wait to afford it.
      // =====================================
      buyPickaxe: (id) => {
        const pickaxe = PICKAXES.find((p) => p.id === id);
        if (!pickaxe) return false;
        const currentIndex = PICKAXES.findIndex((p) => p.id === get().user.currentPickaxeId);
        const targetIndex = PICKAXES.findIndex((p) => p.id === id);
        if (targetIndex <= currentIndex) return false; // already owned or a downgrade
        if (get().user.nuggets < pickaxe.price) return false;

        set((prev) => ({
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets - pickaxe.price,
            currentPickaxeId: id,
          },
        }));
        return true;
      },

      buyNextBuddyTier: () => {
        const currentTier = get().user.buddyTier;
        if (currentTier >= BUDDY_TIERS.length) return false;
        const nextTier = BUDDY_TIERS[currentTier];
        if (get().user.nuggets < nextTier.price) return false;

        set((prev) => ({
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets - nextTier.price,
            buddyTier: currentTier + 1,
          },
        }));
        return true;
      },

      buyNextGlassTier: () => {
        const currentTier = get().user.glassTier;
        if (currentTier >= GLASS_TIERS.length) return false;
        const nextTier = GLASS_TIERS[currentTier];
        if (get().user.nuggets < nextTier.price) return false;

        set((prev) => ({
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets - nextTier.price,
            glassTier: currentTier + 1,
          },
        }));
        return true;
      },

      buyMagnet: () => {
        if (get().user.magnetOwned) return false;
        if (get().user.nuggets < MAGNET.price) return false;

        set((prev) => ({
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets - MAGNET.price,
            magnetOwned: true,
          },
        }));
        return true;
      },

      // Use Fast Pass to clear a processing batch instantly
      applyRefineryFastPass: (batchId) => {
        const gems = get().user.gems;
        if (gems < 2) return false;

        set((prev) => ({
          user: { ...prev.user, gems: prev.user.gems - 2 },
          refineryBatches: prev.refineryBatches.map((b) =>
            b.id === batchId ? { ...b, clearsAt: Date.now(), status: 'ready' as const } : b
          ),
        }));
        return true;
      },

      // =====================================
      // PASSIVE INCOME TICK (Every Second) — fed by the Mining Buddy
      // =====================================
      processPassiveIncome: () => {
        const state = get();
        const now = Date.now();
        const lastIncome = state.mining.lastPassiveIncomeAt;

        const totalPassiveHourly = state.getPassiveRatePerHour();
        const totalPassivePerSec = totalPassiveHourly / 3600;

        if (totalPassivePerSec <= 0) {
          set((prev) => ({
            mining: { ...prev.mining, lastPassiveIncomeAt: now },
          }));
          return 0;
        }

        const msPassed = lastIncome ? now - lastIncome : 0;
        const secPassed = msPassed > 0 ? msPassed / 1000 : 1;

        if (secPassed < 0.2) return 0;

        const earned = totalPassivePerSec * secPassed;
        const newLifetime = state.user.lifetimeNuggets + earned;

        const updatedAchievements = state.achievements.map((ach) => {
          if (ach.completed || !ach.id.startsWith('star')) return ach;
          const progress = Math.min(ach.target, newLifetime);
          return { ...ach, progress, completed: progress >= ach.target };
        });

        set((prev) => {
          const weekly = bumpWeeklyGold(prev.user, earned);
          return {
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets + earned,
            pendingNuggets: prev.user.pendingNuggets + earned,
            lifetimeNuggets: newLifetime,
            weeklyGold: weekly.weeklyGold,
            weeklyGoldWeekKey: weekly.weeklyGoldWeekKey,
          },
          mining: {
            ...prev.mining,
            lastPassiveIncomeAt: now,
            lastActiveAt: now,
            totalPassiveIncome: prev.mining.totalPassiveIncome + earned,
          },
          achievements: updatedAchievements,
          };
        });

        const latestBatch = state.refineryBatches.find(
          (b) => b.status === 'processing' && now - b.depositedAt < 10000
        );

        if (latestBatch) {
          set((prev) => ({
            refineryBatches: prev.refineryBatches.map((b) =>
              b.id === latestBatch.id
                ? { ...b, nuggetsAmount: b.nuggetsAmount + earned }
                : b
            ),
          }));
        } else {
          const newBatchId = `batch_passive_${Math.random().toString(36).substring(2, 9)}`;
          set((prev) => ({
            refineryBatches: [
              ...prev.refineryBatches,
              {
                id: newBatchId,
                nuggetsAmount: earned,
                depositedAt: now,
                clearsAt: now + REFINERY_BATCH_CLEAR_SECONDS * 1000,
                status: 'processing',
              },
            ],
          }));
        }

        return earned;
      },

      // =====================================
      // OFFLINE EARNINGS — retention mechanism #1 for idle games. Computed once
      // on mount from the gap since lastActiveAt, capped, requires a Buddy owned.
      // =====================================
      computeOfflineEarnings: () => {
        const state = get();
        const buddyRate = state.getPassiveRatePerHour();
        if (buddyRate <= 0) return; // no Buddy = nothing accrues while away

        const now = Date.now();
        const elapsedMs = Math.min(now - state.mining.lastActiveAt, OFFLINE_EARNINGS_CAP_MS);
        if (elapsedMs < 60000) return; // don't bother for a <1min gap (tab refresh etc.)

        const earned = buddyRate * (elapsedMs / 3600000);
        if (earned < 5) return;

        set({ pendingOfflineEarnings: earned });
      },

      claimOfflineEarnings: (doubled) => {
        const pending = get().pendingOfflineEarnings;
        if (pending === null) return;
        const amount = doubled ? pending * 2 : pending;

        set((prev) => {
          const weekly = bumpWeeklyGold(prev.user, amount);
          return {
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets + amount,
            availableNuggets: prev.user.availableNuggets + amount, // already refined — the Buddy worked, no oven wait
            lifetimeNuggets: prev.user.lifetimeNuggets + amount,
            weeklyGold: weekly.weeklyGold,
            weeklyGoldWeekKey: weekly.weeklyGoldWeekKey,
          },
          pendingOfflineEarnings: null,
          mining: { ...prev.mining, lastActiveAt: Date.now() },
          };
        });
      },

      // =====================================
      // CHECK REFINERY PROGRESS
      // =====================================
      checkRefinery: () => {
        const now = Date.now();
        const state = get();

        let nuggetsUnlocked = 0;

        const updatedBatches = state.refineryBatches.map((batch) => {
          if (batch.status === 'processing' && now >= batch.clearsAt) {
            nuggetsUnlocked += batch.nuggetsAmount;
            return { ...batch, status: 'ready' as const };
          }
          return batch;
        });

        if (nuggetsUnlocked > 0) {
          set((prev) => {
            const newAvailable = prev.user.availableNuggets + nuggetsUnlocked;
            const newPending = Math.max(0, prev.user.pendingNuggets - nuggetsUnlocked);

            return {
              refineryBatches: updatedBatches,
              user: {
                ...prev.user,
                availableNuggets: newAvailable,
                pendingNuggets: newPending,
              },
            };
          });
        }
      },

      // =====================================
      // DAILY BONUS STREAK CLAIM
      // =====================================
      getStreakReward: () => {
        const streak = get().dailyStreak.streakCount + 1;
        return {
          nuggets: streak * 150,
          gems: streak % 5 === 0 ? 3 : 1,
        };
      },

      claimDailyBonus: () => {
        const state = get();
        const now = Date.now();
        const lastClaim = state.dailyStreak.lastClaimedAt;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (lastClaim && now - lastClaim < ONE_DAY) {
          return null;
        }

        let newStreak = state.dailyStreak.streakCount + 1;
        if (lastClaim && now - lastClaim > ONE_DAY * 2) {
          newStreak = 1;
        }

        const rewards = get().getStreakReward();

        set((prev) => {
          const weekly = bumpWeeklyGold(prev.user, rewards.nuggets);
          return {
          user: {
            ...prev.user,
            nuggets: prev.user.nuggets + rewards.nuggets,
            lifetimeNuggets: prev.user.lifetimeNuggets + rewards.nuggets,
            gems: prev.user.gems + rewards.gems,
            weeklyGold: weekly.weeklyGold,
            weeklyGoldWeekKey: weekly.weeklyGoldWeekKey,
          },
          dailyStreak: {
            streakCount: newStreak,
            lastClaimedAt: now,
          },
          };
        });

        return { nuggets: rewards.nuggets, gems: rewards.gems, streak: newStreak };
      },

      // =====================================
      // SERVER SYNC
      // =====================================
      syncWithServer: async () => {
        const state = get();
        if (!state.user.id) return;

        try {
          const res = await fetch('/api/game/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: state.user.id,
              username: state.user.username,
              nuggets: Math.floor(state.user.nuggets),
              availableNuggets: Math.floor(state.user.availableNuggets),
              pendingNuggets: Math.floor(state.user.pendingNuggets),
              gems: state.user.gems,
              level: state.user.level,
              miningPower: state.getPickaxeMultiplier(),
              totalTaps: state.user.totalTaps,
            }),
          });

          if (res.ok) {
            set({ lastSyncAt: Date.now(), isOffline: false });
          } else {
            set({ isOffline: true });
          }
        } catch (e) {
          set({ isOffline: true });
        }
      },

      // Fire-and-forget, like bored-master's leaderboard submit — failure just
      // means this device's score doesn't update this cycle, never blocks play.
      submitLeaderboardScore: async () => {
        const state = get();
        if (!state.user.id || !state.user.nickname) return;

        try {
          await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: state.user.id,
              nickname: state.user.nickname,
              weeklyGold: Math.floor(state.user.weeklyGold),
              trophyCount: state.achievements.filter((a) => a.claimed).length,
              level: state.user.level,
            }),
          });
        } catch (e) {
          // Non-blocking — local play continues regardless of leaderboard reachability.
        }
      },

      toggleSound: () => set((prev) => ({ soundEnabled: !prev.soundEnabled })),
      toggleVibration: () => set((prev) => ({ vibrationEnabled: !prev.vibrationEnabled })),
      setOffline: (isOffline) => set({ isOffline }),

      setLanguage: (lang) => set({ language: lang }),

      resetGame: () => {
        set({
          user: { ...defaultUser, id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` },
          mining: { ...defaultMining, lastActiveAt: Date.now() },
          refineryBatches: [],
          achievements: DEFAULT_ACHIEVEMENTS,
          isOffline: false,
          lastSyncAt: null,
          dailyStreak: { streakCount: 0, lastClaimedAt: null },
          language: 'en',
          pendingOfflineEarnings: null,
        });
      },
    }),
    {
      name: 'diggy-diggy-gold-save',
      storage: createJSONStorage(() => localStorage),
      // Rehydration is triggered manually (see app/page.tsx) after the first
      // client render, so the SSR HTML and the pre-hydration client render
      // both use the same default state — avoids a hydration mismatch on
      // any component that reads persisted user data (nuggets, mine
      // progress, etc.) on its very first render.
      skipHydration: true,
      partialize: (state) => ({
        user: state.user,
        mining: state.mining,
        refineryBatches: state.refineryBatches,
        achievements: state.achievements,
        soundEnabled: state.soundEnabled,
        vibrationEnabled: state.vibrationEnabled,
        dailyStreak: state.dailyStreak,
        lastSyncAt: state.lastSyncAt,
        language: state.language,
      }),
    }
  )
);

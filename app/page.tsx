'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/game-store';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav, type NavTab } from '@/components/game/BottomNav';
import { DigButton } from '@/components/game/DigButton';
import { StatsDisplay } from '@/components/game/StatsDisplay';
import { Shop, Inventory } from '@/components/game/Shop';
import { RefineryStatus } from '@/components/game/RefineryStatus';
import { DailyBonus } from '@/components/game/DailyBonus';
import { TrophyCase } from '@/components/game/TrophyCase';
import { MineProgressBar } from '@/components/game/MineProgressBar';
import { PrestigeButton } from '@/components/game/PrestigeButton';
import { OfflineEarningsModal } from '@/components/game/OfflineEarningsModal';
import { Leaderboard } from '@/components/game/Leaderboard';
import { StoreScreen } from '@/components/game/StoreScreen';
import { formatNumber } from '@/lib/number-format';
import { generateSafeNickname } from '@/lib/leaderboard-utils';
import { SettingsSheet } from '@/components/game/SettingsSheet';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { PerfProbe } from '@/components/dev/PerfProbe';

export default function GamePage() {
  // Temporary: diagnostic for the intermittent freeze, only active with ?perf=1.
  const [perfProbe, setPerfProbe] = useState(false);
  useEffect(() => {
    setPerfProbe(new URLSearchParams(window.location.search).has('perf'));
  }, []);
  const {
    user,
    processPassiveIncome,
    checkRefinery,
    syncWithServer,
    computeOfflineEarnings,
    submitLeaderboardScore,
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<NavTab>('mine');
  const [storeOpen, setStoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  // 0+1. Rehydrate the persisted save from localStorage — deferred to a
  // client-only effect (store uses skipHydration) so the very first client
  // render matches the SSR-rendered default state exactly, avoiding a
  // hydration mismatch. Only after rehydration resolves do we check whether
  // a user still needs to be created — reading live state via getState(),
  // not the `user` destructured above, since that closure is still the
  // pre-hydration snapshot and would otherwise stomp an existing save with
  // a fresh guest id.
  useEffect(() => {
    (async () => {
      await useGameStore.persist.rehydrate();
      const hydratedUser = useGameStore.getState().user;
      if (!hydratedUser.id) {
        const tempId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        useGameStore.getState().setUser({ id: tempId, username: 'Gold Miner', nickname: generateSafeNickname(tempId) });
      }
    })();
  }, []);

  // 1b. Compute offline earnings once on mount, from the gap since last active
  useEffect(() => {
    computeOfflineEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Continuous high-speed ticks for passive income accumulation (every 1 second)
  useEffect(() => {
    const passiveInterval = setInterval(() => {
      processPassiveIncome();
    }, 1000);
    return () => clearInterval(passiveInterval);
  }, [processPassiveIncome]);

  // 3. Periodic refinery check updates (every 2 seconds)
  useEffect(() => {
    const refineryInterval = setInterval(() => {
      checkRefinery();
    }, 2000);
    return () => clearInterval(refineryInterval);
  }, [checkRefinery]);

  // 4. Automatic server-side sync loops (every 45 seconds)
  useEffect(() => {
    if (!user.id) return;
    
    // Initial sync
    syncWithServer();
    submitLeaderboardScore();

    const syncInterval = setInterval(() => {
      syncWithServer();
      submitLeaderboardScore();
    }, 45000);

    return () => clearInterval(syncInterval);
  }, [user.id, syncWithServer, submitLeaderboardScore]);

  return (
    <main className="min-h-screen text-ink bg-bg relative flex flex-col overflow-x-hidden font-sans pb-28" id="app-shell">
      {perfProbe && <PerfProbe />}

      {/* Dynamic Animated background ambient dust particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/15 rounded-full"
            style={{
              top: `${10 + (i * 17) % 80}%`,
              left: `${5 + (i * 23) % 90}%`,
            }}
            animate={{
              y: ['0px', '-120px'],
              opacity: [0, 0.4, 0],
              scale: [0.6, 1.2, 0.6],
            }}
            transition={{
              duration: 6 + (i % 4) * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: (i % 5) * 0.8,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-xl mx-auto px-4 py-4 shrink-0">
        
        {/* Game Header Row — only what a child needs to see: logo, gold count,
            one settings icon. Everything else (gems, language, sound, sync
            status) moved into SettingsSheet, a parent-facing surface. */}
        <header className="w-full flex items-center justify-between gap-3 bg-surface brutal-border brutal-shadow rounded-2xl p-2.5 mb-2.5" id="game-header">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⛏️</span>
            <h1 className="text-lg font-display text-ink tracking-tight leading-none">
              DIGGY.DIG
              <span className="sr-only"> — Gold Mining Game</span>
            </h1>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-primary-soft/30 brutal-border-2 rounded-full px-3 py-1.5">
              <span className="text-lg leading-none">🪙</span>
              <span className="text-base font-black text-ink tabular-nums leading-none">
                {formatNumber(user.nuggets)}
              </span>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 brutal-border-2 brutal-shadow-sm rounded-full cursor-pointer bg-surface hover:bg-surface-muted transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 text-ink" />
            </button>
          </div>
        </header>

        {/* Always visible, outside the tabs — the next goal is never more than a glance away */}
        <MineProgressBar />
        <PrestigeButton />

        {/* Active screen — navigation now lives in the persistent bottom bar,
            so this is a plain content swap keyed by the selected tab. */}
        <div className="w-full">
          {activeTab === 'mine' && (
            <div className="space-y-3 focus:outline-none">
              {/* The rock is the one obviously-tappable thing on this screen —
                  it now sits right under the progress bar, reachable without
                  scrolling on a real phone viewport. Everything that isn't
                  the core tap loop (daily gift, refinery/economy detail,
                  stat readout) is demoted below it, still fully reachable,
                  never removed. */}
              <DigButton />
              <DailyBonus />
              <RefineryStatus />
              <StatsDisplay />
            </div>
          )}

          {activeTab === 'shop' && <Shop />}

          {activeTab === 'inventory' && <Inventory />}

          {activeTab === 'achievements' && <TrophyCase />}

          {activeTab === 'rank' && <Leaderboard />}
        </div>

        {/* Support link — deliberately small, plain-text, and visually distinct
            from every gameplay button so a tap meant for the game can never
            land on a payment screen. Scrolls with content, above the fixed nav. */}
        <footer className="w-full py-4 mt-6 border-t-4 border-ink bg-surface z-10 flex items-center justify-between text-[11px] text-ink font-black uppercase tracking-wider shrink-0" id="game-footer">
          <span>DiggyDiggy v1.2.0 ⛏️</span>
          <button onClick={() => setStoreOpen(true)} className="text-ink-soft hover:text-ink cursor-pointer normal-case font-semibold tracking-normal">
            Support the game
          </button>
        </footer>

        {/* Adult/crawler surface — plain descriptive copy for SEO and EAT,
            not part of the child-facing gameplay screen (kid-game-ui skill:
            text names/descriptions exist for the adult and for search, the
            child never needs to read them to play). */}
        <div className="w-full text-center text-[10px] leading-relaxed text-ink-soft/80 mt-3 px-2 normal-case font-normal tracking-normal">
          <p>
            DiggyDiggy Gold is a free online gold mining game — tap to mine gold, upgrade
            your pickaxe, hire a Mining Buddy for passive income, and collect gold nuggets
            even while you&apos;re away. No download required, play instantly in your browser.
          </p>
          <p className="mt-1">
            DiggyDiggy Gold is part of Gesmine-Invest Limited, registered UK company number
            14120136, registered office address at Hardy House, 269 Poynders Gardens, London,
            United Kingdom, SW4 8PQ.
          </p>
        </div>
      </div>

      {/* Persistent bottom tab bar — fixed to the viewport, always visible
          regardless of scroll position. Mine is the big, obviously-primary tab. */}
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />

      {storeOpen && <StoreScreen onClose={() => setStoreOpen(false)} />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
      <OfflineEarningsModal />
    </main>
  );
}

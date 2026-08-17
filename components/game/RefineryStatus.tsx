'use client';

import { useGameStore } from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { useState, useEffect } from 'react';
import { formatDuration } from '@/lib/time-utils';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Sparkles, Check, Loader2, HelpCircle } from 'lucide-react';

export function RefineryStatus() {
  const { user, refineryBatches, checkRefinery, applyRefineryFastPass, language } = useGameStore();
  const { playSound } = useAudio();
  const [time, setTime] = useState(() => Date.now());
  const [showHelp, setShowHelp] = useState(false);
  const [gemError, setGemError] = useState(false);

  // Tick time and trigger state sweeps for completed batches
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(Date.now());
      checkRefinery();
    }, 1000);
    return () => clearInterval(timer);
  }, [checkRefinery]);

  const activeBatches = refineryBatches.filter((b) => b.status === 'processing');
  const readyBatchesCount = refineryBatches.filter((b) => b.status === 'ready').length;

  const handleFastPass = (batchId: string) => {
    if (user.gems < 2) {
      playSound('error');
      setGemError(true);
      setTimeout(() => setGemError(false), 3000);
      return;
    }
    const success = applyRefineryFastPass(batchId);
    if (success) {
      playSound('purchase');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-surface brutal-border brutal-shadow rounded-3xl p-4 sm:p-5 text-ink mb-4" id="refinery-status-card">

      {/* Balances Board */}
      <div className="grid grid-cols-2 gap-3.5 mb-4" id="refinery-balances">
        {/* Balance A: Raw Nuggets (Pending) */}
        <div className="bg-primary-soft/15 p-3 brutal-border-2 rounded-2xl relative overflow-hidden">
          <div className="absolute top-1 right-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </div>
          <span className="text-[9px] font-black text-primary uppercase tracking-wider block">
            {language === 'fr' ? '🔥 Or Brut (Au Fourneau)' : '🔥 Raw Gold (In Oven)'}
          </span>
          <span className="text-base sm:text-lg font-black text-ink tabular-nums mt-0.5 block">
            {Math.floor(user.pendingNuggets).toLocaleString()}
          </span>
        </div>

        {/* Balance B: Refined Nuggets (Available) */}
        <div className="bg-success/10 p-3 brutal-border-2 rounded-2xl relative overflow-hidden">
          <div className="absolute top-1.5 right-1.5">
            <Check className="w-3.5 h-3.5 text-ink" />
          </div>
          <span className="text-[9px] font-black text-success uppercase tracking-wider block">
            {language === 'fr' ? '🪙 Or Pur (Prêt !)' : '🪙 Pure Gold (Ready!)'}
          </span>
          <span className="text-base sm:text-lg font-black text-ink tabular-nums mt-0.5 block">
            {Math.floor(user.availableNuggets).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Gem Error Display */}
      {gemError && (
        <div className="text-xs text-danger font-bold uppercase text-center mb-2 bg-danger/10 rounded-xl p-2 border border-danger">
          {language === 'fr'
            ? 'Pas assez de diamants 💎 ! Il en faut 2.'
            : 'Not enough gems 💎! You need 2.'}
        </div>
      )}

      {/* Accordion Help Toggle — same "how it works" text as before, now
          opt-in only instead of a permanent paragraph sitting in the main
          flow. Nothing is removed, it's one tap away for a curious kid or
          a parent. */}
      <div className="border-t-2 border-surface-muted pt-3.5 mb-4">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between bg-surface-muted border-2 border-ink rounded-2xl px-3 py-2 text-[11px] font-black uppercase text-ink hover:bg-primary-soft/20 cursor-pointer brutal-shadow-sm transition-all"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>{language === 'fr' ? 'Comment jouer ?' : 'How does it work?'}</span>
          </span>
          <span>{showHelp ? '[-]' : '[+]'}</span>
        </button>
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="bg-accent-soft/15 brutal-border-2 rounded-2xl p-3 text-[10px] text-ink font-bold uppercase leading-relaxed space-y-2">
                {language === 'fr' ? (
                  <>
                    <p>1. Clique sur l&apos;onglet <span className="text-primary">&quot;⛏️ Mine&quot;</span> et appuie sur le gros bouton jaune pour creuser !</p>
                    <p>2. Ton or va cuire automatiquement pendant <span className="text-primary">30 secondes</span>.</p>
                    <p>3. Utilise l&apos;or pur dans la <span className="text-primary">🛒 Boutique (Shop)</span> pour acheter des super outils !</p>
                  </>
                ) : (
                  <>
                    <p>1. Click the <span className="text-primary">&quot;⛏️ Mine&quot;</span> tab and tap the big yellow button to dig gold!</p>
                    <p>2. Your gold bakes automatically in the oven for <span className="text-primary">30 seconds</span>.</p>
                    <p>3. Spend your pure gold in the <span className="text-primary">🛒 Shop</span> to buy better tools!</p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Smelting Batches Queue */}
      <div className="border-t-2 border-surface-muted pt-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-[11px] font-black text-ink uppercase tracking-widest flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-ink animate-spin" />
            <span>
              {language === 'fr'
                ? `Fournées en cours 🔥 (${activeBatches.length})`
                : `Oven Baking Queue 🔥 (${activeBatches.length})`}
            </span>
          </h4>
          {readyBatchesCount > 0 && (
            <span className="text-[9px] font-black bg-success/25 text-ink border-2 border-ink rounded-full px-2 py-0.5 animate-pulse uppercase">
              {language === 'fr' ? 'Prêt !' : 'Baking Done!'}
            </span>
          )}
        </div>

        {activeBatches.length === 0 ? (
          <div className="bg-surface-muted brutal-border-2 rounded-2xl p-6 text-center">
            <p className="text-[11px] font-black uppercase text-ink-soft">
              {language === 'fr' ? 'Le fourneau est vide.' : 'The oven is currently empty.'}
            </p>
            <p className="text-[9px] font-bold uppercase text-ink-soft/70 mt-1">
              {language === 'fr' ? 'Commence à creuser pour allumer le feu !' : 'Start digging to put gold in the oven!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1" id="batches-scroll-area">
            {activeBatches.map((batch) => {
              const msLeft = batch.clearsAt - time;
              const isReady = msLeft <= 0;

              return (
                <div
                  key={batch.id}
                  className="bg-surface brutal-border-2 rounded-2xl p-2 flex items-center justify-between gap-3 text-ink"
                  id={`batch-${batch.id}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-primary-soft/40 brutal-border-2 rounded-xl flex items-center justify-center text-xs">
                      🪵
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-ink tabular-nums">
                        +{Math.floor(batch.nuggetsAmount).toLocaleString()} {language === 'fr' ? 'Or' : 'Raw'}
                      </span>
                      <p className="text-[8px] font-bold uppercase text-ink-soft">
                        {language === 'fr' ? 'Cuisson...' : 'Baking...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-primary tabular-nums">
                      {isReady ? (language === 'fr' ? 'Prêt !' : 'Done!') : formatDuration(msLeft)}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleFastPass(batch.id)}
                      className="text-[9px] bg-accent-soft/60 hover:bg-accent-soft text-ink border-2 border-ink rounded-full font-black px-2 py-0.5 flex items-center gap-0.5 cursor-pointer uppercase brutal-shadow-sm transition-all"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{language === 'fr' ? 'Vite (2 💎)' : 'Skip (2 Gems)'}</span>
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

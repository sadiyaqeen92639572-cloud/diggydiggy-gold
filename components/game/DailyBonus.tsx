'use client';

import { useGameStore } from '@/store/game-store';
import { useAudio } from '@/hooks/use-audio';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Gift, Coins, Check } from 'lucide-react';

export function DailyBonus() {
  const { dailyStreak, claimDailyBonus, getStreakReward, language } = useGameStore();
  const { playSound } = useAudio();
  const [claimSuccess, setClaimSuccess] = useState<{ nuggets: number; gems: number } | null>(null);
  const [alreadyClaimedMsg, setAlreadyClaimedMsg] = useState(false);
  const [time, setTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const isAvailable = !dailyStreak.lastClaimedAt || (time - dailyStreak.lastClaimedAt >= ONE_DAY);

  const handleClaim = () => {
    const rewards = claimDailyBonus();
    if (rewards) {
      playSound('streak');
      setClaimSuccess(rewards);
      setTimeout(() => setClaimSuccess(null), 4000);
    } else {
      playSound('error');
      setAlreadyClaimedMsg(true);
      setTimeout(() => setAlreadyClaimedMsg(false), 3000);
    }
  };

  const nextRewards = getStreakReward();

  return (
    <div className="w-full max-w-md mx-auto bg-surface brutal-border brutal-shadow rounded-3xl p-4 sm:p-5 relative overflow-hidden text-ink mb-4" id="daily-bonus-container">

      {/* Background glow sparks */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

       {/* Header section */}
       <div className="flex items-center justify-between mb-4">
         <div className="flex items-center gap-2">
           <div className="p-2 brutal-border-2 rounded-xl bg-primary-soft/40 text-ink">
             <Calendar className="w-4.5 h-4.5" />
           </div>
           <div>
             <h4 className="text-xs font-black uppercase tracking-wider text-ink">
               {language === 'fr' ? '🎁 Cadeau du Jour' : '🎁 Daily Free Gift'}
             </h4>
             <p className="text-[10px] text-ink-soft font-bold uppercase flex items-center gap-1">
               🔥 <span className="font-black text-primary tabular-nums">{dailyStreak.streakCount}</span>
             </p>
           </div>
         </div>

         {isAvailable ? (
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={handleClaim}
             className="bg-primary text-on-primary text-[10px] sm:text-xs font-black px-3.5 py-2 brutal-border brutal-shadow-sm rounded-full cursor-pointer flex items-center gap-1.5 uppercase hover:bg-primary-soft transition-colors"
           >
             <Gift className="w-3.5 h-3.5" />
             <span>{language === 'fr' ? 'Ouvrir' : 'Claim Rewards'}</span>
           </motion.button>
         ) : (
           <div className="bg-success/20 text-ink text-[10px] sm:text-xs font-black px-3 py-2 brutal-border brutal-shadow-sm rounded-full flex items-center gap-1 uppercase">
             <Check className="w-3.5 h-3.5" />
             <span>{language === 'fr' ? 'Déjà Ouvert' : 'Claimed Today'}</span>
           </div>
         )}
       </div>

       {/* Already claimed feedback */}
       {alreadyClaimedMsg && (
         <div className="text-xs text-danger font-bold uppercase text-center mb-2 bg-danger/10 rounded-xl p-2 border border-danger">
           {language === 'fr'
             ? 'Tu as déjà ouvert ton cadeau ! Reviens demain !'
             : 'Already claimed today! Come back tomorrow.'}
         </div>
       )}
 
       {/* Success Animation overlays */}
       <AnimatePresence>
         {claimSuccess && (
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="absolute inset-0 bg-surface rounded-3xl flex flex-col items-center justify-center text-center p-4 z-25 brutal-border"
           >
             <motion.div
               animate={{ rotate: [0, 15, -15, 0] }}
               transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
               className="w-12 h-12 bg-primary brutal-border rounded-2xl flex items-center justify-center text-on-primary mb-2.5 brutal-shadow-sm"
             >
               <Gift className="w-6 h-6" />
             </motion.div>

             <h5 className="text-sm font-black uppercase text-ink">
               {language === 'fr' ? 'Cadeau Récupéré !' : 'Gift Opened!'}
             </h5>
             <p className="text-[11px] text-ink-soft mt-0.5">
               {language === 'fr' ? 'Visites de suite :' : 'Daily streak:'} {dailyStreak.streakCount} {language === 'fr' ? 'jours' : 'days'}
             </p>

             <div className="flex items-center gap-3 mt-3">
               <div className="bg-surface brutal-border-2 rounded-full px-2.5 py-1 flex items-center gap-1 text-ink tabular-nums text-xs font-black">
                 <Coins className="w-3.5 h-3.5 text-primary" />
                 <span>+{claimSuccess.nuggets} {language === 'fr' ? 'or' : 'gold'}</span>
               </div>
               <div className="bg-surface brutal-border-2 rounded-full px-2.5 py-1 flex items-center gap-1 text-ink tabular-nums text-xs font-black">
                 <span className="text-sm leading-none">💎</span>
                 <span>+{claimSuccess.gems} {language === 'fr' ? 'diamants' : 'gems'}</span>
               </div>
             </div>
           </motion.div>
         )}
       </AnimatePresence>
 
       {/* Grid: 7-Day Calendar Streak Indicators */}
       <div className="grid grid-cols-7 gap-1.5 mt-2.5" id="daily-calendar-grid">
         {[...Array(7)].map((_, i) => {
           const dayNumber = i + 1;
           const isClaimed = dayNumber <= dailyStreak.streakCount && !isAvailable;
           const isToday = dayNumber === dailyStreak.streakCount + 1 && isAvailable;
           
           return (
             <div
               key={i}
               className={`p-2 rounded-xl flex flex-col items-center justify-center border-2 text-center transition-all ${
                 isClaimed
                   ? 'bg-success/25 border-ink text-ink'
                   : isToday
                   ? 'bg-primary border-ink text-on-primary font-black'
                   : 'bg-surface-muted border-surface-muted text-ink-soft'
               }`}
               id={`daily-day-${dayNumber}`}
             >
               <span className="text-[8px] font-black uppercase block mb-1">J{dayNumber}</span>
               
               <div className="text-[10px] font-black flex items-center justify-center h-4">
                 {isClaimed ? (
                   <Check className="w-3.5 h-3.5 stroke-[3]" />
                 ) : (
                   <span>+{dayNumber * 150}</span>
                 )}
               </div>
             </div>
           );
         })}
       </div>
    </div>
  );
}

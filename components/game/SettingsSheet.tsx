'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '@/store/game-store';

// Adult/parent surface: everything that isn't needed to play the core tap
// loop (language, sound toggle, sync status, gem count) lives here instead
// of on the main screen — keeps exactly one thing (the rock) as the primary
// tappable element on the game screen itself.
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { user, soundEnabled, toggleSound, language, setLanguage, isOffline, lastSyncAt } = useGameStore();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-surface brutal-border brutal-shadow-lg rounded-3xl p-5 max-w-xs w-full text-ink"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase">Settings</h3>
            <button onClick={onClose} className="p-1 rounded-full cursor-pointer hover:bg-surface-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 brutal-border-2 rounded-2xl">
              <span className="text-xs font-black uppercase">💎 Gems</span>
              <span className="text-sm font-black tabular-nums">{user.gems.toLocaleString()}</span>
            </div>

            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between p-2.5 brutal-border-2 rounded-2xl cursor-pointer hover:bg-surface-muted transition-colors"
            >
              <span className="text-xs font-black uppercase">Sound</span>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="w-full flex items-center justify-between p-2.5 brutal-border-2 rounded-2xl cursor-pointer hover:bg-surface-muted transition-colors"
            >
              <span className="text-xs font-black uppercase">Language</span>
              <span className="text-xs font-black">{language === 'fr' ? 'FR 🇫🇷' : 'EN 🇬🇧'}</span>
            </button>

            <div className="flex items-center justify-between p-2.5 brutal-border-2 rounded-2xl text-[10px] text-ink-soft font-black uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full border border-ink ${isOffline ? 'bg-danger' : 'bg-success'}`} />
                {isOffline ? 'Offline' : 'Synced'}
              </span>
              {lastSyncAt && (
                <span className="tabular-nums opacity-80">
                  {new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

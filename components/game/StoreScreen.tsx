'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IAP_CATALOG } from '@/lib/monetization/catalog';
import { webIAPProvider } from '@/lib/monetization/web-provider';
import { X } from 'lucide-react';

// Adult surface, deliberately: plain sentences, real prices, honest about what
// is (not yet) being sold — never reachable from a gameplay tap, no urgency,
// no dark patterns. Opened only from the footer's "Support" link.
export function StoreScreen({ onClose }: { onClose: () => void }) {
  const available = webIAPProvider.isAvailable();

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
          className="bg-surface brutal-border brutal-shadow-lg rounded-3xl p-5 max-w-md w-full text-ink max-h-[80vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase">Support DiggyDiggy Gold</h3>
            <button onClick={onClose} className="p-1 rounded-full cursor-pointer hover:bg-surface-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!available && (
            <p className="text-xs text-ink-soft font-semibold mb-4 leading-relaxed">
              Purchases aren&apos;t set up yet — this screen shows what will be available
              soon. Nothing here charges any money right now.
            </p>
          )}

          <div className="space-y-2.5">
            {IAP_CATALOG.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 brutal-border-2 rounded-2xl">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-black uppercase">{item.name}</p>
                  <p className="text-[10px] text-ink-soft font-semibold">{item.description}</p>
                </div>
                <button
                  disabled
                  className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 border-surface-muted bg-surface-muted text-ink-soft cursor-not-allowed shrink-0 tabular-nums"
                >
                  {available ? `$${item.priceUsd}` : 'Soon'}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

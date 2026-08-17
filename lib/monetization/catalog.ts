import { IAPCatalogItem } from './types';

// Direct-purchase only, never a randomized reward for real money — a loot box
// sold for cash to a game young kids play is gambling-adjacent regardless of
// whether the currency is crypto or a normal card payment (decided earlier).
export const IAP_CATALOG: IAPCatalogItem[] = [
  { id: 'skin_diamond_pink', name: 'Pink Diamond Pickaxe Skin', description: 'Cosmetic only — same stats as your current pickaxe.', priceUsd: 1.99, icon: '💗', category: 'skin' },
  { id: 'skin_gold_flames', name: 'Flame Pickaxe Skin', description: 'Cosmetic only — same stats as your current pickaxe.', priceUsd: 1.99, icon: '🔥', category: 'skin' },
  { id: 'gems_small', name: 'Small Gem Pack', description: '20 gems.', priceUsd: 0.99, icon: '💎', category: 'gems' },
  { id: 'gems_large', name: 'Large Gem Pack', description: '120 gems.', priceUsd: 4.99, icon: '💎', category: 'gems' },
  { id: 'remove_ads', name: 'Remove Ads', description: 'One-time purchase — no ads anywhere in the game, ever.', priceUsd: 3.99, icon: '🚫', category: 'remove-ads' },
];

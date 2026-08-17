/**
 * Monetization sits behind these interfaces so the web implementation can be
 * swapped for a Capacitor/AdMob one later without touching game code — see
 * the plan's "web first, Capacitor-ready" architecture decision.
 */
export interface AdProvider {
  /** Whether a rewarded-video ad can actually be shown right now. */
  isRewardedAvailable(): boolean;
  /** Resolves true if the user watched to completion and earned the reward. */
  showRewarded(): Promise<boolean>;
}

export interface IAPCatalogItem {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  icon: string;
  category: 'skin' | 'gems' | 'remove-ads';
}

export interface IAPPurchaseResult {
  success: boolean;
  reason?: 'not_configured' | 'cancelled' | 'error';
}

export interface IAPProvider {
  isAvailable(): boolean;
  purchase(itemId: string): Promise<IAPPurchaseResult>;
}

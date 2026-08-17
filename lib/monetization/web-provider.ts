import { AdProvider, IAPProvider, IAPPurchaseResult } from './types';

/**
 * Web implementation. HONEST STUBS, not fakes:
 *
 * - Rewarded video is not a standard AdSense format for web publishers (it's
 *   an AdMob/app format, or Ad Manager "AdSense for Games" by invitation
 *   only) — confirmed before building this, per the plan. isRewardedAvailable
 *   returns false so the UI simply doesn't offer a broken "watch ad" button,
 *   rather than showing one that does nothing.
 * - IAP has no payment processor wired (no Stripe account/keys exist for
 *   this project yet). purchase() never fakes a successful charge — it
 *   always resolves not_configured. Wiring a real Stripe Checkout session
 *   here requires the project owner's own Stripe account and API keys; that
 *   setup is outside what an assistant should do on someone's behalf.
 *
 * Swap this file for a Capacitor/AdMob + real Stripe implementation later —
 * nothing else in the game needs to change, since everything calls through
 * the AdProvider/IAPProvider interfaces, not this file directly.
 */
export const webAdProvider: AdProvider = {
  isRewardedAvailable: () => false,
  showRewarded: async () => false,
};

export const webIAPProvider: IAPProvider = {
  isAvailable: () => false,
  purchase: async (_itemId: string): Promise<IAPPurchaseResult> => {
    return { success: false, reason: 'not_configured' };
  },
};

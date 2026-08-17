import { db, RateLimitRecord } from '@/lib/db';

export const RATE_LIMITS = {
  TAP: { maxRequests: 1800, windowMs: 60000 },      // max 30 taps/sec = 1800/min
  PURCHASE: { maxRequests: 20, windowMs: 60000 },    // max 20 purchases/min
  SYNC: { maxRequests: 60, windowMs: 60000 },        // max 60 syncs/min
  LEADERBOARD: { maxRequests: 30, windowMs: 60000 }, // max 30 leaderboard calls/min
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blocked?: boolean;
  blockedUntil?: Date;
  blockReason?: string;
}

export async function checkRateLimit(
  identifier: string,
  actionType: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[actionType];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  
  try {
    let rateLimit = await db.getRateLimit(identifier);
    
    // If blocked, check if block is over
    if (rateLimit?.isBlocked && rateLimit.blockedUntil) {
      const blockedUntilDate = new Date(rateLimit.blockedUntil);
      if (blockedUntilDate > now) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: blockedUntilDate,
          blocked: true,
          blockedUntil: blockedUntilDate,
          blockReason: rateLimit.blockReason || 'Rate limit exceeded',
        };
      } else {
        // Reset block if time has elapsed
        rateLimit = null;
      }
    }
    
    // Create/reset if no record or expired window
    if (!rateLimit || new Date(rateLimit.windowStart) < windowStart) {
      const newRecord: RateLimitRecord = {
        identifier,
        requestCount: 1,
        windowStart: now.toISOString(),
        isBlocked: false,
        blockedUntil: null,
        blockReason: null,
      };
      await db.setRateLimit(newRecord);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }
    
    // Check if limit reached
    if (rateLimit.requestCount >= config.maxRequests) {
      const blockDuration = actionType === 'TAP' ? 300000 : 60000; // 5 min for taps, 1 min for others
      const blockedUntilDate = new Date(now.getTime() + blockDuration);
      
      const blockedRecord: RateLimitRecord = {
        ...rateLimit,
        isBlocked: true,
        blockedUntil: blockedUntilDate.toISOString(),
        blockReason: `Too many ${actionType} requests. Please chill!`,
      };
      await db.setRateLimit(blockedRecord);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntilDate,
        blocked: true,
        blockedUntil: blockedUntilDate,
        blockReason: blockedRecord.blockReason || '',
      };
    }
    
    // Increment counter
    const updatedRecord: RateLimitRecord = {
      ...rateLimit,
      requestCount: rateLimit.requestCount + 1,
    };
    await db.setRateLimit(updatedRecord);
    
    return {
      allowed: true,
      remaining: config.maxRequests - updatedRecord.requestCount,
      resetAt: new Date(new Date(rateLimit.windowStart).getTime() + config.windowMs),
    };
  } catch (error) {
    console.error('Rate limit fail-safe error:', error);
    // Fail-open to avoid blocking the game during disk errors
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
    };
  }
}

/**
 * Helper to identify request IP address safely
 */
export function getIPFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  return 'local-user';
}

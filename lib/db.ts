/// <reference types="@cloudflare/workers-types" />
import { getRequestContext } from '@cloudflare/next-on-pages';

export interface UserRecord {
  id: string;
  username: string;
  nuggets: number;
  gems: number;
  availableNuggets: number;
  pendingNuggets: number;
  level: number;
  miningPower: number;
  totalTaps: number;
  lastActiveAt: string;
  createdAt: string;
}

export interface RateLimitRecord {
  identifier: string;
  requestCount: number;
  windowStart: string;
  isBlocked: boolean;
  blockedUntil?: string | null;
  blockReason?: string | null;
}

export interface LeaderboardEntry {
  userId: string;
  nickname: string;
  weeklyGold: number;
  trophyCount: number;
  level: number;
  updatedAt: string;
}

// Cloudflare D1 binding, attached to the Pages project (see wrangler.toml /
// project deployment_configs) — replaces the old fs-based JSON file, which
// doesn't work on Cloudflare's edge runtime (no filesystem, no persistence
// between invocations anyway).
function getDb(): D1Database {
  const { env } = getRequestContext();
  return (env as { DB: D1Database }).DB;
}

export const db = {
  // --- USER OPERATIONS ---
  async findUserById(id: string): Promise<UserRecord | null> {
    const row = await getDb()
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<UserRecord>();
    return row ?? null;
  },

  async upsertUser(id: string, updates: Partial<UserRecord> & { username?: string }): Promise<UserRecord> {
    const now = new Date().toISOString();
    const existing = await this.findUserById(id);

    const record: UserRecord = existing
      ? { ...existing, ...updates, lastActiveAt: now }
      : {
          id,
          username: updates.username || 'Anonymous Miner',
          nuggets: updates.nuggets ?? 0,
          gems: updates.gems ?? 10,
          availableNuggets: updates.availableNuggets ?? 0,
          pendingNuggets: updates.pendingNuggets ?? 0,
          level: updates.level ?? 1,
          miningPower: updates.miningPower ?? 1,
          totalTaps: updates.totalTaps ?? 0,
          createdAt: now,
          lastActiveAt: now,
        };

    await getDb()
      .prepare(
        `INSERT INTO users (id, username, nuggets, gems, availableNuggets, pendingNuggets, level, miningPower, totalTaps, createdAt, lastActiveAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           username = excluded.username,
           nuggets = excluded.nuggets,
           gems = excluded.gems,
           availableNuggets = excluded.availableNuggets,
           pendingNuggets = excluded.pendingNuggets,
           level = excluded.level,
           miningPower = excluded.miningPower,
           totalTaps = excluded.totalTaps,
           lastActiveAt = excluded.lastActiveAt`
      )
      .bind(
        record.id,
        record.username,
        record.nuggets,
        record.gems,
        record.availableNuggets,
        record.pendingNuggets,
        record.level,
        record.miningPower,
        record.totalTaps,
        record.createdAt,
        record.lastActiveAt
      )
      .run();

    return record;
  },

  // --- RATE LIMIT OPERATIONS ---
  async getRateLimit(identifier: string): Promise<RateLimitRecord | null> {
    const row = await getDb()
      .prepare('SELECT * FROM rate_limits WHERE identifier = ?')
      .bind(identifier)
      .first<{
        identifier: string;
        requestCount: number;
        windowStart: string;
        isBlocked: number;
        blockedUntil: string | null;
        blockReason: string | null;
      }>();
    if (!row) return null;
    return { ...row, isBlocked: !!row.isBlocked };
  },

  async setRateLimit(record: RateLimitRecord): Promise<void> {
    await getDb()
      .prepare(
        `INSERT INTO rate_limits (identifier, requestCount, windowStart, isBlocked, blockedUntil, blockReason)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(identifier) DO UPDATE SET
           requestCount = excluded.requestCount,
           windowStart = excluded.windowStart,
           isBlocked = excluded.isBlocked,
           blockedUntil = excluded.blockedUntil,
           blockReason = excluded.blockReason`
      )
      .bind(
        record.identifier,
        record.requestCount,
        record.windowStart,
        record.isBlocked ? 1 : 0,
        record.blockedUntil ?? null,
        record.blockReason ?? null
      )
      .run();
  },

  // --- LEADERBOARD OPERATIONS (bucketed by ISO week key, e.g. "2026-W34") ---
  async upsertWeeklyScore(weekKey: string, entry: LeaderboardEntry): Promise<void> {
    await getDb()
      .prepare(
        `INSERT INTO leaderboard (weekKey, userId, nickname, weeklyGold, trophyCount, level, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(weekKey, userId) DO UPDATE SET
           nickname = excluded.nickname,
           weeklyGold = excluded.weeklyGold,
           trophyCount = excluded.trophyCount,
           level = excluded.level,
           updatedAt = excluded.updatedAt`
      )
      .bind(weekKey, entry.userId, entry.nickname, entry.weeklyGold, entry.trophyCount, entry.level, entry.updatedAt)
      .run();
  },

  async getWeeklyTop(weekKey: string, limit: number): Promise<LeaderboardEntry[]> {
    const { results } = await getDb()
      .prepare('SELECT * FROM leaderboard WHERE weekKey = ? ORDER BY weeklyGold DESC LIMIT ?')
      .bind(weekKey, limit)
      .all<LeaderboardEntry>();
    return results;
  },

  async getWeeklyRank(weekKey: string, userId: string): Promise<number | null> {
    const row = await getDb()
      .prepare(
        `SELECT COUNT(*) + 1 as rank FROM leaderboard
         WHERE weekKey = ? AND weeklyGold > (
           SELECT weeklyGold FROM leaderboard WHERE weekKey = ? AND userId = ?
         )`
      )
      .bind(weekKey, weekKey, userId)
      .first<{ rank: number }>();
    // No row for this user this week — the subquery returns NULL, so the
    // comparison never matches and COUNT(*) silently returns the full
    // leaderboard size instead of signaling "not ranked". Check membership
    // explicitly instead of trusting the count.
    const membership = await getDb()
      .prepare('SELECT 1 FROM leaderboard WHERE weekKey = ? AND userId = ?')
      .bind(weekKey, userId)
      .first();
    if (!membership) return null;
    return row?.rank ?? null;
  },
};

import fs from 'fs';
import path from 'path';

// Define DB paths
const DB_FILE = path.join(process.cwd(), 'db-store.json');

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

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'earning' | 'purchase';
  category: 'game' | 'shop';
  nuggetsAmount: number;
  description: string;
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

export interface DatabaseSchema {
  users: Record<string, UserRecord>;
  transactions: TransactionRecord[];
  rateLimits: Record<string, RateLimitRecord>;
  leaderboard: Record<string, Record<string, LeaderboardEntry>>; // weekKey -> userId -> entry
}

// Initial DB state
const initialData: DatabaseSchema = {
  users: {},
  transactions: [],
  rateLimits: {},
  leaderboard: {},
};

// Helper to read database
function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local db file, resetting:', err);
    return initialData;
  }
}

// Helper to write database
function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local db file:', err);
  }
}

export const db = {
  // --- USER OPERATIONS ---
  async findUserById(id: string): Promise<UserRecord | null> {
    const data = readDb();
    return data.users[id] || null;
  },

  async upsertUser(id: string, updates: Partial<UserRecord> & { username?: string }): Promise<UserRecord> {
    const data = readDb();
    const existing = data.users[id];
    const now = new Date().toISOString();

    if (existing) {
      data.users[id] = {
        ...existing,
        ...updates,
        lastActiveAt: now,
      };
    } else {
      data.users[id] = {
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
    }

    writeDb(data);
    return data.users[id];
  },

  // --- TRANSACTION OPERATIONS ---
  async createTransaction(tx: Omit<TransactionRecord, 'id' | 'createdAt'>): Promise<TransactionRecord> {
    const data = readDb();
    const newTx: TransactionRecord = {
      ...tx,
      id: `tx_${Math.random().toString(36).substring(2, 11)}`,
      createdAt: new Date().toISOString(),
    };
    data.transactions.push(newTx);
    writeDb(data);
    return newTx;
  },

  async getTransactionsByUserId(userId: string): Promise<TransactionRecord[]> {
    const data = readDb();
    return data.transactions.filter((t) => t.userId === userId).reverse();
  },

  // --- RATE LIMIT OPERATIONS ---
  async getRateLimit(identifier: string): Promise<RateLimitRecord | null> {
    const data = readDb();
    return data.rateLimits[identifier] || null;
  },

  async setRateLimit(record: RateLimitRecord): Promise<void> {
    const data = readDb();
    data.rateLimits[record.identifier] = record;
    writeDb(data);
  },

  // --- LEADERBOARD OPERATIONS (bucketed by ISO week key, e.g. "2026-W34") ---
  async upsertWeeklyScore(weekKey: string, entry: LeaderboardEntry): Promise<void> {
    const data = readDb();
    if (!data.leaderboard) data.leaderboard = {};
    if (!data.leaderboard[weekKey]) data.leaderboard[weekKey] = {};
    data.leaderboard[weekKey][entry.userId] = entry;
    writeDb(data);
  },

  async getWeeklyTop(weekKey: string, limit: number): Promise<LeaderboardEntry[]> {
    const data = readDb();
    const week = data.leaderboard?.[weekKey] || {};
    return Object.values(week)
      .sort((a, b) => b.weeklyGold - a.weeklyGold)
      .slice(0, limit);
  },

  async getWeeklyRank(weekKey: string, userId: string): Promise<number | null> {
    const data = readDb();
    const week = data.leaderboard?.[weekKey] || {};
    const sorted = Object.values(week).sort((a, b) => b.weeklyGold - a.weeklyGold);
    const idx = sorted.findIndex((e) => e.userId === userId);
    return idx === -1 ? null : idx + 1;
  },
};

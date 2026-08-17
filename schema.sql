CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  nuggets INTEGER NOT NULL DEFAULT 0,
  gems INTEGER NOT NULL DEFAULT 10,
  availableNuggets INTEGER NOT NULL DEFAULT 0,
  pendingNuggets INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  miningPower INTEGER NOT NULL DEFAULT 1,
  totalTaps INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  lastActiveAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT PRIMARY KEY,
  requestCount INTEGER NOT NULL DEFAULT 0,
  windowStart TEXT NOT NULL,
  isBlocked INTEGER NOT NULL DEFAULT 0,
  blockedUntil TEXT,
  blockReason TEXT
);

CREATE TABLE IF NOT EXISTS leaderboard (
  weekKey TEXT NOT NULL,
  userId TEXT NOT NULL,
  nickname TEXT NOT NULL,
  weeklyGold INTEGER NOT NULL DEFAULT 0,
  trophyCount INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (weekKey, userId)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_gold ON leaderboard (weekKey, weeklyGold DESC);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  developer TEXT NOT NULL,
  genre TEXT NOT NULL,
  monthly_revenue_usd REAL NOT NULL CHECK (monthly_revenue_usd >= 0),
  monthly_downloads INTEGER NOT NULL CHECK (monthly_downloads >= 0),
  average_rating REAL NOT NULL CHECK (average_rating >= 0 AND average_rating <= 5),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_games_monthly_revenue ON games(monthly_revenue_usd DESC);
CREATE INDEX IF NOT EXISTS idx_games_rating ON games(average_rating DESC);

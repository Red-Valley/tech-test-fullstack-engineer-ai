-- The Zod schema is the main validation; these CHECKs keep the table valid even if
-- something bypasses it (manual SQL, a bug in a script).
CREATE TABLE IF NOT EXISTS games (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT    NOT NULL UNIQUE COLLATE NOCASE CHECK (length(title) BETWEEN 1 AND 100),
  developer           TEXT    NOT NULL CHECK (length(developer) BETWEEN 1 AND 100),
  genre               TEXT    NOT NULL,
  monthly_revenue_usd INTEGER NOT NULL CHECK (monthly_revenue_usd >= 0),
  monthly_downloads   INTEGER NOT NULL CHECK (monthly_downloads >= 0),
  average_rating      REAL    NOT NULL CHECK (average_rating BETWEEN 0 AND 5)
);

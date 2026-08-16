-- ==========================================================
-- NexaSpin Cloudflare D1 Serverless SQL Schema
-- Double-entry transactional ledger, players, loans, and audit logs.
-- ==========================================================

-- 1. Players Table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT DEFAULT 'player',
  chips REAL DEFAULT 1000.0,
  bonus_balance REAL DEFAULT 200.0,
  peak_chips REAL DEFAULT 1000.0,
  loan_count INTEGER DEFAULT 0,
  cumulative_losses REAL DEFAULT 0.0,
  total_wager_required REAL DEFAULT 0.0,
  current_wager_progress REAL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Double-Entry Transactions Ledger Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_email TEXT NOT NULL,
  type TEXT NOT NULL, -- 'bet', 'win', 'deposit', 'withdrawal', 'loan', 'reward'
  amount REAL NOT NULL,
  balance_before REAL NOT NULL,
  balance_after REAL NOT NULL,
  game_id TEXT,
  status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'rejected'
  description TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- 3. Audit Logs Table (Compliance, RTP Changes, Admin Actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  level TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'critical'
  metadata TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. System & Dynamic RTP Configuration
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default RTP configurations
INSERT OR IGNORE INTO system_config (key, value) VALUES 
  ('global_rtp', '95.0'),
  ('rtp_bias', 'standard'),
  ('custom_win_ratio', '50'),
  ('force_lose_mode', 'false'),
  ('house_pool', '250000.0');

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

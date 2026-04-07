-- QueueSmart A4 — SQLite schema (user credentials, profiles, services, queues, entries, notifications, history, sessions)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_credentials (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_credentials_email ON user_credentials (email);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  contact_info TEXT,
  preferences TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_credentials (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_duration_minutes INTEGER NOT NULL CHECK (expected_duration_minutes >= 1),
  priority_level TEXT NOT NULL CHECK (priority_level IN ('low', 'medium', 'high')),
  is_open INTEGER NOT NULL DEFAULT 0 CHECK (is_open IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name_lower ON services (lower(name));

CREATE TABLE IF NOT EXISTS queues (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL UNIQUE,
  is_open INTEGER NOT NULL CHECK (is_open IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  order_index INTEGER NOT NULL CHECK (order_index >= 1),
  joined_at TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'served', 'canceled')),
  served_at TEXT,
  FOREIGN KEY (queue_id) REFERENCES queues (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_credentials (id),
  FOREIGN KEY (service_id) REFERENCES services (id)
);

CREATE INDEX IF NOT EXISTS idx_queue_entries_service_status ON queue_entries (service_id, status);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('Served', 'Left')),
  FOREIGN KEY (user_id) REFERENCES user_credentials (id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT,
  service_id TEXT,
  created_at TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
  FOREIGN KEY (user_id) REFERENCES user_credentials (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_credentials (id) ON DELETE CASCADE
);

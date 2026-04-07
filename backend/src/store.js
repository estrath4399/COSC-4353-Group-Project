import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { runMigrations } from './db/migrate.js';
import { seedIfEmpty } from './db/seed.js';
import { createSqliteStore } from './store/sqliteStore.js';

/**
 * @param {{ filename?: string, seedDemoData?: boolean }} [options]
 * - Default filename `:memory:` (used by tests): migrates + seeds demo data each run.
 * - File path: persists data; seeds only when the database has no users.
 */
export function createStore(options = {}) {
  const filename = options.filename ?? ':memory:';
  const seedDemoData = options.seedDemoData !== false;

  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  seedIfEmpty(db, { seedDemoData });
  return createSqliteStore(db);
}

const dataFile = process.env.QUEUE_DB_PATH || path.join(process.cwd(), 'data', 'queuesmart.sqlite');

export const defaultStore = createStore({
  filename: dataFile,
  seedDemoData: true,
});

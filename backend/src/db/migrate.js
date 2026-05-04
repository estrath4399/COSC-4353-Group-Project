import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {import('better-sqlite3').Database} db
 */
const DEFAULT_COUNTERS = [
  ['userId', 1],
  ['serviceId', 1],
  ['queueNum', 1],
  ['entryId', 1],
  ['historyId', 1],
  ['notifId', 1],
];

export function runMigrations(db) {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  db.exec(sql);
  // Existing DBs may still have the old global unique index on name; drop it so soft-deleted
  // services no longer block creating a new service with the same name.
  db.exec(`DROP INDEX IF EXISTS idx_services_name_lower;`);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name_active_lower
    ON services (lower(name)) WHERE active = 1;
  `);
  const ins = db.prepare('INSERT OR IGNORE INTO app_counters (key, value) VALUES (?, ?)');
  for (const [key, value] of DEFAULT_COUNTERS) {
    ins.run(key, value);
  }
}

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
  const ins = db.prepare('INSERT OR IGNORE INTO app_counters (key, value) VALUES (?, ?)');
  for (const [key, value] of DEFAULT_COUNTERS) {
    ins.run(key, value);
  }
}

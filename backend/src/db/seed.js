import bcrypt from 'bcryptjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ seedDemoData?: boolean }} opts
 */
export function seedIfEmpty(db, opts = {}) {
  if (opts.seedDemoData === false) return;
  const n = db.prepare('SELECT COUNT(*) AS c FROM user_credentials').get();
  if (n.c > 0) return;

  const hash = bcrypt.hashSync('password', 10);

  const insertUser = db.prepare(`
    INSERT INTO user_credentials (id, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `);
  const insertProfile = db.prepare(`
    INSERT INTO user_profiles (user_id, full_name, email, contact_info, preferences)
    VALUES (?, ?, ?, NULL, NULL)
  `);
  const insertService = db.prepare(`
    INSERT INTO services (id, name, description, expected_duration_minutes, priority_level, is_open, active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  const insertQueue = db.prepare(`
    INSERT INTO queues (id, service_id, is_open)
    VALUES (?, ?, ?)
  `);
  const insertEntry = db.prepare(`
    INSERT INTO queue_entries (id, queue_id, user_id, service_id, user_name, order_index, joined_at, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting')
  `);
  const insertHistory = db.prepare(`
    INSERT INTO history (id, user_id, service_id, service_name, joined_at, ended_at, outcome)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    insertUser.run('1', 'student@test.com', hash, 'student');
    insertProfile.run('1', 'Alex Student', 'student@test.com');
    insertUser.run('2', 'admin@test.com', hash, 'admin');
    insertProfile.run('2', 'Admin User', 'admin@test.com');
    insertUser.run('3', 'jane@test.com', hash, 'student');
    insertProfile.run('3', 'Jane Doe', 'jane@test.com');

    insertService.run('1', 'Advising', 'Academic advising and course planning.', 15, 'high', 1);
    insertService.run('2', 'Financial Aid', 'Financial aid and scholarship questions.', 20, 'medium', 1);
    insertService.run('3', 'Registrar', 'Transcripts and enrollment verification.', 10, 'low', 0);

    insertQueue.run('queue-1', '1', 1);
    insertQueue.run('queue-2', '2', 1);
    insertQueue.run('queue-3', '3', 0);

    insertEntry.run('q1', 'queue-1', '3', '1', 'Jane Doe', 1, '2025-02-18T10:00:00.000Z', 'high');
    insertEntry.run('q2', 'queue-1', '1', '1', 'Alex Student', 2, '2025-02-18T10:05:00.000Z', 'high');
    insertEntry.run('q3', 'queue-2', '2', '2', 'Admin User', 1, '2025-02-18T09:50:00.000Z', 'medium');

    insertHistory.run('h1', '1', '1', 'Advising', '2025-02-17T14:30:00.000Z', '2025-02-17T14:30:00.000Z', 'Served');
    insertHistory.run('h2', '1', '2', 'Financial Aid', '2025-02-16T11:00:00.000Z', '2025-02-16T11:00:00.000Z', 'Left');
    insertHistory.run('h3', '3', '1', 'Advising', '2025-02-15T09:00:00.000Z', '2025-02-15T09:00:00.000Z', 'Served');

    const upsertCounter = db.prepare(`
      INSERT INTO app_counters (key, value) VALUES (@key, @value)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    upsertCounter.run({ key: 'userId', value: 4 });
    upsertCounter.run({ key: 'serviceId', value: 4 });
    upsertCounter.run({ key: 'queueNum', value: 4 });
    upsertCounter.run({ key: 'entryId', value: 100 });
    upsertCounter.run({ key: 'historyId', value: 100 });
    upsertCounter.run({ key: 'notifId', value: 1 });
  });

  seed();
}

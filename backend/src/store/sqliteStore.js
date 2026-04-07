import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import {
  sortWaitingEntries,
  waitingPosition,
  estimatedWaitMinutesForPosition,
  displayStatus,
} from '../lib/queueLogic.js';

function token() {
  return randomBytes(24).toString('hex');
}

/**
 * @param {import('better-sqlite3').Database} db
 */
function nextCounter(db, key) {
  const row = db.prepare('SELECT value FROM app_counters WHERE key = ?').get(key);
  if (!row) throw new Error(`Missing app counter: ${key}`);
  const n = row.value;
  db.prepare('UPDATE app_counters SET value = value + 1 WHERE key = ?').run(key);
  return n;
}

function rowToService(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    expectedDurationMinutes: row.expected_duration_minutes,
    priorityLevel: row.priority_level,
    isOpen: Boolean(row.is_open),
  };
}

function rowToEntry(row) {
  return {
    id: row.id,
    queueId: row.queue_id,
    userId: row.user_id,
    userName: row.user_name,
    serviceId: row.service_id,
    joinedAt: row.joined_at,
    priority: row.priority,
    status: row.status,
    orderIndex: row.order_index,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function createSqliteStore(db) {
  const selUserByEmail = db.prepare(`
    SELECT u.id, u.email, u.password_hash, u.role, p.full_name AS name
    FROM user_credentials u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.email = ?
  `);
  const selUserById = db.prepare(`
    SELECT u.id, u.email, u.password_hash, u.role, p.full_name AS name
    FROM user_credentials u
    JOIN user_profiles p ON p.user_id = u.id
    WHERE u.id = ?
  `);
  const selServices = db.prepare(`
    SELECT id, name, description, expected_duration_minutes, priority_level, is_open
    FROM services WHERE active = 1 ORDER BY id
  `);
  const selServiceById = db.prepare(`
    SELECT id, name, description, expected_duration_minutes, priority_level, is_open
    FROM services WHERE id = ? AND active = 1
  `);
  const selQueueByService = db.prepare(`SELECT id, service_id, is_open, created_at FROM queues WHERE service_id = ?`);
  const selQueues = db.prepare(`SELECT id, service_id, is_open FROM queues ORDER BY service_id`);
  const selWaitingEntriesForService = db.prepare(`
    SELECT id, queue_id, user_id, service_id, user_name, order_index, joined_at, priority, status
    FROM queue_entries WHERE service_id = ? AND status = 'waiting'
  `);
  const selEntryById = db.prepare(`
    SELECT id, queue_id, user_id, service_id, user_name, order_index, joined_at, priority, status
    FROM queue_entries WHERE id = ?
  `);
  const insSession = db.prepare(`INSERT INTO sessions (token, user_id) VALUES (?, ?)`);
  const delSession = db.prepare(`DELETE FROM sessions WHERE token = ?`);
  const selSessionUser = db.prepare(`
    SELECT u.id, u.email, u.role, p.full_name AS name
    FROM sessions s
    JOIN user_credentials u ON u.id = s.user_id
    JOIN user_profiles p ON p.user_id = u.id
    WHERE s.token = ?
  `);

  const store = {
    toPublicUser(u) {
      if (!u) return null;
      const { password_hash: _p, ...rest } = u;
      return rest;
    },

    findUserByEmail(email) {
      const e = email.trim();
      return selUserByEmail.get(e) ?? null;
    },

    findUserById(id) {
      return selUserById.get(id) ?? null;
    },

    register({ email, password, name, role: roleIn }) {
      const em = email.trim();
      const role = roleIn === 'admin' ? 'admin' : 'student';
      if (store.findUserByEmail(em)) {
        return { error: { status: 409, message: 'Email already registered' } };
      }
      const passwordHash = bcrypt.hashSync(password, 10);
      const insertCred = db.prepare(`
        INSERT INTO user_credentials (id, email, password_hash, role) VALUES (?, ?, ?, ?)
      `);
      const insertProf = db.prepare(`
        INSERT INTO user_profiles (user_id, full_name, email, contact_info, preferences)
        VALUES (?, ?, ?, NULL, NULL)
      `);
      let newId;
      try {
        db.transaction(() => {
          newId = String(nextCounter(db, 'userId'));
          insertCred.run(newId, em, passwordHash, role);
          insertProf.run(newId, name, em);
        })();
      } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return { error: { status: 409, message: 'Email already registered' } };
        }
        throw e;
      }
      const user = store.findUserById(newId);
      const tok = store.createSession(user.id);
      return { user: store.toPublicUser(user), token: tok };
    },

    login({ email, password }) {
      const user = store.findUserByEmail(email.trim());
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return { error: { status: 401, message: 'Invalid credentials' } };
      }
      const tok = store.createSession(user.id);
      return { user: store.toPublicUser(user), token: tok };
    },

    createSession(userId) {
      const tok = token();
      insSession.run(tok, userId);
      return tok;
    },

    deleteSession(tok) {
      delSession.run(tok);
    },

    getUserIdForToken(tok) {
      const row = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(tok);
      return row?.user_id ?? null;
    },

    getSessionUser(authHeader) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
      const t = authHeader.slice(7).trim();
      return selSessionUser.get(t) ?? null;
    },

    listServices() {
      const rows = selServices.all();
      return rows.map((row) => {
        const s = rowToService(row);
        const waiting = selWaitingEntriesForService.all(s.id);
        const n = waiting.length;
        return {
          ...s,
          estimatedWaitMinutes: estimatedWaitMinutesForPosition(n + 1, s.expectedDurationMinutes),
        };
      });
    },

    getService(id) {
      return rowToService(selServiceById.get(id));
    },

    serviceNameTaken(name, excludeId) {
      const n = name.trim().toLowerCase();
      if (excludeId) {
        const row = db
          .prepare(
            `SELECT id FROM services WHERE active = 1 AND lower(trim(name)) = ? AND id != ?`
          )
          .get(n, excludeId);
        return Boolean(row);
      }
      const row = db
        .prepare(`SELECT id FROM services WHERE active = 1 AND lower(trim(name)) = ?`)
        .get(n);
      return Boolean(row);
    },

    createService({ name, description, expectedDurationMinutes, priorityLevel }) {
      if (store.serviceNameTaken(name, null)) {
        return { error: { status: 409, message: 'A service with this name already exists' } };
      }
      const id = String(nextCounter(db, 'serviceId'));
      const qNum = nextCounter(db, 'queueNum');
      const qId = `queue-${qNum}`;
      const insertSvc = db.prepare(`
        INSERT INTO services (id, name, description, expected_duration_minutes, priority_level, is_open, active)
        VALUES (?, ?, ?, ?, ?, 0, 1)
      `);
      const insertQ = db.prepare(`INSERT INTO queues (id, service_id, is_open) VALUES (?, ?, 0)`);
      const run = db.transaction(() => {
        insertSvc.run(id, name.trim(), description.trim(), expectedDurationMinutes, priorityLevel);
        insertQ.run(qId, id);
      });
      run();
      return { service: store.getService(id) };
    },

    updateService(id, patch) {
      const cur = store.getService(id);
      if (!cur) return { error: { status: 404, message: 'Service not found' } };
      if (patch.name != null && store.serviceNameTaken(patch.name, id)) {
        return { error: { status: 409, message: 'A service with this name already exists' } };
      }
      const next = {
        ...cur,
        ...(patch.name != null ? { name: patch.name.trim() } : {}),
        ...(patch.description != null ? { description: patch.description.trim() } : {}),
        ...(patch.expectedDurationMinutes != null ? { expectedDurationMinutes: patch.expectedDurationMinutes } : {}),
        ...(patch.priorityLevel != null ? { priorityLevel: patch.priorityLevel } : {}),
      };
      db.prepare(
        `
        UPDATE services SET
          name = ?,
          description = ?,
          expected_duration_minutes = ?,
          priority_level = ?
        WHERE id = ? AND active = 1
      `
      ).run(next.name, next.description, next.expectedDurationMinutes, next.priorityLevel, id);
      return { service: store.getService(id) };
    },

    deleteService(id) {
      const cur = store.getService(id);
      if (!cur) return { error: { status: 404, message: 'Service not found' } };
      const waiting = db
        .prepare(`SELECT 1 FROM queue_entries WHERE service_id = ? AND status = 'waiting' LIMIT 1`)
        .get(id);
      if (waiting) {
        return { error: { status: 409, message: 'Cannot delete service while users are waiting' } };
      }
      db.prepare(`UPDATE services SET active = 0 WHERE id = ?`).run(id);
      db.prepare(`DELETE FROM queues WHERE service_id = ?`).run(id);
      db.prepare(`DELETE FROM queue_entries WHERE service_id = ?`).run(id);
      return { ok: true };
    },

    getQueueByServiceId(serviceId) {
      const row = selQueueByService.get(serviceId);
      if (!row) return null;
      return { id: row.id, serviceId: row.service_id, isOpen: Boolean(row.is_open) };
    },

    listQueues() {
      return selQueues.all().map((q) => {
        const svc = store.getService(q.service_id);
        return {
          id: q.id,
          serviceId: q.service_id,
          serviceName: svc?.name,
          isOpen: Boolean(q.is_open),
        };
      });
    },

    setServiceOpen(serviceId, isOpen) {
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      const v = isOpen ? 1 : 0;
      db.prepare(`UPDATE services SET is_open = ? WHERE id = ?`).run(v, serviceId);
      db.prepare(`UPDATE queues SET is_open = ? WHERE service_id = ?`).run(v, serviceId);
      return { service: store.listServices().find((s) => s.id === serviceId) };
    },

    waitingForService(serviceId) {
      const rows = selWaitingEntriesForService.all(serviceId);
      return sortWaitingEntries(rows.map(rowToEntry));
    },

    enrichEntry(entry, serviceId) {
      const sorted = store.waitingForService(serviceId);
      const st = displayStatus(sorted, entry.userId);
      return { ...entry, status: st ?? entry.status };
    },

    joinQueue(serviceId, userId, userName) {
      const uid = String(userId);
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      if (!service.isOpen) return { error: { status: 409, message: 'Queue is closed' } };
      const existing = db
        .prepare(
          `SELECT 1 FROM queue_entries WHERE service_id = ? AND user_id = ? AND status = 'waiting' LIMIT 1`
        )
        .get(serviceId, uid);
      if (existing) return { error: { status: 400, message: 'Already in queue for this service' } };
      const q = store.getQueueByServiceId(serviceId);
      if (!q || !q.isOpen) return { error: { status: 409, message: 'Queue is closed' } };

      const sameQueue = db
        .prepare(
          `SELECT MAX(order_index) AS m FROM queue_entries WHERE queue_id = ? AND status = 'waiting'`
        )
        .get(q.id);
      const maxOrder = sameQueue?.m ?? 0;
      const entryId = `qe-${nextCounter(db, 'entryId')}`;
      const entry = {
        id: entryId,
        queueId: q.id,
        userId: uid,
        userName,
        serviceId,
        joinedAt: new Date().toISOString(),
        priority: service.priorityLevel,
        status: 'waiting',
        orderIndex: maxOrder + 1,
      };
      db.prepare(`
        INSERT INTO queue_entries (id, queue_id, user_id, service_id, user_name, order_index, joined_at, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting')
      `).run(
        entry.id,
        entry.queueId,
        entry.userId,
        entry.serviceId,
        entry.userName,
        entry.orderIndex,
        entry.joinedAt,
        entry.priority
      );
      store.addNotification(uid, 'joined_queue', `You joined the queue for ${service.name}`, serviceId);
      store.notifyAfterJoin(serviceId, uid);
      const sorted = store.waitingForService(serviceId);
      const position = waitingPosition(sorted, uid);
      const est = estimatedWaitMinutesForPosition(position, service.expectedDurationMinutes);
      const enriched = store.enrichEntry(entry, serviceId);
      return { queueEntry: enriched, position, estimatedWaitMinutes: est, serviceName: service.name };
    },

    leaveQueueByEntryId(entryId, userId, isAdmin) {
      const row = selEntryById.get(entryId);
      if (!row) return { error: { status: 404, message: 'Queue entry not found' } };
      const entry = rowToEntry(row);
      if (entry.status !== 'waiting') return { error: { status: 400, message: 'Entry is not active' } };
      if (!isAdmin && entry.userId !== userId) return { error: { status: 403, message: 'Forbidden' } };
      const svcRow = store.getService(entry.serviceId);
      db.prepare(`DELETE FROM queue_entries WHERE id = ?`).run(entryId);
      store.appendHistory({
        userId: entry.userId,
        serviceId: entry.serviceId,
        serviceName: svcRow?.name ?? 'Service',
        outcome: 'Left',
      });
      if (isAdmin && (userId === '' || userId !== entry.userId)) {
        store.addNotification(
          entry.userId,
          'removed',
          'You were removed from the queue by staff',
          entry.serviceId
        );
      }
      store.notifyHeadPromotion(entry.serviceId);
      return { ok: true };
    },

    listQueueEntries(serviceId) {
      const sorted = store.waitingForService(serviceId);
      return sorted.map((e) => store.enrichEntry(e, serviceId));
    },

    serveNext(serviceId) {
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      const sorted = store.waitingForService(serviceId);
      if (sorted.length === 0) return { error: { status: 409, message: 'Queue is empty' } };
      const entry = sorted[0];
      db.prepare(`DELETE FROM queue_entries WHERE id = ?`).run(entry.id);
      store.appendHistory({
        userId: entry.userId,
        serviceId,
        serviceName: service.name,
        outcome: 'Served',
      });
      store.addNotification(entry.userId, 'served', `You were served at ${service.name}`, serviceId);
      store.notifyHeadPromotion(serviceId);
      return { served: { ...entry, status: 'served' } };
    },

    reorderQueue(serviceId, orderedEntryIds) {
      const waiting = store.waitingForService(serviceId);
      const ids = new Set(waiting.map((e) => e.id));
      if (orderedEntryIds.length !== waiting.length) {
        return { error: { status: 400, message: 'Invalid order length' } };
      }
      for (const id of orderedEntryIds) {
        if (!ids.has(id)) return { error: { status: 400, message: 'Unknown entry in order' } };
      }
      const upd = db.prepare(`UPDATE queue_entries SET order_index = ? WHERE id = ?`);
      const run = db.transaction(() => {
        orderedEntryIds.forEach((id, i) => {
          upd.run(i + 1, id);
        });
      });
      run();
      store.notifyHeadPromotion(serviceId);
      return { ok: true };
    },

    getMyQueueStatus(serviceId, userId) {
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      const row = db
        .prepare(
          `SELECT id, queue_id, user_id, service_id, user_name, order_index, joined_at, priority, status
           FROM queue_entries WHERE service_id = ? AND user_id = ? AND status = 'waiting'`
        )
        .get(serviceId, userId);
      if (!row) return { entry: null, position: null, estimatedWaitMinutes: null };
      const entry = rowToEntry(row);
      const sorted = store.waitingForService(serviceId);
      const position = waitingPosition(sorted, userId);
      const est = estimatedWaitMinutesForPosition(position, service.expectedDurationMinutes);
      return {
        entry: store.enrichEntry(entry, serviceId),
        position,
        estimatedWaitMinutes: est,
        service,
      };
    },

    activeQueuesForUser(userId) {
      const rows = db
        .prepare(
          `SELECT id, queue_id, user_id, service_id, user_name, order_index, joined_at, priority, status
           FROM queue_entries WHERE user_id = ? AND status = 'waiting' ORDER BY joined_at ASC`
        )
        .all(userId);
      return rows
        .map((row) => {
          const entry = rowToEntry(row);
          const service = store.getService(entry.serviceId);
          if (!service) return null;
          const sorted = store.waitingForService(entry.serviceId);
          const position = waitingPosition(sorted, userId);
          const est = estimatedWaitMinutesForPosition(position, service.expectedDurationMinutes);
          return {
            service: store.listServices().find((s) => s.id === service.id) ?? service,
            entry: store.enrichEntry(entry, entry.serviceId),
            position,
            estimatedWaitMinutes: est,
          };
        })
        .filter(Boolean);
    },

    /** @deprecated Prefer activeQueuesForUser; returns the first waiting queue only. */
    activeQueueForUser(userId) {
      const list = store.activeQueuesForUser(userId);
      return list[0] ?? null;
    },

    appendHistory({ userId, serviceId, serviceName, outcome }) {
      const id = `h-${nextCounter(db, 'historyId')}`;
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO history (id, user_id, service_id, service_name, joined_at, ended_at, outcome)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, serviceId, serviceName, now, now, outcome);
    },

    listHistory(userId) {
      const rows = db
        .prepare(
          `SELECT id, user_id, service_id, service_name, joined_at, ended_at, outcome
           FROM history WHERE user_id = ? ORDER BY ended_at DESC`
        )
        .all(userId);
      return rows.map((h) => ({
        id: h.id,
        userId: h.user_id,
        serviceId: h.service_id,
        serviceName: h.service_name,
        date: h.ended_at,
        outcome: h.outcome,
      }));
    },

    listNotifications(userId) {
      const rows = db
        .prepare(
          `SELECT id, user_id, type, message, service_id, created_at, read
           FROM notifications WHERE user_id = ?
           ORDER BY datetime(created_at) DESC, rowid DESC`
        )
        .all(userId);
      return rows.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        serviceId: n.service_id,
        timestamp: n.created_at,
        read: Boolean(n.read),
      }));
    },

    markNotificationRead(userId, notifId) {
      const r = db
        .prepare(`UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?`)
        .run(notifId, userId);
      if (r.changes === 0) return { error: { status: 404, message: 'Notification not found' } };
      return { ok: true };
    },

    addNotification(userId, type, message, serviceId = null) {
      const id = `n-${nextCounter(db, 'notifId')}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, message, service_id, created_at, read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).run(id, userId, type, message, serviceId, new Date().toISOString());
    },

    notifyAfterJoin(serviceId, userId) {
      const sorted = store.waitingForService(serviceId);
      const pos = waitingPosition(sorted, userId);
      if (pos === 1) {
        store.addNotification(userId, 'your_turn', 'You are first in line — please stay nearby', serviceId);
      } else if (pos === 2) {
        store.addNotification(userId, 'almost_ready', 'You are almost at the front of the line', serviceId);
      }
    },

    notifyHeadPromotion(serviceId) {
      const sorted = store.waitingForService(serviceId);
      const head = sorted[0];
      if (head) {
        store.addNotification(
          head.userId,
          'your_turn',
          'You are now first in line — get ready to be served',
          serviceId
        );
      }
      const second = sorted[1];
      if (second) {
        store.addNotification(second.userId, 'almost_ready', 'You are next in line', serviceId);
      }
    },

    /** Close the database connection (useful for file-based tests and graceful shutdown). */
    close() {
      db.close();
    },
  };

  return store;
}

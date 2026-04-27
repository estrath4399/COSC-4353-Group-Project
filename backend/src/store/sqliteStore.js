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

function inDateRangeSql(column, from, to) {
  const clauses = [];
  const args = [];
  if (from) {
    clauses.push(`datetime(${column}) >= datetime(?)`);
    args.push(from);
  }
  if (to) {
    clauses.push(`datetime(${column}) <= datetime(?)`);
    args.push(to);
  }
  if (clauses.length === 0) return { sql: '1 = 1', args };
  return { sql: clauses.join(' AND '), args };
}

function csvCell(value) {
  if (value == null) return '';
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const SMART_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'your',
  'you',
  'are',
  'now',
  'can',
  'not',
  'into',
  'about',
  'help',
  'questions',
  'question',
  'service',
  'services',
  'student',
  'students',
]);

function tokenizeSmartText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !SMART_STOP_WORDS.has(word));
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function serviceSimilarityScore(a, b) {
  const aTokens = tokenizeSmartText(`${a.name} ${a.description}`);
  const bTokens = tokenizeSmartText(`${b.name} ${b.description}`);
  return jaccardSimilarity(aTokens, bTokens);
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

    getSmartQueueRecommendation(serviceId) {
      const currentService = store.getService(serviceId);
      if (!currentService) return { error: { status: 404, message: 'Service not found' } };

      const services = store.listServices().filter((s) => s.isOpen);
      const ranked = services
        .map((service) => {
          const waitingCount = store.waitingForService(service.id).length;
          return {
            serviceId: service.id,
            serviceName: service.name,
            estimatedWaitMinutes: estimatedWaitMinutesForPosition(
              waitingCount + 1,
              service.expectedDurationMinutes
            ),
            queueLength: waitingCount,
          };
        })
        .sort((a, b) => a.estimatedWaitMinutes - b.estimatedWaitMinutes);

      const current = ranked.find((item) => item.serviceId === serviceId) ?? {
        serviceId: currentService.id,
        serviceName: currentService.name,
        estimatedWaitMinutes: estimatedWaitMinutesForPosition(
          store.waitingForService(currentService.id).length + 1,
          currentService.expectedDurationMinutes
        ),
        queueLength: store.waitingForService(currentService.id).length,
      };

      const alternatives = ranked
        .filter((item) => item.serviceId !== serviceId)
        .map((item) => ({
          ...item,
          similarityScore: serviceSimilarityScore(
            currentService,
            services.find((s) => s.id === item.serviceId)
          ),
        }))
        .filter((item) => item.similarityScore >= 0.2);

      const alternative = alternatives.find(
        (item) => item.estimatedWaitMinutes < current.estimatedWaitMinutes
      );

      return {
        currentService: current,
        recommendation: alternative
          ? {
              type: 'alternative_service',
              message: `Try ${alternative.serviceName} to reduce your wait by ${current.estimatedWaitMinutes - alternative.estimatedWaitMinutes} minutes for a similar request.`,
              alternativeService: alternative,
            }
          : {
              type: 'stay_put',
              message:
                'Stay with this service. No clearly related service currently offers a better wait.',
              alternativeService: null,
            },
      };
    },

    getAdminReportOverview({ serviceId, from, to } = {}) {
      const validService = serviceId ? store.getService(serviceId) : null;
      if (serviceId && !validService) {
        return {
          generatedAt: new Date().toISOString(),
          filters: { serviceId, from: from ?? null, to: to ?? null },
          summary: { totalUsers: 0, totalHistoryRecords: 0, totalServed: 0, averageWaitMinutes: 0 },
          users: [],
          services: [],
        };
      }

      const historyDate = inDateRangeSql('h.ended_at', from, to);
      const serviceClause = serviceId ? ' AND h.service_id = ? ' : '';
      const userRows = db
        .prepare(
          `SELECT h.user_id, p.full_name AS user_name, h.service_id, h.service_name, h.joined_at, h.ended_at, h.outcome
           FROM history h
           JOIN user_profiles p ON p.user_id = h.user_id
           WHERE ${historyDate.sql} ${serviceClause}
           ORDER BY datetime(h.ended_at) DESC`
        )
        .all(...historyDate.args, ...(serviceId ? [serviceId] : []));

      const usersMap = new Map();
      for (const row of userRows) {
        if (!usersMap.has(row.user_id)) {
          usersMap.set(row.user_id, {
            userId: row.user_id,
            userName: row.user_name,
            participationCount: 0,
            history: [],
          });
        }
        const bucket = usersMap.get(row.user_id);
        bucket.participationCount += 1;
        bucket.history.push({
          serviceId: row.service_id,
          serviceName: row.service_name,
          joinedAt: row.joined_at,
          endedAt: row.ended_at,
          outcome: row.outcome,
        });
      }

      const queueDate = inDateRangeSql('h.ended_at', from, to);
      const serviceRows = db
        .prepare(
          `SELECT s.id, s.name,
                  SUM(CASE WHEN h.outcome = 'Served' THEN 1 ELSE 0 END) AS served_count,
                  COUNT(h.id) AS participation_count
           FROM services s
           LEFT JOIN history h ON h.service_id = s.id AND ${queueDate.sql}
           WHERE s.active = 1 ${serviceId ? ' AND s.id = ?' : ''}
           GROUP BY s.id, s.name
           ORDER BY s.name`
        )
        .all(...queueDate.args, ...(serviceId ? [serviceId] : []));

      const services = serviceRows.map((row) => {
        const liveQueue = store.waitingForService(row.id).length;
        const averageWaitMinutes = Math.round((liveQueue * (store.getService(row.id)?.expectedDurationMinutes ?? 0)) / 2);
        return {
          serviceId: row.id,
          serviceName: row.name,
          usersServed: Number(row.served_count ?? 0),
          totalParticipation: Number(row.participation_count ?? 0),
          currentQueueLength: liveQueue,
          averageWaitMinutes,
        };
      });

      const servedCount = services.reduce((sum, s) => sum + s.usersServed, 0);
      const averageWaitAcrossServices =
        services.length > 0
          ? Math.round(services.reduce((sum, s) => sum + s.averageWaitMinutes, 0) / services.length)
          : 0;

      return {
        generatedAt: new Date().toISOString(),
        filters: { serviceId: serviceId ?? null, from: from ?? null, to: to ?? null },
        summary: {
          totalUsers: usersMap.size,
          totalHistoryRecords: userRows.length,
          totalServed: servedCount,
          averageWaitMinutes: averageWaitAcrossServices,
        },
        users: Array.from(usersMap.values()),
        services,
      };
    },

    getAdminReportOverviewCsv({ serviceId, from, to } = {}) {
      const report = store.getAdminReportOverview({ serviceId, from, to });
      const lines = [];
      lines.push('section,key,value');
      lines.push(`summary,totalUsers,${report.summary.totalUsers}`);
      lines.push(`summary,totalHistoryRecords,${report.summary.totalHistoryRecords}`);
      lines.push(`summary,totalServed,${report.summary.totalServed}`);
      lines.push(`summary,averageWaitMinutes,${report.summary.averageWaitMinutes}`);
      lines.push('');
      lines.push('services,serviceId,serviceName,usersServed,totalParticipation,currentQueueLength,averageWaitMinutes');
      for (const service of report.services) {
        lines.push(
          [
            'services',
            csvCell(service.serviceId),
            csvCell(service.serviceName),
            service.usersServed,
            service.totalParticipation,
            service.currentQueueLength,
            service.averageWaitMinutes,
          ].join(',')
        );
      }
      lines.push('');
      lines.push('userHistory,userId,userName,serviceId,serviceName,joinedAt,endedAt,outcome');
      for (const user of report.users) {
        for (const item of user.history) {
          lines.push(
            [
              'userHistory',
              csvCell(user.userId),
              csvCell(user.userName),
              csvCell(item.serviceId),
              csvCell(item.serviceName),
              csvCell(item.joinedAt),
              csvCell(item.endedAt),
              csvCell(item.outcome),
            ].join(',')
          );
        }
      }
      return `${lines.join('\n')}\n`;
    },

    /** Close the database connection (useful for file-based tests and graceful shutdown). */
    close() {
      db.close();
    },
  };

  return store;
}

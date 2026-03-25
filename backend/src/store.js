import { randomBytes } from 'crypto';
import {
  sortWaitingEntries,
  waitingPosition,
  estimatedWaitMinutesForPosition,
  displayStatus,
} from './lib/queueLogic.js';

function token() {
  return randomBytes(24).toString('hex');
}

const INITIAL = {
  users: [
    { id: '1', email: 'student@test.com', password: 'password', name: 'Alex Student', role: 'student' },
    { id: '2', email: 'admin@test.com', password: 'password', name: 'Admin User', role: 'admin' },
    { id: '3', email: 'jane@test.com', password: 'password', name: 'Jane Doe', role: 'student' },
  ],
  services: [
    {
      id: '1',
      name: 'Advising',
      description: 'Academic advising and course planning.',
      expectedDurationMinutes: 15,
      priorityLevel: 'high',
      isOpen: true,
    },
    {
      id: '2',
      name: 'Financial Aid',
      description: 'Financial aid and scholarship questions.',
      expectedDurationMinutes: 20,
      priorityLevel: 'medium',
      isOpen: true,
    },
    {
      id: '3',
      name: 'Registrar',
      description: 'Transcripts and enrollment verification.',
      expectedDurationMinutes: 10,
      priorityLevel: 'low',
      isOpen: false,
    },
  ],
  queues: [
    { id: 'queue-1', serviceId: '1', isOpen: true },
    { id: 'queue-2', serviceId: '2', isOpen: true },
    { id: 'queue-3', serviceId: '3', isOpen: false },
  ],
  queueEntries: [
    {
      id: 'q1',
      queueId: 'queue-1',
      userId: '3',
      userName: 'Jane Doe',
      serviceId: '1',
      joinedAt: '2025-02-18T10:00:00.000Z',
      priority: 'high',
      status: 'waiting',
      orderIndex: 1,
    },
    {
      id: 'q2',
      queueId: 'queue-1',
      userId: '1',
      userName: 'Alex Student',
      serviceId: '1',
      joinedAt: '2025-02-18T10:05:00.000Z',
      priority: 'high',
      status: 'waiting',
      orderIndex: 2,
    },
    {
      id: 'q3',
      queueId: 'queue-2',
      userId: '2',
      userName: 'Admin User',
      serviceId: '2',
      joinedAt: '2025-02-18T09:50:00.000Z',
      priority: 'medium',
      status: 'waiting',
      orderIndex: 1,
    },
  ],
  history: [
    {
      id: 'h1',
      userId: '1',
      serviceId: '1',
      serviceName: 'Advising',
      joinedAt: '2025-02-17T14:30:00.000Z',
      endedAt: '2025-02-17T14:30:00.000Z',
      outcome: 'Served',
    },
    {
      id: 'h2',
      userId: '1',
      serviceId: '2',
      serviceName: 'Financial Aid',
      joinedAt: '2025-02-16T11:00:00.000Z',
      endedAt: '2025-02-16T11:00:00.000Z',
      outcome: 'Left',
    },
    {
      id: 'h3',
      userId: '3',
      serviceId: '1',
      serviceName: 'Advising',
      joinedAt: '2025-02-15T09:00:00.000Z',
      endedAt: '2025-02-15T09:00:00.000Z',
      outcome: 'Served',
    },
  ],
  notifications: [],
};

export function createStore(initial = structuredClone(INITIAL)) {
  let nextUserId = 4;
  let nextServiceId = 4;
  let nextQueueId = 4;
  let nextEntryId = 100;
  let nextHistoryId = 100;
  let nextNotifId = 1;

  const sessions = new Map();

  const store = {
    _data: initial,
    _sessions: sessions,

    toPublicUser(u) {
      if (!u) return null;
      const { password: _p, ...rest } = u;
      return rest;
    },

    findUserByEmail(email) {
      const e = email.trim().toLowerCase();
      return store._data.users.find((u) => u.email.toLowerCase() === e) ?? null;
    },

    findUserById(id) {
      return store._data.users.find((u) => u.id === id) ?? null;
    },

    register({ email, password, name }) {
      if (store.findUserByEmail(email)) return { error: { status: 409, message: 'Email already registered' } };
      const id = String(nextUserId++);
      const user = { id, email, password, name, role: 'student' };
      store._data.users.push(user);
      const tok = store.createSession(user.id);
      return { user: store.toPublicUser(user), token: tok };
    },

    login({ email, password }) {
      const user = store.findUserByEmail(email);
      if (!user || user.password !== password) return { error: { status: 401, message: 'Invalid credentials' } };
      const tok = store.createSession(user.id);
      return { user: store.toPublicUser(user), token: tok };
    },

    createSession(userId) {
      const tok = token();
      sessions.set(tok, userId);
      return tok;
    },

    deleteSession(tok) {
      sessions.delete(tok);
    },

    getUserIdForToken(tok) {
      return sessions.get(tok) ?? null;
    },

    getSessionUser(authHeader) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
      const t = authHeader.slice(7).trim();
      const userId = sessions.get(t);
      if (!userId) return null;
      return store.findUserById(userId);
    },

    listServices() {
      return store._data.services.map((s) => {
        const waiting = store._data.queueEntries.filter((e) => e.serviceId === s.id && e.status === 'waiting');
        const n = waiting.length;
        return {
          ...s,
          estimatedWaitMinutes: n * s.expectedDurationMinutes,
        };
      });
    },

    getService(id) {
      return store._data.services.find((s) => s.id === id) ?? null;
    },

    serviceNameTaken(name, excludeId) {
      const n = name.trim().toLowerCase();
      return store._data.services.some((s) => s.id !== excludeId && s.name.trim().toLowerCase() === n);
    },

    createService({ name, description, expectedDurationMinutes, priorityLevel }) {
      if (store.serviceNameTaken(name, null)) {
        return { error: { status: 409, message: 'A service with this name already exists' } };
      }
      const id = String(nextServiceId++);
      const service = {
        id,
        name: name.trim(),
        description: description.trim(),
        expectedDurationMinutes,
        priorityLevel,
        isOpen: false,
      };
      store._data.services.push(service);
      const qId = `queue-${nextQueueId++}`;
      store._data.queues.push({ id: qId, serviceId: id, isOpen: false });
      return { service };
    },

    updateService(id, patch) {
      const idx = store._data.services.findIndex((s) => s.id === id);
      if (idx === -1) return { error: { status: 404, message: 'Service not found' } };
      if (patch.name != null && store.serviceNameTaken(patch.name, id)) {
        return { error: { status: 409, message: 'A service with this name already exists' } };
      }
      const cur = store._data.services[idx];
      const next = {
        ...cur,
        ...(patch.name != null ? { name: patch.name.trim() } : {}),
        ...(patch.description != null ? { description: patch.description.trim() } : {}),
        ...(patch.expectedDurationMinutes != null ? { expectedDurationMinutes: patch.expectedDurationMinutes } : {}),
        ...(patch.priorityLevel != null ? { priorityLevel: patch.priorityLevel } : {}),
      };
      store._data.services[idx] = next;
      return { service: next };
    },

    deleteService(id) {
      const idx = store._data.services.findIndex((s) => s.id === id);
      if (idx === -1) return { error: { status: 404, message: 'Service not found' } };
      const waiting = store._data.queueEntries.some((e) => e.serviceId === id && e.status === 'waiting');
      if (waiting) return { error: { status: 409, message: 'Cannot delete service while users are waiting' } };
      store._data.services.splice(idx, 1);
      store._data.queues = store._data.queues.filter((q) => q.serviceId !== id);
      store._data.queueEntries = store._data.queueEntries.filter((e) => e.serviceId !== id);
      return { ok: true };
    },

    getQueueByServiceId(serviceId) {
      return store._data.queues.find((q) => q.serviceId === serviceId) ?? null;
    },

    listQueues() {
      return store._data.queues.map((q) => {
        const svc = store.getService(q.serviceId);
        return {
          id: q.id,
          serviceId: q.serviceId,
          serviceName: svc?.name,
          isOpen: q.isOpen,
        };
      });
    },

    setServiceOpen(serviceId, isOpen) {
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      service.isOpen = isOpen;
      const q = store.getQueueByServiceId(serviceId);
      if (q) q.isOpen = isOpen;
      return { service: store.listServices().find((s) => s.id === serviceId) };
    },

    waitingForService(serviceId) {
      return sortWaitingEntries(store._data.queueEntries.filter((e) => e.serviceId === serviceId));
    },

    enrichEntry(entry, serviceId) {
      const sorted = store.waitingForService(serviceId);
      const st = displayStatus(sorted, entry.userId);
      return { ...entry, status: st ?? entry.status };
    },

    joinQueue(serviceId, userId, userName) {
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      if (!service.isOpen) return { error: { status: 409, message: 'Queue is closed' } };
      const existing = store._data.queueEntries.find(
        (e) => e.serviceId === serviceId && e.userId === userId && e.status === 'waiting'
      );
      if (existing) return { error: { status: 400, message: 'Already in queue for this service' } };
      const q = store.getQueueByServiceId(serviceId);
      if (!q || !q.isOpen) return { error: { status: 409, message: 'Queue is closed' } };

      const sameQueue = store._data.queueEntries.filter((e) => e.queueId === q.id && e.status === 'waiting');
      const maxOrder = sameQueue.reduce((m, e) => Math.max(m, e.orderIndex), 0);
      const entry = {
        id: `qe-${nextEntryId++}`,
        queueId: q.id,
        userId,
        userName,
        serviceId,
        joinedAt: new Date().toISOString(),
        priority: service.priorityLevel,
        status: 'waiting',
        orderIndex: maxOrder + 1,
      };
      store._data.queueEntries.push(entry);
      store.addNotification(userId, 'joined_queue', `You joined the queue for ${service.name}`, serviceId);
      store.notifyAfterJoin(serviceId, userId);
      const sorted = store.waitingForService(serviceId);
      const position = waitingPosition(sorted, userId);
      const est = estimatedWaitMinutesForPosition(position, service.expectedDurationMinutes);
      const enriched = store.enrichEntry(entry, serviceId);
      return { queueEntry: enriched, position, estimatedWaitMinutes: est, serviceName: service.name };
    },

    leaveQueueByEntryId(entryId, userId, isAdmin) {
      const idx = store._data.queueEntries.findIndex((e) => e.id === entryId);
      if (idx === -1) return { error: { status: 404, message: 'Queue entry not found' } };
      const entry = store._data.queueEntries[idx];
      if (entry.status !== 'waiting') return { error: { status: 400, message: 'Entry is not active' } };
      if (!isAdmin && entry.userId !== userId) return { error: { status: 403, message: 'Forbidden' } };
      const service = store.getService(entry.serviceId);
      store._data.queueEntries.splice(idx, 1);
      store.appendHistory({
        userId: entry.userId,
        serviceId: entry.serviceId,
        serviceName: service?.name ?? 'Service',
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
      const idx = store._data.queueEntries.findIndex((e) => e.id === entry.id);
      store._data.queueEntries.splice(idx, 1);
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
      if (orderedEntryIds.length !== waiting.length) return { error: { status: 400, message: 'Invalid order length' } };
      for (const id of orderedEntryIds) {
        if (!ids.has(id)) return { error: { status: 400, message: 'Unknown entry in order' } };
      }
      orderedEntryIds.forEach((id, i) => {
        const e = store._data.queueEntries.find((x) => x.id === id);
        if (e) e.orderIndex = i + 1;
      });
      store.notifyHeadPromotion(serviceId);
      return { ok: true };
    },

    getMyQueueStatus(serviceId, userId) {
      const service = store.getService(serviceId);
      if (!service) return { error: { status: 404, message: 'Service not found' } };
      const entry = store._data.queueEntries.find(
        (e) => e.serviceId === serviceId && e.userId === userId && e.status === 'waiting'
      );
      if (!entry) return { entry: null, position: null, estimatedWaitMinutes: null };
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

    activeQueueForUser(userId) {
      const entry = store._data.queueEntries.find((e) => e.userId === userId && e.status === 'waiting');
      if (!entry) return null;
      const service = store.getService(entry.serviceId);
      if (!service) return null;
      const sorted = store.waitingForService(entry.serviceId);
      const position = waitingPosition(sorted, userId);
      return { service: store.listServices().find((s) => s.id === service.id) ?? service, entry: store.enrichEntry(entry, entry.serviceId), position };
    },

    appendHistory({ userId, serviceId, serviceName, outcome }) {
      const id = `h-${nextHistoryId++}`;
      const now = new Date().toISOString();
      store._data.history.push({
        id,
        userId,
        serviceId,
        serviceName,
        joinedAt: now,
        endedAt: now,
        outcome,
      });
    },

    listHistory(userId) {
      return [...store._data.history]
        .filter((h) => h.userId === userId)
        .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))
        .map((h) => ({
          id: h.id,
          userId: h.userId,
          serviceId: h.serviceId,
          serviceName: h.serviceName,
          date: h.endedAt,
          outcome: h.outcome,
        }));
    },

    listNotifications(userId) {
      return store._data.notifications
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map((n) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          serviceId: n.serviceId,
          timestamp: n.timestamp,
          read: n.read,
        }));
    },

    markNotificationRead(userId, notifId) {
      const n = store._data.notifications.find((x) => x.id === notifId && x.userId === userId);
      if (!n) return { error: { status: 404, message: 'Notification not found' } };
      n.read = true;
      return { ok: true };
    },

    addNotification(userId, type, message, serviceId = null) {
      const id = `n-${nextNotifId++}`;
      store._data.notifications.push({
        id,
        userId,
        type,
        message,
        serviceId,
        timestamp: new Date().toISOString(),
        read: false,
      });
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
        store.addNotification(
          second.userId,
          'almost_ready',
          'You are next in line',
          serviceId
        );
      }
    },
  };

  return store;
}

export const defaultStore = createStore();

import {
  users,
  services,
  queueEntries,
  history,
  getNextUserId,
  getNextServiceId,
  getNextQueueId,
  getNextHistoryId,
} from './data';

let onNotify = null;
export function setNotificationCallback(cb) {
  onNotify = cb;
}

function notify(message, type = 'info') {
  if (onNotify) onNotify({ message, type });
}

// In-memory mutable copies for demo (so we can update and still re-export)
let servicesData = [...services];
let queueData = [...queueEntries];
let historyData = [...history];

export function getServices() {
  return Promise.resolve([...servicesData]);
}

export function getService(id) {
  return Promise.resolve(servicesData.find((s) => s.id === id) || null);
}

export function getQueue(serviceId) {
  const list = queueData.filter((e) => e.serviceId === serviceId);
  return Promise.resolve([...list]);
}

export function getHistory(userId) {
  const list = historyData.filter((h) => h.userId === userId);
  return Promise.resolve([...list].sort((a, b) => new Date(b.date) - new Date(a.date)));
}

export function login(email, password) {
  const user = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
  );
  return Promise.resolve(user ? { ...user } : null);
}

export function register(email, password, name) {
  if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return Promise.resolve(null);
  }
  const user = {
    id: getNextUserId(),
    email: email.trim(),
    password,
    name: name.trim(),
    role: 'student',
  };
  users.push(user);
  return Promise.resolve({ ...user });
}

export function joinQueue(serviceId, userId, userName) {
  const service = servicesData.find((s) => s.id === serviceId);
  if (!service || !service.isOpen) return Promise.resolve(null);
  const existing = queueData.find((e) => e.serviceId === serviceId && e.userId === userId);
  if (existing) return Promise.resolve(existing);
  const entry = {
    id: getNextQueueId(),
    userId,
    userName,
    serviceId,
    joinedAt: new Date().toISOString(),
    priority: service.priorityLevel,
    status: 'waiting',
  };
  queueData.push(entry);
  notify(`Joined ${service.name} queue`, 'success');
  return Promise.resolve(entry);
}

export function leaveQueue(entryId) {
  const idx = queueData.findIndex((e) => e.id === entryId);
  if (idx === -1) return Promise.resolve(false);
  const entry = queueData[idx];
  const service = servicesData.find((s) => s.id === entry.serviceId);
  queueData.splice(idx, 1);
  historyData.push({
    id: getNextHistoryId(),
    userId: entry.userId,
    serviceId: entry.serviceId,
    serviceName: service?.name || 'Service',
    date: new Date().toISOString(),
    outcome: 'Left',
  });
  notify(`Left ${service?.name || 'queue'}`, 'info');
  return Promise.resolve(true);
}

export function serveNext(serviceId, notifyUser) {
  const list = queueData.filter((e) => e.serviceId === serviceId);
  if (list.length === 0) return Promise.resolve(null);
  const entry = list[0];
  const idx = queueData.findIndex((e) => e.id === entry.id);
  queueData.splice(idx, 1);
  const service = servicesData.find((s) => s.id === serviceId);
  historyData.push({
    id: getNextHistoryId(),
    userId: entry.userId,
    serviceId,
    serviceName: service?.name || 'Service',
    date: new Date().toISOString(),
    outcome: 'Served',
  });
  if (notifyUser) notifyUser(entry.userId, 'Your turn has been updated');
  return Promise.resolve(entry);
}

export function removeUser(entryId, notifyUser) {
  const idx = queueData.findIndex((e) => e.id === entryId);
  if (idx === -1) return Promise.resolve(false);
  const entry = queueData[idx];
  const service = servicesData.find((s) => s.id === entry.serviceId);
  queueData.splice(idx, 1);
  historyData.push({
    id: getNextHistoryId(),
    userId: entry.userId,
    serviceId: entry.serviceId,
    serviceName: service?.name || 'Service',
    date: new Date().toISOString(),
    outcome: 'Left',
  });
  if (notifyUser) notifyUser(entry.userId, 'You were removed from the queue');
  return Promise.resolve(true);
}

export function reorderQueue(serviceId, newOrder) {
  const ids = newOrder.map((e) => (typeof e === 'object' ? e.id : e));
  const entries = queueData.filter((e) => e.serviceId === serviceId);
  if (entries.length !== ids.length) return Promise.resolve(false);
  const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
  const reordered = ids.map((id) => byId[id]).filter(Boolean);
  queueData = queueData.filter((e) => e.serviceId !== serviceId);
  queueData.push(...reordered);
  return Promise.resolve(true);
}

export function createService(attrs) {
  const service = {
    id: getNextServiceId(),
    name: attrs.name.trim(),
    description: attrs.description.trim(),
    expectedDurationMinutes: Number(attrs.expectedDurationMinutes) || 1,
    priorityLevel: attrs.priorityLevel,
    isOpen: false,
    estimatedWaitMinutes: 0,
  };
  servicesData.push(service);
  return Promise.resolve(service);
}

export function updateService(id, attrs) {
  const idx = servicesData.findIndex((s) => s.id === id);
  if (idx === -1) return Promise.resolve(null);
  servicesData[idx] = {
    ...servicesData[idx],
    name: attrs.name != null ? attrs.name.trim() : servicesData[idx].name,
    description: attrs.description != null ? attrs.description.trim() : servicesData[idx].description,
    expectedDurationMinutes: attrs.expectedDurationMinutes != null ? Number(attrs.expectedDurationMinutes) : servicesData[idx].expectedDurationMinutes,
    priorityLevel: attrs.priorityLevel != null ? attrs.priorityLevel : servicesData[idx].priorityLevel,
  };
  return Promise.resolve(servicesData[idx]);
}

export function setServiceOpen(serviceId, isOpen) {
  const service = servicesData.find((s) => s.id === serviceId);
  if (!service) return Promise.resolve(null);
  service.isOpen = isOpen;
  return Promise.resolve(service);
}

export function getQueueEntryByUserAndService(userId, serviceId) {
  return queueData.find((e) => e.userId === userId && e.serviceId === serviceId) || null;
}

export function getUserPositionInQueue(serviceId, userId) {
  const list = queueData.filter((e) => e.serviceId === serviceId);
  const idx = list.findIndex((e) => e.userId === userId);
  return idx === -1 ? null : idx + 1;
}

/**
 * API client (A3) — calls QueueSmart backend. Replaces A2 mock.
 */

const BASE = import.meta.env.VITE_API_URL ?? '';

let onNotify = null;
export function setNotificationCallback(cb) {
  onNotify = cb;
}

/** @param {'bottom' | 'top'} [placement] — `top` = center-top banner (e.g. close to being served) */
function notify(message, type = 'info', placement = 'bottom') {
  if (onNotify) onNotify({ message, type, placement });
}

function authHeader() {
  try {
    const raw = sessionStorage.getItem('queuesmart_session');
    if (!raw) return {};
    const { token } = JSON.parse(raw);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function req(path, options = {}) {
  const headers = {
    ...authHeader(),
    ...options.headers,
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  return res;
}

export async function login(email, password) {
  const res = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson(res);
  if (!res.ok) return null;
  sessionStorage.setItem('queuesmart_session', JSON.stringify({ user: data.user, token: data.token }));
  return data.user;
}

/**
 * @returns {Promise<{ ok: true, user: object } | { ok: false, status: number, message?: string }>}
 */
export async function register(email, password, name, role = 'student') {
  const res = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role }),
  });
  const data = await parseJson(res);
  if (res.ok) {
    sessionStorage.setItem('queuesmart_session', JSON.stringify({ user: data.user, token: data.token }));
    return { ok: true, user: data.user };
  }
  return {
    ok: false,
    status: res.status,
    message: data?.message,
  };
}

export async function getServices() {
  const res = await req('/api/services');
  const data = await parseJson(res);
  if (!res.ok) return [];
  return data.services ?? [];
}

export async function getService(id) {
  const res = await req(`/api/services/${id}`);
  const data = await parseJson(res);
  if (!res.ok) return null;
  return data;
}

export async function getSmartRecommendation(serviceId) {
  const res = await req(`/api/services/${serviceId}/smart-recommendation`);
  const data = await parseJson(res);
  if (!res.ok) return null;
  return data;
}

export async function getQueue(serviceId) {
  const res = await req(`/api/services/${serviceId}/queue/entries`);
  const data = await parseJson(res);
  if (!res.ok) return [];
  return data.entries ?? [];
}

export async function getHistory(userId) {
  const res = await req(`/api/users/${userId}/history`);
  const data = await parseJson(res);
  if (!res.ok) return [];
  return data.history ?? [];
}

export async function getNotifications(userId) {
  const res = await req(`/api/users/${userId}/notifications`);
  const data = await parseJson(res);
  if (!res.ok) return [];
  return data.notifications ?? [];
}

export async function markNotificationRead(userId, notificationId) {
  const res = await req(`/api/users/${userId}/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
  return res.ok;
}

/** All services where the current user has a waiting queue entry (requires auth). */
export async function getMyActiveQueues() {
  const res = await req('/api/users/me/active-queue');
  const data = await parseJson(res);
  if (!res.ok || !data) return [];
  if (Array.isArray(data.active)) return data.active;
  if (data.active) return [data.active];
  return [];
}

export async function getMyQueueSlot(userId, serviceId) {
  const res = await req(`/api/services/${serviceId}/queue/me`);
  const data = await parseJson(res);
  if (!res.ok || !data?.entry || data.entry.userId !== userId) {
    return { entry: null, position: null };
  }
  return { entry: data.entry, position: data.position };
}

export async function getQueueEntryByUserAndService(userId, serviceId) {
  const { entry } = await getMyQueueSlot(userId, serviceId);
  return entry;
}

export async function getUserPositionInQueue(serviceId, userId) {
  const { position } = await getMyQueueSlot(userId, serviceId);
  return position;
}

export async function joinQueue(serviceId, userId, userName) {
  void userId;
  void userName;
  const res = await req(`/api/services/${serviceId}/queue/join`, { method: 'POST' });
  const data = await parseJson(res);
  if (!res.ok) {
    notify(data?.message || 'Could not join queue', 'error');
    return null;
  }
  notify(`Joined ${data.serviceName} queue`, 'success');
  if (data.position === 1 || data.position === 2) {
    notify('User is close to being served', 'info', 'top');
  }
  return data.queueEntry;
}

export async function leaveQueue(entryId) {
  const res = await req(`/api/queue-entries/${entryId}/leave`, { method: 'POST' });
  if (!res.ok) {
    const data = await parseJson(res);
    notify(data?.message || 'Could not leave queue', 'error');
    return false;
  }
  notify('Left queue', 'info');
  return true;
}

export async function serveNext(serviceId) {
  const res = await req(`/api/services/${serviceId}/queue/serve-next`, { method: 'POST' });
  const data = await parseJson(res);
  if (!res.ok) return null;
  return data.served;
}

export async function removeUser(entryId) {
  const res = await req(`/api/queue-entries/${entryId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await parseJson(res);
    notify(data?.message || 'Could not remove user', 'error');
    return false;
  }
  return true;
}

export async function reorderQueue(serviceId, newOrder) {
  const ids = newOrder.map((e) => (typeof e === 'object' ? e.id : e));
  const res = await req(`/api/services/${serviceId}/queue/order`, {
    method: 'PUT',
    body: JSON.stringify({ orderedEntryIds: ids }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    notify(data?.message || 'Could not reorder', 'error');
    return false;
  }
  return true;
}

export async function createService(attrs) {
  const res = await req('/api/services', {
    method: 'POST',
    body: JSON.stringify({
      name: attrs.name.trim(),
      description: attrs.description.trim(),
      expectedDurationMinutes: Number(attrs.expectedDurationMinutes) || 1,
      priorityLevel: attrs.priorityLevel,
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    notify(data?.message || 'Could not create service', 'error');
    return null;
  }
  return data;
}

export async function updateService(id, attrs) {
  const res = await req(`/api/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: attrs.name,
      description: attrs.description,
      expectedDurationMinutes: attrs.expectedDurationMinutes,
      priorityLevel: attrs.priorityLevel,
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    notify(data?.message || 'Could not update service', 'error');
    return null;
  }
  return data;
}

export async function setServiceOpen(serviceId, isOpen) {
  const path = isOpen ? 'open' : 'close';
  const res = await req(`/api/services/${serviceId}/queue/${path}`, { method: 'POST' });
  const data = await parseJson(res);
  if (!res.ok) {
    notify(data?.message || 'Could not update queue', 'error');
    return null;
  }
  return data;
}

export async function logoutApi() {
  await req('/api/auth/logout', { method: 'POST' });
}

export async function getAdminReportOverview(filters = {}) {
  const params = new URLSearchParams();
  if (filters.serviceId) params.set('serviceId', filters.serviceId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  const res = await req(`/api/admin/reports/overview${query ? `?${query}` : ''}`);
  const data = await parseJson(res);
  if (!res.ok) {
    notify(data?.message || 'Could not load report', 'error');
    return null;
  }
  return data;
}

export async function downloadAdminReportCsv(filters = {}) {
  const params = new URLSearchParams();
  if (filters.serviceId) params.set('serviceId', filters.serviceId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  const res = await req(`/api/admin/reports/overview.csv${query ? `?${query}` : ''}`);
  if (!res.ok) {
    const data = await parseJson(res);
    notify(data?.message || 'Could not export report', 'error');
    return false;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `queuesmart-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

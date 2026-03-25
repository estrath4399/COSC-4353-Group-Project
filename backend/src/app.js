import express from 'express';
import cors from 'cors';
import { requireAuth, requireAdmin, requireSelfOrAdmin } from './middleware.js';
import { validateRegisterBody, validateLoginBody, validateServiceBody } from './validation.js';

export function createApp(store) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  /* --------- Auth --------- */
  app.post('/api/auth/register', (req, res) => {
    const parsed = validateRegisterBody(req.body);
    if (!parsed.ok) return res.status(parsed.status).json({ message: parsed.message });
    const result = store.register(parsed.value);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.status(201).json({ user: result.user, token: result.token });
  });

  app.post('/api/auth/login', (req, res) => {
    const parsed = validateLoginBody(req.body);
    if (!parsed.ok) return res.status(parsed.status).json({ message: parsed.message });
    const result = store.login(parsed.value);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.json({ user: result.user, token: result.token });
  });

  app.post('/api/auth/logout', requireAuth(store), (req, res) => {
    const raw = req.headers.authorization;
    const tok = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : '';
    store.deleteSession(tok);
    return res.status(204).send();
  });

  app.get('/api/auth/me', requireAuth(store), (req, res) => {
    return res.json({ user: store.toPublicUser(req.user) });
  });

  /* --------- Services --------- */
  app.get('/api/services', requireAuth(store), (_req, res) => {
    return res.json({ services: store.listServices() });
  });

  app.get('/api/services/:id', requireAuth(store), (req, res) => {
    const s = store.getService(req.params.id);
    if (!s) return res.status(404).json({ message: 'Service not found' });
    const enriched = store.listServices().find((x) => x.id === s.id);
    return res.json(enriched ?? s);
  });

  app.post('/api/services', requireAdmin(store), (req, res) => {
    const parsed = validateServiceBody(req.body, false);
    if (!parsed.ok) return res.status(parsed.status).json({ message: parsed.message });
    const result = store.createService(parsed.value);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const svc = store.listServices().find((x) => x.id === result.service.id) ?? result.service;
    return res.status(201).json(svc);
  });

  app.put('/api/services/:id', requireAdmin(store), (req, res) => {
    const parsed = validateServiceBody(req.body, true);
    if (!parsed.ok) return res.status(parsed.status).json({ message: parsed.message });
    const patch = Object.fromEntries(
      Object.entries(parsed.value).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    const result = store.updateService(req.params.id, patch);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const svc = store.listServices().find((x) => x.id === result.service.id) ?? result.service;
    return res.json(svc);
  });

  app.delete('/api/services/:id', requireAdmin(store), (req, res) => {
    const result = store.deleteService(req.params.id);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.status(204).send();
  });

  /* --------- Queue (per service) --------- */
  app.post('/api/services/:serviceId/queue/open', requireAdmin(store), (req, res) => {
    const result = store.setServiceOpen(req.params.serviceId, true);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.json(result.service);
  });

  app.post('/api/services/:serviceId/queue/close', requireAdmin(store), (req, res) => {
    const result = store.setServiceOpen(req.params.serviceId, false);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    return res.json(result.service);
  });

  app.get('/api/services/:serviceId/queue/entries', requireAdmin(store), (req, res) => {
    const s = store.getService(req.params.serviceId);
    if (!s) return res.status(404).json({ message: 'Service not found' });
    return res.json({ entries: store.listQueueEntries(req.params.serviceId) });
  });

  app.get('/api/services/:serviceId/queue/me', requireAuth(store), (req, res) => {
    const s = store.getService(req.params.serviceId);
    if (!s) return res.status(404).json({ message: 'Service not found' });
    const st = store.getMyQueueStatus(req.params.serviceId, req.user.id);
    if (st.error) return res.status(st.error.status).json({ message: st.error.message });
    return res.json({
      entry: st.entry,
      position: st.position,
      estimatedWaitMinutes: st.estimatedWaitMinutes,
    });
  });

  app.post('/api/services/:serviceId/queue/join', requireAuth(store), (req, res) => {
    const r = store.joinQueue(req.params.serviceId, req.user.id, req.user.name);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    return res.status(201).json({
      queueEntry: r.queueEntry,
      position: r.position,
      estimatedWaitMinutes: r.estimatedWaitMinutes,
      serviceName: r.serviceName,
    });
  });

  app.post('/api/services/:serviceId/queue/serve-next', requireAdmin(store), (req, res) => {
    const r = store.serveNext(req.params.serviceId);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    return res.json({ served: r.served });
  });

  app.put('/api/services/:serviceId/queue/order', requireAdmin(store), (req, res) => {
    const ids = req.body?.orderedEntryIds;
    if (!Array.isArray(ids)) return res.status(400).json({ message: 'orderedEntryIds must be an array' });
    const r = store.reorderQueue(req.params.serviceId, ids);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    return res.json({ ok: true });
  });

  /* --------- Queue entries / leave / remove --------- */
  app.post('/api/queue-entries/:entryId/leave', requireAuth(store), (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const r = store.leaveQueueByEntryId(req.params.entryId, req.user.id, isAdmin);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    return res.status(204).send();
  });

  app.delete('/api/queue-entries/:entryId', requireAdmin(store), (req, res) => {
    const r = store.leaveQueueByEntryId(req.params.entryId, '', true);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    return res.status(204).send();
  });

  /* --------- Users: history & notifications --------- */
  app.get('/api/users/me/active-queue', requireAuth(store), (_req, res) => {
    const active = store.activeQueueForUser(req.user.id);
    return res.json({ active });
  });

  app.get('/api/users/:userId/history', requireAuth(store), requireSelfOrAdmin('userId'), (req, res) => {
    return res.json({ history: store.listHistory(req.params.userId) });
  });

  app.get('/api/users/:userId/notifications', requireAuth(store), requireSelfOrAdmin('userId'), (req, res) => {
    return res.json({ notifications: store.listNotifications(req.params.userId) });
  });

  app.patch('/api/users/:userId/notifications/:id/read', requireAuth(store), requireSelfOrAdmin('userId'), (req, res) => {
    const r = store.markNotificationRead(req.params.userId, req.params.id);
    if (r.error) return res.status(r.error.status).json({ message: r.error.message });
    return res.status(204).send();
  });

  app.get('/api/queues', requireAuth(store), (_req, res) => {
    return res.json({ queues: store.listQueues() });
  });

  return app;
}

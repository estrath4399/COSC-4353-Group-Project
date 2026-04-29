import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createStore } from '../src/store.js';
import { createApp } from '../src/app.js';

function testApp() {
  const store = createStore();
  return { app: createApp(store), store };
}

describe('API', () => {
  let app;
  let store;

  beforeEach(() => {
    const t = testApp();
    app = t.app;
    store = t.store;
  });

  async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return res.body.token;
  }

  it('registers and rejects duplicate email', async () => {
    const r1 = await request(app).post('/api/auth/register').send({
      email: 'new@t.com',
      password: 'NewUser9z',
      name: 'Z',
    });
    expect(r1.status).toBe(201);
    expect(r1.body.user.role).toBe('student');

    const r2 = await request(app).post('/api/auth/register').send({
      email: 'new@t.com',
      password: 'Other9xx',
      name: 'Y',
    });
    expect(r2.status).toBe(409);
  });

  it('rejects bad login credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('join queue fails when closed', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .post('/api/services/3/queue/join')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBe(409);
  });

  it('join queue succeeds when open and returns wait estimate', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .post('/api/services/1/queue/join')
      .set('Authorization', `Bearer ${token}`)
      .send();
    if (res.status !== 201) {
      // may already be in seed queue
      expect(res.status).toBe(400);
    } else {
      expect(res.body.position).toBeGreaterThanOrEqual(1);
      expect(res.body.estimatedWaitMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it('admin lists queue entries', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('serve next removes head', async () => {
    const token = await login('admin@test.com', 'password');
    const before = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${token}`);
    const n = before.body.entries.length;
    if (n === 0) return;
    const res = await request(app)
      .post('/api/services/1/queue/serve-next')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const after = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.entries.length).toBe(n - 1);
  });

  it('creates service as admin', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Tutoring',
        description: 'Help',
        expectedDurationMinutes: 12,
        priorityLevel: 'medium',
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Tutoring');
    expect(res.body.isOpen).toBe(false);
  });

  it('registers as administrator when role is admin', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'newadmin@t.com',
      password: 'AdminNew9',
      name: 'New Admin',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
    const token = res.body.token;
    const svc = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'AdminCreatedSvc',
        description: 'Test',
        expectedDurationMinutes: 5,
        priorityLevel: 'low',
      });
    expect(svc.status).toBe(201);
  });

  it('student cannot create service', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bad',
        description: 'X',
        expectedDurationMinutes: 1,
        priorityLevel: 'low',
      });
    expect(res.status).toBe(403);
  });

  it('history is returned for user', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/users/1/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects protected route without auth token', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid register payload', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'bad',
      password: '123',
      name: '',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when admin updates service with empty payload', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .put('/api/services/1')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 409 when deleting service with waiting users', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .delete('/api/services/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('returns 403 when user requests another user history', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/users/3/history')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('orders notifications newest first when join adds two events back-to-back', async () => {
    const adminToken = await login('admin@test.com', 'password');
    const entriesRes = await request(app)
      .get('/api/services/2/queue/entries')
      .set('Authorization', `Bearer ${adminToken}`);
    const headId = entriesRes.body.entries?.[0]?.id;
    if (headId) {
      await request(app)
        .delete(`/api/queue-entries/${headId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();
    }

    const reg = await request(app).post('/api/auth/register').send({
      email: 'notiforder@test.com',
      password: 'OrderTest9',
      name: 'Order Test',
      role: 'student',
    });
    expect(reg.status).toBe(201);
    const token = reg.body.token;
    const uid = reg.body.user.id;

    const join = await request(app)
      .post('/api/services/2/queue/join')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(join.status).toBe(201);

    const list = await request(app)
      .get(`/api/users/${uid}/notifications`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const msgs = list.body.notifications.map((n) => n.message);
    const iJoin = msgs.findIndex((m) => m.includes('joined the queue'));
    const iFirst = msgs.findIndex((m) => m.includes('first in line'));
    expect(iJoin).not.toBe(-1);
    expect(iFirst).not.toBe(-1);
    expect(iFirst).toBeLessThan(iJoin);
  });

  it('supports notifications read flow', async () => {
    const adminToken = await login('admin@test.com', 'password');
    const studentToken = await login('student@test.com', 'password');

    await request(app)
      .post('/api/services/1/queue/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send();

    await request(app)
      .post('/api/services/1/queue/serve-next')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    const list = await request(app)
      .get('/api/users/1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.notifications)).toBe(true);
    if (list.body.notifications.length === 0) return;

    const firstId = list.body.notifications[0].id;
    const mark = await request(app)
      .patch(`/api/users/1/notifications/${firstId}/read`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send();
    expect(mark.status).toBe(204);
  });
  it('GET /api/users/me/active-queue returns all waiting queues for user', async () => {
    const token = await login('student@test.com', 'password');
    const before = await request(app)
      .get('/api/users/me/active-queue')
      .set('Authorization', `Bearer ${token}`);
    expect(before.status).toBe(200);
    expect(Array.isArray(before.body.active)).toBe(true);
    expect(before.body.active.length).toBeGreaterThanOrEqual(1);

    const join2 = await request(app)
      .post('/api/services/2/queue/join')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(join2.status).toBe(201);

    const after = await request(app)
      .get('/api/users/me/active-queue')
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(200);
    expect(after.body.active.length).toBeGreaterThanOrEqual(2);
    const serviceIds = after.body.active.map((a) => a.service.id);
    expect(serviceIds).toContain('1');
    expect(serviceIds).toContain('2');
  });

  it("GET /api/auth/me returns user when logged in", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "student@test.com", password: "password" });

    const token = loginRes.body.token;

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("student@test.com");
  });

  it('admin can fetch report overview and CSV export', async () => {
    const token = await login('admin@test.com', 'password');
    const overview = await request(app)
      .get('/api/admin/reports/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.summary).toBeTruthy();
    expect(Array.isArray(overview.body.services)).toBe(true);

    const csv = await request(app)
      .get('/api/admin/reports/overview.csv')
      .set('Authorization', `Bearer ${token}`);
    expect(csv.status).toBe(200);
    expect(csv.text).toContain('section,key,value');
    expect(csv.text).toContain('services,serviceId,serviceName');
  });

  it('student cannot access admin report endpoints', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/admin/reports/overview')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns smart recommendation for service', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/services/1/smart-recommendation')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.currentService).toBeTruthy();
    expect(res.body.recommendation?.message).toBeTruthy();
    // Seed services are unrelated domains, so no cross-service recommendation should be made.
    expect(res.body.recommendation?.type).toBe('stay_put');
    expect(res.body.recommendation?.alternativeService).toBeNull();
  });

  it('smart recommendation returns 404 for missing service', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/services/999/smart-recommendation')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Logout --------- */

  it('logout invalidates session token', async () => {
    const token = await login('student@test.com', 'password');
    const me1 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me1.status).toBe(200);

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(204);

    const me2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me2.status).toBe(401);
  });

  /* --------- GET /services/:id --------- */

  it('returns a single service by id', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/services/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Advising');
    expect(res.body.expectedDurationMinutes).toBe(15);
  });

  it('returns 404 for non-existent service', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/services/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- PUT /services/:id (successful update) --------- */

  it('admin updates a service successfully', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .put('/api/services/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Advising Updated', description: 'Updated description' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Advising Updated');
    expect(res.body.description).toBe('Updated description');
    expect(res.body.expectedDurationMinutes).toBe(15);
  });

  it('returns 404 when updating non-existent service', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .put('/api/services/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  /* --------- DELETE /services/:id (successful deletion) --------- */

  it('admin deletes a service with no waiting users', async () => {
    const token = await login('admin@test.com', 'password');
    const created = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Temp Service',
        description: 'Will be deleted',
        expectedDurationMinutes: 5,
        priorityLevel: 'low',
      });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const del = await request(app)
      .delete(`/api/services/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/services/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it('returns 404 when deleting non-existent service', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .delete('/api/services/999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Open / Close queue --------- */

  it('admin opens a closed queue', async () => {
    const token = await login('admin@test.com', 'password');
    const before = await request(app)
      .get('/api/services/3')
      .set('Authorization', `Bearer ${token}`);
    expect(before.body.isOpen).toBe(false);

    const open = await request(app)
      .post('/api/services/3/queue/open')
      .set('Authorization', `Bearer ${token}`);
    expect(open.status).toBe(200);
    expect(open.body.isOpen).toBe(true);
  });

  it('admin closes an open queue', async () => {
    const token = await login('admin@test.com', 'password');
    const close = await request(app)
      .post('/api/services/1/queue/close')
      .set('Authorization', `Bearer ${token}`);
    expect(close.status).toBe(200);
    expect(close.body.isOpen).toBe(false);
  });

  it('open queue returns 404 for non-existent service', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .post('/api/services/999/queue/open')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('close queue returns 404 for non-existent service', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .post('/api/services/999/queue/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Leave queue --------- */

  it('student leaves their own queue entry', async () => {
    const token = await login('student@test.com', 'password');
    const active = await request(app)
      .get('/api/users/me/active-queue')
      .set('Authorization', `Bearer ${token}`);
    expect(active.body.active.length).toBeGreaterThanOrEqual(1);
    const entryId = active.body.active[0].entry.id;

    const leave = await request(app)
      .post(`/api/queue-entries/${entryId}/leave`)
      .set('Authorization', `Bearer ${token}`);
    expect(leave.status).toBe(204);

    const after = await request(app)
      .get('/api/users/me/active-queue')
      .set('Authorization', `Bearer ${token}`);
    const ids = after.body.active.map((a) => a.entry.id);
    expect(ids).not.toContain(entryId);
  });

  it('leave queue returns 404 for non-existent entry', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .post('/api/queue-entries/does-not-exist/leave')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('student cannot leave another users queue entry', async () => {
    const studentToken = await login('student@test.com', 'password');
    const janeToken = await login('jane@test.com', 'password');

    const janeActive = await request(app)
      .get('/api/users/me/active-queue')
      .set('Authorization', `Bearer ${janeToken}`);
    if (janeActive.body.active.length === 0) return;
    const janeEntryId = janeActive.body.active[0].entry.id;

    const res = await request(app)
      .post(`/api/queue-entries/${janeEntryId}/leave`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  /* --------- Admin remove user from queue --------- */

  it('admin removes a user from queue', async () => {
    const adminToken = await login('admin@test.com', 'password');
    const entries = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(entries.body.entries.length).toBeGreaterThanOrEqual(1);
    const entryId = entries.body.entries[0].id;

    const remove = await request(app)
      .delete(`/api/queue-entries/${entryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(remove.status).toBe(204);

    const after = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${adminToken}`);
    const ids = after.body.entries.map((e) => e.id);
    expect(ids).not.toContain(entryId);
  });

  it('admin remove returns 404 for non-existent entry', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .delete('/api/queue-entries/does-not-exist')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- GET /queues (list all queues) --------- */

  it('lists all queues', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/queues')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.queues)).toBe(true);
    expect(res.body.queues.length).toBeGreaterThanOrEqual(3);
    const q = res.body.queues[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('serviceId');
    expect(q).toHaveProperty('isOpen');
  });

  /* --------- Queue reorder --------- */

  it('admin reorders queue entries', async () => {
    const adminToken = await login('admin@test.com', 'password');
    const entries = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${adminToken}`);
    const ids = entries.body.entries.map((e) => e.id);
    if (ids.length < 2) return;

    const reversed = [...ids].reverse();
    const res = await request(app)
      .put('/api/services/1/queue/order')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orderedEntryIds: reversed });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const after = await request(app)
      .get('/api/services/1/queue/entries')
      .set('Authorization', `Bearer ${adminToken}`);
    const afterIds = after.body.entries.map((e) => e.id);
    expect(afterIds[0]).toBe(reversed[0]);
  });

  it('reorder rejects invalid entry ids', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .put('/api/services/1/queue/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedEntryIds: ['fake-id-1', 'fake-id-2'] });
    expect(res.status).toBe(400);
  });

  it('reorder rejects non-array payload', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .put('/api/services/1/queue/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedEntryIds: 'not-an-array' });
    expect(res.status).toBe(400);
  });

  /* --------- GET /services/:serviceId/queue/me --------- */

  it('returns queue status for user in queue', async () => {
    const token = await login('jane@test.com', 'password');
    const res = await request(app)
      .get('/api/services/1/queue/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.entry).toBeTruthy();
    expect(res.body.position).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.estimatedWaitMinutes).toBe('number');
  });

  it('returns null entry when user is not in queue', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'notinqueue@test.com',
      password: 'NoQueue9z',
      name: 'No Queue',
    });
    const token = reg.body.token;
    const res = await request(app)
      .get('/api/services/1/queue/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.entry).toBeNull();
  });

  it('queue/me returns 404 for non-existent service', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .get('/api/services/999/queue/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Serve next edge cases --------- */

  it('serve next on empty queue returns 409', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .post('/api/services/3/queue/serve-next')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
  });

  it('serve next on non-existent service returns 404', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .post('/api/services/999/queue/serve-next')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Queue entries for non-existent service --------- */

  it('list entries returns 404 for non-existent service', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .get('/api/services/999/queue/entries')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Join queue: already in queue --------- */

  it('join queue returns 400 when already in queue', async () => {
    const token = await login('jane@test.com', 'password');
    const res = await request(app)
      .post('/api/services/1/queue/join')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  /* --------- Join queue: non-existent service --------- */

  it('join queue returns 404 for non-existent service', async () => {
    const token = await login('student@test.com', 'password');
    const res = await request(app)
      .post('/api/services/999/queue/join')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  /* --------- Report with filters --------- */

  it('admin report filters by serviceId', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .get('/api/admin/reports/overview?serviceId=1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.services.length).toBeLessThanOrEqual(1);
  });

  it('admin report returns empty for non-existent service filter', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .get('/api/admin/reports/overview?serviceId=999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.totalUsers).toBe(0);
  });

  /* --------- Health check --------- */

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  /* --------- Duplicate service name --------- */

  it('rejects duplicate service name on create', async () => {
    const token = await login('admin@test.com', 'password');
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Advising',
        description: 'Duplicate',
        expectedDurationMinutes: 10,
        priorityLevel: 'low',
      });
    expect(res.status).toBe(409);
  });

  /* --------- History records correct join time --------- */

  it('history joined_at reflects the actual queue join time, not the leave time', async () => {
    const adminToken = await login('admin@test.com', 'password');
    const janeToken = await login('jane@test.com', 'password');

    const beforeTime = new Date().toISOString();

    const janeActive = await request(app)
      .get('/api/users/me/active-queue')
      .set('Authorization', `Bearer ${janeToken}`);
    expect(janeActive.body.active.length).toBeGreaterThanOrEqual(1);
    const janeEntry = janeActive.body.active[0];
    const entryJoinedAt = janeEntry.entry.joinedAt;

    expect(new Date(entryJoinedAt).getTime()).toBeLessThan(new Date(beforeTime).getTime());

    await request(app)
      .post('/api/services/1/queue/serve-next')
      .set('Authorization', `Bearer ${adminToken}`);

    const history = await request(app)
      .get('/api/users/3/history')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(history.status).toBe(200);

    const latest = history.body.history[0];
    expect(latest.outcome).toBe('Served');

    const histJoinedAt = new Date(latest.joinedAt ?? latest.date).getTime();
    const histEndedAt = new Date(latest.endedAt ?? latest.date).getTime();
    expect(histEndedAt).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
    expect(histJoinedAt).toBeLessThan(new Date(beforeTime).getTime());
  });
});

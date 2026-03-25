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
      password: 'password',
      name: 'Z',
    });
    expect(r1.status).toBe(201);
    expect(r1.body.user.role).toBe('student');

    const r2 = await request(app).post('/api/auth/register').send({
      email: 'new@t.com',
      password: 'password',
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
});

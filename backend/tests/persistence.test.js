import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createStore } from '../src/store.js';
import { createApp } from '../src/app.js';

describe('SQLite persistence', () => {
  let dbPath;

  afterEach(() => {
    if (dbPath && fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch {
        /* ignore */
      }
    }
  });

  it('persists users across connections (hashed password)', async () => {
    dbPath = path.join(os.tmpdir(), `queuesmart-test-${Date.now()}.sqlite`);
    const storeA = createStore({ filename: dbPath, seedDemoData: false });
    const appA = createApp(storeA);

    const reg = await request(appA).post('/api/auth/register').send({
      email: 'persist@example.com',
      password: 'secret12',
      name: 'Persist User',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe('persist@example.com');

    storeA.close();

    const storeB = createStore({ filename: dbPath, seedDemoData: false });
    const appB = createApp(storeB);

    const bad = await request(appB).post('/api/auth/login').send({
      email: 'persist@example.com',
      password: 'wrong-password',
    });
    expect(bad.status).toBe(401);

    const ok = await request(appB).post('/api/auth/login').send({
      email: 'persist@example.com',
      password: 'secret12',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.user.name).toBe('Persist User');

    storeB.close();
  });

  it('returns 404 when marking a missing notification read', async () => {
    const store = createStore();
    const app = createApp(store);
    const token = (
      await request(app).post('/api/auth/login').send({
        email: 'student@test.com',
        password: 'password',
      })
    ).body.token;

    const res = await request(app)
      .patch('/api/users/1/notifications/n-does-not-exist/read')
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBe(404);
    store.close();
  });
});

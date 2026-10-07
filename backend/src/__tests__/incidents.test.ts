import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import type { RequestHandler } from 'express';
import request from 'supertest';
import { io as createSocket, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import type {
  IncidentAlert,
  IncidentAlertUpdates,
  IncidentUpdatedEvent,
  NewIncidentAlert,
} from '../../../shared/incident.js';
import { createSupabaseClient } from '../config/supabase.js';
import type { IncidentRepository } from '../repositories/IncidentRepository.js';
import { createApp, createIncidentServer } from '../server.js';

const alert: NewIncidentAlert = {
  busId: '154', route: 'CMB → KDY', delayTime: '15m', status: 'URGENT',
};
const authenticate: RequestHandler = (req, res, next) => {
  if (req.headers.authorization !== 'Bearer test-token') {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }
  next();
};

class MemoryRepository implements IncidentRepository {
  incidents: IncidentAlert[] = [];
  fail = false;
  private assertAvailable() {
    if (this.fail) throw new Error('database-internal-secret-error');
  }
  async getAll() {
    this.assertAvailable();
    return [...this.incidents].sort((a, b) => b.createdAt - a.createdAt);
  }
  async create(input: NewIncidentAlert) {
    this.assertAvailable();
    const incident = { ...input, id: randomUUID(), createdAt: Date.now() };
    this.incidents.push(incident);
    return incident;
  }
  async update(id: string, updates: IncidentAlertUpdates) {
    this.assertAvailable();
    const index = this.incidents.findIndex((incident) => incident.id === id);
    if (index === -1) return null;
    this.incidents[index] = { ...this.incidents[index], ...updates };
    return this.incidents[index];
  }
  async delete(id: string) {
    this.assertAvailable();
    const index = this.incidents.findIndex((incident) => incident.id === id);
    if (index === -1) return false;
    this.incidents.splice(index, 1);
    return true;
  }
}

function fixture() {
  const repository = new MemoryRepository();
  const events: IncidentUpdatedEvent[] = [];
  const app = createApp({ repository, authenticate, emit: (event) => events.push(event) });
  const api = request(app);
  return { repository, events, app, api };
}

test('new database reads empty without creating sample incidents', async () => {
  const { api, repository, events } = fixture();
  const response = await api.get('/api/incidents').auth('test-token', { type: 'bearer' }).expect(200);
  assert.deepEqual(response.body, []);
  assert.deepEqual(repository.incidents, []);
  assert.deepEqual(events, []);
});

test('CRUD returns matching camelCase records and emits once per mutation', async () => {
  const { api, events } = fixture();
  const created = await api.post('/api/incidents').auth('test-token', { type: 'bearer' })
    .send({ ...alert, busId: ' 154 ', delayTime: ' 15m ' }).expect(201);
  assert.equal(created.body.busId, '154');
  assert.equal(created.body.delayTime, '15m');
  assert.equal(typeof created.body.createdAt, 'number');
  assert.match(created.body.id, /^[\da-f-]{36}$/);
  const updated = await api.put(`/api/incidents/${created.body.id}`)
    .auth('test-token', { type: 'bearer' }).send({ status: 'RESOLVED' }).expect(200);
  assert.deepEqual(updated.body, { ...created.body, status: 'RESOLVED' });
  const read = await api.get('/api/incidents').auth('test-token', { type: 'bearer' }).expect(200);
  assert.deepEqual(read.body, [updated.body]);
  await api.delete(`/api/incidents/${created.body.id}`).auth('test-token', { type: 'bearer' }).expect(204);
  await api.delete(`/api/incidents/${created.body.id}`).auth('test-token', { type: 'bearer' }).expect(204);
  const empty = await api.get('/api/incidents').auth('test-token', { type: 'bearer' }).expect(200);
  assert.deepEqual(empty.body, []);
  assert.deepEqual(events, ['created', 'updated', 'deleted'].map((action) => ({
    action, id: created.body.id,
  })));
});

test('GET returns newest incident first', async () => {
  const { api, repository } = fixture();
  const old = { ...alert, id: randomUUID(), createdAt: 1 };
  const recent = { ...alert, id: randomUUID(), createdAt: 2 };
  repository.incidents.push(old, recent);
  const response = await api.get('/api/incidents').auth('test-token', { type: 'bearer' }).expect(200);
  assert.deepEqual(response.body, [recent, old]);
});

test('all incident endpoints require authentication', async () => {
  const { api, events } = fixture();
  const path = `/api/incidents/${randomUUID()}`;
  await api.get('/api/incidents').expect(401);
  await api.post('/api/incidents').send(alert).expect(401);
  await api.put(path).send({ status: 'WARNING' }).expect(401);
  await api.delete(path).expect(401);
  assert.deepEqual(events, []);
});

test('default existing JWT middleware rejects a request without a token', async () => {
  const app = createApp({ repository: new MemoryRepository(), emit: () => {} });
  await request(app).get('/api/incidents').expect(401);
});

test('create rejects invalid data and server-managed metadata', async () => {
  const { api, events, repository } = fixture();
  const invalidBodies = [
    {}, [], null, { ...alert, busId: ' ' }, { ...alert, route: 7 },
    { ...alert, status: 'PENDING' }, { ...alert, id: randomUUID() },
    { ...alert, createdAt: 42 }, { ...alert, delayTime: null },
  ];
  for (const body of invalidBodies) {
    await api.post('/api/incidents').auth('test-token', { type: 'bearer' }).send(body).expect(400);
  }
  assert.deepEqual(repository.incidents, []);
  assert.deepEqual(events, []);
});

test('updates reject empty changes, blank fields, invalid statuses, and immutable metadata', async () => {
  const { api, events } = fixture();
  const path = `/api/incidents/${randomUUID()}`;
  for (const body of [{}, { busId: '' }, { status: 'other' }, { createdAt: 3 }, { id: randomUUID() }]) {
    await api.put(path).auth('test-token', { type: 'bearer' }).send(body).expect(400);
  }
  assert.deepEqual(events, []);
});

test('malformed JSON returns 400 and oversized bodies return 413 without mutations', async () => {
  const { api, events, repository } = fixture();
  await api.post('/api/incidents').auth('test-token', { type: 'bearer' })
    .set('Content-Type', 'application/json').send('{invalid').expect(400);
  await api.post('/api/incidents').auth('test-token', { type: 'bearer' })
    .send({ ...alert, route: 'a'.repeat(33 * 1024) }).expect(413);
  assert.deepEqual(repository.incidents, []);
  assert.deepEqual(events, []);
});

test('invalid IDs fail validation; missing update reports 404 without an event', async () => {
  const { api, events } = fixture();
  await api.put('/api/incidents/not-a-uuid').auth('test-token', { type: 'bearer' })
    .send({ status: 'WARNING' }).expect(400);
  await api.delete('/api/incidents/not-a-uuid').auth('test-token', { type: 'bearer' }).expect(400);
  await api.put(`/api/incidents/${randomUUID()}`).auth('test-token', { type: 'bearer' })
    .send({ status: 'WARNING' }).expect(404);
  assert.deepEqual(events, []);
});

test('database failures return safe messages and never emit changes', async () => {
  const { api, repository, events } = fixture();
  repository.fail = true;
  const responses = [
    await api.get('/api/incidents').auth('test-token', { type: 'bearer' }).expect(500),
    await api.post('/api/incidents').auth('test-token', { type: 'bearer' }).send(alert).expect(500),
    await api.put(`/api/incidents/${randomUUID()}`).auth('test-token', { type: 'bearer' })
      .send({ status: 'WARNING' }).expect(500),
    await api.delete(`/api/incidents/${randomUUID()}`).auth('test-token', { type: 'bearer' }).expect(500),
  ];
  for (const response of responses) assert.doesNotMatch(JSON.stringify(response.body), /secret/);
  assert.deepEqual(events, []);
});

test('missing Supabase environment fails clearly without exposing keys', () => {
  assert.throws(() => createSupabaseClient({}), /requires SUPABASE_URL/);
  assert.throws(() => createSupabaseClient({ SUPABASE_URL: 'https://example.supabase.co' }), /SUPABASE_SECRET_KEY/);
});

function nextEvent(socket: Socket): Promise<IncidentUpdatedEvent> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Expected incident_updated event')), 3000);
    socket.once('incident_updated', (event: IncidentUpdatedEvent) => {
      clearTimeout(timer);
      resolve(event);
    });
  });
}

test('Socket.IO broadcasts persisted create/update/delete to two authenticated clients', async () => {
  const server = createIncidentServer({
    repository: new MemoryRepository(), authenticate,
    authenticateSocket: async (token) => {
      if (token !== 'test-token') throw new Error('Invalid token');
    },
  });
  server.httpServer.listen(0, '127.0.0.1');
  await once(server.httpServer, 'listening');
  const url = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
  const clients = [0, 1].map(() => createSocket(url, {
    auth: { token: 'test-token' }, transports: ['websocket'], reconnection: false,
  }));
  try {
    await Promise.all(clients.map((client) => once(client, 'connect')));
    const received = clients.map(() => [] as IncidentUpdatedEvent[]);
    clients.forEach((client, index) => client.on('incident_updated', (event) => received[index].push(event)));
    const api = request(server.httpServer);
    const createdEvents = clients.map(nextEvent);
    const created = await api.post('/api/incidents').auth('test-token', { type: 'bearer' })
      .send(alert).expect(201);
    assert.deepEqual(await Promise.all(createdEvents), clients.map(() => ({ action: 'created', id: created.body.id })));
    const updatedEvents = clients.map(nextEvent);
    await api.put(`/api/incidents/${created.body.id}`).auth('test-token', { type: 'bearer' })
      .send({ status: 'WARNING' }).expect(200);
    await Promise.all(updatedEvents);
    const deletedEvents = clients.map(nextEvent);
    await api.delete(`/api/incidents/${created.body.id}`).auth('test-token', { type: 'bearer' }).expect(204);
    await Promise.all(deletedEvents);
    received.forEach((events) => assert.deepEqual(events, ['created', 'updated', 'deleted'].map((action) => ({
      action, id: created.body.id,
    }))));
  } finally {
    clients.forEach((client) => client.disconnect());
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

test('Socket.IO rejects unauthenticated clients', async () => {
  const server = createIncidentServer({ repository: new MemoryRepository(), authenticate });
  server.httpServer.listen(0, '127.0.0.1');
  await once(server.httpServer, 'listening');
  const url = `http://127.0.0.1:${(server.httpServer.address() as AddressInfo).port}`;
  const client = createSocket(url, { transports: ['websocket'], reconnection: false });
  try {
    const [error] = await once(client, 'connect_error');
    assert.match(error.message, /Not authorized/);
    assert.equal(client.connected, false);
  } finally {
    client.disconnect();
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
  }
});

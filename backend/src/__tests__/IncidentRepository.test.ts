import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import type { IncidentDatabase, IncidentRow } from '../config/supabase.js';
import { SupabaseIncidentRepository } from '../repositories/IncidentRepository.js';

const row: IncidentRow = {
  id: '8319eaf4-2b0a-426c-8c6b-b9adb88fd4fe',
  bus_id: '154', route: 'CMB → KDY', delay_time: '15m', status: 'URGENT',
  created_at: '2026-10-07T08:00:00.000Z',
};
const expected = {
  id: row.id, busId: row.bus_id, route: row.route, delayTime: row.delay_time,
  status: row.status, createdAt: Date.parse(row.created_at),
};

function repositoryWithResponse(data: unknown, status = 200) {
  const requests: { url: URL; method: string; body: unknown }[] = [];
  const client = createClient<IncidentDatabase>('https://example.supabase.co', 'test-server-only-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        requests.push({
          url: new URL(String(input)),
          method: init?.method || 'GET',
          body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
        });
        return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
      },
    },
  });
  return { repository: new SupabaseIncidentRepository(client), requests };
}

test('Supabase reads order newest first and map database timestamps/columns', async () => {
  const { repository, requests } = repositoryWithResponse([row]);
  assert.deepEqual(await repository.getAll(), [expected]);
  assert.equal(requests[0].url.pathname, '/rest/v1/incident_alerts');
  assert.equal(requests[0].url.searchParams.get('order'), 'created_at.desc,id.desc');
  assert.equal(requests[0].method, 'GET');
});

test('Supabase reads every page even when the project cap is smaller than requested', async () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    ...row,
    id: `8319eaf4-2b0a-426c-8c6b-b9adb88fd4f${index}`,
    created_at: new Date(Date.parse(row.created_at) - index * 1000).toISOString(),
  }));
  const offsets: number[] = [];
  const client = createClient<IncidentDatabase>('https://example.supabase.co', 'test-server-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(String(input));
        const offset = Number(url.searchParams.get('offset'));
        offsets.push(offset);
        assert.equal(url.searchParams.get('order'), 'created_at.desc,id.desc');
        assert.match(new Headers(init?.headers).get('Prefer') ?? '', /count=exact/);
        const page = rows.slice(offset, offset + 2);
        return new Response(JSON.stringify(page), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Content-Range': `${offset}-${offset + page.length - 1}/5` },
        });
      },
    },
  });
  const incidents = await new SupabaseIncidentRepository(client).getAll();
  assert.deepEqual(offsets, [0, 2, 4]);
  assert.deepEqual(incidents.map((incident) => incident.id), rows.map((incident) => incident.id));
  assert.deepEqual(incidents.map((incident) => incident.createdAt), rows.map((incident) => Date.parse(incident.created_at)));
});

test('Supabase read failure on a later page rejects instead of returning partial results', async () => {
  let calls = 0;
  const client = createClient<IncidentDatabase>('https://example.supabase.co', 'test-server-only-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async () => {
        calls += 1;
        return calls === 1
          ? new Response(JSON.stringify([row]), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/2' },
          })
          : new Response(JSON.stringify({ message: 'Permission denied' }), {
            status: 403, headers: { 'Content-Type': 'application/json' },
          });
      },
    },
  });
  await assert.rejects(new SupabaseIncidentRepository(client).getAll(), /read failed/);
  assert.equal(calls, 2);
});

test('Supabase inserts editable snake_case fields and lets PostgreSQL assign ID/time', async () => {
  const { repository, requests } = repositoryWithResponse(row);
  const { id: _id, createdAt: _createdAt, ...input } = expected;
  assert.deepEqual(await repository.create(input), expected);
  assert.equal(requests[0].method, 'POST');
  assert.deepEqual(requests[0].body, {
    bus_id: row.bus_id, route: row.route, delay_time: row.delay_time, status: row.status,
  });
  assert.equal(requests[0].url.searchParams.get('select'), '*');
});

test('Supabase partial updates filter by ID and preserve omitted columns', async () => {
  const { repository, requests } = repositoryWithResponse([{ ...row, delay_time: '20m' }]);
  assert.deepEqual(await repository.update(row.id, { delayTime: '20m' }), { ...expected, delayTime: '20m' });
  assert.equal(requests[0].method, 'PATCH');
  assert.equal(requests[0].url.searchParams.get('id'), `eq.${row.id}`);
  assert.deepEqual(requests[0].body, { delay_time: '20m' });
});

test('Supabase missing update and deletion return explicit no-match results', async () => {
  const { repository, requests } = repositoryWithResponse([]);
  assert.equal(await repository.update(row.id, { status: 'WARNING' }), null);
  assert.equal(await repository.delete(row.id), false);
  assert.equal(requests[1].method, 'DELETE');
  assert.equal(requests[1].url.searchParams.get('id'), `eq.${row.id}`);
  assert.equal(requests[1].url.searchParams.get('select'), 'id');
});

test('Supabase deletion reports an actual mutation from returned IDs', async () => {
  const { repository } = repositoryWithResponse([{ id: row.id }]);
  assert.equal(await repository.delete(row.id), true);
});

test('Supabase errors reject every repository operation', async () => {
  const { repository } = repositoryWithResponse({ message: 'Permission denied', code: '42501' }, 403);
  const { id: _id, createdAt: _createdAt, ...input } = expected;
  await assert.rejects(repository.getAll(), /read failed/);
  await assert.rejects(repository.create(input), /create failed/);
  await assert.rejects(repository.update(row.id, { status: 'WARNING' }), /update failed/);
  await assert.rejects(repository.delete(row.id), /delete failed/);
});

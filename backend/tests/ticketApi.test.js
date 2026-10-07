import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import TicketJourney from '../models/TicketJourney.js';
import TicketQuote from '../models/TicketQuote.js';
import ticketRoutes from '../routes/ticketRoutes.js';
import { errorHandler, notFound } from '../middleware/errorMiddleware.js';
import loadTicketCatalogue from '../config/ticketCatalogue.js';

let mongo, server, base, passenger, other, verifier, journey;
const secret = randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;
process.env.NODE_ENV = 'production';
const auth = (user) => jwt.sign({ id: String(user._id) }, secret);
async function request(path, user, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${base}/api/tickets${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: `Bearer ${auth(user)}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
async function quote() {
  const result = await request('/quotes', passenger, {
    journeyId: String(journey._id),
    ticketType: 'standard',
    departureAt: new Date(Date.now() + 60000).toISOString(),
  });
  assert.equal(result.status, 201);
  return result.body.quote;
}
async function issue() {
  const q = await quote();
  const result = await request('/purchase', passenger, { quoteId: q.id });
  assert.equal(result.status, 201);
  return result.body.ticket;
}

before(
  async () => {
    // Reuse the project's cached binary when present; never connect to the configured team database.
    const binary = fileURLToPath(
      new URL(
        '../node_modules/.cache/mongodb-memory-server/mongod-x64-win32-8.2.6.exe',
        import.meta.url
      )
    );
    mongo = await MongoMemoryServer.create(
      existsSync(binary) ? { binary: { systemBinary: binary } } : {}
    );
    await mongoose.connect(mongo.getUri());
    [passenger, other, verifier] = await User.create([
      {
        fullName: 'Test Passenger',
        email: 'ticket-test@example.test',
        password: 'test-password',
      },
      {
        fullName: 'Other Passenger',
        email: 'other-test@example.test',
        password: 'test-password',
      },
      {
        fullName: 'Test Verifier',
        email: 'verifier-test@example.test',
        password: 'test-password',
        role: 'admin',
      },
    ]);
    journey = await TicketJourney.create({
      code: 'TEST-BUS',
      mode: 'Bus',
      from: 'Test Origin',
      to: 'Test Destination',
      durationMinutes: 60,
      validityMinutes: 120,
      ticketTypes: [{ code: 'standard', label: 'Standard', fareMinor: 12345 }],
    });
    await Promise.all([
      Ticket.init(),
      TicketQuote.init(),
      TicketJourney.init(),
    ]);
    const app = express();
    app.use(express.json());
    app.use('/api/tickets', ticketRoutes);
    app.use(notFound);
    app.use(errorHandler);
    server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    base = `http://127.0.0.1:${server.address().port}`;
  },
  { timeout: 60000 }
);

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('ticket routes require authentication and expose only configured active journeys', async () => {
  assert.equal((await request('/journeys')).status, 401);
  const result = await request('/journeys', passenger);
  assert.equal(result.status, 200);
  assert.equal(result.body.journeys[0].ticketTypes[0].fareMinor, 12345);
  await TicketJourney.updateOne({ _id: journey._id }, { active: false });
  assert.equal((await request('/journeys', passenger)).body.journeys.length, 0);
  await TicketJourney.updateOne({ _id: journey._id }, { active: true });
});

test('server rejects invalid journeys, ticket types, and past departures', async () => {
  for (const data of [
    {
      journeyId: 'bad',
      ticketType: 'standard',
      departureAt: new Date(Date.now() + 60000).toISOString(),
    },
    {
      journeyId: String(journey._id),
      ticketType: 'invented',
      departureAt: new Date(Date.now() + 60000).toISOString(),
    },
    {
      journeyId: String(journey._id),
      ticketType: 'standard',
      departureAt: new Date(Date.now() - 60000).toISOString(),
    },
  ])
    assert.equal((await request('/quotes', passenger, data)).status, 400);
});

test('client fare and passenger overrides are ignored; ticket belongs to authenticated user', async () => {
  const q = await quote();
  const result = await request('/purchase', passenger, {
    quoteId: q.id,
    fareMinor: 1,
    userId: String(other._id),
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.ticket.fareMinor, 12345);
  assert.equal(result.body.ticket.passengerName, passenger.fullName);
  assert.match(result.body.ticket.qrPayload, /^TL1:[a-f0-9]{64}$/);
  assert.ok(!result.body.ticket.qrPayload.includes(passenger.email));
  assert.equal((await request(`/${result.body.ticket.id}`, other)).status, 404);
  const owner = await request(`/${result.body.ticket.id}`, passenger);
  assert.equal(owner.status, 200);
  assert.equal(owner.body.ticket.qrPayload, result.body.ticket.qrPayload);
  assert.ok(
    (await request('/', passenger)).body.tickets.some(
      (t) => t.id === result.body.ticket.id
    )
  );
  assert.ok(
    (await request('/', passenger)).body.tickets.every(
      (t) => !t.qrPayload && !t.qrToken
    )
  );
});

test('parallel confirmation and later retries issue one ticket per quote', async () => {
  const q = await quote();
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      request('/purchase', passenger, { quoteId: q.id })
    )
  );
  assert.ok(results.every((r) => [200, 201].includes(r.status)));
  assert.equal(new Set(results.map((r) => r.body.ticket.id)).size, 1);
  assert.equal(await Ticket.countDocuments({ quoteId: q.id }), 1);
  await TicketQuote.updateOne({ _id: q.id }, { expiresAt: new Date(0) });
  assert.equal(
    (await request('/purchase', passenger, { quoteId: q.id })).body.ticket.id,
    results[0].body.ticket.id
  );
});

test('expired quotes, foreign quotes, and withdrawn journeys cannot issue new tickets', async () => {
  const q = await quote();
  assert.equal(
    (await request('/purchase', other, { quoteId: q.id })).status,
    404
  );
  await TicketQuote.updateOne({ _id: q.id }, { expiresAt: new Date(0) });
  assert.equal(
    (await request('/purchase', passenger, { quoteId: q.id })).status,
    409
  );
  const withdrawn = await quote();
  await TicketJourney.updateOne({ _id: journey._id }, { active: false });
  assert.equal(
    (await request('/purchase', passenger, { quoteId: withdrawn.id })).status,
    409
  );
  await TicketJourney.updateOne({ _id: journey._id }, { active: true });
});

test('verification rejects passengers, malformed QR, unknown tokens, and premature redemption', async () => {
  const ticket = await issue();
  assert.equal(
    (await request('/verify', passenger, { payload: ticket.qrPayload })).status,
    403
  );
  assert.equal(
    (await request('/redeem', passenger, { payload: ticket.qrPayload })).status,
    403
  );
  assert.equal(
    (await request('/verify', verifier, { payload: 'random passenger data' }))
      .status,
    400
  );
  assert.equal(
    (
      await request('/verify', verifier, {
        payload: `TL1:${randomBytes(32).toString('hex')}`,
      })
    ).status,
    404
  );
  const preview = await request('/verify', verifier, {
    payload: ticket.qrPayload,
  });
  assert.equal(preview.body.ticket.status, 'Upcoming');
  assert.equal(preview.body.eligible, false);
  assert.equal(
    (await request('/redeem', verifier, { payload: ticket.qrPayload })).status,
    409
  );
});

test('preview does not consume a ticket; simultaneous redemption succeeds exactly once', async () => {
  const ticket = await issue();
  await Ticket.updateOne(
    { _id: ticket.id },
    { validFrom: new Date(Date.now() - 60000) }
  );
  const preview = await request('/verify', verifier, {
    payload: ticket.qrPayload,
  });
  assert.equal(preview.body.eligible, true);
  assert.equal(preview.body.ticket.status, 'Active');
  assert.equal((await Ticket.findById(ticket.id)).status, 'Active');
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      request('/redeem', verifier, { payload: ticket.qrPayload })
    )
  );
  assert.equal(results.filter((r) => r.status === 200).length, 1);
  assert.equal(results.filter((r) => r.status === 409).length, 3);
  assert.equal(
    (await request(`/${ticket.id}`, passenger)).body.ticket.status,
    'Used'
  );
  assert.ok((await Ticket.findById(ticket.id)).usedAt);
});

test('expired tickets remain retrievable and cannot be redeemed', async () => {
  const ticket = await issue();
  await Ticket.updateOne(
    { _id: ticket.id },
    {
      validFrom: new Date(Date.now() - 120000),
      validUntil: new Date(Date.now() - 60000),
    }
  );
  assert.equal(
    (await request(`/${ticket.id}`, passenger)).body.ticket.status,
    'Expired'
  );
  assert.equal(
    (await request('/verify', verifier, { payload: ticket.qrPayload })).body
      .eligible,
    false
  );
  assert.equal(
    (await request('/redeem', verifier, { payload: ticket.qrPayload })).status,
    409
  );
});

test('travel now issues an immediately usable ticket with a usable quote window', async () => {
  const result = await request('/quotes', passenger, {
    journeyId: String(journey._id),
    ticketType: 'standard',
    departureAt: 'now',
  });
  assert.equal(result.status, 201);
  assert.ok(new Date(result.body.quote.expiresAt) > new Date());
  const issued = await request('/purchase', passenger, {
    quoteId: result.body.quote.id,
  });
  assert.equal(issued.status, 201);
  assert.equal(issued.body.ticket.status, 'Active');
  assert.equal(
    (
      await request('/verify', verifier, {
        payload: issued.body.ticket.qrPayload,
      })
    ).body.eligible,
    true
  );
});

test('memory demo catalogue loads without replacing accounts or existing tickets', async () => {
  const count = await Ticket.countDocuments();
  process.env.USE_MEMORY_DB = 'true';
  await loadTicketCatalogue();
  assert.equal(await TicketJourney.countDocuments({ code: /^DEMO-/ }), 7);
  assert.equal(await User.countDocuments(), 3);
  assert.equal(await Ticket.countDocuments(), count);
  assert.ok(await TicketJourney.exists({ _id: journey._id }));
  await loadTicketCatalogue();
  assert.equal(await TicketJourney.countDocuments({ code: /^DEMO-/ }), 7);
});

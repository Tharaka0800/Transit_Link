# TransitLink Backend

This Express server powers online ticket accounts, journey search, bus departures, seat holds, bookings, and QR verification using MongoDB and JWT authentication. The frontend uses local AsyncStorage for its offline profiles, notifications, saved routes, and Officer incidents. **The backend must run for online ticket features.**

## Setup

1. Run `npm install` in this directory.
2. Configure `backend/.env` using [.env.example](.env.example) as a reference. Preserve the workspace's existing configuration when available.
3. Start your MongoDB instance, or set `USE_MEMORY_DB=true` to use the existing in-memory demo database.
4. Run `npm run dev` for the watched development server, or `npm start`. The default port is 5000. No TypeScript build is required.

`USE_MEMORY_DB=true` or `AUTO_SEED=true` initializes the existing demo accounts and notifications. An in-memory database is reset when the server restarts. The initial run may download a MongoDB binary.

Demo login: `tharukee01@gmail.com` / `password123`.

Run `npm run seed` to reset and repopulate the configured demo database. This command clears the existing demo collections.

## Routes

This table covers account and notification endpoints. Ticket endpoints are documented in [TICKETING.md](../TICKETING.md#api); seat endpoints are described below. Online QR verification uses the seeded admin account (`admin@transitlink.lk` / `admin123`), available in memory mode or with `AUTO_SEED=true`. Local Officer login does not authorize this API.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | API health message |
| POST | `/api/users/register` | Register an account |
| POST | `/api/users/login` | Sign in and receive a JWT |
| GET | `/api/users/profile` | Read the signed-in user's profile |
| PUT | `/api/users/profile` | Update profile information |
| DELETE | `/api/users/profile` | Delete the signed-in account |
| GET | `/api/notifications` | Read notifications and unread count; optional `type` filter |
| POST | `/api/notifications` | Create a notification |
| PUT | `/api/notifications/:id` | Mark a notification as read |
| DELETE | `/api/notifications/:id` | Dismiss a notification |

Profile and notification routes require `Authorization: Bearer <login token>`. Their controllers, models, and middleware retain the existing behavior.

Set EXPO_PUBLIC_API_URL in frontend/.env to this server origin (without /api) for online ticket accounts and booking. Sign in locally as officer@transitlink.lk to use offline Officer CRUD. Online QR verification requires the backend admin account. Offline profile and notification screens do not call this server.

## Demo ticket journeys

`data/ticket-journeys.demo.json` contains 26 sample bus and train journeys, including return routes and destinations such as Kandy, Galle, Negombo, Matara, Kurunegala, Badulla, Moratuwa, and Jaffna. Fares and durations are university demo values, not published operator prices or timetables.

For persistent MongoDB, add or update these journeys without resetting accounts or tickets:

```bash
npm run tickets:import -- data/ticket-journeys.demo.json
```

With `USE_MEMORY_DB=true`, this catalogue loads automatically when the backend starts. Its database resets on restart. Journey listing and ticket booking require a signed-in session.

## Group bookings

Fare quotes accept an integer `passengerCount` from 1 to 10 (default 1). `fareMinor` is the fare per passenger; `totalFareMinor` is calculated by the server. Confirmation returns a `tickets` array with an independent reference and QR for each passenger, plus the first `ticket` for compatibility. Each ticket includes its booking ID and passenger number. All tickets are owned by the booking account; companion names and age-based fares are not collected yet.

Restart the backend after installing this change. Startup preserves existing tickets and replaces the unique quote index with a unique quote/passenger index. Retries reuse the same quote, recover interrupted issuance, and avoid duplicate tickets. Payment remains a university demo.

## Bus seat selection

`GET /api/tickets/journeys/:journeyId/trips` returns bus departures with live seat status and availability counts. The demo has 20 seats in five rows (A/B, aisle, C/D), and sample departures at 08:00, 12:00, 16:00, and 20:00 Asia/Colombo time over the next seven days. These are simulated services, not operator timetables. Trip records are created once per journey/departure and persisted in MongoDB.

Bus fare quotes require a `tripId` and a `seats` array with 1–10 distinct labels. The server derives passenger count from the seats, uses the trip departure time, and holds the entire selection atomically until quote expiry (up to five minutes). Occupied seats and unexpired holds cannot be selected by another booking. Expired holds become available automatically without waiting for cleanup.

Confirmation atomically assigns the held seats to the booking before issuing one ticket/QR per seat. Safe retries recover interrupted issuance. `POST /api/tickets/quotes/:quoteId/release` releases the signed-in user's unconfirmed hold when editing; it cannot release booked seats. Ticket responses include `seatLabel`, `busName`, and `tripId`. Train booking retains the passenger counter and its existing travel-time selection.

## Validation

```bash
npm run test:tickets
```

All 19 backend tests passed on October 9, 2026. Integration tests use a separate temporary MongoDB database and do not connect to the configured team database. They cover authentication, ownership, quotes, group issuance, seat holds, retries, demo payments, and single-use QR redemption.

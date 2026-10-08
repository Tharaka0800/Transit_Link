# TransitLink account and notification backend

This Express server supports the existing login, registration, profile, and notification features using MongoDB and JWT authentication. The Transport Officer dashboard uses AsyncStorage on the device and does not connect to this server.

## Setup

1. Run `npm install` in this directory.
2. Configure `backend/.env` using [.env.example](.env.example) as a reference. Preserve the workspace's existing configuration when available.
3. Start your MongoDB instance, or set `USE_MEMORY_DB=true` to use the existing in-memory demo database.
4. Run `npm run dev` for the watched development server, or `npm start`. The default port is 5000. No TypeScript build is required.

`USE_MEMORY_DB=true` or `AUTO_SEED=true` initializes the existing demo accounts and notifications. An in-memory database is reset when the server restarts. The initial run may download a MongoDB binary.

Demo login: `tharukee01@gmail.com` / `password123`.

Run `npm run seed` to reset and repopulate the configured demo database. This command clears the existing demo collections.

## Routes

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

The frontend backend URL setting applies to account, notification, journey search, and ticket booking routes. Use **Open Officer Dashboard** on the login screen to demonstrate Officer CRUD without starting a backend or signing in. Officer validation commands are documented in [frontend/README.md](../frontend/README.md).

## Demo ticket journeys

`data/ticket-journeys.demo.json` contains 26 sample bus and train journeys, including return routes and destinations such as Kandy, Galle, Negombo, Matara, Kurunegala, Badulla, Moratuwa, and Jaffna. Fares and durations are university demo values, not published operator prices or timetables.

For persistent MongoDB, add or update these journeys without resetting accounts or tickets:

```bash
npm run tickets:import -- data/ticket-journeys.demo.json
```

With `USE_MEMORY_DB=true`, this catalogue loads automatically when the backend starts. Its database resets on restart. Journey listing and ticket booking require a signed-in session.

## Group bookings

Fare quotes accept an integer `passengerCount` from 1 to 10 (default 1). `fareMinor` is the fare per passenger; `totalFareMinor` is calculated by the server. Confirmation returns a `tickets` array with an independent reference and QR for each passenger, plus the first `ticket` for compatibility. Each ticket includes its booking ID and passenger number. All tickets are owned by the booking account; companion names and age-based fares are not collected yet.

Restart the backend after installing this change. Startup preserves existing tickets and replaces the unique quote index with a unique quote/passenger index. Retries reuse the same quote, recover interrupted issuance, and avoid duplicate tickets. Payment remains a university demo and does not reserve seats.

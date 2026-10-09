# TransitLink

TransitLink is a university transit prototype built with Expo SDK 51, React Native, Expo Router, Express, and MongoDB. It combines bus and route demonstrations, digital ticket booking, local passenger accounts, and Transport Officer incident management.

## Features

| Area | Features | Requirements |
| --- | --- | --- |
| Routes and buses | Route search and filters, bus map, status, ETA, saved routes, fare calculator | Bundled demo data; internet for map tiles |
| Digital tickets | Bus seats, train/group booking, scheduling, history, QR display and verification | Running backend and MongoDB |
| Passenger accounts | Registration, login, profiles, notifications, settings, support reports | Local device storage |
| Officer dashboard | Create, read, edit, and resolve incidents | Local Officer account |

Bus positions, ETAs, fares, and schedules are illustrative. Payments are simulated and collect no funds. Local app accounts and online ticket accounts are separate.

## Run the frontend

From the repository root:

```bash
cd frontend
npm install
npx expo start
```

Press `w` for web or `a` for an Android emulator. Native testing requires an Expo SDK 51-compatible Expo Go client or development build. Custom native clients must include the camera and WebView dependencies. Metro must be reachable to load the development app.

Local accounts, Officer alerts, route search, and bus details do not require the backend. The map needs internet for Leaflet and OpenStreetMap tiles.

## Enable online tickets

In another terminal, from the repository root:

```bash
cd backend
npm install
```

Create `backend/.env` from [backend/.env.example](backend/.env.example) if it does not already exist. Configure a private `JWT_SECRET` and choose a database mode:

- **Demo:** set `USE_MEMORY_DB=true`. Accounts and ticket journeys load automatically. Database contents reset on server restart; the first run may download a MongoDB binary.
- **Persistent:** set `USE_MEMORY_DB=false` and configure `MONGO_URI`. Import journeys with `npm run tickets:import -- data/ticket-journeys.demo.json`. Register an online account in the app. `AUTO_SEED=true` can initialize demo accounts.

Start the server:

```bash
npm run dev
```

The default port is `5000`. For a physical phone, set `EXPO_PUBLIC_API_URL` in `frontend/.env` to the computer's reachable LAN address, such as `http://192.168.1.10:5000`, without `/api`. Restart Expo after changing it. Defaults are `http://10.0.2.2:5000` on Android and `http://localhost:5000` on web/iOS simulator.

Open **Tickets > Sign in** to register or sign in online. Local registration does not create a backend account. QR verification requires an online admin account; the local Officer role does not grant backend access.

## Local demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |
| Transport officer | `officer@transitlink.lk` | `OfficerDemo@2026` |

Accounts initialize when local storage is first created. Officer login opens SmartBus Dashboard; other roles open Home. Online demo accounts depend on backend seeding; see [backend setup](backend/README.md).

## Demonstration

1. Open **Home > Find Routes > Search Routes**. Search Colombo Fort to Kandy, open Bus 154's status, then view its arrival time. **Open Bus Map** lists all demo buses.
2. Sign in locally, edit a profile, manage notifications, and add a sample saved route. Restart to check persistence.
3. Start the backend, sign in through Tickets, choose a journey and seats/passenger count, and confirm a demo purchase. View the tickets and QR codes.
4. Choose **Verify ticket QR** from Tickets and sign in with an online admin account. Preview a QR/manual token, then explicitly mark it used.
5. Sign in locally as Officer. Create an alert, edit it, and choose **Resolve** to remove it.

## Validation

```bash
cd frontend
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
cd ../backend
npm run test:tickets
```

Checks on October 9, 2026 passed TypeScript, 183 frontend tests across 16 suites, and 19 backend tests. Web, Android, and iOS JavaScript exports passed for the restored bus demo. Export success is not native device testing.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/src/app` | Expo Router pages and navigation |
| `frontend/src/screens` | Passenger, bus, ticket, and Officer screens |
| `frontend/src/components` | Shared controls, map, and ticket components |
| `frontend/src/data` | Bus and fare demo data |
| `frontend/src/services` | Local storage and online ticket clients |
| `frontend/src/utils` | Officer storage and ticket helpers |
| `backend` | Express API, MongoDB models, catalogue, and tests |

## Documentation and limitations

- [Frontend setup and demonstration guide](frontend/README.md)
- [Backend setup and booking API](backend/README.md)
- [Ticketing design, verification, and limitations](TICKETING.md)

Local records do not synchronize across installations. Clearing app storage removes them. Bus locations and ETAs are fixed demo values. Password recovery, live GPS tracking, real payments, and production role provisioning are outside the implemented scope. Officer metrics are static; support reports are saved locally.

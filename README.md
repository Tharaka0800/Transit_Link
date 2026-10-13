# TransitLink

TransitLink is a university transit prototype built with Expo SDK 51, React Native, Expo Router, and AsyncStorage. The legacy Express/MongoDB backend is retained separately. It combines bus and route demonstrations, digital ticket booking, local passenger accounts, and Transport Officer incident management.

## Features

| Area | Features | Requirements |
| --- | --- | --- |
| Routes and buses | Route search and filters, bus map, status, ETA, saved routes, fare calculator | Bundled demo data; internet for map tiles |
| Digital tickets | Bus seats, train/group booking, scheduling, history, QR display and verification | Local ticket storage; verification on the same installation |
| Passenger accounts | Registration, login, profiles, notifications, settings, support reports | Local device storage |
| Officer dashboard | Create, read, edit, and resolve incidents | Local Officer account |

Bus positions, ETAs, fares, and schedules are illustrative. Payments are simulated and collect no funds. Main app accounts and local ticket accounts are separate.

## Run the frontend

From the repository root:

```bash
cd frontend
npm install
npx expo start
```

Press `w` for web or `a` for an Android emulator. Native testing requires an Expo SDK 51-compatible Expo Go client or development build. Custom native clients must include the camera and WebView dependencies. Metro must be reachable to load the development app.

Local accounts, Officer alerts, route search, and bus details do not require the backend. The map needs internet for Leaflet and OpenStreetMap tiles.

## Local tickets

Open **Tickets > Sign in** and register a local ticket account, or use one of the passenger demo accounts below. Tickets, seat holds, purchases, and history persist in AsyncStorage without a backend. QR verification requires the separate ticket admin login: `admin@transitlink.lk` / `admin123`.

Tickets and seat availability are scoped to one installation. Only tickets created on that installation can be verified; devices do not synchronize bookings or consumption. Main app registration and ticket registration remain separate. MongoDB accounts and tickets are not automatically imported, and the retained backend/database are not modified. `EXPO_PUBLIC_API_URL` is no longer used by the app's ticket flows. See [ticketing details](TICKETING.md).

## Local demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |
| Transport officer | `officer@transitlink.lk` | `OfficerDemo@2026` |

Accounts initialize when local storage is first created. Officer login opens SmartBus Dashboard; other roles open Home. Passenger and admin ticket demo accounts initialize separately when ticket storage is first created.

## Demonstration

1. Open **Home > Find Routes > Search Routes**. Search Colombo Fort to Kandy, open Bus 154's status, then view its arrival time. **Open Bus Map** lists all demo buses.
2. Sign in locally, edit a profile, manage notifications, and add a sample saved route. Restart to check persistence.
3. Sign in through Tickets, choose a journey and seats/passenger count, and confirm a demo purchase. View the tickets and QR codes.
4. Choose **Verify ticket QR** from Tickets and sign in with the local admin ticket account on the same installation. Preview a QR/manual token, then explicitly mark it used.
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

On October 13, 2026, the AsyncStorage ticket migration passed TypeScript, all 196 frontend tests across 16 suites, and Android JavaScript export. APK/device testing is still required. Legacy backend tests are optional and were not rerun for this frontend migration.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/src/app` | Expo Router pages and navigation |
| `frontend/src/screens` | Passenger, bus, ticket, and Officer screens |
| `frontend/src/components` | Shared controls, map, and ticket components |
| `frontend/src/data` | Bus and fare demo data |
| `frontend/src/services` | Local account and ticket storage |
| `frontend/src/utils` | Officer storage and ticket helpers |
| `backend` | Retained legacy Express/MongoDB API and tests |

## Documentation and limitations

- [Frontend setup and demonstration guide](frontend/README.md)
- [Legacy backend setup and booking API](backend/README.md)
- [Ticketing design, verification, and limitations](TICKETING.md)

Local records do not synchronize across installations. Clearing app storage removes them. Bus locations and ETAs are fixed demo values. Password recovery, live GPS tracking, real payments, and production role provisioning are outside the implemented scope. Officer metrics are static; support reports are saved locally.

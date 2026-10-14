# TransitLink

TransitLink is a university transit prototype built with Expo SDK 51, React Native, Expo Router, and AsyncStorage. The legacy Express/MongoDB backend is retained separately. It combines bus and route demonstrations, digital ticket booking, local passenger accounts, and Transport Officer incident management.

## Features

| Area | Features | Requirements |
| --- | --- | --- |
| Routes and buses | Route search and filters, bus map, status, ETA, saved routes, fare calculator | Bundled demo data; internet for map tiles |
| Digital tickets | Bus seats, train/group booking, scheduling, history, QR display and verification | Local ticket storage; verification on the same installation |
| Passenger accounts | Registration, login, profiles, notifications, settings, support reports | Local device storage |
| Admin workspace | Dashboard, ticket search, users, support, routes/fares, activity, backup/restore | Local Admin account |
| Officer dashboard | Create, read, edit, and resolve incidents | Local Officer account |

Bus positions, ETAs, fares, and schedules are illustrative. Payments are simulated and collect no funds. Profiles and tickets use the same main app account.

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

Sign in once using the main app login, then open **Tickets**. You can also sign in or register through Tickets; this uses the same app account. Tickets, seat holds, purchases, and history persist in AsyncStorage without a backend. QR and ticket-code verification accepts Admin or Transport Officer accounts; the admin demo account is: `admin@transitlink.lk` / `admin123`.

Tickets and seat availability are scoped to one installation. Only tickets created on that installation can be verified; devices do not synchronize bookings or consumption. Account registration, profile changes, and logout are shared between profiles and tickets. MongoDB accounts and tickets are not automatically imported, and the retained backend/database are not modified. `EXPO_PUBLIC_API_URL` is no longer used by the app's ticket flows. See [ticketing details](TICKETING.md).

## Local demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |
| Transport officer | `officer@transitlink.lk` | `OfficerDemo@2026` |

Accounts initialize when local storage is first created. Officer login opens SmartBus Dashboard; Admin login opens the Admin workspace; passengers open Home. The same passenger and admin accounts are used for tickets. Legacy local ticket-only passengers can sign in with their old credentials to upgrade and link their ticket history. Matching email addresses alone do not transfer ticket ownership.

## Demonstration

1. Open **Home > Find Routes > Search Routes**. Search Colombo Fort to Kandy, open Bus 154's status, then view its arrival time. **Open Bus Map** lists all demo buses.
2. Sign in locally, edit a profile, manage notifications, and add a sample saved route. Restart to check persistence.
3. Sign in through Tickets, choose a journey and seats/passenger count, and confirm a demo purchase. View the tickets and QR codes.
4. Choose **Verify ticket QR** from Tickets and sign in with the admin app account on the same installation. Preview a QR/manual token, then explicitly mark it used.
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
| `frontend/src/data` | Initial bus/journey demo data; Admin edits persist locally |
| `frontend/src/services` | Local account and ticket storage |
| `frontend/src/utils` | Officer storage and ticket helpers |
| `backend` | Retained legacy Express/MongoDB API and tests |

## Documentation and limitations

- [Admin workspace and backup guide](ADMIN.md)
- [Frontend setup and demonstration guide](frontend/README.md)
- [Legacy backend setup and booking API](backend/README.md)
- [Ticketing design, verification, and limitations](TICKETING.md)

Local records do not synchronize across installations. Clearing app storage removes them. Bus locations and ETAs are fixed demo values. Password recovery, live GPS tracking, real payments, and production role provisioning are outside the implemented scope. Officer bus/route counts use the demo catalogue; urgent-alert and affected-route counts use saved incidents. On-time and rerouting data are unavailable; support reports and Admin replies are saved locally. See [Admin guide](ADMIN.md) for account management, the shared journey catalogue, audit history, and backup/restore.

Shared-account and Officer-metric changes on October 14, 2026 passed TypeScript, all 204 tests across 16 suites, and Android JavaScript export. Device/APK testing remains required.

Admin implementation checks on October 14, 2026 passed TypeScript, 229 tests across 18 suites, and Android/iOS/web JavaScript exports. Native sharing, camera, and storage still require a rebuilt APK/device smoke test.

Transport Officers can now preview and validate tickets using native QR scanning or the complete `TL-` ticket code printed in ticket details. Manual `TL1:` QR tokens are also supported. Admin retains verification access; passengers are denied. Both methods consume the same ticket only once and record the verifier. Tickets must exist on the same installation; cross-phone verification is not supported by local storage.

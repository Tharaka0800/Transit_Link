# TransitLink Frontend

Expo SDK 51 / React Native app using Expo Router. It combines route and bus demonstrations, local tickets, local accounts, and Officer incident management. See the [project overview](../README.md) for full setup.

## Setup

From the repository root:

```bash
cd frontend
npm install
npx expo start
```

Press `w` for web or `a` for an Android emulator. Use an SDK 51-compatible Expo Go client or development build. Rebuild custom native clients when adding native dependencies such as WebView or camera. Metro must be reachable to load the development bundle.

The entry point is `expo-router/entry`; pages live in `src/app`. Tabs are Home, Routes, Tickets, Profile, and Officer for local officers only. Bus details, arrival times, ticket screens, and alert forms open above the tabs.

## Connectivity and accounts

| Feature | Requirement |
| --- | --- |
| Local login, profiles, notifications, saved routes, support, Officer alerts | Device storage; no backend |
| Route search, bus list, status, ETA | Bundled demo data; no backend |
| Bus map | Internet for Leaflet and OpenStreetMap |
| Ticket accounts, tickets, seats, QR verification | Device storage; verification on the same installation |

Profiles and tickets use the same local account and session. Registration, profile updates, account switching, and logout apply throughout the app. Account deletion removes that owner's ticket records. Officer roles do not authorize ticket QR verification; use the admin app account `admin@transitlink.lk` / `admin123`.

No backend or API URL is required for the app. Ticket records and seats are local to each installation and never synchronize across devices. Existing MongoDB accounts/tickets are not automatically imported. The retained [legacy backend](../backend/README.md) remains available separately.

## Local demo login

| Role | Email | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |
| Transport officer | `officer@transitlink.lk` | `OfficerDemo@2026` |

Accounts initialize only when the local database is missing. Registration creates passengers; login accepts email or phone. Sessions persist until logout or account deletion. Officers open SmartBus Dashboard directly; other roles open Home. The Officer tab and alert form reject other roles. Built-in Officer credentials, role, and deletion are protected.

## Routes, map, bus status, and ETA

1. Open **Home > Find Routes > Search Routes**.
2. Search **Colombo Fort** to **Kandy**. Filter by All, Express, or Normal. Unmatched locations show an empty result. Swap reverses the fields; reverse services are not included in this demo catalogue.
3. Choose **View bus status** on Bus 154. Review the map, next stop, speed, seats, and ETA. Choose **View arrival time**.
4. Return to Routes and choose **Open Bus Map** to see all three demo buses. Select a bus from the list for its details.

Coordinates, speeds, seat labels, and ETAs are fixed values in `src/data/buses.js`, without GPS updates. Maps use an iframe on web and WebView on native. Bus details remain available if external map resources fail. Results without corresponding bus data show that status is unavailable.

The existing Favourite Routes list remains available. Choose **+ > Add Sample** to save a sample route, tap it for details, or toggle its favourite status. Fare Information opens the separate demo calculator.

## Digital tickets and payments

1. Open **Tickets > Sign in** and register or use the same main app passenger account. If already signed in, no additional login is required.
2. Choose **New Ticket**, a bus/train journey, and ticket type.
3. For buses, choose **Choose bus & seats**, a departure, and up to 10 seats. For trains, choose passenger count and travel time.
4. Review the quote, select Transit Smart Balance, Card, or Mobile Wallet, and confirm the demo purchase.
5. View each passenger's ticket, reference, seat when applicable, and QR in My Tickets. Used/expired tickets appear in History.
6. Choose **Verify ticket QR** from Tickets and sign in as the admin app account on the same installation. Scan on native or enter the complete manual token. Preview does not consume a ticket; explicitly validate to mark it used.

Seats use a 2+2 layout: white available, blue selected, grey occupied, green held by another booking. Availability refreshes every 15 seconds while the picker is open. Reviewing holds seats for up to five minutes; editing releases the hold. Each passenger receives an independent ticket and QR. Confirmation retries reuse the quote to avoid duplicate issuance.

Payments collect no credentials or funds. Fares, schedules, and vehicles are demo data. Tickets work offline. Verification only recognizes tickets created on this installation; no bookings are shared between devices. See [ticketing details](../TICKETING.md).

## Local persistence

Profiles, notifications, saved routes, and support reports persist on the device. Notifications and saved routes belong to the signed-in account. `src/services/LocalAppStorage.ts` uses `@transitlink_app_v1`; ticket quotes, seat bookings, and history use `@transitlink_tickets_v1`. Obsolete online credentials are never accepted as local ticket sessions. Passwords use salted bcrypt hashes and secure randomness from `expo-crypto`.

Account deletion removes related local records and session while preserving Officer incidents. Storage operations are serialized; malformed data and storage errors do not overwrite existing records. Empty collections remain empty. Obsolete backend sessions are discarded; older backend users must register locally for local features.

Data does not synchronize across installations. Clearing storage removes it. Role checks protect normal navigation rather than device-storage tampering. Password recovery sends no email; support reports stay local.

## Officer incidents

Sign in locally as `officer@transitlink.lk`:

1. Read persisted incidents, newest first.
2. Choose **+ New Alert**, enter Bus ID, Route, Delay Time, and status, then **Create Alert**.
3. Choose **Edit**, change fields/status, then **Save Changes**.
4. Choose **Resolve** to delete an incident.

`src/utils/OfficerStorage.ts` uses `@transit_incidents`. Samples initialize only when the key is missing. Deleting all alerts preserves an empty list after restart. Edits retain IDs and timestamps. Screens include validation, retries, and duplicate-action protection. Dashboard demo bus/route counts come from the bundled catalogue. Urgent Alerts counts saved urgent incidents; Delay Hotspots counts distinct routes with unresolved alerts. On Time and Rerouting show Unavailable because no measurement data exists.

## Validation

Run from `frontend`:

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

On October 13, 2026, TypeScript, all 196 tests across 16 suites, and Android JavaScript export passed for local ticket storage. Tests cover local accounts/storage, Officer CRUD/access, ticket flows/seats/QR, storage failures, route search, selected-bus navigation, and invalid bus IDs.

Exports validate bundling, not device behavior. The restored map still needs manual browser/device checks for external loading. Check camera permissions on target devices.

Manual checks:

1. Search routes, try empty results, load the map, and navigate from bus status to ETA.
2. Sign in locally and verify profile, notification, and saved-route persistence after restart.
3. Create/edit/resolve an Officer alert and verify persistence. Other roles should have no Officer tab.
4. Book seats offline, restart and check tickets persist, then verify the manual QR token with the admin app account on the same installation.
5. Check narrow screens, keyboard behavior, and Back navigation on target devices.

## Screen files

| Area | File |
| --- | --- |
| Login / Register / Forgot | `src/screens/Login.js` |
| Home | `src/screens/Home.js` |
| Saved routes | `src/screens/RoutesScreen.js` |
| Search / Map / Status / ETA | `src/screens/BusDemoScreens.js` |
| Profile / Edit / Settings | `src/screens/Profile.js` |
| Notifications / Support | `src/screens/Notifications.js`, `src/screens/HelpSupport.js` |
| Fare calculator | `src/screens/FareInformation.js` |
| Ticket list / Purchase / Details | `src/screens/MyTicketsScreen.tsx`, `src/screens/TicketPurchaseScreen.tsx`, `src/screens/TicketDetailsScreen.tsx` |
| Local ticket login / QR verification | `src/screens/TicketLoginScreen.tsx`, `src/screens/TicketVerificationScreen.tsx` |
| Officer / Alert form | `src/app/(tabs)/officer-dashboard/index.tsx`, `src/app/officer-dashboard/add-alert.tsx` |

Shared-account and Officer-metric changes on October 14, 2026 passed TypeScript, all 204 tests across 16 suites, and Android JavaScript export. Device/APK testing remains required.

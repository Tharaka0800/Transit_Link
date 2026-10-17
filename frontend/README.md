# TransitLink Frontend (Expo / React Native)

TransitLink runs on Expo SDK 51. Accounts, sessions, profiles, notifications, saved routes, and Officer alerts use AsyncStorage exclusively. No backend URL, database configuration, or internet connection is needed for these operations.

## Setup

```bash
cd frontend
npm install
npx expo start
```

Press `a` for Android or `w` for web. Use an SDK 51-compatible Expo Go client or development build. Metro must be reachable to load the development bundle; the loaded app performs local account and Officer operations offline. Online tickets need a reachable backend. A standalone build can launch without Metro.

The entry point is `expo-router/entry`. Routes live in `src/app`; existing screen implementations remain in `src/screens`. Tabs are Home, Routes, Tickets, Profile, and Officer for signed-in officers only. The alert form opens in the root stack above the tabs.

## Offline authentication

| Role | Email / username | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |
| Transport officer | `officer@transitlink.lk` | `OfficerDemo@2026` |

Demo accounts initialize only when the database is missing. Registration creates passengers and checks required fields, unique email addresses, and unique non-empty phone numbers. Login accepts the existing email/phone field and verifies a salted bcrypt hash locally. Sessions persist until logout or account deletion.

Officers open SmartBus Dashboard directly; passengers and admins open Home. The **Open Officer Dashboard** shortcut has been removed. Both Officer screens reject unauthorized direct links before mounting their contents, and the Officer tab is hidden for guests and other roles. The local account record supplies the role; profile forms cannot change it.

The built-in Officer account's email, password, role, and deletion are protected so these credentials remain available. Password recovery is unavailable in this local prototype; no reset email is sent.

## Local database and migration

`src/services/LocalAppStorage.ts` stores users, notifications, saved routes, and the active session in a versioned database at `@transitlink_app_v1`. `src/services/api.js` retains original service names and `{ data }` response shapes, but performs local operations. Passwords use asynchronous bcrypt at cost 10 with secure randomness from `expo-crypto`; plaintext passwords are not persisted.

Notifications and saved routes belong to the signed-in account. Profile edits, notification CRUD, unread counts, and route changes persist across restarts. Account deletion removes its related records and session while preserving Officer incidents. Remote default avatars use offline fallbacks. Help & Support reports are saved locally.

Reads, initialization, and mutations are serialized. Malformed data and storage failures report errors without overwriting the existing data. Intentionally empty collections stay empty.

Obsolete backend sessions are discarded. Earlier backend users must register locally again; incident data remains intact. Accounts do not synchronize across devices or browsers. Clearing application data removes the local database. Access checks restrict normal app navigation rather than device-storage tampering.

## Officer dashboard CRUD

Sign in as the Officer and demonstrate:

1. **Read:** review persisted incidents, newest first.
2. **Create:** choose **+ New Alert**, enter Bus ID, Route, and Delay Time, choose a status, then **Create Alert**.
3. **Update:** choose **Edit**, change fields/status, then **Save Changes**.
4. **Delete:** choose **Resolve** to remove an incident.

Incidents use `src/utils/OfficerStorage.ts` and the separate `@transit_incidents` key. Two samples initialize only when the key is missing, including Bus 154, CMB → KDY, 15m, URGENT. An intentionally stored `[]` stays empty after reload or restart.

New incidents receive unique IDs and numeric creation timestamps; edits preserve both. Updating an unknown ID reports an error; deleting an absent ID is harmless. Loading, focus refresh, retry/empty states, form validation, duplicate-action protection, and stale-response guards remain in place.

Screens reuse the existing theme, Navbar, FormInput, and Button. Status badges use shared red, orange, and green tokens with text labels. Metric values remain static; Delay Hotspots and Rerouting are informational.

Confirmation and validation dialogs use native alerts on Android/iOS and a shared themed modal on web. Logout, account deletion, and saved-route choices work on each platform.

## Validation

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

Tests cover initialization, authentication, role restrictions, sessions, profile CRUD, per-user notifications and saved routes, corrupt storage, concurrency, storage failures, and recovery. Officer tests cover seeding, ordering, unique IDs, immutable metadata, partial edits, deletion, empty-list persistence, focus refresh, validation, missing IDs, duplicate actions, and stale async results.

Offline branch checks recorded on 2026-10-08, before ticket integration:

- TypeScript checking, all 148 tests across 8 suites, SDK dependency checks, and Android/iOS/web exports passed on Expo 51.0.39.
- The production web build passed 34 browser scenarios with nonlocal requests blocked and no API requests. Login, dashboard, and form layouts fit 320px and 390px widths.
- Pixel 7 emulator testing passed registration, passenger login/logout, direct Officer login, and incident Create/Read/Update/Resolve with no active internet connection or account backend. A JavaScript/activity restart restored the Officer session and edited alert.
- Native iOS device testing was unavailable in the Windows environment. Full native process restart was not tested because automatic approval review rejected the ADB force-stop command as "blocked by policy"; persistence passed a JavaScript/activity restart. Native empty-list testing was skipped to preserve existing incidents; browser and unit tests verified it. Development restarts still need Metro to serve the bundle; local authentication and data operations do not.

Manual Pixel 7 offline checks:

1. Load the app with Metro available, then disable internet access on the device.
2. Register a passenger. Verify Home opens and the Officer tab is absent.
3. Restart, check session restoration, and change the profile, notifications, and saved routes.
4. Log out and sign in as Officer. Verify the dashboard opens directly.
5. Create, read, edit, and resolve an alert. Restart to verify persistence. Resolve every alert and restart to verify the empty list remains.
6. As a guest or passenger, attempt direct links to both Officer screens and verify access is denied.
7. Check 320px/390px widths, keyboard avoidance, safe areas, and save/back behavior. Native keyboard and gesture checks require a device or emulator.

## Online ticket accounts and backend

Ticket booking uses src/services/ticketApi.ts with a separate server JWT session. From Tickets, choose Sign in and use your existing backend credentials, or create an online ticket account. This does not replace the local profile or grant a local Officer role. Local logout also clears the online ticket session. Set EXPO_PUBLIC_API_URL in frontend/.env to the reachable backend origin, without /api, and restart Expo. Physical phones must use the computer LAN address, not localhost. Run npm start in backend. Use Verify ticket QR from Tickets and sign in with an online admin account for scanning.

Local accounts and online ticket accounts are separate; creating one does not create the other. Existing backend tickets remain linked to their original backend account.

## Bus seat booking

Open Tickets → New Ticket, choose a bus journey and ticket type, then choose **Choose bus & seats**. Select a demo departure and tap available seats; each selected seat counts as one passenger, up to 10. The screen uses a 2+2 layout with an aisle, driver cabin, row labels, and window-seat labels. White means available, blue selected, grey occupied, and green temporarily held by another booking.

Availability refreshes every 15 seconds while the picker is open. Selection changes update the total; switching departures clears the selection. Reviewing holds seats for up to five minutes, and editing releases the hold. Confirmation creates a separate ticket and QR for each selected seat. Seat numbers appear in My Tickets and ticket details. Restart the backend and reload Expo Go after installing this feature. The schedule, vehicle layout, and fares are demo data; payment is still simulated.

## Demo payment methods

The ticket review screen includes a payment-method selector for Transit Smart Balance, Card, and Mobile Wallet. These options simulate checkout and collect no payment credentials or funds. The selected method is recorded on each ticket and cannot change during an uncertain confirmation retry. Payment Information explains the demo limitation; saved cards, top-ups, wallet authorisation, and promo codes require future payment-provider integration.

## Auth storage

Local sessions use LocalAppStorage. Online ticket sessions use a separate AsyncStorage key, @transitlink_online_ticket_session. Local Officer roles do not authorize backend ticket verification.

## Member 1 map and route demo

From **Home → Find Routes**, choose **Search Routes** or **Open Bus Map**. Saved routes and the fare calculator remain available.

1. Search **Colombo Fort → Kandy**. Filter by All, Express, or Normal. Only matching demo routes appear; other locations show an empty result.
2. Choose **View bus status** on Bus 154, or choose any bus from the map list.
3. Review the map, next stop, speed, seats, and demo ETA. Choose **View arrival time** for the selected bus's ETA screen.
4. Use Back to return to the previous screen. Saved routes, local accounts, Officer alerts, and online ticket booking retain their existing flows.

These screens restore Member 1's original prototype data. Bus coordinates, speeds, seat labels, and ETAs are fixed demo values. Map tiles use OpenStreetMap with Leaflet and require internet access; the demo list and details do not need the backend. On native devices the map uses Expo SDK 51's compatible `react-native-webview`; run `npm install` and restart Expo after pulling this change. Custom development builds need rebuilding for the new native dependency.

## Screen files

| Screen | File |
|--------|------|
| Login / Register / Forgot | `src/screens/Login.js` |
| Home | `src/screens/Home.js` |
| Profile / Edit / Settings | `src/screens/Profile.js` |
| Notifications | `src/screens/Notifications.js` |
| Help & Support | `src/screens/HelpSupport.js` |

## Demo login

- Email: `tharukee01@gmail.com`
- Password: `password123`

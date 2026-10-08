# TransitLink Frontend (Expo / React Native)

TransitLink runs on Expo SDK 51. Accounts, sessions, profiles, notifications, saved routes, and Officer alerts use AsyncStorage exclusively. No backend URL, database configuration, or internet connection is needed for these operations.

## Setup

```bash
cd frontend
npm install
npx expo start
```

Press `a` for Android or `w` for web. Use an SDK 51-compatible Expo Go client or development build. Metro must be reachable to load the development bundle; the loaded app performs authentication and data operations offline. A standalone build can launch without Metro.

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

Verified on 2026-10-08:

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

The retained `backend` directory is reference code and is unused by this frontend.

# TransitLink

TransitLink is an Expo SDK 51 / React Native university prototype. Accounts, sessions, profiles, notifications, saved routes, and Transport Officer incidents persist on the device using AsyncStorage. Login and registration require no internet, external database, or running backend.

## Run the app

```bash
cd frontend
npm install
npx expo start
```

Press `a` for Android or `w` for web. Use an SDK 51-compatible Expo Go client or development build. Metro supplies the development bundle; after loading it, the app's data operations work offline. A standalone build can launch without Metro.

## Demo credentials

| Role | Email / username | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin | `admin@transitlink.lk` | `admin123` |
| Transport officer | `officer@transitlink.lk` | `OfficerDemo@2026` |

Accounts initialize once when the local database is missing. Registration creates passengers. Officer login opens **SmartBus Dashboard** directly. Guests, passengers, and admins cannot open the Officer tab or Add/Edit Alert route. The login screen has no unauthenticated Officer shortcut.

## Local persistence and access

- `frontend/src/services/LocalAppStorage.ts` stores a versioned database at `@transitlink_app_v1`, including users, notifications, saved routes, and the active session.
- `frontend/src/services/api.js` retains existing service methods and `{ data }` responses while performing local operations. It makes no account or notification network requests.
- Passwords are salted bcrypt hashes at cost 10, using secure random values from SDK-compatible `expo-crypto`.
- Sessions restore offline until logout or account deletion. The current account record determines its role; registration and profile forms cannot grant privileged roles.
- Profile edits, notifications, unread counts, and saved routes survive restarts. Notifications and saved routes are scoped to their user.
- Account deletion removes its related data and session while preserving Officer incidents. The built-in Officer account's credentials, role, and deletion are protected.
- Officer CRUD remains in `frontend/src/utils/OfficerStorage.ts`, under `@transit_incidents`. Two samples initialize only when this key is missing. Deleting the last alert preserves an empty list across restarts.
- Storage operations are serialized. Invalid data and failed reads/writes report errors without overwriting stored contents.

Obsolete backend sessions are discarded. Users registered in the earlier backend version must register locally again; Officer incidents are preserved. Data belongs to this device or browser installation and does not synchronize between devices. Clearing application data removes the database. Role checks restrict the prototype's normal app flow; AsyncStorage cannot protect against device-storage tampering.

## Screens and styling

Expo Router controls login, supporting screens, and Home, Routes, Tickets, Profile, and the conditional Officer tab. The alert form opens above the tabs. Existing theme tokens, Navbar, FormInput, Button, typography, padding, and cards remain the styling source.

Officer CRUD provides Read, Create, Update, and Delete (**Resolve**). Its metric values are static prototype values; Delay Hotspots and Rerouting are informational. Password recovery is unavailable in this local prototype. Issue reports are saved locally rather than sent to a support service.

## Validation

```bash
cd frontend
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

See [frontend setup and offline checks](frontend/README.md) for demonstration steps and coverage.

## Repository layout

| Directory | Purpose |
| --- | --- |
| `frontend/src/app` | Expo Router stacks, tabs, and Officer routes |
| `frontend/src/screens` | Passenger/account/support screens |
| `frontend/src/components` | Shared visual controls |
| `frontend/src/services` | Local account, session, notification, and route persistence |
| `frontend/src/utils` | Local Officer incident storage |
| `backend` | Retained Express/MongoDB/JWT reference implementation, unused by the current frontend |

The backend does not need to run. Its original setup and endpoints remain documented in [backend/README.md](backend/README.md).

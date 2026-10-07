# TransitLink Frontend (Expo / React Native)

Mobile client for TransitLink, including the passenger screens and Transport Officer Dashboard.

## Setup

```bash
cd frontend
npm install
npx expo start
```

Then press `a` for Android emulator or `w` for web. This project remains on Expo SDK 51, so native testing requires an SDK 51-compatible Expo Go client or development build.

The entry point is `expo-router/entry`. File routes live in `src/app`, and existing JavaScript screen implementations remain in `src/screens`. The bottom tabs are Home, Routes, Tickets, Profile, and Officer. The Add/Edit Alert form is a root-stack screen with the tab bar hidden.

## Officer dashboard

Open the **Officer** tab after login. It uses the existing theme, Navbar, FormInput, and Button components.

- **Read:** the dashboard lists persisted incident alerts, newest first.
- **Create:** choose **+ New Alert**, enter Bus ID, Route, and Delay Time, select a status, and choose **Create Alert**.
- **Update:** choose **Edit** on an incident, change its fields/status, and choose **Save Changes**.
- **Delete:** choose **Resolve** to remove an incident.

Incidents are stored in Supabase through the authenticated Express API. Start the configured backend before using the dashboard. Create, edit, and resolve operations broadcast a Socket.IO event, so connected dashboards refresh automatically; reconnecting also fetches changes missed while offline. Existing local sample alerts are not uploaded automatically, and an empty database stays empty.

`OfficerApiService.ts` uses the existing Axios client and login token. Its incident types come from `shared/incident.ts`, which is also used by the backend. AsyncStorage continues to hold the login session only.

The metric cards use the requested prototype values. Delay Hotspots and Rerouting are informational cards.

## Validation

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

The API tests cover requests, response validation, error messages, and socket authentication. Dashboard tests cover real-time refresh, reconnection, listener cleanup, and stale responses. Form tests cover validation, create/edit submissions, retained inputs after failures, duplicate submission protection, and stale saves after route changes. Native keyboard, safe-area, and gesture checks still require an Android/iOS device or emulator.

## API base URL

The REST client and Socket.IO share the origin in `src/services/backendConfig.ts`. Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to your Express server origin **without `/api`**, then restart Expo. See [.env.example](.env.example).

- **Android emulator default:** `http://10.0.2.2:5000`
- **iOS simulator/web default:** `http://localhost:5000`
- **Physical device:** your computer's reachable LAN address, for example `http://192.168.1.20:5000`

Ensure the device can reach the backend port. If web runs at a custom origin and the backend sets `CORS_ORIGINS`, include that web origin there. Never put a Supabase server key in an `EXPO_PUBLIC_*` variable.

## Auth storage

JWT and user session are stored with `@react-native-async-storage/async-storage`.

## Screens

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

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

Incidents are stored locally with AsyncStorage under `@transit_incidents`. Two samples are seeded only when this key is missing. An intentionally empty list stays empty after restart. This CRUD flow runs without the backend once you enter the dashboard; authentication and the existing profile/notification screens still use the backend.

The metric cards use the requested prototype values. Delay Hotspots and Rerouting are informational cards.

## Validation

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

The storage tests cover CRUD, initialization, empty-list persistence, concurrent operations, and error recovery. Form tests cover validation, create/edit submissions, retained inputs after failures, duplicate submission protection, and stale saves after route changes. Native keyboard, safe-area, and gesture checks still require an Android/iOS device or emulator.

## API base URL

Configured in `src/services/api.js`:

- **Android emulator:** `http://10.0.2.2:5000/api`
- **iOS simulator:** `http://localhost:5000/api`

Ensure the backend is running on port 5000.

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

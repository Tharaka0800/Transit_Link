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

On a fresh install, choose **Open Officer Dashboard** beneath Login to demonstrate the Officer workload offline. This does not create a login session. Signed-in users can also open the fifth **Officer** tab. The dashboard and form use the existing theme, Navbar, FormInput, and Button components, and the form opens above the tabs.

- **Read:** the dashboard lists persisted incident alerts, newest first.
- **Create:** choose **+ New Alert**, enter Bus ID, Route, and Delay Time, select a status, and choose **Create Alert**.
- **Update:** choose **Edit** on an incident, change its fields/status, and choose **Save Changes**.
- **Delete:** choose **Resolve** to remove an incident.

Incidents are stored exclusively on the device with `@react-native-async-storage/async-storage`, under `@transit_incidents`. No backend, login token, internet connection, or API configuration is required for Officer CRUD. The dashboard loads on mount and refreshes when it regains focus after a save or tab change.

`src/utils/OfficerStorage.ts` defines `IncidentAlert` and exports `getIncidents`, `addIncident`, `updateIncident`, and `deleteIncident`. Reads and mutations are serialized to avoid lost changes. New alerts receive a unique string ID and numeric creation timestamp; edits preserve both. Updating an unknown ID reports an error; deleting an unknown ID is harmless.

Two sample alerts initialize only when the key is missing, including Bus 154, CMB → KDY, 15m, URGENT. An intentionally stored `[]` stays empty after reload/restart. Corrupt stored data and storage failures produce useful errors without replacing existing data. Dashboard retry and form error states let the user retry after the problem is corrected.

Status badges use the existing red and green tokens and the Routes screen's orange token for WARNING. Status selection remains textual and accessible.

The metric cards use the requested prototype values. Delay Hotspots and Rerouting are informational cards.

## Validation

```bash
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

Storage tests cover one-time seeding, sorting, unique creation, partial updates, immutable metadata, deletion, empty-list persistence after module restart, overlapping mutations, malformed data, storage failures, and recovery. Dashboard/form tests cover local loading, focus refresh, validation, missing IDs, duplicate operations, retained inputs after failures, and stale async results. Native keyboard, safe-area, and gesture checks still require an Android/iOS device or emulator.

For a manual offline check, stop the backend, open the login shortcut, create an alert, edit it, and resolve it. Reload the app to check persistence. Resolve every alert and reload again to verify the dashboard stays empty. Check the dashboard and form at 320px and 390px widths, and verify that saving returns to the dashboard.

## Account and notification API base URL

Teammates' account and notification screens continue to use the existing Axios REST client and JWT session. Their origin is configured in `src/services/backendConfig.ts`. Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to your Express server origin **without `/api`**, then restart Expo. See [.env.example](.env.example). This setting does not affect the local Officer feature.

- **Android emulator default:** `http://10.0.2.2:5000`
- **iOS simulator/web default:** `http://localhost:5000`
- **Physical device:** your computer's reachable LAN address, for example `http://192.168.1.20:5000`

Ensure the device can reach the backend port when using account or notification features.

## Bus seat booking

Open Tickets → New Ticket, choose a bus journey and ticket type, then choose **Choose bus & seats**. Select a demo departure and tap available seats; each selected seat counts as one passenger, up to 10. The screen uses a 2+2 layout with an aisle, driver cabin, row labels, and window-seat labels. White means available, blue selected, grey occupied, and green temporarily held by another booking.

Availability refreshes every 15 seconds while the picker is open. Selection changes update the total; switching departures clears the selection. Reviewing holds seats for up to five minutes, and editing releases the hold. Confirmation creates a separate ticket and QR for each selected seat. Seat numbers appear in My Tickets and ticket details. Restart the backend and reload Expo Go after installing this feature. The schedule, vehicle layout, and fares are demo data; payment is still simulated.

## Demo payment methods

The ticket review screen includes a payment-method selector for Transit Smart Balance, Card, and Mobile Wallet. These options simulate checkout and collect no payment credentials or funds. The selected method is recorded on each ticket and cannot change during an uncertain confirmation retry. Payment Information explains the demo limitation; saved cards, top-ups, wallet authorisation, and promo codes require future payment-provider integration.

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

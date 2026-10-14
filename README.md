# TransitLink

TransitLink is a university transit prototype built with Expo SDK 51, React Native, Expo Router, and AsyncStorage. It includes passenger journeys and tickets, an Admin workspace, and Transport Officer incident management and ticket verification.

All account and operational records are stored on the device. The retained Express/MongoDB backend is optional and is not used by the current app. Maps still need internet for Leaflet and OpenStreetMap resources.

## Features and roles

| Role/area | Available features |
| --- | --- |
| Passenger | Registration/login, profiles, notifications, saved routes, support reports, route search, demo bus maps/status/ETA, fare calculation, ticket buying and history |
| Admin | Local dashboard, ticket search/details, user roles and account status, support inbox/replies, shared journey/fare management, activity history, backup/restore, ticket verification, profile/settings and logout |
| Transport Officer | Officer dashboard, create/edit/resolve incident alerts, QR and ticket-code verification; existing passenger navigation remains available |

Admin sees only **Admin** and **Profile** tabs. Passenger pages redirect Admin to its workspace, and personal ticket purchases, saved routes, notifications, and support submission are blocked for Admin. The last active admin cannot be disabled, demoted, or deleted; the built-in Officer account is protected.

Profiles and tickets use one shared local account and session. Registration, account switching, profile changes, and logout apply throughout the app. Role permissions come from the stored account, not the registration form.

## Run the frontend

From the repository root:

```powershell
cd frontend
npm install
npx expo start
```

Press `w` for web or `a` for an Android emulator. Native development requires an Expo SDK 51-compatible Expo Go client or development build. Custom native clients must include the existing camera and WebView dependencies. Metro must be reachable when using a development client.

No backend, MongoDB connection, or `EXPO_PUBLIC_API_URL` is required for current app features. Only external map resources need internet.

## Local demo accounts

| Role | Email | Password | Landing screen |
| --- | --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` | Home |
| Passenger | `passenger.demo@transitlink.lk` | `password123` | Home |
| Admin | `admin@transitlink.lk` | `admin123` | Admin workspace |
| Transport Officer | `officer@transitlink.lk` | `OfficerDemo@2026` | SmartBus Dashboard |

Demo accounts initialize when main account storage is first created. Registration creates passengers. Account data persists between app restarts.

Legacy local ticket-only passenger accounts can sign in with their old credentials to upgrade and link their ticket history. Matching email addresses alone do not transfer ownership; conflicting passwords leave legacy records preserved and unlinked. Existing MongoDB accounts and tickets are not automatically imported.

## Passenger tickets

1. Sign in with a passenger account and open **Tickets**. No second ticket login is needed.
2. Choose a Bus/Train journey and ticket type. For buses, select a departure and 1?10 seats. For trains, choose passenger count and travel time.
3. Review the quote, choose a simulated payment method, and explicitly confirm.
4. View each passenger's ticket, full `TL-` ticket code, seat when applicable, and QR in My Tickets. Used/expired tickets appear in History.

Seat holds last up to five minutes or until departure. Editing releases the hold. Retrying the same purchase quote returns the existing booking. Each passenger gets a distinct ticket and QR. Payments collect no funds.

Route Search, the fare calculator, and ticket quotes read the same local managed journey catalogue. Admin fare edits affect new quotes; issued tickets retain their original fare and journey details. Withdrawing a journey blocks new quotes and unpurchased confirmations. Demo bus positions/ETAs and informational general fares remain illustrative.

## Officer and Admin ticket verification

Officers open **SmartBus Dashboard > Verify Ticket**. Admins open **Admin > Overview > Verify ticket QR**. Both roles use their existing main login; passenger accounts cannot verify tickets.

1. Scan the QR using the native camera, or enter the complete **`TL-` ticket code** shown in ticket details. Manual **`TL1:` QR tokens** are also accepted. Web uses manual entry.
2. Choose **Check ticket** for manual entry, then review the preview. Scanning or checking alone does not consume the ticket.
3. Choose **Validate & mark used**. Only an active, unused ticket within its validity period is accepted.

QR and code verification use the same record, so a ticket can be consumed only once across either method. Validation records the verifier's identity and time in local activity history. Invalid, unknown, future, expired, and used tickets receive an error or an ineligible preview.

**Verification only recognizes tickets stored on the same installation.** A ticket purchased on another phone cannot be verified using AsyncStorage alone. For a local demo, copy a passenger ticket's code, switch to Officer/Admin on that installation, and verify it.

## Admin workspace

Sign in as Admin to access **Overview, Tickets, Users, Support, Routes & fares, Activity, and Backup**.

- Search local tickets by reference, passenger, email, journey, or purchase date; inspect booking details without exposing QR credentials.
- Enable/disable other accounts or promote/demote passenger/admin roles, with confirmation and last-admin protection.
- Review support reports, save their status, and reply. Passengers see replies in notifications and Help & Support report history.
- Add/edit journeys and configured fares, or disable a journey.
- Review administrative changes and ticket validations with actor names and timestamps.
- Export local records, validate a backup, preview its counts, and explicitly confirm restoration.

Backups contain private records, password hashes, and ticket credentials; keep them private. Restore replaces local records, including Officer incidents, and signs users out. Login sessions are excluded from backups. See [Admin guide](ADMIN.md) for sharing, restore validation, and recovery behavior.

## Officer incidents and metrics

Officers can create and edit alerts with Bus ID, Route, Delay Time, and status. **Resolve removes an alert**; incident history is not implemented.

Dashboard bus/route counts use bundled demo data. Urgent Alerts counts saved urgent incidents; Delay Hotspots counts distinct routes with unresolved alerts. On Time and Rerouting show **Unavailable** because measurement data is not implemented. Incident alerts do not automatically update passenger bus positions, ETAs, or notifications.

## Build an Android APK

From `frontend`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

After configuration, add this profile inside the `build` section of `frontend/eas.json`, keeping other profiles:

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

Build with:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Use the download link when the build completes. A standalone APK includes the app bundle and does not need Metro to launch. Rebuild to include code changes. Test camera permissions, native backup sharing, navigation, and persistence on the installed APK.

## Validation

Run from `frontend`:

```powershell
npm run typecheck
npm test -- --silent
npx expo export --platform android --output-dir dist-local-tickets
```

The latest Officer QR/code change on October 14, 2026 passed **255 tests across 19 suites**, TypeScript, and Android JavaScript export. The preceding Admin implementation also passed Android/iOS/web exports. Bundling and mocked camera tests do not replace APK/device testing.

The retained backend can be tested separately with `npm run test:tickets` from `backend`; it is not required to run the current app.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/src/app` | Expo Router pages and role-aware navigation |
| `frontend/src/auth` | Shared authentication and Admin/Officer route guards |
| `frontend/src/screens` | Passenger, Admin, Officer, bus, and ticket screens |
| `frontend/src/components` | Shared controls, maps, and ticket/QR components |
| `frontend/src/data` | Initial demo buses, routes, and journey catalogue |
| `frontend/src/services` | Local account/ticket/Admin storage, permissions, backup and recovery |
| `frontend/src/utils` | Officer incident storage and ticket helpers |
| `backend` | Retained legacy Express/MongoDB API and tests |

## Documentation and limitations

- [Admin workspace and backup guide](ADMIN.md)
- [Frontend setup and demonstration guide](frontend/README.md)
- [Ticketing, verification, and limitations](TICKETING.md)
- [Legacy backend setup](backend/README.md)

Records do not synchronize between phones or browser tabs. Clearing app storage removes local records; use a private backup for recovery. AsyncStorage and activity history are unencrypted, mutable local data rather than a production security boundary. Device time determines ticket validity.

Live GPS, real payments, email/SMS password recovery, cross-device booking/verification, and production role provisioning are outside this prototype. Maps depend on external internet resources. Custom journeys without a matching bundled bus show bus status as unavailable. Backend catalogue changes do not affect the current app.

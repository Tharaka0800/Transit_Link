# Digital Ticketing & QR

Ticketing extends the existing Tickets tab, Express API, JWT session, and blue theme. Officer incident CRUD and its offline shortcut are unchanged. Purchases are a university demo: no money is collected, no wallet is debited, and no seat/departure is reserved.

## Run

Use the existing backend `.env` and frontend API configuration. Do not run the destructive account seed command just to configure tickets.

```powershell
cd backend
npm run dev
```

With `USE_MEMORY_DB=true`, the server loads `backend/data/ticket-journeys.demo.json` automatically. These fare values reproduce the existing Fare Information prototype; journey durations/validity windows are illustrative. They are not official tariffs or timetables. All memory database records disappear on server restart.

For persistent MongoDB, import the demo file once, or supply your approved JSON catalogue:

```powershell
cd backend
npm run tickets:import -- ./data/ticket-journeys.demo.json
```

Alternatively set `TICKET_JOURNEYS_FILE=./data/ticket-journeys.demo.json` in backend `.env` to load/upsert that catalogue on server startup. Relative paths use the backend working directory. Explicit file configuration works with either database mode. No catalogue is loaded by default with persistent MongoDB. An empty catalogue produces an informative passenger empty state.

The importer validates the complete input before writes and upserts by journey code. It does not clear accounts, notifications, incidents, or tickets. Existing entries not present in the import are retained. Set `active: false` on a journey to withdraw it. A startup catalogue will restore the values specified in its file each restart.

Prices use integer LKR minor units (`fareMinor: 32000` means LKR 320.00), so monetary calculations avoid floating-point rounding. Each journey contains `code`, `mode` (Bus/Train), `from`, `to`, positive integer `durationMinutes` and `validityMinutes`, and a nonempty `ticketTypes` array with unique `code`, `label`, and positive integer `fareMinor` values. Configure reverse directions as separate journeys. No fare or route from the existing prototype calculator is implicitly accepted for purchase.

```powershell
cd frontend
npm start
```

The project remains on Expo SDK 51. Native testing requires a compatible Expo Go version or development build. Camera permission changes apply to newly built native apps. No microphone access is requested by this feature.

## Passenger flow

1. Sign in through the existing login screen; open Tickets from the tab, Home, or Profile.
2. Select New Ticket, Bus/Train, and an available journey. Search origin, destination, or route code.
3. Select the configured ticket type. Travel now is the default; Schedule opens a calendar and 24-hour time selection sheet for the next 30 days. Confirm the time to apply changes; closing the sheet discards draft changes.
4. Review the server fare, validity, passenger name, and demo purchase disclosure. Quotes expire after at most five minutes (or at the scheduled start).
5. Confirm the demo purchase. The backend issues the ticket and returns its unique reference and opaque QR payload.
6. Present the QR fullscreen, or expand the selectable manual token if scanning is unavailable. Active ticket cards also offer Show QR, opening fullscreen presentation directly after authenticated detail retrieval.
7. Active/upcoming tickets remain in the active list; used/expired tickets remain in History. Visible ticket screens refresh from the server every 15 seconds and immediately when the app returns to the foreground. Officer redemption closes an open QR on the next successful refresh. Pull down to refresh manually if needed.

A confirmation timeout may mean the server already issued the ticket. The retry action resends the same quote ID and returns the same ticket. Check My Tickets before starting another purchase. Quotes are unique purchase keys; separate deliberate purchases can legitimately produce multiple tickets for the same journey.

Times display in the device's timezone. Server time remains authoritative for verification. Active/expired badges refresh locally while the screens remain open. Automatic server refresh pauses when a ticket screen loses focus or the app is in the background, preserves displayed tickets during loading, and prevents overlapping automatic requests. Network errors retain the last retrieved ticket and display a retry message; server verification remains authoritative. Verification requires a live backend connection. Offline ticket caching is not implemented.

## Verification demo

The existing User model has passenger/admin roles and no officer role. Verification uses the authenticated admin role without changing authentication or Officer incidents. The existing registration endpoint accepts a role from a request body; this demo permission boundary is not secure production officer provisioning. Production deployment requires the authentication owner's protected role assignment or a dedicated officer permission system.

1. Open the Officer tab and select Verify Ticket. An unauthenticated user receives a sign-in prompt; a passenger receives an access message. Local incident CRUD stays available.
2. Sign in using the existing admin demo account when it has been seeded.
3. On native devices, allow camera access and scan a ticket. On web or when the camera is unavailable, enter its complete `TL1:` token.
4. Check the preview. Scanning alone does not consume a ticket.
5. Select Validate & mark used. The ticket must be Active and within its validity window. The server atomically records consumption, time, and verifier. Two simultaneous requests allow exactly one acceptance.
6. Used, expired, future-valid, unknown, malformed, and unauthorized requests receive clear results. A QR screenshot can still be copied; the first valid redemption consumes the ticket. Identity checking and rotating codes are outside this module.

QR payloads contain only `TL1:` plus a cryptographically random 256-bit token. No passenger name, email, phone, fare, or auth JWT is encoded. The token is a ticket credential; show it only to the verifying officer. Ticket detail retrieval is owner-scoped. Verifiers receive ticket details, never the stored QR token. QR rendering happens locally; no third-party QR image service receives ticket data.

## API

Every endpoint requires the existing bearer token.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/tickets/journeys` | Configured active journeys and ticket types |
| POST | `/api/tickets/quotes` | Server quote: `journeyId`, `ticketType`, `departureAt` (ISO time or `now`) |
| POST | `/api/tickets/purchase` | Confirm `quoteId`; retries return the same issued ticket |
| GET | `/api/tickets` | Current user's ticket history, without QR tokens |
| GET | `/api/tickets/:id` | Current user's ticket details and QR payload |
| POST | `/api/tickets/verify` | Admin-only preview using `payload`; does not consume |
| POST | `/api/tickets/redeem` | Admin-only atomic use of the ticket using `payload` |

## Validation

```powershell
cd backend
npm run test:tickets
cd ../frontend
npm run typecheck
npm test
npx expo install --check
npx expo export --platform all --output-dir dist
```

Backend integration tests start a separate temporary memory MongoDB and Express server; they never read your `.env` or connect to your configured team database. The existing MongoDB binary cache is reused if available; an uncached setup may download a binary. Tests cover configured journeys, server fare and ownership, repeated concurrent confirmation, quote expiry, authorization, token validation, ticket retrieval, future/expired tickets, and concurrent single-use validation. Frontend tests cover confirmation boundaries, retry reuse, invalid dates, stale responses, QR encoder/rendering, and status boundaries. Existing Officer tests must continue to pass.

Manual native checks still required: scan an actual QR on another device, denied camera permission, keyboard/safe-area behavior, fullscreen QR, and narrow-screen layouts. Try purchase → retrieve → preview → validate → passenger refresh → history, and scan the same QR again to confirm rejection. Verify Home, Routes, Profile, Notifications, Officer alert create/edit/resolve, and the offline login shortcut still navigate normally.

## Team boundaries

New ticket models/services/routes/components live separately. The only Officer change is one navigation button; the only root navigation changes register three new stack screens. The shared API client, theme/components, User/Notification models, authentication, Home/Profile/Routes/Fare Information, incident storage, and existing Officer tests remain untouched. Do not upgrade Expo to run this module.

## File inventory

Created source files:

- `TICKETING.md`
- `backend/config/ticketCatalogue.js`
- `backend/controllers/ticketController.js`
- `backend/data/ticket-journeys.demo.json`
- `backend/models/Ticket.js`
- `backend/models/TicketJourney.js`
- `backend/models/TicketQuote.js`
- `backend/routes/ticketRoutes.js`
- `backend/scripts/importTicketJourneys.js`
- `backend/services/ticketService.js`
- `backend/tests/ticketApi.test.js`
- `backend/tests/ticketService.test.js`
- `frontend/src/app/ticketing/purchase.tsx`
- `frontend/src/app/ticketing/[id].tsx`
- `frontend/src/app/officer-dashboard/verify-ticket.tsx`
- `frontend/src/components/ticketing/TicketCard.tsx`
- `frontend/src/components/ticketing/TicketQRCode.tsx`
- `frontend/src/components/ticketing/TicketStatusBadge.tsx`
- `frontend/src/components/ticketing/JourneyDateTimePicker.tsx`
- `frontend/src/hooks/useTicketAutoRefresh.ts`
- `frontend/src/screens/MyTicketsScreen.tsx`
- `frontend/src/screens/TicketPurchaseScreen.tsx`
- `frontend/src/screens/TicketDetailsScreen.tsx`
- `frontend/src/screens/TicketVerificationScreen.tsx`
- `frontend/src/services/ticketService.ts`
- `frontend/src/utils/ticketUtils.ts`
- `frontend/src/__tests__/TicketPurchase.test.tsx`
- `frontend/src/__tests__/TicketQR.test.tsx`
- `frontend/src/__tests__/TicketVerification.test.tsx`
- `frontend/src/__tests__/TicketImprovements.test.tsx`

Modified existing files:

| File | Reason |
| --- | --- |
| `backend/server.js` | Mount ticket routes and load an explicitly configured/demo memory catalogue |
| `backend/package.json` | Add ticket import and test commands |
| `backend/.env.example` | Document the optional catalogue file setting |
| `frontend/src/screens/TicketsScreen.js` | Delegate the existing Tickets screen to the live ticketing screen |
| `frontend/src/app/_layout.tsx` | Register purchase, detail, and verification screens |
| `frontend/src/app/(tabs)/officer-dashboard/index.tsx` | Add one Verify Ticket navigation button |
| `frontend/app.json` | Configure camera permission and disable microphone permission |
| `frontend/package.json` | Pin SDK-compatible camera and QR packages |
| `frontend/package-lock.json` | Record those packages; existing locked versions are unchanged |

Generated exports, temporary visual-check helpers, and screenshots are kept in the already ignored `frontend/dist` and `frontend/.expo` directories, not in source control. No other branch was changed, and no commit was created.

The calendar/quick-QR/automatic-refresh follow-up modifies only `TicketPurchaseScreen.tsx` (picker integration), `TicketCard.tsx` (separate detail and QR actions), `MyTicketsScreen.tsx` (quiet refresh and presentation navigation), `TicketDetailsScreen.tsx` (quiet refresh and QR closure), `TicketPurchase.test.tsx` (retain invalid-date validation coverage), and this guide. It adds `JourneyDateTimePicker.tsx`, `useTicketAutoRefresh.ts`, and `TicketImprovements.test.tsx`. It adds no dependencies or backend/navigation changes.

## Completed validation

- TypeScript: passed.
- Frontend Jest: 73 tests passed across eight suites, including all 53 pre-existing Officer tests. The six additional tests cover calendar selection/cancellation and time boundaries, refresh lifecycle/concurrency, quick QR navigation, automatic history updates, and QR closure after redemption.
- Backend: 13 ticket unit/integration tests passed using an isolated temporary database.
- Expo SDK compatibility: dependencies up to date; no existing locked package versions changed.
- Android, iOS, and web exports: passed.
- Browser UI flow with isolated API fixtures: purchase, review, generated QR, fullscreen presentation, verification preview, redemption, and ticket history passed at 390px and 320px; no horizontal page overflow or browser runtime exceptions. The follow-up also checked calendar/time sheets at both widths, direct Show QR navigation, and QR closure after a server status change within the polling interval.
- Existing browser navigation: Home → Routes, Tickets tab, Officer tab → Verify Ticket, and Profile → Notifications passed.
- Camera config introspection: camera usage description present, no microphone usage description, no Android audio recording permission.
- Git whitespace checks and backend entry/import script syntax checks: passed.

Screenshots are in `frontend/dist/tickets-390.png`, `purchase-390.png`, `review-390.png`, `ticket-390.png`, `qr-390.png`, `ticket-320.png`, `verification-320.png`, and `history-320.png`. They use test fixture data. Physical camera scanning, native gestures, and device keyboard/safe-area checks remain manual validation items.

Follow-up screenshots in the same ignored directory: `calendar-390.png`, `time-picker-390.png`, `calendar-320.png`, `time-picker-320.png`, `quick-qr-320.png`, and `auto-used-320.png`.

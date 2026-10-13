# Local ticketing and QR

The app uses AsyncStorage for ticket accounts, journeys, bus seats, quotes, purchases, history, and QR validation. No Express server, MongoDB, API URL, or network connection is needed for tickets. Maps still require internet. The legacy backend and its database are preserved; [archived server documentation](backend/TICKETING-legacy.md) describes the previous implementation.

## Data and accounts

`frontend/src/services/LocalTicketStorage.ts` saves a versioned document at `@transitlink_tickets_v1`. It does not overwrite `@transitlink_app_v1` (main accounts/profiles) or `@transit_incidents` (Officer alerts). Ticket accounts remain separate from main app accounts to preserve the existing login flows. Main app logout/deletion clears the ticket session but does not delete the separate ticket account or history.

Ticket demo accounts initialize only if the ticket storage key is absent:

| Role | Email | Password |
| --- | --- | --- |
| Passenger | `tharukee01@gmail.com` | `password123` |
| Passenger | `passenger.demo@transitlink.lk` | `password123` |
| Admin verifier | `admin@transitlink.lk` | `admin123` |

Registration always creates passengers. Passwords are stored as salted bcrypt hashes using Expo Crypto randomness. Session/profile responses contain no password hashes. Server JWTs do not grant local access. Previously registered MongoDB accounts and tickets remain on the server and are not automatically copied into AsyncStorage; register a new local ticket account as needed.

The bundled catalogue is `frontend/src/data/ticketJourneys.json`, copied from the existing demo catalogue. Fares use integer LKR minor units and are illustrative. Backend catalogue edits no longer change this app's catalogue.

## Booking

1. Open Tickets and sign in to a local ticket account.
2. Choose a journey and ticket type. For buses select a departure and 1?10 unique seats. For trains select 1?10 passengers and travel now or schedule within 30 days.
3. Review the quote and simulated payment method. Quotes expire within five minutes or at departure, whichever is sooner. Editing/releasing a quote frees held seats.
4. Confirm explicitly. Each passenger gets a distinct ticket, reference, and random QR token. A bus purchase converts holds to occupied seats on this installation.
5. View My Tickets, details, fullscreen QR, and history. Records survive app restarts. Retrying the same quote returns the same booking and preserves the original payment method.

Bus services are generated at 08:00, 12:00, 16:00, and 20:00 Sri Lanka time for the next seven days. Availability is shared between ticket accounts on this installation only. Displayed times follow the device timezone. Ticket screens retain their existing refresh behavior, now reading local storage.

## Verification

Copy a ticket's complete manual `TL1:` token, switch to the local admin ticket account on the same installation, open Verify ticket QR, and enter the token. Native camera scanning remains available, but the scanned ticket must already exist in this installation's storage. Preview does not consume a ticket. Validate & mark used records consumption; concurrent requests accept it once. Used, future, expired, malformed, and unknown tickets are rejected appropriately.

QR payloads contain only `TL1:` plus a cryptographically random 256-bit token. Owner-scoped details include the QR; list and verifier responses omit the token. A QR from another phone cannot be validated without a shared backend. Copying a QR does not import its ticket record.

## Integrity and limitations

Operations are serialized within one running app instance; concurrent browser tabs are not coordinated. Each purchase persists the complete group of tickets and seat booking in one storage write. A failed write does not publish a partial purchase; retry starts from the last persisted document. Failed reads and malformed saved documents produce errors instead of resetting user data. Logout/account switching invalidates pending operations. Empty collections remain empty.

This is a device-local university demo. AsyncStorage is unencrypted and can be altered by someone with device access; role checks and ticket tokens do not create a production security boundary. Device time determines validity. Bookings and redemption never synchronize across phones, and clearing app storage/uninstalling loses local records unless recovered through platform backup. Payments collect no funds. Large-scale storage, backup/export, server-data migration, and cross-device verification are outside this change.

## Validation

Run from `frontend`:

```powershell
npm run typecheck
npm test -- --silent
npx expo export --platform android --output-dir dist-local-tickets
```

Tests cover existing profiles, routes, Officer flows, and ticket screens, plus local ticket authentication, account isolation, group purchases, retries, seat holds/release/expiry, ownership, single-use QR validation, storage failures, malformed data preservation, and pending-operation invalidation. JavaScript export checks bundling; an APK/device smoke test is still required for camera and persistence behavior.

On October 13, 2026, TypeScript, all 196 tests across 16 suites, and Android JavaScript export passed. No APK was built or installed during this change.

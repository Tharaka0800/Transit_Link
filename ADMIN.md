# Admin workspace

Sign in with the main app admin account: `admin@transitlink.lk` / `admin123`. Admin login opens the Admin tab. Admins see only the Admin and Profile tabs. Passenger journeys, personal tickets/purchases, saved routes, notifications, and support submission are unavailable to Admin; use a passenger account for those actions. Direct links redirect to the Admin workspace, and personal-operation services reject Admin access. Previously purchased Admin tickets remain preserved and visible in administrative ticket search. Admin ticket verification, account settings, and logout remain available.

All features operate on this installation only; no backend or MongoDB is required and no phone-to-phone synchronization is performed.

## Features

| Section | Actions |
| --- | --- |
| Overview | Counts local users, enabled accounts, bookings, active/used tickets, unresolved incidents/reports, and available journeys. Open the existing QR verifier. |
| Tickets | Search by reference, passenger, account email, journey endpoints, or purchase date (`YYYY-MM-DD`). Expand ticket details, including seat, payment method, validity, booking group, and recorded verifier. QR tokens are omitted. |
| Users | Search by name/email. Enable/disable another account or promote/demote passenger/admin roles, with confirmation. Registration still creates passengers only. |
| Support | Read passenger reports, record a reply, and save Open/In progress/Resolved status. Replies create notifications for the report owner. |
| Routes & fares | Add/edit Bus/Train journeys, route codes/numbers, endpoints, duration, validity, display schedule labels, service type, configured fares, and availability. |
| Activity | Review administrative changes and ticket validations with actor names and timestamps. Historical entries begin with this feature; no past activity is invented. |
| Backup | Export complete local records, validate an imported JSON backup, preview its counts, and explicitly replace local data. |

The last enabled admin cannot be disabled, demoted, or deleted. Admins cannot disable/demote their own currently signed-in account; use another admin. The demonstration Officer remains protected. Disabled accounts cannot sign in or authorize ticket/Admin actions. Self-service account deletion also protects the last active admin.

Support reports now persist separately from notifications. Passengers can see their reports and replies in Help & Support > Report an Issue. Older generic support/info notifications are preserved but are not automatically classified as reports. Local admin changes do not contact a remote support team.

## Shared catalogue

The initial catalogue includes existing ticket journeys plus the original search services. Fare values are integer LKR minor units; the editor accepts LKR with at most two decimal places. Search, the fare calculator, and booking use the same persisted entries. Routes with multiple services can have different configured fares; the calculator displays the first matching configured service. Schedule labels are informational; bus booking departures remain the existing demo schedule.

Admin changes affect new quotes. Already issued tickets preserve their route/fare/validity snapshots. A withdrawn journey cannot create new quotes or complete an unpurchased quote. Disable journeys rather than deleting historical catalogue records. Bus status/map/GPS remain demonstrations: custom journeys link to bus status only when their route number and endpoints match a bundled bus. General-fare information remains illustrative; it is not the booking catalogue.

## Backup and restore

1. Open Admin > Backup > Create backup. On web choose Download backup JSON. On Android/iOS choose Share backup JSON, or copy the selectable text into a private document. Native export uses the platform text share sheet; no file-picker dependency is added.
2. Keep the backup private. It contains personal records, salted password hashes, legacy local credentials awaiting migration, and ticket QR credentials. It is not encrypted. Active login sessions are excluded.
3. To restore, paste the complete JSON, choose Validate backup, and inspect the creation date and user/ticket/incident/journey/report counts.
4. Save a current backup first. Choose Restore validated backup and confirm replacement. Restore replaces accounts, notifications, saved routes, tickets, quotes, seats, support, managed journeys, activity, and Officer incidents.
5. Restore signs users out. Sign in using credentials present in the restored backup.

Validation checks version, checksum, account roles, an enabled admin/Officer, record schemas, ticket ownership, booking groups, seat conflicts, catalogue entries, and relationships before any replacement. Backups larger than 25 MB are rejected; practical device storage/share limits may be lower.

During export/restore new data operations are refused while existing queues finish. Restore saves a recovery journal containing the original records before writing replacements. Failed replacement attempts roll back. An interrupted restore recovers the original snapshot before subsequent normal data operations. If the device cannot write either replacement or rollback, recovery remains saved and retries later. This is local recovery, not a server transaction or external backup service.

Admin records (reports, catalogue, administrative activity) are stored inside the existing versioned main-app document so each change and its activity entry persist together. Ticket-validation activity persists with consumption in the ticket document, even if the owner later deletes their tickets. Activity history and backups are mutable local data and are not a tamper-proof audit or a production security boundary.

## Verification

Run from `frontend`:

```powershell
npm run typecheck
npm test -- --silent
npx expo export --platform android --output-dir dist-local-tickets
```

Automated checks cover unauthorized Admin links/services, last-admin/Officer protection, account disable/enable, user changes and failed writes, support ownership/replies, shared catalogue pricing/withdrawal, verifier identity, backup round-trip, invalid backups, rollback, recovery journals, and concurrent-operation refusal. Screen tests cover all seven sections, ticket search/details, confirmation flows, support replies, fare editing, and restore preview/confirmation.

On a rebuilt APK, verify Admin login/tab visibility, edit a fare and check it as a passenger, submit/reply to a support report on the same device, share a private backup, then validate/restore it using a disposable test installation. Native sharing, camera scanning, and platform storage behavior still require device testing.

On October 14, 2026, TypeScript, all 229 tests across 18 suites, and Android/iOS/web JavaScript exports passed. No APK was built or installed during this implementation.

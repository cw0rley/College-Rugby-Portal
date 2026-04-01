# College Rugby Portal

A web app for discovering and comparing college rugby programs across the US. Players find programs, coaches recruit players. Live at **collegerugbyportal.com**.

## Tech Stack

- **Frontend:** React 18, Vite 5, inline styles (no CSS modules/styled-components)
- **Backend:** Firebase (Firestore, Auth, Storage, Hosting, Cloud Functions)
- **Email:** Resend (notifications@collegerugbyportal.com)
- **Tests:** Vitest + React Testing Library

## Commands

- `npm run dev` — Start dev server (localhost:5173)
- `npm run build` — Production build to dist/
- `npm test` — Run all tests
- `npm run build && firebase deploy --only hosting` — Deploy frontend
- `firebase deploy --only functions` — Deploy Cloud Functions
- `node sync/sync.js` — Run data sync pipeline
- `git add -A && git commit -m "message"` — Commit all changes (exclude `nul` and other Windows artifacts via .gitignore)

## Brand & Style

- **Colors:** Navy `#0A1F44`, Lime `#00FF00` (UI accents `#00CC00`), Off-white `#F4F4F4`
- **Fonts:** Inter (body), Montserrat (headings)
- **Tagline:** "Explore. Connect. Play."
- **All styles are inline** — do not use CSS modules, styled-components, or Tailwind
- **Responsive:** Use `window.innerWidth <= 900` for mobile checks, not CSS media queries
- **No emojis** in code or UI unless explicitly requested

## Project Structure

```
App.jsx              — Main app, routing, auth, data loading
firebase.js          — Firebase config (authDomain: collegerugbyportal.com)
constants.js         — State abbreviations, empty schemas, CSV columns
components/          — Page and UI components
  admin/             — Admin panel (self-contained auth)
  coach/             — Coach dashboard sub-components
  ui/                — Shared UI (AuthGate, ErrorBoundary, Toast, Pagination, etc.)
utils/               — Helpers (messaging, notifications, analytics, favorites, etc.)
functions/           — Firebase Cloud Functions (Resend email notifications)
sync/                — Data sync pipeline (scrapers, Firestore sync)
scripts/             — One-off scripts (seeding, cleanup)
tests/               — Vitest tests
```

## Key Patterns

- **Data caching:** Programs/conferences cached in localStorage for 1 hour. Background refresh on stale cache. Admin "Publish Changes" button busts cache for all users via Firestore timestamp.
- **Auth:** Firebase Auth with Google + email/password. `onAuthStateChanged` in App.jsx manages user state. Admin page handles its own auth independently.
- **Coach detection:** Coaches identified by email match in programContacts OR assignedProgramIds in user doc. Auto-granted coach status if email matches a Head Coach contact and email is verified.
- **Notifications:** In-app via Firestore `notifications` collection + browser Notification API. Email via Cloud Functions + Resend (new messages, player interest).
- **Admin page** (`/admin`): Has its own `onAuthStateChanged` and `isAdmin` check inside AdminPage.jsx. Do NOT gate admin access from App.jsx — let AdminPage handle it.

## Firestore Collections

- `programs` — College rugby programs
- `programContacts` — Coach/contact info per program
- `conferences` / `conferenceContacts` — Conference data
- `leagues` — League reference data
- `playerProfiles` — Student-athlete profiles
- `users` — User roles/access (isAdmin, isCoach, assignedProgramIds)
- `favorites` — Subcollection under users
- `programInterest/{programId}/players/{uid}` — Players who favorited a program
- `recruits/{coachUid}/players/{playerUid}` — Coach recruit tracking
- `conversations` / `conversations/{id}/messages` — Messaging
- `notifications` — In-app notifications
- `submissions` — Contact form submissions
- `config/cache` — Cache bust timestamp (bustAt)

## User Deletion

When deleting a user from admin, cascade-delete: playerProfile, favorites, programInterest entries, recruits, notifications, conversations + messages, user doc.

## Data Sync Pipeline (`sync/`)

Automated multi-source scraper that populates Firestore with program data. Run from the `sync/` directory.

### Data Sources

1. **NCR** (ncr.rugby/clubs) — All registered clubs, men's + women's
2. **CRAA** (craa.rugby) — Top-division programs (D1A, D1AA, D1)
3. **NIRA** (nira.rugby/teams) — NCAA varsity women's programs
4. **Goff Rugby Report** (goffrugbyreport.com) — Conference standings + team lists (slow, ~60 pages)
5. **Next Phase Rugby** (app.nextphaserugby.com) — Recruiting data, city/state, scholarships
6. **Conference Websites** (14 sites) — Team rosters, contacts, standings
7. **Rugby Program Websites** — Staff pages scraped for coach contacts

### Sync Commands

```bash
cd sync
node sync.js                    # Full sync (scrape all + update Firestore)
node sync.js --dry-run          # Preview changes without writing
node sync.js --scrape-only      # Scrape and save JSON, skip Firestore
node sync.js --import FILE      # Import a JSON file into Firestore
node sync.js --skip-goff        # Skip Goff (slow)
node sync.js --skip-contacts    # Skip contact scraping
node sync.js --diff-contacts    # Show contact changes without writing
```

### Sync Files

- `sync.js` — Main runner, orchestrates all scrapers
- `scrape-ncr.js` / `scrape-craa.js` / `scrape-nira.js` / `scrape-goff.js` — Source scrapers
- `scrape-nextphase.js` — Recruiting data + scholarships
- `scrape-conferences.js` — Conference website scraper (14 sites)
- `scrape-rugby-websites.js` — Rugby program staff page scraper
- `enrich-schools.js` — Enriches programs with academic data (GPA, SAT)
- `firestore-sync.js` — Firestore write logic, diffing, deduplication
- `fix-programs.js` — Data cleanup and validation
- `service-account.json` — Firebase Admin SDK credentials (do NOT commit)
- `scraped-*.json` — Cached scrape output

### Data Flow

Scrapers → merged JSON → `firestore-sync.js` → Firestore collections (programs, programContacts, conferences, conferenceContacts, leagues)

Programs are matched by school name + gender. Contacts are matched by name + program. The sync merges data from all sources, with later sources overriding earlier ones for conflicting fields.

## Tests (`tests/`)

Run with `npm test`. All Firebase modules are mocked globally in `tests/setup.js`.

### Utility Tests (`tests/utils/`)
- `analytics.test.js` — Page view, search, filter tracking
- `changelog.test.js` — Changelog management
- `csv.test.js` — CSV export/import
- `favorites.test.js` — Favorite add/remove/load
- `messaging.test.js` — Conversations, send message, mark read
- `notifications.test.js` — Subscribe, create, mark read, browser notifications
- `programInterest.test.js` — Write/remove/load interest
- `recruits.test.js` — Save/remove/rate recruits
- `slug.test.js` — URL slug generation

### Component Tests (`tests/components/`)
- `AuthGate.test.jsx` — Auth gate rendering
- `Badge.test.jsx` — Badge component
- `ConferenceDetailPage.test.jsx` — Conference detail page
- `Footer.test.jsx` — Footer links
- `NotificationBell.test.jsx` — Bell icon, dropdown, empty state
- `Pagination.test.jsx` — Page buttons, usePagination hook
- `ProgramCard.test.jsx` — Program card rendering
- `SchoolLogo.test.jsx` — Logo fallback
- `StarRating.test.jsx` — Star rating interaction
- `StatPill.test.jsx` — Stat pill display

### Integration Tests
- `app-logic.test.js` — Core filtering/sorting logic
- `constants.test.js` — Constants validation

## Deploy Checklist

1. `npm test` — Ensure tests pass
2. `npm run build` — Build frontend
3. `firebase deploy --only hosting` — Deploy frontend
4. `firebase deploy --only functions` — Deploy functions (only if changed)
5. Click "Publish Changes" in admin if data was modified

## GitHub

- **Repo:** https://github.com/cw0rley/College-Rugby-Portal
- **Branch:** `main`
- **GitHub Actions:** Weekly data sync runs every Sunday at 3 AM UTC (`.github/workflows/sync.yml`)
  - Runs `node sync/sync.js --skip-contacts --diff-contacts`
  - Uses `FIREBASE_SERVICE_ACCOUNT` secret for Firestore access
  - Can also be triggered manually via `workflow_dispatch`
- **Secrets required:** `FIREBASE_SERVICE_ACCOUNT` — Firebase Admin SDK service account JSON

## Environment

- Cloud Functions env vars in `functions/.env` (RESEND_API_KEY, FROM_EMAIL)
- Firebase config is in `firebase.js` (not .env — it's a public web app)
- Google OAuth redirect URIs must include `https://collegerugbyportal.com/__/auth/handler`

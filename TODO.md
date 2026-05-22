# College Rugby Portal — TODO

## Bugs
- [x] Fix stale cache key mismatch — updated all `crp_cache_v5` references to `crp_cache_v7`
- [x] Remove DEBUG console.log in CoachDashboardPage.jsx
- [x] Replace browser `alert()`/`confirm()` calls with Toast notifications and ConfirmDialog modals
- [x] Fix `isMobile` not updating on resize — extracted useIsMobile hook, updated all components

- [ ] Fix analytics dashboard — all values show 0, events may not be writing to Firestore

## Security
- [x] Firestore rules: use `isCoachOfProgram()` so coaches can only update their own programs/contacts
- [x] Validate URL scheme in ProgramDetailPage `renderMarkdown()` — already safe (regex requires https?://)

## UI / Design
- [ ] Declutter the header — logo + title + tagline + search + auth is a lot stacked up top
- [ ] Review mobile header — even more cramped on small screens
- [x] Player profile form not mobile-responsive — grids now stack on mobile via useIsMobile
- [ ] Add loading skeletons instead of plain "Loading..." text spinners
- [x] Remove emoji from ProgramCard scholarship badge per style guide
- [ ] Enable the "Message" button on ProgramDetailPage (currently commented out, infrastructure exists)
- [ ] Add pagination to PlayerDirectoryPage — currently renders all profiles at once
- [ ] MessagesPage uses magic-number height `calc(100vh - 400px)` — fragile if header changes
- [ ] Add empty-state messaging on Favorites tab for unauthenticated users

## Features
- [x] Link player-features.html from somewhere on the site (linked on About page)
- [ ] Coach onboarding flow — first-time coach login experience, guided setup
- [ ] Program page editing UX — make it obvious what coaches can update and how

## Performance
- [x] Code-split the 810KB index bundle — split Firebase chunk, lazy-load ProgramDetailPage (257KB main bundle now)
- [ ] Lazy-import `firebase/analytics` — it's in the eager chunk but not needed until after render
- [ ] Lazy-import `firebase/storage` — only used by coach/admin logo upload (~30KB wasted for regular users)
- [x] Load Montserrat font (heading font per brand guide) — added to Google Fonts import
- [x] Add `font-display: swap` to Google Fonts link in index.html (already had display=swap)
- [ ] Add `<link rel="preload">` for critical assets (logo-icon.svg, hero background)
- [ ] Reduce SchoolLogo Google favicon requests — cache results or use avatar fallback more aggressively

## SEO / Accessibility
- [ ] Dynamic Open Graph meta tags on ProgramDetailPage — shared links show generic site info
- [ ] Generate sitemap with program and conference detail pages (currently only 7 static routes)
- [ ] Review robots.txt — disallow auth-required routes (/admin, /messages, /coach, /player-profile)
- [x] Fix `<a onClick>` without `href` in ProgramDetailPage — changed to `<button>`
- [ ] Add aria-labels to icon-only buttons in messaging (back arrow, send button)
- [ ] Add aria-labels to emoji icons in AboutPage feature grid

## Code Quality
- [x] Extract duplicated `POSITIONS` array to constants.js
- [x] Extract duplicated `GRAD_YEARS` generation to constants.js
- [x] Extract duplicated `timeAgo()` to utils/timeAgo.js

## Repo Cleanup
- [ ] Commit or gitignore untracked contact scripts and CSVs (18 files in contacts/)
- [ ] Remove dist/ from git tracking — it's a build artifact, should be built on deploy
- [ ] Clean up one-off scripts that are done (outreach senders, comparison tools)
- [ ] Review .gitignore for completeness

## Testing
- [x] Verify Sign in with Apple works live on collegerugbyportal.com
- [ ] Test coach sign-up flow end to end (new coach, email match, dashboard access)
- [ ] Add tests for CoachDashboardPage, MessagesPage, PlayerSubmitPage, PlayerDirectoryPage
- [ ] Add tests for ProgramDetailPage, CompareView, RankingsPage
- [ ] Add tests for admin components (AdminPage, AdminUsers, etc.)
- [ ] Test App.jsx cache logic, auth state machine, and coach auto-detection

## Infrastructure / DevOps
- [ ] Pin Firebase SDK version in sw.js dynamically instead of hardcoded 10.12.0
- [ ] Add error notifications to GitHub Actions sync workflow (Slack/email on failure)
- [ ] Remove unnecessary root `npm install` from sync workflow (only sync/node_modules needed)
- [ ] Add `continue-on-error` or partial-results handling to sync workflow scrapers
- [ ] Add Firebase Hosting preview channels for PR previews
- [ ] Extend firebase.json cache rules to cover .css and hashed image assets

## Data Sync
- [ ] Wire up `enrich-schools.js` in sync.js — academic data (GPA, SAT) may not be refreshing
- [ ] Consider enabling contact scraping in weekly automated sync (currently skipped)

## Growth / Marketing
- [ ] Instagram content — slides are ready in brand-kit/
- [ ] Get coaches actively updating their pages (KT helping with outreach)
- [ ] Collect feedback from first coach users

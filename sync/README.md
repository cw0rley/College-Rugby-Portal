# College Rugby Portal — Data Sync

Scrapes 4 authoritative rugby websites for the latest college rugby program data and syncs it into your Firestore collections.

## Firestore Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| **programs** | Core program data | school, gender, conference, league, gpa, sat, etc. |
| **programContacts** | Coach/contact info | contact, contactTitle, email, programId |
| **conferenceContacts** | Conference commissioners | conference (abbrev), contactName, email, gender, league |
| **conferences** | Abbreviation → full name | conference, fullName, notes |
| **leagues** | League reference | name |

## Setup

1. Place your Firebase service account key as `service-account.json` in this folder
2. Install dependencies:
   ```bash
   cd sync
   npm install
   ```

## Usage

```bash
# Test your Firebase connection
npm run test:connection

# Preview what would change (no writes)
npm run sync:dry

# Full sync — scrape + update Firestore
npm run sync

# Just scrape and save to JSON (no Firestore)
npm run sync:scrape-only

# Import a previously scraped/merged JSON file
node sync.js --import merged-programs.json

# Skip Goff Rugby Report (slow, ~60 conference pages)
node sync.js --skip-goff
```

## What it does

1. **Scrapes NCR** (ncr.rugby/clubs) — all divisions, men's and women's
2. **Scrapes CRAA** (craa.rugby) — top-tier D1A, D1AA, D1 Elite divisions
3. **Scrapes NIRA** (nira.rugby/teams) — NCAA varsity women's programs
4. **Scrapes Goff Rugby Report** (goffrugbyreport.com) — ~60 conference standings
5. **Merges** scraped data with your existing Firestore records
6. **Upserts** — writes program data to `programs` and contact info to `programContacts`

## Data sources

| Source | URL | Coverage |
|---|---|---|
| NCR | ncr.rugby/clubs | 650+ clubs across D1, D1-AA, D2, D3 |
| CRAA | craa.rugby | Top divisions (D1A, D1AA, D1 Elite) |
| NIRA | nira.rugby/teams | NCAA varsity women's rugby |
| Goff | goffrugbyreport.com | ~60 conference standings + team lists |

## Notes

- The service account key (`service-account.json`) is gitignored — never commit it
- Each sync saves a timestamped JSON backup (e.g., `scraped-2026-03-22.json`)
- Contact info is stored separately in `programContacts`, linked via `programId`
- Empty fields in scraped data never overwrite existing Firestore values
- Programs are matched by composite key: school name + gender

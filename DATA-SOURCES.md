# Data Sources

What this project scrapes, when it runs, and which fields each source fills in.

Last verified 2026-09-23.

---

## When it runs

| | |
|---|---|
| **Schedule** | Sundays, 03:00 UTC, via GitHub Actions (`.github/workflows/sync.yml`) |
| **Command** | `node sync/sync.js --skip-contacts --diff-contacts` |
| **Runtime** | ~25 minutes, most of it the rugby-website staff crawl |
| **Manual run** | `gh workflow run "Weekly Data Sync"`, or `node sync/sync.js` locally |

GitHub disables a scheduled workflow after 60 days without repository
activity, and it does not re-enable itself when commits resume. That happened
between 2026-07-26 and 2026-09-10: six weekly runs silently never fired. If the
data looks frozen, check `gh workflow list` before anything else.

### Running part of it

Every source is a named step (`sync/steps.js`):

```bash
node sync.js --list-steps          # what exists, and what each needs
node sync.js --only ncr,craa       # just these
node sync.js --skip goff,websites  # everything but these
```

A partial run writes `scraped-<date>-partial.json` rather than overwriting the
full scrape, and the merged-program floor is not enforced against it.

---

## Part 1 — the weekly scrape

Sources merge in this order, each overlaying the last. Nothing ever overwrites a
non-empty field, so an earlier source only loses where it left a blank.

### 1. NCR — `ncr.rugby/clubs/`
The base list, and the only source of broad coverage.
**Fills:** school, gender, conference.
NCR moved from Webflow to WordPress in 2026; the directory is one
server-rendered page with no pagination. Club counts move with the season as
clubs re-register — 661 on 2026-09-10, 685 on 09-13, 569 on 09-20 — so a drop
is not automatically a broken scraper.

### 2. Goff Rugby Report — `goffrugbyreport.com/conferences`
**Fills:** conference, for teams NCR missed.
Has returned **0 rows for months**. Non-fatal because NCR covers the same
ground, but it is dead weight until someone looks at it.

### 3. CRAA — `craa.rugby` + 18 division pages
`/d1/` `/d1a/` `/d2/` `/d2-men/` `/florida-d1aa/` `/florida-d2/`
`/florida-d2-men/` `/gold-coast-d2/` `/heart-of-america-d1aa/`
`/independent-men-d1aa/` `/independent-womens-d1/` `/norcal-d1aa/`
`/northwest-d1aa/` `/pacific-desert-d1/` `/pacific-desert-d2/`
`/pacific-mountain-d1/` `/southwest-d1aa/` `/west-coast-d2-women/`
**Fills:** league, authoritatively for the top divisions.

### 4. NIRA — `nira.rugby/teams/`
**Fills:** league (`NIRA`), athletics website. NCAA varsity women only.

### 5. Next Phase Rugby — `app.nextphaserugby.com/api/schools`
**Fills:** city, state, conference, league — and it is the **only** source of
state.
Needs `NEXTPHASE_TOKEN` (repo secret, and `sync/nextphase-token.txt` locally).
The token expires; when it does the run warns rather than failing and you see
`NextPhase returned 0 rows` in the health block. While it is down, every
genuinely new program is rejected for having no state — 60 of them on
2026-09-10 alone.

Its detail endpoint can also return GPA, SAT, ACT, tuition, room and board,
scholarships and coach names. That is **switched off**: `fetchDetails` defaults
to false in `scrape-nextphase.js` and nothing passes it.

### 6. Conference websites — 14 sites
rugbyeast.org/contacts.html · marc-rugby.org/contacts ·
southernrugbyconference.com/team-4 · ivyrugby.com ·
rugbynortheast.org (`/teams-rne`, `/team-contacts`, `/contact-1`) ·
southeasternrugby.org · bigtenrugby.com/standings ·
texasrugbyunion.com (`/contacts`, `/competitions`) ·
atlanticrugbyconference.com/contact · floridarugby.org (`/find-a-team`,
`/about`) · greatmidwest.rugbycentral.io · rugby.org · usaclub.rugby ·
nerfu.rugby
**Fills:** conference membership; also collects coach emails and phone numbers.

### 7. EPRU and South Atlantic
`epru.rugby/teams-contacts` and `southatlanticrugby.com` (`/about/div1/`,
`/about/div2/`, `/about/scr/`).
**Contacts only** — they feed the contact review, not the program merge. Both
sat written-but-never-imported until 2026-09-10.

### 8. Rugby program websites
No fixed list: reads each program's `rugbyWebsite` from Firestore (men's only,
to avoid duplicates) and probes `/coaches`, `/staff`, `/coaching-staff`,
`/team/coaches`, `/roster/coaches`, `/about/staff`, `/about/coaches`.
**Fills:** nothing directly — it writes a diff file for review. The
2026-09-10 run found 3,682 contacts not in Firestore.

### School reference data (not a scrape)
`sync/school-info.js` holds 165 schools with city, state, NCAA division, school
type and enrolment, and fills blanks after the merge. It is what keeps new
clubs from being rejected while Next Phase is down.

---

## Part 2 — rankings

Separate from the weekly sync, and run by hand:

```bash
node sync/apply-rankings.js                      # dry run
node sync/apply-rankings.js --commit             # write
node sync/apply-rankings.js --commit --clear-stale
```

**Source:** Goff Rugby Report. Each division's poll is a DataTables grid built
in the browser, so the page must be rendered — this is the one scraper needing
puppeteer. A plain fetch returns the surrounding prose and no rows.

**Which articles** comes from `sync/sources.json`, not code. Each entry declares
a `discover` substring and the newest matching article on
`goffrugbyreport.com/related-topics/rankings` wins, so week-numbered URLs never
go stale:

| Poll | Gender | League |
|---|---|---|
| `d1a-rankings` | men | CRAA D1A |
| `men-d1aa-rankings` | men | NCR D1AA |
| `ncr-d1-rankings` | men | NCR D1A |
| `men-d2-college-rankings` | men | NCR D2 |

The `league` value must match what programs actually store, because a school
listed in two polls is resolved by matching its league. Indiana sits in both
D1A and NCR D1.

**Adding a source:** another Goff poll is a `sources.json` entry. A different
site needs a parser in `scrape-rankings.js`.

**Never touched:** a program with `rankingManual` set, and any gender with no
poll. Goff publishes no women's college poll, so all 76 women's rankings are
left alone — `--clear-stale` would otherwise wipe them on the authority of a
source that never covered them.

---

## Not scraped

| Data | Why |
|---|---|
| **NCR power rankings** | `ncr.rugby/news/.../preseason-power-rankings-*` is prose — "rings in at No. 2" — with no list or table, rendered or otherwise |
| **Women's rankings** | No source publishes one. NIRA has standings but no results posted yet |
| **GPA, SAT, tuition** | Available from Next Phase detail pages, currently switched off; College Scorecard would be the reliable route and needs a free api.data.gov key |
| **US News rankings** | No API, blocks scrapers. Hand-entered |
| **Program status** | Varsity / Sanctioned / Endowed / Club came from a PDF you supplied, applied by `apply-program-status.js`. No source publishes it |

---

## What gets written, and what is guarded

Writes go to `programs` and `programContacts`. `conferences` and
`conferenceContacts` are **imported but never called** in `sync.js` — conference
contacts are scraped weekly into `conference-contacts.json` and go no further.

Guards, in the order a scraped row meets them:

1. **Junk names** — year prefixes, "All-Star", "See contacts", multi-school strings
2. **Duplicate guard** (`duplicate-guard.js`) — runs the full school matcher against
   existing programs, restricted to the candidate's state. Added after the
   2026-09-13 run created 32 duplicates
3. **No state** — a *new* program without one is rejected
4. **Fill-empty-only** — an existing non-empty field is never overwritten, except
   a conference that looks like a school name
5. **`rankingManual`** — excluded from ranking writes entirely

**Health gate:** NCR, CRAA and NIRA must return rows, and a full run must merge
at least 500 programs, or the run exits non-zero *before* the 25-minute website
crawl and before any Firestore write. Goff and Next Phase warn instead of
failing. This exists because a scraper that breaks against a redesign returns
zero rows without throwing — which is how NCR sat broken through six green runs.

---

## Credentials

| What | Where | Needed for |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | GitHub secret | Firestore access in CI |
| `sync/service-account.json` | Local, gitignored | Firestore access locally |
| `NEXTPHASE_TOKEN` | GitHub secret | Next Phase in CI |
| `sync/nextphase-token.txt` | Local, gitignored | Next Phase locally; expires |

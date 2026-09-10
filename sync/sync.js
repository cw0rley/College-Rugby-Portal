#!/usr/bin/env node
/**
 * College Rugby Portal — Data Sync Runner
 *
 * Scrapes six authoritative sources for U.S. college rugby program data,
 * then syncs into Firestore collections:
 *   - programs:           Core program data
 *   - programContacts:    Coach/contact info (linked by programId)
 *   - conferenceContacts: Conference commissioner contacts
 *   - conferences:        Conference abbreviation → full name
 *   - leagues:            League reference data
 *
 * DATA SOURCES:
 *   1. NCR  (ncr.rugby/clubs)           — All registered clubs, men's + women's
 *   2. CRAA (craa.rugby)                — Top-division programs (D1A, D1AA, D1)
 *   3. NIRA (nira.rugby/teams)          — NCAA varsity women's programs
 *   4. Goff Rugby Report (goffrugbyreport.com) — Conference standings + team lists
 *   5. Next Phase Rugby (app.nextphaserugby.com) — Recruiting data, city/state
 *   6. Conference Websites (14 sites)          — Team rosters, contacts, standings
 *
 * Usage:
 *   node sync.js                  # Full sync (scrape all + update Firestore)
 *   node sync.js --dry-run        # Preview changes without writing
 *   node sync.js --scrape-only    # Just scrape and save JSON, skip Firestore
 *   node sync.js --import FILE    # Import a JSON file into Firestore
 *   node sync.js --skip-goff      # Skip Goff (slow, ~60 conference pages)
 */

import { STEPS, runSteps, selectSteps, listSteps } from "./steps.js";
import { enrichPrograms } from "./school-info.js";
import {
  syncPrograms,
  syncConferenceContacts,
  syncConferences,
  getExistingPrograms,
  getExistingProgramContacts,
  getExistingConferences,
} from "./firestore-sync.js";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SCRAPE_ONLY = args.includes("--scrape-only");
const SKIP_CONTACTS = args.includes("--skip-contacts");
const DIFF_CONTACTS = args.includes("--diff-contacts");
const LIST_STEPS = args.includes("--list-steps");
const IMPORT_IDX = args.indexOf("--import");

// Row counts per step, filled in by scrapeAll and read by reportSourceHealth.
const stepCounts = {};

// ─── Conference full-name → abbreviation mapping ─────────────────────────────
// The programs table stores conference as an abbreviation (e.g. "ARC").
// Sources like NCR, Goff, and Next Phase return full names.
// This map normalises everything to abbreviations before merge/sync.
//
// IMPORTANT: NCR uses gendered suffixes like "Men's" / "Women's" / "Men" / "Women"
// on many conference names.  The normaliseConference() function strips these
// before looking up the base name, so we only need one entry per conference.
//
// Sources: NCR /clubs page, Goff conferences index, Firestore conferences collection.
const CONF_FULLNAME_TO_ABBR = {
  // ── A ──
  "allegheny rugby union": "ARU",
  "allegheny rugby union collegiate conference": "ARU",
  "atlantic rugby conference": "ARC",
  "atlantic rugby": "ARC",
  // ── B ──
  "big 10 rugby": "B1G",
  "big ten rugby": "B1G",
  "big ten": "B1G",
  "big rivers rugby conference": "BRRC",
  "blue ridge rugby conference": "BRRC",
  "blue ridge rugby": "BRRC",
  // ── C ──
  "canadian universities": "CAN",
  "cardinal athletic rugby conference": "CARD",
  "cardinal rugby conference": "CARD",
  "colonial conference": "CC",
  "colonial coast": "CC",
  "colonial coast rugby conference": "CC",
  "central midlands collegiate rugby conference": "CMCRC",
  // ── F ──
  "florida collegiate rugby conference": "FCRC",
  "florida rugby": "FRU",
  "florida rugby union": "FRU",
  // ── G ──
  "gateway collegiate rugby conference": "GC",
  "gateway rugby conference": "GC",
  "gold coast conference": "GC",
  "gold coast rugby": "GC",
  "great lakes collegiate rugby conference": "GLCRC",
  "great lakes": "GLCRC",
  "great midwest collegiate rugby conference": "GMCRC",
  "great midwest": "GMCRC",
  "great rivers rugby conference": "GRC",
  "great rivers conference": "GRC",
  "great rivers rugby": "GRC",
  // ── H ──
  "heart of america": "HOA",
  "heart of america rugby": "HOA",
  "heart of america rugby conference": "HOA",
  "high peaks collegiate rugby conference": "HPRC",
  "high peaks rugby conference": "HPRC",
  "high plains rugby conference": "HPRC",
  "high plains": "HPRC",
  // ── I ──
  "independent": "IND",
  "ivy rugby conference": "IVY",
  "ivy rugby": "IVY",
  "ivy": "IVY",
  // ── L ──
  "lake effect rugby conference": "LERC",
  "lake erie rugby conference": "LERC",
  "lake erie": "LERC",
  "lonestar rugby conference": "LSC",
  "lone star conference": "LSC",
  "lone star rugby": "LSC",
  "lone star": "LSC",
  "liberty rugby conference": "LRC",
  "liberty": "LRC",
  // ── M ──
  "mid-atlantic rugby conference": "MARC",
  "mid atlantic rugby conference": "MARC",
  "mid-atlantic rugby": "MARC",
  "mid-american conference rugby": "MARC",
  "mid-america rugby football union": "MWCRC",
  "midwest collegiate rugby conference": "MWCRC",
  "midwest rugby": "MWCRC",
  "mountain south conference": "MSC",
  "mountain south": "MSC",
  // ── N ──
  "north atlantic collegiate rugby": "NACR",
  "north american collegiate rugby": "NACR",
  "new england rugby football union": "NERFU",
  "nerfu": "NERFU",
  "national intercollegiate rugby association": "NIRA",
  "nira": "NIRA",
  "northern lights collegiate rugby conference": "NLCRC",
  "northern lakes collegiate rugby conference": "NLCRC",
  "northern lakes": "NLCRC",
  "northern lights": "NLCRC",
  "norcal rugby": "NORCAL",
  "northern california": "NORCAL",
  "northwest collegiate rugby conference": "NWC",
  "northwest conference": "NWC",
  "northwest collegiate rugby": "NWC",
  // ── P ──
  "pacific coast rugby conference": "PCRC",
  "pacific coast": "PCRC",
  "pacific desert rugby conference": "PDRC",
  "pacific desert": "PDRC",
  "pacific mountain rugby conference": "PMRC",
  "pacific mountain": "PMRC",
  "potomac south collegiate rugby conference": "PSCRC",
  "potomac south": "PSCRC",
  "prairie states collegiate rugby conference": "PSCRC",
  // ── R ──
  "rocky mountain": "RCKYM",
  "rocky mountain rugby": "RCKYM",
  "rugby east": "RE",
  "rugby east conference": "RE",
  "rugby northeast": "RNECRC",
  "rugby northeast collegiate rugby conference": "RNECRC",
  "rugby northeast conference": "RNECRC",
  "red river conference": "RRC",
  "red river rugby": "RRC",
  // ── S ──
  "south atlantic collegiate rugby conference": "SAWCRC",
  "south atlantic": "SAWCRC",
  "southeastern collegiate rugby conference": "SCRC",
  "southeastern rugby": "SCRC",
  "southeastern": "SCRC",
  "southern rugby conference": "SRC",
  "southern rugby": "SRC",
  "southwest rugby": "SW",
  "southwest conference": "SW",
  // ── T ──
  "tri-state collegiate rugby conference": "TSCRC",
  "tri state collegiate rugby conference": "TSCRC",
  "tri-state": "TSCRC",
  "tri state": "TSCRC",
  // ── U ──
  "upstate new york collegiate rugby conference": "UNYR",
  "upstate new york rugby": "UNYR",
  "upstate ny rugby": "UNYR",
  // ── W ──
  "west coast conference": "WCC",
  "west coast rugby": "WCC",
};

/**
 * Normalise a conference value to its abbreviation.
 *
 * Strategy:
 *  1. If already a short all-caps string (≤10 chars), assume it's an abbreviation.
 *  2. Strip gendered suffixes: "Men's", "Women's", "Men", "Women" (NCR uses these).
 *  3. Look up the cleaned name in CONF_FULLNAME_TO_ABBR.
 *  4. If no match, return the original value (so unrecognised names are visible
 *     in the output and can be added to the map).
 */
function normaliseConference(raw) {
  if (!raw) return raw;
  const trimmed = raw.trim();

  // Already an abbreviation? (all uppercase, short, no double-spaces)
  if (trimmed === trimmed.toUpperCase() && trimmed.length <= 10 && !trimmed.includes("  ")) {
    return trimmed;
  }

  // Strip gendered words ANYWHERE in the string.
  // NCR uses formats like:
  //   "Great Lakes Men's Collegiate Rugby Conference"
  //   "Mid-Atlantic Rugby Conference Women"
  //   "New England Rugby Football Union Men"
  const stripped = trimmed
    .replace(/\bWomen'?s?\b/gi, "")
    .replace(/\bMen'?s?\b/gi, "")
    .replace(/\s{2,}/g, " ")   // collapse double-spaces left by removal
    .trim();

  // Try the stripped version first, then the original
  const keyStripped = stripped.toLowerCase();
  if (CONF_FULLNAME_TO_ABBR[keyStripped]) return CONF_FULLNAME_TO_ABBR[keyStripped];

  const keyOriginal = trimmed.toLowerCase();
  if (CONF_FULLNAME_TO_ABBR[keyOriginal]) return CONF_FULLNAME_TO_ABBR[keyOriginal];

  // No match — return original so it shows up in output for debugging
  return trimmed;
}

async function scrapeAll(selected) {
  const scrapeSteps = STEPS.filter(st => st.phase === "scrape");
  const running = scrapeSteps.filter(st => selected.has(st.name)).length;

  console.log("🏉 College Rugby Portal — Data Sync\n");
  console.log("════════════════════════════════════════════");
  console.log(`  Scraping ${running} of ${scrapeSteps.length} sources`);
  console.log("════════════════════════════════════════════\n");

  const { results, counts } = await runSteps(selected, "scrape");

  // Bind step results to the names the merge below already uses.
  const ncrClubs         = results["ncr"];
  const craaClubs        = results["craa"];
  const niraTeams        = results["nira"];
  const goffTeams        = results["goff"];
  const nextPhaseTeams   = results["nextphase"];
  const featuredTeams    = results["nextphase-featured"];
  const scholarshipTeams = results["nextphase-scholarships"];
  const confTeams        = results["conferences"].teams;
  const confContacts     = results["conferences"].contacts;

  // Conference contacts go to disk for the contact-diff step.
  if (confContacts.length > 0) {
    const contactsPath = resolve(__dirname, "conference-contacts.json");
    writeFileSync(contactsPath, JSON.stringify(confContacts, null, 2));
    console.log(`  💾 Saved ${confContacts.length} contact entries to conference-contacts.json`);
  }

  Object.assign(stepCounts, counts);

  // ── Merge all sources ───────────────────────────────────────────────
  console.log("\n🔀 Merging data from all sources...");
  const merged = new Map();

  // Priority order: NCR first (broadest), then overlay with more specific data
  for (const club of ncrClubs) {
    const key = `${club.school.toLowerCase()}::${club.gender}`;
    merged.set(key, { ...club });
  }

  // Goff adds conference info for teams NCR might not have
  for (const club of goffTeams) {
    const key = `${club.school.toLowerCase()}::${club.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      if (club.conference && !existing.conference) {
        existing.conference = club.conference;
      }
    } else {
      merged.set(key, { ...club });
    }
  }

  // CRAA overlays league info (authoritative for top divisions)
  for (const club of craaClubs) {
    const key = `${club.school.toLowerCase()}::${club.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      if (club.league) existing.league = club.league;
    } else {
      merged.set(key, { ...club });
    }
  }

  // NIRA overlays for NCAA varsity women's teams
  for (const team of niraTeams) {
    const key = `${team.school.toLowerCase()}::${team.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      if (team.league) existing.league = team.league;
      if (team.website) existing.website = team.website;
    } else {
      merged.set(key, { ...team });
    }
  }

  // Next Phase overlays city/state and adds new programs
  for (const team of nextPhaseTeams) {
    const key = `${team.school.toLowerCase()}::${team.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      // Fill in city/state if missing
      if (team.city && !existing.city) existing.city = team.city;
      if (team.state && !existing.state) existing.state = team.state;
      // Fill in conference if missing (Next Phase has full names)
      if (team.conference && !existing.conference) existing.conference = team.conference;
    } else {
      merged.set(key, { ...team });
    }
  }

  // Next Phase Featured overlays isFeatured flag + tuition data
  for (const team of featuredTeams) {
    const key = `${team.school.toLowerCase()}::${team.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.isFeatured = true;
      if (team.city && !existing.city) existing.city = team.city;
      if (team.state && !existing.state) existing.state = team.state;
      if (team.conference && !existing.conference) existing.conference = team.conference;
      if (team.inStateTuition && !existing.inStateTuition) existing.inStateTuition = team.inStateTuition;
      if (team.outStateTuition && !existing.outStateTuition) existing.outStateTuition = team.outStateTuition;
      if (team.grantAvailable !== undefined && existing.grantAvailable === undefined) existing.grantAvailable = team.grantAvailable;
      if (team.programStatus && !existing.programStatus) existing.programStatus = team.programStatus;
    } else {
      merged.set(key, { ...team });
    }
  }

  // Next Phase Scholarship detail overlays scholarship, tuition, coach data
  for (const team of scholarshipTeams) {
    const key = `${team.school.toLowerCase()}::${team.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      // Scholarship fields (always overwrite — detail page is authoritative)
      if (team.scholarshipsOffered) existing.scholarshipsOffered = team.scholarshipsOffered;
      if (team.grantAvailable !== undefined) existing.grantAvailable = team.grantAvailable;
      // Tuition (fill if missing)
      if (team.inStateTuition && !existing.inStateTuition) existing.inStateTuition = team.inStateTuition;
      if (team.outStateTuition && !existing.outStateTuition) existing.outStateTuition = team.outStateTuition;
      if (team.roomBoard && !existing.roomBoard) existing.roomBoard = team.roomBoard;
      // Coach / contact (fill if missing)
      if (team.contact && !existing.contact) existing.contact = team.contact;
      if (team.contactTitle && !existing.contactTitle) existing.contactTitle = team.contactTitle;
      if (team.contactEmail && !existing.contactEmail) existing.contactEmail = team.contactEmail;
      if (team.contactPhone && !existing.contactPhone) existing.contactPhone = team.contactPhone;
      // Extras
      if (team.website && !existing.website) existing.website = team.website;
      if (team.enrollment && !existing.enrollment) existing.enrollment = team.enrollment;
      if (team.rosterOpenings) existing.rosterOpenings = team.rosterOpenings;
      if (team.programStatus && !existing.programStatus) existing.programStatus = team.programStatus;
      if (team.isFeatured) existing.isFeatured = true;
      // City/state fill
      if (team.city && !existing.city) existing.city = team.city;
      if (team.state && !existing.state) existing.state = team.state;
    } else {
      merged.set(key, { ...team });
    }
  }

  // Conference websites confirm team membership, add new programs
  for (const team of confTeams) {
    const key = `${team.school.toLowerCase()}::${team.gender}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      // Conference site confirms membership — fill in conference if missing
      if (team.conference && !existing.conference) {
        existing.conference = team.conference;
      }
    } else {
      merged.set(key, { school: team.school, gender: team.gender, conference: team.conference });
    }
  }

  let allPrograms = Array.from(merged.values());

  // ── Normalise conference names to abbreviations ──────────────────────
  let confNormalised = 0;
  for (const prog of allPrograms) {
    if (prog.conference) {
      const abbr = normaliseConference(prog.conference);
      if (abbr !== prog.conference) {
        confNormalised++;
        prog.conference = abbr;
      }
    }
  }
  if (confNormalised > 0) {
    console.log(`  🔤 Normalised ${confNormalised} conference names → abbreviations`);
  }

  // Fill blank city/state/division from the school reference table before the
  // merged count is taken.  firestore-sync rejects any *new* program without a
  // state, and the only scraper that supplies one is Next Phase — so without
  // this a newly discovered club is dropped every week that Next Phase is down.
  const enriched = enrichPrograms(allPrograms);
  if (enriched.filled > 0) {
    allPrograms = enriched.programs;
    const detail = Object.entries(enriched.byField).map(([f, n]) => `${f} ${n}`).join(", ");
    console.log(`  🏫 Enriched ${enriched.filled} blank fields from school reference data (${detail})`);
  }

  stepCounts.merged = allPrograms.length;

  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║  SCRAPE SUMMARY                       ║`);
  console.log(`╠═══════════════════════════════════════╣`);
  for (const step of STEPS.filter(st => st.phase === "scrape")) {
    const n = stepCounts[step.name];
    const shown = n === null || n === undefined ? "  skip" : String(n).padStart(6);
    console.log(`║  ${step.name.padEnd(24)} ${shown}       ║`);
  }
  console.log(`║─────────────────────────────────────── ║`);
  console.log(`║  Merged: ${String(allPrograms.length).padStart(4)} unique programs    ║`);
  console.log(`╚═══════════════════════════════════════╝`);

  return allPrograms;
}

// ─── Source health ──────────────────────────────────────────────────────────
// Populated by scrapeAll().  A scraper that breaks against a redesigned site
// returns zero rows rather than throwing, so without this check the job exits
// 0 and reports success while doing nothing — which is how the NCR scraper sat
// broken from late July to September 2026 across six "green" weekly runs.

// A step marked `critical: true` in the registry must return rows.  A step
// that was deliberately skipped reports a null count and is never a failure.
//
// A healthy full scrape merges ~800 programs.  Well below that means several
// sources degraded at once even if each individually returned something.
const MIN_MERGED_PROGRAMS = 500;

/**
 * Print a per-source health block.  Returns an array of failure strings —
 * empty when the scrape looks healthy.
 *
 * The merged-programs floor only applies to a full run: a deliberate partial
 * run (--only ncr) is expected to merge less and must not fail for it.
 */
function reportSourceHealth({ partial = false } = {}) {
  const failures = [];
  const warnings = [];

  console.log(`\n🩺 Source health`);
  for (const step of STEPS.filter(st => st.phase === "scrape")) {
    const count = stepCounts[step.name];

    if (count === null || count === undefined) {
      console.log(`  ⬜ ${step.name.padEnd(24)} skipped`);
      continue;
    }

    let mark = "✅";
    if (count === 0) {
      mark = step.critical ? "❌" : "⚠️ ";
      const msg = `${step.label} returned 0 rows`;
      if (step.critical) failures.push(msg);
      else warnings.push(step.needs ? `${msg} (${step.needs})` : msg);
    }
    console.log(`  ${mark} ${step.name.padEnd(24)} ${count}`);
  }

  const merged = stepCounts.merged ?? 0;
  const mergedLow = !partial && merged < MIN_MERGED_PROGRAMS;
  if (mergedLow) {
    failures.push(`merged only ${merged} programs (expected at least ${MIN_MERGED_PROGRAMS})`);
  }
  console.log(`  ${mergedLow ? "❌" : "✅"} ${"merged".padEnd(24)} ${merged}`);

  for (const w of warnings) console.log(`\n  ⚠️  ${w} — not fatal, but worth checking.`);
  if (partial) console.log(`\n  ℹ️  Partial run — merged-program floor not enforced.`);

  return failures;
}

async function main() {
  // ─── Step selection ───────────────────────────────────────────────────
  let selected;
  try {
    selected = selectSteps(args);
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }

  if (LIST_STEPS) {
    listSteps(selected);
    process.exit(0);
  }

  const allStepNames = STEPS.map(s => s.name);
  const isPartial = allStepNames.some(n => !selected.has(n));
  if (isPartial) {
    console.log(`\n▶ Partial run: ${[...selected].join(", ") || "(nothing selected)"}\n`);
  }

  // ─── Import mode ──────────────────────────────────────────────────────
  if (IMPORT_IDX !== -1) {
    const filePath = resolve(args[IMPORT_IDX + 1]);
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    console.log(`📂 Importing from ${filePath}...`);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    // Normalise conference names to abbreviations
    for (const prog of data) {
      if (prog.conference) prog.conference = normaliseConference(prog.conference);
    }
    console.log(`   ${data.length} programs to sync\n`);

    const results = await syncPrograms(data, { dryRun: DRY_RUN });
    printResults(results);
    process.exit(0);
  }

  // ─── Scrape mode ──────────────────────────────────────────────────────
  const programs = await scrapeAll(selected);

  // Save scraped data to JSON.  A partial run gets its own filename so it can
  // never overwrite the canonical full-scrape output.
  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = resolve(
    __dirname,
    isPartial ? `scraped-${stamp}-partial.json` : `scraped-${stamp}.json`
  );
  writeFileSync(outPath, JSON.stringify(programs, null, 2));
  console.log(`\n💾 Saved scraped data to ${outPath}`);

  // ─── Fail fast on a degraded scrape ───────────────────────────────────
  // Checked before the rugby-website scrape (~25 min) and before any
  // Firestore write, so a broken scraper is reported in seconds and never
  // reaches production data.
  const healthFailures = reportSourceHealth({ partial: isPartial });
  if (healthFailures.length > 0) {
    console.error(`\n❌ Scrape is degraded:`);
    for (const f of healthFailures) console.error(`   • ${f}`);
    console.error(
      `\n   Refusing to continue. A source scraper has probably broken against a\n` +
      `   site redesign — re-inspect the failing source's page markup.`
    );
    process.exit(1);
  }

  // ─── Post-scrape steps (need Firestore) ─────────────────────────────
  let programsWithUrl = [];
  if (selected.has("websites")) {
    const existingProgs = await getExistingPrograms();
    programsWithUrl = existingProgs.filter(p => p.rugbyWebsite);
  }
  const post = await runSteps(selected, "post", { programsWithUrl });
  const rugbyWebsiteContacts = post.results["websites"] || [];
  if (selected.has("websites")) {
    console.log(`  ✅ Found staff on ${rugbyWebsiteContacts.length} rugby websites`);
  }

  // Save rugby website contacts — only when the step actually ran, so a run
  // that skipped it does not overwrite a good file with an empty one.
  if (selected.has("websites")) {
    const rwPath = resolve(__dirname, `rugby-website-contacts-${stamp}.json`);
    writeFileSync(rwPath, JSON.stringify(rugbyWebsiteContacts, null, 2));
    console.log(`  💾 Saved to ${rwPath}`);
  }

  if (SCRAPE_ONLY) {
    console.log("\n--scrape-only flag set, skipping Firestore sync.");
    process.exit(0);
  }

  // ─── Sync to Firestore ────────────────────────────────────────────────
  console.log(
    `\n🔥 Syncing to Firestore${DRY_RUN ? " (DRY RUN)" : ""}...`
  );
  console.log("   Writing to: programs + programContacts collections\n");

  const results = await syncPrograms(programs, { dryRun: DRY_RUN, skipContacts: SKIP_CONTACTS });
  printResults(results);

  // Diff contacts: compare scraped contacts vs Firestore without updating
  if (DIFF_CONTACTS) {
    console.log("\n📋 Contact Diff (scraped vs Firestore)...\n");
    await diffContacts(programs);

    // Also diff rugby website contacts
    if (rugbyWebsiteContacts.length > 0) {
      console.log("\n📋 Rugby Website Contact Diff...\n");
      await diffRugbyWebsiteContacts(rugbyWebsiteContacts);
    }
  }

  process.exit(0);
}

async function diffContacts(scrapedPrograms) {
  const existingPrograms = await getExistingPrograms();
  const existingContacts = await getExistingProgramContacts();

  // Build lookup: school|gender -> firestore programId
  const programIdMap = new Map();
  existingPrograms.forEach(p => {
    programIdMap.set(`${(p.school || "").toLowerCase()}|${p.gender}`, p.id);
  });

  // Build lookup: programId -> existing contacts
  const contactsByProgram = new Map();
  existingContacts.forEach(c => {
    if (!c.programId) return;
    if (!contactsByProgram.has(c.programId)) contactsByProgram.set(c.programId, []);
    contactsByProgram.get(c.programId).push(c);
  });

  const diffs = { newContacts: [], changedContacts: [], removedContacts: [], summary: { new: 0, changed: 0, removed: 0, matched: 0 } };

  // Check scraped contacts vs existing
  for (const prog of scrapedPrograms) {
    if (!prog.contact) continue;
    const key = `${(prog.school || "").toLowerCase()}|${prog.gender}`;
    const programId = programIdMap.get(key);
    if (!programId) continue;

    const existing = contactsByProgram.get(programId) || [];
    const match = existing.find(c =>
      (c.contact || "").toLowerCase() === (prog.contact || "").toLowerCase()
    );

    if (!match) {
      diffs.newContacts.push({ school: prog.school, gender: prog.gender, contact: prog.contact, title: prog.contactTitle, email: prog.email });
      diffs.summary.new++;
    } else {
      const changes = [];
      if (prog.contactTitle && match.contactTitle !== prog.contactTitle) changes.push(`title: "${match.contactTitle || ""}" → "${prog.contactTitle}"`);
      if (prog.email && match.email !== prog.email) changes.push(`email: "${match.email || ""}" → "${prog.email}"`);
      if (changes.length > 0) {
        diffs.changedContacts.push({ school: prog.school, gender: prog.gender, contact: prog.contact, changes });
        diffs.summary.changed++;
      } else {
        diffs.summary.matched++;
      }
    }
  }

  // Check for contacts in Firestore that aren't in scraped data
  const scrapedKeys = new Set();
  for (const prog of scrapedPrograms) {
    if (prog.contact) {
      const key = `${(prog.school || "").toLowerCase()}|${prog.gender}`;
      const pid = programIdMap.get(key);
      if (pid) scrapedKeys.add(`${pid}|${(prog.contact || "").toLowerCase()}`);
    }
  }
  for (const [pid, contacts] of contactsByProgram) {
    for (const c of contacts) {
      const key = `${pid}|${(c.contact || "").toLowerCase()}`;
      if (!scrapedKeys.has(key) && c.contact) {
        const prog = existingPrograms.find(p => p.id === pid);
        diffs.removedContacts.push({ school: prog?.school || pid, gender: prog?.gender || "?", contact: c.contact, email: c.email });
        diffs.summary.removed++;
      }
    }
  }

  // Print results
  console.log("═══════════════════════════════════════");
  console.log("  CONTACT DIFF SUMMARY");
  console.log("═══════════════════════════════════════");
  console.log(`  ✅ Matched:    ${diffs.summary.matched}`);
  console.log(`  🆕 New (in scraped, not in Firestore): ${diffs.summary.new}`);
  console.log(`  🔄 Changed:    ${diffs.summary.changed}`);
  console.log(`  ❌ In Firestore only (not scraped):     ${diffs.summary.removed}`);
  console.log("═══════════════════════════════════════\n");

  if (diffs.newContacts.length > 0) {
    console.log("🆕 NEW CONTACTS (scraped but not in Firestore):");
    diffs.newContacts.slice(0, 50).forEach(c => console.log(`  + ${c.school} (${c.gender}) | ${c.contact} | ${c.title || ""} | ${c.email || ""}`));
    if (diffs.newContacts.length > 50) console.log(`  ... and ${diffs.newContacts.length - 50} more`);
    console.log("");
  }

  if (diffs.changedContacts.length > 0) {
    console.log("🔄 CHANGED CONTACTS (different data):");
    diffs.changedContacts.slice(0, 50).forEach(c => console.log(`  ~ ${c.school} (${c.gender}) | ${c.contact} | ${c.changes.join(", ")}`));
    if (diffs.changedContacts.length > 50) console.log(`  ... and ${diffs.changedContacts.length - 50} more`);
    console.log("");
  }

  if (diffs.removedContacts.length > 0) {
    console.log("❌ FIRESTORE ONLY (not in scraped data — may be manually added):");
    diffs.removedContacts.slice(0, 50).forEach(c => console.log(`  - ${c.school} (${c.gender}) | ${c.contact} | ${c.email || ""}`));
    if (diffs.removedContacts.length > 50) console.log(`  ... and ${diffs.removedContacts.length - 50} more`);
    console.log("");
  }

  // Save full diff to file
  const diffFile = resolve(__dirname, `contact-diff-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(diffFile, JSON.stringify(diffs, null, 2));
  console.log(`Full diff saved to: ${diffFile}`);
}

async function diffRugbyWebsiteContacts(rugbyWebsiteResults) {
  const existingPrograms = await getExistingPrograms();
  const existingContacts = await getExistingProgramContacts();

  const programIdMap = new Map();
  existingPrograms.forEach(p => {
    programIdMap.set(`${(p.school || "").toLowerCase()}|${p.gender}`, p.id);
  });

  const contactsByProgram = new Map();
  existingContacts.forEach(c => {
    if (!c.programId) return;
    if (!contactsByProgram.has(c.programId)) contactsByProgram.set(c.programId, []);
    contactsByProgram.get(c.programId).push(c);
  });

  let newFound = 0, emailFound = 0, matched = 0;
  const newContacts = [];
  const emailUpdates = [];

  for (const result of rugbyWebsiteResults) {
    const key = `${(result.school || "").toLowerCase()}|${result.gender}`;
    const programId = programIdMap.get(key);
    if (!programId) continue;

    const existing = contactsByProgram.get(programId) || [];

    for (const scraped of result.contacts) {
      const match = existing.find(c =>
        (c.contact || "").toLowerCase().includes((scraped.contact || "").toLowerCase().split(" ")[0]) &&
        (c.contact || "").toLowerCase().includes((scraped.contact || "").toLowerCase().split(" ").pop())
      );

      if (!match) {
        newContacts.push({ school: result.school, gender: result.gender, ...scraped, source: result.rugbyWebsite });
        newFound++;
      } else {
        matched++;
        if (scraped.email && !match.email) {
          emailUpdates.push({ school: result.school, contact: scraped.contact, newEmail: scraped.email, source: result.rugbyWebsite });
          emailFound++;
        }
      }
    }
  }

  console.log("═══════════════════════════════════════");
  console.log("  RUGBY WEBSITE CONTACT DIFF");
  console.log("═══════════════════════════════════════");
  console.log(`  ✅ Matched existing:  ${matched}`);
  console.log(`  🆕 New contacts found: ${newFound}`);
  console.log(`  📧 Missing emails found: ${emailFound}`);
  console.log("═══════════════════════════════════════\n");

  if (newContacts.length > 0) {
    console.log("🆕 NEW CONTACTS (from rugby websites, not in Firestore):");
    newContacts.slice(0, 50).forEach(c =>
      console.log(`  + ${c.school} (${c.gender}) | ${c.contact} | ${c.contactTitle} | ${c.email || "no email"} | src: ${c.source}`)
    );
    if (newContacts.length > 50) console.log(`  ... and ${newContacts.length - 50} more`);
    console.log("");
  }

  if (emailUpdates.length > 0) {
    console.log("📧 EMAILS FOUND (contacts exist but missing email):");
    emailUpdates.slice(0, 50).forEach(c =>
      console.log(`  ~ ${c.school} | ${c.contact} | ${c.newEmail} | src: ${c.source}`)
    );
    if (emailUpdates.length > 50) console.log(`  ... and ${emailUpdates.length - 50} more`);
    console.log("");
  }

  const rwDiffFile = resolve(__dirname, `rugby-website-diff-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(rwDiffFile, JSON.stringify({ newContacts, emailUpdates, summary: { matched, newFound, emailFound } }, null, 2));
  console.log(`Rugby website diff saved to: ${rwDiffFile}`);
}

function printResults(results) {
  console.log("\n═══════════════════════════════════════");
  console.log("  SYNC RESULTS — programs");
  console.log("═══════════════════════════════════════");
  console.log(`  ✅ Added:     ${results.programs.added}`);
  console.log(`  🔄 Updated:   ${results.programs.updated}`);
  console.log(`  ⏸  Unchanged: ${results.programs.unchanged}`);

  console.log("\n═══════════════════════════════════════");
  console.log("  SYNC RESULTS — programContacts");
  console.log("═══════════════════════════════════════");
  console.log(`  ✅ Added:     ${results.contacts.added}`);
  console.log(`  🔄 Updated:   ${results.contacts.updated}`);
  console.log(`  ⏸  Unchanged: ${results.contacts.unchanged}`);
  console.log(`  ⏭  Skipped:   ${results.contacts.skipped} (no contact data)`);
  console.log("═══════════════════════════════════════\n");

  if (results.details.length > 0 && results.details.length <= 50) {
    console.log("Details:");
    for (const d of results.details) {
      printDetail(d);
    }
  } else if (results.details.length > 50) {
    console.log(`(${results.details.length} changes — showing first 30)`);
    for (const d of results.details.slice(0, 30)) {
      printDetail(d);
    }
  }
}

function printDetail(d) {
  const label = d.school ? `${d.school} (${d.gender})` : `${d.conference} (${d.gender || ""})`;
  switch (d.action) {
    case "add-program":
      console.log(`  + [program]  ${label}`);
      break;
    case "update-program":
      console.log(`  ~ [program]  ${label} — fields: ${d.fields.join(", ")}`);
      break;
    case "add-contact":
      console.log(`  + [contact]  ${label}`);
      break;
    case "update-contact":
      console.log(`  ~ [contact]  ${label} — fields: ${d.fields.join(", ")}`);
      break;
    default:
      console.log(`  ${d.action}: ${label}`);
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});

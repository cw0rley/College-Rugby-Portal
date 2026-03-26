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

import { scrapeNCR } from "./scrape-ncr.js";
import { scrapeCRAA } from "./scrape-craa.js";
import { scrapeNIRA } from "./scrape-nira.js";
import { scrapeGoff } from "./scrape-goff.js";
import { scrapeNextPhase, scrapeNextPhaseFeatured, scrapeNextPhaseScholarships } from "./scrape-nextphase.js";
import { scrapeConferences } from "./scrape-conferences.js";
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
const SKIP_GOFF = args.includes("--skip-goff");
const SKIP_CONTACTS = args.includes("--skip-contacts");
const DIFF_CONTACTS = args.includes("--diff-contacts");
const IMPORT_IDX = args.indexOf("--import");

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

async function scrapeAll() {
  console.log("🏉 College Rugby Portal — Data Sync\n");
  console.log("════════════════════════════════════════════");
  console.log("  Scraping 6 sources for college rugby data");
  console.log("════════════════════════════════════════════\n");

  // ── 1. NCR ──────────────────────────────────────────────────────────
  console.log("📗 Source 1: NCR (ncr.rugby/clubs)");
  console.log("   Coverage: All registered clubs across D1, D1-AA, D2, D3");
  console.log("   Data: school name, gender, conference\n");
  let ncrClubs = [];
  try {
    ncrClubs = await scrapeNCR();
  } catch (err) {
    console.error(`  ❌ NCR scrape failed: ${err.message}`);
  }

  // ── 2. CRAA ─────────────────────────────────────────────────────────
  console.log("\n📕 Source 2: CRAA (craa.rugby)");
  console.log("   Coverage: Top-tier D1A, D1AA, D1 Elite divisions");
  console.log("   Data: school name, gender, league\n");
  let craaClubs = [];
  try {
    craaClubs = await scrapeCRAA();
  } catch (err) {
    console.error(`  ❌ CRAA scrape failed: ${err.message}`);
  }

  // ── 3. NIRA ─────────────────────────────────────────────────────────
  console.log("\n📘 Source 3: NIRA (nira.rugby/teams)");
  console.log("   Coverage: NCAA varsity women's rugby (D1, D2, D3)");
  console.log("   Data: school name, athletics website link\n");
  let niraTeams = [];
  try {
    niraTeams = await scrapeNIRA();
  } catch (err) {
    console.error(`  ❌ NIRA scrape failed: ${err.message}`);
  }

  // ── 4. Goff Rugby Report ────────────────────────────────────────────
  let goffTeams = [];
  if (!SKIP_GOFF) {
    console.log("\n📙 Source 4: Goff Rugby Report (goffrugbyreport.com)");
    console.log("   Coverage: ~60 conferences with standings tables");
    console.log("   Data: school name, conference, gender\n");
    try {
      goffTeams = await scrapeGoff();
    } catch (err) {
      console.error(`  ❌ Goff scrape failed: ${err.message}`);
    }
  } else {
    console.log("\n📙 Source 4: Goff Rugby Report — SKIPPED (--skip-goff)\n");
  }

  // ── 5. Next Phase Rugby ─────────────────────────────────────────────
  console.log("\n📒 Source 5: Next Phase Rugby (app.nextphaserugby.com)");
  console.log("   Coverage: 275+ programs with recruiting data");
  console.log("   Data: school, city, state, gender, division, conference, program status\n");
  let nextPhaseTeams = [];
  try {
    nextPhaseTeams = await scrapeNextPhase();
  } catch (err) {
    console.error(`  ❌ Next Phase scrape failed: ${err.message}`);
    console.error(`     (Set NEXTPHASE_TOKEN or create nextphase-token.txt)`);
  }

  // ── 5b. Next Phase Featured Schools ─────────────────────────────────
  console.log("\n📒 Source 5b: Next Phase Featured Schools");
  console.log("   Coverage: ~90 featured/promoted programs");
  console.log("   Data: school, city, state, gender, division, tuition, grants, isFeatured\n");
  let featuredTeams = [];
  try {
    featuredTeams = await scrapeNextPhaseFeatured();
  } catch (err) {
    console.error(`  ❌ Next Phase featured scrape failed: ${err.message}`);
  }

  // ── 5c. Next Phase Scholarships (detail pages) ─────────────────────
  console.log("\n📒 Source 5c: Next Phase Scholarship Data");
  console.log("   Coverage: All 275 programs (detail page for each)");
  console.log("   Data: scholarships offered, grants, tuition, coach, enrollment\n");
  let scholarshipTeams = [];
  try {
    scholarshipTeams = await scrapeNextPhaseScholarships();
  } catch (err) {
    console.error(`  ❌ Next Phase scholarship scrape failed: ${err.message}`);
    console.error(`     (Set NEXTPHASE_TOKEN or create nextphase-token.txt)`);
  }

  // ── 6. Conference Websites ───────────────────────────────────────────
  console.log("\n📓 Source 6: Conference Websites (14 sites)");
  console.log("   Coverage: Individual conference teams, contacts, standings");
  console.log("   Data: team rosters, coach contacts, conference leadership\n");
  let confTeams = [];
  let confContacts = [];
  try {
    const confResult = await scrapeConferences();
    confTeams = confResult.teams;
    confContacts = confResult.contacts;

    // Save contacts to a separate file for reference
    if (confContacts.length > 0) {
      const contactsPath = resolve(__dirname, "conference-contacts.json");
      writeFileSync(contactsPath, JSON.stringify(confContacts, null, 2));
      console.log(`  💾 Saved ${confContacts.length} contact entries to conference-contacts.json`);
    }
  } catch (err) {
    console.error(`  ❌ Conference scrape failed: ${err.message}`);
  }

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

  const allPrograms = Array.from(merged.values());

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

  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║  SCRAPE SUMMARY                       ║`);
  console.log(`╠═══════════════════════════════════════╣`);
  console.log(`║  NCR:   ${String(ncrClubs.length).padStart(5)} clubs               ║`);
  console.log(`║  CRAA:  ${String(craaClubs.length).padStart(5)} programs            ║`);
  console.log(`║  NIRA:  ${String(niraTeams.length).padStart(5)} teams               ║`);
  console.log(`║  Goff:  ${String(goffTeams.length).padStart(5)} teams               ║`);
  console.log(`║  Conf:  ${String(confTeams.length).padStart(5)} teams               ║`);
  console.log(`║─────────────────────────────────────── ║`);
  console.log(`║  Merged: ${String(allPrograms.length).padStart(4)} unique programs    ║`);
  console.log(`╚═══════════════════════════════════════╝`);

  return allPrograms;
}

async function main() {
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
  const programs = await scrapeAll();

  // Save scraped data to JSON
  const outPath = resolve(
    __dirname,
    `scraped-${new Date().toISOString().slice(0, 10)}.json`
  );
  writeFileSync(outPath, JSON.stringify(programs, null, 2));
  console.log(`\n💾 Saved scraped data to ${outPath}`);

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

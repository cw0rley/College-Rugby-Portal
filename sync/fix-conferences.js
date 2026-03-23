#!/usr/bin/env node
/**
 * ONE-TIME FIX: Clean up bad conference values in Firestore programs collection.
 *
 * Reads every program doc, checks if the conference field contains:
 *   1. A school name (e.g. "Alfred University") → clear it
 *   2. A full conference name (e.g. "Atlantic Rugby Conference") → convert to abbreviation
 *
 * Usage:
 *   node fix-conferences.js              # Dry run — show what would change
 *   node fix-conferences.js --commit     # Actually write changes to Firestore
 */

import { db } from "./firebase.js";

const DRY_RUN = !process.argv.includes("--commit");

// ─── Full-name → abbreviation map (same as sync.js) ─────────────────────────

const CONF_FULLNAME_TO_ABBR = {
  "allegheny rugby union": "ARU",
  "allegheny rugby union collegiate conference": "ARU",
  "atlantic rugby conference": "ARC",
  "atlantic rugby": "ARC",
  "big 10 rugby": "B1G",
  "big ten rugby": "B1G",
  "big ten": "B1G",
  "big rivers rugby conference": "BRRC",
  "blue ridge rugby conference": "BRRC",
  "blue ridge rugby": "BRRC",
  "canadian universities": "CAN",
  "cardinal athletic rugby conference": "CARD",
  "cardinal rugby conference": "CARD",
  "colonial conference": "CC",
  "colonial coast": "CC",
  "colonial coast rugby conference": "CC",
  "central midlands collegiate rugby conference": "CMCRC",
  "florida collegiate rugby conference": "FCRC",
  "florida rugby": "FRU",
  "florida rugby union": "FRU",
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
  "heart of america": "HOA",
  "heart of america rugby": "HOA",
  "heart of america rugby conference": "HOA",
  "high peaks collegiate rugby conference": "HPRC",
  "high peaks rugby conference": "HPRC",
  "high plains rugby conference": "HPRC",
  "high plains": "HPRC",
  "independent": "IND",
  "ivy rugby conference": "IVY",
  "ivy rugby": "IVY",
  "ivy": "IVY",
  "lake effect rugby conference": "LERC",
  "lake erie rugby conference": "LERC",
  "lake erie": "LERC",
  "lonestar rugby conference": "LSC",
  "lone star conference": "LSC",
  "lone star rugby": "LSC",
  "lone star": "LSC",
  "liberty rugby conference": "LRC",
  "liberty": "LRC",
  "mid-atlantic rugby conference": "MARC",
  "mid atlantic rugby conference": "MARC",
  "mid-atlantic rugby": "MARC",
  "mid-american conference rugby": "MARC",
  "mid-america rugby football union": "MWCRC",
  "midwest collegiate rugby conference": "MWCRC",
  "midwest rugby": "MWCRC",
  "mountain south conference": "MSC",
  "mountain south": "MSC",
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
  "pacific coast rugby conference": "PCRC",
  "pacific coast": "PCRC",
  "pacific desert rugby conference": "PDRC",
  "pacific desert": "PDRC",
  "pacific mountain rugby conference": "PMRC",
  "pacific mountain": "PMRC",
  "potomac south collegiate rugby conference": "PSCRC",
  "potomac south": "PSCRC",
  "prairie states collegiate rugby conference": "PSCRC",
  "rocky mountain": "RCKYM",
  "rocky mountain rugby": "RCKYM",
  "rugby east": "RE",
  "rugby east conference": "RE",
  "rugby northeast": "RNECRC",
  "rugby northeast collegiate rugby conference": "RNECRC",
  "rugby northeast conference": "RNECRC",
  "red river conference": "RRC",
  "red river rugby": "RRC",
  "south atlantic collegiate rugby conference": "SAWCRC",
  "south atlantic": "SAWCRC",
  "southeastern collegiate rugby conference": "SCRC",
  "southeastern rugby": "SCRC",
  "southeastern": "SCRC",
  "southern rugby conference": "SRC",
  "southern rugby": "SRC",
  "southwest rugby": "SW",
  "southwest conference": "SW",
  "tri-state collegiate rugby conference": "TSCRC",
  "tri state collegiate rugby conference": "TSCRC",
  "tri-state": "TSCRC",
  "tri state": "TSCRC",
  "upstate new york collegiate rugby conference": "UNYR",
  "upstate new york rugby": "UNYR",
  "upstate ny rugby": "UNYR",
  "west coast conference": "WCC",
  "west coast rugby": "WCC",
};

// ─── Known valid abbreviations ───────────────────────────────────────────────

const VALID_ABBRS = new Set([
  "ARC", "ARU", "B1G", "BRRC", "CAN", "CARD", "CC", "CMCRC",
  "FCRC", "FRU", "GC", "GLCRC", "GMCRC", "GRC", "HOA", "HPRC",
  "IND", "IVY", "LERC", "LRC", "LSC", "MARC", "MSC", "MWCRC",
  "NACR", "NERFU", "NIRA", "NLCRC", "NORCAL", "NWC", "PCRC",
  "PDRC", "PMRC", "PSCRC", "RCKYM", "RE", "RNECRC", "RRC",
  "SAWCRC", "SCRC", "SRC", "SW", "TSCRC", "UNYR", "WCC",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normaliseConference(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === trimmed.toUpperCase() && trimmed.length <= 10 && !trimmed.includes("  ")) {
    return VALID_ABBRS.has(trimmed) ? trimmed : null;
  }
  const stripped = trimmed
    .replace(/\bWomen'?s?\b/gi, "")
    .replace(/\bMen'?s?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const keyStripped = stripped.toLowerCase();
  if (CONF_FULLNAME_TO_ABBR[keyStripped]) return CONF_FULLNAME_TO_ABBR[keyStripped];
  const keyOriginal = trimmed.toLowerCase();
  if (CONF_FULLNAME_TO_ABBR[keyOriginal]) return CONF_FULLNAME_TO_ABBR[keyOriginal];
  return null; // unrecognised — will be cleared
}

function looksLikeSchoolName(val) {
  return /\b(University|College|Institute|Academy|Seminary|Community|State)\b/i.test(val)
    && !/\b(Conference|Union|League|Rugby)\b/i.test(val);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔧 Conference Cleanup Script${DRY_RUN ? " (DRY RUN)" : " (COMMITTING)"}\n`);

  const snapshot = await db.collection("programs").get();
  console.log(`  Found ${snapshot.size} programs in Firestore\n`);

  const fixes = [];       // { docId, school, gender, oldConf, newConf }
  const clears = [];      // { docId, school, gender, oldConf }
  const okCount = { valid: 0, empty: 0 };

  snapshot.forEach(doc => {
    const data = doc.data();
    const conf = data.conference;
    const school = data.school || "?";
    const gender = data.gender || "?";

    if (!conf || conf.trim() === "") {
      okCount.empty++;
      return;
    }

    // Already a valid abbreviation?
    if (VALID_ABBRS.has(conf.trim())) {
      okCount.valid++;
      return;
    }

    // Try to normalise
    const abbr = normaliseConference(conf);

    if (abbr) {
      fixes.push({ docId: doc.id, school, gender, oldConf: conf, newConf: abbr });
    } else if (looksLikeSchoolName(conf)) {
      // It's a school name — clear it
      clears.push({ docId: doc.id, school, gender, oldConf: conf });
    } else {
      // Unknown value — clear it too (it's garbage data)
      clears.push({ docId: doc.id, school, gender, oldConf: conf });
    }
  });

  // ── Report ──
  console.log(`  ✅ Already correct:  ${okCount.valid}`);
  console.log(`  ⬜ Empty/missing:    ${okCount.empty}`);
  console.log(`  🔄 Will fix (→ abbr): ${fixes.length}`);
  console.log(`  🗑️  Will clear (bad):  ${clears.length}`);

  if (fixes.length > 0) {
    console.log(`\n  ── Fixes (full name → abbreviation) ──`);
    for (const f of fixes) {
      console.log(`    ${f.school} (${f.gender}): "${f.oldConf}" → "${f.newConf}"`);
    }
  }

  if (clears.length > 0) {
    console.log(`\n  ── Clears (bad values → empty) ──`);
    for (const c of clears) {
      console.log(`    ${c.school} (${c.gender}): "${c.oldConf}" → ""`);
    }
  }

  if (fixes.length === 0 && clears.length === 0) {
    console.log("\n  Nothing to fix!");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(`\n  ⚠️  DRY RUN — no changes written.`);
    console.log(`  Run with --commit to apply these changes:\n`);
    console.log(`    node fix-conferences.js --commit\n`);
    process.exit(0);
  }

  // ── Apply changes ──
  console.log(`\n  Writing ${fixes.length + clears.length} updates to Firestore...`);

  const BATCH_LIMIT = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const f of fixes) {
    batch.update(db.collection("programs").doc(f.docId), { conference: f.newConf });
    batchCount++;
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  for (const c of clears) {
    batch.update(db.collection("programs").doc(c.docId), { conference: "" });
    batchCount++;
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log(`  ✅ Done! Fixed ${fixes.length}, cleared ${clears.length} conference values.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});

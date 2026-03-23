/**
 * Firestore program/conference fix utility.
 *
 * Usage:
 *   node fix-programs.js                         — run all fixes defined in the FIXES array
 *   node fix-programs.js --dry-run                — preview changes without writing
 *   node fix-programs.js --query school "Navy"    — look up programs by school name (partial match)
 *   node fix-programs.js --query conference "KRC" — look up programs by conference
 *   node fix-programs.js --query league "NCR D2"  — look up programs by league
 *   node fix-programs.js --list-conferences       — list all unique conferences with team counts
 *   node fix-programs.js --list-lonely            — find conferences with only 1 team (likely errors)
 *
 * To apply a fix, add an entry to the FIXES array below and run the script.
 */
import { db } from "./firebase.js";

// ─── FIXES TO APPLY ──────────────────────────────────────────────────────────
// Each fix: { school, gender (optional), updates: { field: newValue } }
// If gender is omitted, applies to ALL matching programs for that school.
//
// Example:
//   { school: "Western Oregon University", updates: { conference: "NWC", league: "NCR D3" } }
//   { school: "United States Naval Academy", gender: "womens", updates: { conference: "NIRA" } }

const FIXES = [
  // Penn State Berks: KRC (Keystone Rugby Conference) was absorbed into MARC
  {
    school: "Pennsylvania State University Berks",
    updates: { conference: "MARC" }
  },
  // SUNY Brockport: HPCRC (High Peaks Collegiate Rugby Conference) doesn't exist as current NCR conference.
  // Brockport is in Rochester, NY area — same region as RIT & SUNY Geneseo which are in UNYR.
  {
    school: "SUNY Brockport",
    updates: { conference: "UNYR" }
  },
  // Benedictine College: MAWRFU (Mid-America Women's Rugby Football Union) is not a current NCR conference.
  // Benedictine mens is in GRC (Great Rivers Collegiate); womens should match.
  {
    school: "Benedictine College",
    gender: "womens",
    updates: { conference: "GRC" }
  },
  // Stanford: PAC is not a valid conference abbreviation in NCR/CRAA.
  // All other California CRAA D1A teams use CC (California Collegiate).
  {
    school: "Stanford University",
    gender: "mens",
    updates: { conference: "CC" }
  },
];

// Programs to DELETE from Firestore (inactive/defunct programs)
const DELETES = [
  // University of the Pacific: PCRC (Pacific Coast Rugby Conference) doesn't exist as NCR conference.
  // Team not listed as active NCR club for 2025-2026 in any division.
  {
    school: "University of the Pacific",
    gender: "mens",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getAllPrograms() {
  const snapshot = await db.collection("programs").get();
  const programs = [];
  snapshot.forEach(doc => programs.push({ _docId: doc.id, ...doc.data() }));
  return programs;
}

function matchProgram(program, fix) {
  const schoolMatch = program.school &&
    program.school.toLowerCase() === fix.school.toLowerCase();
  if (!schoolMatch) return false;
  if (fix.gender && program.gender !== fix.gender) return false;
  return true;
}

function formatProgram(p) {
  return `  ${p.school} (${p.gender}) — conference: ${p.conference || "?"}, league: ${p.league || "?"}, city: ${p.city || "?"}, state: ${p.state || "?"}`;
}

// ─── QUERY MODE ──────────────────────────────────────────────────────────────

async function queryPrograms(field, value) {
  const programs = await getAllPrograms();
  const matches = programs.filter(p => {
    const val = p[field];
    if (!val) return false;
    return val.toLowerCase().includes(value.toLowerCase());
  });

  if (matches.length === 0) {
    console.log(`\nNo programs found where ${field} contains "${value}"\n`);
    return;
  }

  console.log(`\n${matches.length} program(s) where ${field} contains "${value}":\n`);
  matches.forEach(p => console.log(formatProgram(p)));
  console.log();
}

// ─── LIST CONFERENCES ────────────────────────────────────────────────────────

async function listConferences() {
  const programs = await getAllPrograms();
  const confs = {};
  programs.forEach(p => {
    const c = p.conference || "(none)";
    if (!confs[c]) confs[c] = [];
    confs[c].push(p);
  });

  const sorted = Object.entries(confs).sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`\n${sorted.length} unique conferences in Firestore:\n`);
  sorted.forEach(([conf, teams]) => {
    console.log(`  ${conf.padEnd(12)} ${String(teams.length).padStart(3)} team(s)`);
  });
  console.log();
}

// ─── LIST LONELY (single-team conferences) ───────────────────────────────────

async function listLonely() {
  const programs = await getAllPrograms();
  const confs = {};
  programs.forEach(p => {
    const c = p.conference || "(none)";
    if (!confs[c]) confs[c] = [];
    confs[c].push(p);
  });

  const lonely = Object.entries(confs)
    .filter(([, teams]) => teams.length === 1)
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (lonely.length === 0) {
    console.log("\nNo single-team conferences found.\n");
    return;
  }

  console.log(`\n${lonely.length} conference(s) with only 1 team (likely errors):\n`);
  lonely.forEach(([conf, teams]) => {
    console.log(`  ${conf}:`);
    teams.forEach(p => console.log(`    ${formatProgram(p)}`));
  });
  console.log();
}

// ─── APPLY FIXES ─────────────────────────────────────────────────────────────

async function applyFixes(dryRun) {
  if (FIXES.length === 0) {
    console.log("\nNo fixes defined. Add entries to the FIXES array in fix-programs.js\n");
    return;
  }

  const programs = await getAllPrograms();
  let totalUpdated = 0;

  console.log(`\n${dryRun ? "DRY RUN — " : ""}Applying ${FIXES.length} fix(es)...\n`);

  for (const fix of FIXES) {
    const matches = programs.filter(p => matchProgram(p, fix));

    if (matches.length === 0) {
      console.log(`  ✗ No match for: ${fix.school}${fix.gender ? ` (${fix.gender})` : ""}`);
      continue;
    }

    for (const program of matches) {
      const changes = [];
      for (const [field, newVal] of Object.entries(fix.updates)) {
        const oldVal = program[field];
        if (oldVal !== newVal) {
          changes.push(`${field}: "${oldVal || ""}" → "${newVal}"`);
        }
      }

      if (changes.length === 0) {
        console.log(`  – ${program.school} (${program.gender}): already correct`);
        continue;
      }

      console.log(`  ✓ ${program.school} (${program.gender}):`);
      changes.forEach(c => console.log(`      ${c}`));

      if (!dryRun) {
        await db.collection("programs").doc(program._docId).update(fix.updates);
      }
      totalUpdated++;
    }
  }

  console.log(`\n${dryRun ? "Would update" : "Updated"} ${totalUpdated} program(s).`);

  // Handle deletes
  if (DELETES.length > 0) {
    let totalDeleted = 0;
    console.log(`\n${dryRun ? "DRY RUN — " : ""}Deleting ${DELETES.length} program(s)...\n`);

    for (const del of DELETES) {
      const matches = programs.filter(p => matchProgram(p, del));

      if (matches.length === 0) {
        console.log(`  ✗ No match for: ${del.school}${del.gender ? ` (${del.gender})` : ""}`);
        continue;
      }

      for (const program of matches) {
        console.log(`  ✓ DELETE ${program.school} (${program.gender}) — conf: ${program.conference}, league: ${program.league}`);
        if (!dryRun) {
          await db.collection("programs").doc(program._docId).delete();
        }
        totalDeleted++;
      }
    }

    console.log(`\n${dryRun ? "Would delete" : "Deleted"} ${totalDeleted} program(s).\n`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--list-conferences")) {
  await listConferences();
} else if (args.includes("--list-lonely")) {
  await listLonely();
} else if (args.includes("--query")) {
  const idx = args.indexOf("--query");
  const field = args[idx + 1];
  const value = args[idx + 2];
  if (!field || !value) {
    console.log("Usage: node fix-programs.js --query <field> <value>");
    process.exit(1);
  }
  await queryPrograms(field, value);
} else {
  const dryRun = args.includes("--dry-run");
  await applyFixes(dryRun);
}

process.exit(0);

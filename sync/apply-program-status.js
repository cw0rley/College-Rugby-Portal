#!/usr/bin/env node
/**
 * Apply program status tiers (varsity / sanctioned / endowed / club) to
 * Firestore from the men's status list.
 *
 * The list is a PDF of 498 schools; matching it to the programs collection is
 * done ahead of time and lands in program-status-assignments.json as explicit
 * { programId, school, status } rows, so this script never has to guess.
 *
 * Usage:
 *   node apply-program-status.js              # dry run — show what would change
 *   node apply-program-status.js --commit     # write to Firestore
 *   node apply-program-status.js --add-missing --commit
 *                                             # also create the programs the
 *                                             # list names that do not exist yet
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { db } from "./firebase.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const ADD_MISSING = args.includes("--add-missing");

const VALID = new Set(["varsity", "sanctioned", "endowed", "club"]);
const BATCH_LIMIT = 400;

const plan = JSON.parse(
  readFileSync(resolve(__dirname, "program-status-assignments.json"), "utf-8")
);

for (const row of plan.assignments) {
  if (!VALID.has(row.status)) {
    console.error(`Invalid status "${row.status}" for ${row.school}`);
    process.exit(1);
  }
}

const snap = await db.collection("programs").get();
const byId = new Map(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

const toWrite = [];
const unchanged = [];
const stale = [];

for (const row of plan.assignments) {
  const prog = byId.get(row.programId);
  if (!prog) { stale.push(row); continue; }
  if (prog.programStatus === row.status) { unchanged.push(row); continue; }
  toWrite.push({ ...row, from: prog.programStatus || "(unset)", actualSchool: prog.school });
}

console.log(`\n🏉 Program status — ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);
console.log(`  assignments in plan: ${plan.assignments.length}`);
console.log(`  already correct:     ${unchanged.length}`);
console.log(`  to write:            ${toWrite.length}`);
if (stale.length) console.log(`  ⚠ program id no longer exists: ${stale.length}`);

const byTier = toWrite.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
console.log(`  by tier:`, byTier);

const overwrites = toWrite.filter(r => r.from !== "(unset)");
if (overwrites.length) {
  console.log(`\n  ${overwrites.length} would CHANGE an existing status:`);
  for (const o of overwrites.slice(0, 25)) {
    console.log(`    ${o.actualSchool}: ${o.from} → ${o.status}`);
  }
}

console.log(`\n  Sample of new assignments:`);
for (const r of toWrite.filter(r => r.from === "(unset)").slice(0, 10)) {
  console.log(`    ${r.actualSchool.padEnd(45)} ${r.status}`);
}

const missing = plan.missingPrograms || [];
if (missing.length) {
  console.log(`\n  Programs on the list that do not exist yet: ${missing.length}`);
  for (const m of missing) {
    console.log(`    ${m.school} (${m.state || "?"}) — ${m.status}${m.league ? `, ${m.league}` : ""}`);
  }
  if (!ADD_MISSING) console.log(`    (pass --add-missing to create them)`);
}

if (!COMMIT) {
  console.log(`\n  Dry run — nothing written. Re-run with --commit to apply.\n`);
  process.exit(0);
}

let batch = db.batch();
let n = 0;
let written = 0;

async function flush(force = false) {
  if (n >= BATCH_LIMIT || (force && n > 0)) {
    await batch.commit();
    batch = db.batch();
    n = 0;
  }
}

for (const row of toWrite) {
  batch.update(db.collection("programs").doc(row.programId), { programStatus: row.status });
  n++; written++;
  await flush();
}

let created = 0;
if (ADD_MISSING) {
  for (const m of missing) {
    const ref = db.collection("programs").doc();
    batch.set(ref, {
      school: m.school,
      gender: m.gender || "mens",
      state: m.state || "",
      city: m.city || "",
      league: m.league || "",
      conference: m.conference || "",
      programStatus: m.status,
    });
    n++; created++;
    await flush();
  }
}

await flush(true);

console.log(`\n  ✅ Updated ${written} programs${created ? `, created ${created}` : ""}.`);
console.log(`  Remember to click "Publish Changes" in /admin to bust the cache.\n`);
process.exit(0);

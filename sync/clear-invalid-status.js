#!/usr/bin/env node
/**
 * Clear programStatus values that are not one of the four tiers.
 *
 * programStatus holds varsity / sanctioned / endowed / club, assigned from the
 * status list. Next Phase publishes a field of the same name meaning something
 * else entirely -- "Elevated Club", "Athletic Dept Supported Club",
 * "Varsity (non-NCAA)", and in some rows an object -- and nothing enforced the
 * program field allowlist, so those values were written onto real programs
 * whose tier happened to be blank.
 *
 * This clears only invalid values. A program already carrying one of the four
 * tiers is never touched, so nothing assigned from the status list is at risk.
 *
 *   node clear-invalid-status.js            # dry run
 *   node clear-invalid-status.js --commit
 */

import { db } from "./firebase.js";
import { logChanges } from "./changelog.js";

const COMMIT = process.argv.includes("--commit");
const VALID = new Set(["varsity", "sanctioned", "endowed", "club"]);

const snap = await db.collection("programs").get();
const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

const invalid = all.filter(p => {
  const v = p.programStatus;
  if (v === undefined || v === null || v === "") return false;
  return typeof v === "object" || !VALID.has(String(v));
});

console.log(`\n🧽 Invalid programStatus — ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);
console.log(`  programs: ${all.length}`);
console.log(`  valid tiers: ${all.filter(p => VALID.has(String(p.programStatus))).length}`);
console.log(`  to clear: ${invalid.length}\n`);

for (const p of invalid) {
  const shown = typeof p.programStatus === "object" ? "[object]" : String(p.programStatus);
  console.log(`  ${p.school.padEnd(44)} ${p.gender.padEnd(6)} "${shown}"`);
}

if (!COMMIT) {
  console.log(`\n  Dry run — nothing written. Re-run with --commit to clear.\n`);
  process.exit(0);
}

let batch = db.batch();
let n = 0;
const entries = [];

for (const p of invalid) {
  batch.update(db.collection("programs").doc(p.id), { programStatus: "" });
  entries.push({
    action: "update",
    collection: "programs",
    docId: p.id,
    data: {
      school: p.school,
      programStatus: "",
      previousStatus: typeof p.programStatus === "object" ? "[object]" : String(p.programStatus),
      reason: "not one of the four tiers; written by the sync before the field allowlist was enforced",
    },
  });
  if (++n >= 400) { await batch.commit(); batch = db.batch(); n = 0; }
}
if (n > 0) await batch.commit();
await logChanges(entries, "sync/clear-invalid-status.js");

console.log(`\n  ✅ Cleared ${invalid.length} invalid status value(s).\n`);
process.exit(0);

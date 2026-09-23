#!/usr/bin/env node
/**
 * Remove the duplicate programs created by the 2026-09-13 scheduled sync.
 *
 * That run added 33 programs. 32 duplicate programs that already existed under a
 * differently punctuated or worded name (see duplicate-guard.js); one — women's
 * University of Montana — is genuinely new and is kept.
 *
 * Deleting is permanent, so this is two-step:
 *
 *   node remove-duplicate-programs.js --plan dup-plan.json
 *       dry run: classifies each candidate, checks nothing references it,
 *       writes the plan
 *
 *   node remove-duplicate-programs.js --commit --plan dup-plan.json
 *       deletes exactly the ids in that reviewed plan, re-checking each one
 *       first, and records every delete in the changelog collection
 *
 * A candidate is only ever deleted if the school matcher ties it to a program
 * that predates the run, and it has no favorites, player interest, contacts,
 * ranking or program status of its own.
 */

import { readFileSync, writeFileSync } from "fs";
import { db } from "./firebase.js";
import { createDuplicateGuard } from "./duplicate-guard.js";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const planIdx = args.indexOf("--plan");
const PLAN = planIdx !== -1 ? args[planIdx + 1] : null;

if (!PLAN) {
  console.error("Pass --plan FILE (written by a dry run, required by --commit).");
  process.exit(1);
}

// Exactly what run 34746750564 logged as "+ [program]".
const ADDED_2026_09_13 = [
  ["Washington University – St. Louis", "mens"],
  ["University of Wisconsin – Eau Claire", "mens"], ["University of Wisconsin – La Crosse", "mens"],
  ["University of Wisconsin – Milwaukee", "mens"], ["University of Wisconsin – Oshkosh", "mens"],
  ["University of Wisconsin – Platteville", "mens"], ["University of Wisconsin – Stevens Point", "mens"],
  ["University of Wisconsin – Stout", "mens"], ["University of Wisconsin – Whitewater", "mens"],
  ["University of Wisconsin – Eau Claire", "womens"], ["University of Wisconsin – La Crosse", "womens"],
  ["University of Wisconsin – Milwaukee", "womens"], ["University of Wisconsin – Oshkosh", "womens"],
  ["University of Wisconsin – Platteville", "womens"], ["University of Wisconsin – Stevens Point", "womens"],
  ["University of Wisconsin – Stout", "womens"], ["University of Wisconsin – Whitewater", "womens"],
  ["University of Montana", "womens"],
  ["SUNY – Binghamton", "mens"], ["SUNY – Binghamton", "womens"],
  ["University of Texas – Austin", "mens"], ["University of Texas – Dallas", "mens"],
  ["University of Texas – San Antonio", "mens"], ["University of Texas – Austin", "womens"],
  ["University of Texas – San Antonio", "womens"],
  ["St. Joseph’s University", "mens"], ["St. Joseph’s University", "womens"],
  ["University of Minnesota – Moorhead", "womens"],
  ["University of North Carolina – Chapel Hill", "womens"],
  ["University of North Carolina – Charlotte", "womens"], ["University of North Carolina – Charlotte", "mens"],
  ["Emory & Henry College", "womens"], ["Mount Saint Mary’s University", "womens"],
  // The 2026-09-20 run: the guard held everything else, but this one differs
  // from the stored "La Crosse" only in spacing, which word-by-word matching
  // scored as a different school.
  ["University of Wisconsin – LaCrosse", "womens"],
];

async function referenceCounts(id) {
  const [interest, contacts] = await Promise.all([
    db.collection("programInterest").doc(id).collection("players").get(),
    db.collection("programContacts").where("programId", "==", id).get(),
  ]);
  return { interest: interest.size, contacts: contacts.size };
}

function blocked(p, refs, favorites) {
  const reasons = [];
  if (favorites) reasons.push(`${favorites} favorite(s)`);
  if (refs.interest) reasons.push(`${refs.interest} interested player(s)`);
  if (refs.contacts) reasons.push(`${refs.contacts} contact(s)`);
  if (p.rugbyRanking !== "" && p.rugbyRanking != null) reasons.push(`ranking #${p.rugbyRanking}`);
  if (p.programStatus) reasons.push(`status ${p.programStatus}`);
  return reasons;
}

const snap = await db.collection("programs").get();
const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

const favSnap = await db.collectionGroup("favorites").get();
const favorites = {};
for (const d of favSnap.docs) favorites[d.id] = (favorites[d.id] || 0) + 1;

// ─── Commit: delete exactly the reviewed plan ─────────────────────────────
if (COMMIT) {
  const plan = JSON.parse(readFileSync(PLAN, "utf-8"));
  const byId = new Map(all.map(p => [p.id, p]));
  const batch = db.batch();
  let deleted = 0;

  for (const d of plan.deletes) {
    const p = byId.get(d.id);
    if (!p) { console.log(`  skip ${d.id}: already gone`); continue; }
    const reasons = blocked(p, await referenceCounts(d.id), favorites[d.id] || 0);
    if (reasons.length) {
      console.log(`  skip "${p.school}" [${d.id}]: now has ${reasons.join(", ")}`);
      continue;
    }
    batch.delete(db.collection("programs").doc(d.id));
    batch.set(db.collection("changelog").doc(), {
      action: "delete",
      collection: "programs",
      docId: d.id,
      data: { ...p, reason: `duplicate of "${d.duplicateOf}" (${d.duplicateOfId}) created by the 2026-09-13 sync` },
      userEmail: "sync/remove-duplicate-programs.js",
      timestamp: new Date(),
    });
    deleted++;
  }

  if (deleted) await batch.commit();
  console.log(`\n  ✅ Deleted ${deleted} duplicate program(s). Bust the cache so they drop off the site.\n`);
  process.exit(0);
}

// ─── Dry run: classify and write the plan ─────────────────────────────────
const candidates = [];
for (const [school, gender] of ADDED_2026_09_13) {
  const hits = all.filter(p => p.school === school && p.gender === gender && !p.ProgramID);
  if (hits.length !== 1) console.log(`  ! "${school}" (${gender}): ${hits.length} matching doc(s), skipped`);
  if (hits.length === 1) candidates.push(hits[0]);
}

const candidateIds = new Set(candidates.map(p => p.id));
const findExisting = createDuplicateGuard(all.filter(p => !candidateIds.has(p.id)));

const deletes = [];
const kept = [];
for (const p of candidates) {
  const dup = findExisting(p);
  const reasons = blocked(p, await referenceCounts(p.id), favorites[p.id] || 0);

  if (!dup) { kept.push({ id: p.id, school: p.school, gender: p.gender, why: "no existing program matches — genuinely new" }); continue; }
  if (reasons.length) { kept.push({ id: p.id, school: p.school, gender: p.gender, why: `duplicate, but has ${reasons.join(", ")}` }); continue; }

  deletes.push({
    id: p.id, school: p.school, gender: p.gender,
    duplicateOf: dup.existing.school, duplicateOfId: dup.existing.id, how: dup.how,
  });
}

console.log(`\n🧹 Duplicate programs — DRY RUN\n`);
console.log(`  candidates: ${candidates.length}   delete: ${deletes.length}   keep: ${kept.length}\n`);
for (const d of deletes) console.log(`  - ${d.gender.padEnd(6)} "${d.school}"  →  keeps "${d.duplicateOf}" [${d.how}]`);
if (kept.length) {
  console.log(`\n  Kept:`);
  for (const k of kept) console.log(`    ${k.gender.padEnd(6)} "${k.school}" — ${k.why}`);
}

writeFileSync(PLAN, JSON.stringify({ generated: new Date().toISOString(), deletes, kept }, null, 2));
console.log(`\n  Plan written to ${PLAN}. Review it, then re-run with --commit --plan ${PLAN}\n`);
process.exit(0);

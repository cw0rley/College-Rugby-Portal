#!/usr/bin/env node
/**
 * Remove programs a sync run added in error.
 *
 * The 2026-09-23 run was the first with a Next Phase token, and Next Phase
 * names schools quite differently from NCR: abbreviations ("UC Santa Barbara"),
 * suffixes ("Chico State Men's Rugby Club"), typos ("Ohio State Univeristy"),
 * and entries that are not college programs at all ("USA U18 Men's 15's & 7's",
 * "Next Phase Rugby University"). The duplicate guard was built against NCR's
 * naming and let 20 of 21 additions through.
 *
 * Reads what to consider from the changelog rather than a hardcoded list, so
 * this works for any run once its additions are recorded.
 *
 *   node remove-sync-additions.js --plan p.json --since 2026-09-23
 *   node remove-sync-additions.js --commit --plan p.json
 *
 * Everything is deleted except names given to --keep. Each program is
 * re-checked for favorites, player interest, contacts, a ranking and a status
 * immediately before deletion, and every deletion is recorded in the changelog.
 */

import { readFileSync, writeFileSync } from "fs";
import { db } from "./firebase.js";
import { logChanges } from "./changelog.js";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const PLAN = arg("--plan");
const SINCE = arg("--since", "1970-01-01");
const SOURCE = arg("--source", "sync/sync.js");
// Genuinely new programs from the same run, kept.
const KEEP = (arg("--keep", "East Tennessee State University") || "")
  .split("|").map(s => s.trim()).filter(Boolean);

if (!PLAN) {
  console.error("Pass --plan FILE (written by the dry run, required by --commit).");
  process.exit(1);
}

async function references(id) {
  const [interest, contacts] = await Promise.all([
    db.collection("programInterest").doc(id).collection("players").get(),
    db.collection("programContacts").where("programId", "==", id).get(),
  ]);
  return { interest: interest.size, contacts: contacts.size };
}

function blockers(p, refs, favorites) {
  const out = [];
  if (favorites) out.push(`${favorites} favorite(s)`);
  if (refs.interest) out.push(`${refs.interest} interested player(s)`);
  if (refs.contacts) out.push(`${refs.contacts} contact(s)`);
  if (p.rugbyRanking !== "" && p.rugbyRanking != null) out.push(`ranking #${p.rugbyRanking}`);
  // programStatus is deliberately not a blocker here. The tier taxonomy is
  // varsity/sanctioned/endowed/club; anything else on one of these rows came
  // from the same bad import and is no reason to keep the row.
  const VALID_STATUS = new Set(["varsity", "sanctioned", "endowed", "club"]);
  if (p.programStatus && VALID_STATUS.has(String(p.programStatus))) {
    out.push(`status ${p.programStatus}`);
  }
  return out;
}

const favSnap = await db.collectionGroup("favorites").get();
const favorites = {};
for (const d of favSnap.docs) favorites[d.id] = (favorites[d.id] || 0) + 1;

const progSnap = await db.collection("programs").get();
const byId = new Map(progSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

if (COMMIT) {
  const plan = JSON.parse(readFileSync(PLAN, "utf-8"));
  const deleted = [];
  const batch = db.batch();

  for (const d of plan.deletes) {
    const p = byId.get(d.id);
    if (!p) { console.log(`  skip ${d.id}: already gone`); continue; }
    const stop = blockers(p, await references(d.id), favorites[d.id] || 0);
    if (stop.length) { console.log(`  skip "${p.school}": now has ${stop.join(", ")}`); continue; }
    batch.delete(db.collection("programs").doc(d.id));
    deleted.push({ action: "delete", collection: "programs", docId: d.id, data: { ...p, reason: d.reason } });
  }

  if (deleted.length) {
    await batch.commit();
    await logChanges(deleted, "sync/remove-sync-additions.js");
  }
  console.log(`\n  Deleted ${deleted.length} program(s). Bust the cache so they drop off the site.\n`);
  process.exit(0);
}

// ─── Dry run ───────────────────────────────────────────────────────────────
const since = new Date(SINCE);
const log = await db.collection("changelog")
  .where("userEmail", "==", SOURCE)
  .where("action", "==", "add")
  .get();

const candidates = log.docs
  .map(d => d.data())
  .filter(e => (e.timestamp?.toDate?.() || new Date(0)) >= since)
  .map(e => ({ id: e.docId, school: e.data?.school, gender: e.data?.gender, state: e.data?.state }))
  .filter(c => c.id && byId.has(c.id));

const deletes = [];
const kept = [];
for (const c of candidates) {
  const p = byId.get(c.id);
  if (KEEP.some(k => k.toLowerCase() === (p.school || "").toLowerCase())) {
    kept.push({ ...c, why: "kept by --keep: a genuinely new program" });
    continue;
  }
  const stop = blockers(p, await references(c.id), favorites[c.id] || 0);
  if (stop.length) { kept.push({ ...c, why: `has ${stop.join(", ")}` }); continue; }
  deletes.push({ id: c.id, school: p.school, gender: p.gender, reason: `added in error by ${SOURCE} on ${SINCE}` });
}

console.log(`\n🧹 Sync additions — DRY RUN\n`);
console.log(`  source: ${SOURCE}   since: ${SINCE}`);
console.log(`  candidates: ${candidates.length}   delete: ${deletes.length}   keep: ${kept.length}\n`);
for (const d of deletes) console.log(`  - ${d.gender.padEnd(6)} "${d.school}"`);
if (kept.length) {
  console.log(`\n  Kept:`);
  for (const k of kept) console.log(`    "${k.school}" - ${k.why}`);
}

writeFileSync(PLAN, JSON.stringify({ generated: new Date().toISOString(), source: SOURCE, deletes, kept }, null, 2));
console.log(`\n  Plan written to ${PLAN}. Review, then re-run with --commit --plan ${PLAN}\n`);
process.exit(0);

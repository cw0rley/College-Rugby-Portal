#!/usr/bin/env node
/**
 * Apply scraped rankings to Firestore.
 *
 * Rankings are the field with the worst history in this project: a static
 * March dataset was replayed into it for months, and correcting a ranking by
 * hand did not stick, which is what the rankingManual flag exists to stop.
 * So this script is deliberately cautious:
 *
 *   - dry run by default; --commit is required to write
 *   - never touches a program with rankingManual set
 *   - shows every change as "was -> now" before writing
 *   - refuses to guess a school name, listing anything ambiguous for a human
 *
 * Usage:
 *   node apply-rankings.js                  # dry run
 *   node apply-rankings.js --commit         # write
 *   node apply-rankings.js --clear-stale    # also blank rankings that dropped
 *                                           # out of every current poll
 */

import { scrapeRankings } from "./scrape-rankings.js";
import { buildSchoolIndex, matchSchool } from "./match-school.js";
import { db } from "./firebase.js";
import { logChanges } from "./changelog.js";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const CLEAR_STALE = args.includes("--clear-stale");
const JSON_IDX = args.indexOf("--json");
const BATCH_LIMIT = 400;

/**
 * "UNC-Wilmington (NC)" -> { name: "UNC-Wilmington", state: "NC" }.
 * Goff's D2 poll appends the state, which is exactly what disambiguates names
 * like "Loyola (IL)" from Loyola Maryland — so keep it rather than strip it.
 */
function splitTeam(team) {
  const m = (team || "").match(/^(.*?)\s*\(([A-Z]{2})\)\s*$/);
  return m ? { name: m[1].trim(), state: m[2] } : { name: (team || "").trim(), state: "" };
}

const polls = await scrapeRankings();

const snap = await db.collection("programs").get();
const programs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

const indexes = {
  mens: buildSchoolIndex(programs, { gender: "mens" }),
  womens: buildSchoolIndex(programs, { gender: "womens" }),
};

const changes = [];
const unchanged = [];
const locked = [];
const unmatched = [];
const rankedIds = new Set();

// A school can appear in more than one division's poll — Indiana sits in both
// the D1A and NCR D1 tables. rugbyRanking holds one number, so the claims are
// collected first and resolved below rather than letting the last poll written
// win by accident.
const claims = new Map();

for (const poll of polls) {
  const index = indexes[poll.gender];
  if (!index) { console.warn(`  ⚠ ${poll.id}: unknown gender "${poll.gender}"`); continue; }

  for (const row of poll.rows) {
    const { name, state } = splitTeam(row.team);
    const { program, how, candidates } = matchSchool(name, index, { stateHint: state });

    if (!program) {
      unmatched.push({ poll: poll.id, rank: row.rank, team: row.team, candidates: candidates || [] });
      continue;
    }

    rankedIds.add(program.id);

    if (program.rankingManual) {
      locked.push({ school: program.school, held: program.rugbyRanking, wouldBe: row.rank });
      continue;
    }

    if (!claims.has(program.id)) claims.set(program.id, { program, rows: [] });
    claims.get(program.id).rows.push({ rank: row.rank, poll: poll.id, league: poll.league, how });
  }
}

// Resolve a multi-poll school to the poll matching the league it plays in.
const contested = [];

for (const { program, rows } of claims.values()) {
  let chosen = rows[0];

  if (rows.length > 1) {
    const byLeague = rows.filter(r => r.league && r.league === program.league);
    if (byLeague.length === 1) {
      chosen = byLeague[0];
    }
    contested.push({
      school: program.school,
      league: program.league || "(none)",
      rows,
      chosen,
      resolved: byLeague.length === 1,
    });
  }

  const current = program.rugbyRanking === "" || program.rugbyRanking == null
    ? null : Number(program.rugbyRanking);

  if (current === chosen.rank) { unchanged.push(program.school); continue; }

  changes.push({
    id: program.id,
    school: program.school,
    from: current,
    to: chosen.rank,
    poll: chosen.poll,
    league: chosen.league,
    how: chosen.how,
  });
}

// Rankings that survive from the old static dataset but appear in no live poll.
//
// Only a gender that actually has a poll can have stale rankings. Goff
// publishes no women's college poll, so every women's ranking would otherwise
// look stale and get wiped -- deleting the only women's rankings the site has
// on the strength of a source that never covered them.
const polledGenders = new Set(polls.filter(p => p.rows.length > 0).map(p => p.gender));

const stale = programs.filter(p => {
  const r = p.rugbyRanking;
  const hasRank = r !== "" && r != null;
  return hasRank
    && polledGenders.has(p.gender)
    && !rankedIds.has(p.id)
    && !p.rankingManual;
});

const unpolled = programs.filter(p => {
  const r = p.rugbyRanking;
  return r !== "" && r != null && !polledGenders.has(p.gender);
});

console.log(`\n🏆 Rankings — ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);
console.log(`  scraped:        ${polls.reduce((n, p) => n + p.rows.length, 0)} ranked teams`);
console.log(`  matched:        ${changes.length + unchanged.length + locked.length}`);
console.log(`  to change:      ${changes.length}`);
console.log(`  already right:  ${unchanged.length}`);
console.log(`  manual-locked:  ${locked.length}  (left alone)`);
console.log(`  unmatched:      ${unmatched.length}`);
console.log(`  stale rankings: ${stale.length}  (ranked here, in no current poll)`);
if (unpolled.length) {
  const genders = [...new Set(unpolled.map(p => p.gender))].join(", ");
  console.log(`  untouched:      ${unpolled.length}  (${genders} -- no poll covers them, so never cleared)`);
}

if (changes.length) {
  console.log(`\n  Changes:`);
  for (const c of changes.slice(0, 60)) {
    console.log(`    ${c.school.padEnd(42)} ${String(c.from ?? "—").padStart(4)} → #${c.to}   [${c.poll}]`);
  }
  if (changes.length > 60) console.log(`    …and ${changes.length - 60} more`);
}

if (contested.length) {
  console.log(`
  Listed in more than one poll:`);
  for (const c of contested) {
    const opts = c.rows.map(r => `#${r.rank} ${r.poll}`).join("  vs  ");
    console.log(`    ${c.school} (${c.league})`);
    console.log(`      ${opts}`);
    console.log(`      ${c.resolved
      ? `-> #${c.chosen.rank} from ${c.chosen.poll}, the poll matching its league`
      : `-> #${c.chosen.rank} from ${c.chosen.poll}; no poll matches its league, so this is a guess`}`);
  }
}

if (locked.length) {
  console.log(`\n  Manual override held (not touched):`);
  for (const l of locked) console.log(`    ${l.school.padEnd(42)} keeps #${l.held} (poll says #${l.wouldBe})`);
}

if (unmatched.length) {
  console.log(`\n  Could not match — these need an alias in match-school.js:`);
  for (const u of unmatched) {
    console.log(`    [${u.poll}] #${u.rank} "${u.team}"${u.candidates.length ? `  closest: ${u.candidates.join(" | ")}` : ""}`);
  }
}

if (stale.length && !CLEAR_STALE) {
  console.log(`\n  ${stale.length} programs keep a ranking no live poll lists.`);
  console.log(`  Pass --clear-stale to blank them.`);
}

if (JSON_IDX !== -1) {
  const out = args[JSON_IDX + 1];
  const { writeFileSync } = await import("fs");
  writeFileSync(out, JSON.stringify({
    generated: new Date().toISOString(),
    polls: polls.map(p => ({ id: p.id, gender: p.gender, league: p.league, url: p.url, week: p.week, count: p.rows.length })),
    changes,
    contested,
    locked,
    unmatched,
    stale: stale.map(p => ({ id: p.id, school: p.school, gender: p.gender, league: p.league, ranking: p.rugbyRanking })),
    unpolled: unpolled.map(p => ({ id: p.id, school: p.school, gender: p.gender, league: p.league, ranking: p.rugbyRanking })),
  }, null, 2));
  console.log(`
  Plan written to ${out}`);
}

if (!COMMIT) {
  console.log(`\n  Dry run — nothing written.\n`);
  process.exit(0);
}

let batch = db.batch();
let n = 0;

async function flush(force = false) {
  if (n >= BATCH_LIMIT || (force && n > 0)) {
    await batch.commit();
    batch = db.batch();
    n = 0;
  }
}

for (const c of changes) {
  batch.update(db.collection("programs").doc(c.id), { rugbyRanking: c.to });
  n++;
  await flush();
}

let cleared = 0;
if (CLEAR_STALE) {
  for (const p of stale) {
    batch.update(db.collection("programs").doc(p.id), { rugbyRanking: "" });
    n++; cleared++;
    await flush();
  }
}

await flush(true);

// Record the run: a ranking that moves on its own is exactly the kind of
// change nobody can reconstruct later without a log.
await logChanges([
  ...changes.map(c => ({
    action: "update",
    collection: "programs",
    docId: c.id,
    data: {
      school: c.school,
      rugbyRanking: c.to,
      previousRanking: c.from,
      poll: c.poll,
      league: c.league,
    },
  })),
  ...(CLEAR_STALE ? stale.map(p => ({
    action: "update",
    collection: "programs",
    docId: p.id,
    data: {
      school: p.school,
      rugbyRanking: "",
      previousRanking: p.rugbyRanking,
      reason: "cleared: no current poll lists this program",
    },
  })) : []),
], "sync/apply-rankings.js");

console.log(`\n  ✅ Updated ${changes.length} rankings${cleared ? `, cleared ${cleared} stale` : ""}.`);
console.log(`  Remember to click "Publish Changes" in /admin to bust the cache.\n`);
process.exit(0);

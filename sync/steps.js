/**
 * College Rugby Portal — Sync Step Registry
 *
 * Every data source is registered here as a named step, so the pipeline can be
 * run whole or in part:
 *
 *   node sync.js                       # every step
 *   node sync.js --only ncr,craa       # just those two
 *   node sync.js --skip goff,websites  # everything except those
 *   node sync.js --list-steps          # show the registry and exit
 *
 * Adding a source means adding an entry here — sync.js reads results by step
 * name and needs no new wiring of its own.
 *
 * Phases:
 *   "scrape" — runs before the merge, from the public web only
 *   "post"   — runs after the merge and needs Firestore (e.g. to read the
 *              program list it will then crawl)
 */

import { scrapeNCR } from "./scrape-ncr.js";
import { scrapeCRAA } from "./scrape-craa.js";
import { scrapeNIRA } from "./scrape-nira.js";
import { scrapeGoff } from "./scrape-goff.js";
import {
  scrapeNextPhase,
  scrapeNextPhaseFeatured,
  scrapeNextPhaseScholarships,
} from "./scrape-nextphase.js";
import { scrapeConferences } from "./scrape-conferences.js";
import { scrapeRugbyWebsites } from "./scrape-rugby-websites.js";

// Default row-count for a step result; steps returning a richer shape
// override this with their own `count`.
const arrayCount = r => (Array.isArray(r) ? r.length : 0);

export const STEPS = [
  {
    name: "ncr",
    label: "NCR",
    icon: "📗",
    site: "ncr.rugby/clubs",
    coverage: "All registered clubs across D1, D1-AA, D2, D3",
    data: "school name, gender, conference",
    phase: "scrape",
    critical: true,
    empty: [],
    run: () => scrapeNCR(),
  },
  {
    name: "craa",
    label: "CRAA",
    icon: "📕",
    site: "craa.rugby",
    coverage: "Top-tier D1A, D1AA, D1 Elite divisions",
    data: "school name, gender, league",
    phase: "scrape",
    critical: true,
    empty: [],
    run: () => scrapeCRAA(),
  },
  {
    name: "nira",
    label: "NIRA",
    icon: "📘",
    site: "nira.rugby/teams",
    coverage: "NCAA varsity women's rugby (D1, D2, D3)",
    data: "school name, athletics website link",
    phase: "scrape",
    critical: true,
    empty: [],
    run: () => scrapeNIRA(),
  },
  {
    name: "goff",
    label: "Goff Rugby Report",
    icon: "📙",
    site: "goffrugbyreport.com",
    coverage: "~60 conferences with standings tables",
    data: "school name, conference, gender",
    phase: "scrape",
    critical: false,
    slow: true,
    empty: [],
    run: () => scrapeGoff(),
  },
  {
    name: "nextphase",
    label: "Next Phase Rugby",
    icon: "📒",
    site: "app.nextphaserugby.com",
    coverage: "275+ programs with recruiting data",
    data: "school, city, state, gender, division, conference, program status",
    phase: "scrape",
    critical: false,
    needs: "NEXTPHASE_TOKEN or sync/nextphase-token.txt",
    empty: [],
    run: () => scrapeNextPhase(),
  },
  {
    name: "nextphase-featured",
    label: "Next Phase Featured Schools",
    icon: "📒",
    site: "app.nextphaserugby.com",
    coverage: "~90 featured/promoted programs",
    data: "school, city, state, gender, division, tuition, grants, isFeatured",
    phase: "scrape",
    critical: false,
    needs: "NEXTPHASE_TOKEN or sync/nextphase-token.txt",
    empty: [],
    run: () => scrapeNextPhaseFeatured(),
  },
  {
    name: "nextphase-scholarships",
    label: "Next Phase Scholarship Data",
    icon: "📒",
    site: "app.nextphaserugby.com",
    coverage: "All 275 programs (detail page for each)",
    data: "scholarships offered, grants, tuition, coach, enrollment",
    phase: "scrape",
    critical: false,
    slow: true,
    needs: "NEXTPHASE_TOKEN or sync/nextphase-token.txt",
    empty: [],
    run: () => scrapeNextPhaseScholarships(),
  },
  {
    name: "conferences",
    label: "Conference Websites",
    icon: "📓",
    site: "14 conference sites",
    coverage: "Individual conference teams, contacts, standings",
    data: "team rosters, coach contacts, conference leadership",
    phase: "scrape",
    critical: false,
    empty: { teams: [], contacts: [] },
    count: r => (r && Array.isArray(r.teams) ? r.teams.length : 0),
    run: () => scrapeConferences(),
  },
  {
    name: "websites",
    label: "Rugby Websites",
    icon: "📗",
    site: "each program's own rugbyWebsite",
    coverage: "Programs with a rugby website URL",
    data: "coach names, titles, emails from staff pages",
    phase: "post",
    critical: false,
    slow: true,
    empty: [],
    run: ctx => scrapeRugbyWebsites(ctx.programsWithUrl || []),
  },
];

const BY_NAME = new Map(STEPS.map(s => [s.name, s]));

export function getStep(name) {
  return BY_NAME.get(name);
}

/** Comma-separated value for a flag, e.g. --only ncr,craa */
function flagList(args, flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  const raw = args[i + 1];
  if (!raw || raw.startsWith("--")) {
    throw new Error(`${flag} needs a comma-separated list of step names`);
  }
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function assertKnown(names, flag) {
  const unknown = names.filter(n => !BY_NAME.has(n));
  if (unknown.length > 0) {
    throw new Error(
      `${flag}: unknown step${unknown.length > 1 ? "s" : ""} ${unknown.join(", ")}\n` +
      `   Known steps: ${STEPS.map(s => s.name).join(", ")}`
    );
  }
}

/**
 * Work out which steps to run from the CLI args.
 *
 * --only wins over --skip.  The legacy --skip-goff flag still works so the
 * GitHub Action and existing muscle memory keep behaving as before.
 */
export function selectSteps(args) {
  const only = flagList(args, "--only");
  const skip = flagList(args, "--skip") || [];

  if (args.includes("--skip-goff")) skip.push("goff");

  if (only) {
    assertKnown(only, "--only");
    return new Set(only);
  }

  assertKnown(skip, "--skip");
  return new Set(STEPS.map(s => s.name).filter(n => !skip.includes(n)));
}

/** Print the registry (for --list-steps). */
export function listSteps(selected) {
  console.log("\n🏉 Sync steps\n");
  for (const s of STEPS) {
    const on = !selected || selected.has(s.name);
    const tags = [
      s.critical ? "critical" : null,
      s.slow ? "slow" : null,
      s.phase === "post" ? "needs Firestore" : null,
      s.needs ? `needs ${s.needs}` : null,
    ].filter(Boolean);

    console.log(`  ${on ? "✅" : "⬜"} ${s.name.padEnd(24)} ${s.site}`);
    console.log(`     ${s.coverage}`);
    if (tags.length) console.log(`     (${tags.join("; ")})`);
    console.log("");
  }
  console.log("  --only a,b   run just these        --skip a,b   run all but these\n");
}

/**
 * Run every registered step in the given phase that is present in `selected`.
 *
 * A step that throws is caught and recorded as empty — one broken source must
 * not abort the others.  The caller decides whether an empty critical source
 * should fail the run (see reportSourceHealth in sync.js).
 *
 * Returns { results, counts } keyed by step name.
 */
export async function runSteps(selected, phase, ctx = {}) {
  const results = {};
  const counts = {};

  for (const step of STEPS) {
    if (step.phase !== phase) continue;

    if (!selected.has(step.name)) {
      console.log(`\n${step.icon} ${step.label} — SKIPPED`);
      results[step.name] = step.empty;
      counts[step.name] = null; // null = not run, distinct from 0 = ran and found nothing
      continue;
    }

    console.log(`\n${step.icon} ${step.label} (${step.site})`);
    console.log(`   Coverage: ${step.coverage}`);
    console.log(`   Data: ${step.data}\n`);

    try {
      const out = await step.run(ctx);
      results[step.name] = out ?? step.empty;
    } catch (err) {
      console.error(`  ❌ ${step.label} failed: ${err.message}`);
      if (step.needs) console.error(`     (Set ${step.needs})`);
      results[step.name] = step.empty;
    }

    const counter = step.count || arrayCount;
    counts[step.name] = counter(results[step.name]);
  }

  return { results, counts };
}

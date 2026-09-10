/**
 * Rankings scraper.
 *
 * Goff publishes each division's poll as a DataTables grid — Rank, Prev., Team,
 * Conference, Notes. The grid is built client-side, so a plain fetch of the
 * article returns the surrounding prose and no rows at all; the page has to be
 * rendered. That is why this is the one scraper here that needs puppeteer.
 *
 * Which articles to read comes from sources.json rather than from code, so
 * adding a division is a config edit. Article URLs carry a week number
 * ("d1a-rankings-2026-27-week-3"), so pinning one would go stale every Monday —
 * instead each source declares a `discover` substring and the newest matching
 * link on the rankings index wins.
 *
 * Usage:
 *   import { scrapeRankings } from "./scrape-rankings.js";
 *   const polls = await scrapeRankings();
 */

import * as cheerio from "cheerio";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const UA = "Mozilla/5.0 (compatible; CollegeRugbySync/1.0; +https://github.com/cw0rley/College-Rugby-Portal)";

export function loadSources() {
  return JSON.parse(readFileSync(resolve(__dirname, "sources.json"), "utf-8"));
}

/**
 * Find the newest article on the rankings index matching each source's
 * `discover` substring. Index order is newest-first, so first match wins.
 */
export async function discoverArticles(sources) {
  const res = await fetch(sources.rankingsIndex, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${sources.rankingsIndex}`);
  const $ = cheerio.load(await res.text());

  const links = [];
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") || "";
    if (/\/news\//.test(href) && /rank/i.test(href)) {
      const abs = href.startsWith("http") ? href : new URL(href, sources.rankingsIndex).toString();
      if (!links.includes(abs)) links.push(abs);
    }
  });

  const resolved = [];
  for (const source of sources.rankings) {
    if (source.enabled === false) continue;

    if (source.url) {
      resolved.push({ ...source, url: source.url, via: "pinned" });
      continue;
    }
    const hit = links.find(l => l.includes(source.discover));
    if (hit) resolved.push({ ...source, url: hit, via: "discovered" });
    else resolved.push({ ...source, url: null, via: "not found", availableLinks: links.length });
  }
  return { resolved, links };
}

/** Read the ranking grid out of a rendered Goff article. */
async function parseGoffTable(page) {
  return page.evaluate(() => {
    const clean = s => (s || "").replace(/\s+/g, " ").trim();

    // The page ships header-only clones of the grid for sticky headers, so take
    // whichever table actually has body rows.
    const tables = [...document.querySelectorAll("table")]
      .map(t => ({ t, rows: [...t.querySelectorAll("tbody tr, tr")] }))
      .filter(x => x.rows.length > 1)
      .sort((a, b) => b.rows.length - a.rows.length);

    if (!tables.length) return { rows: [], headers: [] };

    const { t } = tables[0];
    const headers = [...t.querySelectorAll("thead th, tr:first-child th")].map(h =>
      clean(h.innerText).toLowerCase()
    );

    const rows = [];
    for (const tr of t.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("td")].map(td => clean(td.innerText));
      if (cells.length < 2) continue;

      const rank = parseInt(cells[0], 10);
      if (!Number.isFinite(rank)) continue;

      rows.push({
        rank,
        previous: cells[1] ? parseInt(cells[1], 10) || null : null,
        team: cells[2] || "",
        conference: cells[3] || "",
        notes: cells[4] || "",
      });
    }
    return { rows, headers };
  });
}

/**
 * Scrape every enabled ranking source.
 * Returns [{ id, gender, league, url, week, rows: [{rank, previous, team, ...}] }]
 */
export async function scrapeRankings(options = {}) {
  const { sources = loadSources(), launch } = options;

  const { resolved } = await discoverArticles(sources);
  const usable = resolved.filter(r => r.url);

  for (const r of resolved.filter(r => !r.url)) {
    console.warn(`  ⚠ ${r.id}: no article matching "${r.discover}" on the index`);
  }
  if (usable.length === 0) {
    throw new Error(
      "No ranking articles found. Either the Goff rankings index changed, or " +
      "every `discover` string in sources.json is stale."
    );
  }

  // Imported lazily so the module can be loaded (and unit tested) without
  // pulling in a browser.
  const puppeteer = launch ? null : (await import("puppeteer")).default;
  const browser = launch ? await launch() : await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const polls = [];
  try {
    for (const source of usable) {
      const page = await browser.newPage();
      try {
        await page.setUserAgent(UA);
        await page.goto(source.url, { waitUntil: "networkidle2", timeout: 45000 });
        const { rows } = await parseGoffTable(page);

        const week = (source.url.match(/week-(\d+)/) || [])[1] || null;
        console.log(
          `  ${rows.length ? "✓" : "⚠"} ${source.id.padEnd(18)} ${rows.length} ranked` +
          `${week ? ` (week ${week})` : ""} — ${source.via}`
        );

        polls.push({
          id: source.id,
          gender: source.gender,
          league: source.league,
          url: source.url,
          week,
          rows,
        });
      } catch (err) {
        console.error(`  ❌ ${source.id}: ${err.message}`);
        polls.push({ id: source.id, gender: source.gender, league: source.league, url: source.url, week: null, rows: [] });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const total = polls.reduce((n, p) => n + p.rows.length, 0);
  console.log(`  Rankings total: ${total} ranked teams across ${polls.length} polls`);
  return polls;
}

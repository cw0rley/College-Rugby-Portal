/**
 * NCR (National Collegiate Rugby) scraper.
 *
 * Fetches all clubs from ncr.rugby/clubs across every division and gender,
 * handling Webflow CMS pagination.  Returns an array of programme objects
 * matching the Firestore schema used by College Rugby Portal.
 *
 * Usage:
 *   import { scrapeNCR } from "./scrape-ncr.js";
 *   const programs = await scrapeNCR();
 */

import * as cheerio from "cheerio";

const BASE = "https://www.ncr.rugby/clubs";

// Division tab pane indices and their pagination query-param keys.
// These are specific to the current Webflow build – if the site is
// redesigned they may need updating.  The scraper detects them
// automatically from the first page load, so this is just fallback.
const PANE_META = {
  // Populated dynamically at runtime
};

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CollegeRugbySync/1.0; +https://github.com/cw0rley/College-Rugby-Portal)",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return cheerio.load(await res.text());
}

function parsePanes($) {
  const panes = [];
  $(".w-tab-pane").each((i, pane) => {
    const $pane = $(pane);
    // Detect pagination param from "next" link
    const nextHref = $pane.find(".w-pagination-next").attr("href") || "";
    const match = nextHref.match(/([a-f0-9_]+_page)=(\d+)/);
    const paramKey = match ? match[1] : null;

    // Detect max page from numbered pagination links
    let maxPage = 1;
    $pane.find("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      const m = href.match(/page=(\d+)/);
      if (m) maxPage = Math.max(maxPage, parseInt(m[1], 10));
    });

    // Webflow often only shows "Next" without numbered page links,
    // so maxPage stays at 1 or 2.  Instead of guessing a max, we'll
    // paginate until a page returns zero items (see scrapeNCR below).
    // Set a high upper bound so the loop starts; it will stop early
    // when we encounter an empty page.
    if (paramKey && maxPage <= 2) {
      maxPage = 50; // safety cap — we break out when a page has 0 items
    }

    // Determine gender from first club card
    const firstTitle = $pane
      .find('[fs-cmsfilter-field="title"], .sub-header-small')
      .first()
      .text()
      .trim();
    const gender = firstTitle.toLowerCase().includes("women") ? "womens" : "mens";

    panes.push({ index: i, paramKey, maxPage, gender });
  });
  return panes;
}

function extractClubs($, $pane) {
  const clubs = [];
  $pane.find(".w-dyn-item").each((_, item) => {
    const $item = $(item);
    const title = $item
      .find('[fs-cmsfilter-field="title"], .sub-header-small')
      .text()
      .trim();

    // ONLY use the CMS filter attribute for conference — the .paragraph-text
    // fallback was grabbing school names, locations, and other junk text
    // for cards where the conference attribute is missing.
    let conference = "";
    const $confEl = $item.find('[fs-cmsfilter-field="conference"]');
    if ($confEl.length) {
      conference = $confEl.text().trim();
    }

    if (!title) return;

    const isWomen = title.toLowerCase().includes(" women");
    const school = title.replace(/\s+(Men|Women)$/i, "").trim();
    const gender = isWomen ? "womens" : "mens";

    // Reject conference values that look like school names
    if (conference && looksLikeSchoolName(conference)) {
      conference = "";
    }

    clubs.push({ school, gender, conference });
  });
  return clubs;
}

/** Reject values that are obviously school names, not conference names */
function looksLikeSchoolName(val) {
  const lower = val.toLowerCase();
  return (
    /\buniversity\b/i.test(val) ||
    /\bcollege\b/i.test(val) ||
    /\binstitute\b/i.test(val) ||
    /\bcommunity\b/i.test(val) ||
    /\bstate\s*$/i.test(val) ||
    /\bseminary\b/i.test(val) ||
    /\bacademy\b/i.test(val)
  ) && !(
    // Whitelist: these words appear in legitimate conference names
    /\bconference\b/i.test(val) ||
    /\bunion\b/i.test(val) ||
    /\brussian\b/i.test(val) ||
    /\bleague\b/i.test(val) ||
    /\brugby\b/i.test(val)
  );
}

// ─── main scraper ───────────────────────────────────────────────────────────

export async function scrapeNCR() {
  console.log("  Fetching NCR clubs page 1...");
  const $ = await fetchPage(BASE);
  const panes = parsePanes($);

  let allClubs = [];

  for (const pane of panes) {
    // Page 1 items
    const $pane = $($(".w-tab-pane")[pane.index]);
    const page1 = extractClubs($, $pane);
    allClubs.push(...page1);

    // Fetch remaining pages — keep going until we get an empty page
    if (pane.paramKey && pane.maxPage > 1) {
      for (let p = 2; p <= pane.maxPage; p++) {
        const url = `${BASE}?${pane.paramKey}=${p}`;
        console.log(`  Fetching pane ${pane.index} page ${p}...`);
        try {
          const $page = await fetchPage(url);
          const $pagePanes = $page($page(".w-tab-pane")[pane.index]);
          const items = extractClubs($page, $pagePanes);
          if (items.length === 0) {
            console.log(`  Pane ${pane.index}: no more items at page ${p}, stopping.`);
            break;
          }
          allClubs.push(...items);
        } catch (err) {
          console.warn(`  ⚠ Failed to fetch ${url}: ${err.message}`);
          break; // Stop pagination on error
        }
        // Small delay to be respectful
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // Deduplicate by school+gender
  const seen = new Set();
  allClubs = allClubs.filter(c => {
    const key = `${c.school.toLowerCase()}::${c.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  NCR total: ${allClubs.length} unique clubs`);
  return allClubs;
}

/**
 * CRAA (College Rugby Association of America) scraper.
 *
 * Fetches programs from craa.rugby by discovering all conference
 * sub-pages from the nav menu, then extracting team names from each page.
 *
 * CRAA covers the top-tier divisions:
 *   Men's:   D1A (Big 10, California, Midwest, Rocky Mountain, Rugby East, Independent)
 *            D1AA (Florida, Heart of America, NorCal, Northwest, Southwest, Independent)
 *            D2 (Florida, Gold Coast)
 *   Women's: D1 (Independent, Pacific Desert, Pacific Mountain)
 *            D2 (Florida, Pacific Desert, West Coast)
 *
 * The site renders team names as plain text (not tables or links),
 * so we extract school names from the page content between the header
 * and the footer.
 *
 * Returns an array of programme objects.
 */

import * as cheerio from "cheerio";

const BASE = "https://craa.rugby";

// Hardcoded conference sub-pages discovered from the CRAA nav menu.
// These are updated for the 2025-2026 site structure.
const CONFERENCE_PAGES = [
  // ── Men's D1A ──
  { url: `${BASE}/d1a/`, league: "CRAA D1A", gender: "mens", conf: "Big 10" },
  // Note: D1A landing page lists conferences, but individual conference
  // sub-pages don't exist — teams are listed on the D1A page itself or
  // we need the sub-conference nav links. Adding known sub-pages:

  // ── Men's D1AA ──
  { url: `${BASE}/florida-d1aa/`, league: "CRAA D1AA", gender: "mens", conf: "FCRC" },
  { url: `${BASE}/heart-of-america-d1aa/`, league: "CRAA D1AA", gender: "mens", conf: "Heart of America" },
  { url: `${BASE}/norcal-d1aa/`, league: "CRAA D1AA", gender: "mens", conf: "NorCal" },
  { url: `${BASE}/northwest-d1aa/`, league: "CRAA D1AA", gender: "mens", conf: "Northwest" },
  { url: `${BASE}/southwest-d1aa/`, league: "CRAA D1AA", gender: "mens", conf: "Southwest" },
  { url: `${BASE}/independent-men-d1aa/`, league: "CRAA D1AA", gender: "mens", conf: "Independent" },

  // ── Men's D2 ──
  { url: `${BASE}/d2-men/`, league: "CRAA D2", gender: "mens", conf: "" },
  { url: `${BASE}/florida-d2-men/`, league: "CRAA D2", gender: "mens", conf: "FCRC" },
  { url: `${BASE}/gold-coast-d2/`, league: "CRAA D2", gender: "mens", conf: "Gold Coast" },

  // ── Women's D1 ──
  { url: `${BASE}/d1/`, league: "CRAA D1", gender: "womens", conf: "" },
  { url: `${BASE}/independent-womens-d1/`, league: "CRAA D1", gender: "womens", conf: "Independent" },
  { url: `${BASE}/pacific-desert-d1/`, league: "CRAA D1", gender: "womens", conf: "Pacific Desert" },
  { url: `${BASE}/pacific-mountain-d1/`, league: "CRAA D1", gender: "womens", conf: "Pacific Mountain" },

  // ── Women's D2 ──
  { url: `${BASE}/d2/`, league: "CRAA D2", gender: "womens", conf: "" },
  { url: `${BASE}/florida-d2/`, league: "CRAA D2", gender: "womens", conf: "FCRC" },
  { url: `${BASE}/pacific-desert-d2/`, league: "CRAA D2", gender: "womens", conf: "Pacific Desert" },
  { url: `${BASE}/west-coast-d2-women/`, league: "CRAA D2", gender: "womens", conf: "West Coast" },
];

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; CollegeRugbySync/1.0; +https://github.com/cw0rley/College-Rugby-Portal)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return cheerio.load(await res.text());
}

/**
 * Extract school names from a CRAA conference page.
 *
 * CRAA pages display team names as plain text (not in tables or links).
 * The page structure is:
 *   - Nav + header (conference name)
 *   - School names as text in the main content area
 *   - Footer
 *
 * We identify school names by looking for text that contains
 * "University", "College", "Institute", or "State" and is
 * between 5 and 100 characters long.
 */
function extractSchoolNames($) {
  const schools = [];

  // Strategy 1: Look for text in main content area
  // CRAA uses Salient theme — content is typically in .wpb_wrapper, .vc_column, or article
  const contentSelectors = [
    ".wpb_wrapper",
    ".vc_column_inner",
    ".entry-content",
    "article",
    ".main-content",
    "#ajax-content-wrap",
  ];

  for (const selector of contentSelectors) {
    $(selector)
      .find("h2, h3, h4, h5, p, li, span, div")
      .each((_, el) => {
        const text = $(el).text().trim();
        // Skip nav/footer text and very short/long text
        if (text.length < 5 || text.length > 100) return;
        // Skip text that's clearly navigation or footer
        if (text.includes("©") || text.includes("Cookie") || text.includes("Menu")) return;

        // School names typically contain these keywords
        if (
          text.includes("University") ||
          text.includes("College") ||
          text.includes("Institute") ||
          text.match(/\bState\b/) ||
          text.match(/\bTech\b/)
        ) {
          // Clean up — take just the school name line
          const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 3);
          for (const line of lines) {
            if (
              line.length >= 5 &&
              line.length <= 100 &&
              (line.includes("University") ||
                line.includes("College") ||
                line.includes("Institute") ||
                line.match(/\bState\b/) ||
                line.match(/\bTech\b/))
            ) {
              schools.push(line);
            }
          }
        }
      });
  }

  // Strategy 2: Fallback — scan all text nodes
  if (schools.length === 0) {
    const bodyText = $("body").text();
    const lines = bodyText.split("\n").map((l) => l.trim()).filter((l) => l.length > 5 && l.length < 100);
    for (const line of lines) {
      if (
        (line.includes("University") ||
          line.includes("College") ||
          line.includes("Institute")) &&
        !line.includes("©") &&
        !line.includes("Cookie") &&
        !line.includes("Menu") &&
        !line.includes("http")
      ) {
        schools.push(line);
      }
    }
  }

  // Deduplicate
  return [...new Set(schools)];
}

export async function scrapeCRAA() {
  const allClubs = [];

  // Also try to discover any additional conference pages dynamically
  // by scraping the homepage nav
  let dynamicPages = [];
  try {
    const $ = await fetchPage(BASE);
    $("a").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      if (
        href.includes("craa.rugby/") &&
        (href.includes("-d1") || href.includes("-d2") || href.includes("-d1a")) &&
        !href.endsWith("/d1/") &&
        !href.endsWith("/d2/") &&
        !href.endsWith("/d1a/") &&
        !href.endsWith("/d1aa/") &&
        !href.endsWith("/d2-men/") &&
        !href.includes("gallery") &&
        !href.includes("news") &&
        !href.includes("documents") &&
        text.length > 2 &&
        text.length < 40
      ) {
        dynamicPages.push(href);
      }
    });
    dynamicPages = [...new Set(dynamicPages)];
  } catch (err) {
    console.warn(`  ⚠ Could not fetch CRAA homepage for nav discovery: ${err.message}`);
  }

  // Merge dynamic pages with hardcoded list
  const allUrls = new Set(CONFERENCE_PAGES.map((p) => p.url));
  for (const url of dynamicPages) {
    if (!allUrls.has(url)) {
      // Determine league/gender from URL
      const isWomens = url.includes("-d1/") || url.includes("-d2/") || url.includes("women");
      const gender = isWomens ? "womens" : "mens";
      let league = "CRAA";
      if (url.includes("d1aa")) league = "CRAA D1AA";
      else if (url.includes("d1a")) league = "CRAA D1A";
      else if (url.includes("d1")) league = "CRAA D1";
      else if (url.includes("d2")) league = "CRAA D2";

      CONFERENCE_PAGES.push({ url, league, gender, conf: "" });
      allUrls.add(url);
    }
  }

  console.log(`  CRAA: scraping ${CONFERENCE_PAGES.length} conference pages...`);

  for (const page of CONFERENCE_PAGES) {
    try {
      const $ = await fetchPage(page.url);
      const schoolNames = extractSchoolNames($);

      for (const school of schoolNames) {
        allClubs.push({
          school: school.replace(/\s+(Men'?s?|Women'?s?|Rugby)$/i, "").trim(),
          gender: page.gender,
          league: page.league,
          conference: page.conf || "",
        });
      }

      if (schoolNames.length > 0) {
        console.log(`    ✓ ${page.url.replace(BASE, "")} → ${schoolNames.length} teams`);
      }
    } catch (err) {
      console.warn(`  ⚠ Failed to scrape ${page.url}: ${err.message}`);
    }

    // Small delay
    await new Promise((r) => setTimeout(r, 200));
  }

  // Deduplicate
  const seen = new Set();
  const unique = allClubs.filter((c) => {
    const key = `${c.school.toLowerCase()}::${c.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  CRAA total: ${unique.length} unique clubs`);
  return unique;
}

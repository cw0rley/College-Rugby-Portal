/**
 * NCR (National Collegiate Rugby) scraper.
 *
 * Fetches all clubs from ncr.rugby/clubs across every division and gender.
 * Returns an array of programme objects matching the Firestore schema used
 * by College Rugby Portal.
 *
 * NCR moved from Webflow to WordPress in 2026.  The club directory is now
 * rendered server-side in a single page — every club is present in the HTML,
 * so there is no pagination to follow.  Clubs are grouped in
 * <section class="ncr-cd-group"> blocks, one per conference, and each club is
 * an <article class="ncr-cd-row"> carrying data-gender and data-division.
 *
 * Usage:
 *   import { scrapeNCR } from "./scrape-ncr.js";
 *   const programs = await scrapeNCR();
 */

import * as cheerio from "cheerio";

const BASE = "https://ncr.rugby/clubs/";

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

/** Reject values that are obviously school names, not conference names */
function looksLikeSchoolName(val) {
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

/**
 * Club rows carry an explicit data-gender attribute.  Fall back to the
 * "… Men" / "… Women" suffix on the club name if it is ever missing.
 */
function readGender($row, title) {
  const attr = ($row.attr("data-gender") || "").toLowerCase();
  if (attr.startsWith("women")) return "womens";
  if (attr.startsWith("men")) return "mens";
  return /\bwomen('s)?\s*$/i.test(title) ? "womens" : "mens";
}

/** "Baldwin Wallace University Men" → "Baldwin Wallace University" */
function cleanSchool(title) {
  return title.replace(/\s+(Men|Women)(['’]s)?\s*$/i, "").trim();
}

// ─── main scraper ───────────────────────────────────────────────────────────

export async function scrapeNCR() {
  console.log("  Fetching NCR clubs directory...");
  const $ = await fetchPage(BASE);

  const groups = $(".ncr-cd-group");
  if (groups.length === 0) {
    throw new Error(
      "No .ncr-cd-group sections found — the NCR club directory markup has " +
      "likely changed again. Re-inspect https://ncr.rugby/clubs/."
    );
  }

  const allClubs = [];

  groups.each((_, group) => {
    const $group = $(group);

    let conference = $group.find(".ncr-cd-group-title").first().text().trim();
    if (conference && looksLikeSchoolName(conference)) conference = "";

    $group.find(".ncr-cd-row").each((__, row) => {
      const $row = $(row);
      const title = $row.find(".ncr-cd-club-name").first().text().trim();
      if (!title) return;

      allClubs.push({
        school: cleanSchool(title),
        gender: readGender($row, title),
        conference,
      });
    });
  });

  if (allClubs.length === 0) {
    throw new Error(
      `Found ${groups.length} conference groups but no club rows — the NCR ` +
      "club directory markup has likely changed. Re-inspect https://ncr.rugby/clubs/."
    );
  }

  // Deduplicate by school+gender
  const seen = new Set();
  const unique = allClubs.filter(c => {
    const key = `${c.school.toLowerCase()}::${c.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  NCR total: ${unique.length} unique clubs`);
  return unique;
}

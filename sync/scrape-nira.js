/**
 * NIRA (National Intercollegiate Rugby Association) scraper.
 *
 * NIRA governs NCAA women's rugby — the only NCAA-sanctioned varsity
 * women's rugby league.  This scraper fetches the /teams page which
 * lists programs across Division I, II, and III.
 *
 * URL: https://nira.rugby/teams/
 *
 * Data available per team:
 *   - School name
 *   - Link to the school's athletics website
 *   - Division (I, II, III)
 *
 * No coach contacts or emails are publicly listed on NIRA.
 * All programs are women's only.
 */

import * as cheerio from "cheerio";

const TEAMS_URL = "https://nira.rugby/teams/";

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

export async function scrapeNIRA() {
  console.log("  Fetching NIRA teams...");
  const $ = await fetchPage(TEAMS_URL);

  const allTeams = [];

  // NIRA uses tabs for Division I / II / III
  // The page renders all divisions in the DOM with tab panels
  // Look for team names — they appear as text near external links to school athletics sites

  // Strategy 1: Find links to external school athletics websites
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // External links to athletics sites (not nira.rugby internal links)
    if (
      !href.includes("nira.rugby") &&
      !href.includes("#") &&
      !href.includes("facebook") &&
      !href.includes("instagram") &&
      text.length > 5 &&
      text.length < 80 &&
      (text.includes("University") ||
        text.includes("College") ||
        text.includes("Point") ||
        text.includes("Academy") ||
        text.includes("Institute"))
    ) {
      allTeams.push({
        school: text.replace(/\s+(Women'?s?|Rugby)$/i, "").trim(),
        gender: "womens",
        website: href,
      });
    }
  });

  // Strategy 2: Look for headings/text blocks with school names
  if (allTeams.length === 0) {
    $("h3, h4, h5, .team-name, [class*='team']").each((_, el) => {
      const text = $(el).text().trim();
      if (
        text.length > 5 &&
        text.length < 80 &&
        (text.includes("University") || text.includes("College"))
      ) {
        allTeams.push({
          school: text.replace(/\s+(Women'?s?|Rugby)$/i, "").trim(),
          gender: "womens",
        });
      }
    });
  }

  // Deduplicate
  const seen = new Set();
  const unique = allTeams.filter((t) => {
    const key = t.school.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // All NIRA programs are NIRA league
  unique.forEach((t) => {
    t.league = "NIRA";
  });

  console.log(`  NIRA total: ${unique.length} unique teams`);
  return unique;
}

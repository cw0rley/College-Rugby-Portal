/**
 * Goff Rugby Report scraper.
 *
 * Goff Rugby Report (goffrugbyreport.com) is the premier independent
 * news and standings source for U.S. college rugby.
 *
 * Data structure:
 *   /conferences              — Lists ~60 college conferences with logos and links
 *   /conference/{slug}        — Per-conference page with standings tables
 *                               showing team names, W/L/T, PF, PA, etc.
 *
 * Useful for:
 *   - Discovering which teams are in which conference (from standings tables)
 *   - Detecting new teams or conference realignment
 *   - Cross-referencing team membership
 *
 * Does NOT provide:
 *   - Coach contacts or emails
 *   - School metadata (tuition, enrollment, etc.)
 */

import * as cheerio from "cheerio";

const CONFERENCES_URL = "https://goffrugbyreport.com/conferences";

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

/**
 * Scrape the list of all college conferences from the conferences index.
 * Returns: [{ name, url }]
 */
export async function scrapeGoffConferences() {
  console.log("  Fetching Goff conferences index...");
  const $ = await fetchPage(CONFERENCES_URL);

  const conferences = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    if (
      href.includes("/conference/") &&
      !href.endsWith("/conferences") &&
      text.length > 3
    ) {
      // Resolve relative URLs to absolute
      const fullUrl = href.startsWith("http")
        ? href
        : new URL(href, "https://goffrugbyreport.com").href;
      conferences.push({ name: text, url: fullUrl });
    }
  });

  // Deduplicate by URL
  const seen = new Set();
  const unique = conferences.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });

  console.log(`  Goff conferences: ${unique.length}`);
  return unique;
}

/**
 * Scrape a single conference page for team standings.
 * Returns: [{ school, conference, gender }]
 */
async function scrapeConferencePage(confName, url) {
  try {
    const $ = await fetchPage(url);

    const teams = [];

    // Goff conference pages have standings tables with team names
    // Tables have headers like "ARC", "W", "L", "T", "PF", "PA", etc.
    $("table").each((_, table) => {
      const $table = $(table);

      // Determine gender from section heading before this table
      let sectionText = "";
      let prev = $table.prev();
      for (let i = 0; i < 5 && prev.length; i++) {
        const txt = prev.text().trim().toLowerCase();
        if (txt.includes("men") || txt.includes("women")) {
          sectionText = txt;
          break;
        }
        prev = prev.prev();
      }
      const gender = sectionText.includes("women") ? "womens" : "mens";

      // Extract team names from first column of each row
      $table.find("tr").each((_, row) => {
        const firstCell = $(row).find("td").first();
        const teamName = firstCell.text().trim();
        if (
          teamName &&
          teamName.length > 1 &&
          teamName.length < 80 &&
          !teamName.match(/^(W|L|T|PF|PA|PD|BT|BL|Pts|Team|Updated|#)$/i)
        ) {
          teams.push({
            school: teamName
              .replace(/\s+(Men'?s?|Women'?s?|Rugby)$/i, "")
              .trim(),
            conference: confName,
            gender,
          });
        }
      });
    });

    return teams;
  } catch (err) {
    console.warn(`  ⚠ Failed to scrape ${url}: ${err.message}`);
    return [];
  }
}

/**
 * Full Goff scrape — fetches all conferences, then scrapes each one
 * for team standings.  This can take a while (~60 conference pages).
 *
 * Set `maxConferences` to limit for testing.
 */
export async function scrapeGoff({ maxConferences = Infinity } = {}) {
  const conferences = await scrapeGoffConferences();
  const limit = Math.min(conferences.length, maxConferences);

  let allTeams = [];
  for (let i = 0; i < limit; i++) {
    const conf = conferences[i];
    console.log(
      `  Scraping Goff conference ${i + 1}/${limit}: ${conf.name}...`
    );
    const teams = await scrapeConferencePage(conf.name, conf.url);
    allTeams.push(...teams);

    // Small delay to be respectful
    if (i < limit - 1) await new Promise((r) => setTimeout(r, 300));
  }

  // Deduplicate
  const seen = new Set();
  allTeams = allTeams.filter((t) => {
    const key = `${t.school.toLowerCase()}::${t.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  Goff total: ${allTeams.length} unique teams`);
  return allTeams;
}

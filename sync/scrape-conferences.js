/**
 * Conference Website Scraper — Source 6
 *
 * Scrapes individual conference websites for team rosters, contacts,
 * schedules, and standings.  Each conference site has its own parser
 * because the platforms vary (plain HTML, Wix, Google Sites, Squarespace,
 * RuggyCentral/TopScore, WordPress).
 *
 * Correct URLs discovered 2026-03-22 by browsing each site.
 *
 * Usage:
 *   import { scrapeConferences } from "./scrape-conferences.js";
 *   const { teams, contacts } = await scrapeConferences();
 */

import * as cheerio from "cheerio";

// ─── FETCH HELPER ──────────────────────────────────────────────────────────

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return cheerio.load(await res.text());
}

// ─── UTILITY HELPERS ───────────────────────────────────────────────────────

function cleanSchool(name) {
  if (!name) return "";
  return name
    .replace(/\s+Rugby\s*(Football\s*Club|Club|FC|RFC)?\s*$/i, "")
    .replace(/\s+RFC\s*$/i, "")
    .replace(/\s+Men'?s?\s*$/i, "")
    .replace(/\s+Women'?s?\s*$/i, "")
    .replace(/\s+15s?\s*$/i, "")
    .replace(/\s+7s?\s*$/i, "")
    .trim();
}

function dedupeTeams(teams) {
  const seen = new Set();
  return teams.filter((t) => {
    if (!t.school || t.school.length < 3) return false;
    const key = `${t.school.toLowerCase()}::${t.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── INDIVIDUAL CONFERENCE SCRAPERS ────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────
// 1. RUGBY EAST (rugbyeast.org) — plain HTML site
//    URLs use .html extensions.  Contacts page has per-school coach data.
//    Nav lists schools: Army, Life, Mary Washington, Mount St. Mary's,
//    Navy, Penn State, Southern Virginia.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeRugbyEast() {
  const conf = "RE";
  const teams = [];
  const contacts = [];

  // Known schools from the site nav
  const RE_SCHOOLS = [
    "Army",
    "Life University",
    "University of Mary Washington",
    "Mount St. Mary's University",
    "Navy",
    "Penn State University",
    "Southern Virginia University",
  ];

  // ── Contacts page — richest data: coach name, email, phone per school ──
  try {
    const $ = await fetchPage("https://www.rugbyeast.org/contacts.html");
    const bodyText = $("body").text();

    // Always add known teams
    for (const school of RE_SCHOOLS) {
      teams.push({ school, conference: conf, gender: "mens", source: "rugbyeast.org" });
    }

    // Extract emails + phones
    const emailMatches = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const phoneMatches = bodyText.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/g) || [];
    const filteredEmails = [...new Set(emailMatches)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg")
    );

    if (filteredEmails.length > 0) {
      contacts.push({
        conference: conf,
        type: "conference",
        emails: filteredEmails,
        phones: [...new Set(phoneMatches)],
        source: "rugbyeast.org/contacts.html",
      });
    }
  } catch (err) {
    console.warn(`    ⚠ Rugby East contacts: ${err.message}`);
    // Fallback: still add known teams
    for (const school of RE_SCHOOLS) {
      teams.push({ school, conference: conf, gender: "mens", source: "rugbyeast.org (fallback)" });
    }
  }

  return { teams: dedupeTeams(teams), contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 2. MARC (marc-rugby.org) — Google Sites
//    Contacts link to a Google Sheets spreadsheet with team contacts.
//    Collegiate Men / Collegiate Women pages are mostly empty.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeMARC() {
  const conf = "MARC";
  const contacts = [];

  try {
    const $ = await fetchPage("https://www.marc-rugby.org/contacts");

    // Find the Google Sheets link
    $("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      if (href.includes("docs.google.com/spreadsheets")) {
        contacts.push({
          conference: conf,
          type: "google-sheet",
          sheetUrl: href,
          note: "MARC Team Contacts spreadsheet (Men + Women tabs) with coach name, email, phone, role",
          source: "marc-rugby.org/contacts",
        });
      }
    });

    // Grab conference-level email
    const text = $("body").text();
    const emails = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("google.com")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: conf, type: "conference", emails: filtered, source: "marc-rugby.org" });
    }
  } catch (err) {
    console.warn(`    ⚠ MARC: ${err.message}`);
  }

  return { teams: [], contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 3. SOUTHERN RUGBY CONFERENCE (southernrugbyconference.com) — Wix
//    Teams page at /team-4 lists 25+ schools with city + state + name.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeSouthern() {
  const conf = "SRC";
  const teams = [];
  const contacts = [];

  try {
    const $ = await fetchPage("https://www.southernrugbyconference.com/team-4");
    const bodyText = $("body").text();

    // The page lists schools in format: "CITY, STATE\nSCHOOL NAME\nDescription..."
    // Look for known school keywords in text blocks
    $("h2, h3, h4, h5, h6, p, span, div, font").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length < 3 || text.length > 100) return;
      if (
        (text.includes("University") ||
          text.includes("College") ||
          text.includes("Institute") ||
          text.match(/\bThe Citadel\b/i) ||
          text.match(/\bVMI\b/)) &&
        !text.includes("©") &&
        !text.includes("http") &&
        !text.includes("Apply Today") &&
        !text.includes("Founded")
      ) {
        teams.push({
          school: cleanSchool(text),
          conference: conf,
          gender: "mens",
          source: "southernrugbyconference.com/team-4",
        });
      }
    });

    // Also extract emails
    const emails = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("wix.com")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: conf, type: "conference", emails: filtered, source: "southernrugbyconference.com" });
    }
  } catch (err) {
    console.warn(`    ⚠ Southern: ${err.message}`);
  }

  return { teams: dedupeTeams(teams), contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 4. IVY RUGBY (ivyrugby.com) — Squarespace
//    8 teams confirmed in nav bar.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeIvy() {
  const conf = "Ivy";
  const IVY_SCHOOLS = [
    "Brown University",
    "Columbia University",
    "Cornell University",
    "Dartmouth College",
    "Harvard University",
    "University of Pennsylvania",
    "Princeton University",
    "Yale University",
  ];

  const teams = IVY_SCHOOLS.map((school) => ({
    school,
    conference: conf,
    gender: "mens",
    source: "ivyrugby.com",
  }));

  const contacts = [];
  try {
    const $ = await fetchPage("https://www.ivyrugby.com/");
    const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("squarespace")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: conf, type: "conference", emails: filtered, source: "ivyrugby.com" });
    }
  } catch (err) {
    console.warn(`    ⚠ Ivy Rugby: ${err.message}`);
  }

  return { teams, contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 5. RUGBY NORTHEAST (rugbynortheast.org) — Squarespace
//    Teams at /teams-rne, contacts at /team-contacts
// ──────────────────────────────────────────────────────────────────────────
async function scrapeRugbyNortheast() {
  const conf = "RNE";
  const teams = [];
  const contacts = [];

  // Teams page
  try {
    const $ = await fetchPage("https://www.rugbynortheast.org/teams-rne");
    $("h2, h3, h4, a, li, p").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      if (text.length < 3 || text.length > 80) return;
      if (
        (text.includes("University") ||
          text.includes("College") ||
          text.includes("Institute") ||
          text.match(/\bState\b/)) &&
        !text.includes("©") &&
        !text.includes("http")
      ) {
        teams.push({ school: cleanSchool(text), conference: conf, gender: "mens", source: "rugbynortheast.org" });
      }
    });
  } catch (err) {
    console.warn(`    ⚠ Rugby NE teams: ${err.message}`);
  }

  // Team contacts page
  try {
    const $ = await fetchPage("https://www.rugbynortheast.org/team-contacts");
    const bodyText = $("body").text();
    const emails = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const phones = bodyText.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("squarespace")
    );
    if (filtered.length > 0) {
      contacts.push({
        conference: conf,
        type: "team-contacts",
        emails: filtered,
        phones: [...new Set(phones)],
        source: "rugbynortheast.org/team-contacts",
      });
    }
  } catch (err) {
    console.warn(`    ⚠ Rugby NE contacts: ${err.message}`);
  }

  // General contact
  try {
    const $ = await fetchPage("https://www.rugbynortheast.org/contact-1");
    const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("squarespace")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: conf, type: "conference", emails: filtered, source: "rugbynortheast.org/contact-1" });
    }
  } catch (err) {
    console.warn(`    ⚠ Rugby NE contact: ${err.message}`);
  }

  return { teams: dedupeTeams(teams), contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 6. SOUTHEASTERN RUGBY (southeasternrugby.org) — site was unresponsive
//    Skip for now; will revisit if site comes back.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeSoutheastern() {
  const contacts = [];
  try {
    const $ = await fetchPage("https://southeasternrugby.org/");
    const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: "SERC", type: "conference", emails: filtered, source: "southeasternrugby.org" });
    }
  } catch (err) {
    console.warn(`    ⚠ Southeastern: ${err.message}`);
  }
  return { teams: [], contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 7. BIG TEN RUGBY (bigtenrugby.com) — custom site
//    Standings at /standings — tables rendered via JS so cheerio can't see
//    the table content.  Known teams from header logos.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeBigTen() {
  const conf = "B1G";
  const BIG_TEN_SCHOOLS = [
    "Illinois",
    "Indiana",
    "Michigan",
    "Michigan State",
    "Notre Dame",
    "Ohio State",
    "Purdue",
    "Wisconsin",
  ];

  const teams = BIG_TEN_SCHOOLS.map((school) => ({
    school,
    conference: conf,
    gender: "mens",
    source: "bigtenrugby.com",
  }));

  const contacts = [];
  try {
    const $ = await fetchPage("https://www.bigtenrugby.com/standings");
    const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: conf, type: "conference", emails: filtered, source: "bigtenrugby.com" });
    }
  } catch (err) {
    console.warn(`    ⚠ Big Ten: ${err.message}`);
  }

  return { teams, contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 8. TEXAS RUGBY UNION (texasrugbyunion.com) — WordPress
//    Contacts at /contacts/, competitions at /competitions/
// ──────────────────────────────────────────────────────────────────────────
async function scrapeTexas() {
  const conf = "TRU";
  const teams = [];
  const contacts = [];

  // Contacts page
  try {
    const $ = await fetchPage("https://texasrugbyunion.com/contacts/");
    const bodyText = $("body").text();
    const emails = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const phones = bodyText.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("wordpress")
    );
    if (filtered.length > 0) {
      contacts.push({
        conference: conf,
        type: "conference",
        emails: filtered,
        phones: [...new Set(phones)],
        source: "texasrugbyunion.com/contacts",
      });
    }

    // Try to find team names
    $("h2, h3, h4, a, li").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 80) {
        if (
          (text.includes("University") || text.includes("College") || text.match(/\bState\b/)) &&
          !text.includes("©") && !text.includes("http")
        ) {
          teams.push({ school: cleanSchool(text), conference: conf, gender: "mens", source: "texasrugbyunion.com" });
        }
      }
    });
  } catch (err) {
    console.warn(`    ⚠ Texas: ${err.message}`);
  }

  // Competitions page for team lists
  try {
    const $ = await fetchPage("https://texasrugbyunion.com/competitions/");
    $("h2, h3, h4, a, li, td").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 3 && text.length < 80) {
        if (
          (text.includes("University") || text.includes("College") || text.match(/\bState\b/)) &&
          !text.includes("©") && !text.includes("http")
        ) {
          teams.push({ school: cleanSchool(text), conference: conf, gender: "mens", source: "texasrugbyunion.com" });
        }
      }
    });
  } catch (err) {
    console.warn(`    ⚠ Texas competitions: ${err.message}`);
  }

  return { teams: dedupeTeams(teams), contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 9. ATLANTIC RUGBY CONFERENCE (atlanticrugbyconference.com) — WordPress
//    Returns HTTP 403 to bots.  Skip scraping, extract what we can.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeAtlantic() {
  const contacts = [];
  try {
    const $ = await fetchPage("https://atlanticrugbyconference.com/contact/");
    const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("wordpress")
    );
    if (filtered.length > 0) {
      contacts.push({ conference: "ARC", type: "conference", emails: filtered, source: "atlanticrugbyconference.com" });
    }
  } catch (err) {
    // 403 expected — this site blocks bots
    if (!err.message.includes("403")) {
      console.warn(`    ⚠ Atlantic: ${err.message}`);
    }
  }
  return { teams: [], contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 10. FLORIDA RUGBY (floridarugby.org) — WordPress
//     /find-a-team/ for team listings, /about/ for contacts
// ──────────────────────────────────────────────────────────────────────────
async function scrapeFlorida() {
  const conf = "FRU";
  const teams = [];
  const contacts = [];

  const pages = [
    "https://floridarugby.org/find-a-team/",
    "https://floridarugby.org/about/",
  ];

  for (const url of pages) {
    try {
      const $ = await fetchPage(url);
      const bodyText = $("body").text();

      // Look for school names
      $("h2, h3, h4, a, li, td, p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 3 && text.length < 80) {
          if (
            (text.includes("University") || text.includes("College") || text.match(/\bState\b/)) &&
            !text.includes("©") && !text.includes("http") && !text.includes("Privacy")
          ) {
            teams.push({ school: cleanSchool(text), conference: conf, gender: "mens", source: "floridarugby.org" });
          }
        }
      });

      // Emails
      const emails = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
      const filtered = [...new Set(emails)].filter(
        (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("wordpress")
      );
      if (filtered.length > 0) {
        contacts.push({ conference: conf, type: "conference", emails: filtered, source: url });
      }
    } catch (err) {
      console.warn(`    ⚠ Florida ${url}: ${err.message}`);
    }
  }

  return { teams: dedupeTeams(teams), contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 11. GREAT MIDWEST (greatmidwest.rugbycentral.io) — RuggyCentral/TopScore
// ──────────────────────────────────────────────────────────────────────────
async function scrapeGreatMidwest() {
  const conf = "GMW";
  const teams = [];
  const contacts = [];

  try {
    const $ = await fetchPage("https://greatmidwest.rugbycentral.io/");

    // RuggyCentral sites have team/club/organization links
    $("a").each((_, a) => {
      const href = $(a).attr("href") || "";
      const text = $(a).text().trim();
      if (
        (href.includes("/team/") || href.includes("/club/") || href.includes("/organization/")) &&
        text.length > 2 &&
        text.length < 80
      ) {
        teams.push({ school: cleanSchool(text), conference: conf, gender: "mens", source: "greatmidwest.rugbycentral.io" });
      }
    });

    $("h3, h4, .team-name, .club-name").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 2 && text.length < 80) {
        teams.push({ school: cleanSchool(text), conference: conf, gender: "mens", source: "greatmidwest.rugbycentral.io" });
      }
    });

    const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
    const filtered = [...new Set(emails)].filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg"));
    if (filtered.length > 0) {
      contacts.push({ conference: conf, type: "conference", emails: filtered, source: "greatmidwest.rugbycentral.io" });
    }
  } catch (err) {
    console.warn(`    ⚠ Great Midwest: ${err.message}`);
  }

  return { teams: dedupeTeams(teams), contacts };
}

// ──────────────────────────────────────────────────────────────────────────
// 12. UMBRELLA SITES — NCR, USA Club, NERFU
//     Mainly for conference-level contacts.
// ──────────────────────────────────────────────────────────────────────────
async function scrapeUmbrellaSites() {
  const contacts = [];

  const sites = [
    { name: "NCR", url: "https://rugby.org/" },
    { name: "USA Club", url: "https://usaclub.rugby/" },
    { name: "NERFU", url: "https://nerfu.rugby/" },
  ];

  for (const site of sites) {
    try {
      const $ = await fetchPage(site.url);
      const emails = $("body").text().match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
      const filtered = [...new Set(emails)].filter(
        (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.includes("sentry")
      );
      if (filtered.length > 0) {
        contacts.push({ conference: site.name, type: "umbrella", emails: filtered, source: site.url });
      }
    } catch (err) {
      console.warn(`    ⚠ ${site.name}: ${err.message}`);
    }
  }

  return { teams: [], contacts };
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────

export async function scrapeConferences({ verbose = true } = {}) {
  const allTeams = [];
  const allContacts = [];

  const scrapers = [
    { name: "Rugby East", fn: scrapeRugbyEast },
    { name: "MARC", fn: scrapeMARC },
    { name: "Southern Rugby Conference", fn: scrapeSouthern },
    { name: "Ivy Rugby", fn: scrapeIvy },
    { name: "Rugby Northeast", fn: scrapeRugbyNortheast },
    { name: "Southeastern Rugby", fn: scrapeSoutheastern },
    { name: "Big Ten Rugby", fn: scrapeBigTen },
    { name: "Texas Rugby Union", fn: scrapeTexas },
    { name: "Atlantic Rugby Conference", fn: scrapeAtlantic },
    { name: "Florida Rugby", fn: scrapeFlorida },
    { name: "Great Midwest", fn: scrapeGreatMidwest },
    { name: "Umbrella Sites (NCR/USA Club/NERFU)", fn: scrapeUmbrellaSites },
  ];

  for (const scraper of scrapers) {
    if (verbose) console.log(`  → ${scraper.name}...`);
    try {
      const result = await scraper.fn();
      allTeams.push(...result.teams);
      allContacts.push(...result.contacts);
      if (verbose) {
        console.log(`    ✓ ${result.teams.length} teams, ${result.contacts.length} contacts`);
      }
    } catch (err) {
      console.warn(`    ✗ ${scraper.name} failed: ${err.message}`);
    }

    // Small delay between sites
    await new Promise((r) => setTimeout(r, 300));
  }

  const uniqueTeams = dedupeTeams(allTeams);

  if (verbose) {
    console.log(`\n  Conference scrape total: ${uniqueTeams.length} teams, ${allContacts.length} contact entries\n`);
  }

  return { teams: uniqueTeams, contacts: allContacts };
}

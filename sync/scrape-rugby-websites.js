/**
 * Rugby Website Staff Scraper
 *
 * Visits each program's rugbyWebsite URL and looks for coaching staff pages.
 * Tries common patterns: /coaches, /staff, /coaching-staff, /roster#coaches
 *
 * Returns an array of { school, gender, contacts: [{ contact, contactTitle, email }] }
 *
 * Usage:
 *   import { scrapeRugbyWebsites } from "./scrape-rugby-websites.js";
 *   const results = await scrapeRugbyWebsites(programs);
 */

import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const STAFF_PATH_PATTERNS = [
  "/coaches",
  "/coaching-staff",
  "/staff",
  "/roster/coaches",
  "/roster#sidearm-roster-coaches",
  "/about/coaches",
  "/about/staff",
  "/team/coaches",
  "/team#coaches",
];

const TITLE_KEYWORDS = [
  "head coach", "assistant coach", "director of rugby", "associate head coach",
  "forwards coach", "backs coach", "volunteer coach", "graduate assistant",
  "director of operations", "head men", "head women", "assistant director",
  "coaching staff", "coach", "director",
];

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function extractEmailsFromText(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set((text.match(emailRegex) || []).map(e => e.toLowerCase()))];
}

function cleanName(name) {
  return (name || "")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s'.,-]/g, "")
    .trim();
}

function isLikelyCoachTitle(text) {
  const lower = (text || "").toLowerCase();
  return TITLE_KEYWORDS.some(kw => lower.includes(kw));
}

function parseStaffFromHTML(html, baseUrl) {
  const $ = cheerio.load(html);
  const contacts = [];

  // Strategy 1: Look for structured staff cards (sidearm sports pattern)
  $(".sidearm-roster-player-name, .coaches-table tr, .staff-card, .coach-card, .coaching-staff-member").each((_, el) => {
    const text = $(el).text().trim();
    const emails = extractEmailsFromText($(el).html() || "");
    if (text.length > 2 && text.length < 200) {
      contacts.push({ raw: text, emails });
    }
  });

  // Strategy 2: Look for dl/dt/dd pairs (common on athletics sites)
  $("dl").each((_, dl) => {
    $(dl).find("dt").each((i, dt) => {
      const name = cleanName($(dt).text());
      const dd = $(dt).next("dd");
      const title = dd.length ? cleanName(dd.text()) : "";
      const emails = extractEmailsFromText($(dl).html() || "");
      if (name && name.length > 2 && name.length < 80) {
        contacts.push({ raw: `${name} - ${title}`, name, title, emails });
      }
    });
  });

  // Strategy 3: Look for table rows with name/title/email columns
  $("table").each((_, table) => {
    const headers = [];
    $(table).find("th, thead td").each((_, th) => {
      headers.push($(th).text().toLowerCase().trim());
    });
    const nameIdx = headers.findIndex(h => h.includes("name") || h.includes("coach"));
    const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("position") || h.includes("role"));
    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));

    if (nameIdx >= 0 || headers.length === 0) {
      $(table).find("tbody tr, tr").each((_, tr) => {
        const cells = [];
        $(tr).find("td").each((_, td) => cells.push($(td).text().trim()));
        if (cells.length >= 2) {
          const name = cleanName(cells[nameIdx >= 0 ? nameIdx : 0]);
          const title = titleIdx >= 0 ? cleanName(cells[titleIdx]) : "";
          const emailCell = emailIdx >= 0 ? cells[emailIdx] : "";
          const emails = extractEmailsFromText(cells.join(" "));
          if (name && name.length > 2 && name.length < 80 && !name.toLowerCase().includes("name")) {
            contacts.push({ raw: `${name} - ${title}`, name, title, emails });
          }
        }
      });
    }
  });

  // Strategy 4: Look for any element with coach-related class or text
  $("div, section, article").each((_, el) => {
    const classes = ($(el).attr("class") || "").toLowerCase();
    if (classes.includes("coach") || classes.includes("staff")) {
      // Look for h3/h4/strong with names and p/span with titles
      $(el).find("h2, h3, h4, h5, strong, .name").each((_, nameEl) => {
        const name = cleanName($(nameEl).text());
        const next = $(nameEl).next();
        const title = next.length ? cleanName(next.text()) : "";
        const parentHtml = $(el).html() || "";
        const emails = extractEmailsFromText(parentHtml);
        if (name && name.length > 2 && name.length < 80 && isLikelyCoachTitle(title)) {
          contacts.push({ raw: `${name} - ${title}`, name, title, emails });
        }
      });
    }
  });

  // Deduplicate by name
  const seen = new Set();
  return contacts.filter(c => {
    const key = (c.name || c.raw || "").toLowerCase().trim();
    if (!key || key.length < 3 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseContactFromRaw(raw, emails) {
  // Try to split "Name - Title" or "Name | Title" or "Name, Title"
  const parts = raw.split(/\s*[-–|,]\s*/);
  let name = cleanName(parts[0]);
  let title = parts.length > 1 ? cleanName(parts.slice(1).join(" ")) : "";

  // If name looks like a title, swap
  if (isLikelyCoachTitle(name) && !isLikelyCoachTitle(title)) {
    [name, title] = [title, name];
  }

  return {
    contact: name,
    contactTitle: title,
    email: (emails && emails.length > 0) ? emails[0] : "",
  };
}

export async function scrapeRugbyWebsites(programs, options = {}) {
  const { maxConcurrent = 5, delayMs = 200 } = options;
  const results = [];
  const withUrl = programs.filter(p => p.rugbyWebsite && p.gender === "mens"); // Start with mens to avoid duplicates

  console.log(`  Scanning ${withUrl.length} rugby websites for coaching staff...`);

  for (let i = 0; i < withUrl.length; i++) {
    const prog = withUrl[i];
    const baseUrl = prog.rugbyWebsite.replace(/\/$/, "");

    try {
      // First try the main page
      let html = await fetchWithTimeout(baseUrl);
      let staffHtml = null;

      // Then try common staff page paths
      for (const path of STAFF_PATH_PATTERNS) {
        const url = baseUrl + path;
        const page = await fetchWithTimeout(url);
        if (page && page.length > 1000) {
          const lower = page.toLowerCase();
          if (lower.includes("coach") || lower.includes("staff") || lower.includes("director")) {
            staffHtml = page;
            break;
          }
        }
      }

      const pageToparse = staffHtml || html;
      if (!pageToparse) continue;

      const rawContacts = parseStaffFromHTML(pageToparse, baseUrl);
      if (rawContacts.length > 0) {
        const contacts = rawContacts
          .map(c => {
            if (c.name && c.title) {
              return { contact: c.name, contactTitle: c.title, email: (c.emails && c.emails[0]) || "" };
            }
            return parseContactFromRaw(c.raw, c.emails);
          })
          .filter(c => c.contact && c.contact.length > 2);

        if (contacts.length > 0) {
          results.push({
            school: prog.school,
            gender: prog.gender,
            rugbyWebsite: prog.rugbyWebsite,
            contacts,
          });
        }
      }
    } catch (err) {
      // Skip failed sites silently
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  Scanned ${i + 1}/${withUrl.length}...`);
    }

    // Small delay to be polite
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }

  console.log(`  Found staff on ${results.length}/${withUrl.length} sites`);
  return results;
}

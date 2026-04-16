/**
 * Scraper for Eastern Pennsylvania Rugby Union (EPRU)
 * Source: https://epru.rugby/teams-contacts/
 * Extracts college team contacts (coaches, directors, recruiting coordinators)
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGE_URL = "https://epru.rugby/teams-contacts/";
const OUTPUT = path.join(__dirname, "scraped-epru.json");

export async function scrapeEPRU() {
  console.log("Scraping EPRU teams & contacts...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 30000 });

  const html = await page.content();
  await browser.close();

  // Strip HTML tags to get clean text
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  const lines = text.split("\n").map((l) => l.trim());
  const contacts = [];
  let currentTeam = "";
  let currentSection = "";

  const sectionHeaders = ["Women's College", "Women's Club", "Men's Club"];
  const roleLabels = ["Coach:", "Head Coach:", "Director:", "Recruiting:", "Coordinator:"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (sectionHeaders.includes(line)) {
      currentSection = line;
      continue;
    }

    // Detect team names by looking for lines before "Membership Status"
    if (
      line.length > 8 &&
      line.length < 120 &&
      !line.includes(":") &&
      !line.includes("@") &&
      !line.includes("http") &&
      !line.includes("United States")
    ) {
      const ahead = lines.slice(i + 1, i + 30).join(" ");
      if (
        ahead.includes("Membership Status") &&
        (line.toLowerCase().includes("college") ||
          line.toLowerCase().includes("university") ||
          line.toLowerCase().includes("women") ||
          line.toLowerCase().includes("men") ||
          line.toLowerCase().includes("rugby") ||
          line.toLowerCase().includes("rfc"))
      ) {
        currentTeam = line;
      }
    }

    // Role on this line, contact info on next line
    for (const rp of roleLabels) {
      if (line === rp && i + 1 < lines.length && lines[i + 1].includes("@")) {
        const contactLine = lines[i + 1];
        const parts = contactLine.split(";");
        for (const part of parts) {
          const emailMatch = part.match(
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
          );
          if (emailMatch) {
            const nameMatch = part.match(/^([^@-]+?)(?:\s*-\s*)/);
            contacts.push({
              team: currentTeam,
              section: currentSection,
              role: rp.replace(":", ""),
              name: nameMatch ? nameMatch[1].trim() : "",
              email: emailMatch[1],
              source: "epru.rugby",
            });
          }
        }
        break;
      }
    }

    // Inline coordinator (same line)
    if (line.includes("Coordinator:") && line.includes("@")) {
      const emailMatch = line.match(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
      );
      const nameMatch = line.match(/Coordinator:\s*([^-@]+?)(?:\s*-\s*)/);
      if (emailMatch) {
        contacts.push({
          team: "EPRU Conference",
          section: currentSection,
          role: "Coordinator",
          name: nameMatch ? nameMatch[1].trim() : "",
          email: emailMatch[1],
          source: "epru.rugby",
        });
      }
    }

    // Also capture recruiting emails from description text
    if (line.toLowerCase().includes("recruiting@") || line.toLowerCase().includes("director")) {
      const emails = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      if (emails) {
        for (const email of emails) {
          if (
            email.toLowerCase().includes("recruiting") ||
            email.toLowerCase().includes("director")
          ) {
            if (!contacts.find((c) => c.email.toLowerCase() === email.toLowerCase())) {
              contacts.push({
                team: currentTeam,
                section: currentSection,
                role: "Recruiting",
                name: "",
                email,
                source: "epru.rugby",
              });
            }
          }
        }
      }
    }
  }

  // Filter to college contacts only
  const collegeContacts = contacts.filter((c) => c.section.includes("College"));

  console.log(`  Found ${contacts.length} total contacts (${collegeContacts.length} college)`);
  fs.writeFileSync(OUTPUT, JSON.stringify(collegeContacts, null, 2));
  console.log(`  Saved to ${OUTPUT}`);
  return collegeContacts;
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  scrapeEPRU().catch(console.error);
}

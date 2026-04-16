/**
 * Scraper for South Atlantic Rugby Conference (SAR)
 * Source: https://southatlanticrugby.com/
 * Extracts women's college team contacts from division pages
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAGES = [
  { url: "https://southatlanticrugby.com/about/div1/", division: "D1AA" },
  { url: "https://southatlanticrugby.com/about/div2/", division: "D2" },
  { url: "https://southatlanticrugby.com/about/scr/", division: "D3" },
];

const OUTPUT = path.join(__dirname, "scraped-sar.json");

export async function scrapeSAR() {
  console.log("Scraping South Atlantic Rugby Conference...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const allContacts = [];

  for (const { url, division } of PAGES) {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Get page text and mailto links
    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      const mailtoLinks = [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.href.replace("mailto:", ""));
      return { text, mailtoLinks };
    });

    // Parse team entries from text
    const lines = data.text.split("\n").map((l) => l.trim()).filter(Boolean);
    const teams = [];

    let i = 0;
    while (i < lines.length) {
      // Pattern: School Name, City + ST, Coach: Name, "contact"
      if (
        i + 2 < lines.length &&
        lines[i + 1].match(/,\s*[A-Z]{2}$/) &&
        (lines[i + 2].startsWith("Coach:") || lines[i + 2].startsWith("Inactive"))
      ) {
        const school = lines[i];
        const coachLine = lines[i + 2];
        const coachName = coachLine.startsWith("Coach:")
          ? coachLine.replace("Coach:", "").trim()
          : "";

        teams.push({ school, coachName, division });
        i += 3;
        if (i < lines.length && lines[i].toLowerCase() === "contact") i++;
        continue;
      }
      i++;
    }

    // Mailto links appear in same order as teams (skip conference-level emails)
    const mailtos = data.mailtoLinks.filter((e) => !e.includes("southatlanticrugby.com"));

    for (let t = 0; t < teams.length && t < mailtos.length; t++) {
      if (teams[t].coachName && mailtos[t]) {
        allContacts.push({
          team: teams[t].school,
          section: "Women's College",
          role: "Coach",
          name: teams[t].coachName,
          email: mailtos[t],
          division: teams[t].division,
          source: "southatlanticrugby.com",
        });
      }
    }

    console.log(`  ${division}: ${teams.length} teams, ${mailtos.length} emails`);
  }

  await browser.close();

  console.log(`  Found ${allContacts.length} total contacts`);
  fs.writeFileSync(OUTPUT, JSON.stringify(allContacts, null, 2));
  console.log(`  Saved to ${OUTPUT}`);
  return allContacts;
}

const isMain = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));
if (isMain) {
  scrapeSAR().catch(console.error);
}

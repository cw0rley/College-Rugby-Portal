/**
 * Auto-discover rugby website URLs for programs that don't have one.
 *
 * Strategy: Use each program's school website domain to check common
 * athletics/club sport URL patterns for rugby pages.
 *
 * Usage: node scripts/discover-rugby-websites.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { writeFileSync } from "fs";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchOk(url, timeoutMs = 8000) {
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
    // Must mention "rugby" somewhere to count
    if (!text.toLowerCase().includes("rugby")) return null;
    return { url: res.url, length: text.length };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Given a school website like "https://www.acu.edu", extract the athletics domain
// and generate candidate rugby URLs
function generateCandidateUrls(website, school, gender) {
  const candidates = [];
  if (!website) return candidates;

  let host;
  try {
    const u = new URL(website);
    host = u.hostname.replace("www.", "");
  } catch {
    return candidates;
  }

  const genderSlug = gender === "womens" ? "womens" : "mens";
  const genderAlt = gender === "womens" ? "women" : "men";

  // Pattern 1: School domain + athletics paths
  const base = `https://www.${host}`;
  candidates.push(
    `${base}/sports/club/${genderSlug}-rugby`,
    `${base}/sports/${genderSlug}-rugby`,
    `${base}/campusrec/sports/club-sports.php`,
    `${base}/student-life/athletics-and-recreation/club-sports/`,
    `${base}/campus-life/clubs-and-organizations/club-sports/`,
    `${base}/recreation/club-sports/`,
    `${base}/athletics/club-sports/`,
  );

  // Pattern 2: Common athletics subdomain patterns
  // e.g., acu.edu -> acuwildcats.com, or athletics.acu.edu
  candidates.push(
    `https://athletics.${host}/sports/${genderSlug}-rugby`,
    `https://recreation.${host}/sports/club-rugby`,
    `https://recsports.${host}/sports/${genderSlug}-club-rugby/`,
  );

  // Pattern 3: rugby subdomain
  candidates.push(
    `https://rugby.${host}/`,
  );

  return candidates;
}

async function main() {
  console.log("Loading programs from Firestore...");
  const snap = await getDocs(collection(db, "programs"));

  const missing = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.rugbyWebsite || !data.rugbyWebsite.trim()) {
      missing.push({ id: d.id, school: data.school, gender: data.gender, website: data.website || "" });
    }
  }

  // Dedupe by school+gender
  const seen = new Set();
  const unique = missing.filter(p => {
    const key = `${p.school}|${p.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Found ${unique.length} programs without rugby website. Scanning...\n`);

  const found = [];
  let checked = 0;

  for (const prog of unique) {
    const candidates = generateCandidateUrls(prog.website, prog.school, prog.gender);

    for (const url of candidates) {
      const result = await fetchOk(url);
      if (result) {
        console.log(`  ✅ ${prog.school} (${prog.gender}): ${result.url}`);
        found.push({
          id: prog.id,
          school: prog.school,
          gender: prog.gender,
          rugbyWebsite: result.url,
        });
        break; // Take the first match
      }
    }

    checked++;
    if (checked % 50 === 0) {
      console.log(`  Checked ${checked}/${unique.length} programs, found ${found.length} so far...`);
    }

    // Small delay between schools
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n✅ Done! Found rugby websites for ${found.length}/${unique.length} programs.`);

  if (found.length > 0) {
    const outPath = "discovered-rugby-websites.json";
    writeFileSync(outPath, JSON.stringify(found, null, 2));
    console.log(`Saved to ${outPath}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

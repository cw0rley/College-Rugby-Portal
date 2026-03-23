/**
 * Next Phase Rugby scraper (app.nextphaserugby.com).
 *
 * Fetches all U.S. college rugby programs from the Next Phase Rugby
 * recruiting platform API.  Returns an array of programme objects
 * matching the Firestore schema used by College Rugby Portal.
 *
 * DATA AVAILABLE:
 *   List endpoint:  school name, city, state, gender, division,
 *                   conference (full name), program status
 *   Detail endpoint: + GPA, SAT, ACT, tuition, room & board,
 *                    enrollment, coach name, scholarships, grants,
 *                    15s/7s programs, website, majors
 *
 * AUTH:
 *   The API requires a Bearer token.  Provide it via:
 *     1. NEXTPHASE_TOKEN environment variable, or
 *     2. nextphase-token.txt file in this directory
 *   To get a token: log in at app.nextphaserugby.com, open DevTools,
 *   run:  JSON.parse(localStorage.getItem('currentUser')).accessToken
 *   Copy the result into nextphase-token.txt
 *
 * Usage:
 *   import { scrapeNextPhase } from "./scrape-nextphase.js";
 *   const programs = await scrapeNextPhase();
 */

import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_BASE = "https://app.nextphaserugby.com/api";
const PAGE_SIZE = 50;

// ─── AUTH ────────────────────────────────────────────────────────────────────

function getToken() {
  // 1. Environment variable
  if (process.env.NEXTPHASE_TOKEN) {
    return process.env.NEXTPHASE_TOKEN;
  }
  // 2. Token file
  const tokenFile = resolve(__dirname, "nextphase-token.txt");
  if (existsSync(tokenFile)) {
    return readFileSync(tokenFile, "utf-8").trim();
  }
  throw new Error(
    "Next Phase Rugby token not found.\n" +
    "  Set NEXTPHASE_TOKEN env var or create sync/nextphase-token.txt.\n" +
    "  To get your token: log in at app.nextphaserugby.com, open DevTools console, run:\n" +
    '  JSON.parse(localStorage.getItem("currentUser")).accessToken'
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function apiPost(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for POST ${path}`);
  }
  return res.json();
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for GET ${path}`);
  }
  return res.json();
}

/** Map Next Phase division name → our league format */
function mapDivision(divisionName) {
  if (!divisionName) return null;
  const map = {
    "Division I-A": "NCR D1",
    "Division I-AA": "NCR D1AA",
    "Division II": "NCR D2",
    "Small College / Division III": "NCR D3",
  };
  return map[divisionName] || divisionName;
}

/** Map Next Phase team name → our gender format */
function mapGender(teamName) {
  if (!teamName) return "mens";
  return teamName.toLowerCase().includes("women") ? "womens" : "mens";
}

/** Clean school name: remove trailing "Rugby", "RFC", etc. */
function cleanSchoolName(name) {
  if (!name) return "";
  return name
    .replace(/\s+Rugby\s*$/i, "")
    .replace(/\s+RFC\s*$/i, "")
    .replace(/\s+Men'?s?\s*$/i, "")
    .replace(/\s+Women'?s?\s*$/i, "")
    .trim();
}

/** Map Next Phase state full name → 2-letter abbreviation */
function stateAbbrev(stateName) {
  const stateMap = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
    "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
    "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
    "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC",
  };
  return stateMap[stateName] || stateName;
}

// ─── SCHOLARSHIP SCRAPER ─────────────────────────────────────────────────────

/**
 * Fetches scholarship data for ALL schools on Next Phase Rugby.
 * Calls the list endpoint for school IDs, then the detail endpoint for each
 * school to get scholarshipsOffered, grantAvailable, tuition, coach, etc.
 *
 * Returns an array of programme objects with scholarship-related fields:
 *   - scholarshipsOffered: "Full Scholarships" | "Partial Scholarships" | "None"
 *   - grantAvailable: true/false
 *   - inStateTuition, outStateTuition, roomBoard
 *   - contact (coach name), contactTitle, contactEmail, contactPhone
 *   - website, enrollment
 */
export async function scrapeNextPhaseScholarships() {
  const token = getToken();

  // Step 1: Fetch all schools from list endpoint (paginated)
  console.log("  Fetching Next Phase Rugby schools for scholarship data...");
  let allItems = [];
  let page = 1;
  let totalCount = null;

  while (true) {
    const result = await apiPost(
      `/schools?page=${page}&pageSize=${PAGE_SIZE}`,
      { country: "United States" },
      token
    );

    if (!result.isSuccess || !result.data) {
      console.warn(`  ⚠ API returned error on page ${page}`);
      break;
    }

    const { count, items } = result.data;
    if (totalCount === null) {
      totalCount = count;
      console.log(`  Total schools: ${totalCount}`);
    }

    allItems.push(...items);
    if (allItems.length >= totalCount || items.length === 0) break;
    page++;
  }

  // Step 2: Fetch detail page for each school to get scholarship info
  console.log(`  Fetching detail pages for ${allItems.length} schools...`);
  const programs = [];

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    try {
      const detail = (
        await apiGet(`/schools/${item.id}?teamId=${item.teamId}`, token)
      ).data;

      const school = cleanSchoolName(item.schoolName);
      const gender = mapGender(item.team);

      const program = {
        school,
        gender,
        state: stateAbbrev(item.state),
        city: item.city || null,
      };

      // Scholarship & grant fields
      program.scholarshipsOffered = detail.scholarshipsOffered?.name || "None";
      program.grantAvailable = detail.grantAvailable?.name === "Yes";

      // Tuition
      const ist = detail.inStateTuition;
      const ost = detail.outOfStateTuition;
      if (ist && ist < 9999999) program.inStateTuition = ist;
      if (ost && ost < 9999999) program.outStateTuition = ost;
      if (detail.roomBoard) program.roomBoard = detail.roomBoard;

      // Coach / contact
      if (detail.coachFirstName || detail.coachLastName) {
        program.contact = `${detail.coachFirstName || ""} ${detail.coachLastName || ""}`.trim();
        program.contactTitle = "Head Coach";
      }
      if (detail.contactInfo) {
        if (detail.contactInfo.email) program.contactEmail = detail.contactInfo.email;
        if (detail.contactInfo.phone) program.contactPhone = detail.contactInfo.phone;
      }

      // Extras
      if (detail.schoolWebsite) program.website = detail.schoolWebsite;
      if (detail.enrollment) program.enrollment = detail.enrollment;
      if (detail.division) program.league = mapDivision(detail.division);
      if (detail.conference) program.conference = detail.conference;
      if (detail.programStatus) program.programStatus = detail.programStatus;
      if (detail.isFeatured) program.isFeatured = true;

      // Roster openings count
      if (detail.roasterOpenings && detail.roasterOpenings.length > 0) {
        program.rosterOpenings = detail.roasterOpenings.length;
      }

      programs.push(program);

      if ((i + 1) % 25 === 0) {
        console.log(`  Detail progress: ${i + 1}/${allItems.length}`);
      }

      // Small delay to be respectful to the API
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.warn(`  ⚠ Failed detail for ${item.schoolName}: ${err.message}`);
    }
  }

  // Deduplicate by school+gender
  const seen = new Set();
  const unique = programs.filter(p => {
    const key = `${p.school.toLowerCase()}::${p.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const withScholarships = unique.filter(p => p.scholarshipsOffered !== "None").length;
  console.log(`  Scholarship scrape complete: ${unique.length} programs, ${withScholarships} with scholarships\n`);
  return unique;
}

// ─── FEATURED SCHOOLS SCRAPER ────────────────────────────────────────────────

/**
 * Fetches schools marked as "Featured" on Next Phase Rugby.
 * Uses GET /api/schools/featured — returns all featured schools in one call.
 *
 * Returns the same programme shape as scrapeNextPhase(), with an additional
 * `isFeatured: true` flag.
 */
export async function scrapeNextPhaseFeatured() {
  const token = getToken();

  console.log("  Fetching Next Phase Rugby featured schools...");
  const result = await apiGet("/schools/featured", token);

  if (!result.isSuccess || !result.data) {
    console.warn("  ⚠ Featured schools API returned error");
    return [];
  }

  const { count, items } = result.data;
  console.log(`  Featured schools: ${count}`);

  let programs = items.map(item => {
    const school = cleanSchoolName(item.schoolName);
    const gender = mapGender(item.team);
    const conference = item.conference || null;
    const division = item.division || null;
    const league = mapDivision(division);

    const program = {
      school,
      gender,
      state: stateAbbrev(item.state),
      city: item.city || null,
      isFeatured: true,
    };

    if (conference) program.conference = conference;
    if (league) program.league = league;
    if (item.programStatus) program.programStatus = item.programStatus;
    if (item.grantAvailable) program.grantAvailable = item.grantAvailable === "Yes";
    if (item.inStateTuition && item.inStateTuition < 9999999) program.inStateTuition = item.inStateTuition;
    if (item.outOfStateTuition && item.outOfStateTuition < 9999999) program.outStateTuition = item.outOfStateTuition;

    return program;
  });

  // Deduplicate by school+gender
  const seen = new Set();
  programs = programs.filter(p => {
    const key = `${p.school.toLowerCase()}::${p.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  Featured total: ${programs.length} unique programs\n`);
  return programs;
}

// ─── MAIN SCRAPER ────────────────────────────────────────────────────────────

export async function scrapeNextPhase({ fetchDetails = false } = {}) {
  const token = getToken();

  // Step 1: Fetch all schools from list endpoint (paginated)
  console.log("  Fetching Next Phase Rugby schools...");
  let allItems = [];
  let page = 1;
  let totalCount = null;

  while (true) {
    const result = await apiPost(
      `/schools?page=${page}&pageSize=${PAGE_SIZE}`,
      { country: "United States" },
      token
    );

    if (!result.isSuccess || !result.data) {
      console.warn(`  ⚠ API returned error on page ${page}`);
      break;
    }

    const { count, items } = result.data;
    if (totalCount === null) {
      totalCount = count;
      console.log(`  Total schools in Next Phase: ${totalCount}`);
    }

    allItems.push(...items);
    console.log(`  Page ${page}: ${items.length} schools (${allItems.length}/${totalCount})`);

    if (allItems.length >= totalCount || items.length === 0) break;
    page++;
  }

  // Step 2: Map list data to our schema
  let programs = allItems.map(item => {
    const school = cleanSchoolName(item.schoolName);
    const gender = mapGender(item.team);
    const conference = item.conference || null;
    const division = item.division || null;
    const league = mapDivision(division);

    const program = {
      school,
      gender,
      state: stateAbbrev(item.state),
      city: item.city || null,
    };

    if (conference) program.conference = conference;
    if (league) program.league = league;

    return program;
  });

  // Step 3 (optional): Fetch detail pages for extra fields
  if (fetchDetails) {
    console.log("\n  Fetching detail pages for each school...");
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const prog = programs[i];
      try {
        const detail = (await apiGet(`/schools/${item.id}`, token)).data;

        // Academic fields
        if (detail.avgGPA) prog.gpa = detail.avgGPA;
        if (detail.avgSAT) prog.sat = detail.avgSAT;
        if (detail.avgACT) prog.act = detail.avgACT;

        // Financial fields
        if (detail.inStateTuition) prog.inStateTuition = detail.inStateTuition;
        if (detail.outOfStateTuition) prog.outStateTuition = detail.outOfStateTuition;
        if (detail.roomBoard) prog.roomBoard = detail.roomBoard;

        // Program fields
        if (detail.scholarshipsOffered?.name)
          prog.rugbyScholarship = detail.scholarshipsOffered.name !== "None";
        if (detail.grantAvailable?.name)
          prog.grantsAvailable = detail.grantAvailable.name === "Yes";
        if (detail.schoolWebsite) prog.website = detail.schoolWebsite;
        if (detail.coachFirstName || detail.coachLastName) {
          prog.contact = `${detail.coachFirstName || ""} ${detail.coachLastName || ""}`.trim();
          prog.contactTitle = "Head Coach";
        }

        // Enrollment
        if (detail.enrollment) prog.enrollment = detail.enrollment;

        if ((i + 1) % 25 === 0) {
          console.log(`  Details: ${i + 1}/${allItems.length}`);
        }

        // Small delay to be respectful
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.warn(`  ⚠ Failed detail for ${prog.school}: ${err.message}`);
      }
    }
    console.log(`  Details: ${allItems.length}/${allItems.length} complete`);
  }

  // Deduplicate by school+gender
  const seen = new Set();
  programs = programs.filter(p => {
    const key = `${p.school.toLowerCase()}::${p.gender}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`  Next Phase total: ${programs.length} unique programs\n`);
  return programs;
}

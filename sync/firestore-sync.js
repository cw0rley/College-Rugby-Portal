/**
 * Firestore sync module for College Rugby Portal.
 *
 * Reads existing programs/programContacts/conferences from Firestore,
 * compares with new data, and performs upserts.
 *
 * COLLECTION STRUCTURE:
 *   - programs:           Core program data (school, gender, conference, league, etc.)
 *   - programContacts:    Coach/contact info linked by programId
 *   - conferenceContacts: Conference commissioner contacts (abbreviation, contactName, email, gender, league)
 *   - conferences:        Conference reference data (abbreviation → fullName)
 *   - leagues:            League reference data (name)
 *
 * Matching strategy:
 *   - Programs: matched by (school + gender) composite key
 *   - ProgramContacts: linked to program doc by programId field
 *   - ConferenceContacts: matched by (conference abbreviation + gender)
 */
import { db } from "./firebase.js";

const PROGRAMS_COLLECTION = "programs";
const PROGRAM_CONTACTS_COLLECTION = "programContacts";
const CONFERENCE_CONTACTS_COLLECTION = "conferenceContacts";
const CONFERENCES_COLLECTION = "conferences";
const LEAGUES_COLLECTION = "leagues";

// Fields that belong in programContacts, NOT in programs
const CONTACT_FIELDS = ["contact", "contactTitle", "email"];

// Fields that belong in programs
const PROGRAM_FIELDS = [
  "ProgramID", "school", "state", "city", "gender", "conference", "league",
  "ncaaDivision", "schoolType", "gpa", "sat", "acceptanceRate", "enrollment",
  "inStateTuition", "outStateTuition", "rugbyRanking", "rugbyScholarship",
  "schoolFunded", "website", "topPrograms"
];

// ─── Read existing data ─────────────────────────────────────────────────────

export async function getExistingPrograms() {
  const snapshot = await db.collection(PROGRAMS_COLLECTION).get();
  const programs = [];
  snapshot.forEach(doc => {
    programs.push({ id: doc.id, ...doc.data() });
  });
  return programs;
}

export async function getExistingProgramContacts() {
  const snapshot = await db.collection(PROGRAM_CONTACTS_COLLECTION).get();
  const contacts = [];
  snapshot.forEach(doc => {
    contacts.push({ id: doc.id, ...doc.data() });
  });
  return contacts;
}

export async function getExistingConferenceContacts() {
  const snapshot = await db.collection(CONFERENCE_CONTACTS_COLLECTION).get();
  const contacts = [];
  snapshot.forEach(doc => {
    contacts.push({ id: doc.id, ...doc.data() });
  });
  return contacts;
}

export async function getExistingConferences() {
  const snapshot = await db.collection(CONFERENCES_COLLECTION).get();
  const conferences = [];
  snapshot.forEach(doc => {
    conferences.push({ id: doc.id, ...doc.data() });
  });
  return conferences;
}

export async function getExistingLeagues() {
  const snapshot = await db.collection(LEAGUES_COLLECTION).get();
  const leagues = [];
  snapshot.forEach(doc => {
    leagues.push({ id: doc.id, ...doc.data() });
  });
  return leagues;
}

// ─── Normalize for matching ─────────────────────────────────────────────────

function normalizeSchool(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function programKey(program) {
  return `${normalizeSchool(program.school)}::${(program.gender || "").toLowerCase()}`;
}

// ─── Split program data from contact data ───────────────────────────────────

function splitProgramAndContact(record) {
  const programData = {};
  const contactData = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "id") continue;
    if (CONTACT_FIELDS.includes(key)) {
      contactData[key] = value;
    } else {
      programData[key] = value;
    }
  }

  return { programData, contactData };
}

function isNonEmpty(value) {
  return value !== null && value !== undefined && value !== "" && value !== "nan";
}

function cleanRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([_, v]) => isNonEmpty(v))
  );
}

// ─── Conference field validation ─────────────────────────────────────────────

/**
 * Decide whether to overwrite an existing conference value with a new one.
 * Returns true when:
 *   - The existing value looks like a school name (contains "University", "College", etc.)
 *   - The existing value is a long full name and the new value is a short abbreviation
 */
function shouldOverwriteConference(existingVal, newVal) {
  if (!existingVal || !newVal) return false;
  const ev = String(existingVal).trim();
  const nv = String(newVal).trim();

  // If they're the same, no need to overwrite
  if (ev.toLowerCase() === nv.toLowerCase()) return false;

  // New value should look like an abbreviation (short, uppercase)
  const newIsAbbr = nv === nv.toUpperCase() && nv.length <= 10;
  if (!newIsAbbr) return false;

  // Existing value looks like a school name — definitely overwrite
  if (/\b(University|College|Institute|Academy|Seminary|Community)\b/i.test(ev)) {
    return true;
  }

  // Existing value is a long full name (>12 chars, has spaces) — overwrite with abbreviation
  if (ev.length > 12 && ev.includes(" ")) {
    return true;
  }

  return false;
}

// ─── Conference name normalization ───────────────────────────────────────────

/**
 * If a conference value looks like a full name (long, has spaces),
 * try to match it to an existing conference abbreviation.
 */
function normalizeConference(value, existingConferences) {
  if (!value) return value;
  const v = String(value).trim();
  // Already looks like an abbreviation (short, mostly uppercase)
  if (v.length <= 10 && v === v.toUpperCase()) return v;
  // Try to match against existing conference full names
  const lower = v.toLowerCase();
  for (const conf of existingConferences) {
    if (conf.fullName && conf.fullName.toLowerCase() === lower) {
      return conf.conference; // Return the abbreviation
    }
  }
  // No match found — return as-is but log a warning
  if (v.length > 10 && v.includes(" ")) {
    console.log(`  ⚠ Long conference name not matched to abbreviation: "${v}"`);
  }
  return v;
}

// ─── Sync programs + programContacts ────────────────────────────────────────

/**
 * Sync an array of program objects into Firestore.
 * Splits each record into:
 *   - programs collection: school data (school, conference, league, stats, etc.)
 *   - programContacts collection: contact info (contact, contactTitle, email, programId)
 *
 * @param {Array} newPrograms - Array of program objects to sync
 * @param {Object} options - { dryRun: boolean }
 * @returns {Object} - Summary of changes made
 */
export async function syncPrograms(newPrograms, options = {}) {
  const { dryRun = false, skipContacts = false } = options;

  // Fetch existing data from both collections
  const existingPrograms = await getExistingPrograms();
  const existingContacts = await getExistingProgramContacts();
  const existingConferences = await getExistingConferences();

  // Build lookup maps
  const programMap = new Map();
  existingPrograms.forEach(p => {
    programMap.set(programKey(p), p);
  });

  // Build contact lookup by programId
  const contactByProgramId = new Map();
  existingContacts.forEach(c => {
    if (c.programId) {
      contactByProgramId.set(c.programId, c);
    }
  });

  const results = {
    programs: { updated: 0, added: 0, unchanged: 0, rejected: 0 },
    contacts: { updated: 0, added: 0, unchanged: 0, skipped: 0 },
    details: []
  };

  // Filter out junk programs
  const JUNK_KEYWORDS = ["barbarian", "all-star", "shield challenge", "select side", "alum", "earns eagle", "rwc spot", "celebrates", "academy form", "hounds form", "qualifier", "millennial atlantic"];
  // Shortened/informal names that are duplicates of canonical entries
  const JUNK_EXACT = new Set([
    "army", "navy", "army west point", "purdue", "notre dame", "ohio state",
    "the ohio state university", "michigan", "michigan state", "illinois",
    "indiana", "wisconsin", "ole miss: university of mississippi",
    "angelo state", "cal poly humboldt", "chico state university",
    "fresno state university", "sacramento state university",
    "catholic university", "franciscan university",
    "diablo valley college", "mira costa college",
    "virginia polytechnic institute",
  ]);
  // Alternate name patterns that duplicate canonical entries (e.g. "University of Wisconsin - Eau Claire" vs "University of Wisconsin-Eau Claire")
  const JUNK_PATTERNS_EXTRA = [
    /^University of Wisconsin - /,    // canonical uses hyphen no spaces: "Wisconsin-Eau Claire"
    /^University of (North Carolina|Texas|Pittsburgh|Maine) - /,  // same pattern
    /^Penn (State|West) University/,  // canonical: "Pennsylvania State University" / "PennWest"
    /^SUNY - /,                       // canonical: "SUNY Geneseo" not "SUNY - Geneseo"
    /^(Kutztown|Millersville|Bloomsburg|West Chester|Stony Brook) University$/,  // missing "of Pennsylvania" etc
    /^(Molloy|Queens) University$/,   // canonical has different suffix
    /^(Indiana|York) University$/,    // too generic
    /^(York|Molloy|Mount Saint) College$/,  // too generic, missing qualifiers
    /^University of (Minnesota|Wisconsin|Nebraska|Illinois)$/,  // bare names — canonical has campus suffix
    /^Washington University - St\. Louis$/,  // canonical: "in St. Louis"
    /^Oklahoma University$/,  // canonical: "University of Oklahoma"
    /^University of Health Sciences & Pharmacy/,  // canonical uses "and"
    /^University of Minnesota - Moorhead$/,  // canonical: "Minnesota State University Moorhead"
    /^University (of Buffalo|at Albany)$/,  // canonical: "University at Buffalo (SUNY)"
    /^Washington State University\s{2,}/, // concatenated with another school
    /^University of Washington\s+Western/, // concatenated
    /\s{2,}/,                         // any double-spaced concatenated names
  ];
  const validPrograms = newPrograms.filter(p => {
    const name = p.school || "";
    const lower = name.toLowerCase().trim();

    // Reject year-prefixed entries (e.g. "2024 Great Midwest 7s Qualifier")
    if (/^\d{4}\s/.test(name)) {
      console.log(`  ⚠ Rejected year-prefixed junk: "${name}"`);
      results.programs.rejected++;
      return false;
    }

    // Reject exact junk names
    if (JUNK_EXACT.has(lower)) {
      console.log(`  ⚠ Rejected informal/duplicate name: "${name}"`);
      results.programs.rejected++;
      return false;
    }

    // Reject pattern-matched junk
    if (JUNK_PATTERNS_EXTRA.some(re => re.test(name))) {
      console.log(`  ⚠ Rejected duplicate name pattern: "${name}"`);
      results.programs.rejected++;
      return false;
    }

    // Reject concatenated names (multiple University/College keywords)
    const institutionWords = (name.match(/University|College|Institute|Academy/gi) || []).length;
    if (institutionWords > 1 && name.length > 60) {
      console.log(`  ⚠ Rejected concatenated name: "${name}"`);
      results.programs.rejected++;
      return false;
    }

    // Reject non-program entries (news headlines, all-star events)
    if (JUNK_KEYWORDS.some(kw => lower.includes(kw))) {
      console.log(`  ⚠ Rejected non-program: "${name}"`);
      results.programs.rejected++;
      return false;
    }

    // Reject programs with no school name
    if (!name || name.length < 3) {
      results.programs.rejected++;
      return false;
    }

    return true;
  });

  // ── Deduplicate near-match names against existing programs ──────────
  // If a new program has no state and a similar-named program already exists, skip it
  const existingNames = new Map();
  existingPrograms.forEach(p => {
    existingNames.set(normalizeSchool(p.school) + "::" + (p.gender || ""), p);
  });

  const deduped = validPrograms.filter(p => {
    const key = programKey(p);
    // If it already exists, it's an update — let it through
    if (programMap.has(key)) return true;

    // New program: reject if it has no state (likely bad scrape data)
    if (!p.state) {
      console.log(`  ⚠ Rejected new program without state: "${p.school}" (${p.gender})`);
      results.programs.rejected++;
      return false;
    }

    // Check for near-duplicate: existing program whose normalized name contains or is contained by this one
    const norm = normalizeSchool(p.school);
    for (const [existKey, existProg] of existingNames) {
      const existNorm = normalizeSchool(existProg.school);
      if (existProg.gender !== p.gender) continue;
      // One name contains the other (e.g. "York College" vs "York College of Pennsylvania")
      if (norm !== existNorm && (norm.includes(existNorm) || existNorm.includes(norm))) {
        console.log(`  ⚠ Rejected near-duplicate: "${p.school}" (existing: "${existProg.school}")`);
        results.programs.rejected++;
        return false;
      }
    }

    return true;
  });

  // Process in batches (Firestore limit is 500 per batch, we use 400 for safety)
  const BATCH_LIMIT = 400;
  let batch = db.batch();
  let batchCount = 0;

  async function commitBatchIfNeeded(force = false) {
    if (batchCount >= BATCH_LIMIT || (force && batchCount > 0)) {
      if (!dryRun) await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  for (const newRecord of deduped) {
    const { programData, contactData } = splitProgramAndContact(newRecord);
    // Normalize conference name to abbreviation
    if (programData.conference) {
      programData.conference = normalizeConference(programData.conference, existingConferences);
    }
    const key = programKey(programData);
    const existingProg = programMap.get(key);

    // ── Handle program data ──────────────────────────────────────────────
    let programDocId;

    if (existingProg) {
      programDocId = existingProg.id;

      // Check which program fields need updating
      const updates = {};
      for (const [field, value] of Object.entries(programData)) {
        if (field === "id" || !isNonEmpty(value)) continue;
        const existingVal = existingProg[field];
        if (!isNonEmpty(existingVal)) {
          // Empty field — fill it in
          updates[field] = value;
        } else if (field === "conference" && shouldOverwriteConference(existingVal, value)) {
          // Conference field: overwrite bad values (school names, full names) with abbreviations
          updates[field] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          const ref = db.collection(PROGRAMS_COLLECTION).doc(programDocId);
          batch.update(ref, updates);
          batchCount++;
        }
        results.programs.updated++;
        results.details.push({
          action: "update-program",
          school: programData.school,
          gender: programData.gender,
          fields: Object.keys(updates),
        });
      } else {
        results.programs.unchanged++;
      }
    } else {
      // New program
      const cleaned = cleanRecord(programData);
      const ref = db.collection(PROGRAMS_COLLECTION).doc();
      programDocId = ref.id;
      if (!dryRun) {
        batch.set(ref, cleaned);
        batchCount++;
      }
      results.programs.added++;
      results.details.push({
        action: "add-program",
        school: programData.school,
        gender: programData.gender,
      });
    }

    await commitBatchIfNeeded();

    // ── Handle contact data ──────────────────────────────────────────────
    const hasContactData = CONTACT_FIELDS.some(f => isNonEmpty(contactData[f]));

    if (skipContacts) {
      results.contacts.skipped++;
    } else if (hasContactData && programDocId) {
      const existingContact = contactByProgramId.get(programDocId);

      if (existingContact) {
        // Check which contact fields need updating
        const updates = {};
        for (const [field, value] of Object.entries(contactData)) {
          if (!isNonEmpty(value)) continue;
          const existingVal = existingContact[field];
          // Update if existing is empty OR if contact info has changed
          if (!isNonEmpty(existingVal) || String(value).toLowerCase() !== String(existingVal).toLowerCase()) {
            updates[field] = value;
          }
        }

        if (Object.keys(updates).length > 0) {
          if (!dryRun) {
            const ref = db.collection(PROGRAM_CONTACTS_COLLECTION).doc(existingContact.id);
            batch.update(ref, updates);
            batchCount++;
          }
          results.contacts.updated++;
          results.details.push({
            action: "update-contact",
            school: programData.school,
            gender: programData.gender,
            fields: Object.keys(updates),
          });
        } else {
          results.contacts.unchanged++;
        }
      } else {
        // New contact record — link to program via programId
        const contactRecord = cleanRecord({
          ...contactData,
          programId: programDocId,
        });
        if (!dryRun) {
          const ref = db.collection(PROGRAM_CONTACTS_COLLECTION).doc();
          batch.set(ref, contactRecord);
          batchCount++;
        }
        results.contacts.added++;
        results.details.push({
          action: "add-contact",
          school: programData.school,
          gender: programData.gender,
        });
      }
    } else {
      results.contacts.skipped++;
    }

    await commitBatchIfNeeded();
  }

  // Commit remaining
  await commitBatchIfNeeded(true);

  return results;
}

// ─── Sync conference contacts ──────────────────────────────────────────────

/**
 * Sync conference contact data into conferenceContacts collection.
 * Matches by (conference abbreviation + gender).
 */
export async function syncConferenceContacts(newContacts, options = {}) {
  const { dryRun = false } = options;
  const existing = await getExistingConferenceContacts();

  const existingMap = new Map();
  existing.forEach(c => {
    const key = `${(c.conference || "").toLowerCase()}::${(c.gender || "").toLowerCase()}`;
    existingMap.set(key, c);
  });

  const results = { updated: 0, added: 0, unchanged: 0, details: [] };
  let batch = db.batch();
  let batchCount = 0;

  for (const newConf of newContacts) {
    const key = `${(newConf.conference || "").toLowerCase()}::${(newConf.gender || "").toLowerCase()}`;
    const existingConf = existingMap.get(key);

    if (existingConf) {
      const updates = {};
      for (const [field, value] of Object.entries(newConf)) {
        if (field === "id" || !isNonEmpty(value)) continue;
        const existingVal = existingConf[field];
        if (!isNonEmpty(existingVal) || (["contactName", "email"].includes(field) && value !== existingVal)) {
          updates[field] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          batch.update(db.collection(CONFERENCE_CONTACTS_COLLECTION).doc(existingConf.id), updates);
          batchCount++;
        }
        results.updated++;
        results.details.push({ action: "update", conference: newConf.conference, gender: newConf.gender, fields: Object.keys(updates) });
      } else {
        results.unchanged++;
      }
    } else {
      const cleaned = cleanRecord(newConf);
      if (!dryRun) {
        batch.set(db.collection(CONFERENCE_CONTACTS_COLLECTION).doc(), cleaned);
        batchCount++;
      }
      results.added++;
      results.details.push({ action: "add", conference: newConf.conference, gender: newConf.gender });
    }

    if (batchCount >= 400) {
      if (!dryRun) await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0 && !dryRun) await batch.commit();
  return results;
}

// ─── Sync conferences (abbreviation → fullName) ────────────────────────────

export async function syncConferences(newConferences, options = {}) {
  const { dryRun = false } = options;
  const existing = await getExistingConferences();

  const existingMap = new Map();
  existing.forEach(c => {
    existingMap.set((c.conference || "").toLowerCase(), c);
  });

  const results = { updated: 0, added: 0, unchanged: 0, details: [] };
  let batch = db.batch();
  let batchCount = 0;

  for (const newConf of newConferences) {
    const key = (newConf.conference || "").toLowerCase();
    const existingConf = existingMap.get(key);

    if (existingConf) {
      const updates = {};
      for (const [field, value] of Object.entries(newConf)) {
        if (field === "id" || !isNonEmpty(value)) continue;
        const existingVal = existingConf[field];
        if (!isNonEmpty(existingVal)) {
          updates[field] = value;
        }
      }

      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          batch.update(db.collection(CONFERENCES_COLLECTION).doc(existingConf.id), updates);
          batchCount++;
        }
        results.updated++;
        results.details.push({ action: "update", conference: newConf.conference, fields: Object.keys(updates) });
      } else {
        results.unchanged++;
      }
    } else {
      const cleaned = cleanRecord(newConf);
      if (!dryRun) {
        batch.set(db.collection(CONFERENCES_COLLECTION).doc(), cleaned);
        batchCount++;
      }
      results.added++;
      results.details.push({ action: "add", conference: newConf.conference });
    }

    if (batchCount >= 400) {
      if (!dryRun) await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0 && !dryRun) await batch.commit();
  return results;
}

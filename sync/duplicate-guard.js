/**
 * Duplicate guard for new programs.
 *
 * firestore-sync decides whether a scraped program already exists by comparing
 * a normalised key, and that key strips punctuation but keeps the spaces around
 * it — so "University of Wisconsin-Milwaukee" and NCR's
 * "University of Wisconsin – Milwaukee" produce different keys. While every such
 * row was rejected for having no state that did no harm. Once school enrichment
 * started filling the state, the 2026-09-13 run added 32 duplicates: every
 * Wisconsin campus twice over, plus "University of Texas – Austin" beside
 * "University of Texas at Austin", "St. Joseph’s" beside "Saint Josephs", and so
 * on.
 *
 * This runs the shared school matcher — aliases, apostrophes, "at", state hints
 * — against the programs that already exist before a new one is allowed in.
 * Pure: no Firestore, so it can be unit tested directly.
 */

import { buildSchoolIndex, matchSchool } from "./match-school.js";

/**
 * Normalise the decoration different sources hang off a school name.
 *
 * NCR separates campus names with a spaced dash. Next Phase appends the team
 * rather than the school -- "Chico State Men's Rugby Club", "Seton Hall Men's" --
 * which buries the words that actually identify the school.
 */
function stripDecoration(name) {
  return (name || "")
    .replace(/\s*[–—]\s*/g, " ")
    .replace(/\s+(men|women)('|’)?s?\s+rugby\s+(club|team)$/i, "")
    .replace(/\s+rugby\s+(club|team)$/i, "")
    .replace(/\s+(men|women)('|’)?s$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a lookup over existing programs. Returns a function that, given a
 * candidate new program, reports the existing program it duplicates — or null
 * when it looks genuinely new.
 *
 * When the candidate names a state, it is matched only against programs in that
 * state (plus any stored without one). The matcher treats "University" and
 * "College" as noise, so across the whole country "St. Mary’s College Maryland"
 * scores Saint Mary's College in Indiana as highly as the Maryland school.
 * Vetoing that wrong answer after the fact would leave the row unmatched and let
 * it in as a duplicate; searching within the state finds the right school.
 */
export function createDuplicateGuard(existingPrograms) {
  const indexes = new Map();

  function indexFor(gender, state) {
    const key = `${gender}::${state}`;
    if (!indexes.has(key)) {
      const pool = state
        ? existingPrograms.filter(p => {
            const s = (p.state || "").toUpperCase();
            return !s || s === state;
          })
        : existingPrograms;
      indexes.set(key, buildSchoolIndex(pool, { gender }));
    }
    return indexes.get(key);
  }

  return function findExisting(program) {
    const gender = program.gender || "";
    const state = (program.state || "").toUpperCase();

    const { program: existing, how } = matchSchool(
      stripDecoration(program.school),
      indexFor(gender, state),
      { stateHint: state }
    );
    return existing ? { existing, how } : null;
  };
}

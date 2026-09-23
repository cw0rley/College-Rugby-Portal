/**
 * School-name matching.
 *
 * Rugby sources name schools the way people say them out loud — "Cal", "Navy",
 * "Saint Mary's", "Miami (OH)" — while the programs collection stores the
 * registrar's version. Matching the two is needed anywhere scraped rows have to
 * find their program: rankings, the status list, future poll sources.
 *
 * The order below is deliberate, cheapest and most certain first:
 *   1. an explicit alias        ("byu" -> Brigham Young University)
 *   2. exact normalised equality
 *   3. one name contained in the other, when only one program matches
 *   4. flagship-vs-state tie-break ("Michigan" -> University of Michigan,
 *      "Michigan State" -> Michigan State University)
 *   5. token overlap, but only when the best candidate is clearly ahead
 *
 * Anything that survives all five without a confident answer is returned
 * unmatched with its candidates, for a human to resolve. Guessing here writes
 * one school's ranking onto another school's page.
 */

// Short forms and acronyms no amount of string similarity will reach.
export const SCHOOL_ALIASES = {
  "navy": "United States Naval Academy",
  "army": "United States Military Academy",
  "army west point": "United States Military Academy",
  "air force": "United States Air Force Academy",
  "cal": "University of California, Berkeley",
  "california": "University of California, Berkeley",
  "ucla": "University of California, Los Angeles",
  "usc": "University of Southern California",
  "byu": "Brigham Young University",
  "uconn": "University of Connecticut",
  "fau": "Florida Atlantic University",
  "fiu": "Florida International University",
  "bgsu": "Bowling Green State University",
  "wmu": "Western Michigan University",
  "cwu": "Central Washington University",
  "aic": "American International College",
  "iup": "Indiana University of Pennsylvania",
  "cal poly": "California Polytechnic State University",
  "ucsb": "University of California, Santa Barbara",
  "ucsc": "University of California, Santa Cruz",
  "uc davis": "University of California, Davis",
  "uc san diego": "University of California, San Diego",
  "uc riverside": "University of California, Riverside",
  "csulb": "California State University, Long Beach",
  "sfsu": "San Francisco State University",
  "sjsu": "San Jose State University",
  "utep": "University of Texas at El Paso",
  "utsa": "University of Texas at San Antonio",
  "unc chapel hill": "University of North Carolina at Chapel Hill",
  "unc charlotte": "University of North Carolina at Charlotte",
  "unc greensboro": "University of North Carolina at Greensboro",
  "unc-wilmington": "University of North Carolina Wilmington",
  "nc state": "North Carolina State University",
  "pitt": "University of Pittsburgh",
  "penn": "University of Pennsylvania",
  "lsu": "Louisiana State University",
  "smu": "Southern Methodist University",
  "tcu": "Texas Christian University",
  "vcu": "Virginia Commonwealth University",
  "vmi": "Virginia Military Institute",
  "wvu": "West Virginia University",
  "usf": "University of South Florida",
  "rit": "Rochester Institute of Technology",
  "mit": "Massachusetts Institute of Technology",
  "umass": "University of Massachusetts Amherst",
  "umass-lowell": "University of Massachusetts Lowell",
  "umbc": "University of Maryland, Baltimore County",
  "iu indy": "IUPUI (Indiana Univ–Purdue Univ Indy)",
  "indiana tech": "Indiana Institute of Technology",
  "cal maritime": "California State University Maritime Academy",
  "csu monterey bay": "California State University, Monterey Bay",
  "sacramento state": "California State University, Sacramento",
  "chico state": "California State University, Chico",
  "fresno state": "California State University, Fresno",
  "cal poly humboldt": "California State Polytechnic University, Humboldt",
  "coast guard": "United States Coast Guard Academy",
  "us coast guard academy": "United States Coast Guard Academy",
  "us merchant marine academy": "United States Merchant Marine Academy",
  "virginia tech": "Virginia Polytechnic Institute and State University",
  "miami (oh)": "Miami University of Ohio",
  "saint mary's": "Saint Marys College of California",
  "st. mary's": "Saint Marys College of California",
  "mount st. mary's": "Mount St. Mary's University",
  "minnesota-mankato": "Minnesota State University, Mankato",
  "missouri s&t": "University of Missouri - Science & Technology",
  "new mexico tech": "New Mexico Institute of Mining and Technology",
  "penn west univ. - california": "California University of Pennsylvania",
  "penn west univ. - clarion": "Clarion University of Pennsylvania",
  "wash u (st. louis)": "Washington University in St. Louis",
  "penn state": "Pennsylvania State University",
  "indiana": "Indiana University Bloomington",
  "texas": "University of Texas at Austin",
  "minnesota": "University of Minnesota Twin Cities",
  "st. joseph's": "Saint Josephs University",
  "st. josephs": "Saint Josephs University",
  "gvsu": "Grand Valley State University",
  "rpi": "Rensselaer Polytechnic Institute",
  "slu": "Saint Louis University",
  "ums&t": "University of Missouri - Science & Technology",
  "msu mankato": "Minnesota State University, Mankato",
  "uw-whitewater": "University of Wisconsin-Whitewater",
  "uw-milwaukee": "University of Wisconsin-Milwaukee",
  "uw-madison": "University of Wisconsin-Madison",
  "um-duluth": "University of Minnesota Duluth",
  "benedictine (ks)": "Benedictine College",
  "benedictine (il)": "Benedictine University",
  // NCR's spellings, seen once its dashes are softened to spaces
  "washington university st. louis": "Washington University in St. Louis",
  "university of minnesota moorhead": "Minnesota State University Moorhead",
};

const EXPANSIONS = [
  [/\buniv\.?\b/g, "university"],
  [/\bcoll\.?\b/g, "college"],
  [/\bst\.\s/g, "saint "],
  [/\bu\.\s*/g, "university "],
  [/&/g, " and "],
];

// Words too common to distinguish one school from another.
const STOPWORDS = new Set(["university", "college", "the", "of", "at", "and", "school"]);

export function normalizeSchool(name) {
  let t = (name || "").toLowerCase();
  for (const [re, rep] of EXPANSIONS) t = t.replace(re, rep);
  // Drop apostrophes rather than spacing them, so "Mary's" becomes "marys"
  // and not "mary s" — that stray "s" is a token that matches everything.
  t = t.replace(/['’]/g, "");
  return t.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(name) {
  return new Set(normalizeSchool(name).split(" ").filter(w => w && !STOPWORDS.has(w)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / (a.size + b.size - shared);
}

/**
 * Build a reusable index over programs. Pass gender to restrict matching to
 * one side, which removes a whole class of wrong answers.
 */
export function buildSchoolIndex(programs, { gender } = {}) {
  const pool = gender ? programs.filter(p => p.gender === gender) : programs;
  const entries = pool.map(p => ({
    program: p,
    norm: normalizeSchool(p.school),
    collapsed: normalizeSchool(p.school).replace(/ /g, ""),
    tokens: tokenize(p.school),
  }));

  const byNorm = new Map();
  const byCollapsed = new Map();
  for (const e of entries) {
    if (!byNorm.has(e.norm)) byNorm.set(e.norm, e);
    if (!byCollapsed.has(e.collapsed)) byCollapsed.set(e.collapsed, e);
  }

  return { entries, byNorm, byCollapsed };
}

/** "Michigan" is the flagship; "Michigan State" is the other one. */
function flagshipTieBreak(query, candidates) {
  const q = normalizeSchool(query);
  const wantsState = /\bstate\b/.test(q);
  const base = q.replace(/\s+state$/, "");

  const flagship = candidates.find(c => c.norm === `university of ${q}`);
  const stateSchool = candidates.find(
    c => c.norm === `${q} university` || c.norm === `${base} state university`
  );

  if (wantsState && stateSchool) return stateSchool;
  if (!wantsState && flagship) return flagship;
  return null;
}

/**
 * Match one scraped school name against the index.
 *
 * Returns { program, how } on a confident match, or
 * { program: null, candidates } when a human needs to decide.
 */
export function matchSchool(rawName, index, { minScore = 0.75, margin = 0.15, stateHint = "" } = {}) {
  // A poll that writes "Loyola (IL)" has told us which Loyola it means; using
  // that beats aliasing an ambiguous name to one school for every source.
  const preferState = list => {
    if (!stateHint || list.length < 2) return null;
    const inState = list.filter(e => (e.program.state || "").toUpperCase() === stateHint.toUpperCase());
    return inState.length === 1 ? inState[0] : null;
  };

  const alias = SCHOOL_ALIASES[(rawName || "").toLowerCase().trim()];
  const query = alias || rawName;
  const norm = normalizeSchool(query);
  const tokens = tokenize(query);

  const exact = index.byNorm.get(norm);
  if (exact) return { program: exact.program, how: alias ? "alias" : "exact" };

  // Same letters, different spacing: NCR writes "LaCrosse" where the stored name
  // is "La Crosse". Word-by-word comparison scores those as different schools,
  // so compare with the spaces taken out too.
  const collapsed = index.byCollapsed.get(norm.replace(/ /g, ""));
  if (collapsed) return { program: collapsed.program, how: "spacing" };

  const contained = index.entries.filter(e => e.norm.includes(norm) || norm.includes(e.norm));
  if (contained.length === 1) {
    // A campus name can contain its flagship's: "University of Maine Farmington"
    // contains "University of Maine". If a different program matches every
    // distinguishing word — "University of Maine at Farmington" — that is the
    // one meant, not the flagship the substring happened to hit first.
    const perfect = index.entries.filter(
      e => e.program !== contained[0].program && jaccard(tokens, e.tokens) === 1
    );
    if (perfect.length === 1) return { program: perfect[0].program, how: "fuzzy 1.00" };
    return { program: contained[0].program, how: "contains" };
  }
  const containedInState = preferState(contained);
  if (containedInState) return { program: containedInState.program, how: "contains+state" };

  const scored = index.entries
    .map(e => ({ ...e, score: jaccard(tokens, e.tokens) }))
    .sort((a, b) => b.score - a.score);

  const tie = flagshipTieBreak(query, scored.filter(s => s.score >= 0.5));
  if (tie) return { program: tie.program, how: "tiebreak" };

  const [best, second] = scored;
  if (best && best.score >= minScore && (!second || best.score - second.score >= margin)) {
    return { program: best.program, how: `fuzzy ${best.score.toFixed(2)}` };
  }

  const scoredInState = preferState(scored.filter(e => e.score >= 0.4));
  if (scoredInState) return { program: scoredInState.program, how: "fuzzy+state" };

  return {
    program: null,
    candidates: scored.filter(s => s.score > 0).slice(0, 3).map(s => s.program.school),
  };
}

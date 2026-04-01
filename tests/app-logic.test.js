import { describe, it, expect } from "vitest";

// Test the filtering and sorting logic extracted from App.jsx

function filterPrograms(programs, filters) {
  const { search, genderFilter, stateFilter, conferenceFilter, leagueFilter, minGPA, maxTuition, scholarshipOnly, schoolFundedOnly } = filters;
  return programs.filter(p => {
    if (genderFilter !== "all" && p.gender !== genderFilter) return false;
    if (stateFilter && p.state !== stateFilter) return false;
    if (conferenceFilter && p.conference !== conferenceFilter && !p.conference?.includes(conferenceFilter)) return false;
    if (leagueFilter && p.league !== leagueFilter) return false;
    if (minGPA && (!p.gpa || p.gpa < parseFloat(minGPA))) return false;
    if (maxTuition) {
      const tuition = p.inStateTuition;
      if (!tuition || tuition > parseInt(maxTuition)) return false;
    }
    if (scholarshipOnly && !p.rugbyScholarship) return false;
    if (schoolFundedOnly && !p.schoolFunded) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.school?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.conference?.toLowerCase().includes(q) ||
        p.contact?.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

function sortPrograms(programs, sortBy) {
  const list = [...programs];
  const sortFn = (a, b) => {
    if (sortBy === "school") return (a.school || "").localeCompare(b.school || "");
    if (sortBy === "rank") {
      const ar = a.rugbyRanking, br = b.rugbyRanking;
      if (!ar && !br) return 0;
      if (!ar) return 1;
      if (!br) return -1;
      return ar - br;
    }
    if (sortBy === "cost") {
      const ac = a.inStateTuition, bc = b.inStateTuition;
      if (!ac && !bc) return 0;
      if (!ac) return 1;
      if (!bc) return -1;
      return ac - bc;
    }
    if (sortBy === "sizeDesc" || sortBy === "sizeAsc") {
      const as = a.enrollment, bs = b.enrollment;
      if (!as && !bs) return 0;
      if (!as) return 1;
      if (!bs) return -1;
      return sortBy === "sizeDesc" ? bs - as : as - bs;
    }
    return 0;
  };
  const featured = list.filter(p => p.featured);
  const nonFeatured = list.filter(p => !p.featured);
  featured.sort(sortFn);
  nonFeatured.sort(sortFn);
  return [...featured, ...nonFeatured];
}

const samplePrograms = [
  { id: "1", school: "Penn State", city: "State College", state: "PA", gender: "mens", conference: "Big Ten", league: "D1A", gpa: 3.5, inStateTuition: 19000, rugbyRanking: 5, rugbyScholarship: true, schoolFunded: true, enrollment: 45000, featured: false },
  { id: "2", school: "UCLA", city: "Los Angeles", state: "CA", gender: "mens", conference: "PAC", league: "D1A", gpa: 3.9, inStateTuition: 14000, rugbyRanking: 1, rugbyScholarship: false, schoolFunded: false, enrollment: 32000, featured: true },
  { id: "3", school: "Ohio State", city: "Columbus", state: "OH", gender: "womens", conference: "Big Ten", league: "D1A", gpa: 3.3, inStateTuition: 11000, rugbyRanking: null, rugbyScholarship: false, schoolFunded: true, enrollment: 61000, featured: false },
  { id: "4", school: "Stanford", city: "Stanford", state: "CA", gender: "womens", conference: "PAC", league: "D1A", gpa: 4.0, inStateTuition: 55000, rugbyRanking: 2, rugbyScholarship: true, schoolFunded: true, enrollment: 17000, featured: false },
  { id: "5", school: "Small College", city: "Tiny Town", state: "VT", gender: "mens", conference: "NSCRO", league: "NSCRO", gpa: 2.8, inStateTuition: 8000, rugbyRanking: null, rugbyScholarship: false, schoolFunded: false, enrollment: 1500, featured: false },
];

const defaultFilters = {
  search: "",
  genderFilter: "all",
  stateFilter: "",
  conferenceFilter: "",
  leagueFilter: "",
  minGPA: "",
  maxTuition: "",
  scholarshipOnly: false,
  schoolFundedOnly: false,
};

describe("Program Filtering", () => {
  it("returns all programs with no filters", () => {
    const result = filterPrograms(samplePrograms, defaultFilters);
    expect(result).toHaveLength(5);
  });

  it("filters by gender", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, genderFilter: "mens" });
    expect(result).toHaveLength(3);
    result.forEach(p => expect(p.gender).toBe("mens"));
  });

  it("filters by state", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, stateFilter: "CA" });
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.state).toBe("CA"));
  });

  it("filters by conference (exact match)", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, conferenceFilter: "Big Ten" });
    expect(result).toHaveLength(2);
  });

  it("filters by conference (partial match from conference card)", () => {
    // Conference cards use short names like "Big" that should match "Big Ten"
    const programsWithGenderSuffix = [
      { id: "1", school: "A", conference: "Gold Coast Mens", gender: "mens" },
      { id: "2", school: "B", conference: "Gold Coast Womens", gender: "womens" },
      { id: "3", school: "C", conference: "Pacific Mens", gender: "mens" },
    ];
    const result = filterPrograms(programsWithGenderSuffix, { ...defaultFilters, conferenceFilter: "Gold Coast" });
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.conference).toContain("Gold Coast"));
  });

  it("conference filter with bogus league returns no results (regression: conference card click)", () => {
    // Bug: conferences collection had no league field, so clicking a conference card
    // set leagueFilter to "Other" — which matched zero programs, hiding all results.
    // Fix: conference card click must clear leagueFilter, not set it to the grouped label.
    const result = filterPrograms(samplePrograms, { ...defaultFilters, conferenceFilter: "Big Ten", leagueFilter: "Other" });
    expect(result).toHaveLength(0);
  });

  it("conference filter without league filter shows correct programs", () => {
    // This is the correct behavior after the fix: leagueFilter is cleared
    const result = filterPrograms(samplePrograms, { ...defaultFilters, conferenceFilter: "Big Ten", leagueFilter: "" });
    expect(result).toHaveLength(2);
  });

  it("filters by league", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, leagueFilter: "NSCRO" });
    expect(result).toHaveLength(1);
    expect(result[0].school).toBe("Small College");
  });

  it("filters by minimum GPA", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, minGPA: "3.5" });
    expect(result).toHaveLength(3);
    result.forEach(p => expect(p.gpa).toBeGreaterThanOrEqual(3.5));
  });

  it("filters by max tuition", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, maxTuition: "15000" });
    expect(result).toHaveLength(3);
    result.forEach(p => expect(p.inStateTuition).toBeLessThanOrEqual(15000));
  });

  it("filters by scholarship only", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, scholarshipOnly: true });
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.rugbyScholarship).toBe(true));
  });

  it("filters by school funded only", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, schoolFundedOnly: true });
    expect(result).toHaveLength(3);
    result.forEach(p => expect(p.schoolFunded).toBe(true));
  });

  it("filters by search term (school name)", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, search: "penn" });
    expect(result).toHaveLength(1);
    expect(result[0].school).toBe("Penn State");
  });

  it("filters by search term (city)", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, search: "columbus" });
    expect(result).toHaveLength(1);
    expect(result[0].school).toBe("Ohio State");
  });

  it("filters by search term (conference)", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, search: "big ten" });
    expect(result).toHaveLength(2);
  });

  it("combines multiple filters", () => {
    const result = filterPrograms(samplePrograms, {
      ...defaultFilters,
      genderFilter: "mens",
      stateFilter: "CA",
    });
    expect(result).toHaveLength(1);
    expect(result[0].school).toBe("UCLA");
  });

  it("returns empty when no programs match", () => {
    const result = filterPrograms(samplePrograms, { ...defaultFilters, stateFilter: "HI" });
    expect(result).toHaveLength(0);
  });

  it("excludes programs without GPA when minGPA is set", () => {
    const withNull = [...samplePrograms, { id: "6", school: "No GPA", gpa: null, gender: "mens", state: "TX" }];
    const result = filterPrograms(withNull, { ...defaultFilters, minGPA: "2.0" });
    expect(result.find(p => p.school === "No GPA")).toBeUndefined();
  });
});

describe("Program Sorting", () => {
  it("sorts by school name alphabetically", () => {
    const result = sortPrograms(samplePrograms, "school");
    // Featured (UCLA) first, then alphabetical
    expect(result[0].school).toBe("UCLA"); // featured
    expect(result[1].school).toBe("Ohio State");
    expect(result[2].school).toBe("Penn State");
  });

  it("sorts by rank (lowest first)", () => {
    const result = sortPrograms(samplePrograms, "rank");
    // Featured (UCLA rank 1) first, then by rank
    expect(result[0].school).toBe("UCLA");
    expect(result[1].school).toBe("Stanford"); // rank 2
    expect(result[2].school).toBe("Penn State"); // rank 5
  });

  it("puts unranked programs last when sorting by rank", () => {
    const result = sortPrograms(samplePrograms, "rank");
    const lastTwo = result.slice(-2);
    lastTwo.forEach(p => expect(p.rugbyRanking).toBeFalsy());
  });

  it("sorts by cost (lowest first)", () => {
    const result = sortPrograms(samplePrograms, "cost");
    // UCLA is featured (cost 14k), comes first
    expect(result[0].school).toBe("UCLA");
    // Then by cost among non-featured
    expect(result[1].school).toBe("Small College"); // 8k
    expect(result[2].school).toBe("Ohio State"); // 11k
  });

  it("sorts by enrollment descending", () => {
    const result = sortPrograms(samplePrograms, "sizeDesc");
    // Featured first, then non-featured by enrollment desc
    expect(result[0].school).toBe("UCLA");
    expect(result[1].school).toBe("Ohio State"); // 61k
    expect(result[2].school).toBe("Penn State"); // 45k
  });

  it("sorts by enrollment ascending", () => {
    const result = sortPrograms(samplePrograms, "sizeAsc");
    expect(result[0].school).toBe("UCLA"); // featured
    expect(result[1].school).toBe("Small College"); // 1.5k
    expect(result[2].school).toBe("Stanford"); // 17k
  });

  it("keeps featured programs before non-featured", () => {
    const result = sortPrograms(samplePrograms, "school");
    expect(result[0].featured).toBe(true);
    result.slice(1).forEach(p => expect(p.featured).toBe(false));
  });
});

describe("Compare Logic", () => {
  function handleToggleCompare(compareIds, programId) {
    if (compareIds.includes(programId)) return compareIds.filter(id => id !== programId);
    if (compareIds.length >= 3) return compareIds;
    return [...compareIds, programId];
  }

  it("adds program to compare list", () => {
    expect(handleToggleCompare([], "prog1")).toEqual(["prog1"]);
  });

  it("removes program from compare list", () => {
    expect(handleToggleCompare(["prog1", "prog2"], "prog1")).toEqual(["prog2"]);
  });

  it("limits to 3 programs max", () => {
    const result = handleToggleCompare(["a", "b", "c"], "d");
    expect(result).toHaveLength(3);
    expect(result).not.toContain("d");
  });

  it("allows adding up to 3", () => {
    let ids = handleToggleCompare([], "a");
    ids = handleToggleCompare(ids, "b");
    ids = handleToggleCompare(ids, "c");
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("Favorites Logic", () => {
  function handleToggleFavorite(favoriteIds, programId) {
    const next = new Set(favoriteIds);
    if (next.has(programId)) {
      next.delete(programId);
    } else {
      next.add(programId);
    }
    return next;
  }

  it("adds program to favorites", () => {
    const result = handleToggleFavorite(new Set(), "prog1");
    expect(result.has("prog1")).toBe(true);
  });

  it("removes program from favorites", () => {
    const result = handleToggleFavorite(new Set(["prog1"]), "prog1");
    expect(result.has("prog1")).toBe(false);
  });

  it("preserves other favorites when toggling", () => {
    const result = handleToggleFavorite(new Set(["prog1", "prog2"]), "prog1");
    expect(result.has("prog2")).toBe(true);
    expect(result.size).toBe(1);
  });
});

describe("Conference Search", () => {
  function searchConferences(conferences, search) {
    if (!search) return conferences;
    const q = search.toLowerCase();
    return conferences.filter(c =>
      c.conference?.toLowerCase().includes(q) ||
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }

  const confs = [
    { conference: "PAC", fullName: "Pacific Athletic Conference", email: "pac@rugby.org" },
    { conference: "B1G", fullName: "Big Ten Conference", email: "big10@rugby.org" },
    { conference: "SEC", fullName: "Southeastern Conference", email: "sec@rugby.org" },
  ];

  it("returns all when no search", () => {
    expect(searchConferences(confs, "")).toHaveLength(3);
  });

  it("searches by abbreviation", () => {
    expect(searchConferences(confs, "PAC")).toHaveLength(1);
  });

  it("searches by full name", () => {
    expect(searchConferences(confs, "southeastern")).toHaveLength(1);
  });

  it("searches by email", () => {
    expect(searchConferences(confs, "big10")).toHaveLength(1);
  });

  it("is case insensitive", () => {
    expect(searchConferences(confs, "pac")).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    expect(searchConferences(confs, "xyz")).toHaveLength(0);
  });
});

describe("Coach Detection Logic", () => {
  function detectCoachProgramIds(userEmail, programContacts, assignedProgramIds) {
    const ids = new Set();
    const email = userEmail?.toLowerCase();
    if (email && programContacts.length) {
      programContacts.filter(c => c.email?.toLowerCase() === email).forEach(c => ids.add(c.programId));
    }
    if (assignedProgramIds) {
      assignedProgramIds.forEach(id => ids.add(id));
    }
    return [...ids];
  }

  const contacts = [
    { programId: "prog1", email: "coach@psu.edu", contactTitle: "Head Coach" },
    { programId: "prog2", email: "coach@psu.edu", contactTitle: "Assistant Coach" },
    { programId: "prog3", email: "other@osu.edu", contactTitle: "Head Coach" },
  ];

  it("matches programs by email", () => {
    const ids = detectCoachProgramIds("coach@psu.edu", contacts, []);
    expect(ids).toContain("prog1");
    expect(ids).toContain("prog2");
    expect(ids).not.toContain("prog3");
  });

  it("includes admin-assigned program IDs", () => {
    const ids = detectCoachProgramIds("nobody@test.com", contacts, ["prog99"]);
    expect(ids).toContain("prog99");
  });

  it("combines email match and assigned IDs", () => {
    const ids = detectCoachProgramIds("coach@psu.edu", contacts, ["prog99"]);
    expect(ids).toHaveLength(3);
    expect(ids).toContain("prog1");
    expect(ids).toContain("prog2");
    expect(ids).toContain("prog99");
  });

  it("deduplicates IDs", () => {
    const ids = detectCoachProgramIds("coach@psu.edu", contacts, ["prog1"]);
    expect(ids.filter(id => id === "prog1")).toHaveLength(1);
  });

  it("returns empty array for non-coach user", () => {
    const ids = detectCoachProgramIds("player@gmail.com", contacts, []);
    expect(ids).toHaveLength(0);
  });

  it("handles null email", () => {
    const ids = detectCoachProgramIds(null, contacts, []);
    expect(ids).toHaveLength(0);
  });

  it("is case insensitive for email matching", () => {
    const ids = detectCoachProgramIds("Coach@PSU.edu", contacts, []);
    expect(ids).toContain("prog1");
  });
});

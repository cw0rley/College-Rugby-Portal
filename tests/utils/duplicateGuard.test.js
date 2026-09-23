import { describe, it, expect } from "vitest";
import { createDuplicateGuard } from "../../sync/duplicate-guard.js";

// Existing programs as stored before the 2026-09-13 sync.
const existing = [
  { id: "w1", school: "University of Wisconsin-Milwaukee", gender: "mens", state: "WI" },
  { id: "w2", school: "University of Wisconsin-Whitewater", gender: "mens", state: "WI" },
  { id: "w3", school: "University of Wisconsin-Milwaukee", gender: "womens", state: "WI" },
  { id: "t1", school: "University of Texas at Austin", gender: "mens", state: "TX" },
  { id: "t2", school: "University of Texas at Dallas", gender: "mens", state: "TX" },
  { id: "s1", school: "Saint Josephs University", gender: "mens", state: "PA" },
  { id: "b1", school: "Binghamton University (SUNY)", gender: "mens", state: "NY" },
  { id: "e1", school: "Emory and Henry College", gender: "womens", state: "VA" },
  { id: "m1", school: "Mount St. Mary's University", gender: "womens", state: "MD" },
  { id: "u1", school: "Washington University in St. Louis", gender: "mens", state: "MO" },
  { id: "n1", school: "Minnesota State University Moorhead", gender: "womens", state: "MN" },
  { id: "mt", school: "University of Montana", gender: "mens", state: "MT" },
  { id: "ag", school: "Augustana College", gender: "womens", state: "IL" },
  { id: "sm", school: "Saint Mary's College", gender: "womens", state: "IN" },
  { id: "md", school: "St. Marys College of Maryland", gender: "womens", state: "MD" },
  { id: "um", school: "University of Maine", gender: "mens", state: "ME" },
  { id: "uf", school: "University of Maine at Farmington", gender: "mens", state: "ME" },
  { id: "lc", school: "University of Wisconsin-La Crosse", gender: "womens", state: "WI" },
];

const findExisting = createDuplicateGuard(existing);

// Every name below was added as a duplicate by the scheduled sync on 2026-09-13.
describe("createDuplicateGuard — names the sync duplicated", () => {
  const cases = [
    ["University of Wisconsin – Milwaukee", "mens", "WI", "w1"],
    ["University of Wisconsin – Milwaukee", "womens", "WI", "w3"],
    ["University of Wisconsin – Whitewater", "mens", "WI", "w2"],
    ["University of Texas – Austin", "mens", "TX", "t1"],
    ["St. Joseph’s University", "mens", "PA", "s1"],
    ["SUNY – Binghamton", "mens", "NY", "b1"],
    ["Emory & Henry College", "womens", "VA", "e1"],
    ["Mount Saint Mary’s University", "womens", "MD", "m1"],
    ["Washington University – St. Louis", "mens", "MO", "u1"],
    ["University of Minnesota – Moorhead", "womens", "MN", "n1"],
  ];

  for (const [school, gender, state, id] of cases) {
    it(`recognises "${school}" (${gender}) as existing`, () => {
      const hit = findExisting({ school, gender, state });
      expect(hit).not.toBeNull();
      expect(hit.existing.id).toBe(id);
    });
  }
});

describe("createDuplicateGuard — programs that are genuinely new", () => {
  it("does not match across genders", () => {
    // Men's Montana exists; the women's program added on 2026-09-13 is real.
    expect(findExisting({ school: "University of Montana", gender: "womens", state: "MT" })).toBeNull();
  });

  it("does not collapse a different campus of the same system", () => {
    expect(findExisting({ school: "University of Wisconsin – Parkside", gender: "mens", state: "WI" })).toBeNull();
  });

  it("does not match a school that is simply absent", () => {
    expect(findExisting({ school: "Wesleyan College", gender: "mens", state: "GA" })).toBeNull();
  });

  it("keeps Austin and Dallas apart", () => {
    expect(findExisting({ school: "University of Texas – Dallas", gender: "mens", state: "TX" }).existing.id).toBe("t2");
  });

  it("does not match a same-named school in a different state", () => {
    // Augustana University is in South Dakota; Augustana College is in Illinois.
    expect(findExisting({ school: "Augustana University", gender: "womens", state: "SD" })).toBeNull();
  });

  it("finds the in-state school rather than a same-named one elsewhere", () => {
    // Matched nationally, Saint Mary's College (IN) scores as well as the Maryland
    // school. Vetoing it afterwards would let this row in as a duplicate.
    expect(findExisting({ school: "St. Mary’s College Maryland", gender: "womens", state: "MD" }).existing.id).toBe("md");
  });

  it("matches a name that differs only in spacing", () => {
    // The 2026-09-20 run added "University of Wisconsin – LaCrosse": same letters
    // as the stored "La Crosse", but one word instead of two, so comparing word
    // by word scored them as different schools.
    expect(findExisting({ school: "University of Wisconsin – LaCrosse", gender: "womens", state: "WI" }).existing.id).toBe("lc");
  });

  it("attributes a campus to the campus, not the flagship", () => {
    expect(findExisting({ school: "University of Maine – Farmington", gender: "mens", state: "ME" }).existing.id).toBe("uf");
  });

  it("still flags a same-named school when the state agrees", () => {
    expect(findExisting({ school: "Augustana Coll.", gender: "womens", state: "IL" }).existing.id).toBe("ag");
  });

  it("still flags a duplicate when the new row has no state to compare", () => {
    expect(findExisting({ school: "Augustana College", gender: "womens" }).existing.id).toBe("ag");
  });
});

// The 2026-09-23 run was the first with a Next Phase token, and Next Phase
// names schools differently from NCR: abbreviations, team suffixes, and typos.
// 20 of its 21 additions were wrong. Every name below is verbatim from that run.
describe("createDuplicateGuard — Next Phase naming", () => {
  const existing = [
    { id: "sb", school: "University of California, Santa Barbara", gender: "mens", state: "CA" },
    { id: "fl", school: "California State University, Fullerton", gender: "mens", state: "CA" },
    { id: "ch", school: "California State University, Chico", gender: "mens", state: "CA" },
    { id: "sa", school: "California State University, Sacramento", gender: "mens", state: "CA" },
    { id: "lo", school: "University of Massachusetts Lowell", gender: "mens", state: "MA" },
    { id: "os", school: "Ohio State University", gender: "mens", state: "OH" },
    { id: "bo", school: "St. Bonaventure University", gender: "mens", state: "NY" },
    { id: "vm", school: "Virginia Military Institute", gender: "mens", state: "VA" },
    { id: "af", school: "United States Air Force Academy", gender: "mens", state: "CO" },
    { id: "mm", school: "United States Merchant Marine Academy", gender: "mens", state: "NY" },
    { id: "ip", school: "Indiana University of Pennsylvania", gender: "mens", state: "PA" },
    { id: "sh", school: "Seton Hall University", gender: "mens", state: "NJ" },
  ];
  const findExisting = createDuplicateGuard(existing);

  const cases = [
    ["UC Santa Barbara", "CA", "sb"],
    ["Cal State Fullerton", "CA", "fl"],
    ["UMass Lowell", "MA", "lo"],
    ["Indiana University of PA", "PA", "ip"],
    ["U.S. Air Force Academy", "CO", "af"],
    // typos in the source data
    ["Ohio State Univeristy", "OH", "os"],
    ["Virginia Military Institue", "VA", "vm"],
    ["United States Merchant Marine Acedemy", "NY", "mm"],
    // the team name rather than the school
    ["Chico State Men's Rugby Club", "CA", "ch"],
    ["Sacramento State Men’s", "CA", "sa"],
    ["Seton Hall Men’s", "NJ", "sh"],
    // no space after the period
    ["St.Bonaventure University Men’s", "NY", "bo"],
  ];

  for (const [school, state, id] of cases) {
    it(`recognises "${school}"`, () => {
      const hit = findExisting({ school, gender: "mens", state });
      expect(hit).not.toBeNull();
      expect(hit.existing.id).toBe(id);
    });
  }

  it("still lets a genuinely new program through", () => {
    // East Tennessee State was the one correct addition out of the 21.
    expect(findExisting({ school: "East Tennessee State University", gender: "mens", state: "TN" })).toBeNull();
  });

  it("does not treat a different campus as a typo", () => {
    // Two characters apart, but different schools.
    expect(findExisting({ school: "Penn State Altoona", gender: "mens", state: "PA" })).toBeNull();
  });
});

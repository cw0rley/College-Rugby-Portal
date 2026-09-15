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

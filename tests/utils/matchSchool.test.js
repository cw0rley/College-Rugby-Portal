import { describe, it, expect } from "vitest";
import { buildSchoolIndex, matchSchool, normalizeSchool } from "../../sync/match-school.js";

const programs = [
  { id: "1",  school: "University of Michigan", gender: "mens", state: "MI" },
  { id: "2",  school: "Michigan State University", gender: "mens", state: "MI" },
  { id: "3",  school: "United States Naval Academy", gender: "mens", state: "MD" },
  { id: "4",  school: "Brigham Young University", gender: "mens", state: "UT" },
  { id: "5",  school: "Loyola University Chicago", gender: "mens", state: "IL" },
  { id: "6",  school: "Loyola University Maryland", gender: "mens", state: "MD" },
  { id: "7",  school: "Loyola Marymount University", gender: "mens", state: "CA" },
  { id: "8",  school: "Stanford University", gender: "mens", state: "CA" },
  { id: "9",  school: "University of Michigan", gender: "womens", state: "MI" },
  { id: "10", school: "Penn State Altoona", gender: "mens", state: "PA" },
  { id: "11", school: "Penn State Berks", gender: "mens", state: "PA" },
];

const mens = buildSchoolIndex(programs, { gender: "mens" });

describe("normalizeSchool", () => {
  it("expands the abbreviations sources actually use", () => {
    expect(normalizeSchool("Stanford Univ.")).toBe("stanford university");
    expect(normalizeSchool("St. Mary's Coll.")).toBe("saint marys college");
  });

  it("folds punctuation and case", () => {
    expect(normalizeSchool("  TEXAS A&M  ")).toBe("texas a and m");
  });
});

describe("matchSchool", () => {
  it("resolves an alias", () => {
    const { program, how } = matchSchool("Navy", mens);
    expect(program.school).toBe("United States Naval Academy");
    expect(how).toBe("alias");
  });

  it("matches exactly, ignoring case and punctuation", () => {
    expect(matchSchool("stanford university", mens).program.id).toBe("8");
    expect(matchSchool("Stanford Univ.", mens).program.id).toBe("8");
  });

  it("prefers the flagship for a bare state name", () => {
    const { program, how } = matchSchool("Michigan", mens);
    expect(program.school).toBe("University of Michigan");
    expect(how).toBe("tiebreak");
  });

  it("prefers the state school when the name says State", () => {
    expect(matchSchool("Michigan State", mens).program.school).toBe("Michigan State University");
  });

  it("respects the gender the index was built for", () => {
    // Both genders have a Michigan; the men's index must not return the women's.
    expect(matchSchool("Michigan", mens).program.gender).toBe("mens");
  });

  it("uses a state hint to pick between same-named schools", () => {
    expect(matchSchool("Loyola", mens, { stateHint: "IL" }).program.school)
      .toBe("Loyola University Chicago");
    expect(matchSchool("Loyola", mens, { stateHint: "MD" }).program.school)
      .toBe("Loyola University Maryland");
  });

  it("refuses to guess when nothing is clearly right", () => {
    // Three Loyolas and no state hint: a guess here would put one school's
    // ranking on another school's page.
    const { program, candidates } = matchSchool("Loyola", mens);
    expect(program).toBeNull();
    expect(candidates.length).toBeGreaterThan(1);
  });

  it("reports no match when the school is absent entirely", () => {
    // Penn State's main campus is not in the data — only Altoona and Berks.
    const { program } = matchSchool("Penn State", mens);
    expect(program).toBeNull();
  });

  it("returns candidates to help a human resolve a miss", () => {
    const { candidates } = matchSchool("Penn State", mens);
    expect(candidates.join(" ")).toMatch(/Penn State/);
  });
});

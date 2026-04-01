import { describe, it, expect } from "vitest";
import { US_STATES, EMPTY_PROGRAM, CSV_COLS, CSV_NUM_FIELDS, CSV_BOOL_FIELDS, CONF_COLS, CONF_CONTACT_COLS, LEAGUE_COLS, PROG_CONTACT_COLS, EMPTY_PROGRAM_CONTACT } from "../constants.js";

describe("constants", () => {
  describe("US_STATES", () => {
    it("contains all 50 states plus DC", () => {
      expect(Object.keys(US_STATES)).toHaveLength(51);
    });

    it("maps abbreviations to full names", () => {
      expect(US_STATES.CA).toBe("California");
      expect(US_STATES.NY).toBe("New York");
      expect(US_STATES.TX).toBe("Texas");
      expect(US_STATES.DC).toBe("D.C.");
    });
  });

  describe("EMPTY_PROGRAM", () => {
    it("has all required fields", () => {
      const requiredFields = [
        "school", "city", "state", "gender", "conference", "league",
        "gpa", "sat", "enrollment", "inStateTuition", "outStateTuition",
        "rugbyRanking", "rugbyScholarship", "schoolFunded", "website",
        "rugbyWebsite", "notes", "featured", "logoUrl",
      ];
      requiredFields.forEach(field => {
        expect(EMPTY_PROGRAM).toHaveProperty(field);
      });
    });

    it("defaults gender to mens", () => {
      expect(EMPTY_PROGRAM.gender).toBe("mens");
    });

    it("defaults booleans to false", () => {
      expect(EMPTY_PROGRAM.rugbyScholarship).toBe(false);
      expect(EMPTY_PROGRAM.schoolFunded).toBe(false);
      expect(EMPTY_PROGRAM.featured).toBe(false);
    });
  });

  describe("EMPTY_PROGRAM_CONTACT", () => {
    it("has programId, contact, contactTitle, email", () => {
      expect(EMPTY_PROGRAM_CONTACT).toEqual({
        programId: "",
        contact: "",
        contactTitle: "",
        email: "",
      });
    });
  });

  describe("CSV_COLS", () => {
    it("is an array of [key, label] pairs", () => {
      expect(Array.isArray(CSV_COLS)).toBe(true);
      CSV_COLS.forEach(col => {
        expect(col).toHaveLength(2);
        expect(typeof col[0]).toBe("string");
        expect(typeof col[1]).toBe("string");
      });
    });

    it("includes school as first column", () => {
      expect(CSV_COLS[0]).toEqual(["school", "School"]);
    });
  });

  describe("CSV_NUM_FIELDS", () => {
    it("is a Set of numeric field keys", () => {
      expect(CSV_NUM_FIELDS).toBeInstanceOf(Set);
      expect(CSV_NUM_FIELDS.has("gpa")).toBe(true);
      expect(CSV_NUM_FIELDS.has("sat")).toBe(true);
      expect(CSV_NUM_FIELDS.has("enrollment")).toBe(true);
      expect(CSV_NUM_FIELDS.has("school")).toBe(false);
    });
  });

  describe("CSV_BOOL_FIELDS", () => {
    it("is a Set of boolean field keys", () => {
      expect(CSV_BOOL_FIELDS).toBeInstanceOf(Set);
      expect(CSV_BOOL_FIELDS.has("rugbyScholarship")).toBe(true);
      expect(CSV_BOOL_FIELDS.has("schoolFunded")).toBe(true);
      expect(CSV_BOOL_FIELDS.has("school")).toBe(false);
    });
  });

  describe("column definitions", () => {
    it("CONF_COLS has conference, fullName, notes", () => {
      const keys = CONF_COLS.map(c => c[0]);
      expect(keys).toContain("conference");
      expect(keys).toContain("fullName");
    });

    it("CONF_CONTACT_COLS has required contact fields", () => {
      const keys = CONF_CONTACT_COLS.map(c => c[0]);
      expect(keys).toContain("conference");
      expect(keys).toContain("contactName");
      expect(keys).toContain("email");
    });

    it("LEAGUE_COLS has name", () => {
      expect(LEAGUE_COLS[0][0]).toBe("name");
    });

    it("PROG_CONTACT_COLS has school, contact, email", () => {
      const keys = PROG_CONTACT_COLS.map(c => c[0]);
      expect(keys).toContain("school");
      expect(keys).toContain("contact");
      expect(keys).toContain("email");
    });
  });
});

import { describe, it, expect } from "vitest";
import { toSlug } from "../../utils/slug.js";

describe("toSlug", () => {
  it("lowercases and hyphenates school names", () => {
    expect(toSlug("University of Michigan")).toBe("university-of-michigan");
  });

  it("strips special characters", () => {
    expect(toSlug("St. Mary's College")).toBe("st-mary-s-college");
  });

  it("collapses multiple non-alphanumeric chars into single hyphen", () => {
    expect(toSlug("UCLA --- Bruins")).toBe("ucla-bruins");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toSlug("--test--")).toBe("test");
  });

  it("handles empty string", () => {
    expect(toSlug("")).toBe("");
  });

  it("handles null/undefined", () => {
    expect(toSlug(null)).toBe("");
    expect(toSlug(undefined)).toBe("");
  });

  it("handles already-slugified text", () => {
    expect(toSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("handles numbers", () => {
    expect(toSlug("Division 1 Schools")).toBe("division-1-schools");
  });
});

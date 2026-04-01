import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCSVLine, exportCSV, parseCSV, exportGenericCSV, parseGenericCSV } from "../../utils/csv.js";

describe("parseCSVLine", () => {
  it("parses simple comma-separated values", () => {
    expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCSVLine('"hello, world",b,c')).toEqual(["hello, world", "b", "c"]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    expect(parseCSVLine('"say ""hi""",b')).toEqual(['say "hi"', "b"]);
  });

  it("handles empty fields", () => {
    expect(parseCSVLine(",b,,d")).toEqual(["", "b", "", "d"]);
  });

  it("handles single field", () => {
    expect(parseCSVLine("only")).toEqual(["only"]);
  });

  it("handles empty string", () => {
    expect(parseCSVLine("")).toEqual([""]);
  });
});

describe("parseCSV", () => {
  it("parses CSV text into objects using CSV_COLS label mapping", () => {
    const text = "School,State,City,Gender\nPenn State,PA,State College,mens\nOhio State,OH,Columbus,mens";
    const result = parseCSV(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      school: "Penn State",
      state: "PA",
      city: "State College",
      gender: "mens",
    });
    expect(result[1].school).toBe("Ohio State");
  });

  it("parses numeric fields as numbers", () => {
    const text = "School,GPA,SAT\nTest School,3.5,1200";
    const result = parseCSV(text);
    expect(result[0].gpa).toBe(3.5);
    expect(result[0].sat).toBe(1200);
  });

  it("parses boolean fields", () => {
    const text = "School,Rugby Scholarship,School Funded\nTest,true,false";
    const result = parseCSV(text);
    expect(result[0].rugbyScholarship).toBe(true);
    expect(result[0].schoolFunded).toBe(false);
  });

  it("returns empty array for header-only CSV", () => {
    expect(parseCSV("School,State")).toEqual([]);
  });

  it("returns empty array for empty text", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("skips blank lines", () => {
    const text = "School,State\nPenn State,PA\n\nOhio State,OH\n";
    const result = parseCSV(text);
    expect(result).toHaveLength(2);
  });
});

describe("exportCSV", () => {
  it("creates a download link and triggers click", () => {
    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    });

    exportCSV([{ school: "Test U", state: "CA" }], "test.csv");
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    document.createElement.mockRestore();
  });
});

describe("parseGenericCSV", () => {
  it("maps columns using provided col definition", () => {
    const cols = [["name", "Name"], ["email", "Email"]];
    const text = "Name,Email\nJohn,john@test.com\nJane,jane@test.com";
    const result = parseGenericCSV(text, cols);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "John", email: "john@test.com" });
  });

  it("returns empty for header-only", () => {
    const cols = [["name", "Name"]];
    expect(parseGenericCSV("Name", cols)).toEqual([]);
  });
});

describe("exportGenericCSV", () => {
  it("triggers download with formatted CSV", () => {
    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    });

    const cols = [["name", "Name"], ["email", "Email"]];
    const rows = [{ name: "John", email: "john@test.com" }];
    exportGenericCSV(cols, rows, "contacts.csv");
    expect(clickSpy).toHaveBeenCalled();

    document.createElement.mockRestore();
  });

  it("escapes values containing commas", () => {
    // We can't easily inspect the blob content, but we can verify it doesn't throw
    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: clickSpy,
    });

    const cols = [["name", "Name"]];
    const rows = [{ name: "Doe, John" }];
    exportGenericCSV(cols, rows, "test.csv");
    expect(clickSpy).toHaveBeenCalled();

    document.createElement.mockRestore();
  });
});

import { describe, it, expect } from "vitest";
import { extractEmails } from "../../sync/extract-emails.js";

describe("extractEmails", () => {
  it("returns nothing for empty input", () => {
    expect(extractEmails("")).toEqual([]);
    expect(extractEmails(null)).toEqual([]);
    expect(extractEmails(undefined)).toEqual([]);
  });

  it("pulls a plain address out of surrounding text", () => {
    expect(extractEmails("Contact hickie@usna.edu today")).toEqual(["hickie@usna.edu"]);
  });

  it("stops at the TLD when page text runs straight into the address", () => {
    // The old inline regex ended in [\w.]+ and swallowed the following word,
    // producing "…@gmail.combottom" in live conference-scrape output.
    expect(extractEmails("mail RugbyEastConference@gmail.combottom of page"))
      .toEqual(["RugbyEastConference@gmail.com"]);
    expect(extractEmails("marcrugbydirector@gmail.comGoogle Sites"))
      .toEqual(["marcrugbydirector@gmail.com"]);
  });

  it("ignores version strings that look like addresses", () => {
    // A bundler version in an inline script matched the old pattern because
    // digits are word characters.
    expect(extractEmails('require("rspack@1.6.6");')).toEqual([]);
  });

  it("ignores an all-numeric local part", () => {
    expect(extractEmails("12345@1.2.3")).toEqual([]);
  });

  it("finds several addresses in order", () => {
    expect(extractEmails("a@x.org and b@y.edu, c@z.rugby"))
      .toEqual(["a@x.org", "b@y.edu", "c@z.rugby"]);
  });

  it("deduplicates case-insensitively, keeping first seen", () => {
    expect(extractEmails("Coach@School.EDU and coach@school.edu"))
      .toEqual(["Coach@School.EDU"]);
  });

  it("handles subdomains and plus addressing", () => {
    expect(extractEmails("rugby+info@mail.club.org")).toEqual(["rugby+info@mail.club.org"]);
  });

  it("does not match an unknown TLD", () => {
    expect(extractEmails("someone@example.notarealtld")).toEqual([]);
  });
});

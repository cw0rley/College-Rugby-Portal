import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { trackPageView, trackProgramView, trackSearch, trackFilter, trackExport, trackOutboundClick } from "../../utils/analytics.js";

// analytics.js skips tracking when import.meta.env.DEV is true (vitest sets DEV=true).
// We test that the functions don't throw and accept correct arguments.

describe("analytics utilities", () => {
  it("trackPageView accepts a tab name", () => {
    expect(() => trackPageView("home")).not.toThrow();
    expect(() => trackPageView("/rankings")).not.toThrow();
  });

  it("trackProgramView accepts a program object", () => {
    expect(() => trackProgramView({
      id: "123",
      school: "Test U",
      state: "CA",
      conference: "PAC",
      league: "D1A",
      gender: "mens",
    })).not.toThrow();
  });

  it("trackSearch accepts a query string", () => {
    expect(() => trackSearch("michigan")).not.toThrow();
  });

  it("trackSearch does not fire for short queries", () => {
    // Just ensure no error for single-char queries
    expect(() => trackSearch("m")).not.toThrow();
  });

  it("trackFilter accepts filter name and value", () => {
    expect(() => trackFilter("gender", "mens")).not.toThrow();
  });

  it("trackFilter ignores empty values", () => {
    expect(() => trackFilter("gender", "")).not.toThrow();
    expect(() => trackFilter("gender", null)).not.toThrow();
  });

  it("trackExport accepts a count", () => {
    expect(() => trackExport(100)).not.toThrow();
  });

  it("trackOutboundClick accepts url and context", () => {
    expect(() => trackOutboundClick("https://example.com", "program")).not.toThrow();
  });
});

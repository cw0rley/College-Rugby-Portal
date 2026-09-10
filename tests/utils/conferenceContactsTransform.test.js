import { describe, it, expect } from "vitest";
import { transformConferenceContacts } from "../../sync/conference-contacts-transform.js";

describe("transformConferenceContacts", () => {
  it("emits nothing for an empty scrape", () => {
    expect(transformConferenceContacts([])).toEqual({ records: [], skipped: [] });
    expect(transformConferenceContacts(null).records).toEqual([]);
  });

  it("picks the conference mailbox over a member club's address", () => {
    const { records } = transformConferenceContacts([{
      conference: "RE",
      gender: "mens",
      emails: ["hickie@usna.edu", "RugbyEastConference@gmail.com", "zvm5239@psu.edu"],
      phones: ["703-868-4521"],
    }]);
    expect(records).toHaveLength(1);
    expect(records[0].email).toBe("RugbyEastConference@gmail.com");
    expect(records[0].phone).toBe("703-868-4521");
    expect(records[0].conference).toBe("RE");
  });

  it("skips a conference whose gender is unknown", () => {
    // conferenceContacts keys on conference+gender, so a row without a gender
    // would collide with an existing one rather than sit beside it.
    const { records, skipped } = transformConferenceContacts([{
      conference: "TRU",
      emails: ["president@texasrugbyunion.com"],
    }]);
    expect(records).toEqual([]);
    expect(skipped[0].reason).toMatch(/gender unknown/);
  });

  it("skips when only member-school addresses were found", () => {
    const { records, skipped } = transformConferenceContacts([{
      conference: "ARU",
      gender: "mens",
      emails: ["coach@school.edu", "player@college.edu"],
    }]);
    expect(records).toEqual([]);
    expect(skipped[0].reason).toMatch(/no address clearly belongs/);
  });

  it("skips a conference with no addresses at all", () => {
    const { skipped } = transformConferenceContacts([{ conference: "MARC", emails: [] }]);
    expect(skipped[0].reason).toMatch(/no email addresses/);
  });

  it("skips an entry with no conference abbreviation", () => {
    const { skipped } = transformConferenceContacts([{ emails: ["info@rugby.org"] }]);
    expect(skipped[0].reason).toMatch(/no conference abbreviation/);
  });

  it("accepts a single scalar email as well as an array", () => {
    const { records } = transformConferenceContacts([{
      conference: "FRU", gender: "womens", email: "info@floridarugby.org",
    }]);
    expect(records).toHaveLength(1);
    expect(records[0].email).toBe("info@floridarugby.org");
    expect(records[0].gender).toBe("womens");
  });

  it("reports every skip so a run can explain what it declined to write", () => {
    const { records, skipped } = transformConferenceContacts([
      { conference: "A", gender: "mens", emails: ["info@a-rugby.org"] },
      { conference: "B", emails: ["info@b.org"] },
      { conference: "C", gender: "mens", emails: [] },
    ]);
    expect(records).toHaveLength(1);
    expect(skipped).toHaveLength(2);
    expect(skipped.map(s => s.conference)).toEqual(["B", "C"]);
  });
});

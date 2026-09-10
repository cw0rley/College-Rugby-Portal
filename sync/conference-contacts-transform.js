/**
 * Conference contact transform.
 *
 * scrape-conferences.js returns one record per conference with every address it
 * found on the site:
 *
 *   { conference: "RE", type: "conference", emails: [...11], phones: [...] }
 *
 * The conferenceContacts collection stores one scalar record per conference and
 * gender:
 *
 *   { conference, gender, league, contactName, contactTitle, email, phone }
 *
 * Those shapes never lined up, which is why syncConferenceContacts sat imported
 * and uncalled in sync.js.  This module bridges them conservatively: it only
 * emits a record when it can pick an address with real confidence, because the
 * alternative is writing a coach's personal address into the commissioner slot.
 */

/** Addresses that look like the conference itself rather than a member club. */
function scoreEmail(email, conference) {
  const e = (email || "").toLowerCase();
  const abbr = (conference || "").toLowerCase();
  let score = 0;

  // A conference-branded mailbox: rugbyeastconference@, info@marc-rugby.org
  if (/(conference|commissioner|info|admin|contact|secretary|president)/.test(e)) score += 3;
  if (abbr && e.includes(abbr)) score += 2;
  if (/rugby/.test(e)) score += 1;

  // A .edu address is a club coach at a member school, not the conference.
  if (/\.edu$/.test(e)) score -= 3;
  // Free mail is weak evidence either way.
  if (/@(gmail|yahoo|hotmail|outlook|aol)\./.test(e)) score -= 1;

  return score;
}

/**
 * Turn scraped conference records into conferenceContacts rows.
 *
 * Returns { records, skipped } — `skipped` explains every conference that did
 * not produce a row, so a run can report what it chose not to write.
 */
export function transformConferenceContacts(scraped, options = {}) {
  const { minScore = 2 } = options;
  const records = [];
  const skipped = [];

  for (const entry of scraped || []) {
    const conference = (entry.conference || "").trim();
    if (!conference) {
      skipped.push({ conference: "(blank)", reason: "no conference abbreviation" });
      continue;
    }

    const emails = Array.isArray(entry.emails) ? entry.emails : (entry.email ? [entry.email] : []);
    if (emails.length === 0) {
      skipped.push({ conference, reason: "no email addresses found" });
      continue;
    }

    const ranked = emails
      .map(e => ({ email: e, score: scoreEmail(e, conference) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score < minScore) {
      skipped.push({
        conference,
        reason: `no address clearly belongs to the conference (best "${best?.email}" scored ${best?.score})`,
        candidates: emails.length,
      });
      continue;
    }

    // Gender is not on the scraped record and the collection keys on it, so an
    // entry that cannot state its gender would collide with existing rows.
    const gender = (entry.gender || "").trim();
    if (!gender) {
      skipped.push({
        conference,
        reason: `gender unknown — would collide with existing rows (candidate "${best.email}")`,
      });
      continue;
    }

    records.push({
      conference,
      gender,
      league: entry.league || "",
      contactName: entry.contactName || "",
      contactTitle: entry.contactTitle || "",
      email: best.email,
      phone: Array.isArray(entry.phones) ? (entry.phones[0] || "") : (entry.phone || ""),
    });
  }

  return { records, skipped };
}

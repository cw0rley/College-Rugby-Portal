/**
 * Email extraction from scraped page text.
 *
 * The naive pattern /[\w.+-]+@[\w-]+\.[\w.]+/ that used to be inlined in every
 * conference scraper had two failure modes, both seen in live output:
 *
 *   "…@gmail.combottom"  — HTML with no whitespace between the address and the
 *                          next word, so the trailing [\w.]+ ate the next word
 *   "rspack@1.6.6"       — a bundler version string in an inline script, which
 *                          matches because digits are word characters
 *
 * Anchoring the match to a known TLD fixes both: the address stops at the TLD
 * even when text runs on, and a numeric "domain" has no TLD to match.
 */

const TLDS = [
  "com", "org", "net", "edu", "gov", "mil", "int", "us", "co", "io", "info",
  "biz", "me", "tv", "cc", "ca", "uk", "au", "nz", "ie", "za",
  "rugby", "club", "team", "sport", "sports", "academy", "college",
  "university", "school", "app", "dev", "online", "site", "email",
];

// Longest TLDs first so ".sports" wins over ".sport" on the same address.
const TLD_ALT = [...TLDS].sort((a, b) => b.length - a.length).join("|");
const EMAIL_RE = new RegExp(
  String.raw`[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+(?:${TLD_ALT})`,
  "gi"
);

/**
 * Pull every plausible address out of a blob of page text.
 * Returns lowercase-deduplicated addresses in first-seen order.
 */
export function extractEmails(text) {
  if (!text) return [];
  const out = [];
  const seen = new Set();

  for (const raw of String(text).match(EMAIL_RE) || []) {
    const email = raw.trim().replace(/^[.\-_]+/, "");
    const key = email.toLowerCase();

    // A local part that is only digits is almost always a version or an id.
    if (/^\d+$/.test(email.split("@")[0])) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(email);
  }
  return out;
}

/**
 * Changelog writes for automated changes.
 *
 * The `changelog` collection had 9,387 entries covering every edit made by a
 * human through the admin or coach UI, and nothing at all from the scripts —
 * so the weekly sync, the rankings run and the status import were the only
 * changes nobody could see after the fact. That is backwards: those are the
 * ones that happen unattended.
 *
 * Entries match the shape utils/changelog.js writes from the browser, so both
 * kinds land in one timeline and the admin changelog view needs no changes.
 * `userEmail` carries the script name rather than a person.
 */

import { db } from "./firebase.js";

const COLLECTION = "changelog";
const BATCH_LIMIT = 400;

/**
 * Write entries, batched. Each is { action, collection, docId, data }.
 * `source` names the script, e.g. "sync/sync.js".
 *
 * Never throws: failing to record history must not fail the run that did the
 * actual work, and a half-written log is better than a dead sync.
 */
export async function logChanges(entries, source, options = {}) {
  const { dryRun = false } = options;
  if (dryRun || !entries || entries.length === 0) return 0;

  let written = 0;
  try {
    let batch = db.batch();
    let n = 0;

    for (const e of entries) {
      batch.set(db.collection(COLLECTION).doc(), {
        action: e.action,
        collection: e.collection,
        docId: e.docId || null,
        data: e.data || {},
        userEmail: source,
        timestamp: new Date(),
      });
      n++;
      written++;

      if (n >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        n = 0;
      }
    }
    if (n > 0) await batch.commit();
  } catch (err) {
    console.warn(`  ⚠ changelog write failed (${written}/${entries.length} recorded): ${err.message}`);
  }

  return written;
}

/**
 * SEED LEAGUES + UPDATE CONFERENCES
 * Adds a `leagues` collection and patches each conference doc with its league.
 *
 * Run: node scripts/seed-leagues.js
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs,
  writeBatch, doc, updateDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "college-rugby-portal.firebaseapp.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Leagues ─────────────────────────────────────────────────────────────────
const LEAGUES = [
  "CRAA D1",
  "CRAA D1A",
  "CRAA D1AA",
  "CRAA D3",
  "NCR D1",
  "NCR D2",
  "NCR SC",
  "NIRA D1",
  "NIRA D2",
  "NIRA D3",
];

// ─── Conference → League mapping (derived from programs data) ─────────────────
const CONF_LEAGUE_MAP = {
  "Lonestar Mens": "CRAA D1AA",
  "Great Lakes Mens": "NCR D2",
  "Mid-Atlantic Mens": "NCR D2",
  "Upstate Small Mens": "NCR SC",
  "Three Rivers Mens": "NCR D1",
  "New England NIRA Womens": "NIRA D3",
  "Liberty Rugby Mens": "NCR D1",
  "NERFU Colleges Men": "NCR D1",
  "New England Mens": "NCR D2",
  "Southern Rugby Conference Mens": "NCR SC",
  "Big Rivers Mens": "NCR D1",
  "New England Womens": "CRAA D1",
  "Gold Coast Mens": "NCR D1",
  "Mid-South Mens": "CRAA D1A",
  "Florida Mens": "CRAA D1AA",
  "Allegheny Mens": "NCR D1",
  "Midwest Mens": "NCR SC",
  "Tri State Mens": "NCR D2",
  "Red River Mens": "CRAA D1A",
  "Ohio Valley Womens": "NCR SC",
  "Minnesota/Northern Lights Mens": "NCR D2",
  "Mid-America Mens": "NCR D1",
  "New England Wide Mens": "NCR SC",
  "Northwest Mens": "NCR SC",
  "MAC Mens": "CRAA D1AA",
  "Colonial Coast Men": "NCR SC",
  "Rocky Mountain Mens": "NCR D2",
  "Ivy League Mens": "NCR D1",
  "California Mens": "CRAA D1A",
  "Northern California Mens": "NCR D1",
  "Great Lakes Women": "NCR D1",
  "Great Plains Men": "NCR SC",
  "Independent Mens": "CRAA D1A",
  "PAC West Mens": "CRAA D1AA",
  "Cardinals Mens": "NCR SC",
  "Allegheny Womens": "NCR D1",
  "SCRC Mens": "CRAA D1AA",
  "Northern Lights Womens": "NCR D1",
  "Georgia Mens": "NCR D1",
  "South Atlantic Womens": "NCR SC",
  "Great Midwest Mens": "NCR D2",
  "Big 10 Mens": "CRAA D1A",
  "NCR Independent Mens": "NCR D1",
  "Heart of America Mens": "CRAA D1AA",
  "Gateway Mens": "NCR D2",
  "Eastern Penn Womens": "NCR SC",
  "Rugby East Mens": "CRAA D1A",
  "South Central Mens": "NCR D1",
  "Deep South Mens": "NCR D1",
  "Southern Collegiate Rugby Conference Mens": "CRAA D1AA",
  "Gold Coast Womens": "NCR D2",
  "Chesapeake Mens": "NCR D1",
  "Upstate New York Womens": "NCR SC",
  "Great Waters Womens": "NCR SC",
  "Deep South Womens": "NCR SC",
  "Chesapeake Womens": "NCR D1",
  "PAC Mens": "CRAA D1A",
  "Northwest Collegiate Rugby Conference Mens": "NCR D2",
  "Cascade Collegiate Womens": "NCR SC",
  "Texas Womens (11, fall)": "CRAA D1",
  "Mid-America Women": "NCR D1",
  "Rocky Mountain Womens (10, fall)": "CRAA D1",
  "NCRC Mens": "CRAA D1AA",
  "Atlantic Rugby Conference Mens": "NCR D1",
  "Midwest NIRA Womens": "NIRA D3",
  "Big Rivers Womens": "NCR D1",
  "Pacific Desert Womens (8, spring)": "CRAA D1",
  "Prairie States Womens": "NCR SC",
  "Heart of America Womens": "NCR D2",
  "Northeast Womens (6, fall)": "CRAA D1",
  "Rugby Northeast Womens": "NCR D1",
  "Independent Womens (2, fall)": "CRAA D1",
  "Pacific Mountain Womens (10, spring)": "CRAA D1",
  "Big 10 Womens (8, fall)": "CRAA D1",
  "Blue Ridge Womens (8, spring)": "CRAA D1",
  "Colonial Coast Womens": "NCR SC",
  "Florida Womens (4, spring)": "CRAA D1",
  "Mid-Atlantic Womens": "NCR D2",
  "South NIRA Womens": "NIRA D3",
  "Illinois Womens": "NCR SC",
  "Midwest Womens": "NCR D1",
  "Great Lakes Womens": "NCR D2",
  "Northeast NIRA Womens": "NIRA D2",
  "Mid-Atlantic NIRA Womens": "NIRA D2",
  "California Womens": "NCR D2",
  "Southern Rugby Conference Womens": "NCR D2",
};

async function main() {
  console.log("🏉 Seeding leagues and updating conferences...\n");

  // 1. Seed leagues collection
  console.log(`Uploading ${LEAGUES.length} leagues...`);
  const batch = writeBatch(db);
  LEAGUES.forEach(name => {
    batch.set(doc(collection(db, "leagues")), { name });
  });
  await batch.commit();
  console.log("✅ Leagues done.\n");

  // 2. Patch conference docs with league field
  console.log("Fetching conferences to update...");
  const snap = await getDocs(collection(db, "conferences"));
  let updated = 0, skipped = 0;

  const patchBatch = writeBatch(db);
  snap.docs.forEach(d => {
    const conf = d.data().conference;
    const league = CONF_LEAGUE_MAP[conf];
    if (league) {
      patchBatch.update(d.ref, { league });
      updated++;
    } else {
      skipped++;
    }
  });
  await patchBatch.commit();

  console.log(`✅ Updated ${updated} conferences with league.`);
  if (skipped > 0) console.log(`⚠️  ${skipped} conferences had no league mapping — update them manually in admin.`);

  console.log("\n✅ All done!");
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Error:", e);
  process.exit(1);
});

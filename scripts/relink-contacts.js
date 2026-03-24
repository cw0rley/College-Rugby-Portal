/**
 * RE-LINK SCRIPT: Fix programContacts that reference old/deleted program IDs.
 *
 * Strategy:
 *   1. Read all current programs from Firestore (with their new IDs)
 *   2. Read merged-programs.json to get school+gender+contact mapping
 *   3. Delete all existing programContacts
 *   4. Re-create them using the correct current program IDs
 *
 * Run:  node scripts/relink-contacts.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "college-rugby-portal.firebaseapp.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
  measurementId: "G-K1K3SYDN5W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  // 1. Read current programs from Firestore
  console.log("Reading current programs from Firestore...");
  const progSnap = await getDocs(collection(db, "programs"));
  const programs = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${programs.length} programs`);

  // Build lookup: "school|gender" -> firestoreId
  const programIdMap = {};
  programs.forEach(p => {
    const key = `${p.school}|${p.gender}`;
    programIdMap[key] = p.id;
  });

  // 2. Read merged-programs.json for contact data
  console.log("Reading merged-programs.json...");
  const merged = JSON.parse(readFileSync("sync/merged-programs.json", "utf-8"));
  const withContacts = merged.filter(p => p.contact || p.email);
  console.log(`Found ${withContacts.length} programs with contact data`);

  // 3. Build new contact records with correct IDs
  const newContacts = [];
  let unmatched = 0;
  for (const p of withContacts) {
    const key = `${p.school}|${p.gender}`;
    const programId = programIdMap[key];
    if (!programId) {
      unmatched++;
      console.log(`  WARN: No match for "${p.school}" (${p.gender})`);
      continue;
    }
    newContacts.push({
      programId,
      contact: p.contact || "",
      contactTitle: p.contactTitle || "",
      email: p.email || "",
    });
  }
  console.log(`\nMatched ${newContacts.length} contacts, ${unmatched} unmatched`);

  // 4. Delete all existing programContacts
  console.log("\nDeleting existing programContacts...");
  const existingSnap = await getDocs(collection(db, "programContacts"));
  const BATCH_SIZE = 400;
  const existingDocs = existingSnap.docs;
  for (let i = 0; i < existingDocs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    existingDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`  Deleted ${Math.min(i + BATCH_SIZE, existingDocs.length)}/${existingDocs.length}`);
  }

  // 5. Create new programContacts with correct IDs
  console.log(`\nCreating ${newContacts.length} new programContacts...`);
  for (let i = 0; i < newContacts.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    newContacts.slice(i, i + BATCH_SIZE).forEach(item => {
      const ref = doc(collection(db, "programContacts"));
      batch.set(ref, item);
    });
    await batch.commit();
    console.log(`  Created ${Math.min(i + BATCH_SIZE, newContacts.length)}/${newContacts.length}`);
  }

  console.log(`\nDone! Re-linked ${newContacts.length} contacts.`);
  process.exit(0);
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});

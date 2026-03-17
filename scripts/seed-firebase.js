/**
 * FIREBASE SEED SCRIPT
 * Run this once to upload your spreadsheet data into Firestore.
 *
 * SETUP:
 *   1. npm install firebase
 *   2. Paste your Firebase config below
 *   3. node scripts/seed-firebase.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";

// ─── PASTE YOUR FIREBASE CONFIG HERE ────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "college-rugby-portal.firebaseapp.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
  measurementId: "G-K1K3SYDN5W"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── YOUR DATA (copied from programs.json and conferences.json) ──────────────
import programs from "../programs.json" assert { type: "json" };
import conferences from "../conferences.json" assert { type: "json" };
// ─────────────────────────────────────────────────────────────────────────────

async function seedCollection(collectionName, data) {
  const BATCH_SIZE = 400; // Firestore max is 500 per batch
  let count = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = data.slice(i, i + BATCH_SIZE);

    chunk.forEach(item => {
      const ref = doc(collection(db, collectionName));
      // Remove any null/undefined values
      const cleaned = Object.fromEntries(
        Object.entries(item).filter(([_, v]) => v !== null && v !== undefined && v !== "" && v !== "nan")
      );
      batch.set(ref, cleaned);
    });

    await batch.commit();
    count += chunk.length;
    console.log(`${collectionName}: uploaded ${count}/${data.length}`);
  }
}

async function main() {
  console.log("🏉 Seeding Firebase...\n");

  console.log(`Uploading ${programs.length} programs...`);
  await seedCollection("programs", programs);

  console.log(`\nUploading ${conferences.length} conference contacts...`);
  await seedCollection("conferences", conferences);

  console.log("\n✅ Done! Firebase is seeded.");
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Error:", e);
  process.exit(1);
});

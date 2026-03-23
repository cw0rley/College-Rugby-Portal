/**
 * MIGRATION SCRIPT: Move contact fields from programs → programContacts collection
 *
 * Run:  node scripts/migrate-contacts.js
 *
 * What it does:
 *   1. Reads all programs that have contact/email data
 *   2. Creates programContacts docs with { programId, contact, contactTitle, email }
 *   3. Removes contact/contactTitle/email fields from program docs
 *
 * Idempotent: checks for existing programContacts before creating duplicates.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc, deleteField } from "firebase/firestore";

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
  console.log("Reading programs...");
  const progSnap = await getDocs(collection(db, "programs"));
  const programs = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${programs.length} programs`);

  // Read existing programContacts to avoid duplicates
  console.log("Reading existing programContacts...");
  const existingSnap = await getDocs(collection(db, "programContacts"));
  const existingKeys = new Set(
    existingSnap.docs.map(d => {
      const data = d.data();
      return `${data.programId}|${data.contact||""}|${data.email||""}`;
    })
  );
  console.log(`Found ${existingKeys.size} existing program contacts`);

  // Step 1: Create programContacts docs
  const toCreate = [];
  for (const p of programs) {
    if (p.contact || p.email) {
      const key = `${p.id}|${p.contact||""}|${p.email||""}`;
      if (!existingKeys.has(key)) {
        toCreate.push({
          programId: p.id,
          contact: p.contact || "",
          contactTitle: p.contactTitle || "",
          email: p.email || "",
        });
      }
    }
  }

  console.log(`\nCreating ${toCreate.length} new programContacts docs...`);
  const BATCH_SIZE = 400;
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = toCreate.slice(i, i + BATCH_SIZE);
    chunk.forEach(item => {
      const ref = doc(collection(db, "programContacts"));
      batch.set(ref, item);
    });
    await batch.commit();
    console.log(`  Created ${Math.min(i + BATCH_SIZE, toCreate.length)}/${toCreate.length}`);
  }

  // Step 2: Remove contact fields from program docs
  const progsWithContacts = programs.filter(p => p.contact !== undefined || p.contactTitle !== undefined || p.email !== undefined);
  console.log(`\nRemoving contact fields from ${progsWithContacts.length} program docs...`);
  for (let i = 0; i < progsWithContacts.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = progsWithContacts.slice(i, i + BATCH_SIZE);
    chunk.forEach(p => {
      const ref = doc(db, "programs", p.id);
      batch.update(ref, {
        contact: deleteField(),
        contactTitle: deleteField(),
        email: deleteField(),
      });
    });
    await batch.commit();
    console.log(`  Cleaned ${Math.min(i + BATCH_SIZE, progsWithContacts.length)}/${progsWithContacts.length}`);
  }

  console.log(`\nDone! Created ${toCreate.length} contacts, cleaned ${progsWithContacts.length} programs.`);
  process.exit(0);
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});

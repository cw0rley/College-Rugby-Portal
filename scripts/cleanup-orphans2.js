import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "firebase/firestore";
const app = initializeApp({ apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A", projectId: "college-rugby-portal" });
const db = getFirestore(app);

// Get all valid user UIDs
const usersSnap = await getDocs(collection(db, "users"));
const userIds = new Set(usersSnap.docs.map(d => d.id));
console.log(`Valid users: ${userIds.size}`);

// Get all valid program IDs
const progsSnap = await getDocs(collection(db, "programs"));
const programIds = new Set(progsSnap.docs.map(d => d.id));
console.log(`Valid programs: ${programIds.size}`);

// Check programInterest — orphaned players or orphaned programs
console.log(`\n--- programInterest ---`);
let cleanedInterest = 0;
for (const progId of programIds) {
  const playersSnap = await getDocs(collection(db, "programInterest", progId, "players"));
  for (const d of playersSnap.docs) {
    if (!userIds.has(d.id)) {
      console.log(`  ORPHAN interest: player ${d.id} in program ${progId} (${d.data().firstName || "?"} ${d.data().lastName || "?"})`);
      await deleteDoc(d.ref);
      console.log(`    -> deleted`);
      cleanedInterest++;
    }
  }
}
// Also check programInterest docs for programs that no longer exist
const interestSnap = await getDocs(collection(db, "programInterest"));
for (const d of interestSnap.docs) {
  if (!programIds.has(d.id)) {
    console.log(`  ORPHAN programInterest doc for deleted program: ${d.id}`);
    const subSnap = await getDocs(collection(db, "programInterest", d.id, "players"));
    for (const s of subSnap.docs) await deleteDoc(s.ref);
    await deleteDoc(d.ref);
    console.log(`    -> deleted (${subSnap.size} players)`);
    cleanedInterest += subSnap.size + 1;
  }
}

// Check recruits — coaches who saved players that no longer exist
console.log(`\n--- recruits ---`);
let cleanedRecruits = 0;
for (const uid of userIds) {
  const recruitsSnap = await getDocs(collection(db, "users", uid, "recruits"));
  for (const d of recruitsSnap.docs) {
    if (!userIds.has(d.id)) {
      const pd = d.data().playerData || {};
      console.log(`  ORPHAN recruit: coach ${uid} has recruit ${d.id} (${pd.firstName || "?"} ${pd.lastName || "?"})`);
      await deleteDoc(d.ref);
      console.log(`    -> deleted`);
      cleanedRecruits++;
    }
  }
}

// Check favorites — users who favorited programs that no longer exist
console.log(`\n--- favorites ---`);
let cleanedFavs = 0;
for (const uid of userIds) {
  const favsSnap = await getDocs(collection(db, "users", uid, "favorites"));
  for (const d of favsSnap.docs) {
    if (!programIds.has(d.id)) {
      console.log(`  ORPHAN favorite: user ${uid} favorited deleted program ${d.id}`);
      await deleteDoc(d.ref);
      console.log(`    -> deleted`);
      cleanedFavs++;
    }
  }
}

// Check programContacts — contacts for programs that no longer exist
console.log(`\n--- programContacts ---`);
let cleanedContacts = 0;
const contactsSnap = await getDocs(collection(db, "programContacts"));
for (const d of contactsSnap.docs) {
  if (d.data().programId && !programIds.has(d.data().programId)) {
    console.log(`  ORPHAN contact: ${d.data().contact} for deleted program ${d.data().programId}`);
    await deleteDoc(d.ref);
    console.log(`    -> deleted`);
    cleanedContacts++;
  }
}

console.log(`\nCleaned up: ${cleanedInterest} interest, ${cleanedRecruits} recruits, ${cleanedFavs} favorites, ${cleanedContacts} contacts`);
process.exit(0);

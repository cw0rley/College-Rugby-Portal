import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } from "firebase/firestore";
const app = initializeApp({ apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A", projectId: "college-rugby-portal" });
const db = getFirestore(app);

// Get all user UIDs
const usersSnap = await getDocs(collection(db, "users"));
const userIds = new Set(usersSnap.docs.map(d => d.id));
console.log(`Users: ${userIds.size}`);

// Check playerProfiles for orphans
const profilesSnap = await getDocs(collection(db, "playerProfiles"));
console.log(`Player profiles: ${profilesSnap.size}`);
let orphanedProfiles = 0;
for (const d of profilesSnap.docs) {
  if (!userIds.has(d.id)) {
    const data = d.data();
    console.log(`  ORPHAN profile: ${data.firstName} ${data.lastName} (${d.id})`);
    await deleteDoc(doc(db, "playerProfiles", d.id));
    console.log(`    -> deleted`);
    orphanedProfiles++;
  }
}

// Check notifications for orphans
const notifsSnap = await getDocs(collection(db, "notifications"));
console.log(`\nNotifications: ${notifsSnap.size}`);
let orphanedNotifs = 0;
for (const d of notifsSnap.docs) {
  if (!userIds.has(d.data().recipientUid)) {
    console.log(`  ORPHAN notification: ${d.id} for ${d.data().recipientUid}`);
    await deleteDoc(d.ref);
    orphanedNotifs++;
  }
}

// Check conversations for orphans (participants that no longer exist)
const convsSnap = await getDocs(collection(db, "conversations"));
console.log(`\nConversations: ${convsSnap.size}`);
let orphanedConvs = 0;
for (const d of convsSnap.docs) {
  const participants = d.data().participants || [];
  const allExist = participants.every(uid => userIds.has(uid));
  if (!allExist) {
    console.log(`  ORPHAN conversation: ${d.id} — participants: ${participants.join(", ")}`);
    // Delete messages subcollection
    const msgsSnap = await getDocs(collection(db, "conversations", d.id, "messages"));
    for (const m of msgsSnap.docs) await deleteDoc(m.ref);
    await deleteDoc(d.ref);
    console.log(`    -> deleted (${msgsSnap.size} messages)`);
    orphanedConvs++;
  }
}

console.log(`\nCleaned up: ${orphanedProfiles} profiles, ${orphanedNotifs} notifications, ${orphanedConvs} conversations`);
process.exit(0);

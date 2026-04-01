import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

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

async function main() {
  // Find both Test College programs
  const progSnap = await getDocs(query(collection(db, "programs"), where("school", "==", "Test College")));
  console.log("Test College programs found:", progSnap.size);

  if (progSnap.size < 2) {
    console.log("Expected 2 Test College programs (duplicate). Checking IDs...");
    progSnap.docs.forEach(d => console.log("  ", d.id));
  }

  // The one with interested players is the correct one
  const correctId = "meyR6VdCBuGMAsSpnU79";
  const wrongId = "xMOOYniciNThsespY0RG";

  // Delete the duplicate program
  console.log(`\nDeleting duplicate program ${wrongId}...`);
  await deleteDoc(doc(db, "programs", wrongId));

  // Update coach user's assignedProgramIds
  const coachUid = "d1LHvupi92c4J2oYasLsZ8AG9bw2";
  console.log(`Updating coach ${coachUid} assignedProgramIds to ${correctId}...`);
  await setDoc(doc(db, "users", coachUid), { assignedProgramIds: [correctId] }, { merge: true });

  // Update programContact to point to correct program
  const contactsSnap = await getDocs(query(
    collection(db, "programContacts"),
    where("email", "==", "prcunningham+coach1@gmail.com")
  ));
  for (const contactDoc of contactsSnap.docs) {
    console.log(`Updating programContact ${contactDoc.id} programId to ${correctId}...`);
    await updateDoc(doc(db, "programContacts", contactDoc.id), { programId: correctId });
  }

  console.log("\nDone! Coach now linked to correct Test College program.");
  process.exit(0);
}

main();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
  // Find Test College
  const progSnap = await getDocs(query(collection(db, "programs"), where("school", "==", "Test College")));
  if (progSnap.empty) {
    console.log("Test College not found in programs!");
    process.exit(1);
  }

  const programId = progSnap.docs[0].id;
  console.log("Test College program ID:", programId);

  // Check programInterest subcollection
  const interestSnap = await getDocs(collection(db, "programInterest", programId, "players"));
  console.log(`\nInterested players: ${interestSnap.size}`);
  interestSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`  - ${data.firstName} ${data.lastName} (${d.id})`);
  });

  // Also check if any favorites docs reference this program
  // Check a couple of test player UIDs
  const usersSnap = await getDocs(collection(db, "users"));
  for (const userDoc of usersSnap.docs) {
    const email = userDoc.data().email;
    if (email && email.includes("prcunningham+player")) {
      const favSnap = await getDocs(collection(db, "users", userDoc.id, "favorites"));
      const favIds = favSnap.docs.map(d => d.id);
      console.log(`\n${email} favorites: ${favIds.length > 0 ? favIds.join(", ") : "none"}`);
      if (favIds.includes(programId)) {
        console.log("  ^ includes Test College!");
      }
    }
  }

  process.exit(0);
}

main();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

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
  // Find coach user
  const usersSnap = await getDocs(collection(db, "users"));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    if (data.email === "prcunningham+coach1@gmail.com") {
      console.log("Coach user doc:", userDoc.id);
      console.log("  isCoach:", data.isCoach);
      console.log("  approved:", data.approved);
      console.log("  assignedProgramIds:", data.assignedProgramIds);
    }
  }

  // Find programContacts for coach email
  const contactsSnap = await getDocs(query(
    collection(db, "programContacts"),
    where("email", "==", "prcunningham+coach1@gmail.com")
  ));
  console.log("\nProgram contacts matching coach email:", contactsSnap.size);
  contactsSnap.docs.forEach(d => {
    console.log("  ", d.id, d.data());
  });

  // Check if Test College is in programs cache
  const progSnap = await getDocs(query(collection(db, "programs"), where("school", "==", "Test College")));
  console.log("\nTest College in programs:", progSnap.size > 0 ? progSnap.docs[0].id : "NOT FOUND");

  process.exit(0);
}

main();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "collegerugbyportal.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snap = await getDocs(collection(db, "users"));
  const admins = snap.docs.filter(d => d.data().isAdmin);
  console.log(`Total users: ${snap.size}`);
  console.log(`Admin users: ${admins.length}`);
  admins.forEach(d => {
    const data = d.data();
    console.log(`  ${data.email} — isAdmin: ${data.isAdmin}, isCoach: ${data.isCoach}`);
  });

  // Also check pat's accounts
  const patAccounts = snap.docs.filter(d => {
    const email = d.data().email || "";
    return email.includes("prcunningham") || email.includes("pat@") || email.includes("claytonrugby");
  });
  console.log(`\nPat's accounts:`);
  patAccounts.forEach(d => {
    const data = d.data();
    console.log(`  ${data.email} — isAdmin: ${data.isAdmin || false}, isCoach: ${data.isCoach || false}, uid: ${d.id}`);
  });

  process.exit(0);
}

main();

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
const app = initializeApp({ apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A", authDomain: "collegerugbyportal.com", projectId: "college-rugby-portal" });
const db = getFirestore(app);

const snap = await getDocs(query(collection(db, "playerProfiles"), where("firstName", "==", "Devon")));
console.log("Devon playerProfiles:", snap.size);
snap.docs.forEach(d => console.log("  uid:", d.id, d.data().firstName, d.data().lastName, "public:", d.data().profilePublic));
process.exit(0);

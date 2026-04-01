import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, deleteDoc } from "firebase/firestore";
const app = initializeApp({ apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A", projectId: "college-rugby-portal" });
const db = getFirestore(app);

const uid = "fChBPsfhvcXQcVM10peAHUxSp803";
const userSnap = await getDoc(doc(db, "users", uid));
console.log("User doc exists:", userSnap.exists());

// Delete the orphaned profile
console.log("Deleting playerProfile for Devon Carter...");
await deleteDoc(doc(db, "playerProfiles", uid));
console.log("Done.");
process.exit(0);

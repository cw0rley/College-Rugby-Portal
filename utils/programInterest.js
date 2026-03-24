import { collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

export async function writeInterest(programId, uid, playerData) {
  await setDoc(doc(db, "programInterest", programId, "players", uid), {
    ...playerData,
    addedAt: serverTimestamp(),
  });
}

export async function removeInterest(programId, uid) {
  await deleteDoc(doc(db, "programInterest", programId, "players", uid));
}

export async function loadInterestedPlayers(programId) {
  const snap = await getDocs(collection(db, "programInterest", programId, "players"));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

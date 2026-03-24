import { collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { writeInterest, removeInterest } from "./programInterest.js";

export async function loadFavorites(uid) {
  const snap = await getDocs(collection(db, "users", uid, "favorites"));
  return new Set(snap.docs.map(d => d.id));
}

export async function addFavorite(uid, programId, playerData) {
  await setDoc(doc(db, "users", uid, "favorites", programId), { addedAt: serverTimestamp() });
  if (playerData && playerData.profilePublic === true) {
    await writeInterest(programId, uid, playerData);
  }
}

export async function removeFavorite(uid, programId) {
  await deleteDoc(doc(db, "users", uid, "favorites", programId));
  await removeInterest(programId, uid);
}

import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

export async function loadRecruits(uid) {
  const snap = await getDocs(collection(db, "users", uid, "recruits"));
  return snap.docs.map(d => ({ playerUid: d.id, ...d.data() }));
}

export async function saveRecruit(uid, playerUid, playerData, rating = 0) {
  await setDoc(doc(db, "users", uid, "recruits", playerUid), {
    rating,
    notes: "",
    savedAt: serverTimestamp(),
    playerData: {
      firstName: playerData.firstName || "",
      lastName: playerData.lastName || "",
      position: playerData.position || "",
      secondaryPosition: playerData.secondaryPosition || "",
      graduationYear: playerData.graduationYear || null,
      city: playerData.city || "",
      gpa: playerData.gpa || "",
      currentClub: playerData.currentClub || "",
    },
  });
}

export async function updateRecruitRating(uid, playerUid, rating) {
  await updateDoc(doc(db, "users", uid, "recruits", playerUid), { rating });
}

export async function updateRecruitNotes(uid, playerUid, notes) {
  await updateDoc(doc(db, "users", uid, "recruits", playerUid), { notes });
}

export async function removeRecruit(uid, playerUid) {
  await deleteDoc(doc(db, "users", uid, "recruits", playerUid));
}

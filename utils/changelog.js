import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Log a data change to the "changelog" Firestore collection.
 * @param {"add"|"update"|"delete"} action
 * @param {string} collectionName - the affected collection
 * @param {string|null} docId - the document ID (null for new docs before ID is known)
 * @param {object} data - the data written, or snapshot of deleted data
 * @param {string} userEmail - who made the change
 */
export async function logChange(action, collectionName, docId, data, userEmail) {
  try {
    await addDoc(collection(db, "changelog"), {
      action,
      collection: collectionName,
      docId: docId || null,
      data: data || {},
      userEmail: userEmail || "unknown",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to write changelog entry:", err);
  }
}

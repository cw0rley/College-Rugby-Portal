import { collection, query, where, getDocs, addDoc, doc,
  orderBy, onSnapshot, serverTimestamp, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase.js";

export async function getOrCreateConversation(myUid, myName, myRole, theirUid, theirName, theirRole, programId) {
  // Check for existing conversation between these two users
  const q = query(collection(db, "conversations"), where("participants", "array-contains", myUid));
  const snap = await getDocs(q);
  const existing = snap.docs.find(d => d.data().participants.includes(theirUid));
  if (existing) return existing.id;

  // Create new conversation
  const ref = await addDoc(collection(db, "conversations"), {
    participants: [myUid, theirUid],
    participantInfo: {
      [myUid]: { name: myName, role: myRole },
      [theirUid]: { name: theirName, role: theirRole },
    },
    programId: programId || null,
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    lastMessageBy: null,
    unreadCounts: { [myUid]: 0, [theirUid]: 0 },
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(conversationId, senderId, recipientId, text) {
  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });
  // Update conversation summary
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage: text.substring(0, 100),
    lastMessageAt: serverTimestamp(),
    lastMessageBy: senderId,
    [`unreadCounts.${recipientId}`]: increment(1),
  });
}

export async function markAsRead(conversationId, uid) {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`unreadCounts.${uid}`]: 0,
  });
}

export function subscribeToConversations(uid, callback) {
  const q = query(collection(db, "conversations"), where("participants", "array-contains", uid), orderBy("lastMessageAt", "desc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeToMessages(conversationId, callback) {
  const q = query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

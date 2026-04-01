import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, writeBatch, getDocs, limit, arrayUnion } from "firebase/firestore";
import { db } from "../firebase.js";

/**
 * Subscribe to notifications for a user (real-time).
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(uid, callback) {
  const q = query(
    collection(db, "notifications"),
    where("recipientUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, err => {
    console.error("Notifications subscription error:", err);
    callback([]);
  });
}

/**
 * Create a notification.
 * type: "message" | "submission" | "recruit_interest"
 */
export async function createNotification({ recipientUid, type, title, body, link }) {
  await addDoc(collection(db, "notifications"), {
    recipientUid,
    type,
    title,
    body: body || "",
    link: link || null,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(uid) {
  const q = query(
    collection(db, "notifications"),
    where("recipientUid", "==", uid),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

/**
 * Request browser notification permission.
 * Returns true if granted.
 */
export function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);
  return Notification.requestPermission().then(p => p === "granted");
}

/**
 * Request push notification permission and save FCM token to user doc.
 * Returns true if token was saved successfully.
 */
export async function setupPushNotifications(uid) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const { getMessaging, getToken } = await import("firebase/messaging");
    const { getApp } = await import("firebase/app");
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey: null, // Uses default FCM key from Firebase config
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    });
    if (!token) return false;

    // Save token to user doc (dedup with arrayUnion)
    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
    return true;
  } catch (err) {
    console.warn("Push notification setup failed:", err);
    return false;
  }
}

/**
 * Show a browser notification (only if permission granted and tab not focused).
 */
export function showBrowserNotification(title, body, onClick) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.hasFocus()) return;

  const n = new Notification(title, {
    body,
    icon: "/logo-icon.svg",
    tag: "crp-notification",
  });
  if (onClick) {
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  }
  setTimeout(() => n.close(), 8000);
}

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, EmailAuthProvider, OAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "collegerugbyportal.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
  measurementId: "G-D2E10NVHXK"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Analytics can fail in Safari/private browsing — wrap safely
let _analytics = null;
try {
  _analytics = getAnalytics(app);
} catch (_) {}
export const analytics = _analytics;

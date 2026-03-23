/**
 * Firebase Admin SDK setup for server-side Firestore access.
 * Uses the service account key for authentication.
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, "service-account.json"), "utf-8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

export { db };

/**
 * Firebase Admin SDK setup for server-side Firestore access.
 *
 * Credential resolution:
 *   1. If GOOGLE_APPLICATION_CREDENTIALS env var is set, use application
 *      default credentials (for CI / GitHub Actions).
 *   2. Otherwise, load the local service-account.json file (for local dev).
 */
import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

let credential;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // CI environment — use the file pointed to by the env var
  credential = applicationDefault();
} else {
  // Local dev — use the checked-in service account key
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const serviceAccount = JSON.parse(
    readFileSync(resolve(__dirname, "service-account.json"), "utf-8")
  );
  credential = cert(serviceAccount);
}

const app = initializeApp({ credential });
const db = getFirestore(app);

export { db };

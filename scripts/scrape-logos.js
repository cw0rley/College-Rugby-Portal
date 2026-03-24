/**
 * LOGO SCRAPER: Best-effort enrichment of program logoUrl fields.
 *
 * Run:  node scripts/scrape-logos.js
 *
 * For each program with a website but no logoUrl:
 *   1. Fetches the school's homepage
 *   2. Looks for og:image or high-res favicon link
 *   3. Validates it's an image (HEAD request, check content-type)
 *   4. Writes the URL to the logoUrl field
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "college-rugby-portal.firebaseapp.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
  measurementId: "G-K1K3SYDN5W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function validateImageUrl(url) {
  try {
    const res = await fetchWithTimeout(url, { method: "HEAD" }, 6000);
    const ct = res.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

async function findLogoUrl(website) {
  let html;
  try {
    const res = await fetchWithTimeout(website, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CollegeRugbyPortal/1.0)" },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // 1. Try og:image
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) {
    const url = resolveUrl(website, ogMatch[1]);
    if (url && await validateImageUrl(url)) return url;
  }

  // 2. Try apple-touch-icon (usually high-res)
  const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
  if (appleMatch) {
    const url = resolveUrl(website, appleMatch[1]);
    if (url && await validateImageUrl(url)) return url;
  }

  // 3. Try large favicon (sizes="192x192" or similar)
  const iconMatches = [...html.matchAll(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["'][^>]*>/gi)];
  for (const m of iconMatches) {
    const sizeAttr = m[0].match(/sizes=["'](\d+)x\d+["']/);
    if (sizeAttr && parseInt(sizeAttr[1]) >= 128) {
      const url = resolveUrl(website, m[1]);
      if (url && await validateImageUrl(url)) return url;
    }
  }

  // 4. Try shortcut icon
  const shortcutMatch = html.match(/<link[^>]+rel=["']shortcut icon["'][^>]+href=["']([^"']+)["']/i);
  if (shortcutMatch) {
    const url = resolveUrl(website, shortcutMatch[1]);
    if (url && await validateImageUrl(url)) return url;
  }

  return null;
}

async function main() {
  console.log("Reading programs...");
  const snap = await getDocs(collection(db, "programs"));
  const programs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Found ${programs.length} programs`);

  const alreadyHad = programs.filter(p => p.logoUrl).length;
  const toProcess = programs.filter(p => p.website && !p.logoUrl);
  console.log(`${alreadyHad} already have logos, ${toProcess.length} to process\n`);

  let found = 0, failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const label = `[${i + 1}/${toProcess.length}] ${p.school}`;
    try {
      const logoUrl = await findLogoUrl(p.website);
      if (logoUrl) {
        await updateDoc(doc(db, "programs", p.id), { logoUrl });
        console.log(`  ✓ ${label} → ${logoUrl}`);
        found++;
      } else {
        console.log(`  ✗ ${label} — no logo found`);
        failed++;
      }
    } catch (err) {
      console.log(`  ✗ ${label} — error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${found} logos found, ${failed} failed, ${alreadyHad} already had logos.`);
  process.exit(0);
}

main().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});

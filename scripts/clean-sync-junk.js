import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, updateDoc, doc, deleteField } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

// Known short name → full name mappings for duplicates
const DUPE_MAP = {
  "Navy": "United States Naval Academy",
  "Army": "United States Military Academy",
  "Illinois": "University of Illinois Urbana-Champaign",
  "Purdue": "Purdue University",
  "Michigan State": "Michigan State University",
  "Indiana": "Indiana University Bloomington",
  "Ohio State": "Ohio State University",
};

// Conference full name → abbreviation
const CONF_FIX = {
  "Great Waters Women's Collegiate Rugby Conference": "GWCRC",
  "Great Waters Womens Collegiate Rugby Conference": "GWCRC",
  "Eastern Penn Rugby Union": "EPRU",
  "Cascade Women's Collegiate Rugby Conference": "CWCRC",
  "Cascade Womens Collegiate Rugby Conference": "CWCRC",
};

// Non-program entries to delete
const JUNK_KEYWORDS = [
  "barbarian", "all-star", "shield challenge", "select side",
  "earns eagle", "rwc spot", "alum",
];

async function main() {
  const snap = await getDocs(collection(db, "programs"));
  const progs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let deleted = 0, fixed = 0, confFixed = 0;

  // 1. Delete non-program entries (all-star games, news headlines, etc.)
  for (const d of snap.docs) {
    const school = (d.data().school || "").toLowerCase();
    if (JUNK_KEYWORDS.some(kw => school.includes(kw))) {
      await deleteDoc(doc(db, "programs", d.id));
      console.log("Deleted junk:", d.data().school);
      deleted++;
    }
  }

  // 2. Delete duplicates where short name matches a full name
  for (const d of snap.docs) {
    const school = d.data().school;
    const gender = d.data().gender;
    if (DUPE_MAP[school]) {
      const fullNameExists = progs.find(p => p.school === DUPE_MAP[school] && p.gender === gender);
      if (fullNameExists) {
        await deleteDoc(doc(db, "programs", d.id));
        console.log(`Deleted dupe: "${school}" (${gender}) → already have "${DUPE_MAP[school]}"`);
        deleted++;
      }
    }
  }

  // 3. Delete programs with no state AND no meaningful data (sync added with no enrichment)
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.state && !data.gpa && !data.sat && !data.enrollment && !data.inStateTuition) {
      // Check if a proper version exists
      const properVersion = progs.find(p =>
        p.school !== data.school &&
        p.gender === data.gender &&
        p.state &&
        (data.school?.includes(p.school) || p.school?.includes(data.school))
      );
      if (properVersion) {
        await deleteDoc(doc(db, "programs", d.id));
        console.log(`Deleted empty dupe: "${data.school}" (${data.gender}) → proper version: "${properVersion.school}"`);
        deleted++;
        continue;
      }
    }
  }

  // 4. Fix long conference names
  for (const d of snap.docs) {
    const conf = d.data().conference;
    if (conf && CONF_FIX[conf]) {
      await updateDoc(doc(db, "programs", d.id), { conference: CONF_FIX[conf] });
      confFixed++;
    }
    // Also fix any conference with "Collegiate Rugby Conference" etc. that's >10 chars
    if (conf && conf.length > 10 && !conf.match(/^[A-Z]{2,10}$/)) {
      console.log("Long conf still present:", conf, "on", d.data().school);
    }
  }

  console.log(`\nDone! Deleted: ${deleted}, Conference fixes: ${confFixed}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

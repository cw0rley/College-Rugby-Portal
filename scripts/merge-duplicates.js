import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

async function merge(keepId, deleteId, label) {
  const keepSnap = await getDoc(doc(db, "programs", keepId));
  const delSnap = await getDoc(doc(db, "programs", deleteId));
  if (!keepSnap.exists()) { console.log("  SKIP (keep not found):", label); return; }
  if (!delSnap.exists()) { console.log("  SKIP (delete not found):", label); return; }
  const keepData = keepSnap.data(), delData = delSnap.data();

  // Merge missing fields
  const updates = {};
  for (const [k, v] of Object.entries(delData)) {
    if (k === "school" || k === "id") continue;
    if (v && !keepData[k]) updates[k] = v;
  }
  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, "programs", keepId), updates);
    console.log("  Merged fields:", Object.keys(updates).join(", "));
  }

  // Move contacts
  const contactSnap = await getDocs(query(collection(db, "programContacts"), where("programId", "==", deleteId)));
  for (const d of contactSnap.docs) {
    await updateDoc(doc(db, "programContacts", d.id), { programId: keepId });
    console.log("  Moved contact:", d.data().contact);
  }

  await deleteDoc(doc(db, "programs", deleteId));
  console.log("  Deleted:", delData.school, "-", delData.gender);
}

async function rename(id, newName) {
  await updateDoc(doc(db, "programs", id), { school: newName });
  console.log("  Renamed to:", newName);
}

async function main() {
  const snap = await getDocs(collection(db, "programs"));
  const programs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  function find(school, gender) {
    return programs.find(p => p.school === school && p.gender === gender);
  }

  // Each merge: [keepName, deleteName, genders[]]
  const merges = [
    ["Saint Cloud State University", "St. Cloud State University", ["mens"]],
    ["Saint John's University", "St. Johns University", ["mens"]],
    ["Molloy University", "Molloy College", ["mens", "womens"]],
    ["College of Saint Benedict", "College of St. Benedict", ["womens"]],
    ["Saint Josephs University", "St. Joseph's University", ["mens"]],
    ["Bloomsburg University of Pennsylvania", "Bloomsburg University", ["mens", "womens"]],
    ["Millersville University of Pennsylvania", "Millersville University", ["mens", "womens"]],
    ["Emory and Henry College", "Emory & Henry University", ["mens", "womens"]],
    ["University of Health Sciences and Pharmacy in St. Louis", "University of Health Sciences & Pharmacy in St. Louis", ["mens"]],
    ["University of North Carolina at Greensboro", "University of North Carolina Greensboro", ["mens"]],
    ["Washington University in St. Louis", "Washington University - St. Louis", ["mens"]],
    ["Georgia College and State University", "Georgia College & State University", ["womens"]],
    ["LeTourneau University", "Letourneau University", ["womens"]],
    ["University of Maine at Farmington", "University of Maine - Farmington", ["mens", "womens"]],
    ["University of Pittsburgh at Johnstown", "University of Pittsburgh - Johnstown", ["mens", "womens"]],
    ["Minnesota State University, Mankato", "Minnesota State University-Mankato", ["womens"]],
  ];

  for (const [keepName, deleteName, genders] of merges) {
    console.log(`\n=== ${keepName} ===`);
    for (const gender of genders) {
      const keep = find(keepName, gender);
      const del = find(deleteName, gender);
      if (keep && del) {
        console.log(`${gender}: merging`);
        await merge(keep.id, del.id, `${keepName} ${gender}`);
      } else if (!keep && del) {
        console.log(`${gender}: renaming (no keep found)`);
        await rename(del.id, keepName);
      } else if (keep && !del) {
        console.log(`${gender}: already clean`);
      } else {
        console.log(`${gender}: neither found`);
      }
    }
  }

  console.log("\n\nDone!");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

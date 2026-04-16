/**
 * Adds vetted scraped contacts to:
 * 1. head-coaches-to-send.csv (outreach list)
 * 2. Firestore programContacts (database)
 *
 * Only includes contacts confirmed/likely as head coaches.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, "../sync/node_modules/"));
const admin = require("firebase-admin");

const sa = JSON.parse(fs.readFileSync(path.join(__dirname, "../sync/service-account.json"), "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const programsSnap = await db.collection("programs").get();
const programs = programsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const contactsSnap = await db.collection("programContacts").get();
const dbContacts = contactsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

// Vetted head coaches only (from check-head-coaches.js KEEP list)
const contacts = [
  // EPRU
  { email: "ljorndorf@gmail.com", name: "Lance Orndorf", school: "Albright College", gender: "womens" },
  { email: "aletten@fandm.edu", name: "Ashley Letten", school: "Franklin & Marshall College", gender: "womens" },
  { email: "cmargheriteblack@gmail.com", name: "Christine Black", school: "Kings College", gender: "womens" },
  { email: "malcottik@gmail.com", name: "Kathleen Malcotti", school: "Loyola University Maryland", gender: "womens" },
  { email: "maxwell.friel@gmail.com", name: "Max Friel", school: "Ursinus College", gender: "womens" },
  { email: "amdefabio@gmail.com", name: "Amber DeFabio", school: "York College of Pennsylvania", gender: "womens" },
  // SAR D1AA
  { email: "kensley.bailey@yahoo.com", name: "Kensley Bailey", school: "Clemson University", gender: "womens" },
  { email: "seminolewomensrugby@gmail.com", name: "Liz Critcher", school: "Florida State University", gender: "womens" },
  { email: "jrsommer@ncsu.edu", name: "Jeff Sommer", school: "North Carolina State University", gender: "womens" },
  // SAR D2
  { email: "ahowrfc@gmail.com", name: "Corrin Harrington", school: "Appalachian State University", gender: "womens" },
  { email: "courtneyannmorris@gmail.com", name: "Courtney Lindsay", school: "Coastal Carolina University", gender: "womens" },
  { email: "Butchsetser@yahoo.com", name: "Butch Sester", school: "College of Charleston", gender: "womens" },
  { email: "Johnsalyer99@gmail.com", name: "John Salyer", school: "Kennesaw State University", gender: "womens" },
  { email: "coach@gtwrfc.org", name: "Wil Mitcham", school: "Georgia Institute of Technology", gender: "womens" },
  { email: "lhouia@gmail.com", name: "Lance Houia", school: "Middle Tennessee State University", gender: "womens" },
  { email: "jposey@armyrotc.msstate.edu", name: "Jason Posey", school: "Mississippi State University", gender: "womens" },
  { email: "Erika.james1213@gmail.com", name: "Erika James", school: "University of Georgia", gender: "womens" },
  { email: "keyla.zepeda97@gmail.com", name: "Dallas Sharpe", school: "University of North Carolina at Charlotte", gender: "womens" },
  { email: "stevehill3096@yahoo.com", name: "Steve Hill", school: "University of North Georgia", gender: "womens" },
  { email: "abreese@email.sc.edu", name: "AB Reese", school: "University of South Carolina", gender: "womens" },
  { email: "donnkeels@gmail.com", name: "Will Keels", school: "University of South Florida", gender: "womens" },
  { email: "regina.durkan@gmail.com", name: "G Durkan", school: "University of Tennessee", gender: "womens" },
  { email: "mikenita401@gmail.com", name: "Mike Nita", school: "Valdosta State University", gender: "womens" },
  { email: "jhd8593@gmail.com", name: "Jonathan Diaz", school: "Wake Forest University", gender: "womens" },
  // SAR D3
  { email: "alley@alleymitchell.com", name: "Alley Mitchell", school: "Elon University", gender: "womens" },
  { email: "James.wcuk@gmail.com", name: "James Woollcombe-Clarke", school: "Eckerd College", gender: "womens" },
  { email: "Christopher.parks83@gmail.com", name: "Christopher Parks", school: "Georgia College and State University", gender: "womens" },
  { email: "CoachMetz@aol.com", name: "Peter Metzelar", school: "Tennessee Technological University", gender: "womens" },
  { email: "NELSENJ@charleston-sc.gov", name: "Jen Nelson", school: "The Citadel", gender: "womens" },
  { email: "daileam0@sewanee.edu", name: "Apollo Dailey", school: "Sewanee: The University of the South", gender: "womens" },
];

// --- 1. Add to CSV ---
const csvPath = path.join(__dirname, "head-coaches-to-send.csv");
const csvRaw = fs.readFileSync(csvPath, "utf8").trim();
const existingEmails = new Set(
  csvRaw.split("\n").slice(1).map((l) => l.split(",")[0].trim().toLowerCase())
);

const newCsvLines = [];
for (const c of contacts) {
  if (!existingEmails.has(c.email.toLowerCase())) {
    const g = c.gender === "womens" ? "Women's" : "Men's";
    newCsvLines.push(`${c.email},${c.name},${c.school},${g}`);
  }
}

if (newCsvLines.length > 0) {
  fs.writeFileSync(csvPath, csvRaw + "\n" + newCsvLines.join("\n") + "\n");
  console.log(`Added ${newCsvLines.length} new contacts to CSV`);
} else {
  console.log("No new CSV entries needed");
}

// --- 2. Add/update in Firestore programContacts ---
let added = 0;
let updated = 0;
let skipped = 0;

for (const c of contacts) {
  const prog = programs.find(
    (p) => p.school?.toLowerCase() === c.school.toLowerCase() && p.gender?.toLowerCase() === c.gender
  );

  if (!prog) {
    console.log(`  SKIP DB: No program for ${c.school} (${c.gender})`);
    skipped++;
    continue;
  }

  const pc = dbContacts.filter((ct) => ct.programId === prog.id);

  // Check if this email already exists as a contact
  const existing = pc.find((ct) => ct.email?.toLowerCase() === c.email.toLowerCase());
  if (existing) {
    console.log(`  EXISTS: ${c.email} already in DB for ${c.school}`);
    skipped++;
    continue;
  }

  // Check if this name exists with a different email (update it)
  const nameMatch = pc.find((ct) => ct.contact?.toLowerCase() === c.name.toLowerCase());
  if (nameMatch) {
    await db.collection("programContacts").doc(nameMatch.id).update({
      email: c.email,
    });
    console.log(`  UPDATED: ${c.name} email to ${c.email} for ${c.school}`);
    updated++;
    continue;
  }

  // Add as new contact
  await db.collection("programContacts").add({
    programId: prog.id,
    contact: c.name,
    contactTitle: "Head Coach",
    email: c.email,
  });
  console.log(`  ADDED: ${c.name} <${c.email}> as Head Coach for ${c.school}`);
  added++;
}

console.log(`\nFirestore: Added ${added}, Updated ${updated}, Skipped ${skipped}`);
process.exit(0);

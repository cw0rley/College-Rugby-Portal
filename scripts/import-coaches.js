import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

const contacts = [
  { school: "United States Naval Academy", gender: "mens", contact: "James Willocks", contactTitle: "Assistant Director of Rugby", email: "willocks@usna.edu" },
  { school: "United States Naval Academy", gender: "mens", contact: "Dallas Elliston", contactTitle: "Director of Operations", email: "elliston@usna.edu" },
  { school: "Saint Mary's College of California", gender: "mens", contact: "Tim O'Brien", contactTitle: "Head Coach", email: "mensrugby@stmarys-ca.edu" },
  { school: "Saint Mary's College of California", gender: "mens", contact: "Mark Bass", contactTitle: "Coach", email: "" },
  { school: "Saint Mary's College of California", gender: "mens", contact: "Andrew Cook", contactTitle: "Coach", email: "" },
  { school: "Saint Mary's College of California", gender: "mens", contact: "Mike McCarthy", contactTitle: "Coach", email: "" },
  { school: "Saint Mary's College of California", gender: "mens", contact: "Francois Pieterse", contactTitle: "Coach", email: "" },
  { school: "Lindenwood University", gender: "mens", contact: "Josh Macy", contactTitle: "Head Coach", email: "jmacy@lindenwood.edu" },
  { school: "Lindenwood University", gender: "mens", contact: "Zach Thorum", contactTitle: "Assistant Coach", email: "zthorum@lindenwood.edu" },
  { school: "Lindenwood University", gender: "mens", contact: "Aaron Browne", contactTitle: "Assistant Coach", email: "aaron@motortransportalliance.com" },
  { school: "Lindenwood University", gender: "mens", contact: "Stephen Duff", contactTitle: "Assistant Coach", email: "" },
  { school: "Lindenwood University", gender: "mens", contact: "Corey Harmann", contactTitle: "Volunteer Coach", email: "" },
  { school: "Life University", gender: "mens", contact: "Blake Bradford", contactTitle: "Director of Men's Rugby", email: "francis.bradford@life.edu" },
  { school: "Life University", gender: "mens", contact: "Benny Mateialona", contactTitle: "Assistant Head Coach", email: "bmateialona@life.edu" },
  { school: "United States Military Academy", gender: "mens", contact: "Matt Sherman", contactTitle: "Head Coach", email: "matthew.sherman@westpoint.edu" },
  { school: "United States Military Academy", gender: "mens", contact: "Jake Mizell", contactTitle: "Assistant Coach", email: "jacob.mizell@westpoint.edu" },
  { school: "United States Military Academy", gender: "mens", contact: "Danny Breda", contactTitle: "Assistant Coach", email: "" },
  { school: "University of Arizona", gender: "mens", contact: "Sean Duffy", contactTitle: "Director", email: "duffys@arizona.edu" },
  { school: "University of Arizona", gender: "mens", contact: "Mattox King", contactTitle: "Head Coach", email: "" },
  { school: "University of Arizona", gender: "mens", contact: "Jack Brown", contactTitle: "President", email: "" },
  { school: "Brigham Young University", gender: "mens", contact: "Steve St. Pierre", contactTitle: "Head Coach", email: "" },
  { school: "Brigham Young University", gender: "mens", contact: "Derek Smith", contactTitle: "Forwards Coach", email: "" },
  { school: "Brigham Young University", gender: "mens", contact: "Hoseki Kofe", contactTitle: "Backs Coach", email: "" },
  { school: "Mount St. Mary's University", gender: "mens", contact: "Jay Myles", contactTitle: "Head Coach", email: "myles@msmary.edu" },
  { school: "Mount St. Mary's University", gender: "mens", contact: "Mike Keifer", contactTitle: "Assistant Coach", email: "m.d.keifer@msmary.edu" },
  { school: "Mount St. Mary's University", gender: "mens", contact: "Kyle Powers", contactTitle: "Assistant Coach", email: "k.m.powers@msmary.edu" },
  { school: "Mount St. Mary's University", gender: "mens", contact: "Chet Rockwood", contactTitle: "Assistant Coach", email: "c.v.rockwood@msmary.edu" },
  { school: "Mount St. Mary's University", gender: "mens", contact: "Hayden McKay", contactTitle: "Assistant Coach", email: "" },
  { school: "University of Mary Washington", gender: "mens", contact: "Andrew Spencer", contactTitle: "Head Coach", email: "aspence8@umw.edu" },
  { school: "University of Mary Washington", gender: "mens", contact: "Charbel Medlej", contactTitle: "Coach", email: "cmedlej@umw.edu" },
  { school: "Grand Canyon University", gender: "mens", contact: "Sean O'Leary", contactTitle: "Head Coach", email: "sean.oleary@gcu.edu" },
  { school: "Pennsylvania State University", gender: "mens", contact: "Zac Mizell", contactTitle: "Head Coach", email: "zvm5239@psu.edu" },
  { school: "Pennsylvania State University", gender: "mens", contact: "Justin Johnson", contactTitle: "Assistant Coach", email: "" },
  { school: "University of San Diego", gender: "mens", contact: "Kevin Eaton", contactTitle: "Director of Rugby", email: "usdrugbyteam@gmail.com" },
  { school: "University of San Diego", gender: "mens", contact: "Charlie Purdon", contactTitle: "Head Coach", email: "usdrugbycoach@gmail.com" },
  { school: "California State University, Long Beach", gender: "mens", contact: "Peter Sio", contactTitle: "Head Coach", email: "" },
  { school: "California State University, Long Beach", gender: "mens", contact: "Anthony Monte", contactTitle: "Forwards Coach", email: "" },
  { school: "University of California, Los Angeles", gender: "mens", contact: "Harry Bennett", contactTitle: "Head Coach", email: "" },
  { school: "University of California, Los Angeles", gender: "mens", contact: "Todd Thornley", contactTitle: "Assistant Coach", email: "" },
  { school: "St. Thomas University", gender: "mens", contact: "Gavin McLeavy", contactTitle: "Head Coach", email: "gmcleavy@stu.edu" },
  { school: "Davenport University", gender: "mens", contact: "Dominique Bailey", contactTitle: "Head Coach", email: "dominique.bailey@davenport.edu" },
  { school: "Davenport University", gender: "mens", contact: "Trevor Rothhaas", contactTitle: "Assistant Coach", email: "trevor.rothhaas@davenport.edu" },
  { school: "Davenport University", gender: "mens", contact: "Madison Bailey", contactTitle: "Assistant Coach", email: "" },
  { school: "Ohio State University", gender: "mens", contact: "Tom Rooney", contactTitle: "Director of Rugby Operations", email: "" },
  { school: "Ohio State University", gender: "mens", contact: "Pete Malcolm", contactTitle: "Head Coach", email: "" },
  { school: "Southern Virginia University", gender: "mens", contact: "Paul Lasike", contactTitle: "Head Coach", email: "paul.lasike@svu.edu" },
  { school: "Florida State University", gender: "mens", contact: "Michael Gomez", contactTitle: "Head Coach", email: "" },
  { school: "Florida State University", gender: "mens", contact: "George Reynolds", contactTitle: "Assistant Coach", email: "" },
  { school: "Florida State University", gender: "mens", contact: "Alex Bluteau", contactTitle: "Assistant Coach", email: "" },
];

async function main() {
  const progSnap = await getDocs(collection(db, "programs"));
  const programs = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const existSnap = await getDocs(collection(db, "programContacts"));
  const existingKeys = new Set(existSnap.docs.map(d => {
    const data = d.data();
    return `${data.programId}|${(data.contact || "").toLowerCase()}|${(data.email || "").toLowerCase()}`;
  }));

  let added = 0, skipped = 0, noMatch = 0;
  for (const c of contacts) {
    const match = programs.find(p =>
      p.school?.toLowerCase() === c.school.toLowerCase() && p.gender === c.gender
    );
    if (!match) {
      console.log("  NO MATCH:", c.school, c.gender);
      noMatch++;
      continue;
    }

    const key = `${match.id}|${c.contact.toLowerCase()}|${(c.email || "").toLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    await addDoc(collection(db, "programContacts"), {
      programId: match.id,
      contact: c.contact,
      contactTitle: c.contactTitle,
      email: c.email || "",
    });
    console.log("  Added:", c.contact, "->", match.school);
    added++;
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}, No match: ${noMatch}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

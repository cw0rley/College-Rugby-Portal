import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, addDoc, doc, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

const updates = [
  { school: "Abilene Christian University", contact: "Keith Goeddertz", title: "Head Coach", email: "keith.goeddertz@acu.edu" },
  { school: "American River College", contact: "Zach Swithenbank", title: "Head Coach", email: "zswithenbank@arc.losrios.edu" },
  { school: "Brigham Young University", contact: "Steve St. Pierre", title: "Head Coach", email: "steve.stpierre@byu.edu" },
  { school: "Brigham Young University", contact: "Hoseki Kofe", title: "Backs Coach", email: "hoseki.kofe@byu.edu" },
  { school: "Brigham Young University", contact: "Derek Smith", title: "Forwards Coach", email: "derek.smith@byu.edu" },
  { school: "California State University, Chico", contact: "Lucas Bradbury", title: "Head Coach", email: "lbradbury@csuchico.edu" },
  { school: "California State University, Fresno", contact: "Lee Garrow", title: "Head Coach", email: "lgarrow@csufresno.edu" },
  { school: "California State University, Long Beach", contact: "Peter Sio", title: "Head Coach", email: "peter.sio@csulb.edu" },
  { school: "California State University, Long Beach", contact: "Anthony Monte", title: "Forwards Coach", email: "amonte@csulb.edu" },
  { school: "California State University, Sacramento", contact: "Steve Seifert", title: "Head Coach", email: "sseifert@csus.edu" },
  { school: "Central Oregon Community College", contact: "Adam Pendergraft", title: "Head Coach", email: "apendergraft@cocc.edu" },
  { school: "Colorado Mesa University", contact: "Liam Brannan", title: "Head Coach", email: "lbrannan@coloradomesa.edu" },
  { school: "Colorado School of Mines", contact: "Aaron Verstraete", title: "Head Coach", email: "averstraete@mines.edu" },
  { school: "Davenport University", contact: "Madison Bailey", title: "Assistant Coach", email: "mbailey@davenport.edu" },
  { school: "Florida State University", contact: "Michael Gomez", title: "Head Coach", email: "mgomez@fsu.edu" },
  { school: "Florida State University", contact: "Alex Bluteau", title: "Assistant Coach", email: "abluteau@fsu.edu" },
  { school: "Florida State University", contact: "George Reynolds", title: "Assistant Coach", email: "greynolds@fsu.edu" },
  { school: "Grand Valley State University", contact: "John Mullett", title: "Head Coach", email: "mullejo@gvsu.edu" },
  { school: "Iowa State University", contact: "Ant Frein", title: "Head Coach", email: "afrein@iastate.edu" },
  { school: "Lindenwood University", contact: "Stephen Duff", title: "Assistant Coach", email: "sduff@lindenwood.edu" },
  { school: "Lindenwood University", contact: "Corey Harmann", title: "Assistant Coach", email: "charmann@lindenwood.edu" },
  { school: "Loyola University Chicago", contact: "Sal Carfagno", title: "Head Coach", email: "scarfagno@luc.edu" },
  { school: "Michigan State University", contact: "Tim Britain", title: "Head Coach", email: "britaint@msu.edu" },
  { school: "Montana State University", contact: "Joseph Williams", title: "Head Coach", email: "joseph.williams@montana.edu" },
  { school: "Mount St. Mary's University", contact: "Hayden McKay", title: "Assistant Coach", email: "hmckay@msmary.edu" },
  { school: "New Mexico Institute of Mining and Technology", contact: "Jason Oliphant", title: "Head Coach", email: "joliphant@nmt.edu" },
  { school: "Ohio Northern University", contact: "Aidan Flynn", title: "Head Coach", email: "aflynn@onu.edu" },
  { school: "Ohio State University", contact: "Pete Malcolm", title: "Head Coach", email: "malcolm.72@osu.edu" },
  { school: "Ohio State University", contact: "Tom Rooney", title: "Director of Rugby Operations", email: "rooney.27@osu.edu" },
  { school: "Pennsylvania State University", contact: "Justin Johnson", title: "Assistant Coach", email: "jujohnson@psu.edu" },
  { school: "Queens University of Charlotte", contact: "Doyle Hedgepeth", title: "Assistant Coach", email: "hedgepetd@queens.edu" },
  { school: "Saint Marys College of California", contact: "Tim O'Brien", title: "Head Coach", email: "tobrien@stmarys-ca.edu" },
  { school: "Saint Marys College of California", contact: "Mike McCarthy", title: "Coach", email: "mmccarthy@stmarys-ca.edu" },
  { school: "Saint Marys College of California", contact: "Mark Bass", title: "Coach", email: "mbass@stmarys-ca.edu" },
  { school: "Saint Marys College of California", contact: "Andrew Cook", title: "Coach", email: "acook@stmarys-ca.edu" },
  { school: "Saint Marys College of California", contact: "Francois Pieterse", title: "Coach", email: "fpieterse@stmarys-ca.edu" },
  { school: "Sam Houston State University", contact: "Ramon Serrano", title: "Head Coach", email: "rserrano@shsu.edu" },
  { school: "San Diego State University", contact: "Scott Bracken", title: "Head Coach", email: "sbracken@sdsu.edu" },
  { school: "San Francisco State University", contact: "Otto Wacker", title: "Head Coach", email: "owacker@sfsu.edu" },
  { school: "San Jose State University", contact: "Nick Schlobohm", title: "Head Coach", email: "nick.schlobohm@sjsu.edu" },
  { school: "Southeastern Louisiana University", contact: "Mark Dixon", title: "Head Coach", email: "mdixon@selu.edu" },
  { school: "Southern Virginia University", contact: "Paul Lasike", title: "Head Coach", email: "plasike@svu.edu" },
  { school: "Texas A&M University", contact: "Tui Osborne", title: "Head Coach", email: "tui.osborne@tamu.edu" },
  { school: "United States Military Academy", contact: "Danny Breda", title: "Assistant Coach", email: "danny.breda@westpoint.edu" },
  { school: "University of Arizona", contact: "Mattox King", title: "Head Coach", email: "mking@arizona.edu" },
  { school: "University of Arizona", contact: "Jack Brown", title: "President", email: "jackbrown@arizona.edu" },
  { school: "University of California, Los Angeles", contact: "Harry Bennett", title: "Head Coach", email: "harry.bennett@ucla.edu" },
  { school: "University of California, Los Angeles", contact: "Todd Thornley", title: "Assistant Coach", email: "tthornley@ucla.edu" },
  { school: "University of Chicago", contact: "Louis Ypma", title: "Head Coach", email: "ypma@uchicago.edu" },
  { school: "University of Illinois Urbana-Champaign", contact: "Joe Rasmus", title: "Head Coach", email: "jrasmus@illinois.edu" },
  { school: "University of Illinois Urbana-Champaign", contact: "Kevin Battle", title: "Head Coach", email: "kbattle@illinois.edu" },
  { school: "University of Iowa", contact: "Tyler Dailey", title: "Head Coach", email: "tyler-dailey@uiowa.edu" },
  { school: "University of Louisville", contact: "Emil Walton", title: "Head Coach", email: "emil.walton@louisville.edu" },
  { school: "University of Minnesota Twin Cities", contact: "Paul O'Brien", title: "Head Coach", email: "obrienp@umn.edu" },
  { school: "University of New Mexico", contact: "Deavon Tabish-Moran", title: "Head Coach", email: "dtabish@unm.edu" },
  { school: "University of Northern Colorado", contact: "Chris Woodward", title: "Head Coach", email: "chris.woodward@unco.edu" },
  { school: "University of Oklahoma", contact: "Kelly Meek", title: "Head Coach", email: "kmeek@ou.edu" },
  { school: "University of San Francisco", contact: "John Dwyer", title: "Head Coach", email: "jdwyer@usfca.edu" },
  { school: "University of Utah", contact: "Cameron DiLoreto", title: "Head Coach", email: "cameron.diloreto@utah.edu" },
  { school: "University of Wyoming", contact: "David Finnoff", title: "Head Coach", email: "dfinnoff@uwyo.edu" },
  { school: "Utah State University", contact: "Matt Tualamali'i", title: "Head Coach", email: "matt.tualamalii@usu.edu" },
  { school: "Utah Valley University", contact: "Adam Griffee", title: "Head Coach", email: "agriffee@uvu.edu" },
  { school: "Western Michigan University", contact: "Sanders Slevatz", title: "Head Coach", email: "sanders.slevatz@wmich.edu" },
  { school: "Western Washington University", contact: "Adam Roberts", title: "Head Coach", email: "adam.roberts@wwu.edu" },
];

async function main() {
  const progSnap = await getDocs(collection(db, "programs"));
  const programs = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const contactSnap = await getDocs(collection(db, "programContacts"));
  const allContacts = contactSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  let updated = 0, added = 0, noMatch = 0;

  for (const u of updates) {
    // Find matching program (mens)
    const prog = programs.find(p => p.school === u.school && p.gender === "mens");
    if (!prog) {
      // Try fuzzy
      const fuzzy = programs.find(p => p.school?.toLowerCase().includes(u.school.toLowerCase().split(",")[0].trim().toLowerCase()) && p.gender === "mens");
      if (!fuzzy) {
        console.log("  NO MATCH:", u.school);
        noMatch++;
        continue;
      }
      u._programId = fuzzy.id;
      u._school = fuzzy.school;
    } else {
      u._programId = prog.id;
      u._school = prog.school;
    }

    // Find existing contact by name
    const existing = allContacts.find(c =>
      c.programId === u._programId &&
      c.contact?.toLowerCase() === u.contact.toLowerCase()
    );

    if (existing) {
      // Update email and title
      const changes = {};
      if (u.email && existing.email !== u.email) changes.email = u.email;
      if (u.title && existing.contactTitle !== u.title) changes.contactTitle = u.title;
      if (Object.keys(changes).length > 0) {
        await updateDoc(doc(db, "programContacts", existing.id), changes);
        console.log("  Updated:", u.contact, "at", u._school, "->", Object.keys(changes).join(", "));
        updated++;
      }
    } else {
      // Add new contact
      await addDoc(collection(db, "programContacts"), {
        programId: u._programId,
        contact: u.contact,
        contactTitle: u.title,
        email: u.email || "",
      });
      console.log("  Added:", u.contact, "->", u._school);
      added++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Added: ${added}, No match: ${noMatch}`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

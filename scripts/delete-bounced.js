import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

const bad = new Set([
  "afarrell@ithaca.edu","ajs08358@sjfc.edu","alex.artus@colby-sawyer.edu",
  "andrewfrain@uchicago.edu","atosborne@sbu.edu","bcush@millersville.edu",
  "bew66011@huskies.bloomu.edu","bkauffma@macalester.edu","bmartin@stmarys-ca.edu",
  "bmathews@smcvt.edu","brady.renteria@ndsu.edu","bravermanj@allegheny.edu",
  "bst@princeton.edu","bsurfcrecruiting@gmail.com","chathaway@uni.edu",
  "cmaskiewicz875@anselm.edu","cmomsen@rio.edu","dale.russell@f.maine.edu",
  "david.smyth@svu.edu","dbonilla@troy.edu","dematte_step@bentley.edu",
  "dkenkel@endicott.edu","donemmons@sunyfredonia.edu","drussell@alfred.edu",
  "elizabeth.gionfriddo@nichols.ed","fetchodj@dukes.jmu.edu",
  "gavin.hickie@usna.edu","gdempsey@kennesaw.edu","geauxtigers@louisiana.edu",
  "j.bonti@aic.edu","jason.posey@luc.edu","jfox@ndc.edu","jgelder@k-state.edu",
  "jim.rogers@msu.edu","joseph.goff@salve.edu","juare136@morris.umn.edu",
  "justin.garcia@marquette.edu","jwdomenico42@tntech.edu","kduffy@bryant.edu",
  "kyle.sumsion@byu.edu","matt.huff@regis.edu","matt.sherman@virginia.edu",
  "matt.sherman@westpoint.edu","mcaram54@thomasmore.edu",
  "mdiamantopoulos@fas.harvard.edu","michael.bish@fordham.edu",
  "mmurphy@stvincent.edu","mrb323@lehigh.edu","mulhollan@hartford.edu",
  "naair.campbell001@albright.edu","nicholas_hill@uri.edu","njb15240@ucmo.edu",
  "nkleinhans@unh.edu","oconnor@ohio-northern.edu","owen.deraps.18@cnu.edu",
  "oyoose@sjsu.edu","paul.woelfel@und.edu","philip.kellerman@principia.edu",
  "rruhland@nd.edu","rwiesner@iup.edu","samuel.spangler@siu.edu",
  "sean.mccarthy@shu.edu","shamblinglemon@gmail.com","smayer@fandm.edu",
  "srtungay@utk.edu","stewacs19@juniata.edu","strujillo@stanford.edu",
  "tcarson@tcu.edu","tcyr@conncoll.edu","tdaniel5@mail.naz.edu",
  "tfreel@eckerd.edu","tmaranto@towson.edu","tselleck@css.edu",
  "ugaclubsports@uga.edu","williamcrawford@latech.edu","wjohnson21@amherst.edu",
  "yaps@carleton.edu","zmizell@adrian.edu","zmizell@psu.edu",
].map(e => e.toLowerCase()));

async function main() {
  const snap = await getDocs(collection(db, "programContacts"));
  let deleted = 0;
  for (const d of snap.docs) {
    const email = (d.data().email || "").toLowerCase().trim();
    if (email && bad.has(email)) {
      await deleteDoc(doc(db, "programContacts", d.id));
      console.log("Deleted:", d.data().contact || "(no name)", "-", d.data().email);
      deleted++;
    }
  }
  console.log("\nDone! Deleted", deleted, "contacts.");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

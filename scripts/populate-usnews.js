import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  projectId: "college-rugby-portal",
});
const db = getFirestore(app);

// US News 2025 National University Rankings + Liberal Arts + Regional
// Source: usnews.com/best-colleges
const usNewsData = {
  // Top National Universities
  "Princeton University": { rank: 1, slug: "princeton-university-4726" },
  "Massachusetts Institute of Technology": { rank: 1, slug: "massachusetts-institute-of-technology-2178" },
  "Harvard University": { rank: 3, slug: "harvard-university-2155" },
  "Stanford University": { rank: 3, slug: "stanford-university-1305" },
  "Yale University": { rank: 5, slug: "yale-university-1426" },
  "University of Pennsylvania": { rank: 5, slug: "university-of-pennsylvania-3378" },
  "California Institute of Technology": { rank: 7, slug: "california-institute-of-technology-1131" },
  "Duke University": { rank: 7, slug: "duke-university-2920" },
  "Johns Hopkins University": { rank: 9, slug: "johns-hopkins-university-2077" },
  "Northwestern University": { rank: 9, slug: "northwestern-university-1851" },
  "Columbia University": { rank: 11, slug: "columbia-university-2116" },
  "Cornell University": { rank: 11, slug: "cornell-university-2119" },
  "University of Chicago": { rank: 11, slug: "university-of-chicago-1774" },
  "Brown University": { rank: 14, slug: "brown-university-3401" },
  "Rice University": { rank: 14, slug: "rice-university-3604" },
  "Dartmouth College": { rank: 14, slug: "dartmouth-college-2573" },
  "Vanderbilt University": { rank: 17, slug: "vanderbilt-university-3535" },
  "Washington University in St. Louis": { rank: 17, slug: "washington-university-in-st-louis-2520" },
  "University of Notre Dame": { rank: 19, slug: "university-of-notre-dame-1840" },
  "Georgetown University": { rank: 20, slug: "georgetown-university-1445" },
  "University of Michigan": { rank: 21, slug: "university-of-michigan-ann-arbor-2093" },
  "University of California, Berkeley": { rank: 22, slug: "university-of-california-berkeley-1312" },
  "University of California, Los Angeles": { rank: 22, slug: "university-of-california-los-angeles-1315" },
  "Carnegie Mellon University": { rank: 24, slug: "carnegie-mellon-university-3248" },
  "Emory University": { rank: 24, slug: "emory-university-1564" },
  "University of Virginia": { rank: 24, slug: "university-of-virginia-main-campus-3764" },
  "New York University": { rank: 27, slug: "new-york-university-2165" },
  "University of Florida": { rank: 27, slug: "university-of-florida-1535" },
  "University of North Carolina at Chapel Hill": { rank: 27, slug: "university-of-north-carolina-at-chapel-hill-2974" },
  "University of Southern California": { rank: 27, slug: "university-of-southern-california-1328" },
  "Boston College": { rank: 31, slug: "boston-college-2103" },
  "Tufts University": { rank: 31, slug: "tufts-university-2219" },
  "University of California, San Diego": { rank: 33, slug: "university-of-california-san-diego-1317" },
  "University of Wisconsin": { rank: 33, slug: "university-of-wisconsin-madison-2976" },
  "Georgia Institute of Technology": { rank: 33, slug: "georgia-institute-of-technology-1569" },
  "University of Texas at Austin": { rank: 36, slug: "university-of-texas-at-austin-3658" },
  "Boston University": { rank: 37, slug: "boston-university-2104" },
  "University of Illinois Urbana-Champaign": { rank: 37, slug: "university-of-illinois-urbana-champaign-1775" },
  "University of California, Davis": { rank: 39, slug: "university-of-california-davis-1313" },
  "University of California, Irvine": { rank: 39, slug: "university-of-california-irvine-1314" },
  "William & Mary": { rank: 39, slug: "william-mary-3768" },
  "Case Western Reserve University": { rank: 42, slug: "case-western-reserve-university-3018" },
  "Lehigh University": { rank: 42, slug: "lehigh-university-3289" },
  "University of Washington": { rank: 42, slug: "university-of-washington-1272" },
  "Northeastern University": { rank: 42, slug: "northeastern-university-2199" },
  "Ohio State University": { rank: 42, slug: "ohio-state-university-columbus-3090" },
  "Purdue University": { rank: 42, slug: "purdue-university-main-campus-1825" },
  "University of California, Santa Barbara": { rank: 42, slug: "university-of-california-santa-barbara-1320" },
  "University of Georgia": { rank: 42, slug: "university-of-georgia-1570" },
  "University of Rochester": { rank: 42, slug: "university-of-rochester-2894" },
  "Villanova University": { rank: 51, slug: "villanova-university-3386" },
  "Florida State University": { rank: 52, slug: "florida-state-university-1536" },
  "Rutgers University": { rank: 52, slug: "rutgers-university-new-brunswick-2765" },
  "University of Maryland": { rank: 52, slug: "university-of-maryland-college-park-2095" },
  "University of Minnesota Twin Cities": { rank: 52, slug: "university-of-minnesota-twin-cities-2099" },
  "University of Pittsburgh": { rank: 52, slug: "university-of-pittsburgh-3379" },
  "Virginia Tech": { rank: 52, slug: "virginia-tech-3766" },
  "Virginia Polytechnic Institute and State University": { rank: 52, slug: "virginia-tech-3766" },
  "Syracuse University": { rank: 58, slug: "syracuse-university-2882" },
  "Indiana University Bloomington": { rank: 58, slug: "indiana-university-bloomington-1809" },
  "University of Connecticut": { rank: 58, slug: "university-of-connecticut-1417" },
  "Pennsylvania State University": { rank: 58, slug: "penn-state-university-park-3329" },
  "Clemson University": { rank: 62, slug: "clemson-university-3425" },
  "University of Iowa": { rank: 62, slug: "university-of-iowa-1883" },
  "University of Arizona": { rank: 62, slug: "university-of-arizona-1083" },
  "Texas A&M University": { rank: 62, slug: "texas-a-m-university-college-station-10366" },
  "George Washington University": { rank: 66, slug: "george-washington-university-1444" },
  "Southern Methodist University": { rank: 66, slug: "southern-methodist-university-3613" },
  "Fordham University": { rank: 66, slug: "fordham-university-2153" },
  "University of California, Santa Cruz": { rank: 66, slug: "university-of-california-santa-cruz-1321" },
  "University of Massachusetts Amherst": { rank: 66, slug: "university-of-massachusetts-amherst-2221" },
  "University of California, Riverside": { rank: 66, slug: "university-of-california-riverside-1316" },
  "Loyola University Chicago": { rank: 72, slug: "loyola-university-chicago-1791" },
  "Marquette University": { rank: 72, slug: "marquette-university-2526" },
  "Michigan State University": { rank: 72, slug: "michigan-state-university-2290" },
  "Brigham Young University": { rank: 76, slug: "brigham-young-university-provo-3670" },
  "University of Colorado Boulder": { rank: 76, slug: "university-of-colorado-boulder-1370" },
  "University of South Carolina": { rank: 76, slug: "university-of-south-carolina-3448" },
  "University of Delaware": { rank: 76, slug: "university-of-delaware-1431" },
  "Gonzaga University": { rank: 80, slug: "gonzaga-university-1244" },
  "University of Oklahoma": { rank: 80, slug: "university-of-oklahoma-3184" },
  "North Carolina State University": { rank: 80, slug: "north-carolina-state-university-at-raleigh-2972" },
  "Temple University": { rank: 80, slug: "temple-university-3371" },
  "University of San Diego": { rank: 80, slug: "university-of-san-diego-1291" },
  "University of Alabama": { rank: 80, slug: "university-of-alabama-1051" },
  "University of Kansas": { rank: 80, slug: "university-of-kansas-1885" },
  "University of Oregon": { rank: 87, slug: "university-of-oregon-3209" },
  "University of Denver": { rank: 87, slug: "university-of-denver-1371" },
  "University of San Francisco": { rank: 87, slug: "university-of-san-francisco-1292" },
  "Saint Louis University": { rank: 87, slug: "st-louis-university-2506" },
  "University of Utah": { rank: 91, slug: "university-of-utah-3675" },
  "University of Tennessee": { rank: 91, slug: "university-of-tennessee-3530" },
  "Iowa State University": { rank: 91, slug: "iowa-state-university-1869" },
  "University of South Florida": { rank: 91, slug: "university-of-south-florida-1537" },
  "Auburn University": { rank: 95, slug: "auburn-university-1050" },
  "Baylor University": { rank: 95, slug: "baylor-university-3566" },
  "Drexel University": { rank: 95, slug: "drexel-university-3255" },
  "University of Missouri": { rank: 95, slug: "university-of-missouri-2516" },
  "Arizona State University": { rank: 99, slug: "arizona-state-university-1081" },
  "University of Louisville": { rank: 99, slug: "university-of-louisville-1999" },
  "University of Nebraska": { rank: 99, slug: "university-of-nebraska-lincoln-2565" },
  "Colorado State University": { rank: 105, slug: "colorado-state-university-1372" },
  "University of New Mexico": { rank: 105, slug: "university-of-new-mexico-2139" },
  "University of Kentucky": { rank: 105, slug: "university-of-kentucky-1988" },
  "Louisiana State University": { rank: 105, slug: "louisiana-state-university-2011" },
  "San Diego State University": { rank: 105, slug: "san-diego-state-university-1286" },
  "University of Wyoming": { rank: 105, slug: "university-of-wyoming-3932" },
  "Montana State University": { rank: 115, slug: "montana-state-university-2529" },
  "Utah State University": { rank: 115, slug: "utah-state-university-3671" },
  "University of Northern Colorado": { rank: 115, slug: "university-of-northern-colorado-1380" },
  "Western Michigan University": { rank: 115, slug: "western-michigan-university-2086" },
  "Boise State University": { rank: 125, slug: "boise-state-university-1616" },
  "University of Idaho": { rank: 125, slug: "university-of-idaho-1617" },
  // Liberal Arts Colleges
  "Williams College": { rank: 1, slug: "williams-college-2233", type: "liberal-arts" },
  "Amherst College": { rank: 2, slug: "amherst-college-2097", type: "liberal-arts" },
  "Swarthmore College": { rank: 3, slug: "swarthmore-college-3367", type: "liberal-arts" },
  "Bowdoin College": { rank: 4, slug: "bowdoin-college-2044", type: "liberal-arts" },
  "Middlebury College": { rank: 5, slug: "middlebury-college-2730", type: "liberal-arts" },
  "Colby College": { rank: 11, slug: "colby-college-2045", type: "liberal-arts" },
  "Davidson College": { rank: 11, slug: "davidson-college-2918", type: "liberal-arts" },
  "Colgate University": { rank: 16, slug: "colgate-university-2817", type: "liberal-arts" },
  "Colorado College": { rank: 21, slug: "colorado-college-1367", type: "liberal-arts" },
  "Bucknell University": { rank: 30, slug: "bucknell-university-3250", type: "liberal-arts" },
  "Denison University": { rank: 30, slug: "denison-university-3064", type: "liberal-arts" },
  "College of the Holy Cross": { rank: 35, slug: "college-of-the-holy-cross-2162", type: "liberal-arts" },
  "Connecticut College": { rank: 37, slug: "connecticut-college-1416", type: "liberal-arts" },
  "Dickinson College": { rank: 42, slug: "dickinson-college-3263", type: "liberal-arts" },
  "Union College": { rank: 42, slug: "union-college-2867", type: "liberal-arts" },
  "Wheaton College": { rank: 48, slug: "wheaton-college-1818", type: "liberal-arts" },
  "St. Lawrence University": { rank: 56, slug: "st-lawrence-university-2845", type: "liberal-arts" },
  "Allegheny College": { rank: 62, slug: "allegheny-college-3242", type: "liberal-arts" },
  "Ursinus College": { rank: 62, slug: "ursinus-college-3384", type: "liberal-arts" },
};

async function main() {
  const snap = await getDocs(collection(db, "programs"));
  const programs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  let updated = 0, skipped = 0;
  const matched = new Set();

  for (const p of programs) {
    const data = usNewsData[p.school];
    if (!data) continue;
    if (p.usNewsRank && p.usNewsUrl) { skipped++; continue; }

    const type = data.type || "national-universities";
    const url = `https://www.usnews.com/best-colleges/${type}/rankings/detail/${data.slug}`;

    await updateDoc(doc(db, "programs", p.id), {
      usNewsRank: data.rank,
      usNewsUrl: url,
    });
    if (!matched.has(p.school)) {
      console.log(`  Updated: ${p.school} (${p.gender}) -> #${data.rank}`);
      matched.add(p.school);
    }
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped (already set): ${skipped}`);
  console.log(`Schools in data but not found in programs:`);
  for (const school of Object.keys(usNewsData)) {
    if (!programs.find(p => p.school === school)) {
      console.log(`  NOT FOUND: ${school}`);
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

export const US_STATES = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DC:"D.C.",DE:"Delaware",FL:"Florida",
  GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",
  IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",
  MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
  MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",
  NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",
  NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

export const EMPTY_PROGRAM = {
  school:"", city:"", state:"", gender:"mens", conference:"", league:"",
  ncaaDivision:"", schoolType:"", gpa:"", sat:"", acceptanceRate:"",
  enrollment:"", inStateTuition:"", outStateTuition:"", rugbyRanking:"",
  rugbyScholarship:false, schoolFunded:false, website:"", rugbyWebsite:"", topPrograms:"", notes:"",
  featured:false, logoUrl:"", usNewsRank:"", usNewsUrl:"",
};

export const EMPTY_PROGRAM_CONTACT = {
  programId:"", contact:"", contactTitle:"", email:"",
};

export const CSV_COLS = [
  ["school","School"],["state","State"],["city","City"],["gender","Gender"],
  ["conference","Conference"],["league","League"],["ncaaDivision","NCAA Division"],
  ["schoolType","School Type"],["gpa","GPA"],["sat","SAT"],["acceptanceRate","Acceptance Rate"],
  ["enrollment","Enrollment"],["inStateTuition","In-State Tuition"],
  ["outStateTuition","Out-of-State Tuition"],["rugbyRanking","Rugby Ranking"],
  ["rugbyScholarship","Rugby Scholarship"],["schoolFunded","School Funded"],["website","Website"],["rugbyWebsite","Rugby Website"],["notes","Notes"],
];

export const CSV_NUM_FIELDS = new Set(["gpa","sat","acceptanceRate","enrollment","inStateTuition","outStateTuition","rugbyRanking"]);
export const CSV_BOOL_FIELDS = new Set(["rugbyScholarship","schoolFunded"]);

export const CONF_COLS = [
  ["conference","Abbreviation"],["fullName","Full Name"],["notes","Notes"],
];
export const CONF_CONTACT_COLS = [
  ["conference","Conference"],["league","League"],["gender","Gender"],
  ["contactName","Contact Name"],["contactTitle","Contact Title"],["email","Email"],["phone","Phone"],
];
export const LEAGUE_COLS = [["name","Name"]];
export const PROG_CONTACT_COLS = [
  ["school","School"],["gender","Gender"],["contact","Contact"],["contactTitle","Contact Title"],["email","Email"],
];

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, addDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "college-rugby-portal.firebaseapp.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const players = [
  {
    email: "prcunningham+player1@gmail.com",
    password: "TestPass123!",
    firstName: "Jake",
    lastName: "Morrison",
    position: "Loosehead Prop",
    secondaryPosition: "Tighthead Prop",
    graduationYear: 2027,
    gpa: "3.5",
    height: "5'11\"",
    weight: "220 lbs",
    city: "Austin",
    state: "TX",
    currentClub: "Austin Huns RFC",
    highSchool: "Westlake High School",
    highlightVideo: "https://www.youtube.com/watch?v=example1",
    profilePublic: true,
  },
  {
    email: "prcunningham+player2@gmail.com",
    password: "TestPass123!",
    firstName: "Marcus",
    lastName: "Williams",
    position: "Fly Half",
    secondaryPosition: "Inside Center",
    graduationYear: 2026,
    gpa: "3.8",
    height: "6'0\"",
    weight: "185 lbs",
    city: "San Diego",
    state: "CA",
    currentClub: "San Diego Mustangs",
    highSchool: "La Jolla High School",
    highlightVideo: "https://www.youtube.com/watch?v=example2",
    profilePublic: true,
  },
  {
    email: "prcunningham+player3@gmail.com",
    password: "TestPass123!",
    firstName: "Ethan",
    lastName: "O'Brien",
    position: "Scrum Half",
    secondaryPosition: "",
    graduationYear: 2027,
    gpa: "3.2",
    height: "5'9\"",
    weight: "170 lbs",
    city: "Denver",
    state: "CO",
    currentClub: "Denver Barbarians Youth",
    highSchool: "Cherry Creek High School",
    profilePublic: true,
  },
  {
    email: "prcunningham+player4@gmail.com",
    password: "TestPass123!",
    firstName: "Tyler",
    lastName: "Nakamura",
    position: "Lock",
    secondaryPosition: "Blindside Flanker",
    graduationYear: 2028,
    gpa: "3.9",
    height: "6'4\"",
    weight: "230 lbs",
    city: "Seattle",
    state: "WA",
    currentClub: "Seattle Saracens Youth",
    highSchool: "Bellevue High School",
    highlightVideo: "https://www.youtube.com/watch?v=example4",
    profilePublic: true,
  },
  {
    email: "prcunningham+player5@gmail.com",
    password: "TestPass123!",
    firstName: "Devon",
    lastName: "Carter",
    position: "Fullback",
    secondaryPosition: "Left Wing",
    graduationYear: 2026,
    gpa: "3.6",
    height: "6'1\"",
    weight: "195 lbs",
    city: "Atlanta",
    state: "GA",
    currentClub: "Atlanta Old White Youth",
    highSchool: "Brookwood High School",
    profilePublic: true,
  },
  {
    email: "prcunningham+player6@gmail.com",
    password: "TestPass123!",
    firstName: "Ryan",
    lastName: "Sullivan",
    position: "Number 8",
    secondaryPosition: "Openside Flanker",
    graduationYear: 2027,
    gpa: "3.4",
    height: "6'2\"",
    weight: "215 lbs",
    city: "Chicago",
    state: "IL",
    currentClub: "Chicago Lions Youth",
    highSchool: "New Trier High School",
    highlightVideo: "https://www.youtube.com/watch?v=example6",
    profilePublic: true,
  },
];

const coach = {
  email: "prcunningham+coach1@gmail.com",
  password: "TestPass123!",
  displayName: "Coach Pat Test",
  programSchool: "Test College",
  programGender: "mens",
  programState: "MD",
  programConference: "Independent",
  contactTitle: "Head Coach",
};

async function createPlayer(playerData) {
  const { email, password, ...profile } = playerData;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await updateProfile(cred.user, { displayName: `${profile.firstName} ${profile.lastName}` });

    // Create user doc
    await setDoc(doc(db, "users", uid), {
      email,
      displayName: `${profile.firstName} ${profile.lastName}`,
      isCoach: false,
      approved: false,
      createdAt: new Date().toISOString(),
    });

    // Create player profile
    await setDoc(doc(db, "playerProfiles", uid), profile);

    console.log(`  Created player: ${profile.firstName} ${profile.lastName} (${email})`);
    // Sign out so we can create the next user
    await auth.signOut();
    return uid;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log(`  Skipped (exists): ${email}`);
    } else {
      console.error(`  Failed: ${email} — ${err.message}`);
    }
    await auth.signOut().catch(() => {});
    return null;
  }
}

async function createCoach() {
  const { email, password, displayName, programSchool, programGender, programState, programConference, contactTitle } = coach;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await updateProfile(cred.user, { displayName });

    // Create user doc with coach flag
    await setDoc(doc(db, "users", uid), {
      email,
      displayName,
      isCoach: true,
      approved: true,
      createdAt: new Date().toISOString(),
    });

    // Create test program
    const programRef = await addDoc(collection(db, "programs"), {
      school: programSchool,
      gender: programGender,
      state: programState,
      city: "Test City",
      conference: programConference,
      league: "",
      rugbyScholarship: false,
      schoolFunded: false,
    });

    // Create program contact
    await addDoc(collection(db, "programContacts"), {
      programId: programRef.id,
      contact: displayName,
      contactTitle,
      email,
    });

    // Assign program to coach
    await setDoc(doc(db, "users", uid), { assignedProgramIds: [programRef.id] }, { merge: true });

    console.log(`  Created coach: ${displayName} (${email}) for ${programSchool}`);
    await auth.signOut();
    return uid;
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      console.log(`  Skipped (exists): ${email}`);
    } else {
      console.error(`  Failed: ${email} — ${err.message}`);
    }
    await auth.signOut().catch(() => {});
    return null;
  }
}

async function main() {
  console.log("Creating 6 test players...");
  for (const p of players) {
    await createPlayer(p);
  }

  console.log("\nCreating test coach...");
  await createCoach();

  console.log("\nDone! All accounts use password: TestPass123!");
  process.exit(0);
}

main();

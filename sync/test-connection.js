/**
 * Quick test to verify Firestore connection and read all collections.
 */
import {
  getExistingPrograms,
  getExistingProgramContacts,
  getExistingConferenceContacts,
  getExistingConferences,
  getExistingLeagues,
} from "./firestore-sync.js";

async function main() {
  console.log("Testing Firestore connection...\n");

  const programs = await getExistingPrograms();
  console.log(`📋 programs: ${programs.length} documents`);
  if (programs.length > 0) {
    const mens = programs.filter(p => p.gender === "mens");
    const womens = programs.filter(p => p.gender === "womens");
    console.log(`   Men's: ${mens.length} | Women's: ${womens.length}`);
    console.log(`   Sample: ${programs[0].school} (${programs[0].gender})`);
  }

  const contacts = await getExistingProgramContacts();
  console.log(`\n👤 programContacts: ${contacts.length} documents`);
  if (contacts.length > 0) {
    const withEmail = contacts.filter(c => c.email);
    console.log(`   With email: ${withEmail.length}`);
    console.log(`   Sample: ${contacts[0].contact} — ${contacts[0].contactTitle}`);
  }

  const confContacts = await getExistingConferenceContacts();
  console.log(`\n📞 conferenceContacts: ${confContacts.length} documents`);
  if (confContacts.length > 0) {
    console.log(`   Sample: ${confContacts[0].conference} — ${confContacts[0].contactName}`);
  }

  const conferences = await getExistingConferences();
  console.log(`\n🏟  conferences: ${conferences.length} documents`);
  if (conferences.length > 0) {
    console.log(`   Sample: ${conferences[0].conference} → ${conferences[0].fullName}`);
  }

  const leagues = await getExistingLeagues();
  console.log(`\n🏆 leagues: ${leagues.length} documents`);
  if (leagues.length > 0) {
    console.log(`   Sample: ${leagues[0].name}`);
  }

  console.log("\n✅ Connection successful!");
  process.exit(0);
}

main().catch(e => {
  console.error("❌ Connection failed:", e.message);
  process.exit(1);
});

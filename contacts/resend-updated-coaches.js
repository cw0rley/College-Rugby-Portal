/**
 * Resend outreach emails to coaches whose emails were updated in Firestore.
 * Pulls current head coach email from programContacts, then sends the outreach email.
 *
 * Usage:
 *   node resend-updated-coaches.js              # Send emails
 *   node resend-updated-coaches.js --dry-run    # Preview without sending
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, "../sync/node_modules/"));
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, "../sync/service-account.json"), "utf8"));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const RESEND_API_KEY = "re_SiSvFQsU_LZaNUpVKaUEpLHTmNvyTdF5F";
const FROM_EMAIL = "College Rugby Portal <notifications@collegerugbyportal.com>";
const REPLY_TO = "pat@claytonrugby.com";
const NAVY = "#0A1F44";
const LIME = "#00CC00";

const SCHOOLS = [
  { school: "Eastern Michigan University", gender: "mens" },
  { school: "Eastern Illinois University", gender: "mens" },
  { school: "Duquesne University", gender: "mens" },
  { school: "DePaul University", gender: "mens" },
  { school: "Davidson College", gender: "mens" },
  { school: "Davenport University", gender: "mens" },
  { school: "Connecticut College", gender: "womens" },
  { school: "Connecticut College", gender: "mens" },
  { school: "College of St. Scholastica", gender: "mens" },
  { school: "Colby-Sawyer College", gender: "mens" },
  { school: "California State University, Long Beach", gender: "mens" },
  { school: "Brown University", gender: "womens" },
  { school: "Brigham Young University", gender: "mens" },
  { school: "Brandeis University", gender: "mens" },
  { school: "Bowling Green State University", gender: "womens" },
  { school: "Ball State University", gender: "mens" },
  { school: "Augustana College", gender: "mens" },
  { school: "Appalachian State University", gender: "mens" },
];

function buildEmail(coachName, schoolName) {
  const firstName = (coachName || "Coach").split(" ")[0];
  const subject = "Free resource for your rugby program — College Rugby Portal";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:${NAVY};padding:20px 32px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">College Rugby Portal</h1>
              <p style="margin:6px 0 0;color:${LIME};font-size:13px;font-weight:600;">Explore. Connect. Play.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#FFFFFF;padding:32px;">
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                Hi ${firstName},
              </p>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                For years I've been helping my high school players connect with college rugby
                programs. I'd reach out to coaches on their behalf, track down emails, and try
                to match kids with the right schools. Over time I've collected a lot of information
                about college rugby programs across the country, and I wanted to put it to use
                to help grow the sport.
              </p>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                That's how <strong>College Rugby Portal</strong> (collegerugbyportal.com)
                came about — a free website with over 900 college rugby programs across all
                levels. The idea is simple: help players find programs like yours, whether
                they're chasing a scholarship or just want to keep playing in college.
                <strong>Everything is completely free.</strong>
              </p>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 8px;">
                Here's what your free coach account gives you:
              </p>
              <ul style="color:#333;font-size:15px;line-height:1.8;margin:0 0 16px;padding-left:20px;">
                <li><strong>See who's interested</strong> — players who favorite your program show up on your dashboard</li>
                <li><strong>Control your listing</strong> — update coaching staff, website, scholarships, and program description</li>
                <li><strong>Reach out to players</strong> — message them directly and browse the player directory</li>
              </ul>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Just create a free account at collegerugbyportal.com using your coaching
                email and you'll automatically get access to
                ${schoolName ? schoolName + "'s" : "your program's"} dashboard.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:${NAVY};border-radius:6px;">
                    <a href="https://collegerugbyportal.com" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">
                      Check It Out
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                I'm rolling this out to head coaches first, then to SROs and rugby clubs
                across the country so players start discovering your program. The more complete
                your listing is, the more attention it will get.
              </p>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0;">
                If you have any feedback, just reply to this email. Thanks, Coach.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;text-align:center;color:#999;font-size:12px;">
              <p style="margin:0;">
                <a href="https://collegerugbyportal.com" style="color:${NAVY};">collegerugbyportal.com</a>
                &nbsp;|&nbsp; This is a one-time introduction. No spam, ever.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

async function sendEmail(to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, reply_to: REPLY_TO, subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data.id;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const dryRun = process.argv.includes("--dry-run");

// Load all programs and contacts from Firestore
const programsSnap = await db.collection("programs").get();
const programs = programsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

const contactsSnap = await db.collection("programContacts").get();
const contacts = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

let sentCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const entry of SCHOOLS) {
  // Find matching program
  const program = programs.find(p =>
    p.school?.toLowerCase() === entry.school.toLowerCase() &&
    p.gender?.toLowerCase() === entry.gender
  );

  if (!program) {
    console.log(`  SKIP: No program found for ${entry.school} (${entry.gender})`);
    skipCount++;
    continue;
  }

  // Find head coach contact for this program
  const programContacts = contacts.filter(c => c.programId === program.id);
  const headCoach = programContacts.find(c =>
    c.contactTitle?.toLowerCase().includes("head coach")
  ) || programContacts[0]; // fallback to first contact

  if (!headCoach || !headCoach.email) {
    console.log(`  SKIP: No contact email for ${entry.school} (${entry.gender})`);
    skipCount++;
    continue;
  }

  const { subject, html } = buildEmail(headCoach.contact, program.school);

  if (dryRun) {
    console.log(`  [DRY RUN] ${headCoach.email} — ${headCoach.contact} (${program.school}, ${entry.gender})`);
    sentCount++;
    continue;
  }

  try {
    const id = await sendEmail(headCoach.email, subject, html);
    sentCount++;
    console.log(`  Sent ${sentCount}: ${headCoach.email} — ${headCoach.contact} (${program.school})`);
  } catch (err) {
    errorCount++;
    console.log(`  ERROR ${headCoach.email}: ${err.message}`);
  }

  await sleep(500);
}

console.log(`\nDone! Sent: ${sentCount}, Skipped: ${skipCount}, Errors: ${errorCount}`);
process.exit(0);

/**
 * Batch email sender for head coach outreach.
 *
 * Usage:
 *   node send-coach-emails.js                    # Send all unsent emails
 *   node send-coach-emails.js --dry-run           # Preview without sending
 *   node send-coach-emails.js --limit 50          # Send only 50 emails
 *   node send-coach-emails.js --test you@email    # Send one test to yourself
 *
 * Tracks progress in send-log.json so it can be stopped and resumed safely.
 * Rate limited to 2 emails/second to stay within Resend limits.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RESEND_API_KEY = "re_SiSvFQsU_LZaNUpVKaUEpLHTmNvyTdF5F";
const FROM_EMAIL = "College Rugby Portal <notifications@collegerugbyportal.com>";
const REPLY_TO = "pat@claytonrugby.com";
const CSV_FILE = path.join(__dirname, "head-coaches-to-send.csv");
const LOG_FILE = path.join(__dirname, "send-log.json");

const NAVY = "#0A1F44";
const LIME = "#00CC00";

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
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      reply_to: REPLY_TO,
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data.id;
}

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {
    return { sent: {}, errors: {} };
  }
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity;
const testIdx = args.indexOf("--test");
const testEmail = testIdx !== -1 ? args[testIdx + 1] : null;

// Load CSV
const csv = fs.readFileSync(CSV_FILE, "utf8").trim().split("\n").slice(1);
const coaches = csv.map(line => {
  const [email, name, school, gender] = line.split(",");
  return { email: email.trim(), name: name.trim(), school: school.trim(), gender: gender.trim() };
});

const log = loadLog();

if (testEmail) {
  console.log(`\nSending test email to ${testEmail}...`);
  const { subject, html } = buildEmail("Test Coach", "Test University");
  if (!dryRun) {
    try {
      const id = await sendEmail(testEmail, subject, html);
      console.log(`Sent! ID: ${id}`);
    } catch (err) {
      console.error(`Failed: ${err.message}`);
    }
  } else {
    console.log("[DRY RUN] Would send to " + testEmail);
  }
  process.exit(0);
}

// Filter out already sent
const toSend = coaches.filter(c => !log.sent[c.email]);
const batch = toSend.slice(0, limit);

console.log(`\nTotal coaches: ${coaches.length}`);
console.log(`Already sent: ${Object.keys(log.sent).length}`);
console.log(`To send this run: ${batch.length}${dryRun ? " (DRY RUN)" : ""}`);
console.log("");

let sentCount = 0;
let errorCount = 0;

for (const coach of batch) {
  const { subject, html } = buildEmail(coach.name, coach.school);

  if (dryRun) {
    console.log(`[DRY RUN] ${coach.email} — ${coach.name} (${coach.school})`);
    sentCount++;
    continue;
  }

  try {
    const id = await sendEmail(coach.email, subject, html);
    log.sent[coach.email] = { name: coach.name, school: coach.school, sentAt: new Date().toISOString(), resendId: id };
    sentCount++;
    process.stdout.write(`\r  Sent ${sentCount}/${batch.length}: ${coach.email}`);
  } catch (err) {
    log.errors[coach.email] = { name: coach.name, school: coach.school, error: err.message, at: new Date().toISOString() };
    errorCount++;
    console.log(`\n  ERROR ${coach.email}: ${err.message}`);
  }

  saveLog(log);
  await sleep(500); // 2 emails/second max
}

console.log(`\n\nDone! Sent: ${sentCount}, Errors: ${errorCount}`);
console.log(`Progress saved to ${LOG_FILE}`);

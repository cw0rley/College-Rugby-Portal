const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ── Config params ──────────────────────────────────────────────────────────
const sendgridApiKey = defineString("SENDGRID_API_KEY", { default: "" });
const sendgridFromEmail = defineString("SENDGRID_FROM_EMAIL", {
  default: "notifications@collegerugbyportal.com",
});

const PORTAL_URL = "https://collegerugbyportal.com";

// ── Brand colors ───────────────────────────────────────────────────────────
const NAVY = "#0A1F44";
const LIME = "#69BE28";

// ── Email HTML template ────────────────────────────────────────────────────
function buildEmail({ subject, bodyHtml, ctaText, ctaUrl }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:${NAVY};padding:20px 32px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">College Rugby Portal</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:32px;">
              <h2 style="margin:0 0 16px;color:${NAVY};font-size:18px;">${subject}</h2>
              <div style="color:#333333;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </div>
              ${ctaText && ctaUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:${LIME};border-radius:6px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;text-align:center;color:#999999;font-size:12px;">
              <p style="margin:0;">You received this email because you have an account on College Rugby Portal.</p>
              <p style="margin:8px 0 0;">To manage your notification preferences, visit your
                <a href="${PORTAL_URL}/settings" style="color:${NAVY};">account settings</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── SendGrid helper ────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  const apiKey = sendgridApiKey.value();
  if (!apiKey) {
    logger.warn("SendGrid API key not configured — skipping email send.");
    return false;
  }

  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(apiKey);

  const msg = {
    to,
    from: sendgridFromEmail.value(),
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error("SendGrid error:", err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Function 1: onPlayerInterest
// Triggered when a doc is created in programInterest/{programId}/players/{playerId}
// ═══════════════════════════════════════════════════════════════════════════
exports.onPlayerInterest = onDocumentCreated(
  "programInterest/{programId}/players/{playerId}",
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) {
        logger.warn("onPlayerInterest: No data in event.");
        return;
      }

      const playerData = snap.data();
      const { programId } = event.params;

      // ── Rate limit: check lastNotifiedAt on the programInterest doc ──
      const interestRef = db.collection("programInterest").doc(programId);
      const interestDoc = await interestRef.get();

      if (interestDoc.exists) {
        const lastNotified = interestDoc.data().lastNotifiedAt;
        if (lastNotified) {
          const elapsed = Date.now() - lastNotified.toMillis();
          const ONE_HOUR = 60 * 60 * 1000;
          if (elapsed < ONE_HOUR) {
            logger.info(
              `onPlayerInterest: Rate limited for program ${programId} — last notified ${Math.round(elapsed / 60000)}m ago.`
            );
            return;
          }
        }
      }

      // ── Look up the program ──────────────────────────────────────────
      const programDoc = await db.collection("programs").doc(programId).get();
      if (!programDoc.exists) {
        logger.warn(`onPlayerInterest: Program ${programId} not found.`);
        return;
      }
      const program = programDoc.data();

      // ── Look up coach contacts ───────────────────────────────────────
      const contactsSnap = await db
        .collection("programContacts")
        .where("programId", "==", programId)
        .get();

      const coachEmails = [];
      contactsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.email) coachEmails.push(data.email);
      });

      if (coachEmails.length === 0) {
        logger.info(
          `onPlayerInterest: No coach contacts with email for program ${programId}.`
        );
        return;
      }

      // ── Build and send email ─────────────────────────────────────────
      const playerName = playerData.name || "A player";
      const position = playerData.position || "N/A";
      const gradYear = playerData.graduationYear || "N/A";
      const gpa = playerData.gpa || "N/A";
      const city = playerData.city || "N/A";
      const schoolName = program.school || "your program";

      const subject = `New Player Interest — ${schoolName}`;
      const bodyHtml = `
        <p>A new player has expressed interest in <strong>${schoolName}</strong>!</p>
        <table style="margin:16px 0;border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td style="padding:4px 0;"><strong>${playerName}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Position</td><td style="padding:4px 0;">${position}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Graduation Year</td><td style="padding:4px 0;">${gradYear}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">GPA</td><td style="padding:4px 0;">${gpa}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">City</td><td style="padding:4px 0;">${city}</td></tr>
        </table>
        <p>Log in to the portal to view this player's full profile and reach out.</p>
      `;

      const html = buildEmail({
        subject,
        bodyHtml,
        ctaText: "View on Portal",
        ctaUrl: `${PORTAL_URL}/programs/${programId}`,
      });

      for (const email of coachEmails) {
        await sendEmail({ to: email, subject, html });
      }

      // ── Update rate-limit timestamp ──────────────────────────────────
      await interestRef.set(
        { lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );

      logger.info(
        `onPlayerInterest: Notified ${coachEmails.length} coach(es) for program ${programId}.`
      );
    } catch (err) {
      logger.error("onPlayerInterest error:", err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Function 2: onNewMessage
// Triggered when a doc is created in conversations/{convId}/messages/{msgId}
// ═══════════════════════════════════════════════════════════════════════════
exports.onNewMessage = onDocumentCreated(
  "conversations/{convId}/messages/{msgId}",
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) {
        logger.warn("onNewMessage: No data in event.");
        return;
      }

      const messageData = snap.data();
      const { convId } = event.params;
      const senderId = messageData.senderId || messageData.uid;

      if (!senderId) {
        logger.warn("onNewMessage: No senderId on message.");
        return;
      }

      // ── Read parent conversation ─────────────────────────────────────
      const convRef = db.collection("conversations").doc(convId);
      const convDoc = await convRef.get();
      if (!convDoc.exists) {
        logger.warn(`onNewMessage: Conversation ${convId} not found.`);
        return;
      }

      const conv = convDoc.data();
      const participants = conv.participants || [];
      const participantInfo = conv.participantInfo || {};

      // ── Determine recipient ──────────────────────────────────────────
      const recipientId = participants.find((uid) => uid !== senderId);
      if (!recipientId) {
        logger.warn("onNewMessage: Could not determine recipient.");
        return;
      }

      // ── Rate limit: don't email if notified about this conversation recently
      const lastEmailedAt = conv.lastEmailedAt;
      if (lastEmailedAt) {
        const elapsed = Date.now() - lastEmailedAt.toMillis();
        const THIRTY_MIN = 30 * 60 * 1000;
        if (elapsed < THIRTY_MIN) {
          logger.info(
            `onNewMessage: Rate limited for conversation ${convId} — last emailed ${Math.round(elapsed / 60000)}m ago.`
          );
          return;
        }
      }

      // ── Look up recipient email via Firebase Auth ────────────────────
      let recipientEmail;
      try {
        const userRecord = await admin.auth().getUser(recipientId);
        recipientEmail = userRecord.email;
      } catch (err) {
        logger.warn(
          `onNewMessage: Could not look up user ${recipientId}: ${err.message}`
        );
        return;
      }

      if (!recipientEmail) {
        logger.warn(`onNewMessage: Recipient ${recipientId} has no email.`);
        return;
      }

      // ── Build and send email ─────────────────────────────────────────
      const senderInfo = participantInfo[senderId] || {};
      const senderName = senderInfo.name || senderInfo.displayName || "Someone";

      const subject = `New message from ${senderName} on College Rugby Portal`;
      const bodyHtml = `
        <p><strong>${senderName}</strong> sent you a new message on College Rugby Portal.</p>
        <p style="background:#F4F4F4;padding:16px;border-radius:6px;border-left:4px solid ${LIME};margin:16px 0;">
          ${messageData.text ? messageData.text.substring(0, 200) + (messageData.text.length > 200 ? "..." : "") : "<em>(attachment)</em>"}
        </p>
        <p>Log in to read the full message and reply.</p>
      `;

      const html = buildEmail({
        subject,
        bodyHtml,
        ctaText: "View Messages",
        ctaUrl: `${PORTAL_URL}/messages`,
      });

      const sent = await sendEmail({ to: recipientEmail, subject, html });

      // ── Update rate-limit timestamp ──────────────────────────────────
      if (sent) {
        await convRef.update({
          lastEmailedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      logger.info(
        `onNewMessage: ${sent ? "Sent" : "Skipped"} notification to ${recipientEmail} for conversation ${convId}.`
      );
    } catch (err) {
      logger.error("onNewMessage error:", err);
    }
  }
);

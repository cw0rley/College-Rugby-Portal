const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const resendApiKey = defineString("RESEND_API_KEY");
const fromEmail = defineString("FROM_EMAIL", {
  default: "College Rugby Portal <notifications@collegerugbyportal.com>",
});

const PORTAL_URL = "https://collegerugbyportal.com";
const NAVY = "#0A1F44";
const LIME = "#00CC00";

// Send push notification via FCM to a user's saved tokens
async function sendPushNotification(recipientUid, { title, body, link }) {
  try {
    const userDoc = await db.collection("users").doc(recipientUid).get();
    if (!userDoc.exists) return;
    const tokens = userDoc.data().fcmTokens || [];
    if (tokens.length === 0) return;

    const message = {
      notification: { title, body },
      data: { link: link || "/" },
      webpush: {
        fcmOptions: { link: `${PORTAL_URL}${link || "/"}` },
        notification: { icon: "/logo-icon-192.png", badge: "/logo-icon-192.png" },
      },
    };

    const staleTokens = [];
    for (const token of tokens) {
      try {
        await admin.messaging().send({ ...message, token });
      } catch (err) {
        if (err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token") {
          staleTokens.push(token);
        }
      }
    }
    // Clean up stale tokens
    if (staleTokens.length > 0) {
      const remaining = tokens.filter(t => !staleTokens.includes(t));
      await db.collection("users").doc(recipientUid).update({ fcmTokens: remaining });
    }
  } catch (err) {
    logger.error("Push notification error:", err.message);
  }
}

function buildEmail({ subject, bodyHtml, ctaText, ctaUrl }) {
  return `<!DOCTYPE html>
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
              <h2 style="margin:0 0 16px;color:${NAVY};font-size:18px;">${subject}</h2>
              <div style="color:#333333;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </div>
              ${ctaText && ctaUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:${NAVY};border-radius:6px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;text-align:center;color:#999999;font-size:12px;">
              <p style="margin:0;">You received this email because you have an account on
                <a href="${PORTAL_URL}" style="color:${NAVY};">College Rugby Portal</a>.
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

async function sendEmail({ to, subject, html }) {
  const key = resendApiKey.value();
  if (!key) {
    logger.warn("Resend API key not configured — skipping email.");
    return false;
  }
  try {
    const { Resend } = require("resend");
    const resend = new Resend(key);
    await resend.emails.send({
      from: fromEmail.value(),
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error("Resend error:", err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Function 1: onNewMessage
// Sends email notification when a new message is created
// Rate limited: max 1 email per conversation per 30 minutes
// ═══════════════════════════════════════════════════════════════════════════
exports.onNewMessage = onDocumentCreated(
  "conversations/{convId}/messages/{msgId}",
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) return;

      const messageData = snap.data();
      const { convId } = event.params;
      const senderId = messageData.senderId;
      if (!senderId) return;

      // Read parent conversation
      const convRef = db.collection("conversations").doc(convId);
      const convDoc = await convRef.get();
      if (!convDoc.exists) return;

      const conv = convDoc.data();
      const participants = conv.participants || [];
      const participantInfo = conv.participantInfo || {};

      // Determine recipient
      const recipientId = participants.find((uid) => uid !== senderId);
      if (!recipientId) return;

      // Rate limit: 1 email per 30 min per conversation
      const lastEmailedAt = conv.lastEmailedAt;
      if (lastEmailedAt) {
        const elapsed = Date.now() - lastEmailedAt.toMillis();
        if (elapsed < 30 * 60 * 1000) {
          logger.info(`onNewMessage: Rate limited for ${convId}`);
          return;
        }
      }

      // Look up recipient email
      let recipientEmail;
      try {
        const userRecord = await admin.auth().getUser(recipientId);
        recipientEmail = userRecord.email;
      } catch (_) { return; }
      if (!recipientEmail) return;

      // Build and send
      const senderInfo = participantInfo[senderId] || {};
      const senderName = senderInfo.name || "Someone";
      const subject = `New message from ${senderName}`;
      const preview = messageData.text
        ? messageData.text.substring(0, 200) + (messageData.text.length > 200 ? "..." : "")
        : "(no text)";

      const html = buildEmail({
        subject,
        bodyHtml: `
          <p><strong>${senderName}</strong> sent you a message on College Rugby Portal:</p>
          <p style="background:#F4F4F4;padding:16px;border-radius:6px;border-left:4px solid ${LIME};margin:16px 0;font-style:italic;">
            "${preview}"
          </p>
          <p>Log in to read the full message and reply.</p>
        `,
        ctaText: "View Messages",
        ctaUrl: `${PORTAL_URL}/messages`,
      });

      // Send push notification (always, not rate-limited)
      await sendPushNotification(recipientId, {
        title: `Message from ${senderName}`,
        body: preview,
        link: "/messages",
      });

      const sent = await sendEmail({ to: recipientEmail, subject, html });
      if (sent) {
        await convRef.update({
          lastEmailedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      logger.error("onNewMessage error:", err);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Function 2: onPlayerInterest
// Sends email to coaches when a player favorites their program
// Rate limited: max 1 email per program per hour
// ═══════════════════════════════════════════════════════════════════════════
exports.onPlayerInterest = onDocumentCreated(
  "programInterest/{programId}/players/{playerId}",
  async (event) => {
    try {
      const snap = event.data;
      if (!snap) return;

      const playerData = snap.data();
      const { programId } = event.params;

      // Rate limit: 1 email per hour per program
      const interestRef = db.collection("programInterest").doc(programId);
      const interestDoc = await interestRef.get();
      if (interestDoc.exists) {
        const lastNotified = interestDoc.data().lastNotifiedAt;
        if (lastNotified) {
          const elapsed = Date.now() - lastNotified.toMillis();
          if (elapsed < 60 * 60 * 1000) {
            logger.info(`onPlayerInterest: Rate limited for ${programId}`);
            return;
          }
        }
      }

      // Look up program
      const programDoc = await db.collection("programs").doc(programId).get();
      if (!programDoc.exists) return;
      const program = programDoc.data();

      // Look up coach contacts
      const contactsSnap = await db
        .collection("programContacts")
        .where("programId", "==", programId)
        .get();

      const coachEmails = [];
      contactsSnap.forEach((d) => {
        if (d.data().email) coachEmails.push(d.data().email);
      });
      if (coachEmails.length === 0) return;

      // Build and send
      const playerName = playerData.firstName
        ? `${playerData.firstName} ${playerData.lastName || ""}`.trim()
        : "A player";
      const schoolName = program.school || "your program";
      const subject = `New player interest — ${schoolName}`;

      const html = buildEmail({
        subject,
        bodyHtml: `
          <p><strong>${playerName}</strong> has expressed interest in <strong>${schoolName}</strong>!</p>
          <table style="margin:16px 0;border-collapse:collapse;">
            ${playerData.position ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Position</td><td style="padding:4px 0;font-weight:600;">${playerData.position}</td></tr>` : ""}
            ${playerData.graduationYear ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Grad Year</td><td style="padding:4px 0;font-weight:600;">${playerData.graduationYear}</td></tr>` : ""}
            ${playerData.gpa ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">GPA</td><td style="padding:4px 0;font-weight:600;">${playerData.gpa}</td></tr>` : ""}
            ${playerData.city ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Location</td><td style="padding:4px 0;font-weight:600;">${playerData.city}</td></tr>` : ""}
          </table>
          <p>Log in to view this player's full profile.</p>
        `,
        ctaText: "View Interested Players",
        ctaUrl: `${PORTAL_URL}/coach`,
      });

      // Send push to coaches who are users
      const coachUsersSnap = await db.collection("users")
        .where("isCoach", "==", true).get();
      for (const userDoc of coachUsersSnap.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email?.toLowerCase();
        if (userEmail && coachEmails.map(e => e.toLowerCase()).includes(userEmail)) {
          await sendPushNotification(userDoc.id, {
            title: `New player interest`,
            body: `${playerName} is interested in ${schoolName}`,
            link: "/coach",
          });
        }
      }

      for (const email of coachEmails) {
        await sendEmail({ to: email, subject, html });
      }

      await interestRef.set(
        { lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );

      logger.info(`onPlayerInterest: Notified ${coachEmails.length} coach(es) for ${programId}`);
    } catch (err) {
      logger.error("onPlayerInterest error:", err);
    }
  }
);

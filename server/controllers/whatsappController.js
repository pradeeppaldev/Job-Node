import Job from "../models/Job.js";
import User from "../models/User.js";
import WhatsAppNotification from "../models/WhatsAppNotification.js";
import { sendJobAlertWhatsApp } from "../services/whatsappService.js";
import { calculateJobMatchScore } from "../services/whatsappMatchingService.js";

/**
 * Meta Webhook Verification (GET /api/whatsapp/webhook)
 */
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const configuredToken = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();
  const receivedToken = typeof token === "string" ? token.trim() : "";

  const isModeSubscribe = mode === "subscribe";
  const isTokenMatch = configuredToken !== "" && receivedToken === configuredToken;

  console.log(`[WhatsAppWebhook GET Verification Diagnosis]`, {
    mode: mode || "MISSING",
    isModeSubscribe,
    receivedTokenExists: Boolean(token),
    receivedTokenLength: receivedToken.length,
    configuredTokenExists: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    configuredTokenLength: configuredToken.length,
    isTokenMatch,
    challengeExists: Boolean(challenge),
  });

  if (!configuredToken) {
    console.error("[WhatsAppWebhook] WHATSAPP_VERIFY_TOKEN is missing or empty in server environment.");
    return res.status(500).send("Webhook verify token not configured");
  }

  if (isModeSubscribe && isTokenMatch) {
    console.log("[WhatsAppWebhook] Webhook GET verification successful. Returning hub.challenge.");
    return res.status(200).send(challenge);
  } else {
    console.warn(
      `[WhatsAppWebhook] Webhook verification failed. Reason: ${
        !isModeSubscribe ? "Invalid hub.mode (expected 'subscribe')" : "Token mismatch"
      }`
    );
    return res.status(403).send("Verification failed");
  }
};

/**
 * Meta Webhook Event Handler (POST /api/whatsapp/webhook)
 */
export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (!body || body.object !== "whatsapp_business_account") {
      // Return 200 for unrecognized objects or heartbeats to satisfy Meta
      return res.status(200).json({ status: "ignored" });
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // Process status updates (accepted -> sent -> delivered -> read / failed)
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const statusItem of statuses) {
          const messageId = statusItem.id;
          const status = statusItem.status; // 'sent', 'delivered', 'read', 'failed'
          const recipientId = statusItem.recipient_id || "";

          const maskedRecipient = recipientId.length >= 6
            ? `${recipientId.slice(0, 4)}****${recipientId.slice(-2)}`
            : recipientId;

          console.log(
            `[WhatsAppWebhook] Received status update: '${status}' for message ID: ${messageId} (Recipient: ${maskedRecipient})`
          );

          // Extract error details if message failed
          let errorCode = "";
          let errorMessage = "";
          if (Array.isArray(statusItem.errors) && statusItem.errors.length > 0) {
            const errObj = statusItem.errors[0];
            errorCode = errObj.code ? String(errObj.code) : "";
            errorMessage =
              errObj.message ||
              errObj.title ||
              errObj.error_data?.details ||
              JSON.stringify(statusItem.errors);
          }

          // Match by metaMessageId or messageId
          const notification = await WhatsAppNotification.findOne({
            $or: [{ metaMessageId: messageId }, { messageId }],
          });

          if (notification) {
            notification.status = status;
            notification.statusUpdatedAt = new Date();
            if (messageId && !notification.metaMessageId) {
              notification.metaMessageId = messageId;
            }

            if (status === "failed" || errorCode || errorMessage) {
              notification.errorCode = errorCode;
              notification.errorMessage = errorMessage;
              notification.error = errorMessage || `Meta delivery error (code ${errorCode})`;
              console.error(
                `[WhatsAppWebhook] Delivery FAILED for Message ID: ${messageId} | Code: ${errorCode} | Error: ${errorMessage}`
              );
            } else {
              console.log(
                `[WhatsAppWebhook] Notification document updated: ID ${notification._id} -> Status '${status}'`
              );
            }

            await notification.save();
          } else {
            console.warn(
              `[WhatsAppWebhook] No matching notification document found in DB for Meta message ID: ${messageId}`
            );
          }
        }
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[WhatsAppWebhook] Exception handling webhook event:", err.message);
    // Always return HTTP 200 to prevent Meta from disabling the webhook on server-side error
    return res.status(200).json({ status: "error", error: err.message });
  }
};

/**
 * Single Candidate Manual Test Send (POST /api/whatsapp/test-send)
 * Protected by protectCompany middleware.
 * Validates candidate user and job exist in DB before sending.
 */
export const testSendNotification = async (req, res) => {
  const { userId, jobId } = req.body;

  if (!userId || !jobId) {
    return res.json({
      success: false,
      message: "Both userId and jobId are required for test send.",
    });
  }

  try {
    // 1. Validate Candidate User from DB
    const user = await User.findById(userId);
    if (!user) {
      return res.json({
        success: false,
        message: `Candidate user with ID '${userId}' not found in database.`,
      });
    }

    if (!user.phoneNumber) {
      return res.json({
        success: false,
        message: `Candidate user '${user.name}' does not have a phone number saved. Please update candidate profile first.`,
      });
    }

    // 2. Validate Job from DB
    const job = await Job.findById(jobId).populate("companyId", "name email image");
    if (!job) {
      return res.json({
        success: false,
        message: `Job with ID '${jobId}' not found in database.`,
      });
    }

    // 3. Calculate Match Score
    const matchResult = calculateJobMatchScore(user, job);

    console.log(`[WhatsAppTestSend] Manually triggering test notification for Candidate '${user.name}' and Job '${job.title}'. Match Score: ${matchResult.score}/100`);

    // 4. Send Real Meta WhatsApp Template Notification
    const sendResult = await sendJobAlertWhatsApp({ user, job });

    // 5. Save/Update Notification Record
    await WhatsAppNotification.findOneAndUpdate(
      { userId: user._id, jobId: job._id },
      {
        userId: user._id,
        jobId: job._id,
        phoneNumber: user.phoneNumber,
        matchScore: matchResult.score,
        status: "accepted",
        messageId: sendResult.messageId,
        metaMessageId: sendResult.messageId,
        sentAt: new Date(),
        statusUpdatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: `Test WhatsApp notification sent successfully to candidate '${user.name}' (${user.phoneNumber})!`,
      matchScore: matchResult.score,
      matchBreakdown: matchResult.breakdown,
      messageId: sendResult.messageId,
      metaResponse: sendResult.responseData,
    });
  } catch (error) {
    console.error("[WhatsAppTestSend] Test send failed:", error.message);
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

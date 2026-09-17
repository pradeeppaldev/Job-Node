import Job from "../models/Job.js";
import User from "../models/User.js";
import WhatsAppNotification from "../models/WhatsAppNotification.js";
import { calculateJobMatchScore } from "./whatsappMatchingService.js";
import { sendJobAlertWhatsApp, normalizePhoneNumber } from "./whatsappService.js";

/**
 * Processes WhatsApp Job Alerts for a newly created job.
 * Only executes for newly created jobs.
 */
export async function processNewJobAlerts(jobId) {
  try {
    const job = await Job.findById(jobId).populate("companyId", "name email image");
    if (!job) {
      console.error(`[WhatsAppJobAlertService] Job not found: ${jobId}`);
      return { success: false, message: "Job not found" };
    }

    // Find all applicant users who explicitly opted in and provided a phone number
    const eligibleUsers = await User.find({
      whatsappOptIn: true,
      phoneNumber: { $exists: true, $ne: "" },
    });

    console.log(
      `[WhatsAppJobAlertService] Found ${eligibleUsers.length} opt-in applicant candidate(s) for job '${job.title}'`
    );

    const autoAlertsEnabled =
      process.env.WHATSAPP_AUTO_ALERTS_ENABLED === "true";

    const results = [];

    for (const user of eligibleUsers) {
      try {
        const rawPhone = user.phoneNumber;
        const normalizedPhone = normalizePhoneNumber(rawPhone);

        if (!normalizedPhone || normalizedPhone.length < 8) {
          console.warn(`[WhatsAppJobAlertService] Skipping user ${user._id}: Invalid phone number '${rawPhone}'`);
          continue;
        }

        // Calculate match score
        const { score, breakdown } = calculateJobMatchScore(user, job);

        console.log(`[WhatsAppJobAlertService] Candidate ${user.name} (${user._id}) match score: ${score}/100`);

        // Check notification threshold (>= 60)
        if (score < 60) {
          console.log(`[WhatsAppJobAlertService] Candidate ${user.name} score ${score} below threshold (60). Skipping.`);
          continue;
        }

        // Check if notification already exists to prevent duplicates
        const existingNotification = await WhatsAppNotification.findOne({
          userId: user._id,
          jobId: job._id,
        });

        if (existingNotification) {
          console.log(`[WhatsAppJobAlertService] Notification already exists for user ${user._id} and job ${job._id}. Skipping.`);
          continue;
        }

        // Create notification record
        const notification = new WhatsAppNotification({
          userId: user._id,
          jobId: job._id,
          phoneNumber: normalizedPhone,
          matchScore: score,
          status: "pending",
        });

        await notification.save();

        if (autoAlertsEnabled) {
          // Send real WhatsApp notification via Meta API
          try {
            const sendResult = await sendJobAlertWhatsApp({ user, job });
            notification.status = "accepted";
            notification.messageId = sendResult.messageId;
            notification.metaMessageId = sendResult.messageId;
            notification.sentAt = new Date();
            notification.statusUpdatedAt = new Date();
            await notification.save();

            results.push({
              userId: user._id,
              userName: user.name,
              score,
              status: "accepted",
              messageId: sendResult.messageId,
            });
          } catch (sendErr) {
            console.error(`[WhatsAppJobAlertService] Failed to send WhatsApp to ${user.name}:`, sendErr.message);
            notification.status = "failed";
            notification.error = sendErr.message;
            await notification.save();

            results.push({
              userId: user._id,
              userName: user.name,
              score,
              status: "failed",
              error: sendErr.message,
            });
          }
        } else {
          // WHATSAPP_AUTO_ALERTS_ENABLED is false (Safety Flag active)
          console.log(
            `[WhatsAppJobAlertService] WHATSAPP_AUTO_ALERTS_ENABLED=false. Notification created as 'pending' without sending real message.`
          );
          results.push({
            userId: user._id,
            userName: user.name,
            score,
            status: "pending (auto-alerts disabled)",
          });
        }
      } catch (userErr) {
        console.error(`[WhatsAppJobAlertService] Error processing candidate ${user._id}:`, userErr.message);
        // Continue processing next candidates without failing the whole process
      }
    }

    return {
      success: true,
      totalMatched: results.length,
      autoAlertsEnabled,
      results,
    };
  } catch (error) {
    console.error("[WhatsAppJobAlertService] Fatal error processing job alerts:", error);
    return { success: false, message: error.message };
  }
}

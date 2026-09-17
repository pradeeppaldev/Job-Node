import fetch from "node-fetch";
import Company from "../models/Company.js";

/**
 * Normalizes phone number to E.164 digits format required by Meta WhatsApp Cloud API
 * e.g. "+91 98765-43210" -> "919876543210"
 */
export function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return "";
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, "");
  return digits;
}

/**
 * Strips HTML tags and truncates description safely
 */
export function formatShortDescription(text, maxLength = 200) {
  if (!text || typeof text !== "string") return "N/A";
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength - 3) + "...";
}

/**
 * Sanitizes strings to prevent accidental token leakage in logs or error messages
 */
function sanitizeLog(text, token) {
  if (!text || typeof text !== "string") return text;
  if (token && typeof token === "string" && token.length > 5) {
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(escapedToken, "g"), "[REDACTED_ACCESS_TOKEN]");
  }
  return text;
}

/**
 * Sends Meta WhatsApp Cloud API template message for job alerts
 */
export async function sendJobAlertWhatsApp({ user, job }) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION;
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG;

  // Strict Environment Checks (No hardcoded fallback for API Version or Credentials)
  if (!accessToken || !accessToken.trim()) {
    throw new Error(
      "WhatsApp Meta API credential missing: WHATSAPP_ACCESS_TOKEN is required in server .env."
    );
  }

  if (!phoneNumberId || !phoneNumberId.trim()) {
    throw new Error(
      "WhatsApp Meta API credential missing: WHATSAPP_PHONE_NUMBER_ID is required in server .env."
    );
  }

  if (!apiVersion || !apiVersion.trim()) {
    throw new Error(
      "WhatsApp Meta API version missing: WHATSAPP_API_VERSION is required in server .env (e.g. WHATSAPP_API_VERSION=\"v21.0\")."
    );
  }

  if (!templateLang || !templateLang.trim()) {
    throw new Error(
      "WhatsApp Meta template language code missing: WHATSAPP_TEMPLATE_LANG is required in server .env (e.g. WHATSAPP_TEMPLATE_LANG=\"en_US\")."
    );
  }

  const rawPhone = user.phoneNumber || user.phone;
  const normalizedPhone = normalizePhoneNumber(rawPhone);

  if (!normalizedPhone || normalizedPhone.length < 8) {
    throw new Error(
      `Invalid recipient phone number '${rawPhone}'. Must be in E.164 compatible digits format.`
    );
  }

  // 1. Candidate Name
  const candidateName = user.name || "Candidate";

  // 2. Job Title
  const jobTitle = job.title || "Job Opportunity";

  // 3. Resolve Real Company Name from database / populated reference
  let companyName = "";
  if (job.companyId && typeof job.companyId === "object" && job.companyId.name) {
    companyName = job.companyId.name;
  } else if (job.companyName && typeof job.companyName === "string" && job.companyName.trim()) {
    companyName = job.companyName.trim();
  } else if (job.companyId) {
    try {
      const companyDoc = await Company.findById(job.companyId).select("name");
      if (companyDoc && companyDoc.name) {
        companyName = companyDoc.name;
      }
    } catch (err) {
      console.warn(`[WhatsAppService] Could not fetch company by ID '${job.companyId}':`, err.message);
    }
  }

  if (!companyName || !companyName.trim()) {
    throw new Error(
      `Company name could not be resolved from database for Job ID '${job._id || job.id}'. Please check job and company records.`
    );
  }

  // 4. Location
  const jobLocation = job.location || "Remote / Various Locations";

  // 5. Salary (Formatted using Indian Rupee notation matching Job Node context)
  let salaryStr = "Not Disclosed";
  if (job.salary) {
    const numericSalary = Number(job.salary);
    if (!isNaN(numericSalary) && numericSalary > 0) {
      salaryStr = `₹${numericSalary.toLocaleString("en-IN")}`;
    } else {
      salaryStr = String(job.salary).trim();
    }
  }

  // 6. Skills
  const skillsStr =
    Array.isArray(job.skills) && job.skills.length > 0
      ? job.skills.join(", ")
      : "General Qualifications";

  // 7. Short Description
  const shortDesc = formatShortDescription(job.description);

  // 8. Job Application URL & Dynamic Button ID
  const jobId = job._id ? job._id.toString() : String(job.id);
  const jobUrl = `https://job-node.vercel.app/apply-job/${jobId}`;

  // Build approved template payload matching Meta WhatsApp Cloud API specifications
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedPhone,
    type: "template",
    template: {
      name: "job_node_new_job_alert",
      language: {
        code: templateLang.trim(),
      },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: candidateName },
            { type: "text", text: jobTitle },
            { type: "text", text: companyName },
            { type: "text", text: jobLocation },
            { type: "text", text: salaryStr },
            { type: "text", text: skillsStr },
            { type: "text", text: shortDesc },
            { type: "text", text: jobUrl },
          ],
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            { type: "text", text: jobId },
          ],
        },
      ],
    },
  };

  const endpoint = `https://graph.facebook.com/${apiVersion.trim()}/${phoneNumberId.trim()}/messages`;

  const maskedPhone = normalizedPhone.length >= 6 
    ? `${normalizedPhone.slice(0, 4)}****${normalizedPhone.slice(-2)}`
    : normalizedPhone;

  console.log(`[WhatsAppService] Sending Meta template 'job_node_new_job_alert' to candidate '${candidateName}' (${maskedPhone})...`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      const rawErrorMsg =
        responseData.error?.message ||
        `HTTP Error ${response.status} from Meta Graph API`;
      
      // Sanitize log error to guarantee access token is never exposed
      const safeErrorMsg = sanitizeLog(rawErrorMsg, accessToken);
      console.error(`[WhatsAppService] Meta API Failure (${response.status}):`, safeErrorMsg);
      throw new Error(`Meta API Error: ${safeErrorMsg}`);
    }

    const messageId = responseData.messages?.[0]?.id || "";
    console.log(`[WhatsAppService] Template sent successfully. Message ID: ${messageId}`);

    return {
      success: true,
      messageId,
      responseData,
    };
  } catch (err) {
    const safeMsg = sanitizeLog(err.message, accessToken);
    throw new Error(safeMsg);
  }
}

import express from "express";
import {
  verifyWebhook,
  handleWebhook,
  testSendNotification,
} from "../controllers/whatsappController.js";
import { protectCompany } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Meta Webhook Verification (GET)
router.get("/webhook", verifyWebhook);

// Meta Webhook Events (POST)
router.post("/webhook", handleWebhook);

// Protected Single Candidate Test Notification (POST)
router.post("/test-send", protectCompany, testSendNotification);

export default router;

import express from "express";
import multer from "multer";
import { textToSpeech, speechToText, getVoiceHealth } from "../controllers/voiceController.js";

const router = express.Router();

// Strictly in-memory storage: raw candidate audio is never written to disk
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per audio chunk
});

router.get("/health", getVoiceHealth);
router.post("/tts", textToSpeech);
router.post("/stt", memoryUpload.single("audio"), speechToText);

export default router;

import { synthesizeSpeech, transcribeAudio } from "../services/sarvamService.js";

/**
 * POST /api/voice/tts
 * Synthesizes AI question text using Sarvam Bulbul v4 Flash.
 * Signals fallbackRequired: true cleanly if Sarvam is unavailable.
 */
export const textToSpeech = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { text, language = "en-IN" } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, message: "Text is required for speech synthesis." });
    }

    const result = await synthesizeSpeech({ text, language });
    return res.json({
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
      language: result.language,
    });
  } catch (error) {
    console.warn("[VoiceController] Sarvam TTS fallback triggered:", error.message);
    return res.status(503).json({
      success: false,
      fallbackRequired: true,
      service: "tts",
      reason: error.message || "SARVAM_TTS_UNAVAILABLE",
    });
  }
};

/**
 * POST /api/voice/stt
 * Transcribes in-memory audio chunk using Sarvam Saaras v4.
 * Never persists raw audio.
 */
export const speechToText = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ success: false, message: "Audio file is required." });
    }

    const language = req.body?.language || "en-IN";
    const result = await transcribeAudio({
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype || "audio/webm",
      filename: req.file.originalname || "speech.webm",
      language,
    });

    return res.json({
      success: true,
      transcript: result.transcript,
      languageCode: result.languageCode,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    console.warn("[VoiceController] Sarvam STT fallback triggered:", error.message);
    return res.status(503).json({
      success: false,
      fallbackRequired: true,
      service: "stt",
      reason: error.message || "SARVAM_STT_UNAVAILABLE",
    });
  }
};

/**
 * GET /api/voice/health
 * Safe status check without exposing any credentials
 */
export const getVoiceHealth = async (req, res) => {
  return res.json({
    success: true,
    sarvamConfigured: Boolean(process.env.SARVAM_API_KEY),
    supportedLanguages: ["en-IN", "hi-IN", "mr-IN"],
  });
};

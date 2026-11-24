// Sarvam AI Voice Provider Service (Bulbul v4 Flash TTS & Saaras v4 STT)
// All credentials remain strictly on the backend.

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

const SPEAKER_BY_LANG = {
  "en-IN": "simran_en_conversation",
  "hi-IN": "sanchita_hi_interview",
  "mr-IN": "ishita_mr_conversational",
};

const getSarvamKey = () => process.env.SARVAM_API_KEY || "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to fetch with timeout via AbortController
 */
async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Text-to-Speech using Sarvam Bulbul v4 Flash
 */
export async function synthesizeSpeech({ text, language = "en-IN" }) {
  const apiKey = getSarvamKey();
  if (!apiKey) {
    throw new Error("SARVAM_UNCONFIGURED");
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    throw new Error("EMPTY_TEXT");
  }

  const targetLang = SPEAKER_BY_LANG[language] ? language : "en-IN";
  const speaker = SPEAKER_BY_LANG[targetLang];

  // Bulbul v4 Flash handles up to ~500-1000 chars cleanly; trim safely if needed
  const cleanText = text.trim().slice(0, 1500);

  let lastErr = null;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetchWithTimeout(
        SARVAM_TTS_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-subscription-key": apiKey,
          },
          body: JSON.stringify({
            text: cleanText,
            target_language_code: targetLang,
            model: "bulbul:v4-flash",
            speaker,
          }),
        },
        8000
      );

      if (res.status === 401 || res.status === 403) {
        throw new Error("SARVAM_AUTH_ERROR");
      }
      if (res.status === 429) {
        throw new Error("SARVAM_RATE_LIMIT");
      }
      if (res.status >= 500) {
        if (attempt === 0) {
          await sleep(400);
          continue;
        }
        throw new Error("SARVAM_SERVER_ERROR");
      }
      if (!res.ok) {
        throw new Error(`SARVAM_HTTP_${res.status}`);
      }

      const data = await res.json();
      const audioBase64 = data?.audios?.[0];
      if (!audioBase64) {
        throw new Error("SARVAM_EMPTY_AUDIO");
      }

      return {
        audioBase64,
        mimeType: "audio/wav",
        provider: "sarvam",
        model: "bulbul:v4-flash",
        language: targetLang,
      };
    } catch (err) {
      lastErr = err;
      if (err.name === "AbortError") {
        lastErr = new Error("SARVAM_TIMEOUT");
      }
      if (["SARVAM_AUTH_ERROR", "SARVAM_RATE_LIMIT"].includes(lastErr.message)) {
        break;
      }
    }
  }

  throw lastErr || new Error("SARVAM_TTS_FAILED");
}

/**
 * Speech-to-Text using Sarvam Saaras v4
 * Processes in-memory buffer only; never stores raw audio.
 */
export async function transcribeAudio({
  audioBuffer,
  mimeType = "audio/webm",
  filename = "speech.webm",
  language = "en-IN",
}) {
  const apiKey = getSarvamKey();
  if (!apiKey) {
    throw new Error("SARVAM_UNCONFIGURED");
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("EMPTY_AUDIO");
  }

  const targetLang = ["en-IN", "hi-IN", "mr-IN"].includes(language) ? language : "en-IN";

  let lastErr = null;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const form = new FormData();
      form.append("file", new Blob([audioBuffer], { type: mimeType }), filename);
      form.append("model", "saaras:v4");
      form.append("language_code", targetLang);

      const res = await fetchWithTimeout(
        SARVAM_STT_URL,
        {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
          },
          body: form,
        },
        15000
      );

      if (res.status === 401 || res.status === 403) {
        throw new Error("SARVAM_AUTH_ERROR");
      }
      if (res.status === 429) {
        throw new Error("SARVAM_RATE_LIMIT");
      }
      if (res.status >= 500) {
        if (attempt === 0) {
          await sleep(400);
          continue;
        }
        throw new Error("SARVAM_SERVER_ERROR");
      }
      if (!res.ok) {
        throw new Error(`SARVAM_HTTP_${res.status}`);
      }

      const data = await res.json();
      if (typeof data?.transcript !== "string") {
        throw new Error("SARVAM_INVALID_TRANSCRIPT");
      }

      return {
        transcript: data.transcript.trim(),
        languageCode: data.language_code || targetLang,
        provider: "sarvam",
        model: "saaras:v4",
      };
    } catch (err) {
      lastErr = err;
      if (err.name === "AbortError") {
        lastErr = new Error("SARVAM_TIMEOUT");
      }
      if (["SARVAM_AUTH_ERROR", "SARVAM_RATE_LIMIT"].includes(lastErr.message)) {
        break;
      }
    }
  }

  throw lastErr || new Error("SARVAM_STT_FAILED");
}

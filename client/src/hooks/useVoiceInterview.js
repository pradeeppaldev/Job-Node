import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const SILENCE_DURATION_MS = 5000; // 5 seconds of continuous silence auto-submits
const INITIAL_NO_SPEECH_TIMEOUT_MS = 20000; // 20s before prompting if candidate hasn't spoken yet
const VOLUME_SPEECH_THRESHOLD = 14; // RMS threshold (0-100 scale) for speech activity
const SARVAM_CHUNK_INTERVAL_MS = 4500; // Flush standalone audio segment to Sarvam STT every 4.5s while speaking
const PROVIDER_COOLDOWN_MS = 60000; // Wait 60s before probing Sarvam again after a failure

const BROWSER_LANG_MAP = {
  'en-IN': 'en-IN',
  'hi-IN': 'hi-IN',
  'mr-IN': 'mr-IN',
};

export const useVoiceInterview = ({
  currentQuestion,
  turnNumber,
  isSubmitting,
  isCompleted,
  onAutoSubmit,
  backendUrl,
  getToken,
  language = 'en-IN',
}) => {
  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const speechSynthesisSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const speechRecognitionSupported = Boolean(SpeechRecognitionAPI);
  const mediaRecorderSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;

  // Independent TTS & STT provider states
  const [ttsProvider, setTtsProvider] = useState('sarvam'); // 'sarvam' | 'browser' | 'none'
  const [sttProvider, setSttProvider] = useState('sarvam'); // 'sarvam' | 'browser' | 'manual'
  const [fallbackNotice, setFallbackNotice] = useState('');

  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [micError, setMicError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [silenceRemainingMs, setSilenceRemainingMs] = useState(null);
  const [noSpeechPrompt, setNoSpeechPrompt] = useState(false);

  // Refs for async synchronization & cleanup
  const ttsProviderRef = useRef('sarvam');
  const sttProviderRef = useRef('sarvam');
  const ttsCooldownUntilRef = useRef(0);
  const sttCooldownUntilRef = useRef(0);

  const audioPlayerRef = useRef(null);
  const audioObjectUrlRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const chunkFlushTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const monitorIntervalRef = useRef(null);

  const finalTranscriptRef = useRef('');
  const interimTextRef = useRef('');
  const hasSpokenRef = useRef(false);
  const lastSpeechTimeRef = useRef(Date.now());
  const listeningStartedAtRef = useRef(Date.now());
  const hasSubmittedTurnRef = useRef(false);
  const isListeningRef = useRef(false);
  const isPausedRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const isSubmittingRef = useRef(isSubmitting);
  const isFlushingFinalRef = useRef(false);
  const speakRequestIdRef = useRef(0);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const updateTranscriptManually = useCallback((newText) => {
    finalTranscriptRef.current = newText;
    interimTextRef.current = '';
    setTranscript(newText);
    setInterimText('');
    if (newText.trim().length > 0) {
      hasSpokenRef.current = true;
      lastSpeechTimeRef.current = Date.now();
    }
  }, []);

  const stopAudioPlayer = useCallback(() => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      } catch {
        // ignore audio stop error
      }
      audioPlayerRef.current = null;
    }
    if (audioObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(audioObjectUrlRef.current);
      } catch {
        // ignore revoke error
      }
      audioObjectUrlRef.current = null;
    }
  }, []);

  const stopAiSpeech = useCallback(() => {
    speakRequestIdRef.current += 1;
    stopAudioPlayer();
    if (speechSynthesisSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore cancel error
      }
    }
    setIsAiSpeaking(false);
  }, [speechSynthesisSupported, stopAudioPlayer]);

  const stopListeningResources = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setSilenceRemainingMs(null);
    setAudioLevel(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }

    if (chunkFlushTimerRef.current) {
      clearInterval(chunkFlushTimerRef.current);
      chunkFlushTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore recorder stop error
      }
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore recognition abort error
      }
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      } catch {
        // ignore audioContext close error
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    stopAiSpeech();
    stopListeningResources();
  }, [stopAiSpeech, stopListeningResources]);

  // Transcribe a complete audio Blob via backend Sarvam Saaras v4 proxy
  const sendBlobToSarvamStt = useCallback(
    async (blob) => {
      if (!blob || blob.size < 800 || !backendUrl || !getToken) {
        return { ok: true, transcript: '' };
      }
      setIsTranscribing(true);
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append('audio', blob, 'speech.webm');
        formData.append('language', language);

        const { data } = await axios.post(`${backendUrl}/api/voice/stt`, formData, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 16000,
        });

        if (data?.success && typeof data.transcript === 'string') {
          return { ok: true, transcript: data.transcript.trim() };
        }
        return { ok: false, reason: 'INVALID_RESPONSE' };
      } catch (err) {
        return { ok: false, reason: err?.message || 'SARVAM_STT_ERROR' };
      } finally {
        setIsTranscribing(false);
      }
    },
    [backendUrl, getToken, language]
  );

  // Switch STT to browser fallback (or manual) without losing transcript
  const activateSttFallback = useCallback(() => {
    sttCooldownUntilRef.current = Date.now() + PROVIDER_COOLDOWN_MS;
    setFallbackNotice('Using browser voice because the primary voice service is temporarily unavailable.');

    if (speechRecognitionSupported) {
      sttProviderRef.current = 'browser';
      setSttProvider('browser');
      return 'browser';
    } else {
      sttProviderRef.current = 'manual';
      setSttProvider('manual');
      setManualMode(true);
      return 'manual';
    }
  }, [speechRecognitionSupported]);

  // Start Browser SpeechRecognition on an active stream
  const startBrowserSpeechRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI || recognitionRef.current) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = BROWSER_LANG_MAP[language] || 'en-IN';

    recognition.onresult = (event) => {
      if (isMicMutedRef.current || isPausedRef.current) return;

      let interim = '';
      let newFinal = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinal = (newFinal + ' ' + piece).replace(/\s+/g, ' ').trim();
        } else {
          interim += piece;
        }
      }

      finalTranscriptRef.current = newFinal;
      interimTextRef.current = interim;
      setTranscript(newFinal);
      setInterimText(interim);

      if ((newFinal + interim).trim().length > 0) {
        hasSpokenRef.current = true;
        lastSpeechTimeRef.current = Date.now();
        setNoSpeechPrompt(false);
        setSilenceRemainingMs(SILENCE_DURATION_MS);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Microphone permission denied. Switched to manual text mode.');
        setManualMode(true);
        sttProviderRef.current = 'manual';
        setSttProvider('manual');
        stopListeningResources();
      }
    };

    recognition.onend = () => {
      if (
        isListeningRef.current &&
        sttProviderRef.current === 'browser' &&
        !isPausedRef.current &&
        !isSubmittingRef.current &&
        !hasSubmittedTurnRef.current
      ) {
        try {
          recognition.start();
        } catch {
          // ignore restart error
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setManualMode(true);
    }
  }, [SpeechRecognitionAPI, language, stopListeningResources]);

  // Helper to start a standalone MediaRecorder segment for Sarvam STT
  const startSarvamRecorderSegment = useCallback(
    (stream) => {
      if (!mediaRecorderSupported || !stream || !isListeningRef.current) return;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = recordedChunksRef.current;
        recordedChunksRef.current = [];
        if (!chunks.length) return;

        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });

        // Only send to Sarvam if candidate actually spoke or is flushing final
        if ((hasSpokenRef.current || isFlushingFinalRef.current) && !isMicMutedRef.current) {
          const result = await sendBlobToSarvamStt(blob);
          if (result.ok) {
            if (result.transcript) {
              const updated = (finalTranscriptRef.current + ' ' + result.transcript)
                .replace(/\s+/g, ' ')
                .trim();
              finalTranscriptRef.current = updated;
              setTranscript(updated);
            }
          } else {
            // Sarvam STT failed: switch independently to Browser STT (preserving transcript!)
            const nextMode = activateSttFallback();
            if (nextMode === 'browser' && isListeningRef.current && !hasSubmittedTurnRef.current) {
              startBrowserSpeechRecognition();
            } else if (nextMode === 'manual') {
              stopListeningResources();
            }
          }
        }
      };

      try {
        recorder.start();
        mediaRecorderRef.current = recorder;
      } catch {
        activateSttFallback();
      }
    },
    [
      activateSttFallback,
      mediaRecorderSupported,
      sendBlobToSarvamStt,
      startBrowserSpeechRecognition,
      stopListeningResources,
    ]
  );

  // Flush final Sarvam audio segment before submitting answer
  const flushAndSubmitSarvam = useCallback(async () => {
    if (isFlushingFinalRef.current || hasSubmittedTurnRef.current) return;
    isFlushingFinalRef.current = true;

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      await new Promise((resolve) => {
        const originalOnStop = recorder.onstop;
        recorder.onstop = async (ev) => {
          if (originalOnStop) await originalOnStop(ev);
          resolve();
        };
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    }

    isFlushingFinalRef.current = false;
    const finalText = (finalTranscriptRef.current + ' ' + interimTextRef.current).trim();
    if (finalText.length > 0 && !hasSubmittedTurnRef.current) {
      hasSubmittedTurnRef.current = true;
      stopListeningResources();
      onAutoSubmit(finalText);
    }
  }, [onAutoSubmit, stopListeningResources]);

  // Start listening using active STT provider (Sarvam primary, Browser fallback)
  const startListening = useCallback(async () => {
    if (
      isPausedRef.current ||
      isSubmittingRef.current ||
      isCompleted ||
      hasSubmittedTurnRef.current ||
      manualMode
    ) {
      return;
    }

    stopAiSpeech();
    stopListeningResources();

    // Check if Sarvam STT cooldown expired for a fresh question
    if (
      sttProviderRef.current === 'browser' &&
      Date.now() > sttCooldownUntilRef.current &&
      mediaRecorderSupported &&
      backendUrl
    ) {
      sttProviderRef.current = 'sarvam';
      setSttProvider('sarvam');
    }

    // If neither Sarvam (no MediaRecorder/backend) nor Browser SpeechRecognition is available
    if (!mediaRecorderSupported && !speechRecognitionSupported) {
      sttProviderRef.current = 'manual';
      setSttProvider('manual');
      setManualMode(true);
      return;
    }

    if (sttProviderRef.current === 'sarvam' && (!mediaRecorderSupported || !backendUrl)) {
      activateSttFallback();
    }

    try {
      setMicError('');
      setNoSpeechPrompt(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      isListeningRef.current = true;
      listeningStartedAtRef.current = Date.now();
      lastSpeechTimeRef.current = Date.now();
      setIsListening(true);

      if (sttProviderRef.current === 'sarvam') {
        startSarvamRecorderSegment(stream);
        // Periodically cycle standalone WebM segments while candidate is speaking
        chunkFlushTimerRef.current = setInterval(() => {
          if (
            isListeningRef.current &&
            sttProviderRef.current === 'sarvam' &&
            hasSpokenRef.current &&
            !isPausedRef.current &&
            !isMicMutedRef.current &&
            mediaRecorderRef.current?.state === 'recording'
          ) {
            mediaRecorderRef.current.stop();
            startSarvamRecorderSegment(stream);
          }
        }, SARVAM_CHUNK_INTERVAL_MS);
      } else if (sttProviderRef.current === 'browser') {
        startBrowserSpeechRecognition();
      }

      // Real-time Web Audio API Volume & Speech Activity loop
      const updateAudioMeter = () => {
        if (!analyserRef.current || !isListeningRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalized = Math.min(100, Math.round((rms / 128) * 100));
        setAudioLevel(isMicMutedRef.current ? 0 : normalized);

        if (!isMicMutedRef.current && normalized >= VOLUME_SPEECH_THRESHOLD) {
          hasSpokenRef.current = true;
          lastSpeechTimeRef.current = Date.now();
          setNoSpeechPrompt(false);
        }

        animFrameRef.current = requestAnimationFrame(updateAudioMeter);
      };
      animFrameRef.current = requestAnimationFrame(updateAudioMeter);

      // 5-second Silence Detection & Initial No-Speech Timeout Monitor
      monitorIntervalRef.current = setInterval(() => {
        if (
          !isListeningRef.current ||
          isPausedRef.current ||
          isSubmittingRef.current ||
          hasSubmittedTurnRef.current
        ) {
          return;
        }

        const now = Date.now();

        if (isMicMutedRef.current) {
          lastSpeechTimeRef.current = now;
          setSilenceRemainingMs(null);
          return;
        }

        if (!hasSpokenRef.current) {
          setSilenceRemainingMs(null);
          if (now - listeningStartedAtRef.current >= INITIAL_NO_SPEECH_TIMEOUT_MS) {
            setNoSpeechPrompt(true);
          }
          return;
        }

        const elapsedSilence = now - lastSpeechTimeRef.current;
        const remaining = Math.max(0, SILENCE_DURATION_MS - elapsedSilence);
        setSilenceRemainingMs(remaining);

        if (elapsedSilence >= SILENCE_DURATION_MS) {
          if (sttProviderRef.current === 'sarvam') {
            flushAndSubmitSarvam();
          } else {
            const combined = (finalTranscriptRef.current + ' ' + interimTextRef.current).trim();
            if (combined.length > 0 && !hasSubmittedTurnRef.current) {
              hasSubmittedTurnRef.current = true;
              stopListeningResources();
              onAutoSubmit(combined);
            }
          }
        }
      }, 150);
    } catch {
      setMicError('Could not access microphone. Please check permissions or use manual text input.');
      setManualMode(true);
      sttProviderRef.current = 'manual';
      setSttProvider('manual');
      stopListeningResources();
    }
  }, [
    activateSttFallback,
    backendUrl,
    flushAndSubmitSarvam,
    isCompleted,
    manualMode,
    mediaRecorderSupported,
    onAutoSubmit,
    speechRecognitionSupported,
    startBrowserSpeechRecognition,
    startSarvamRecorderSegment,
    stopAiSpeech,
    stopListeningResources,
  ]);

  // Browser SpeechSynthesis fallback helper
  const speakWithBrowserTts = useCallback(
    (text) => {
      if (!speechSynthesisSupported) {
        ttsProviderRef.current = 'none';
        setTtsProvider('none');
        setIsAiSpeaking(false);
        if (!isPausedRef.current && !hasSubmittedTurnRef.current && !manualMode) {
          startListening();
        }
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = BROWSER_LANG_MAP[language] || 'en-IN';

        const voices = window.speechSynthesis.getVoices();
        const langPrefix = utterance.lang.split('-')[0];
        const preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith(langPrefix) &&
              (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Aria'))
          ) || voices.find((v) => v.lang.startsWith(langPrefix));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsAiSpeaking(true);
        utterance.onend = () => {
          setIsAiSpeaking(false);
          if (!isPausedRef.current && !hasSubmittedTurnRef.current && !manualMode) {
            startListening();
          }
        };
        utterance.onerror = () => {
          setIsAiSpeaking(false);
          if (!isPausedRef.current && !hasSubmittedTurnRef.current && !manualMode) {
            startListening();
          }
        };

        setIsAiSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsAiSpeaking(false);
        if (!manualMode) startListening();
      }
    },
    [language, manualMode, speechSynthesisSupported, startListening]
  );

  // Speak AI question: Primary Sarvam Bulbul v4 Flash -> Fallback Browser SpeechSynthesis
  const speakQuestion = useCallback(
    async (text) => {
      if (!text || isCompleted || isPausedRef.current) return;

      stopListeningResources();
      stopAiSpeech();

      if (isAiMuted) {
        if (!manualMode) startListening();
        return;
      }

      // Check if Sarvam TTS cooldown expired on new question
      if (
        ttsProviderRef.current === 'browser' &&
        Date.now() > ttsCooldownUntilRef.current &&
        backendUrl &&
        getToken
      ) {
        ttsProviderRef.current = 'sarvam';
        setTtsProvider('sarvam');
      }

      const reqId = ++speakRequestIdRef.current;

      if (ttsProviderRef.current === 'sarvam' && backendUrl && getToken) {
        try {
          setIsAiSpeaking(true);
          const token = await getToken();
          const { data } = await axios.post(
            `${backendUrl}/api/voice/tts`,
            { text, language },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 9000,
            }
          );

          // Abort if question changed, paused, or muted during fetch
          if (reqId !== speakRequestIdRef.current || isPausedRef.current) return;

          if (data?.success && data.audioBase64) {
            const byteChars = atob(data.audioBase64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
              byteNumbers[i] = byteChars.charCodeAt(i);
            }
            const blob = new Blob([new Uint8Array(byteNumbers)], {
              type: data.mimeType || 'audio/wav',
            });
            const url = URL.createObjectURL(blob);
            audioObjectUrlRef.current = url;

            const audio = new Audio(url);
            audioPlayerRef.current = audio;

            audio.onended = () => {
              stopAudioPlayer();
              setIsAiSpeaking(false);
              if (!isPausedRef.current && !hasSubmittedTurnRef.current && !manualMode) {
                startListening();
              }
            };

            audio.onerror = () => {
              stopAudioPlayer();
              ttsProviderRef.current = 'browser';
              setTtsProvider('browser');
              ttsCooldownUntilRef.current = Date.now() + PROVIDER_COOLDOWN_MS;
              setFallbackNotice('Using browser voice because the primary voice service is temporarily unavailable.');
              speakWithBrowserTts(text);
            };

            await audio.play();
            return;
          }
          throw new Error('SARVAM_TTS_EMPTY');
        } catch {
          if (reqId !== speakRequestIdRef.current || isPausedRef.current) return;
          stopAudioPlayer();
          ttsProviderRef.current = 'browser';
          setTtsProvider('browser');
          ttsCooldownUntilRef.current = Date.now() + PROVIDER_COOLDOWN_MS;
          setFallbackNotice('Using browser voice because the primary voice service is temporarily unavailable.');
          speakWithBrowserTts(text);
          return;
        }
      }

      speakWithBrowserTts(text);
    },
    [
      backendUrl,
      getToken,
      isAiMuted,
      isCompleted,
      language,
      manualMode,
      speakWithBrowserTts,
      startListening,
      stopAiSpeech,
      stopAudioPlayer,
      stopListeningResources,
    ]
  );

  // Trigger AI voice whenever a new question turn begins
  useEffect(() => {
    if (!currentQuestion || isCompleted) return;

    hasSubmittedTurnRef.current = false;
    hasSpokenRef.current = false;
    isFlushingFinalRef.current = false;
    finalTranscriptRef.current = '';
    interimTextRef.current = '';
    setTranscript('');
    setInterimText('');
    setSilenceRemainingMs(null);
    setNoSpeechPrompt(false);

    speakQuestion(currentQuestion);

    return () => {
      cleanupAll();
    };
  }, [turnNumber, currentQuestion, isCompleted]);

  const toggleAiMute = useCallback(() => {
    setIsAiMuted((prev) => {
      const next = !prev;
      if (next) {
        stopAiSpeech();
        if (!isListeningRef.current && !isPausedRef.current && !manualMode && !hasSubmittedTurnRef.current) {
          startListening();
        }
      }
      return next;
    });
  }, [manualMode, startListening, stopAiSpeech]);

  const toggleMicMute = useCallback(() => {
    setIsMicMuted((prev) => !prev);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        cleanupAll();
      } else if (!manualMode && !hasSubmittedTurnRef.current) {
        startListening();
      }
      return next;
    });
  }, [cleanupAll, manualMode, startListening]);

  const markTurnSubmitted = useCallback(() => {
    hasSubmittedTurnRef.current = true;
    cleanupAll();
  }, [cleanupAll]);

  const retryListening = useCallback(() => {
    setNoSpeechPrompt(false);
    setManualMode(false);
    sttProviderRef.current = mediaRecorderSupported && backendUrl ? 'sarvam' : speechRecognitionSupported ? 'browser' : 'manual';
    setSttProvider(sttProviderRef.current);
    listeningStartedAtRef.current = Date.now();
    startListening();
  }, [backendUrl, mediaRecorderSupported, speechRecognitionSupported, startListening]);

  return {
    ttsProvider,
    sttProvider,
    fallbackNotice,
    speechRecognitionSupported,
    speechSynthesisSupported,
    isAiSpeaking,
    isListening,
    isTranscribing,
    isPaused,
    isAiMuted,
    isMicMuted,
    manualMode,
    setManualMode,
    micError,
    audioLevel,
    transcript,
    interimText,
    silenceRemainingMs,
    noSpeechPrompt,
    updateTranscriptManually,
    toggleAiMute,
    toggleMicMute,
    togglePause,
    markTurnSubmitted,
    retryListening,
    speakQuestion,
    cleanupAll,
  };
};

import React, { useState, useEffect, useCallback } from 'react';
import { useVoiceInterview } from '../../hooks/useVoiceInterview';

const AdaptiveInterviewSession = ({
  session,
  onSubmitTurn,
  onEndEarly,
  isSubmitting,
  backendUrl,
  getToken,
  language = 'en-IN',
}) => {
  const turns = session?.turns || [];
  const currentTurn = turns[turns.length - 1];
  const totalQuestions = session?.targetQuestionCount || 5;
  const currentNumber = currentTurn?.turnNumber || 1;
  const progressPercent = Math.round((currentNumber / totalQuestions) * 100);
  const completedTurns = turns.slice(0, -1);
  const totalDurationSeconds = (session?.durationMinutes || 30) * 60;

  // Elapsed & Remaining Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const handleAutoSubmit = useCallback(
    async (spokenText) => {
      if (!spokenText || !spokenText.trim() || isSubmitting) return;
      await onSubmitTurn(currentTurn.turnNumber, spokenText.trim());
    },
    [currentTurn?.turnNumber, isSubmitting, onSubmitTurn]
  );

  const {
    ttsProvider,
    sttProvider,
    fallbackNotice,
    speechRecognitionSupported,
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
  } = useVoiceInterview({
    currentQuestion: currentTurn?.question || '',
    turnNumber: currentTurn?.turnNumber || 1,
    isSubmitting,
    isCompleted: session?.status === 'completed',
    onAutoSubmit: handleAutoSubmit,
    backendUrl,
    getToken,
    language,
  });

  // Interview clock
  useEffect(() => {
    if (isPaused || session?.status === 'completed') return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, session?.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  const formatTime = (secs) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
  const combinedDisplayText = interimText
    ? `${transcript}${transcript ? ' ' : ''}${interimText}`
    : transcript;

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const finalText = combinedDisplayText.trim();
    if (!finalText || isSubmitting) return;
    markTurnSubmitted();
    await onSubmitTurn(currentTurn.turnNumber, finalText);
  };

  const handleSkipQuestion = async () => {
    if (isSubmitting) return;
    markTurnSubmitted();
    await onSubmitTurn(currentTurn.turnNumber, '[Question skipped by candidate]');
  };

  const handleEndInterview = async () => {
    if (isSubmitting) return;
    if (!window.confirm('Are you sure you want to end the interview now and generate your report?')) {
      return;
    }
    cleanupAll();
    if (onEndEarly) {
      await onEndEarly();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Top Status Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              {session.interviewType} Voice Interview
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
              {session.difficulty}
            </span>
            {session.hasResumeContext ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                📄 Resume-Personalized
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                ℹ️ Job-Focused Mode
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            {session.jobTitle} {session.companyName ? `at ${session.companyName}` : ''}
          </h1>
        </div>

        {/* Clocks & Progress */}
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
          <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Elapsed</span>
            <span className="font-mono font-bold text-gray-800">{formatTime(elapsedSeconds)}</span>
          </div>
          <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Remaining</span>
            <span className={`font-mono font-bold ${remainingSeconds < 120 ? 'text-red-600' : 'text-blue-700'}`}>
              {formatTime(remainingSeconds)}
            </span>
          </div>
          <div className="bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 text-center">
            <span className="block text-[10px] font-bold text-blue-500 uppercase">Question</span>
            <span className="font-black text-blue-700">
              {currentNumber} / {totalQuestions}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: AI Interviewer Avatar & Audio Controls */}
        <div className="bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="flex flex-col items-center text-center space-y-4 pt-2">
            {/* Animated AI Avatar Orb */}
            <div className="relative flex items-center justify-center w-32 h-32">
              {isAiSpeaking && (
                <>
                  <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
                  <span className="absolute inset-2 rounded-full bg-purple-500/30 animate-pulse" />
                </>
              )}
              {isListening && !isAiSpeaking && !isPaused && (
                <span
                  className="absolute rounded-full bg-emerald-400/25 transition-all duration-100"
                  style={{
                    inset: `${Math.max(0, 12 - Math.round(audioLevel / 10))}px`,
                  }}
                />
              )}
              <div
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-2 transition-all ${
                  isAiSpeaking
                    ? 'bg-gradient-to-tr from-blue-500 to-purple-600 border-blue-300 scale-105'
                    : isListening && !isPaused
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-300'
                    : 'bg-slate-800 border-slate-600'
                }`}
              >
                <span className="text-4xl">
                  {isSubmitting ? '🧠' : isAiSpeaking ? '🗣️' : isPaused ? '⏸️' : isListening ? '🎙️' : '🤖'}
                </span>
              </div>
            </div>

            {/* Live State Label */}
            <div>
              <h3 className="font-bold text-base tracking-wide">Job Node AI Interviewer</h3>
              <p className="text-xs mt-1 font-medium">
                {isSubmitting ? (
                  <span className="text-amber-300 animate-pulse">Evaluating your answer & adapting...</span>
                ) : isPaused ? (
                  <span className="text-gray-300">Interview Paused</span>
                ) : isAiSpeaking ? (
                  <span className="text-blue-300 animate-pulse">🔊 Speaking question...</span>
                ) : manualMode ? (
                  <span className="text-amber-300">⌨️ Manual Text Mode Active</span>
                ) : isMicMuted ? (
                  <span className="text-red-300">🎙️✕ Microphone Muted</span>
                ) : isListening ? (
                  <span className="text-emerald-300">
                    ● Listening {isTranscribing ? '(transcribing...)' : ''}
                  </span>
                ) : (
                  <span className="text-slate-300">Ready</span>
                )}
              </p>
            </div>

            {/* Live Mic Audio Level Meter */}
            {!manualMode && (
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 uppercase font-semibold">
                  <span>Mic Input Level</span>
                  <span>{isMicMuted ? 'Muted' : `${audioLevel}%`}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      audioLevel > 25 ? 'bg-emerald-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${isMicMuted ? 0 : audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={toggleAiMute}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                  isAiMuted
                    ? 'bg-red-500/20 border-red-400/40 text-red-200'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                }`}
              >
                {isAiMuted ? '🔇 AI Muted' : '🔊 AI Voice On'}
              </button>

              <button
                type="button"
                onClick={toggleMicMute}
                disabled={manualMode}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 ${
                  isMicMuted
                    ? 'bg-red-500/20 border-red-400/40 text-red-200'
                    : 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                }`}
              >
                {isMicMuted ? '🎙️✕ Mic Muted' : '🎙️ Mic On'}
              </button>

              <button
                type="button"
                onClick={togglePause}
                disabled={isSubmitting}
                className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (manualMode && speechRecognitionSupported) {
                    retryListening();
                  } else {
                    setManualMode(true);
                  }
                }}
                className="py-2 px-3 rounded-xl text-xs font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
              >
                {manualMode ? '🎙️ Try Voice' : '⌨️ Type Instead'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleEndInterview}
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-red-600/90 hover:bg-red-600 text-white transition-colors"
            >
              🛑 End Interview Early
            </button>

            <div className="flex justify-center gap-1.5 text-[10px] text-slate-300 pt-1">
              <span className="px-2 py-0.5 rounded bg-white/10">
                TTS: {ttsProvider === 'sarvam' ? 'Sarvam Bulbul v4' : ttsProvider === 'browser' ? 'Browser' : 'Off'}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10">
                STT: {sttProvider === 'sarvam' ? 'Sarvam Saaras v4' : sttProvider === 'browser' ? 'Browser' : 'Manual'}
              </span>
            </div>

            <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-1">
              {manualMode
                ? '🔒 Manual text mode active. Only your written responses and AI evaluations are saved.'
                : sttProvider === 'sarvam'
                ? '🔒 Audio is sent securely to Sarvam AI for transcription and is not stored. Only text transcripts and AI evaluations are saved.'
                : '🔒 Using browser speech recognition for transcription. Only text transcripts and AI evaluations are saved.'}
            </p>
          </div>
        </div>

        {/* Right Column: Question, Live Transcription & Controls */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
          {/* Hybrid Voice Fallback Notification */}
          {fallbackNotice && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
              <span>ℹ️</span>
              <span>{fallbackNotice}</span>
            </div>
          )}
          {/* Alerts: Mic Error / Browser Fallback / Initial No-Speech Timeout */}
          {micError && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
              <span>⚠️ {micError}</span>
              {speechRecognitionSupported && (
                <button
                  type="button"
                  onClick={retryListening}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold whitespace-nowrap"
                >
                  Retry Mic
                </button>
              )}
            </div>
          )}

          {!speechRecognitionSupported && !micError && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
              ℹ️ Speech recognition is not supported in this browser. You can listen to the AI interviewer and type your answers below.
            </div>
          )}

          {noSpeechPrompt && !manualMode && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex flex-wrap items-center justify-between gap-2">
              <span>🎙️ No speech detected yet. Ready when you are, or you can type/skip.</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={retryListening}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-semibold"
                >
                  Keep Listening
                </button>
                <button
                  type="button"
                  onClick={() => setManualMode(true)}
                  className="px-3 py-1 bg-white border border-indigo-300 text-indigo-700 rounded-lg font-semibold"
                >
                  Type Answer
                </button>
              </div>
            </div>
          )}

          {/* Active Question Card */}
          {currentTurn && (
            <div className="bg-white rounded-2xl border border-blue-200 shadow-md p-6 space-y-5 flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {currentTurn.questionType}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                      Topic: {currentTurn.topic}
                    </span>
                    {currentTurn.isFollowUp && (
                      <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800">
                        ↳ Adaptive Follow-Up
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => speakQuestion(currentTurn.question)}
                    disabled={isAiMuted || isPaused || isSubmitting}
                    className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40"
                  >
                    🔊 Replay Question
                  </button>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                  {currentTurn.question}
                </h2>
              </div>

              {/* Silence Countdown Indicator */}
              {silenceRemainingMs !== null && !manualMode && isListening && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-800">
                    <span>⏱️ Silence detected — auto-submitting in {(silenceRemainingMs / 1000).toFixed(1)}s</span>
                    <span className="text-[11px] font-normal text-emerald-700">Keep speaking to reset</span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-150"
                      style={{ width: `${Math.round((silenceRemainingMs / 5000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Live Transcript & Editable Answer Box */}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {manualMode ? 'Your Written Response' : 'Live Speech Transcript (Editable)'}
                    </label>
                    <span className="text-xs text-gray-400">
                      {combinedDisplayText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={combinedDisplayText}
                    onChange={(e) => updateTranscriptManually(e.target.value)}
                    disabled={isSubmitting || isPaused}
                    placeholder={
                      isAiSpeaking
                        ? 'Listen to the AI interviewer... microphone will activate automatically when done.'
                        : manualMode
                        ? 'Type your detailed answer here...'
                        : 'Start speaking clearly... your live transcript will appear here.'
                    }
                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed disabled:bg-gray-50"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleSkipQuestion}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    ⏭️ Skip Question
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !combinedDisplayText.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>AI Evaluating & Adapting...</span>
                      </>
                    ) : currentNumber >= totalQuestions ? (
                      <span>Submit & Finish Interview 🚀</span>
                    ) : (
                      <span>Submit Answer Manually →</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Previous Turns Continuity Drawer */}
          {completedTurns.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Earlier in this interview ({completedTurns.length})
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {completedTurns.map((t) => (
                  <div key={t.turnNumber} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1">
                    <span className="font-bold text-gray-700">
                      Q{t.turnNumber}. [{t.topic}] {t.isFollowUp ? '↳ Follow-up' : ''}
                    </span>
                    <p className="text-gray-800">{t.question}</p>
                    <p className="text-gray-500 italic">"{t.answer}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdaptiveInterviewSession;

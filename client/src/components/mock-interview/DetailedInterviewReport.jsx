import React, { useState } from 'react';

const DetailedInterviewReport = ({ sessionData, isRecruiterView = false }) => {
  const [expandedTurns, setExpandedTurns] = useState({ 1: true });

  if (!sessionData) return null;

  // Respect recruiter privacy setting for candidate view
  if (!isRecruiterView && sessionData.reportHiddenByRecruiter) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-12 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mx-auto">
          🔒
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Interview Completed & Submitted</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Thank you for completing the AI interview for <span className="font-semibold text-gray-900">{sessionData.jobTitle}</span>
          {sessionData.companyName ? ` at ${sessionData.companyName}` : ''}.
          The hiring team has configured detailed scores and evaluation reports to remain private during review.
        </p>
        <p className="text-xs text-gray-400">
          Submitted on {new Date(sessionData.createdAt || Date.now()).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>
      </div>
    );
  }

  const {
    jobTitle,
    companyName,
    candidate,
    interviewType = 'Technical',
    difficulty = 'Medium',
    durationMinutes = 30,
    overallScore = 0,
    turns = [],
    finalReport = {},
    createdAt,
  } = sessionData;

  const {
    hiringRecommendation = '',
    recommendationRationale = '',
    overallFeedback = '',
    dimensionScores = {},
    performanceSummary = {},
    technicalAssessment = {},
    resumeAssessment = {},
    suggestedLearningTopics = [],
    strongTopics = [],
    improvementTopics = [],
    resumeGrounding = {},
  } = finalReport || {};

  const toggleTurn = (turnNum) => {
    setExpandedTurns((prev) => ({ ...prev, [turnNum]: !prev[turnNum] }));
  };

  const dimensions = [
    { label: 'Technical Knowledge', val: dimensionScores.technicalKnowledge ?? dimensionScores.technicalAccuracy ?? overallScore },
    { label: 'Problem Solving', val: dimensionScores.problemSolving ?? overallScore },
    { label: 'Practical Understanding', val: dimensionScores.practicalUnderstanding ?? overallScore },
    { label: 'Job Role Suitability', val: dimensionScores.jobRoleSuitability ?? overallScore },
    { label: 'Answer Relevance', val: dimensionScores.answerRelevance ?? overallScore },
    { label: 'Communication & Clarity', val: dimensionScores.communicationClarity ?? overallScore },
    { label: 'Resume / Project Depth', val: dimensionScores.resumeProjectKnowledge ?? dimensionScores.projectDepth ?? overallScore },
  ];

  const strengths = performanceSummary?.strengths?.length ? performanceSummary.strengths : strongTopics;
  const weaknesses = performanceSummary?.weaknesses?.length ? performanceSummary.weaknesses : [];
  const improvements = performanceSummary?.areasNeedingImprovement?.length
    ? performanceSummary.areasNeedingImprovement
    : improvementTopics;

  const demonstratedSkills = resumeAssessment?.skillsDemonstrated?.length
    ? resumeAssessment.skillsDemonstrated
    : resumeGrounding?.demonstratedSkills || [];
  const unverifiedSkills = resumeAssessment?.unverifiedResumeSkills?.length
    ? resumeAssessment.unverifiedResumeSkills
    : resumeGrounding?.unverifiedClaims || [];

  const getRecBadgeStyle = (rec) => {
    if (rec.includes('Strong')) return 'bg-emerald-500/25 text-emerald-100 border-emerald-300/40';
    if (rec.includes('Potential')) return 'bg-blue-500/25 text-blue-100 border-blue-300/40';
    if (rec.includes('Further')) return 'bg-amber-500/25 text-amber-100 border-amber-300/40';
    return 'bg-red-500/25 text-red-100 border-red-300/40';
  };

  return (
    <div className="space-y-8">
      {/* 1. Candidate Overview & Hero Scorecard */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/15 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                AI Interview Evaluation Report
              </span>
              {hiringRecommendation && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${getRecBadgeStyle(hiringRecommendation)}`}>
                  {hiringRecommendation}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              {candidate?.name ? `${candidate.name} — ` : ''}{jobTitle}
            </h1>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-200">
              {companyName && <span>🏢 {companyName}</span>}
              <span>📋 {interviewType} Round</span>
              <span>⚡ {difficulty} Difficulty</span>
              <span>⏱️ {durationMinutes} min</span>
              <span>📅 {new Date(createdAt || Date.now()).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
            </div>
          </div>

          {/* Overall Score Circle */}
          <div className="bg-white/10 backdrop-blur-md px-7 py-5 rounded-2xl border border-white/20 text-center flex-shrink-0">
            <span className="text-[11px] text-indigo-200 font-bold uppercase tracking-wider block">
              Overall Score
            </span>
            <div className="text-5xl font-black text-white mt-1">{overallScore}%</div>
          </div>
        </div>

        {recommendationRationale && (
          <div className="mt-5 pt-4 border-t border-white/15 text-xs sm:text-sm text-indigo-100 leading-relaxed">
            <span className="font-bold text-white">Recommendation Rationale: </span>
            {recommendationRationale}
          </div>
        )}
      </div>

      {/* 2. Performance Breakdown Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <h3 className="text-base font-bold text-gray-900">Performance Dimension Breakdown</h3>
          <span className="text-xs text-gray-500">Weighted across 7 evaluation criteria</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {dimensions.map((d) => (
            <div key={d.label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-700">{d.label}</span>
                <span className={d.val >= 75 ? 'text-emerald-600' : d.val >= 55 ? 'text-amber-600' : 'text-red-600'}>
                  {d.val}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    d.val >= 75 ? 'bg-emerald-500' : d.val >= 55 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${d.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {overallFeedback && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-sm text-gray-800 leading-relaxed mt-2">
            <span className="font-bold text-blue-950 block text-xs uppercase tracking-wider mb-1">
              Executive Performance Summary
            </span>
            {overallFeedback}
          </div>
        )}
      </div>

      {/* 3. Strengths, Weaknesses & Improvement Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
          <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">✅ Key Strengths</h4>
          <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside">
            {strengths.length > 0 ? strengths.map((s, i) => <li key={i}>{s}</li>) : <li className="italic text-gray-500">None highlighted</li>}
          </ul>
        </div>

        <div className="p-5 rounded-2xl border border-red-200 bg-red-50/40 space-y-2">
          <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">⚠️ Observed Weaknesses</h4>
          <ul className="text-xs text-red-950 space-y-1.5 list-disc list-inside">
            {weaknesses.length > 0 ? weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li className="italic text-gray-500">No major weaknesses flagged</li>}
          </ul>
        </div>

        <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-2">
          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">📈 Areas for Improvement</h4>
          <ul className="text-xs text-amber-950 space-y-1.5 list-disc list-inside">
            {improvements.length > 0 ? improvements.map((a, i) => <li key={i}>{a}</li>) : <li className="italic text-gray-500">None noted</li>}
          </ul>
        </div>
      </div>

      {/* 4. Technical & Resume Grounding Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Assessment */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
            🛠️ Technical Assessment
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-emerald-700 block mb-1">Technologies Understood Well:</span>
              <div className="flex flex-wrap gap-1.5">
                {(technicalAssessment?.technologiesUnderstoodWell || []).length > 0 ? (
                  technicalAssessment.technologiesUnderstoodWell.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">{t}</span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">Evaluated per question below</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-bold text-red-700 block mb-1">Technologies with Weak Understanding / Gaps:</span>
              <div className="flex flex-wrap gap-1.5">
                {[...(technicalAssessment?.technologiesWithWeakUnderstanding || []), ...(technicalAssessment?.knowledgeGaps || [])].length > 0 ? (
                  [...(technicalAssessment?.technologiesWithWeakUnderstanding || []), ...(technicalAssessment?.knowledgeGaps || [])].map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 border border-red-200 font-medium">{t}</span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">None flagged</span>
                )}
              </div>
            </div>

            {technicalAssessment?.problemSolvingAssessment && (
              <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-900">Problem-Solving: </span>
                {technicalAssessment.problemSolvingAssessment}
              </p>
            )}

            {technicalAssessment?.practicalImplementationUnderstanding && (
              <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-900">Practical Implementation: </span>
                {technicalAssessment.practicalImplementationUnderstanding}
              </p>
            )}
          </div>
        </div>

        {/* Resume vs Interview Evidence Assessment */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">
            📄 Resume vs. Interview Evidence
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-blue-700 block mb-1">Skills Demonstrated in Interview:</span>
              <div className="flex flex-wrap gap-1.5">
                {demonstratedSkills.length > 0 ? (
                  demonstratedSkills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-medium">{s}</span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">None recorded</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-bold text-amber-700 block mb-1">
                Resume Skills Not Adequately Verified (Requires Follow-Up):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {unverifiedSkills.length > 0 ? (
                  unverifiedSkills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium">{s}</span>
                  ))
                ) : (
                  <span className="text-gray-400 italic">All discussed claims were verified</span>
                )}
              </div>
            </div>

            {resumeAssessment?.projectUnderstandingSummary && (
              <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-900">Project Depth: </span>
                {resumeAssessment.projectUnderstandingSummary}
              </p>
            )}

            {resumeAssessment?.claimsComparison && (
              <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="font-bold text-gray-900">Evidence Comparison: </span>
                {resumeAssessment.claimsComparison}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Learning Topics */}
      {suggestedLearningTopics.length > 0 && (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
            📚 Suggested Learning Topics
          </h4>
          <div className="flex flex-wrap gap-2">
            {suggestedLearningTopics.map((topic, i) => (
              <span key={i} className="px-3 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-800">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 5. Question-by-Question Accordion Review */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900">Question-by-Question Review ({turns.length})</h3>
        {turns.map((turn) => {
          const isOpen = Boolean(expandedTurns[turn.turnNumber]);
          const ev = turn.evaluation || {};
          return (
            <div key={turn.turnNumber} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleTurn(turn.turnNumber)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    Q{turn.turnNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                    {turn.questionType} • {turn.topic}
                  </span>
                  {turn.isFollowUp && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                      ↳ Follow-up
                    </span>
                  )}
                  <span className="font-semibold text-sm text-gray-900 line-clamp-1">{turn.question}</span>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {ev.score !== undefined && ev.score !== null && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ev.score >= 7 ? 'bg-emerald-100 text-emerald-800' : ev.score >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ev.score} / 10
                    </span>
                  )}
                  <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {isOpen && (
                <div className="p-5 pt-0 border-t border-gray-100 space-y-4 bg-gray-50/40">
                  <p className="font-bold text-gray-900 text-sm pt-4">{turn.question}</p>

                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap">
                    <span className="font-bold text-gray-500 uppercase text-[10px] block mb-1">
                      Candidate Transcript
                    </span>
                    {turn.answer?.trim() ? turn.answer : <span className="italic text-gray-400">No answer provided</span>}
                  </div>

                  {ev.feedback && (
                    <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 text-xs text-gray-800">
                      <span className="font-bold text-blue-900">AI Evaluation ({ev.understanding || 'Evaluated'}): </span>
                      {ev.feedback}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {ev.strengthsDemonstrated?.length > 0 && (
                      <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                        <span className="font-bold text-emerald-800 block mb-1">✓ What Was Correct:</span>
                        <ul className="list-disc list-inside text-emerald-900 space-y-0.5">
                          {ev.strengthsDemonstrated.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {ev.missingConcepts?.length > 0 && (
                      <div className="bg-red-50/60 p-3 rounded-xl border border-red-100">
                        <span className="font-bold text-red-800 block mb-1">✕ What Was Missing:</span>
                        <ul className="list-disc list-inside text-red-900 space-y-0.5">
                          {ev.missingConcepts.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {(ev.idealConcepts || ev.suggestedImprovement) && (
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs space-y-1.5">
                      {ev.idealConcepts && (
                        <p className="text-gray-700">
                          <span className="font-bold text-indigo-700">Expected Concepts: </span>
                          {ev.idealConcepts}
                        </p>
                      )}
                      {ev.suggestedImprovement && (
                        <p className="text-gray-700">
                          <span className="font-bold text-amber-700">Suggested Improvement: </span>
                          {ev.suggestedImprovement}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DetailedInterviewReport;

import React from 'react';
import { Link } from 'react-router-dom';
import ScoreCircle from '../ai-resume/ScoreCircle';

const InterviewReport = ({ sessionData }) => {
  if (!sessionData) return null;

  const {
    jobTitle,
    companyName,
    overallScore = 0,
    mcqScore = 0,
    mcqTotal = 10,
    mcqPercentage = 0,
    mcqBreakdown = [],
    subjectiveQuestions = [],
    subjectiveUserAnswers = [],
    subjectiveEvaluation = {},
    createdAt,
  } = sessionData;

  const {
    overallFeedback = '',
    strongTopics = [],
    improvementTopics = [],
    results = [],
  } = subjectiveEvaluation || {};

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10 max-w-5xl w-full mx-auto animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-6 md:p-10 text-white mb-10 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              AI Mock Interview Report
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-3 text-white">
              {jobTitle}
            </h1>
            {companyName && (
              <p className="text-lg text-indigo-100 mt-1 font-medium">{companyName}</p>
            )}
            <p className="text-xs text-indigo-200 mt-2">
              Completed on {new Date(createdAt || Date.now()).toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-indigo-200 font-semibold uppercase tracking-wider mb-1">
              Overall Score
            </span>
            <div className="text-5xl font-black text-white">{overallScore}%</div>
            <span className="text-xs text-indigo-100 mt-1">
              {overallScore >= 75 ? '🌟 Excellent' : overallScore >= 50 ? '👍 Good Start' : '💪 Needs Practice'}
            </span>
          </div>
        </div>
      </div>

      {/* Section Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-900">Section 1: MCQs</h3>
            <p className="text-sm text-blue-700 mt-1">
              {mcqScore} / {mcqTotal} Correct
            </p>
          </div>
          <div className="text-3xl font-extrabold text-blue-800">{mcqPercentage}%</div>
        </div>

        <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-purple-900">Section 2: Subjective</h3>
            <p className="text-sm text-purple-700 mt-1">AI Evaluated 5 Responses</p>
          </div>
          <div className="text-3xl font-extrabold text-purple-800">
            {subjectiveEvaluation.overallScore || 0}%
          </div>
        </div>
      </div>

      {/* AI Overall Feedback Card */}
      {overallFeedback && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-10">
          <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span>🤖 AI Overall Feedback</span>
          </h3>
          <p className="text-gray-700 leading-relaxed text-base whitespace-pre-wrap">
            {overallFeedback}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-200">
            {strongTopics.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2">
                  Strong Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {strongTopics.map((topic, i) => (
                    <span key={i} className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                      ✓ {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {improvementTopics.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2">
                  Topics to Improve
                </h4>
                <div className="flex flex-wrap gap-2">
                  {improvementTopics.map((topic, i) => (
                    <span key={i} className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
                      ⚠ {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subjective Answers Breakdown */}
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Subjective Answers Evaluation</h3>
        <div className="space-y-6">
          {subjectiveQuestions.map((q, idx) => {
            const evalResult = results.find((r) => r.questionNumber === idx + 1) || results[idx] || {};
            const scoreOutOf10 = evalResult.score !== undefined ? evalResult.score : '-';

            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h4 className="text-lg font-bold text-gray-900">
                    Q{idx + 1}. {q}
                  </h4>
                  <span className="bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-xl text-sm flex-shrink-0">
                    Score: {scoreOutOf10} / 10
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-800 mb-4 border border-gray-100">
                  <span className="font-bold text-gray-900 block mb-1">Your Answer:</span>
                  <p className="whitespace-pre-wrap">
                    {subjectiveUserAnswers[idx] || <span className="italic text-gray-400">No answer written</span>}
                  </p>
                </div>

                {evalResult.feedback && (
                  <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                    <span className="font-bold text-purple-700">AI Feedback: </span>
                    {evalResult.feedback}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-3">
                  {evalResult.strengths?.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-xl border border-green-200">
                      <span className="font-bold text-green-800 block mb-1">Strengths:</span>
                      <ul className="list-disc list-inside text-green-900 space-y-1">
                        {evalResult.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evalResult.improvements?.length > 0 && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <span className="font-bold text-amber-800 block mb-1">Areas for Improvement:</span>
                      <ul className="list-disc list-inside text-amber-900 space-y-1">
                        {evalResult.improvements.map((imp, i) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
        <Link to="/mock-interview" className="text-blue-600 font-semibold hover:underline">
          ← Back to Interview Dashboard
        </Link>
        <Link to="/mock-interview" className="primary-button !w-auto px-8 py-3 font-bold text-base shadow-md">
          Start Another Mock Interview 🎤
        </Link>
      </div>
    </div>
  );
};

export default InterviewReport;

import React, { useState } from 'react';

const SubjectiveQuiz = ({ questions = [], onSubmitSubjective, isSubmitting }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(
    new Array(questions.length).fill('')
  );
  const [isReviewMode, setIsReviewMode] = useState(false);

  const currentQuestion = questions[currentIndex];

  const handleAnswerChange = (val) => {
    const updated = [...userAnswers];
    updated[currentIndex] = val;
    setUserAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsReviewMode(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitFinal = () => {
    onSubmitSubjective(userAnswers);
  };

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const currentCharCount = (userAnswers[currentIndex] || '').length;

  if (isReviewMode) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 max-w-3xl w-full mx-auto animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">
              Section 2 Review
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Review Your Subjective Answers</h2>
          </div>
          <button
            onClick={() => setIsReviewMode(false)}
            className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-semibold hover:bg-gray-50"
          >
            ← Back to Editing
          </button>
        </div>

        <div className="space-y-6 mb-8">
          {questions.map((q, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <div className="flex justify-between items-start gap-4 mb-2">
                <h3 className="font-bold text-gray-900 text-base">
                  Q{idx + 1}. {q}
                </h3>
                <button
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsReviewMode(false);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0"
                >
                  Edit Answer
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-200 mt-2">
                {userAnswers[idx]?.trim() ? userAnswers[idx] : <span className="italic text-gray-400">No answer written</span>}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <button
            onClick={() => setIsReviewMode(false)}
            className="px-6 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Edit Answers
          </button>
          <button
            onClick={handleSubmitFinal}
            disabled={isSubmitting}
            className="primary-button !w-auto px-8 py-3 font-bold text-lg shadow-lg flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Evaluating Answers with AI...</span>
              </>
            ) : (
              <span>Submit Interview for AI Evaluation ✨</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 max-w-3xl w-full mx-auto">
      {/* Header & Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">
            Section 2: Subjective Questions
          </span>
          <span className="text-sm font-semibold text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question & Text Area */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
          {currentIndex + 1}. {currentQuestion}
        </h2>

        <div className="relative">
          <textarea
            rows={8}
            placeholder="Write your answer clearly. Mention technical concepts, practical examples, or architectural steps..."
            value={userAnswers[currentIndex] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white text-gray-800 text-base"
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {currentCharCount} characters
          </div>
        </div>
      </div>

      {/* Question Pills */}
      <div className="flex flex-wrap gap-2 mb-8 pt-4 border-t border-gray-100">
        {questions.map((_, idx) => {
          const hasAnswer = (userAnswers[idx] || '').trim().length > 0;
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`w-9 h-9 rounded-lg font-semibold text-sm transition-colors cursor-pointer ${
                isCurrent
                  ? 'ring-2 ring-purple-600 ring-offset-1 bg-purple-600 text-white'
                  : hasAnswer
                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
        >
          ← Previous
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsReviewMode(true)}
            className="px-5 py-2.5 rounded-xl border border-purple-300 text-purple-700 font-semibold hover:bg-purple-50"
          >
            Review All Answers
          </button>
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-md"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsReviewMode(true)}
              className="primary-button !w-auto px-8 py-2.5 font-bold text-lg shadow-lg"
            >
              Review & Submit →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectiveQuiz;

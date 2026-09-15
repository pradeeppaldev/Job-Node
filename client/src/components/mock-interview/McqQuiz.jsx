import React, { useState } from 'react';

const McqQuiz = ({ mcqs = [], onSubmitMcq, isSubmitting }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(
    new Array(mcqs.length).fill(-1)
  );

  const currentMcq = mcqs[currentIndex];

  const handleSelectOption = (optionIdx) => {
    const updated = [...selectedAnswers];
    updated[currentIndex] = optionIdx;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex < mcqs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    const unansweredCount = selectedAnswers.filter((a) => a === -1).length;
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit Section 1?`
      );
      if (!confirmSubmit) return;
    }
    onSubmitMcq(selectedAnswers);
  };

  const answeredCount = selectedAnswers.filter((a) => a !== -1).length;
  const progressPercent = Math.round(((currentIndex + 1) / mcqs.length) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 max-w-3xl w-full mx-auto">
      {/* Header & Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
            Section 1: MCQ Practice
          </span>
          <span className="text-sm font-semibold text-gray-500">
            Question {currentIndex + 1} of {mcqs.length} ({answeredCount}/{mcqs.length} Answered)
          </span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentMcq && (
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 leading-snug">
            {currentIndex + 1}. {currentMcq.question}
          </h2>

          <div className="space-y-3">
            {currentMcq.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentIndex] === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-grow text-base">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Question Navigation Grid */}
      <div className="flex flex-wrap gap-2 mb-8 pt-4 border-t border-gray-100">
        {mcqs.map((_, idx) => {
          const isAnswered = selectedAnswers[idx] !== -1;
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`w-9 h-9 rounded-lg font-semibold text-sm transition-colors cursor-pointer ${
                isCurrent
                  ? 'ring-2 ring-blue-600 ring-offset-1 bg-blue-600 text-white'
                  : isAnswered
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Navigation & Submit Action */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-6 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
        >
          ← Previous
        </button>

        {currentIndex < mcqs.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md cursor-pointer"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="primary-button !w-auto px-8 py-2.5 font-bold text-lg shadow-lg cursor-pointer"
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Section 1 →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default McqQuiz;

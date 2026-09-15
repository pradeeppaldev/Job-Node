import React from 'react';

const McqResults = ({ mcqScore = 0, mcqTotal = 10, mcqPercentage = 0, mcqBreakdown = [], onProceedToSubjective }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 max-w-4xl w-full mx-auto animate-in fade-in duration-500">
      {/* Header Score Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white mb-8 text-center shadow-md">
        <h2 className="text-2xl font-bold uppercase tracking-wider mb-1">Section 1: MCQ Evaluation</h2>
        <div className="text-5xl md:text-6xl font-extrabold my-4">
          {mcqScore} / {mcqTotal}
        </div>
        <p className="text-lg font-medium opacity-90">
          Percentage Score: <span className="font-bold underline">{mcqPercentage}%</span>
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Question-by-Question Breakdown</h3>
        <button
          onClick={onProceedToSubjective}
          className="primary-button !w-auto px-6 py-3 font-semibold shadow-md text-base"
        >
          Proceed to Section 2: Subjective Questions →
        </button>
      </div>

      {/* Detailed Breakdown List */}
      <div className="space-y-6">
        {mcqBreakdown.map((item, idx) => {
          const userOptionText = item.userAnswer >= 0 ? item.options[item.userAnswer] : 'No answer selected';
          const correctOptionText = item.options[item.correctAnswer];

          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl border ${
                item.isCorrect
                  ? 'bg-green-50/50 border-green-200'
                  : 'bg-red-50/50 border-red-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h4 className="text-lg font-bold text-gray-900">
                  Q{item.questionNumber}. {item.question}
                </h4>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                    item.isCorrect
                      ? 'bg-green-200 text-green-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm my-3">
                <div
                  className={`p-3 rounded-xl border ${
                    item.isCorrect
                      ? 'bg-green-100/70 border-green-300 text-green-900 font-medium'
                      : 'bg-red-100/70 border-red-300 text-red-900 font-medium'
                  }`}
                >
                  <span className="font-bold">Your Answer: </span>
                  {item.userAnswer >= 0 ? `${String.fromCharCode(65 + item.userAnswer)}. ${userOptionText}` : 'Unanswered'}
                </div>

                {!item.isCorrect && (
                  <div className="p-3 rounded-xl border bg-green-100/70 border-green-300 text-green-900 font-medium">
                    <span className="font-bold">Correct Answer: </span>
                    {String.fromCharCode(65 + item.correctAnswer)}. {correctOptionText}
                  </div>
                )}
              </div>

              {item.explanation && (
                <div className="bg-white/80 p-3 rounded-xl border border-gray-200 text-xs text-gray-700 mt-2">
                  <span className="font-bold text-gray-900">Explanation: </span>
                  {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
        <button
          onClick={onProceedToSubjective}
          className="primary-button !w-auto px-8 py-3.5 font-bold text-lg shadow-lg"
        >
          Proceed to Section 2: Subjective Questions →
        </button>
      </div>
    </div>
  );
};

export default McqResults;

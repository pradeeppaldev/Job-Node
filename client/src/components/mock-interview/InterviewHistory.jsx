import React from 'react';
import { Link } from 'react-router-dom';

const InterviewHistory = ({ history = [], isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        <p className="animate-pulse">Loading your past interview sessions...</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        <p className="text-lg font-medium text-gray-700">No previous interviews found.</p>
        <p className="text-sm mt-1">Start a mock interview above to practice and generate detailed AI feedback!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 max-w-4xl w-full mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span>📜 My Interview History</span>
      </h2>

      <div className="space-y-4">
        {history.map((item) => {
          const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          return (
            <div
              key={item._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all gap-4"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900">{item.jobTitle}</h3>
                {item.companyName && (
                  <p className="text-sm text-gray-500">{item.companyName}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">Practiced on {formattedDate}</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">Overall Score</span>
                  <span className="text-2xl font-black text-purple-700">{item.overallScore || 0}%</span>
                </div>

                <Link
                  to={`/mock-interview/report/${item._id}`}
                  className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-800 text-sm font-semibold transition-colors flex-shrink-0"
                >
                  View Report →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InterviewHistory;

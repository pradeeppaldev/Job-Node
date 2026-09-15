import React, { useState, useEffect, useContext } from 'react';
import AppContext from '../../context/AppContext';

const JobSelector = ({ onStartInterview, isGenerating }) => {
  const { jobs } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('platform'); // 'platform' | 'custom'

  const [selectedJobId, setSelectedJobId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  // Auto select first job if available
  useEffect(() => {
    if (jobs && jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0]._id);
    }
  }, [jobs, selectedJobId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGenerating) return;

    if (activeTab === 'platform') {
      const selectedJob = jobs.find((j) => j._id === selectedJobId);
      if (!selectedJob) return;

      onStartInterview({
        jobId: selectedJob._id,
        jobTitle: selectedJob.title,
        companyName: selectedJob.companyId?.name || '',
        jobDescription: selectedJob.description || '',
      });
    } else {
      if (!customTitle.trim() || !customDescription.trim()) return;

      onStartInterview({
        jobTitle: customTitle.trim(),
        companyName: 'Custom Practice',
        jobDescription: customDescription.trim(),
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 max-w-3xl w-full mx-auto">
      <div className="flex border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('platform')}
          className={`flex-1 py-3 font-semibold text-center transition-colors cursor-pointer ${
            activeTab === 'platform'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Select Job Node Listing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-3 font-semibold text-center transition-colors cursor-pointer ${
            activeTab === 'custom'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Enter Custom Job Description
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'platform' ? (
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Select a Job from Job Node Platform
            </label>
            {jobs && jobs.length > 0 ? (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-800"
              >
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title} — {job.companyId?.name || 'Company'} ({job.location})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 italic py-4">No jobs currently loaded from platform. Please use Custom JD option.</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Job Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Frontend Developer"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Job Description & Required Skills</label>
              <textarea
                rows={6}
                placeholder="Paste the target job description, key responsibilities, and required skills here..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                required
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={isGenerating}
          className="primary-button py-4 text-lg font-semibold w-full shadow-md flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Generating AI Interview Questions...</span>
            </>
          ) : (
            <span>🚀 Start AI Mock Interview</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default JobSelector;

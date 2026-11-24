import React, { useContext, useEffect, useState } from 'react';
import AppContext from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../components/Loading';
import DetailedInterviewReport from '../components/mock-interview/DetailedInterviewReport';
import moment from 'moment';

const RecruiterAiInterviews = () => {
  const { backendUrl, companyToken } = useContext(AppContext);

  // 'assigned' | 'new-assignment' | 'compare'
  const [activeTab, setActiveTab] = useState('assigned');

  // Assigned interviews state
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [jobFilter, setJobFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Assignment creation state
  const [jobsWithApplicants, setJobsWithApplicants] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [interviewType, setInterviewType] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Medium');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(5);
  const [skillsInput, setSkillsInput] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [deadline, setDeadline] = useState(
    moment().add(3, 'days').format('YYYY-MM-DDTHH:mm')
  );
  const [candidateReportVisible, setCandidateReportVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Candidate Comparison state
  const [compareJobId, setCompareJobId] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Retake modal state
  const [retakeModalAssignment, setRetakeModalAssignment] = useState(null);
  const [retakeDeadline, setRetakeDeadline] = useState(
    moment().add(3, 'days').format('YYYY-MM-DDTHH:mm')
  );
  const [isSubmittingRetake, setIsSubmittingRetake] = useState(false);

  // Report modal state
  const [selectedReportSession, setSelectedReportSession] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch all assigned interviews for this recruiter's company
  const fetchAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/company/interview-assignments`, {
        headers: { token: companyToken },
      });
      if (data.success) {
        setAssignments(data.assignments);
      } else {
        toast.error(data.message || 'Failed to load assigned interviews.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error fetching interview assignments: ' + error.message);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Fetch jobs and their applicants for the assignment form
  const fetchJobsWithApplicants = async () => {
    setLoadingJobs(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/company/jobs-with-applicants`, {
        headers: { token: companyToken },
      });
      if (data.success) {
        setJobsWithApplicants(data.jobs || []);
        if (data.jobs && data.jobs.length > 0 && !selectedJobId) {
          const firstJob = data.jobs[0];
          setSelectedJobId(firstJob.jobId);
          if (firstJob.skills && firstJob.skills.length > 0) {
            setSkillsInput(firstJob.skills.join(', '));
          }
        }
      } else {
        toast.error(data.message || 'Failed to load jobs and applicants.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error fetching jobs data: ' + error.message);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (companyToken) {
      fetchAssignments();
      fetchJobsWithApplicants();
    }
  }, [companyToken]);

  // When selected job changes, update prefilled skills and reset candidate selection
  const handleJobChange = (jobId) => {
    setSelectedJobId(jobId);
    setSelectedCandidateIds([]);
    const foundJob = jobsWithApplicants.find((j) => j.jobId === jobId);
    if (foundJob && foundJob.skills && foundJob.skills.length > 0) {
      setSkillsInput(foundJob.skills.join(', '));
    }
  };

  // Get active job's applicants
  const activeJob = jobsWithApplicants.find((j) => j.jobId === selectedJobId);
  const applicants = activeJob?.applicants || [];

  // Toggle candidate selection
  const handleToggleCandidate = (candId) => {
    if (selectedCandidateIds.includes(candId)) {
      setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== candId));
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, candId]);
    }
  };

  const handleSelectAllCandidates = () => {
    if (selectedCandidateIds.length === applicants.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(applicants.map((a) => a.candidateId));
    }
  };

  // Handle interview assignment submission
  const handleAssignInterview = async (e) => {
    e.preventDefault();
    if (!selectedJobId) {
      return toast.warn('Please select a job posting.');
    }
    if (selectedCandidateIds.length === 0) {
      return toast.warn('Please select at least one candidate.');
    }
    if (!deadline) {
      return toast.warn('Please set an interview deadline.');
    }

    const skillsArray = skillsInput
      ? skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    setIsSubmitting(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/company/assign-interviews`,
        {
          jobId: selectedJobId,
          candidateIds: selectedCandidateIds,
          interviewType,
          difficulty,
          durationMinutes: Number(durationMinutes),
          questionCount: Number(questionCount),
          skills: skillsArray,
          customInstructions,
          deadline,
          candidateReportVisible,
        },
        { headers: { token: companyToken } }
      );

      if (data.success) {
        toast.success(data.message || 'Interviews assigned successfully!');
        setSelectedCandidateIds([]);
        setActiveTab('assigned');
        fetchAssignments();
        fetchJobsWithApplicants();
      } else {
        toast.error(data.message || 'Failed to assign interviews.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error assigning interviews: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle interview cancellation
  const handleCancelAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to cancel this interview assignment?')) {
      return;
    }
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/company/cancel-interview`,
        { assignmentId },
        { headers: { token: companyToken } }
      );
      if (data.success) {
        toast.success(data.message || 'Interview cancelled successfully.');
        fetchAssignments();
        fetchJobsWithApplicants();
      } else {
        toast.error(data.message || 'Failed to cancel interview.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error cancelling interview: ' + error.message);
    }
  };

  // Handle retake submission
  const handleSubmitRetake = async () => {
    if (!retakeModalAssignment) return;
    setIsSubmittingRetake(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/company/retake-interview`,
        {
          assignmentId: retakeModalAssignment._id,
          deadline: retakeDeadline,
        },
        { headers: { token: companyToken } }
      );
      if (data.success) {
        toast.success(data.message || 'Interview retake permitted.');
        setRetakeModalAssignment(null);
        fetchAssignments();
        fetchJobsWithApplicants();
      } else {
        toast.error(data.message || 'Failed to allow retake.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error updating retake: ' + error.message);
    } finally {
      setIsSubmittingRetake(false);
    }
  };

  // View completed session report
  const handleViewReport = async (item) => {
    const targetId = item.sessionId || item._id;
    setLoadingReport(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/company/interview-report/${targetId}`, {
        headers: { token: companyToken },
      });
      if (data.success) {
        if (data.hasSession && data.session) {
          setSelectedReportSession(data.session);
        } else {
          toast.info(data.message || 'Interview has not been started yet.');
        }
      } else {
        toast.error(data.message || 'Could not fetch interview report.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error loading report: ' + error.message);
    } finally {
      setLoadingReport(false);
    }
  };

  // Toggle candidate report visibility
  const handleToggleReportVisibility = async (assignmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/company/toggle-report-visibility`,
        { assignmentId },
        { headers: { token: companyToken } }
      );
      if (data.success) {
        toast.success(data.message);
        fetchAssignments();
      } else {
        toast.error(data.message || 'Failed to update visibility.');
      }
    } catch (err) {
      toast.error('Error updating visibility: ' + err.message);
    }
  };

  // Fetch Candidate Comparison for a job
  const fetchCandidateComparison = async (jobId) => {
    if (!jobId) return;
    setCompareJobId(jobId);
    setLoadingComparison(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/company/compare-candidates/${jobId}`, {
        headers: { token: companyToken },
      });
      if (data.success) {
        setComparisonData(data);
      } else {
        toast.error(data.message || 'Failed to load candidate comparison.');
      }
    } catch (err) {
      toast.error('Error loading comparison: ' + err.message);
    } finally {
      setLoadingComparison(false);
    }
  };

  // Status badge style helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse';
      case 'ASSIGNED':
      case 'NOT_STARTED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EXPIRED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Filter assignments
  const filteredAssignments = assignments.filter((item) => {
    const matchesStatus =
      statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesJob = jobFilter === 'ALL' || item.jobId?._id === jobFilter;
    const matchesSearch =
      !searchQuery ||
      item.candidate?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.candidate?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jobId?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesJob && matchesSearch;
  });

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header and Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>🎤</span> Recruiter AI Interview Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign custom AI voice & technical mock interviews to candidates, configure assessment criteria, and track evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'assigned'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Assigned Interviews ({assignments.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('compare');
              if (!compareJobId && jobsWithApplicants.length > 0) {
                fetchCandidateComparison(jobsWithApplicants[0].jobId);
              } else if (compareJobId) {
                fetchCandidateComparison(compareJobId);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'compare'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Compare Candidates
          </button>
          <button
            onClick={() => setActiveTab('new-assignment')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'new-assignment'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>➕</span> Assign New Interview
          </button>
        </div>
      </div>

      {/* TAB 1: Assigned Interviews List */}
      {activeTab === 'assigned' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search Candidate / Job</label>
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Job Posting</label>
              <select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Jobs</option>
                {jobsWithApplicants.map((job) => (
                  <option key={job.jobId} value={job.jobId}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments Table */}
          {loadingAssignments ? (
            <div className="py-12 flex justify-center">
              <Loading />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <span className="text-4xl block mb-2">📋</span>
              <h3 className="text-lg font-bold text-gray-700">No Interview Assignments Found</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-4">
                {assignments.length === 0
                  ? "You haven't assigned any AI interviews yet. Click 'Assign New Interview' to select candidates and send invitations."
                  : 'No interview assignments match your active search or filters.'}
              </p>
              {assignments.length === 0 && (
                <button
                  onClick={() => setActiveTab('new-assignment')}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 shadow"
                >
                  ➕ Assign First Interview
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Job Role</th>
                      <th className="py-3 px-4">Assessment Specs</th>
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAssignments.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.candidate?.image || 'https://via.placeholder.com/40'}
                              alt=""
                              className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{item.candidate?.name || 'Applicant'}</p>
                              <p className="text-xs text-gray-500">{item.candidate?.email || 'N/A'}</p>
                              {item.candidate?.resume && (
                                <a
                                  href={item.candidate.resume}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-blue-600 hover:underline inline-block mt-0.5"
                                >
                                  📄 View Resume
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800">{item.jobId?.title || 'Job Posting'}</p>
                          <p className="text-xs text-gray-500">{item.jobId?.location || ''} • {item.jobId?.level || ''}</p>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 mb-1">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                              {item.interviewType}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {item.difficulty}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {item.questionCount} Questions • {item.durationMinutes} min
                          </p>
                          {item.skills && item.skills.length > 0 && (
                            <p className="text-xs text-gray-400 truncate max-w-xs" title={item.skills.join(', ')}>
                              Skills: {item.skills.join(', ')}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-medium text-gray-800 text-xs">
                            {moment(item.deadline).format('MMM D, YYYY')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {moment(item.deadline).format('h:mm A')}
                          </p>
                          {new Date() > new Date(item.deadline) && item.status !== 'COMPLETED' && (
                            <span className="text-[11px] text-red-500 font-semibold">Passed</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                              item.status
                            )}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {item.score !== null && item.score !== undefined ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span
                                className={`text-base font-bold ${
                                  item.score >= 75
                                    ? 'text-green-600'
                                    : item.score >= 55
                                    ? 'text-amber-600'
                                    : 'text-red-500'
                                }`}
                              >
                                {item.score}%
                              </span>
                              {item.recommendation && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {item.recommendation}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Pending</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'COMPLETED' && (
                              <>
                                <button
                                  onClick={() => handleViewReport(item)}
                                  className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  View Report
                                </button>
                                <button
                                  onClick={() => handleToggleReportVisibility(item._id)}
                                  title="Toggle whether candidate can see their score & report"
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                    item.candidateReportVisible !== false
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                                  }`}
                                >
                                  {item.candidateReportVisible !== false ? '👁️ Public' : '🔒 Private'}
                                </button>
                              </>
                            )}

                            {['ASSIGNED', 'IN_PROGRESS'].includes(item.status) && (
                              <button
                                onClick={() => handleCancelAssignment(item._id)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                            )}

                            {['EXPIRED', 'CANCELLED', 'COMPLETED'].includes(item.status) && (
                              <button
                                onClick={() => {
                                  setRetakeModalAssignment(item);
                                  setRetakeDeadline(moment().add(3, 'days').format('YYYY-MM-DDTHH:mm'));
                                }}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
                              >
                                Allow Retake
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: New Interview Assignment Form */}
      {activeTab === 'new-assignment' && (
        <form onSubmit={handleAssignInterview} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              1. Select Job Posting & Applicants
            </h2>

            {/* Select Job Posting */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Active Job Posting <span className="text-red-500">*</span>
              </label>
              {loadingJobs ? (
                <p className="text-xs text-gray-500 py-2">Loading your active job postings...</p>
              ) : (
                <select
                  value={selectedJobId}
                  onChange={(e) => handleJobChange(e.target.value)}
                  className="w-full md:w-2/3 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                >
                  {jobsWithApplicants.map((job) => (
                    <option key={job.jobId} value={job.jobId}>
                      {job.title} — {job.location} ({job.applicants.length} applicant{job.applicants.length === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Applicants Selection Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Select Candidates to Assign Interview ({selectedCandidateIds.length} selected)
                </label>
                {applicants.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllCandidates}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {selectedCandidateIds.length === applicants.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {applicants.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center text-sm text-gray-500 bg-gray-50">
                  No applicants found for this job posting yet. Candidates who apply to this role will appear here.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCandidateIds.length === applicants.length && applicants.length > 0}
                            onChange={handleSelectAllCandidates}
                            className="rounded text-blue-600"
                          />
                        </th>
                        <th className="py-2.5 px-3">Candidate</th>
                        <th className="py-2.5 px-3">Email & Phone</th>
                        <th className="py-2.5 px-3">Applied Date</th>
                        <th className="py-2.5 px-3">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {applicants.map((cand) => {
                        const isSelected = selectedCandidateIds.includes(cand.candidateId);
                        return (
                          <tr
                            key={cand.candidateId}
                            onClick={() => handleToggleCandidate(cand.candidateId)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleCandidate(cand.candidateId)}
                                className="rounded text-blue-600"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <img
                                  src={cand.image || 'https://via.placeholder.com/32'}
                                  alt=""
                                  className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                                />
                                <span className="font-semibold text-gray-900">{cand.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-gray-600">
                              <p>{cand.email}</p>
                              {cand.phoneNumber && <p className="text-gray-400">{cand.phoneNumber}</p>}
                            </td>
                            <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">
                              {moment(cand.appliedDate).format('ll')}
                            </td>
                            <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadge(
                                  cand.interviewStatus
                                )}`}
                              >
                                {cand.interviewStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Assessment Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              2. Configure AI Interview Parameters
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Interview Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interview Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Technical', 'HR', 'Mixed'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                        interviewType === type
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {interviewType === 'Technical' && 'In-depth architecture, code patterns, and practical engineering questions.'}
                  {interviewType === 'HR' && 'Behavioral scenarios, teamwork, leadership, and culture-fit questions.'}
                  {interviewType === 'Mixed' && 'A balanced combination of both technical and behavioral interview questions.'}
                </p>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      className={`py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                        difficulty === diff
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {difficulty === 'Easy' && 'Core fundamentals and definitions.'}
                  {difficulty === 'Medium' && 'Standard industry scenarios, trade-offs, and implementation patterns.'}
                  {difficulty === 'Hard' && 'Complex system design, edge cases, scalability, and deep problem solving.'}
                </p>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Questions</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                >
                  <option value={3}>3 Questions (Quick Screen - ~15 min)</option>
                  <option value={5}>5 Questions (Standard Round - ~30 min)</option>
                  <option value={8}>8 Questions (Comprehensive - ~45 min)</option>
                  <option value={10}>10 Questions (Deep Assessment - ~60 min)</option>
                </select>
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Interview Duration (Minutes)</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              {/* Target Skills / Topics */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Skills & Topics (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, REST APIs, Microservices, MongoDB, System Design"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Gemini will formulate customized technical and behavioral questions specifically targeting these competencies.
                </p>
              </div>

              {/* Custom Instructions */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Optional Custom Instructions for AI Interviewer
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Probe candidate deeply on their experience handling high-traffic production outages and database indexing strategies."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Deadline */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interview Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full md:w-1/2 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  After this deadline passes, candidate access will expire unless a retake is granted.
                </p>
              </div>

              {/* Candidate Report Visibility */}
              <div className="md:col-span-2 flex items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  id="candidateReportVisible"
                  checked={candidateReportVisible}
                  onChange={(e) => setCandidateReportVisible(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="candidateReportVisible" className="text-sm text-gray-700 font-medium cursor-pointer">
                  Allow candidates to view their evaluation score and detailed report after completion
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('assigned')}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedCandidateIds.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Assigning Interviews...</span>
                  </>
                ) : (
                  <span>🚀 Assign AI Interview ({selectedCandidateIds.length})</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: Candidate Comparison & Analytics */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Compare Candidates by Job Posting</h2>
              <p className="text-xs text-gray-500">
                Compare scores, technical dimensions, strengths, and recommendations side-by-side for candidates who applied to the same role.
              </p>
            </div>
            <select
              value={compareJobId}
              onChange={(e) => fetchCandidateComparison(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a Job Posting...</option>
              {jobsWithApplicants.map((j) => (
                <option key={j.jobId} value={j.jobId}>
                  {j.title} ({j.location})
                </option>
              ))}
            </select>
          </div>

          {loadingComparison ? (
            <div className="py-12 flex justify-center">
              <Loading />
            </div>
          ) : !comparisonData || comparisonData.candidates?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <span className="text-4xl block mb-2">📊</span>
              <h3 className="text-base font-bold text-gray-700">No Interview Data to Compare</h3>
              <p className="text-xs text-gray-500 mt-1">
                Assign AI interviews to candidates for this job posting to compare their performance side-by-side.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Visual Score Comparison Bar Chart */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Overall Score Comparison — {comparisonData.job?.title}
                </h3>
                <div className="space-y-3">
                  {comparisonData.candidates.map((c) => {
                    const score = c.overallScore ?? 0;
                    return (
                      <div key={c.assignmentId} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{c.candidate?.name}</span>
                            {c.recommendation && (
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                                {c.recommendation}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-gray-800">
                            {c.overallScore !== null ? `${c.overallScore}%` : c.status}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-blue-500' : score > 0 ? 'bg-amber-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${c.overallScore !== null ? score : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase">
                      <tr>
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Overall</th>
                        <th className="py-3 px-4 text-center">Technical</th>
                        <th className="py-3 px-4 text-center">Problem Solving</th>
                        <th className="py-3 px-4 text-center">Suitability</th>
                        <th className="py-3 px-4">Demonstrated Skills & Strengths</th>
                        <th className="py-3 px-4">Weaknesses / Gaps</th>
                        <th className="py-3 px-4 text-right">Report</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comparisonData.candidates.map((c) => (
                        <tr key={c.assignmentId} className="hover:bg-gray-50/70 align-top">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={c.candidate?.image || 'https://via.placeholder.com/32'}
                                alt=""
                                className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                              />
                              <div>
                                <p className="font-bold text-gray-900">{c.candidate?.name}</p>
                                <p className="text-[11px] text-gray-500">{c.recommendation || 'Pending'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-sm text-blue-700">
                            {c.overallScore !== null ? `${c.overallScore}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            {c.dimensionScores?.technicalKnowledge !== null ? `${c.dimensionScores.technicalKnowledge}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            {c.dimensionScores?.problemSolving !== null ? `${c.dimensionScores.problemSolving}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold">
                            {c.dimensionScores?.jobRoleSuitability !== null ? `${c.dimensionScores.jobRoleSuitability}%` : '—'}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {[...(c.skillsDemonstrated || []), ...(c.strengths || [])].slice(0, 4).map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {(c.weaknesses || []).slice(0, 3).map((w, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[10px]">
                                  {w}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {c.sessionId && c.status === 'COMPLETED' ? (
                              <button
                                onClick={() => handleViewReport({ sessionId: c.sessionId })}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold"
                              >
                                Open Report
                              </button>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Retake Modal */}
      {retakeModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Permit Interview Retake</h3>
            <p className="text-sm text-gray-600 mb-4">
              Allow <span className="font-semibold text-gray-900">{retakeModalAssignment.candidate?.name}</span> to retake the interview for <span className="font-semibold">{retakeModalAssignment.jobId?.title}</span>.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Submission Deadline</label>
              <input
                type="datetime-local"
                value={retakeDeadline}
                onChange={(e) => setRetakeDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRetakeModalAssignment(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRetake}
                disabled={isSubmittingRetake}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow"
              >
                {isSubmittingRetake ? 'Updating...' : 'Confirm Retake'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Loading Overlay */}
      {loadingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
            <Loading />
            <span className="text-sm font-semibold text-gray-700">Loading Evaluation Report...</span>
          </div>
        </div>
      )}

      {/* Recruiter Report Review Modal */}
      {selectedReportSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-gray-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-6">
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                  AI Interview Evaluation Report
                </span>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">
                  {selectedReportSession.candidate?.name || 'Candidate'} — {selectedReportSession.jobTitle}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Completed on {moment(selectedReportSession.createdAt).format('MMMM Do YYYY, h:mm a')} • {selectedReportSession.interviewType} ({selectedReportSession.difficulty})
                </p>
              </div>
              <button
                onClick={() => setSelectedReportSession(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {selectedReportSession.mode === 'adaptive' && selectedReportSession.turns?.length > 0 ? (
              <div className="mb-6">
                <DetailedInterviewReport sessionData={selectedReportSession} isRecruiterView={true} />
              </div>
            ) : (
              <>
            {/* Scorecard Hero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <span className="text-xs font-semibold text-blue-700 uppercase">Overall AI Score</span>
                <p className="text-3xl font-extrabold text-blue-900 mt-1">{selectedReportSession.overallScore}%</p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <span className="text-xs font-semibold text-purple-700 uppercase">Section 1 (MCQ)</span>
                <p className="text-3xl font-extrabold text-purple-900 mt-1">
                  {selectedReportSession.mcqPercentage}%
                </p>
                <p className="text-xs text-purple-600 mt-0.5">
                  ({selectedReportSession.mcqScore} / {selectedReportSession.mcqTotal} correct)
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-xs font-semibold text-emerald-700 uppercase">Section 2 (Subjective)</span>
                <p className="text-3xl font-extrabold text-emerald-900 mt-1">
                  {selectedReportSession.subjectiveEvaluation?.overallScore || 0}%
                </p>
              </div>
            </div>

            {/* AI Summary Feedback */}
            {selectedReportSession.subjectiveEvaluation?.overallFeedback && (
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 mb-6">
                <h4 className="font-bold text-gray-900 text-sm mb-1">AI Evaluator Summary:</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedReportSession.subjectiveEvaluation.overallFeedback}
                </p>
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {selectedReportSession.subjectiveEvaluation?.strongTopics?.length > 0 && (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50/50">
                  <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">Key Strengths</h4>
                  <ul className="space-y-1 text-xs text-green-900 list-disc list-inside">
                    {selectedReportSession.subjectiveEvaluation.strongTopics.map((topic, i) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReportSession.subjectiveEvaluation?.improvementTopics?.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside">
                    {selectedReportSession.subjectiveEvaluation.improvementTopics.map((topic, i) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Subjective Q&A Breakdown */}
            <div className="space-y-4 mb-6">
              <h4 className="font-bold text-gray-900 text-base">Detailed Subjective Responses & Evaluation:</h4>
              {(selectedReportSession.subjectiveQuestions || []).map((q, idx) => {
                const answer = selectedReportSession.subjectiveUserAnswers?.[idx];
                const evalItem = selectedReportSession.subjectiveEvaluation?.results?.[idx];
                return (
                  <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <p className="font-bold text-gray-900 text-sm">
                        Q{idx + 1}. {q}
                      </p>
                      {evalItem?.score !== undefined && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                          {evalItem.score} / 10
                        </span>
                      )}
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap">
                      <span className="font-semibold text-gray-500 block mb-1">Candidate Answer:</span>
                      {answer?.trim() ? answer : <span className="italic text-gray-400">No answer provided</span>}
                    </div>
                    {evalItem?.feedback && (
                      <p className="text-xs text-gray-600 bg-blue-50/50 p-2.5 rounded border border-blue-100">
                        <span className="font-semibold text-blue-800">Feedback: </span>
                        {evalItem.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            </>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedReportSession(null)}
                className="px-6 py-2.5 bg-gray-800 text-white font-semibold text-sm rounded-xl hover:bg-gray-900 transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterAiInterviews;

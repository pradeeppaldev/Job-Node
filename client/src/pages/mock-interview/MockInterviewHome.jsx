import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import InterviewHistory from '../../components/mock-interview/InterviewHistory';
import AppContext from '../../context/AppContext';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';

const MockInterviewHome = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [startingAssignmentId, setStartingAssignmentId] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch candidate's recruiter-assigned interviews
  const fetchAssignments = async () => {
    if (!user) return;
    setLoadingAssignments(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/interview/my-assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Failed to fetch assigned interviews:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Fetch past completed interviews
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/interview/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch interview history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchHistory();
    }
  }, [user]);

  const handleStartAssignedInterview = async (assignment) => {
    setStartingAssignmentId(assignment._id);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/interview/start-assigned`,
        { assignmentId: assignment._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.isResumed ? 'Resuming interview...' : 'Interview initialized!');
        navigate(`/mock-interview/session/${data.sessionId}`, {
          state: { session: data.session, assignmentId: assignment._id },
        });
      } else {
        toast.error(data.message || 'Failed to start interview.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error: ' + err.message);
    } finally {
      setStartingAssignmentId(null);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-50/40 to-white">
      <Navbar />

      <main className="flex-grow container px-4 mx-auto py-10 space-y-10 max-w-6xl">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            🎤 Recruiter-Assigned AI Interviews
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
            AI Interview Portal
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Complete recruiter-assigned voice & technical interviews. Your answers are evaluated dynamically by Gemini AI and reported back to hiring managers.
          </p>
        </div>

        {/* Assigned Interviews Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🎯</span> Your Assigned AI Interviews
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Official interview invitations from recruiters for positions you applied to.
              </p>
            </div>
            {assignments.length > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                {assignments.length} Total
              </span>
            )}
          </div>

          {loadingAssignments ? (
            <div className="py-12 bg-white rounded-2xl border border-gray-200 text-center text-sm text-gray-500">
              Loading your interview assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center space-y-3">
              <span className="text-4xl block">📋</span>
              <h3 className="font-bold text-gray-800 text-base">No Assigned Interviews Yet</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Only candidates who receive an official interview assignment from a recruiter can take an AI interview. Apply to open jobs to get evaluated!
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow transition-colors"
              >
                Browse Open Jobs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {assignments.map((item) => {
                const isExpired =
                  item.status === 'EXPIRED' ||
                  (item.deadline && new Date() > new Date(item.deadline) && item.status !== 'COMPLETED');
                const isCompleted = item.status === 'COMPLETED';
                const isCancelled = item.status === 'CANCELLED';
                const isInProgress = item.status === 'IN_PROGRESS';
                const isStarting = startingAssignmentId === item._id;

                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Company Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.company?.image || 'https://via.placeholder.com/40'}
                            alt=""
                            className="w-12 h-12 rounded-xl border border-gray-100 object-cover"
                          />
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg leading-snug">
                              {item.job?.title || 'Job Interview'}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">{item.company?.name || 'Recruiter'}</p>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Specs */}
                      <div className="flex flex-wrap gap-2 mb-3 text-xs">
                        <span className="px-3 py-1 rounded-lg font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                          {item.interviewType} Round
                        </span>
                        <span className="px-3 py-1 rounded-lg font-semibold bg-gray-100 text-gray-700">
                          {item.difficulty} Level
                        </span>
                        <span className="px-3 py-1 rounded-lg font-semibold bg-blue-50 text-blue-700">
                          ⏱ {item.durationMinutes} min ({item.questionCount} Questions)
                        </span>
                      </div>

                      {/* Skills */}
                      {item.skills && item.skills.length > 0 && (
                        <div className="text-xs text-gray-600 mb-2">
                          <span className="font-semibold text-gray-700">Assessed Competencies: </span>
                          <span className="text-gray-500">{item.skills.join(', ')}</span>
                        </div>
                      )}

                      {/* Custom instructions */}
                      {item.customInstructions && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                          "{item.customInstructions}"
                        </p>
                      )}

                      {/* Deadline info */}
                      <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span>Assigned: {moment(item.createdAt).format('MMM D, YYYY')}</span>
                        <span className={`font-semibold ${isExpired ? 'text-red-500' : 'text-gray-700'}`}>
                          Deadline: {moment(item.deadline).format('MMM D, h:mm A')}
                        </span>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="pt-2">
                      {isCompleted ? (
                        <div className="flex items-center justify-between bg-green-50 p-3 rounded-xl border border-green-200">
                          <div>
                            <span className="text-xs font-semibold text-green-700">Score:</span>
                            <span className="text-xl font-black text-green-900 ml-2">{item.score}%</span>
                          </div>
                          <button
                            onClick={() => navigate(`/mock-interview/session/${item.sessionId}`)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                          >
                            View Report 📊
                          </button>
                        </div>
                      ) : isCancelled ? (
                        <div className="p-3 rounded-xl bg-gray-100 text-center text-xs font-semibold text-gray-500">
                          Assignment has been cancelled by the recruiter.
                        </div>
                      ) : isExpired ? (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center text-xs font-semibold text-red-600">
                          Interview deadline has passed.
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartAssignedInterview(item)}
                          disabled={isStarting}
                          className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                            isInProgress ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isStarting ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                              <span>Starting AI Interview...</span>
                            </>
                          ) : isInProgress ? (
                            <span>▶ Resume Interview Session</span>
                          ) : (
                            <span>🚀 Start Assigned AI Interview</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History List */}
        <InterviewHistory history={history} isLoading={loadingHistory} />
      </main>

      <Footer />
    </div>
  );
};

export default MockInterviewHome;

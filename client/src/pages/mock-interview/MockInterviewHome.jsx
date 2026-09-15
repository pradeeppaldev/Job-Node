import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import JobSelector from '../../components/mock-interview/JobSelector';
import InterviewHistory from '../../components/mock-interview/InterviewHistory';
import AppContext from '../../context/AppContext';
import { useAuth, useUser } from '@clerk/clerk-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MockInterviewHome = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch past completed interviews
  useEffect(() => {
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

    fetchHistory();
  }, [user, backendUrl, getToken]);

  const handleStartInterview = async (jobPayload) => {
    setIsGenerating(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(`${backendUrl}/api/interview/start`, jobPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success('Interview session initialized!');
        navigate(`/mock-interview/session/${data.sessionId}`, {
          state: { session: data.session },
        });
      } else {
        toast.error(data.message || 'Failed to initialize interview.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred starting the interview: ' + (err.message || err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-50/40 to-white">
      <Navbar />

      <main className="flex-grow container px-4 mx-auto py-10 space-y-12">
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            🎤 Interactive AI Practice
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            AI Mock Interview Mode
          </h1>
          <p className="text-gray-600 text-lg">
            Practice role-specific MCQs & Subjective interview questions tailored directly to your target Job Description.
          </p>
        </div>

        {/* Job Selector Setup Card */}
        <JobSelector onStartInterview={handleStartInterview} isGenerating={isGenerating} />

        {/* History List */}
        <InterviewHistory history={history} isLoading={loadingHistory} />
      </main>

      <Footer />
    </div>
  );
};

export default MockInterviewHome;

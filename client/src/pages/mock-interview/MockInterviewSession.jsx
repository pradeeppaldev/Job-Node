import React, { useState, useEffect, useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import McqQuiz from '../../components/mock-interview/McqQuiz';
import McqResults from '../../components/mock-interview/McqResults';
import SubjectiveQuiz from '../../components/mock-interview/SubjectiveQuiz';
import InterviewReport from '../../components/mock-interview/InterviewReport';
import AppContext from '../../context/AppContext';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MockInterviewSession = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { backendUrl } = useContext(AppContext);

  // 'mcq' | 'mcq-results' | 'subjective' | 'report'
  const [step, setStep] = useState('mcq');
  const [session, setSession] = useState(location.state?.session || null);
  const [loadingSession, setLoadingSession] = useState(!location.state?.session);

  const [isSubmittingMcq, setIsSubmittingMcq] = useState(false);
  const [mcqData, setMcqData] = useState(null);

  const [isSubmittingSubjective, setIsSubmittingSubjective] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Fetch session data if not passed in location state
  useEffect(() => {
    if (session) return;

    const fetchSession = async () => {
      setLoadingSession(true);
      try {
        const token = await getToken();
        const { data } = await axios.get(`${backendUrl}/api/interview/session/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (data.success) {
          setSession(data.session);
          if (data.session.status === 'completed') {
            setReportData(data.session);
            setStep('report');
          }
        } else {
          toast.error(data.message || 'Session not found.');
          navigate('/mock-interview');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load session details.');
        navigate('/mock-interview');
      } finally {
        setLoadingSession(false);
      }
    };

    fetchSession();
  }, [id, session, backendUrl, getToken, navigate]);

  // Handle MCQ submission
  const handleSubmitMcq = async (userAnswers) => {
    setIsSubmittingMcq(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/interview/submit-mcq`,
        { sessionId: id, userAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setMcqData(data);
        setStep('mcq-results');
        toast.success('Section 1 submitted successfully!');
      } else {
        toast.error(data.message || 'Failed to evaluate MCQ section.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error submitting MCQs: ' + (err.message || err));
    } finally {
      setIsSubmittingMcq(false);
    }
  };

  // Handle Subjective submission
  const handleSubmitSubjective = async (userAnswers) => {
    setIsSubmittingSubjective(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/interview/submit-subjective`,
        { sessionId: id, userAnswers },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        // Fetch full session details for complete report
        const res = await axios.get(`${backendUrl}/api/interview/session/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setReportData(res.data.session);
        } else {
          setReportData({
            jobTitle: session?.jobTitle,
            companyName: session?.companyName,
            overallScore: data.overallScore,
            mcqScore: data.mcqScore,
            mcqTotal: data.mcqTotal,
            mcqPercentage: data.mcqPercentage,
            subjectiveQuestions: session?.subjectiveQuestions,
            subjectiveUserAnswers: userAnswers,
            subjectiveEvaluation: data.evaluation,
            createdAt: new Date(),
          });
        }

        setStep('report');
        toast.success('Interview completed! Your AI evaluation report is ready.');
      } else {
        toast.error(data.message || 'Failed to evaluate subjective section.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error evaluating interview: ' + (err.message || err));
    } finally {
      setIsSubmittingSubjective(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-blue-50/30 to-white">
      <Navbar />

      <main className="flex-grow container px-4 mx-auto py-8">
        {loadingSession ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
            <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="font-medium">Loading Interview Session...</p>
          </div>
        ) : (
          <>
            {step === 'mcq' && session?.mcqs && (
              <McqQuiz
                mcqs={session.mcqs}
                onSubmitMcq={handleSubmitMcq}
                isSubmitting={isSubmittingMcq}
              />
            )}

            {step === 'mcq-results' && mcqData && (
              <McqResults
                mcqScore={mcqData.mcqScore}
                mcqTotal={mcqData.mcqTotal}
                mcqPercentage={mcqData.mcqPercentage}
                mcqBreakdown={mcqData.mcqBreakdown}
                onProceedToSubjective={() => setStep('subjective')}
              />
            )}

            {step === 'subjective' && (
              <SubjectiveQuiz
                questions={session?.subjectiveQuestions || mcqData?.subjectiveQuestions || []}
                onSubmitSubjective={handleSubmitSubjective}
                isSubmitting={isSubmittingSubjective}
              />
            )}

            {step === 'report' && reportData && (
              <InterviewReport sessionData={reportData} />
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default MockInterviewSession;

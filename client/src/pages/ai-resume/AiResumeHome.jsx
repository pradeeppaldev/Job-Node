import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ResumeCard from '../../components/ai-resume/ResumeCard';
import PuterAuthModal from '../../components/ai-resume/PuterAuthModal';
import { usePuterStore } from '../../lib/puter';

const AiResumeHome = () => {
  const { init, auth, kv, isLoading } = usePuterStore();
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const loadResumes = async () => {
      if (!auth.isAuthenticated) return;
      setLoadingResumes(true);
      try {
        const list = await kv.list('resume:*', true);
        if (Array.isArray(list)) {
          const parsed = list.map((item) => {
            try {
              return typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
            } catch (e) {
              return null;
            }
          }).filter(Boolean);
          setResumes(parsed);
        }
      } catch (err) {
        console.error("Failed to load resumes from Puter KV", err);
      } finally {
        setLoadingResumes(false);
      }
    };

    loadResumes();
  }, [auth.isAuthenticated, kv]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <main className="flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <img src="/images/resume-scan-2.gif" alt="loading" className="w-[180px]" />
            <p className="text-gray-500 mt-4">Initializing Resume AI...</p>
          </div>
        ) : !auth.isAuthenticated ? (
          <PuterAuthModal />
        ) : (
          <section className="main-section">
            <div className="page-heading py-6">
              <h1 className="text-4xl sm:text-5xl font-bold">
                Track Your{' '}
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  Applications
                </span>{' '}
                & Resume Ratings
              </h1>
              <h2 className="text-xl font-semibold italic text-purple-700">
                Better Inputs. Better Outcomes. ✨
              </h2>

              {!loadingResumes && (
                <p className="text-gray-600 mt-2 text-lg">
                  {resumes.length === 0
                    ? 'No practice resumes found. Upload your first resume to get instant AI feedback!'
                    : 'Review your submissions and check AI-powered feedback.'}
                </p>
              )}
            </div>

            {loadingResumes && (
              <div className="flex flex-col items-center justify-center py-10">
                <img src="/images/resume-scan-2.gif" alt="scanning" className="w-[200px]" />
                <p className="text-gray-500 mt-2 font-medium">Fetching your analyzed resumes...</p>
              </div>
            )}

            {!loadingResumes && resumes.length > 0 && (
              <div className="resumes-section mt-4">
                {resumes.map((resume) => (
                  <ResumeCard key={resume.id} resume={resume} />
                ))}
              </div>
            )}

            {!loadingResumes && (
              <div className="flex flex-col items-center justify-center mt-8 gap-4">
                <Link
                  to="/analyze-resume/upload"
                  className="primary-button !w-auto px-8 py-3 text-lg font-semibold shadow-lg"
                >
                  + Upload New Resume for AI Analysis
                </Link>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AiResumeHome;

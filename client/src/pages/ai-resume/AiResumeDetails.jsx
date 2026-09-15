import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import ATS from '../../components/ai-resume/ATS';
import Details from '../../components/ai-resume/Details';
import Summary from '../../components/ai-resume/Summary';
import PuterAuthModal from '../../components/ai-resume/PuterAuthModal';
import { usePuterStore } from '../../lib/puter';

const AiResumeDetails = () => {
  const { init, auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams();
  const [resumeUrl, setResumeUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const loadResumeData = async () => {
      if (!auth.isAuthenticated || !id) return;
      setLoadingData(true);
      try {
        const resumeRaw = await kv.get(`resume:${id}`);
        if (!resumeRaw) {
          setLoadingData(false);
          return;
        }

        const data = typeof resumeRaw === 'string' ? JSON.parse(resumeRaw) : resumeRaw;

        if (data.resumePath) {
          const resumeBlob = await fs.read(data.resumePath);
          if (resumeBlob) {
            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
            setResumeUrl(URL.createObjectURL(pdfBlob));
          }
        }

        if (data.imagePath) {
          const imageBlob = await fs.read(data.imagePath);
          if (imageBlob) {
            setImageUrl(URL.createObjectURL(imageBlob));
          }
        }

        setFeedback(data.feedback);
      } catch (err) {
        console.error("Failed to load resume details from Puter KV", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadResumeData();
  }, [auth.isAuthenticated, id, fs, kv]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <main className="flex-grow">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <img src="/images/resume-scan-2.gif" alt="loading" className="w-[180px]" />
          </div>
        ) : !auth.isAuthenticated ? (
          <PuterAuthModal />
        ) : (
          <div className="w-full">
            <div className="resume-nav bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <Link to="/analyze-resume" className="back-button text-gray-800 font-semibold text-sm">
                <img src="/icons/back.svg" alt="back" className="w-3 h-3" />
                <span>Back to Resumes Dashboard</span>
              </Link>
            </div>

            <div className="flex flex-row w-full max-lg:flex-col-reverse">
              {/* Left section: Resume Image Preview */}
              <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover min-h-[85vh] sticky top-0 items-center justify-center">
                {imageUrl && resumeUrl ? (
                  <div className="animate-in fade-in duration-700 gradient-border max-sm:m-0 h-[85%] w-full flex items-center justify-center">
                    <a href={resumeUrl} target="_blank" rel="noopener noreferrer" title="Click to view original PDF">
                      <img
                        src={imageUrl}
                        alt="Resume Preview"
                        className="max-h-[700px] w-auto object-contain rounded-2xl shadow-lg border border-white"
                      />
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <img src="/images/resume-scan-2.gif" alt="scanning" className="w-[150px]" />
                    <p className="mt-2 text-sm">Loading resume preview...</p>
                  </div>
                )}
              </section>

              {/* Right section: AI Analysis Results */}
              <section className="feedback-section bg-white/50 backdrop-blur-sm">
                <h2 className="text-4xl text-gray-900 font-bold mb-4">Resume Review</h2>
                {loadingData ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <img src="/images/resume-scan-2.gif" alt="scanning" className="w-[200px]" />
                    <p className="text-gray-500 mt-2 font-medium">Fetching AI Analysis Feedback...</p>
                  </div>
                ) : feedback ? (
                  <div className="flex flex-col gap-8 animate-in fade-in duration-700">
                    <Summary feedback={feedback} />
                    <ATS score={feedback.ATS?.score || 0} suggestions={feedback.ATS?.tips || []} />
                    <Details feedback={feedback} />
                  </div>
                ) : (
                  <div className="bg-yellow-50 text-yellow-800 p-6 rounded-2xl border border-yellow-200 text-center">
                    <p className="text-lg font-semibold">No analysis feedback found for this resume.</p>
                    <Link to="/analyze-resume/upload" className="primary-button inline-block mt-4 !w-auto px-6 py-2">
                      Run Analysis Now
                    </Link>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AiResumeDetails;

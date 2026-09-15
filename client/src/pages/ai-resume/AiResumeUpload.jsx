import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import FileUploader from '../../components/ai-resume/FileUploader';
import PuterAuthModal from '../../components/ai-resume/PuterAuthModal';
import { prepareInstructions } from '../../constants/aiResume';
import { convertPdfToImage } from '../../lib/pdf2img';
import { usePuterStore } from '../../lib/puter';
import { generateUUID } from '../../lib/utils';
import { toast } from 'react-toastify';

const AiResumeUpload = () => {
  const { init, auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [file, setFile] = useState(null);

  useEffect(() => {
    init();
  }, [init]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }) => {
    setIsProcessing(true);
    try {
      setStatusText('Uploading the resume file...');
      const uploadedFile = await fs.upload([file]);

      if (!uploadedFile) {
        toast.error('Failed to upload file. Please try again.');
        setIsProcessing(false);
        return;
      }

      setStatusText('Converting PDF page to preview image...');
      const imageFile = await convertPdfToImage(file);
      if (!imageFile.file) {
        toast.error('Failed to convert PDF to image. Please try again.');
        setIsProcessing(false);
        return;
      }

      setStatusText('Uploading preview image...');
      const uploadedImage = await fs.upload([imageFile.file]);
      if (!uploadedImage) {
        toast.error('Failed to upload preview image. Please try again.');
        setIsProcessing(false);
        return;
      }

      setStatusText('Preparing analysis data...');
      const uuid = generateUUID();

      const data = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: null,
      };

      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText('Analyzing resume with AI (evaluating ATS score & feedback)...');

      const feedbackRes = await ai.feedback(
        uploadedFile.path,
        prepareInstructions({ jobTitle, jobDescription })
      );

      if (!feedbackRes || !feedbackRes.message || !feedbackRes.message.content) {
        toast.error('Failed to analyze resume with AI. Please try again.');
        setIsProcessing(false);
        return;
      }

      const rawContent = feedbackRes.message.content;
      const feedbackText = typeof rawContent === 'string' ? rawContent : rawContent[0]?.text || '';

      // Clean JSON string if enclosed in markdown code blocks
      const cleanJson = feedbackText.replace(/```json/g, '').replace(/```/g, '').trim();

      data.feedback = JSON.parse(cleanJson);
      await kv.set(`resume:${uuid}`, JSON.stringify(data));

      setStatusText('Analysis complete! Redirecting to results page...');
      toast.success('Resume analyzed successfully!');
      navigate(`/analyze-resume/${uuid}`);
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during analysis: ' + (err.message || err));
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please upload a PDF resume.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const companyName = formData.get('company-name') || '';
    const jobTitle = formData.get('job-title') || '';
    const jobDescription = formData.get('job-description') || '';

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

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
          <section className="main-section">
            <div className="page-heading py-8 w-full max-w-3xl">
              <h1 className="text-4xl font-bold">Smart feedback for your dream job</h1>
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 mt-6">
                  <h2 className="text-xl font-semibold text-blue-600 animate-pulse">{statusText}</h2>
                  <img src="/images/resume-scan.gif" className="w-full max-w-md rounded-2xl shadow-md" alt="Scanning resume" />
                </div>
              ) : (
                <h2 className="text-lg text-gray-600 mt-2">
                  Drop your resume for an ATS score, JD matching & improvement tips
                </h2>
              )}

              {!isProcessing && (
                <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-6 mt-8 w-full text-left">
                  <div className="form-div">
                    <label htmlFor="company-name">Company Name (Optional)</label>
                    <input
                      type="text"
                      name="company-name"
                      placeholder="e.g. Google, Microsoft"
                      id="company-name"
                    />
                  </div>

                  <div className="form-div">
                    <label htmlFor="job-title">Job Title (Target Role)</label>
                    <input
                      type="text"
                      name="job-title"
                      placeholder="e.g. Frontend Developer, Data Analyst"
                      id="job-title"
                      required
                    />
                  </div>

                  <div className="form-div">
                    <label htmlFor="job-description">Job Description</label>
                    <textarea
                      rows={5}
                      name="job-description"
                      placeholder="Paste the target job description here for accurate skill matching & ATS feedback..."
                      id="job-description"
                      required
                    />
                  </div>

                  <div className="form-div">
                    <label htmlFor="uploader">Upload Resume (PDF)</label>
                    <FileUploader onFileSelect={handleFileSelect} />
                  </div>

                  <button className="primary-button text-lg font-semibold py-3 mt-4" type="submit">
                    Analyze Resume with AI
                  </button>
                </form>
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AiResumeUpload;

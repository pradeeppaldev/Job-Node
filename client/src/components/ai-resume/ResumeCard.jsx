import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ScoreCircle from './ScoreCircle';
import { usePuterStore } from '../../lib/puter';

const ResumeCard = ({ resume }) => {
  const { id, companyName, jobTitle, feedback, imagePath } = resume || {};
  const { fs } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState('');

  useEffect(() => {
    const loadResumeImage = async () => {
      if (!imagePath) return;
      try {
        const blob = await fs.read(imagePath);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setResumeUrl(url);
      } catch (err) {
        console.error("Failed to load resume image", err);
      }
    };

    loadResumeImage();
  }, [imagePath, fs]);

  return (
    <Link to={`/analyze-resume/${id}`} className="resume-card animate-in fade-in duration-500">
      <div className="resume-card-header">
        <div className="flex flex-col gap-1">
          {companyName ? (
            <h2 className="!text-black font-bold text-xl break-words">{companyName}</h2>
          ) : null}
          {jobTitle ? (
            <h3 className="text-base break-words text-gray-500">{jobTitle}</h3>
          ) : null}
          {!companyName && !jobTitle && (
            <h2 className="!text-black font-bold text-xl">Resume</h2>
          )}
        </div>
        <div className="flex-shrink-0">
          <ScoreCircle score={feedback?.overallScore || 0} />
        </div>
      </div>
      {resumeUrl ? (
        <div className="gradient-border animate-in fade-in duration-500 overflow-hidden rounded-xl">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt="resume preview"
              className="w-full h-[320px] max-sm:h-[200px] object-cover object-top rounded-lg"
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-xl h-[320px] flex items-center justify-center text-gray-400">
          Loading Preview...
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;

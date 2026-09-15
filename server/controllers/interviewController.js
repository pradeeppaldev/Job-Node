import InterviewSession from '../models/InterviewSession.js';
import Job from '../models/Job.js';
import { generateMcqs, generateSubjectiveQuestions, evaluateSubjectiveAnswers } from '../services/geminiService.js';

/**
 * Start a new AI Mock Interview Session
 * Generates 10 MCQs & 5 Subjective questions and saves the session in DB
 */
export const startInterview = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { jobTitle, jobDescription, companyName, jobId } = req.body;

    if (!jobTitle || !jobDescription) {
      return res.json({ success: false, message: 'Job title and description are required' });
    }

    let finalJobTitle = jobTitle;
    let finalJobDesc = jobDescription;
    let finalCompanyName = companyName || '';

    // If jobId provided, populate from Job model if available
    if (jobId) {
      const existingJob = await Job.findById(jobId).populate('companyId', 'name');
      if (existingJob) {
        finalJobTitle = existingJob.title;
        finalJobDesc = existingJob.description;
        finalCompanyName = existingJob.companyId?.name || finalCompanyName;
      }
    }

    // Generate 10 MCQs (1 AI call or fallback)
    const mcqs = await generateMcqs(finalJobTitle, finalJobDesc);

    // Generate 5 Subjective Questions (1 AI call or fallback)
    const subjectiveQuestions = await generateSubjectiveQuestions(finalJobTitle, finalJobDesc);

    const session = await InterviewSession.create({
      userId,
      jobTitle: finalJobTitle,
      jobId: jobId || null,
      companyName: finalCompanyName,
      jobDescription: finalJobDesc,
      status: 'in-progress',
      mcqs,
      mcqUserAnswers: [],
      mcqScore: 0,
      mcqTotal: mcqs.length,
      subjectiveQuestions,
      subjectiveUserAnswers: [],
    });

    // Return session data to frontend without revealing correct answers during quiz
    const sanitizedMcqs = session.mcqs.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
    }));

    return res.json({
      success: true,
      sessionId: session._id,
      session: {
        _id: session._id,
        jobTitle: session.jobTitle,
        companyName: session.companyName,
        jobDescription: session.jobDescription,
        status: session.status,
        mcqs: sanitizedMcqs,
        subjectiveQuestions: session.subjectiveQuestions,
      },
    });
  } catch (error) {
    console.error('Error starting interview session:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Submit MCQ Section (Calculates MCQ score locally in backend logic - 0 AI calls)
 */
export const submitMcq = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { sessionId, userAnswers } = req.body; // userAnswers: array of option indices (0-3)

    if (!sessionId || !Array.isArray(userAnswers)) {
      return res.json({ success: false, message: 'Invalid session ID or answers format' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.json({ success: false, message: 'Interview session not found' });
    }

    let score = 0;
    const mcqBreakdown = session.mcqs.map((q, idx) => {
      const selectedOption = userAnswers[idx] !== undefined ? userAnswers[idx] : -1;
      const isCorrect = selectedOption === q.correctAnswer;
      if (isCorrect) score += 1;

      return {
        questionNumber: idx + 1,
        question: q.question,
        options: q.options,
        userAnswer: selectedOption,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    session.mcqUserAnswers = userAnswers;
    session.mcqScore = score;
    session.mcqTotal = session.mcqs.length;
    await session.save();

    const percentage = Math.round((score / session.mcqs.length) * 100);

    return res.json({
      success: true,
      mcqScore: score,
      mcqTotal: session.mcqs.length,
      mcqPercentage: percentage,
      mcqBreakdown,
      subjectiveQuestions: session.subjectiveQuestions,
    });
  } catch (error) {
    console.error('Error submitting MCQ section:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Submit Subjective Section (1 AI call to evaluate all 5 answers together)
 */
export const submitSubjective = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { sessionId, userAnswers } = req.body; // userAnswers: array of 5 text strings

    if (!sessionId || !Array.isArray(userAnswers)) {
      return res.json({ success: false, message: 'Invalid session ID or answers format' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.json({ success: false, message: 'Interview session not found' });
    }

    // Evaluate all 5 answers together via Gemini AI (1 API call)
    const evaluation = await evaluateSubjectiveAnswers(
      session.jobTitle,
      session.jobDescription,
      session.subjectiveQuestions,
      userAnswers
    );

    // Calculate aggregated overall score: 40% MCQ + 60% Subjective
    const mcqPercent = (session.mcqScore / (session.mcqTotal || 10)) * 100;
    const subjectivePercent = evaluation.overallScore || 0;
    const overallScore = Math.round(mcqPercent * 0.4 + subjectivePercent * 0.6);

    session.subjectiveUserAnswers = userAnswers;
    session.subjectiveEvaluation = evaluation;
    session.overallScore = overallScore;
    session.status = 'completed';

    await session.save();

    return res.json({
      success: true,
      overallScore,
      mcqScore: session.mcqScore,
      mcqTotal: session.mcqTotal,
      mcqPercentage: Math.round(mcqPercent),
      subjectivePercentage: subjectivePercent,
      evaluation,
    });
  } catch (error) {
    console.error('Error submitting Subjective section:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Get Interview History for current user
 */
export const getInterviewHistory = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const history = await InterviewSession.find({ userId, status: 'completed' })
      .select('jobTitle companyName overallScore mcqScore mcqTotal createdAt status')
      .sort({ createdAt: -1 });

    return res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Get single interview session report details
 */
export const getInterviewSession = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;

    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) {
      return res.json({ success: false, message: 'Interview session not found' });
    }

    // Generate breakdown for display
    const mcqBreakdown = session.mcqs.map((q, idx) => {
      const selectedOption = session.mcqUserAnswers[idx] !== undefined ? session.mcqUserAnswers[idx] : -1;
      return {
        questionNumber: idx + 1,
        question: q.question,
        options: q.options,
        userAnswer: selectedOption,
        correctAnswer: q.correctAnswer,
        isCorrect: selectedOption === q.correctAnswer,
        explanation: q.explanation,
      };
    });

    return res.json({
      success: true,
      session: {
        _id: session._id,
        jobTitle: session.jobTitle,
        companyName: session.companyName,
        jobDescription: session.jobDescription,
        status: session.status,
        overallScore: session.overallScore,
        mcqScore: session.mcqScore,
        mcqTotal: session.mcqTotal,
        mcqPercentage: Math.round((session.mcqScore / (session.mcqTotal || 10)) * 100),
        mcqBreakdown,
        subjectiveQuestions: session.subjectiveQuestions,
        subjectiveUserAnswers: session.subjectiveUserAnswers,
        subjectiveEvaluation: session.subjectiveEvaluation,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching interview session details:', error);
    return res.json({ success: false, message: error.message });
  }
};

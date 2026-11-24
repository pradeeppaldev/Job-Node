import InterviewSession from '../models/InterviewSession.js';
import InterviewAssignment from '../models/InterviewAssignment.js';
import JobApplication from '../models/jobApplications.js';
import User from '../models/User.js';
import {
  extractResumeContext,
  generateOpeningInterviewQuestion,
  evaluateAndGenerateNextTurn,
  generateGroundedFinalReport,
  generateMcqs,
  generateSubjectiveQuestions,
  evaluateSubjectiveAnswers,
} from '../services/geminiService.js';

/**
 * Get all interview assignments for the authenticated candidate
 */
export const getMyInterviewAssignments = async (req, res) => {
  try {
    const candidateId = req.auth?.userId;
    if (!candidateId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const assignments = await InterviewAssignment.find({ candidateId })
      .populate('jobId', 'title location category level salary description')
      .populate('companyId', 'name image email')
      .populate('sessionId', 'overallScore mcqScore mcqTotal status createdAt mode')
      .sort({ createdAt: -1 });

    const now = new Date();
    const formatted = await Promise.all(
      assignments.map(async (a) => {
        let effectiveStatus = a.status;
        if (
          ['ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS'].includes(a.status) &&
          a.deadline &&
          now > new Date(a.deadline)
        ) {
          effectiveStatus = 'EXPIRED';
          if (a.status !== 'EXPIRED') {
            a.status = 'EXPIRED';
            await a.save();
          }
        }

        return {
          _id: a._id,
          job: a.jobId,
          company: a.companyId,
          interviewType: a.interviewType,
          difficulty: a.difficulty,
          durationMinutes: a.durationMinutes,
          questionCount: a.questionCount,
          skills: a.skills,
          customInstructions: a.customInstructions,
          deadline: a.deadline,
          status: effectiveStatus,
          allowRetake: a.allowRetake,
          candidateReportVisible: a.candidateReportVisible !== false,
          score: a.candidateReportVisible !== false ? (a.score ?? a.sessionId?.overallScore ?? null) : null,
          recommendation: a.candidateReportVisible !== false ? (a.recommendation || '') : '',
          sessionId: a.sessionId?._id || a.sessionId || null,
          startedAt: a.startedAt,
          completedAt: a.completedAt,
          createdAt: a.createdAt,
        };
      })
    );

    return res.json({ success: true, assignments: formatted });
  } catch (error) {
    console.error('Error fetching candidate assignments:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Get single interview assignment details for the candidate
 */
export const getAssignmentDetails = async (req, res) => {
  try {
    const candidateId = req.auth?.userId;
    const { id } = req.params;

    if (!candidateId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const assignment = await InterviewAssignment.findById(id)
      .populate('jobId', 'title location category level salary description')
      .populate('companyId', 'name image email')
      .populate('sessionId', 'overallScore mcqScore mcqTotal status createdAt mode');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Interview assignment not found.' });
    }

    if (assignment.candidateId.toString() !== candidateId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You are not assigned to this interview.',
      });
    }

    let effectiveStatus = assignment.status;
    if (
      ['ASSIGNED', 'NOT_STARTED', 'IN_PROGRESS'].includes(assignment.status) &&
      assignment.deadline &&
      new Date() > new Date(assignment.deadline)
    ) {
      effectiveStatus = 'EXPIRED';
      if (assignment.status !== 'EXPIRED') {
        assignment.status = 'EXPIRED';
        await assignment.save();
      }
    }

    return res.json({
      success: true,
      assignment: {
        _id: assignment._id,
        job: assignment.jobId,
        company: assignment.companyId,
        interviewType: assignment.interviewType,
        difficulty: assignment.difficulty,
        durationMinutes: assignment.durationMinutes,
        questionCount: assignment.questionCount,
        skills: assignment.skills,
        customInstructions: assignment.customInstructions,
        deadline: assignment.deadline,
        status: effectiveStatus,
        allowRetake: assignment.allowRetake,
        score: assignment.score,
        sessionId: assignment.sessionId?._id || assignment.sessionId || null,
        startedAt: assignment.startedAt,
        completedAt: assignment.completedAt,
        createdAt: assignment.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching assignment details:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Start or resume an Assigned AI Interview Session (Phase 2: Resume-Aware Adaptive Engine)
 */
export const startAssignedInterview = async (req, res) => {
  try {
    const candidateId = req.auth?.userId;
    const { assignmentId } = req.body;

    if (!candidateId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!assignmentId) {
      return res.status(400).json({ success: false, message: 'Interview assignment ID is required.' });
    }

    const assignment = await InterviewAssignment.findById(assignmentId)
      .populate('jobId')
      .populate('companyId');

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Interview assignment not found.' });
    }

    // 1. Strict ownership validation
    if (assignment.candidateId.toString() !== candidateId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You are not assigned to this interview.',
      });
    }

    // 2. Cancellation check
    if (assignment.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This interview assignment has been cancelled by the recruiter.',
      });
    }

    // 3. Expiration check
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      assignment.status = 'EXPIRED';
      await assignment.save();
      return res.status(400).json({
        success: false,
        message: 'The deadline for this interview assignment has passed.',
      });
    }

    // 4. Completion check
    if (assignment.status === 'COMPLETED' && !assignment.allowRetake) {
      return res.status(400).json({
        success: false,
        message: 'This interview has already been completed.',
        sessionId: assignment.sessionId,
      });
    }

    // 5. Resume existing IN_PROGRESS session (prevents duplicate sessions)
    if (assignment.status === 'IN_PROGRESS' && assignment.sessionId) {
      const existingSession = await InterviewSession.findById(assignment.sessionId);
      if (existingSession && existingSession.status === 'in-progress') {
        return res.json({
          success: true,
          isResumed: true,
          sessionId: existingSession._id,
          assignmentId: assignment._id,
          session: formatSessionForClient(existingSession),
        });
      }
    }

    // 6. Prepare Candidate Resume Context (reuse cached parsedResume if URL matches)
    const user = await User.findById(candidateId);
    let resumeContext = null;

    if (user?.resume && user.parsedResumeUrl === user.resume && user.parsedResume) {
      resumeContext = user.parsedResume;
    } else {
      resumeContext = await extractResumeContext(user?.resume || '', user?.skills || []);
      if (user && user.resume && resumeContext?.hasResume) {
        user.parsedResume = resumeContext;
        user.parsedResumeUrl = user.resume;
        await user.save();
      }
    }

    const jobTitle = assignment.jobId?.title || 'Software Professional';
    const jobDesc = assignment.jobId?.description || 'Job requirements';
    const jobSkills = assignment.jobId?.skills || [];
    const companyName = assignment.companyId?.name || '';
    const targetQuestionCount = assignment.questionCount || 5;
    const durationMinutes = assignment.durationMinutes || 30;

    // 7. Generate Personalized Opening Question (#1) via Gemini
    const openingQ = await generateOpeningInterviewQuestion({
      resumeContext,
      jobTitle,
      jobDescription: jobDesc,
      jobSkills,
      interviewConfig: {
        interviewType: assignment.interviewType,
        difficulty: assignment.difficulty,
        skills: assignment.skills,
        customInstructions: assignment.customInstructions,
      },
    });

    // 8. Create Adaptive InterviewSession
    const session = await InterviewSession.create({
      userId: candidateId,
      assignmentId: assignment._id,
      companyId: assignment.companyId?._id,
      jobTitle,
      jobId: assignment.jobId?._id,
      companyName,
      jobDescription: jobDesc,
      interviewType: assignment.interviewType,
      difficulty: assignment.difficulty,
      skills: assignment.skills,
      customInstructions: assignment.customInstructions,
      mode: 'adaptive',
      targetQuestionCount,
      durationMinutes,
      resumeContext,
      coveredTopics: [openingQ.topic],
      turns: [
        {
          turnNumber: 1,
          question: openingQ.question,
          questionType: openingQ.questionType,
          topic: openingQ.topic,
          difficulty: openingQ.difficulty,
          isFollowUp: false,
          askedAt: new Date(),
        },
      ],
      status: 'in-progress',
    });

    // 9. Update assignment status
    assignment.status = 'IN_PROGRESS';
    assignment.startedAt = new Date();
    assignment.sessionId = session._id;
    assignment.allowRetake = false;
    await assignment.save();

    return res.json({
      success: true,
      sessionId: session._id,
      assignmentId: assignment._id,
      session: formatSessionForClient(session),
    });
  } catch (error) {
    console.error('Error starting assigned interview session:', error);
    return res.status(500).json({ success: false, message: 'Failed to initialize interview session.' });
  }
};

/**
 * Submit an answer for the current adaptive interview turn
 * Evaluates the answer and generates the next contextual follow-up or topic question in 1 AI call
 */
export const submitAdaptiveTurn = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { sessionId, turnNumber, answer } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId }).populate('jobId', 'skills');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found or unauthorized.' });
    }

    if (session.status === 'completed') {
      return res.json({
        success: true,
        isCompleted: true,
        finalReport: session.finalReport,
        session: formatSessionForClient(session),
      });
    }

    // Locate the active turn
    const turnIdx = turnNumber
      ? session.turns.findIndex((t) => t.turnNumber === Number(turnNumber))
      : session.turns.length - 1;

    if (turnIdx === -1 || !session.turns[turnIdx]) {
      return res.status(400).json({ success: false, message: 'Invalid interview turn.' });
    }

    const currentTurn = session.turns[turnIdx];

    // Idempotency guard: prevent duplicate submissions for an already-answered turn
    if (currentTurn.answeredAt || turnIdx < session.turns.length - 1) {
      return res.json({
        success: true,
        isDuplicate: true,
        isCompleted: session.status === 'completed',
        currentTurn: session.turns[session.turns.length - 1],
        session: formatSessionForClient(session),
      });
    }

    // Verify linked assignment is still active (not cancelled)
    if (session.assignmentId) {
      const assignment = await InterviewAssignment.findById(session.assignmentId).select('status');
      if (assignment && assignment.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'This interview assignment was cancelled by the recruiter.',
        });
      }
    }

    const cleanAnswer = typeof answer === 'string' ? answer.trim() : '';

    currentTurn.answer = cleanAnswer;
    currentTurn.answeredAt = new Date();

    // Evaluate current answer & generate next adaptive question (1 Gemini API call)
    const aiResult = await evaluateAndGenerateNextTurn({
      resumeContext: session.resumeContext,
      jobTitle: session.jobTitle,
      jobDescription: session.jobDescription,
      jobSkills: session.jobId?.skills || [],
      interviewConfig: {
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        skills: session.skills,
        customInstructions: session.customInstructions,
      },
      turnsHistory: session.turns,
      currentTurn,
      candidateAnswer: cleanAnswer,
      targetQuestionCount: session.targetQuestionCount || 5,
      coveredTopics: session.coveredTopics || [],
    });

    currentTurn.evaluation = aiResult.answerEvaluation;

    const shouldComplete =
      aiResult.completionDecision === 'complete' ||
      session.turns.length >= (session.targetQuestionCount || 5) ||
      !aiResult.nextQuestion;

    if (shouldComplete) {
      // Generate final evidence-grounded report
      const finalReport = await generateGroundedFinalReport({
        resumeContext: session.resumeContext,
        jobTitle: session.jobTitle,
        jobDescription: session.jobDescription,
        interviewConfig: {
          interviewType: session.interviewType,
          difficulty: session.difficulty,
          skills: session.skills,
        },
        turns: session.turns,
      });

      session.finalReport = finalReport;
      session.overallScore = finalReport.overallScore;
      session.status = 'completed';
      await session.save();

      // Update linked Assignment & Application
      if (session.assignmentId) {
        const assignment = await InterviewAssignment.findById(session.assignmentId);
        if (assignment) {
          assignment.status = 'COMPLETED';
          assignment.score = finalReport.overallScore;
          assignment.recommendation = finalReport.hiringRecommendation || '';
          assignment.completedAt = new Date();
          await assignment.save();

          if (assignment.applicationId) {
            await JobApplication.findByIdAndUpdate(assignment.applicationId, {
              interviewStatus: 'Completed',
            });
          }
        }
      }

      return res.json({
        success: true,
        isCompleted: true,
        previousEvaluation: currentTurn.evaluation,
        finalReport,
        session: formatSessionForClient(session),
      });
    }

    // Otherwise, append the adaptive next question
    const nextTurn = {
      turnNumber: session.turns.length + 1,
      question: aiResult.nextQuestion.question,
      questionType: aiResult.nextQuestion.questionType,
      topic: aiResult.nextQuestion.topic,
      difficulty: aiResult.nextQuestion.difficulty,
      isFollowUp: aiResult.nextQuestion.isFollowUp,
      askedAt: new Date(),
    };

    session.turns.push(nextTurn);
    if (nextTurn.topic && !session.coveredTopics.includes(nextTurn.topic)) {
      session.coveredTopics.push(nextTurn.topic);
    }

    await session.save();

    return res.json({
      success: true,
      isCompleted: false,
      previousEvaluation: currentTurn.evaluation,
      currentTurn: nextTurn,
      progress: {
        current: nextTurn.turnNumber,
        total: session.targetQuestionCount || 5,
      },
      session: formatSessionForClient(session),
    });
  } catch (error) {
    console.error('Error processing adaptive interview turn:', error);
    return res.status(500).json({ success: false, message: 'Failed to process your answer. Please try again.' });
  }
};

/**
 * End an adaptive interview session early and generate grounded final report from completed turns
 */
export const endAdaptiveInterview = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { sessionId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found or unauthorized.' });
    }

    if (session.status === 'completed') {
      return res.json({
        success: true,
        isCompleted: true,
        finalReport: session.finalReport,
        session: formatSessionForClient(session),
      });
    }

    // Mark any unanswered last turn as skipped/ended
    const answeredTurns = session.turns.filter((t) => t.answer && t.answer.trim().length > 0);
    const turnsForReport = answeredTurns.length > 0 ? answeredTurns : session.turns;

    const finalReport = await generateGroundedFinalReport({
      resumeContext: session.resumeContext,
      jobTitle: session.jobTitle,
      jobDescription: session.jobDescription,
      interviewConfig: {
        interviewType: session.interviewType,
        difficulty: session.difficulty,
        skills: session.skills,
      },
      turns: turnsForReport,
    });

    session.finalReport = finalReport;
    session.overallScore = finalReport.overallScore;
    session.status = 'completed';
    await session.save();

    if (session.assignmentId) {
      const assignment = await InterviewAssignment.findById(session.assignmentId);
      if (assignment) {
        assignment.status = 'COMPLETED';
        assignment.score = finalReport.overallScore;
        assignment.recommendation = finalReport.hiringRecommendation || '';
        assignment.completedAt = new Date();
        await assignment.save();

        if (assignment.applicationId) {
          await JobApplication.findByIdAndUpdate(assignment.applicationId, {
            interviewStatus: 'Completed',
          });
        }
      }
    }

    return res.json({
      success: true,
      isCompleted: true,
      finalReport,
      session: formatSessionForClient(session),
    });
  } catch (error) {
    console.error('Error ending interview early:', error);
    return res.status(500).json({ success: false, message: 'Failed to end interview session.' });
  }
};

/**
 * Legacy/Direct start route - strictly guarded
 */
export const startInterview = async (req, res) => {
  const { assignmentId } = req.body;
  if (!assignmentId) {
    return res.status(403).json({
      success: false,
      message: 'Direct public interview access is restricted. An interview assignment from a recruiter is required.',
    });
  }
  return startAssignedInterview(req, res);
};

/**
 * Submit MCQ Section (Classic mode backward compatibility)
 */
export const submitMcq = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { sessionId, userAnswers } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!sessionId || !Array.isArray(userAnswers)) {
      return res.json({ success: false, message: 'Invalid session ID or answers format' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found or unauthorized.' });
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
 * Submit Subjective Section (Classic mode backward compatibility)
 */
export const submitSubjective = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const { sessionId, userAnswers } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!sessionId || !Array.isArray(userAnswers)) {
      return res.json({ success: false, message: 'Invalid session ID or answers format' });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found or unauthorized.' });
    }

    const evaluation = await evaluateSubjectiveAnswers(
      session.jobTitle,
      session.jobDescription,
      session.subjectiveQuestions,
      userAnswers,
      {
        interviewType: session.interviewType || 'Technical',
        difficulty: session.difficulty || 'Medium',
      }
    );

    const mcqPercent = (session.mcqScore / (session.mcqTotal || 10)) * 100;
    const subjectivePercent = evaluation.overallScore || 0;
    const overallScore = Math.round(mcqPercent * 0.4 + subjectivePercent * 0.6);

    session.subjectiveUserAnswers = userAnswers;
    session.subjectiveEvaluation = evaluation;
    session.overallScore = overallScore;
    session.status = 'completed';
    await session.save();

    if (session.assignmentId) {
      const assignment = await InterviewAssignment.findById(session.assignmentId);
      if (assignment) {
        assignment.status = 'COMPLETED';
        assignment.score = overallScore;
        assignment.completedAt = new Date();
        await assignment.save();

        if (assignment.applicationId) {
          await JobApplication.findByIdAndUpdate(assignment.applicationId, {
            interviewStatus: 'Completed',
          });
        }
      }
    }

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
 * Get Interview History for candidate
 */
export const getInterviewHistory = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const sessions = await InterviewSession.find({ userId, status: 'completed' })
      .select('jobTitle companyName overallScore mcqScore mcqTotal createdAt status interviewType difficulty mode assignmentId')
      .populate('assignmentId', 'candidateReportVisible')
      .sort({ createdAt: -1 });

    const history = sessions.map((s) => {
      const isHidden = s.assignmentId && s.assignmentId.candidateReportVisible === false;
      return {
        _id: s._id,
        jobTitle: s.jobTitle,
        companyName: s.companyName,
        overallScore: isHidden ? null : s.overallScore,
        mcqScore: isHidden ? null : s.mcqScore,
        mcqTotal: s.mcqTotal,
        createdAt: s.createdAt,
        status: s.status,
        interviewType: s.interviewType,
        difficulty: s.difficulty,
        mode: s.mode,
        reportHiddenByRecruiter: Boolean(isHidden),
      };
    });

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
    const userId = req.auth?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Interview session not found or unauthorized.' });
    }

    // Safe retry if completed adaptive session has missing/failed report
    if (
      session.status === 'completed' &&
      session.mode === 'adaptive' &&
      (!session.finalReport || session.finalReport.reportStatus === 'failed' || !session.finalReport.overallFeedback)
    ) {
      const regenerated = await generateGroundedFinalReport({
        resumeContext: session.resumeContext,
        jobTitle: session.jobTitle,
        jobDescription: session.jobDescription,
        interviewConfig: {
          interviewType: session.interviewType,
          difficulty: session.difficulty,
          skills: session.skills,
        },
        turns: session.turns,
      });
      session.finalReport = regenerated;
      session.overallScore = regenerated.overallScore;
      await session.save();
    }

    // Respect recruiter report visibility setting
    if (session.assignmentId && session.status === 'completed') {
      const assignment = await InterviewAssignment.findById(session.assignmentId).select('candidateReportVisible');
      if (assignment && assignment.candidateReportVisible === false) {
        return res.json({
          success: true,
          reportHiddenByRecruiter: true,
          session: {
            _id: session._id,
            jobTitle: session.jobTitle,
            companyName: session.companyName,
            interviewType: session.interviewType,
            difficulty: session.difficulty,
            status: session.status,
            createdAt: session.createdAt,
            reportHiddenByRecruiter: true,
          },
        });
      }
    }

    return res.json({
      success: true,
      session: formatSessionForClient(session),
    });
  } catch (error) {
    console.error('Error fetching interview session details:', error);
    return res.json({ success: false, message: error.message });
  }
};

/**
 * Helper to sanitize and format InterviewSession for client responses
 */
function formatSessionForClient(session) {
  const sanitizedMcqs = (session.mcqs || []).map((q) => ({
    _id: q._id,
    question: q.question,
    options: q.options,
  }));

  const mcqBreakdown =
    session.status === 'completed'
      ? (session.mcqs || []).map((q, idx) => {
          const selectedOption = session.mcqUserAnswers?.[idx] !== undefined ? session.mcqUserAnswers[idx] : -1;
          return {
            questionNumber: idx + 1,
            question: q.question,
            options: q.options,
            userAnswer: selectedOption,
            correctAnswer: q.correctAnswer,
            isCorrect: selectedOption === q.correctAnswer,
            explanation: q.explanation,
          };
        })
      : [];

  return {
    _id: session._id,
    assignmentId: session.assignmentId,
    jobTitle: session.jobTitle,
    companyName: session.companyName,
    jobDescription: session.jobDescription,
    interviewType: session.interviewType || 'Technical',
    difficulty: session.difficulty || 'Medium',
    skills: session.skills || [],
    mode: session.mode || 'adaptive',
    targetQuestionCount: session.targetQuestionCount || 5,
    durationMinutes: session.durationMinutes || 30,
    hasResumeContext: Boolean(session.resumeContext?.hasResume),
    coveredTopics: session.coveredTopics || [],
    turns: session.turns || [],
    finalReport: session.finalReport || null,
    status: session.status,
    overallScore: session.overallScore,
    mcqScore: session.mcqScore,
    mcqTotal: session.mcqTotal,
    mcqPercentage: session.mcqTotal ? Math.round((session.mcqScore / session.mcqTotal) * 100) : 0,
    mcqs: sanitizedMcqs,
    mcqBreakdown,
    subjectiveQuestions: session.subjectiveQuestions,
    subjectiveUserAnswers: session.subjectiveUserAnswers,
    subjectiveEvaluation: session.subjectiveEvaluation,
    createdAt: session.createdAt,
  };
}

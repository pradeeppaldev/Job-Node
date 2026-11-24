import express from 'express';
import {
  getMyInterviewAssignments,
  getAssignmentDetails,
  startAssignedInterview,
  submitAdaptiveTurn,
  endAdaptiveInterview,
  startInterview,
  submitMcq,
  submitSubjective,
  getInterviewHistory,
  getInterviewSession,
} from '../controllers/interviewController.js';

const router = express.Router();

// Candidate: Get all assigned interviews
router.get('/my-assignments', getMyInterviewAssignments);

// Candidate: Get single assignment details
router.get('/assignment/:id', getAssignmentDetails);

// Candidate: Start or resume an assigned interview
router.post('/start-assigned', startAssignedInterview);

// Candidate: Submit answer for adaptive interview turn and receive follow-up / next question
router.post('/adaptive-turn', submitAdaptiveTurn);

// Candidate: End adaptive interview early and generate final report
router.post('/end-early', endAdaptiveInterview);

// Legacy start route (now assignment-guarded)
router.post('/start', startInterview);

// Submit MCQ section
router.post('/submit-mcq', submitMcq);

// Submit Subjective section
router.post('/submit-subjective', submitSubjective);

// Get user's interview history
router.get('/history', getInterviewHistory);

// Get single session report details
router.get('/session/:id', getInterviewSession);

export default router;

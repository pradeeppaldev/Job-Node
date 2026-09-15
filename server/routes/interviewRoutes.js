import express from 'express';
import {
  startInterview,
  submitMcq,
  submitSubjective,
  getInterviewHistory,
  getInterviewSession,
} from '../controllers/interviewController.js';

const router = express.Router();

// Start new interview session
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

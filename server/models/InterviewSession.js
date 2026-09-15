import mongoose from "mongoose";

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
  },
  companyName: {
    type: String,
    default: '',
  },
  jobDescription: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress',
  },
  // Section 1: MCQs
  mcqs: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true }, // Index 0-3
      explanation: { type: String, default: '' },
    },
  ],
  mcqUserAnswers: [{ type: Number }], // User selected index 0-3
  mcqScore: { type: Number, default: 0 },
  mcqTotal: { type: Number, default: 10 },

  // Section 2: Subjective
  subjectiveQuestions: [{ type: String }],
  subjectiveUserAnswers: [{ type: String }],
  subjectiveEvaluation: {
    overallScore: { type: Number, default: 0 },
    overallFeedback: { type: String, default: '' },
    strongTopics: [{ type: String }],
    improvementTopics: [{ type: String }],
    results: [
      {
        questionNumber: { type: Number },
        score: { type: Number },
        feedback: { type: String },
        strengths: [{ type: String }],
        improvements: [{ type: String }],
      },
    ],
  },
  overallScore: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;

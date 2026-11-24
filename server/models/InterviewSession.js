import mongoose from "mongoose";

const turnSchema = new mongoose.Schema({
  turnNumber: { type: Number, required: true },
  question: { type: String, required: true },
  questionType: { type: String, default: "Technical" },
  topic: { type: String, default: "General" },
  difficulty: { type: String, default: "Medium" },
  isFollowUp: { type: Boolean, default: false },
  answer: { type: String, default: "" },
  evaluation: {
    score: { type: Number, default: null },
    technicalCorrectness: { type: Number, default: null },
    relevance: { type: Number, default: null },
    depth: { type: Number, default: null },
    clarity: { type: Number, default: null },
    problemSolving: { type: Number, default: null },
    practicalKnowledge: { type: Number, default: null },
    communicationStructure: { type: Number, default: null },
    understanding: { type: String, default: "" },
    confidenceSignal: { type: String, default: "" },
    feedback: { type: String, default: "" },
    strengthsDemonstrated: [{ type: String }],
    missingConcepts: [{ type: String }],
    idealConcepts: { type: String, default: "" },
    suggestedImprovement: { type: String, default: "" },
    followUpDecision: { type: String, default: "" },
    rationale: { type: String, default: "" },
  },
  askedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date, default: null },
});

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: "User",
    required: true,
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InterviewAssignment",
    index: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    index: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
  },
  companyName: {
    type: String,
    default: "",
  },
  jobDescription: {
    type: String,
    required: true,
  },
  interviewType: {
    type: String,
    enum: ["Technical", "HR", "Mixed"],
    default: "Technical",
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Medium",
  },
  skills: [
    {
      type: String,
    },
  ],
  customInstructions: {
    type: String,
    default: "",
  },
  mode: {
    type: String,
    enum: ["adaptive", "classic"],
    default: "adaptive",
  },
  targetQuestionCount: {
    type: Number,
    default: 5,
  },
  durationMinutes: {
    type: Number,
    default: 30,
  },
  resumeContext: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  coveredTopics: [
    {
      type: String,
    },
  ],
  turns: [turnSchema],
  finalReport: {
    reportStatus: { type: String, enum: ["generated", "failed"], default: "generated" },
    overallScore: { type: Number, default: 0 },
    overallFeedback: { type: String, default: "" },
    hiringRecommendation: { type: String, default: "" },
    recommendationRationale: { type: String, default: "" },
    dimensionScores: {
      technicalKnowledge: { type: Number, default: 0 },
      problemSolving: { type: Number, default: 0 },
      answerRelevance: { type: Number, default: 0 },
      communicationClarity: { type: Number, default: 0 },
      practicalUnderstanding: { type: Number, default: 0 },
      resumeProjectKnowledge: { type: Number, default: 0 },
      jobRoleSuitability: { type: Number, default: 0 },
    },
    performanceSummary: {
      strengths: [{ type: String }],
      weaknesses: [{ type: String }],
      areasNeedingImprovement: [{ type: String }],
    },
    technicalAssessment: {
      technologiesUnderstoodWell: [{ type: String }],
      technologiesWithWeakUnderstanding: [{ type: String }],
      knowledgeGaps: [{ type: String }],
      problemSolvingAssessment: { type: String, default: "" },
      practicalImplementationUnderstanding: { type: String, default: "" },
    },
    resumeAssessment: {
      projectsDiscussed: [{ type: String }],
      projectUnderstandingSummary: { type: String, default: "" },
      skillsDemonstrated: [{ type: String }],
      unverifiedResumeSkills: [{ type: String }],
      claimsComparison: { type: String, default: "" },
    },
    suggestedLearningTopics: [{ type: String }],
    strongTopics: [{ type: String }],
    improvementTopics: [{ type: String }],
    resumeGrounding: {
      verifiedClaims: [{ type: String }],
      unverifiedClaims: [{ type: String }],
      demonstratedSkills: [{ type: String }],
    },
    generatedAt: { type: Date, default: Date.now },
  },
  status: {
    type: String,
    enum: ["in-progress", "completed"],
    default: "in-progress",
  },
  // Legacy / Classic Mode fields kept for backward compatibility
  mcqs: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctAnswer: { type: Number, required: true },
      explanation: { type: String, default: "" },
    },
  ],
  mcqUserAnswers: [{ type: Number }],
  mcqScore: { type: Number, default: 0 },
  mcqTotal: { type: Number, default: 10 },
  subjectiveQuestions: [{ type: String }],
  subjectiveUserAnswers: [{ type: String }],
  subjectiveEvaluation: {
    overallScore: { type: Number, default: 0 },
    overallFeedback: { type: String, default: "" },
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

const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);

export default InterviewSession;

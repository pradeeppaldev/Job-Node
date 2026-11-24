import mongoose from "mongoose";

const interviewAssignmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    candidateId: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplication",
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
    durationMinutes: {
      type: Number,
      default: 30,
    },
    questionCount: {
      type: Number,
      default: 5,
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
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["ASSIGNED", "NOT_STARTED", "IN_PROGRESS", "COMPLETED", "EXPIRED", "CANCELLED"],
      default: "ASSIGNED",
      index: true,
    },
    allowRetake: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      default: null,
    },
    score: {
      type: Number,
      default: null,
    },
    recommendation: {
      type: String,
      default: "",
    },
    candidateReportVisible: {
      type: Boolean,
      default: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Virtual/Helper method to resolve dynamic expired state
interviewAssignmentSchema.methods.getEffectiveStatus = function () {
  if (this.status === "CANCELLED" || this.status === "COMPLETED") {
    return this.status;
  }
  if (this.deadline && new Date() > new Date(this.deadline)) {
    return "EXPIRED";
  }
  return this.status;
};

const InterviewAssignment = mongoose.model("InterviewAssignment", interviewAssignmentSchema);

export default InterviewAssignment;

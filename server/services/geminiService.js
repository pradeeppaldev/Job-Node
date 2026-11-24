// Gemini AI Service for Job Node AI (Phase 1 & Phase 2 Adaptive Engine)

const getApiKey = () => process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || "";
const getModel = () => process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Robust helper to call Gemini REST API with retry for 429/503 and safe JSON parsing
 */
async function callGeminiApi(contents, { temperature = 0.7, maxRetries = 2 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("AI service is not configured.");
  }

  const model = getModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Normalize string prompt to Gemini contents array
  const payloadContents =
    typeof contents === "string"
      ? [{ parts: [{ text: contents }] }]
      : contents;

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: payloadContents,
          generationConfig: {
            response_mime_type: "application/json",
            temperature,
          },
        }),
      });

      if (response.status === 429 || response.status === 503) {
        if (attempt < maxRetries) {
          await sleep(1000 * Math.pow(2, attempt));
          continue;
        }
        throw new Error("AI service is temporarily busy. Please retry shortly.");
      }

      if (!response.ok) {
        throw new Error(`AI service returned status ${response.status}.`);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error("AI service returned an empty response.");
      }

      // Parse JSON response cleanly
      const cleanJson = textContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && (err.message.includes("busy") || err.name === "SyntaxError")) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error("AI processing failed.");
}

// ============================================================================
// PHASE 2: RESUME EXTRACTION & CONTEXT PREPARATION
// ============================================================================

/**
 * Downloads candidate's existing resume PDF from Cloudinary and extracts structured context via Gemini.
 * Falls back gracefully if no resume exists or extraction fails.
 */
export async function extractResumeContext(resumeUrl, profileSkills = []) {
  const fallbackContext = {
    hasResume: false,
    summary: "",
    skills: Array.isArray(profileSkills) ? profileSkills : [],
    programmingLanguages: [],
    frameworksAndTechnologies: [],
    projects: [],
    experience: [],
    education: [],
    achievements: [],
    certifications: [],
  };

  if (!resumeUrl || typeof resumeUrl !== "string" || !resumeUrl.startsWith("http")) {
    return fallbackContext;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return fallbackContext;
  }

  try {
    const fileRes = await fetch(resumeUrl);
    if (!fileRes.ok) {
      console.warn("Could not fetch candidate resume URL:", fileRes.status);
      return fallbackContext;
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const contentType = fileRes.headers.get("content-type") || "application/pdf";
    const mimeType = contentType.includes("pdf") ? "application/pdf" : "application/pdf";

    const prompt = `
Extract structured candidate information from the attached resume document.
Only extract information explicitly present in the resume. Do NOT fabricate or infer missing details.

Return strictly valid JSON matching this schema:
{
  "hasResume": true,
  "summary": "Brief 2-sentence factual overview of candidate background",
  "skills": ["Skill 1", "Skill 2"],
  "programmingLanguages": ["Language 1", "Language 2"],
  "frameworksAndTechnologies": ["Framework 1", "Tool 1"],
  "projects": [
    {
      "name": "Project Name",
      "description": "1-sentence summary of what it does",
      "technologies": ["Tech 1", "Tech 2"],
      "architecture": "Key architectural details if mentioned, else empty string"
    }
  ],
  "experience": [
    {
      "role": "Job/Internship Title",
      "company": "Company Name",
      "duration": "Duration",
      "responsibilities": ["Key responsibility 1", "Key responsibility 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/College",
      "year": "Year"
    }
  ],
  "achievements": ["Achievement 1"],
  "certifications": ["Certification 1"]
}
`;

    const extracted = await callGeminiApi(
      [
        {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt },
          ],
        },
      ],
      { temperature: 0.2 }
    );

    if (extracted && typeof extracted === "object") {
      return {
        ...fallbackContext,
        ...extracted,
        hasResume: true,
        skills: Array.isArray(extracted.skills) && extracted.skills.length > 0
          ? extracted.skills
          : fallbackContext.skills,
      };
    }

    return fallbackContext;
  } catch (err) {
    console.warn("Resume extraction fallback triggered:", err.message);
    return fallbackContext;
  }
}

/**
 * Formats a compact string representation of the candidate resume for prompt efficiency
 */
function buildCompactCandidateContext(resumeContext) {
  if (!resumeContext || !resumeContext.hasResume) {
    const skillsStr = resumeContext?.skills?.length > 0 ? resumeContext.skills.join(", ") : "Not provided";
    return `Resume Status: No uploaded resume available. Profile Skills: ${skillsStr}. Proceed using Job Description and Recruiter Configuration without fabricating resume details.`;
  }

  const parts = [];
  if (resumeContext.summary) parts.push(`Summary: ${resumeContext.summary}`);
  if (resumeContext.programmingLanguages?.length) parts.push(`Languages: ${resumeContext.programmingLanguages.join(", ")}`);
  if (resumeContext.frameworksAndTechnologies?.length) parts.push(`Frameworks/Tech: ${resumeContext.frameworksAndTechnologies.join(", ")}`);
  if (resumeContext.skills?.length) parts.push(`Skills: ${resumeContext.skills.slice(0, 20).join(", ")}`);

  if (resumeContext.experience?.length) {
    const expStr = resumeContext.experience
      .slice(0, 4)
      .map((e) => `${e.role} at ${e.company} (${e.duration}): ${(e.responsibilities || []).slice(0, 2).join("; ")}`)
      .join(" | ");
    parts.push(`Experience: ${expStr}`);
  }

  if (resumeContext.projects?.length) {
    const projStr = resumeContext.projects
      .slice(0, 4)
      .map((p) => `${p.name} [${(p.technologies || []).join(", ")}]: ${p.description} ${p.architecture ? `(Arch: ${p.architecture})` : ""}`)
      .join(" | ");
    parts.push(`Projects: ${projStr}`);
  }

  if (resumeContext.education?.length) {
    parts.push(`Education: ${resumeContext.education.map((ed) => `${ed.degree} (${ed.institution})`).join(", ")}`);
  }

  if (resumeContext.certifications?.length) {
    parts.push(`Certifications: ${resumeContext.certifications.slice(0, 5).join(", ")}`);
  }

  return parts.join("\n");
}

// ============================================================================
// PHASE 2: ADAPTIVE INTERVIEW QUESTION & FOLLOW-UP ENGINE
// ============================================================================

/**
 * Generates Question #1 personalized to the candidate's resume, job description, and recruiter config
 */
export async function generateOpeningInterviewQuestion({
  resumeContext,
  jobTitle,
  jobDescription,
  jobSkills = [],
  interviewConfig = {},
}) {
  const {
    interviewType = "Technical",
    difficulty = "Medium",
    skills = [],
    customInstructions = "",
  } = interviewConfig;

  const candidateContextStr = buildCompactCandidateContext(resumeContext);
  const cleanJobDesc = (jobDescription || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
  const targetSkills = [...new Set([...(skills || []), ...(jobSkills || [])])].join(", ");

  const prompt = `
You are an expert ${interviewType} interviewer conducting a personalized, adaptive job interview.

--- JOB DETAILS ---
Job Title: ${jobTitle}
Job Description: ${cleanJobDesc}
Required/Target Skills: ${targetSkills || "General role competencies"}

--- RECRUITER CONFIGURATION ---
Interview Type: ${interviewType} (Technical / HR / Mixed)
Difficulty: ${difficulty}
Custom Instructions: ${customInstructions || "None"}

--- CANDIDATE CONTEXT ---
${candidateContextStr}

TASK:
Generate the OPENING interview question (Question 1).
- If the candidate has a resume with projects or experience relevant to the job, ask a personalized opening question referencing a specific project, technology, or experience from their resume (e.g., asking them to explain the architecture of one of their projects or how they used a relevant skill).
- If the candidate has NO resume, ask a strong ${difficulty}-level ${interviewType} opening question grounded in the Job Description and target skills.
- Keep the tone professional, conversational, and clear.

Return strictly valid JSON:
{
  "question": "The interview question text",
  "questionType": "Resume | Project Deep-Dive | Technical Fundamental | HR | Scenario",
  "topic": "Short 2-4 word topic name",
  "difficulty": "${difficulty}",
  "rationale": "Brief reason why this question was chosen"
}
`;

  try {
    const res = await callGeminiApi(prompt, { temperature: 0.7 });
    if (res && res.question) {
      return {
        question: res.question,
        questionType: res.questionType || (resumeContext?.hasResume ? "Resume" : interviewType),
        topic: res.topic || "Background & Role Fit",
        difficulty: res.difficulty || difficulty,
        rationale: res.rationale || "Personalized opening question",
      };
    }
    throw new Error("Invalid opening question response");
  } catch (err) {
    console.warn("Opening question fallback triggered:", err.message);
    const firstProj = resumeContext?.projects?.[0]?.name;
    return {
      question: firstProj
        ? `I noticed you worked on "${firstProj}" in your resume. Could you walk me through its architecture and your key technical decisions?`
        : `To begin our ${interviewType} interview for ${jobTitle}, could you walk me through your core experience and how it aligns with ${targetSkills || "this role"}?`,
      questionType: firstProj ? "Project Deep-Dive" : interviewType,
      topic: firstProj || "Role Alignment",
      difficulty,
      rationale: "Fallback personalized opener",
    };
  }
}

/**
 * Single efficient Gemini call that:
 * 1) Evaluates the candidate's current answer across multiple dimensions
 * 2) Decides whether to ask a contextual follow-up, switch to a new balanced topic, or complete the interview
 * 3) Generates the next adaptive question if continuing
 */
export async function evaluateAndGenerateNextTurn({
  resumeContext,
  jobTitle,
  jobDescription,
  jobSkills = [],
  interviewConfig = {},
  turnsHistory = [],
  currentTurn,
  candidateAnswer,
  targetQuestionCount = 5,
  coveredTopics = [],
}) {
  const {
    interviewType = "Technical",
    difficulty = "Medium",
    skills = [],
    customInstructions = "",
  } = interviewConfig;

  const isLastQuestion = turnsHistory.length >= targetQuestionCount;
  const candidateContextStr = buildCompactCandidateContext(resumeContext);
  const cleanJobDesc = (jobDescription || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
  const targetSkills = [...new Set([...(skills || []), ...(jobSkills || [])])].join(", ");

  // Concise history of previous turns to preserve continuity without token bloat
  const conciseHistory = turnsHistory
    .slice(0, -1) // exclude currentTurn which is detailed below
    .map((t) => `Turn ${t.turnNumber} [${t.questionType} - ${t.topic}] (FollowUp:${t.isFollowUp}): Q: "${t.question}" | A: "${(t.answer || "").slice(0, 220)}" | Score: ${t.evaluation?.score ?? "N/A"}/10`)
    .join("\n");

  // Count consecutive follow-ups on the current topic to prevent getting stuck
  let consecutiveFollowUps = 0;
  for (let i = turnsHistory.length - 1; i >= 0; i--) {
    if (turnsHistory[i].isFollowUp) consecutiveFollowUps++;
    else break;
  }

  const prompt = `
You are an expert ${interviewType} interviewer conducting an adaptive interview for "${jobTitle}".

--- CANDIDATE CONTEXT ---
${candidateContextStr}

--- JOB & RECRUITER CONFIG ---
Job Description Summary: ${cleanJobDesc}
Required/Selected Skills: ${targetSkills || "Role fundamentals"}
Interview Type: ${interviewType} | Difficulty: ${difficulty}
Custom Instructions: ${customInstructions || "None"}
Target Total Questions: ${targetQuestionCount}
Current Question Number: ${turnsHistory.length} of ${targetQuestionCount}
Topics Already Covered: ${coveredTopics.join(", ") || "None"}
Consecutive Follow-Ups Used So Far: ${consecutiveFollowUps}

--- PRIOR CONVERSATION SUMMARY ---
${conciseHistory || "This was the first question."}

--- CURRENT QUESTION & CANDIDATE ANSWER ---
Question (${currentTurn.questionType} - Topic: ${currentTurn.topic}): "${currentTurn.question}"
Candidate Answer: "${candidateAnswer || "No answer provided"}"

TASK 1 — EVALUATE THE ANSWER (Question-Specific):
Evaluate strictly based on what the candidate actually said in their answer (do NOT assume unmentioned knowledge, and judge confidence strictly from content clarity/precision).
Score 0-10 for:
- score (overall turn score 0-10)
- technicalCorrectness (0-10)
- relevance (0-10)
- depth (0-10)
- clarity (0-10)
- problemSolving (0-10)
- practicalKnowledge (0-10)
- communicationStructure (0-10)
- understanding: "Strong" | "Adequate" | "Partial" | "Weak" | "Unclear"
- confidenceSignal: "High" | "Moderate" | "Low"
- feedback: 1-2 sentences of objective evaluation.
- strengthsDemonstrated: ["What was correct in the answer"]
- missingConcepts: ["What was missing or weak"]
- idealConcepts: "1-2 sentence summary of expected ideal concepts for this question"
- suggestedImprovement: "1 actionable tip to improve this answer"

TASK 2 — DECIDE NEXT STEP:
${
  isLastQuestion
    ? `This was the final question (${turnsHistory.length}/${targetQuestionCount}). Set "completionDecision" to "complete" and "followUpDecision" to "complete". Set "nextQuestion" to null.`
    : `We still need ${targetQuestionCount - turnsHistory.length} more question(s). Set "completionDecision" to "continue".
Decide "followUpDecision":
- Choose "follow_up" ONLY IF:
  (a) consecutiveFollowUps < 2, AND
  (b) the candidate's answer introduced an interesting technical choice, missed a critical detail/trade-off, or needs clarification.
  Examples: "Why did you choose X over Y?", "How did you handle transactions/errors there?", "Can you clarify how you debugged that?"
- Choose "next_topic" if the current topic has been sufficiently covered or consecutiveFollowUps >= 2.
  Ensure a BALANCED interview across: Resume projects/experience, Job-required skills, Technical fundamentals, Problem solving, Recruiter-selected topics, and HR/behavioral (if Mixed or HR).
  Do NOT repeat any question or topic already covered.`
}

Return strictly valid JSON:
{
  "answerEvaluation": {
    "score": 7,
    "technicalCorrectness": 7,
    "relevance": 8,
    "depth": 6,
    "clarity": 8,
    "problemSolving": 7,
    "practicalKnowledge": 7,
    "communicationStructure": 8,
    "understanding": "Adequate",
    "confidenceSignal": "Moderate",
    "feedback": "Concise evaluation feedback...",
    "strengthsDemonstrated": ["Correctly identified core concept"],
    "missingConcepts": ["Did not address edge cases"],
    "idealConcepts": "Expected discussion of X and Y.",
    "suggestedImprovement": "Explain trade-offs with concrete examples."
  },
  "followUpDecision": "${isLastQuestion ? "complete" : "follow_up | next_topic"}",
  "completionDecision": "${isLastQuestion ? "complete" : "continue"}",
  "nextQuestion": ${
    isLastQuestion
      ? "null"
      : `{
    "question": "Next adaptive question text",
    "questionType": "Follow-Up | Resume | Project Deep-Dive | Technical Fundamental | Framework | Architecture | Scenario | Problem Solving | Experience | HR",
    "topic": "Short 2-4 word topic name",
    "difficulty": "${difficulty}",
    "isFollowUp": false,
    "rationale": "Why this question was chosen next"
  }`
  }
}
`;

  try {
    const res = await callGeminiApi(prompt, { temperature: 0.65 });
    if (!res || !res.answerEvaluation) {
      throw new Error("Malformed AI evaluation response");
    }

    const evalData = res.answerEvaluation;
    const clamp10 = (v, fallback) => Math.min(10, Math.max(0, Number(v ?? fallback) || 0));
    const baseScore = clamp10(evalData.score, 0);
    const sanitizedEvaluation = {
      score: baseScore,
      technicalCorrectness: clamp10(evalData.technicalCorrectness, baseScore),
      relevance: clamp10(evalData.relevance, baseScore),
      depth: clamp10(evalData.depth, baseScore),
      clarity: clamp10(evalData.clarity, baseScore),
      problemSolving: clamp10(evalData.problemSolving, baseScore),
      practicalKnowledge: clamp10(evalData.practicalKnowledge, baseScore),
      communicationStructure: clamp10(evalData.communicationStructure, baseScore),
      understanding: evalData.understanding || "Adequate",
      confidenceSignal: evalData.confidenceSignal || "Moderate",
      feedback: evalData.feedback || "Answer recorded and evaluated.",
      strengthsDemonstrated: Array.isArray(evalData.strengthsDemonstrated) ? evalData.strengthsDemonstrated : [],
      missingConcepts: Array.isArray(evalData.missingConcepts) ? evalData.missingConcepts : [],
      idealConcepts: evalData.idealConcepts || "",
      suggestedImprovement: evalData.suggestedImprovement || "",
      followUpDecision: isLastQuestion ? "complete" : res.followUpDecision || "next_topic",
      rationale: res.nextQuestion?.rationale || "",
    };

    if (isLastQuestion || res.completionDecision === "complete" || !res.nextQuestion?.question) {
      return {
        answerEvaluation: sanitizedEvaluation,
        completionDecision: "complete",
        nextQuestion: null,
      };
    }

    return {
      answerEvaluation: sanitizedEvaluation,
      completionDecision: "continue",
      nextQuestion: {
        question: res.nextQuestion.question,
        questionType: res.nextQuestion.questionType || interviewType,
        topic: res.nextQuestion.topic || "Role Competency",
        difficulty: res.nextQuestion.difficulty || difficulty,
        isFollowUp: res.followUpDecision === "follow_up" || Boolean(res.nextQuestion.isFollowUp),
      },
    };
  } catch (err) {
    console.warn("Adaptive turn fallback triggered:", err.message);
    const wordCount = (candidateAnswer || "").trim().split(/\s+/).filter(Boolean).length;
    const fallbackScore = wordCount >= 30 ? 7 : wordCount >= 10 ? 5 : wordCount > 0 ? 3 : 1;

    return {
      answerEvaluation: {
        score: fallbackScore,
        technicalCorrectness: fallbackScore,
        relevance: fallbackScore,
        depth: Math.max(1, fallbackScore - 1),
        clarity: fallbackScore,
        understanding: fallbackScore >= 7 ? "Adequate" : "Partial",
        confidenceSignal: wordCount >= 20 ? "Moderate" : "Low",
        feedback: wordCount > 0 ? "Response recorded." : "No answer was provided for this question.",
        followUpDecision: isLastQuestion ? "complete" : "next_topic",
        rationale: "Fallback evaluation",
      },
      completionDecision: isLastQuestion ? "complete" : "continue",
      nextQuestion: isLastQuestion
        ? null
        : {
            question: `Moving to another core area for ${jobTitle}: how do you approach debugging and testing edge cases in ${skills?.[0] || "your primary stack"}?`,
            questionType: "Problem Solving",
            topic: "Debugging & Testing",
            difficulty,
            isFollowUp: false,
          },
    };
  }
}

/**
 * Generates a grounded final evaluation report comparing resume claims against actual interview evidence (Phase 4)
 */
export async function generateGroundedFinalReport({
  resumeContext,
  jobTitle,
  jobDescription,
  interviewConfig = {},
  turns = [],
}) {
  const candidateContextStr = buildCompactCandidateContext(resumeContext);
  const cleanJobDesc = (jobDescription || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);
  const transcriptSummary = turns
    .map(
      (t) =>
        `Turn ${t.turnNumber} (${t.questionType} | Topic: ${t.topic} | Score: ${t.evaluation?.score ?? 0}/10):\nQ: ${t.question}\nA: ${t.answer || "No answer"}\nTurn Eval: ${t.evaluation?.feedback || ""}`
    )
    .join("\n\n");

  const avgTurnScore =
    turns.length > 0
      ? Math.round((turns.reduce((sum, t) => sum + (t.evaluation?.score || 0), 0) / turns.length) * 10)
      : 0;

  const avgDim = (key) =>
    turns.length > 0
      ? Math.round((turns.reduce((sum, t) => sum + (t.evaluation?.[key] ?? t.evaluation?.score ?? 0), 0) / turns.length) * 10)
      : 0;

  const prompt = `
You are a senior hiring panelist generating a comprehensive, evidence-grounded interview evaluation report for "${jobTitle}".

--- JOB DESCRIPTION SUMMARY ---
${cleanJobDesc}

--- CANDIDATE RESUME CONTEXT ---
${candidateContextStr}

--- INTERVIEW TRANSCRIPT & TURN EVALUATIONS ---
${transcriptSummary}

CRITICAL GROUNDING & SCORING RULES:
1. Evaluate ONLY what the candidate actually demonstrated in the interview transcript. Do NOT invent answers, achievements, or skills.
2. Compare resume claims with interview evidence fairly:
   - Never claim a resume skill is fake. Clearly differentiate between unverified skills (not tested or unclear in interview) and demonstrated weaknesses.
3. Score each of the 7 dimensions (0-100) objectively, anchored to the turn evaluations (average turn score is ${avgTurnScore}%):
   - technicalKnowledge, problemSolving, answerRelevance, communicationClarity, practicalUnderstanding, resumeProjectKnowledge, jobRoleSuitability
4. Choose "hiringRecommendation" strictly from:
   - "Strong Candidate"
   - "Potential Candidate"
   - "Needs Further Evaluation"
   - "Not Recommended for This Role"
   Support it with "recommendationRationale" grounded in actual interview evidence.

Return strictly valid JSON:
{
  "hiringRecommendation": "Potential Candidate",
  "recommendationRationale": "2-sentence evidence-based justification...",
  "overallFeedback": "3-4 sentence evidence-based summary of interview performance...",
  "dimensionScores": {
    "technicalKnowledge": ${avgDim("technicalCorrectness")},
    "problemSolving": ${avgDim("problemSolving")},
    "answerRelevance": ${avgDim("relevance")},
    "communicationClarity": ${avgDim("clarity")},
    "practicalUnderstanding": ${avgDim("practicalKnowledge")},
    "resumeProjectKnowledge": ${avgTurnScore},
    "jobRoleSuitability": ${avgTurnScore}
  },
  "performanceSummary": {
    "strengths": ["Specific demonstrated strength 1"],
    "weaknesses": ["Specific demonstrated weakness 1"],
    "areasNeedingImprovement": ["Specific area needing improvement"]
  },
  "technicalAssessment": {
    "technologiesUnderstoodWell": ["Tech 1"],
    "technologiesWithWeakUnderstanding": ["Tech 2"],
    "knowledgeGaps": ["Gap 1"],
    "problemSolvingAssessment": "Assessment of problem solving approach...",
    "practicalImplementationUnderstanding": "Assessment of practical real-world implementation..."
  },
  "resumeAssessment": {
    "projectsDiscussed": ["Project Name"],
    "projectUnderstandingSummary": "Summary of how well candidate explained their projects...",
    "skillsDemonstrated": ["Skill 1"],
    "unverifiedResumeSkills": ["Resume skill not adequately verified in interview"],
    "claimsComparison": "Objective comparison of resume claims vs interview evidence..."
  },
  "suggestedLearningTopics": ["Topic 1", "Topic 2"]
}
`;

  const clamp100 = (val, fallback) => Math.min(100, Math.max(0, Math.round(Number(val ?? fallback) || 0)));

  try {
    const res = await callGeminiApi(prompt, { temperature: 0.25 });
    if (!res || !res.dimensionScores) {
      throw new Error("Invalid final report structure");
    }

    const ds = {
      technicalKnowledge: clamp100(res.dimensionScores.technicalKnowledge, avgDim("technicalCorrectness")),
      problemSolving: clamp100(res.dimensionScores.problemSolving, avgDim("problemSolving")),
      answerRelevance: clamp100(res.dimensionScores.answerRelevance, avgDim("relevance")),
      communicationClarity: clamp100(res.dimensionScores.communicationClarity, avgDim("clarity")),
      practicalUnderstanding: clamp100(res.dimensionScores.practicalUnderstanding, avgDim("practicalKnowledge")),
      resumeProjectKnowledge: clamp100(res.dimensionScores.resumeProjectKnowledge, avgTurnScore),
      jobRoleSuitability: clamp100(res.dimensionScores.jobRoleSuitability, avgTurnScore),
    };

    // Deterministic weighted overall score from the 7 dimensions (prevents arbitrary/inflated scores)
    const computedOverall = Math.round(
      ds.technicalKnowledge * 0.22 +
      ds.problemSolving * 0.18 +
      ds.practicalUnderstanding * 0.18 +
      ds.jobRoleSuitability * 0.15 +
      ds.answerRelevance * 0.10 +
      ds.communicationClarity * 0.10 +
      ds.resumeProjectKnowledge * 0.07
    );

    const validRecs = [
      "Strong Candidate",
      "Potential Candidate",
      "Needs Further Evaluation",
      "Not Recommended for This Role",
    ];
    const recommendation = validRecs.includes(res.hiringRecommendation)
      ? res.hiringRecommendation
      : computedOverall >= 80
      ? "Strong Candidate"
      : computedOverall >= 65
      ? "Potential Candidate"
      : computedOverall >= 45
      ? "Needs Further Evaluation"
      : "Not Recommended for This Role";

    const strengths = Array.isArray(res.performanceSummary?.strengths) ? res.performanceSummary.strengths : [];
    const weaknesses = Array.isArray(res.performanceSummary?.weaknesses) ? res.performanceSummary.weaknesses : [];
    const areasNeedingImprovement = Array.isArray(res.performanceSummary?.areasNeedingImprovement)
      ? res.performanceSummary.areasNeedingImprovement
      : [];

    const skillsDemonstrated = Array.isArray(res.resumeAssessment?.skillsDemonstrated)
      ? res.resumeAssessment.skillsDemonstrated
      : [];
    const unverifiedResumeSkills = Array.isArray(res.resumeAssessment?.unverifiedResumeSkills)
      ? res.resumeAssessment.unverifiedResumeSkills
      : [];

    return {
      reportStatus: "generated",
      overallScore: computedOverall,
      hiringRecommendation: recommendation,
      recommendationRationale: res.recommendationRationale || res.overallFeedback || "",
      overallFeedback: res.overallFeedback || "Evaluation completed based on interview transcript.",
      dimensionScores: ds,
      performanceSummary: { strengths, weaknesses, areasNeedingImprovement },
      technicalAssessment: {
        technologiesUnderstoodWell: Array.isArray(res.technicalAssessment?.technologiesUnderstoodWell)
          ? res.technicalAssessment.technologiesUnderstoodWell
          : [],
        technologiesWithWeakUnderstanding: Array.isArray(res.technicalAssessment?.technologiesWithWeakUnderstanding)
          ? res.technicalAssessment.technologiesWithWeakUnderstanding
          : [],
        knowledgeGaps: Array.isArray(res.technicalAssessment?.knowledgeGaps)
          ? res.technicalAssessment.knowledgeGaps
          : [],
        problemSolvingAssessment: res.technicalAssessment?.problemSolvingAssessment || "",
        practicalImplementationUnderstanding: res.technicalAssessment?.practicalImplementationUnderstanding || "",
      },
      resumeAssessment: {
        projectsDiscussed: Array.isArray(res.resumeAssessment?.projectsDiscussed)
          ? res.resumeAssessment.projectsDiscussed
          : [],
        projectUnderstandingSummary: res.resumeAssessment?.projectUnderstandingSummary || "",
        skillsDemonstrated,
        unverifiedResumeSkills,
        claimsComparison: res.resumeAssessment?.claimsComparison || "",
      },
      suggestedLearningTopics: Array.isArray(res.suggestedLearningTopics) ? res.suggestedLearningTopics : [],
      // Keep backward-compatible fields populated cleanly
      strongTopics: strengths,
      improvementTopics: areasNeedingImprovement,
      resumeGrounding: {
        verifiedClaims: skillsDemonstrated,
        unverifiedClaims: unverifiedResumeSkills,
        demonstratedSkills: skillsDemonstrated,
      },
      generatedAt: new Date(),
    };
  } catch (err) {
    console.warn("Final report fallback triggered:", err.message);
    const ds = {
      technicalKnowledge: avgDim("technicalCorrectness") || avgTurnScore,
      problemSolving: avgDim("problemSolving") || avgTurnScore,
      answerRelevance: avgDim("relevance") || avgTurnScore,
      communicationClarity: avgDim("clarity") || avgTurnScore,
      practicalUnderstanding: avgDim("practicalKnowledge") || avgTurnScore,
      resumeProjectKnowledge: avgTurnScore,
      jobRoleSuitability: avgTurnScore,
    };
    const recommendation =
      avgTurnScore >= 80
        ? "Strong Candidate"
        : avgTurnScore >= 65
        ? "Potential Candidate"
        : avgTurnScore >= 45
        ? "Needs Further Evaluation"
        : "Not Recommended for This Role";

    const strong = turns.filter((t) => (t.evaluation?.score || 0) >= 7).map((t) => t.topic);
    const weak = turns.filter((t) => (t.evaluation?.score || 0) < 6).map((t) => t.topic);

    return {
      reportStatus: "generated",
      overallScore: avgTurnScore,
      hiringRecommendation: recommendation,
      recommendationRationale: `Based on ${turns.length} evaluated responses averaging ${avgTurnScore}%.`,
      overallFeedback: `Candidate completed ${turns.length} adaptive interview questions with an average score of ${avgTurnScore}%.`,
      dimensionScores: ds,
      performanceSummary: { strengths: strong, weaknesses: weak, areasNeedingImprovement: weak },
      technicalAssessment: {
        technologiesUnderstoodWell: strong,
        technologiesWithWeakUnderstanding: weak,
        knowledgeGaps: weak,
        problemSolvingAssessment: "",
        practicalImplementationUnderstanding: "",
      },
      resumeAssessment: {
        projectsDiscussed: [],
        projectUnderstandingSummary: "",
        skillsDemonstrated: strong,
        unverifiedResumeSkills: [],
        claimsComparison: "",
      },
      suggestedLearningTopics: weak,
      strongTopics: strong,
      improvementTopics: weak,
      resumeGrounding: {
        verifiedClaims: [],
        unverifiedClaims: [],
        demonstratedSkills: strong,
      },
      generatedAt: new Date(),
    };
  }
}

// ============================================================================
// CLASSIC / LEGACY GENERATORS (Kept for backward compatibility)
// ============================================================================

export async function generateMcqs(jobTitle, jobDescription, options = {}) {
  const apiKey = getApiKey();
  const {
    interviewType = "Technical",
    difficulty = "Medium",
    skills = [],
    customInstructions = "",
    questionCount = 10,
  } = options;

  const count = Math.min(15, Math.max(3, questionCount || 10));
  const skillsText = Array.isArray(skills) && skills.length > 0 ? `Target Skills/Topics: ${skills.join(", ")}` : "";
  const instructionsText = customInstructions?.trim() ? `Recruiter Custom Instructions: ${customInstructions.trim()}` : "";

  if (!apiKey) {
    return generateFallbackMcqs(jobTitle, jobDescription).slice(0, count);
  }

  const prompt = `
You are an expert ${interviewType} interviewer for:
Job Title: ${jobTitle}
Job Description: ${jobDescription}
Interview Type: ${interviewType}
Difficulty Level: ${difficulty}
${skillsText}
${instructionsText}

Generate exactly ${count} Multiple Choice Questions (MCQs) in valid JSON:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation."
    }
  ]
}
`;

  try {
    const result = await callGeminiApi(prompt);
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      return result.questions.slice(0, count);
    }
    throw new Error("Invalid structure");
  } catch (err) {
    return generateFallbackMcqs(jobTitle, jobDescription).slice(0, count);
  }
}

export async function generateSubjectiveQuestions(jobTitle, jobDescription, options = {}) {
  const apiKey = getApiKey();
  const {
    interviewType = "Technical",
    difficulty = "Medium",
    skills = [],
    customInstructions = "",
    questionCount = 5,
  } = options;

  const count = Math.min(10, Math.max(2, questionCount || 5));
  const skillsText = Array.isArray(skills) && skills.length > 0 ? `Target Skills/Topics: ${skills.join(", ")}` : "";
  const instructionsText = customInstructions?.trim() ? `Recruiter Custom Instructions: ${customInstructions.trim()}` : "";

  if (!apiKey) {
    return generateFallbackSubjectiveQuestions(jobTitle, jobDescription).slice(0, count);
  }

  const prompt = `
You are an expert ${interviewType} interviewer for ${jobTitle}.
Job Description: ${jobDescription}
Difficulty: ${difficulty}
${skillsText}
${instructionsText}

Generate ${count} Subjective Interview Questions in JSON:
{
  "questions": ["Question 1", "Question 2"]
}
`;

  try {
    const result = await callGeminiApi(prompt);
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      return result.questions.slice(0, count);
    }
    throw new Error("Invalid structure");
  } catch (err) {
    return generateFallbackSubjectiveQuestions(jobTitle, jobDescription).slice(0, count);
  }
}

export async function evaluateSubjectiveAnswers(jobTitle, jobDescription, questions, userAnswers, options = {}) {
  const apiKey = getApiKey();
  const { interviewType = "Technical", difficulty = "Medium" } = options;

  if (!apiKey) {
    return generateFallbackSubjectiveEvaluation(jobTitle, questions, userAnswers);
  }

  const QA_Pair_Text = questions
    .map((q, idx) => `Q${idx + 1}: ${q}\nUser Answer: ${userAnswers[idx] || "No answer provided"}`)
    .join("\n\n");

  const prompt = `
Evaluate these ${interviewType} (${difficulty}) interview answers for ${jobTitle}:
${QA_Pair_Text}

Return valid JSON:
{
  "overallScore": 80,
  "overallFeedback": "Summary...",
  "strongTopics": ["Topic A"],
  "improvementTopics": ["Area 1"],
  "results": [
    {
      "questionNumber": 1,
      "score": 8,
      "feedback": "Feedback...",
      "strengths": ["Clear"],
      "improvements": ["More depth"]
    }
  ]
}
`;

  try {
    const result = await callGeminiApi(prompt);
    if (result && typeof result.overallScore === "number" && Array.isArray(result.results)) {
      return result;
    }
    throw new Error("Invalid evaluation structure");
  } catch (err) {
    return generateFallbackSubjectiveEvaluation(jobTitle, questions, userAnswers);
  }
}

function generateFallbackMcqs(jobTitle) {
  const title = jobTitle || "Software Engineer";
  return [
    {
      question: `Which fundamental principle is core to working as a ${title}?`,
      options: [
        "Separation of concerns and modular code",
        "Writing all code in a single global file",
        "Avoiding code comments and documentation",
        "Hardcoding configuration variables in source files",
      ],
      correctAnswer: 0,
      explanation: "Separation of concerns promotes modularity, maintainability, and reusability.",
    },
    {
      question: "What is the primary advantage of RESTful API architecture?",
      options: [
        "Stateless communication and standardized HTTP methods",
        "Direct database manipulation from the frontend",
        "Tightly coupled server and client execution",
        "Automatic database query optimization",
      ],
      correctAnswer: 0,
      explanation: "REST APIs rely on stateless client-server interactions.",
    },
  ];
}

function generateFallbackSubjectiveQuestions(jobTitle) {
  const title = jobTitle || "Software Engineer";
  return [
    `Describe a complex technical project related to ${title} that you worked on. What challenges did you face?`,
    "Explain the difference between authentication and authorization in modern web applications.",
    `How do you ensure performance and scalability when building features for ${title}?`,
  ];
}

function generateFallbackSubjectiveEvaluation(jobTitle, questions, userAnswers) {
  const results = questions.map((q, idx) => {
    const ans = userAnswers[idx] || "";
    const wordCount = ans.trim().split(/\s+/).filter(Boolean).length;
    const score = wordCount >= 30 ? 8 : wordCount >= 10 ? 6 : wordCount > 0 ? 4 : 1;
    return {
      questionNumber: idx + 1,
      score,
      feedback: wordCount > 0 ? "Response recorded." : "No answer provided.",
      strengths: wordCount >= 10 ? ["Addressed main concept"] : ["Attempted"],
      improvements: wordCount < 30 ? ["Provide specific examples"] : ["Minor polish"],
    };
  });
  const avgScore = Math.round(results.reduce((acc, curr) => acc + curr.score, 0) * (10 / Math.max(1, results.length)));
  return {
    overallScore: Math.min(100, Math.max(10, avgScore)),
    overallFeedback: `Evaluation completed for ${jobTitle}.`,
    strongTopics: ["Core Concepts"],
    improvementTopics: ["Technical Depth"],
    results,
  };
}

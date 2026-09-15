// Gemini AI Service for Job Node AI

const getApiKey = () => process.env.GEMINI_KEY || process.env.GEMINI_API_KEY || "";

/**
 * Helper to call Gemini REST API
 */
async function callGeminiApi(promptText) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_KEY is not configured in server environment variables.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error("Gemini API returned an empty response.");
  }

  // Parse JSON response cleanly
  const cleanJson = textContent.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleanJson);
}

/**
 * Generate 10 MCQs based on Job Title & Description
 */
export async function generateMcqs(jobTitle, jobDescription) {
  const apiKey = getApiKey();

  // If no API key configured yet, use structured mock generator
  if (!apiKey) {
    console.log("GEMINI_KEY is empty. Using fallback mock MCQ generator.");
    return generateFallbackMcqs(jobTitle, jobDescription);
  }

  const prompt = `
You are an expert technical interviewer.
Generate exactly 10 Multiple Choice Questions (MCQs) for an interview candidate.
Job Title: ${jobTitle}
Job Description: ${jobDescription}

Provide the output strictly in valid JSON format matching this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // 0-based index of correct option (0, 1, 2, or 3)
      "explanation": "Detailed explanation of why this answer is correct."
    }
  ]
}
Return exactly 10 questions. Do not include markdown code block formatting outside JSON.
`;

  try {
    const result = await callGeminiApi(prompt);
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      return result.questions.slice(0, 10);
    }
    throw new Error("Invalid structure returned from Gemini API");
  } catch (err) {
    console.warn("Failed to generate MCQs with Gemini API, falling back to mock generator:", err.message);
    return generateFallbackMcqs(jobTitle, jobDescription);
  }
}

/**
 * Generate 5 Subjective Questions based on Job Title & Description
 */
export async function generateSubjectiveQuestions(jobTitle, jobDescription) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log("GEMINI_KEY is empty. Using fallback mock Subjective generator.");
    return generateFallbackSubjectiveQuestions(jobTitle, jobDescription);
  }

  const prompt = `
You are an expert interviewer.
Generate exactly 5 Subjective Interview Questions for a job candidate.
Job Title: ${jobTitle}
Job Description: ${jobDescription}

Provide the output strictly in valid JSON format matching this structure:
{
  "questions": [
    "Question 1 text",
    "Question 2 text",
    "Question 3 text",
    "Question 4 text",
    "Question 5 text"
  ]
}
Return exactly 5 questions.
`;

  try {
    const result = await callGeminiApi(prompt);
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      return result.questions.slice(0, 5);
    }
    throw new Error("Invalid structure returned from Gemini API");
  } catch (err) {
    console.warn("Failed to generate Subjective questions with Gemini API, falling back:", err.message);
    return generateFallbackSubjectiveQuestions(jobTitle, jobDescription);
  }
}

/**
 * Evaluate all 5 Subjective Answers together in a single API call
 */
export async function evaluateSubjectiveAnswers(jobTitle, jobDescription, questions, userAnswers) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log("GEMINI_KEY is empty. Using fallback mock Subjective evaluation.");
    return generateFallbackSubjectiveEvaluation(jobTitle, questions, userAnswers);
  }

  const QA_Pair_Text = questions
    .map((q, idx) => `Q${idx + 1}: ${q}\nUser Answer: ${userAnswers[idx] || "No answer provided"}`)
    .join("\n\n");

  const prompt = `
You are a senior technical interviewer evaluating candidate answers.
Job Title: ${jobTitle}
Job Description: ${jobDescription}

Questions & Candidate Answers:
${QA_Pair_Text}

Evaluate each candidate answer thoroughly out of 10 points.
Calculate an overall evaluation score out of 100.

Return output strictly in valid JSON format matching this structure:
{
  "overallScore": 82, // Score from 0 to 100
  "overallFeedback": "Overall performance summary here...",
  "strongTopics": ["Topic A", "Topic B"],
  "improvementTopics": ["Area 1", "Area 2"],
  "results": [
    {
      "questionNumber": 1,
      "score": 8, // Score out of 10
      "feedback": "Detailed feedback for Q1...",
      "strengths": ["Clear explanation"],
      "improvements": ["Could mention trade-offs"]
    }
  ]
}
Provide results for all 5 questions.
`;

  try {
    const result = await callGeminiApi(prompt);
    if (result && typeof result.overallScore === "number" && Array.isArray(result.results)) {
      return result;
    }
    throw new Error("Invalid evaluation structure returned from Gemini API");
  } catch (err) {
    console.warn("Failed to evaluate answers with Gemini API, falling back to mock evaluator:", err.message);
    return generateFallbackSubjectiveEvaluation(jobTitle, questions, userAnswers);
  }
}

// ================= Fallback Generators (Used when GEMINI_KEY is empty) =================

function generateFallbackMcqs(jobTitle, jobDescription) {
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
      question: `What is the primary advantage of RESTful API architecture?`,
      options: [
        "Stateless communication and standardized HTTP methods",
        "Direct database manipulation from the frontend",
        "Tightly coupled server and client execution",
        "Automatic database query optimization",
      ],
      correctAnswer: 0,
      explanation: "REST APIs rely on stateless client-server interactions using standard HTTP methods (GET, POST, PUT, DELETE).",
    },
    {
      question: `In asynchronous programming, what does a Promise represent?`,
      options: [
        "An object representing the eventual completion or failure of an async operation",
        "A synchronous loop that blocks execution until data is returned",
        "A global error handler for syntax errors",
        "A database query cache index",
      ],
      correctAnswer: 0,
      explanation: "A Promise is an object representing the eventual completion (or failure) of an asynchronous operation.",
    },
    {
      question: `Which HTTP response status code indicates successful resource creation?`,
      options: ["201 Created", "200 OK", "404 Not Found", "500 Internal Server Error"],
      correctAnswer: 0,
      explanation: "HTTP 201 Created is returned when a POST request successfully creates a new resource.",
    },
    {
      question: `What is the purpose of environment variables in application deployment?`,
      options: [
        "To keep sensitive credentials out of version control and manage environment configs",
        "To speed up CSS rendering in browsers",
        "To automatically generate database schemas",
        "To bypass authentication middlewares",
      ],
      correctAnswer: 0,
      explanation: "Environment variables allow applications to store sensitive secrets securely outside source code.",
    },
    {
      question: `Which database indexing strategy optimizes query response times?`,
      options: [
        "Creating indexes on frequently queried/filtered fields",
        "Indexing every column in every table indiscriminately",
        "Disabling database indexes completely",
        "Storing all index keys in plain text files",
      ],
      correctAnswer: 0,
      explanation: "Indexing frequently searched fields speeds up data retrieval.",
    },
    {
      question: `What does JWT stand for in web security?`,
      options: [
        "JSON Web Token",
        "Java Web Transfer",
        "JavaScript Worker Thread",
        "Joint Web Technology",
      ],
      correctAnswer: 0,
      explanation: "JWT stands for JSON Web Token, widely used for stateless authentication.",
    },
    {
      question: `Why is CORS (Cross-Origin Resource Sharing) enforced by web browsers?`,
      options: [
        "To prevent unauthorized domain requests from accessing protected API resources",
        "To compress static asset files",
        "To enforce HTTPS encryption automatically",
        "To cache API responses in local storage",
      ],
      correctAnswer: 0,
      explanation: "CORS is a browser security mechanism that restricts cross-domain HTTP requests.",
    },
    {
      question: `What is the primary role of Git in software development?`,
      options: [
        "Distributed version control and collaboration system",
        "Cloud hosting server for Node applications",
        "Database management UI tool",
        "Frontend CSS framework",
      ],
      correctAnswer: 0,
      explanation: "Git is a distributed version control system designed to track changes in source code.",
    },
    {
      question: `When designing scalable systems for ${title}, which pattern helps prevent single points of failure?`,
      options: [
        "Load balancing and horizontal scaling across multiple instances",
        "Deploying everything on a single instance without backups",
        "Increasing database connection timeouts to infinity",
        "Disabling logging during peak traffic hours",
      ],
      correctAnswer: 0,
      explanation: "Load balancing and redundancy across multiple application instances prevent downtime.",
    },
  ];
}

function generateFallbackSubjectiveQuestions(jobTitle, jobDescription) {
  const title = jobTitle || "Software Engineer";
  return [
    `Describe a complex technical project related to ${title} that you worked on. What challenges did you face and how did you resolve them?`,
    `Explain the difference between authentication and authorization in modern web applications. Give concrete examples.`,
    `How do you ensure application performance and scalability when building features for ${title}?`,
    `Explain your approach to writing clean, maintainable, and well-tested code. How do you handle code reviews?`,
    `How do you prioritize competing deadlines or technical debt when working under tight timelines?`,
  ];
}

function generateFallbackSubjectiveEvaluation(jobTitle, questions, userAnswers) {
  const results = questions.map((q, idx) => {
    const ans = userAnswers[idx] || "";
    const wordCount = ans.trim().split(/\s+/).filter(Boolean).length;
    const score = wordCount >= 30 ? 9 : wordCount >= 10 ? 7 : wordCount > 0 ? 5 : 2;

    return {
      questionNumber: idx + 1,
      score,
      feedback:
        wordCount >= 20
          ? `Good explanation! You provided relevant points for Q${idx + 1}.`
          : wordCount > 0
          ? `Decent start, but consider elaborating with more specific examples.`
          : `No answer provided. Make sure to answer each question thoroughly.`,
      strengths: wordCount >= 10 ? ["Addressed main concept", "Clear communication"] : ["Attempted response"],
      improvements: wordCount < 30 ? ["Provide technical examples", "Elaborate on edge cases"] : ["Minor polish"],
    };
  });

  const avgScore = Math.round(results.reduce((acc, curr) => acc + curr.score, 0) * 2); // Score out of 100

  return {
    overallScore: Math.min(100, Math.max(20, avgScore)),
    overallFeedback: `Solid performance on the subjective interview section for ${jobTitle}. Keep refining your explanations with real-world examples.`,
    strongTopics: ["Technical Knowledge", "Problem Solving"],
    improvementTopics: ["Elaborating on System Edge Cases", "Architecture Trade-offs"],
    results,
  };
}

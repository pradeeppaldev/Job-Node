/**
 * Deterministic Rule-Based Job Matching Algorithm (NO AI / NO LLM)
 *
 * Scoring Breakdown (Total: 100 points):
 * - Skills: 50%
 * - Location: 20%
 * - Category: 20%
 * - Level: 10%
 *
 * Threshold: Match score >= 60 eligible for notification
 */

export function calculateJobMatchScore(user, job) {
  if (!user || !job) {
    return { score: 0, breakdown: { skills: 0, location: 0, category: 0, level: 0 } };
  }

  // 1. Skills Matching (50 Points)
  let skillsScore = 0;
  const jobSkills = Array.isArray(job.skills)
    ? job.skills.map((s) => s.toLowerCase().trim()).filter(Boolean)
    : [];
  const userSkills = Array.isArray(user.skills)
    ? user.skills.map((s) => s.toLowerCase().trim()).filter(Boolean)
    : [];

  if (jobSkills.length === 0) {
    // If no specific skills required by job, grant default partial skills score
    skillsScore = 50;
  } else if (userSkills.length > 0) {
    let matchedCount = 0;
    jobSkills.forEach((jSkill) => {
      const isMatched = userSkills.some(
        (uSkill) => uSkill === jSkill || uSkill.includes(jSkill) || jSkill.includes(uSkill)
      );
      if (isMatched) matchedCount++;
    });

    skillsScore = Math.min(50, Math.round((matchedCount / jobSkills.length) * 50));
  }

  // 2. Location Matching (20 Points)
  let locationScore = 0;
  const jobLocation = (job.location || "").toLowerCase().trim();
  const userLocations = Array.isArray(user.preferredLocations)
    ? user.preferredLocations.map((l) => l.toLowerCase().trim()).filter(Boolean)
    : [];

  if (userLocations.length === 0 || userLocations.includes("all") || userLocations.includes("any")) {
    locationScore = 20; // Default match if candidate hasn't restricted locations
  } else if (jobLocation) {
    const isLocationMatched = userLocations.some(
      (uLoc) => uLoc === jobLocation || uLoc.includes(jobLocation) || jobLocation.includes(uLoc)
    );
    if (isLocationMatched) locationScore = 20;
  }

  // 3. Category Matching (20 Points)
  let categoryScore = 0;
  const jobCategory = (job.category || "").toLowerCase().trim();
  const userCategories = Array.isArray(user.preferredCategories)
    ? user.preferredCategories.map((c) => c.toLowerCase().trim()).filter(Boolean)
    : [];

  if (userCategories.length === 0 || userCategories.includes("all") || userCategories.includes("any")) {
    categoryScore = 20;
  } else if (jobCategory) {
    const isCategoryMatched = userCategories.some(
      (uCat) => uCat === jobCategory || uCat.includes(jobCategory) || jobCategory.includes(uCat)
    );
    if (isCategoryMatched) categoryScore = 20;
  }

  // 4. Level Matching (10 Points)
  let levelScore = 0;
  const jobLevel = (job.level || "").toLowerCase().trim();
  const userLevels = Array.isArray(user.preferredLevels)
    ? user.preferredLevels.map((lvl) => lvl.toLowerCase().trim()).filter(Boolean)
    : [];

  if (userLevels.length === 0 || userLevels.includes("all") || userLevels.includes("any")) {
    levelScore = 10;
  } else if (jobLevel) {
    const isLevelMatched = userLevels.some(
      (uLvl) => uLvl === jobLevel || uLvl.includes(jobLevel) || jobLevel.includes(uLvl)
    );
    if (isLevelMatched) levelScore = 10;
  }

  const totalScore = skillsScore + locationScore + categoryScore + levelScore;

  return {
    score: totalScore,
    breakdown: {
      skills: skillsScore,
      location: locationScore,
      category: categoryScore,
      level: levelScore,
    },
  };
}

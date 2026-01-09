const prisma = require('../../lib/prisma');

/**
 * Pillar to Coach Role Mapping
 */
const PILLAR_TO_COACH_ROLE = {
  STRATEGY: 'STRATEGY',
  FINANCE: 'FINANCE',
  MARKETING: 'MARKETING',
  SALES: 'SALES',
  OPERATIONS: 'OPERATIONS',
  CULTURE: 'CULTURE',
  CUSTOMER_CENTRICITY: 'CUSTOMER_CENTRICITY',
  EXIT_STRATEGY: 'EXIT_STRATEGY'
};

/**
 * Find the lowest pillar score from quiz results
 */
function findLowestPillar(quizResult) {
  if (!quizResult || !quizResult.scoresJson) {
    return null;
  }

  const scores = quizResult.scoresJson;
  let lowestPillar = null;
  let lowestScore = 101; // Start above max possible score

  Object.entries(scores).forEach(([pillar, score]) => {
    if (score < lowestScore) {
      lowestScore = score;
      lowestPillar = pillar;
    }
  });

  return { pillar: lowestPillar, score: lowestScore };
}

/**
 * Apply special routing rules
 * Returns coach role or null if no special rule applies
 */
async function applySpecialRules(quizResult, userId) {
  if (!quizResult || !quizResult.scoresJson) {
    return null;
  }

  const scores = quizResult.scoresJson;
  
  // Rule 1: If revenue < X and finance score low → Finance coach
  // (Assuming we might have revenue data in user profile or session data)
  // For now, if FINANCE score is below 50, prioritize Finance coach
  if (scores.FINANCE && scores.FINANCE < 50) {
    // Check if overall score is also low (indicating financial stress)
    const overallScore = quizResult.totalScore || 0;
    if (overallScore < 60) {
      return 'FINANCE';
    }
  }

  // Rule 2: If multiple pillars are very low (< 40), prioritize Strategy coach
  const veryLowPillars = Object.values(scores).filter(score => score < 40);
  if (veryLowPillars.length >= 3) {
    return 'STRATEGY';
  }

  // Rule 3: If SALES and MARKETING both low, prioritize Sales coach (sales first)
  if (scores.SALES && scores.MARKETING) {
    if (scores.SALES < 50 && scores.MARKETING < 50) {
      return 'SALES'; // Sales coach can help with both
    }
  }

  // Rule 4: If CULTURE score is very low (< 30), prioritize Culture coach
  if (scores.CULTURE && scores.CULTURE < 30) {
    return 'CULTURE';
  }

  return null; // No special rule applies
}

/**
 * Get coach by role
 */
async function getCoachByRole(role) {
  const coach = await prisma.coach.findFirst({
    where: {
      role: role,
      active: true
    },
    orderBy: {
      id: 'asc' // Get first available coach of this role
    }
  });

  return coach;
}

/**
 * Get secondary coaches based on other low-scoring pillars
 */
async function getSecondaryCoaches(quizResult, primaryCoachId) {
  if (!quizResult || !quizResult.scoresJson) {
    return [];
  }

  const scores = quizResult.scoresJson;
  const secondaryCoaches = [];
  
  // Find all pillars with scores below 60
  const lowPillars = Object.entries(scores)
    .filter(([pillar, score]) => score < 60)
    .sort((a, b) => a[1] - b[1]) // Sort by score ascending
    .slice(0, 3); // Get top 3 lowest

  for (const [pillar, score] of lowPillars) {
    const coachRole = PILLAR_TO_COACH_ROLE[pillar];
    if (coachRole) {
      const coach = await getCoachByRole(coachRole);
      if (coach && coach.id !== primaryCoachId) {
        // Avoid duplicates
        if (!secondaryCoaches.find(c => c.id === coach.id)) {
          secondaryCoaches.push({
            coachId: coach.id,
            coachName: coach.name,
            pillar: pillar,
            score: score,
            reason: `Low ${pillar} score (${score}%)`
          });
        }
      }
    }
  }

  return secondaryCoaches;
}

/**
 * Main routing function
 * Determines the best coach for a user based on quiz results
 */
async function recommendCoach(userId, quizResultId = null) {
  try {
    // Get the latest quiz result for the user
    let quizResult;
    
    if (quizResultId) {
      quizResult = await prisma.quizResult.findUnique({
        where: { id: quizResultId },
        include: { user: true }
      });
      
      if (!quizResult || quizResult.userId !== userId) {
        throw new Error('Quiz result not found or access denied');
      }
    } else {
      // Get latest quiz result
      quizResult = await prisma.quizResult.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { user: true }
      });
    }

    if (!quizResult) {
      throw new Error('No quiz results found for user');
    }

    // Apply special rules first
    const specialRuleRole = await applySpecialRules(quizResult, userId);
    let primaryCoach = null;
    let primaryReason = '';

    if (specialRuleRole) {
      primaryCoach = await getCoachByRole(specialRuleRole);
      primaryReason = `Special rule: ${specialRuleRole} coach recommended based on quiz analysis`;
    }

    // If no special rule or coach not found, use lowest pillar
    if (!primaryCoach) {
      const lowestPillar = findLowestPillar(quizResult);
      
      if (!lowestPillar || !lowestPillar.pillar) {
        throw new Error('Could not determine lowest pillar from quiz results');
      }

      const coachRole = PILLAR_TO_COACH_ROLE[lowestPillar.pillar];
      if (!coachRole) {
        throw new Error(`No coach role mapped for pillar: ${lowestPillar.pillar}`);
      }

      primaryCoach = await getCoachByRole(coachRole);
      primaryReason = `Lowest pillar score: ${lowestPillar.pillar} (${lowestPillar.score}%)`;
    }

    if (!primaryCoach) {
      throw new Error(`No active coach found for role`);
    }

    // Get secondary coaches
    const secondaryCoaches = await getSecondaryCoaches(quizResult, primaryCoach.id);

    return {
      primaryCoach: {
        coachId: primaryCoach.id,
        coachName: primaryCoach.name,
        coachRole: primaryCoach.role,
        reason: primaryReason
      },
      secondaryCoaches: secondaryCoaches,
      quizResultId: quizResult.id,
      explanation: `Based on your quiz results, we recommend ${primaryCoach.name} as your primary coach. ${primaryReason}.`
    };
  } catch (error) {
    console.error('Coach recommendation error:', error);
    throw error;
  }
}

module.exports = {
  recommendCoach,
  findLowestPillar,
  applySpecialRules,
  getSecondaryCoaches
};


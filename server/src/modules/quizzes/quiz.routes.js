const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticate, optionalAuth, requireAdmin } = require('../../middleware/auth.middleware');
const PDFDocument = require('pdfkit');
const { sendQuizResultsEmail } = require('../../lib/email');

// =============================================
// GET /api/quiz/10x
// Get 10X Business Health Quiz questions
// =============================================
router.get('/quiz/10x', optionalAuth, async (req, res) => {
  try {
    console.log('📋 Fetching 10X Business Health Quiz...');
    
    // Use raw SQL to avoid Prisma schema issues
    try {
      const templates = await prisma.$queryRaw`
        SELECT id, name, description 
        FROM quiz_templates 
        WHERE name = '10X Business Health Quiz'
        LIMIT 1
      `;
      
      if (Array.isArray(templates) && templates.length > 0) {
        const template = templates[0];
        console.log('✅ Found quiz template:', template.name);
        
        const questions = await prisma.$queryRaw`
          SELECT q.id, q.text, q.type, q.pillar_tag as "pillarTag", q.weight, q."order", q.options,
                 COALESCE(p."order", 
                   CASE q.pillar_tag
                     WHEN 'STRATEGY' THEN 0
                     WHEN 'FINANCE' THEN 1
                     WHEN 'MARKETING' THEN 2
                     WHEN 'SALES' THEN 3
                     WHEN 'OPERATIONS' THEN 4
                     WHEN 'CULTURE' THEN 5
                     WHEN 'CUSTOMER_CENTRICITY' THEN 6
                     WHEN 'EXIT_STRATEGY' THEN 7
                     ELSE 99
                   END
                 ) as pillar_order
          FROM quiz_questions q
          LEFT JOIN pillars p ON q.pillar_tag = p.tag
          WHERE q.quiz_id = ${template.id}
          ORDER BY pillar_order ASC, q."order" ASC
        `;
        
        console.log('   Questions found:', questions.length);
        
        return res.json({
          id: template.id,
          name: template.name,
          description: template.description,
          questions: questions.map(q => ({
            id: q.id,
            text: q.text,
            type: q.type,
            pillarTag: q.pillarTag,
            weight: q.weight,
            order: q.order,
            options: q.options
          }))
        });
      } else {
        console.log('⚠️ Quiz template not found in database, returning empty quiz');
        // Return empty quiz if template doesn't exist
        return res.json({
          id: null,
          name: '10X Business Health Quiz',
          description: 'Comprehensive assessment of your business across 8 key pillars',
          questions: []
        });
      }
    } catch (sqlError) {
      console.error('❌ SQL error fetching quiz:', sqlError);
      console.error('   Error code:', sqlError.code);
      console.error('   Error message:', sqlError.message);
      
      // If table doesn't exist, return empty quiz
      if (sqlError.code === '42P01' || sqlError.message?.includes('does not exist')) {
        console.log('⚠️ Quiz tables do not exist, returning empty quiz');
        return res.json({
          id: null,
          name: '10X Business Health Quiz',
          description: 'Comprehensive assessment of your business across 8 key pillars',
          questions: []
        });
      }
      throw sqlError;
    }
  } catch (error) {
    console.error('❌ Get quiz questions error:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({ 
      error: 'Failed to get quiz questions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/quiz/10x/submit
// Submit quiz answers and calculate scores
// =============================================
router.post('/quiz/10x/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body; // Array of { questionId, answer }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get quiz template and questions using raw SQL
    const templates = await prisma.$queryRaw`
      SELECT id, name, description 
      FROM quiz_templates 
      WHERE name = '10X Business Health Quiz'
      LIMIT 1
    `;
    
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(404).json({ error: 'Quiz template not found' });
    }
    
    const quizTemplate = templates[0];
    
    // Get all questions for this quiz
    const questions = await prisma.$queryRaw`
      SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
      FROM quiz_questions
      WHERE quiz_id = ${quizTemplate.id}
    `;
    
    // Convert to format expected by rest of code
    quizTemplate.questions = questions;

    // Create a map of questionId -> question for quick lookup
    const questionMap = new Map();
    quizTemplate.questions.forEach(q => {
      questionMap.set(q.id, q);
    });

    // Calculate pillar scores
    const pillarScores = {
      STRATEGY: { total: 0, max: 0 },
      FINANCE: { total: 0, max: 0 },
      MARKETING: { total: 0, max: 0 },
      SALES: { total: 0, max: 0 },
      OPERATIONS: { total: 0, max: 0 },
      CULTURE: { total: 0, max: 0 },
      CUSTOMER_CENTRICITY: { total: 0, max: 0 },
      EXIT_STRATEGY: { total: 0, max: 0 }
    };

    // Process each answer
    answers.forEach(({ questionId, answer }) => {
      const question = questionMap.get(parseInt(questionId));
      if (!question) {
        console.warn(`Question not found: ${questionId}`);
        return;
      }

      let score = 0;
      const maxScore = 10; // Scale of 1-10

      // Calculate score based on question type
      if (question.type === 'SCALE') {
        // Scale questions: answer is 1-10
        score = Math.max(0, Math.min(10, parseFloat(answer) || 0));
      } else if (question.type === 'MULTIPLE_CHOICE') {
        // Multiple choice: answer is option index, convert to score
        const options = question.options || [];
        const optionIndex = parseInt(answer);
        if (optionIndex >= 0 && optionIndex < options.length) {
          // Assume options are ordered from worst to best
          score = ((optionIndex + 1) / options.length) * 10;
        }
      } else if (question.type === 'OPEN') {
        // Open questions: for now, default to 5 (neutral)
        // Could be enhanced with AI sentiment analysis
        score = 5;
      }

      // Apply weight and add to pillar score
      const weightedScore = score * question.weight;
      const weightedMax = maxScore * question.weight;

      // Ensure pillar tag exists in pillarScores
      if (pillarScores[question.pillarTag]) {
        pillarScores[question.pillarTag].total += weightedScore;
        pillarScores[question.pillarTag].max += weightedMax;
      } else {
        console.warn(`Unknown pillar tag: ${question.pillarTag}`);
      }
    });

    // Normalize scores to 0-100
    const normalizedScores = {};
    let overallTotal = 0;
    let overallMax = 0;

    Object.keys(pillarScores).forEach(pillar => {
      const { total, max } = pillarScores[pillar];
      const normalized = max > 0 ? Math.round((total / max) * 100) : 0;
      normalizedScores[pillar] = normalized;
      overallTotal += total;
      overallMax += max;
    });

    const overallScore = overallMax > 0 ? Math.round((overallTotal / overallMax) * 100) : 0;

    // Get user's primary coach if assigned using raw SQL
    const users = await prisma.$queryRaw`
      SELECT primary_coach_id as "primaryCoachId"
      FROM users
      WHERE id = ${req.user.id}
      LIMIT 1
    `;
    const primaryCoachId = users && users.length > 0 ? users[0].primaryCoachId : null;

    // Save quiz result using raw SQL
    const result = await prisma.$queryRaw`
      INSERT INTO quiz_results (user_id, quiz_id, coach_id, scores_json, total_score, answers_json, created_at)
      VALUES (${req.user.id}, ${quizTemplate.id}, ${primaryCoachId}, ${JSON.stringify(normalizedScores)}::jsonb, ${overallScore}, ${JSON.stringify(answers)}::jsonb, NOW())
      RETURNING id, user_id as "userId", quiz_id as "quizId", coach_id as "coachId", scores_json as "scoresJson", total_score as "totalScore", answers_json as "answersJson", created_at as "createdAt"
    `;
    
    const quizResult = result[0];

    res.json({
      success: true,
      resultId: quizResult.id,
      pillarScores: normalizedScores,
      overallScore: overallScore,
      createdAt: quizResult.createdAt
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to submit quiz',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// =============================================
// GET /api/quiz/results/:resultId
// Get specific quiz result
// =============================================
router.get('/quiz/results/:resultId', authenticate, async (req, res) => {
  try {
    const resultId = parseInt(req.params.resultId);

    // Get quiz result using raw SQL
    const results = await prisma.$queryRaw`
      SELECT 
        qr.id, qr.user_id as "userId", qr.quiz_id as "quizId", qr.coach_id as "coachId",
        qr.scores_json as "scoresJson", qr.total_score as "totalScore", 
        qr.answers_json as "answersJson", qr.email_sent as "emailSent",
        qr.email_sent_at as "emailSentAt", qr.created_at as "createdAt",
        qt.id as "quiz.id", qt.name as "quiz.name", qt.description as "quiz.description"
      FROM quiz_results qr
      LEFT JOIN quiz_templates qt ON qr.quiz_id = qt.id
      WHERE qr.id = ${resultId}
      LIMIT 1
    `;
    
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }
    
    const resultData = results[0];
    const result = {
      id: resultData.id,
      userId: resultData.userId,
      quizId: resultData.quizId,
      coachId: resultData.coachId,
      scoresJson: resultData.scoresJson,
      totalScore: resultData.totalScore,
      answersJson: resultData.answersJson,
      emailSent: resultData.emailSent,
      emailSentAt: resultData.emailSentAt,
      createdAt: resultData.createdAt,
      quiz: resultData['quiz.id'] ? {
        id: resultData['quiz.id'],
        name: resultData['quiz.name'],
        description: resultData['quiz.description']
      } : null
    };

    // Check if user owns this result
    if (result.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(result);
  } catch (error) {
    console.error('Get quiz result error:', error);
    res.status(500).json({ error: 'Failed to get quiz result' });
  }
});

// =============================================
// GET /api/quiz/results
// Get user's quiz results
// =============================================
router.get('/quiz/results', authenticate, async (req, res) => {
  try {
    // Get user's quiz results using raw SQL
    const results = await prisma.$queryRaw`
      SELECT 
        qr.id, qr.user_id as "userId", qr.quiz_id as "quizId", qr.coach_id as "coachId",
        qr.scores_json as "scoresJson", qr.total_score as "totalScore", 
        qr.answers_json as "answersJson", qr.email_sent as "emailSent",
        qr.email_sent_at as "emailSentAt", qr.created_at as "createdAt",
        qt.id as "quiz.id", qt.name as "quiz.name", qt.description as "quiz.description",
        c.id as "coach.id", c.name as "coach.name", c.role as "coach.role"
      FROM quiz_results qr
      LEFT JOIN quiz_templates qt ON qr.quiz_id = qt.id
      LEFT JOIN coaches c ON qr.coach_id = c.id
      WHERE qr.user_id = ${req.user.id}
      ORDER BY qr.created_at DESC
    `;
    
    const formattedResults = results.map(r => ({
      id: r.id,
      userId: r.userId,
      quizId: r.quizId,
      coachId: r.coachId,
      scoresJson: r.scoresJson,
      totalScore: r.totalScore,
      answersJson: r.answersJson,
      emailSent: r.emailSent,
      emailSentAt: r.emailSentAt,
      createdAt: r.createdAt,
      quiz: r['quiz.id'] ? {
        id: r['quiz.id'],
        name: r['quiz.name'],
        description: r['quiz.description']
      } : null,
      coach: r['coach.id'] ? {
        id: r['coach.id'],
        name: r['coach.name'],
        role: r['coach.role']
      } : null
    }));

    res.json(formattedResults);
  } catch (error) {
    console.error('Get quiz results error:', error);
    res.status(500).json({ error: 'Failed to get quiz results' });
  }
});

// =============================================
// GET /api/quiz/pillar/:pillarTag
// Get individual pillar quiz questions
// =============================================
router.get('/quiz/pillar/:pillarTag', optionalAuth, async (req, res) => {
  try {
    let { pillarTag } = req.params;
    pillarTag = pillarTag.toUpperCase();
    console.log('📋 Fetching pillar quiz for:', pillarTag);
    
    // Normalize common typos
    const pillarNormalization = {
      'MARKETTING': 'MARKETING',
      'MARKETTNG': 'MARKETING',
      'MARKETIN': 'MARKETING',
      'CUSTOMER_CENTRICITY': 'CUSTOMER_CENTRICITY',
      'CUSTOMERCENTRICITY': 'CUSTOMER_CENTRICITY',
      'CUSTOMER_CENTRIC': 'CUSTOMER_CENTRICITY',
      'EXIT_STRATEGY': 'EXIT_STRATEGY',
      'EXITSTRATEGY': 'EXIT_STRATEGY'
    };
    
    if (pillarNormalization[pillarTag]) {
      pillarTag = pillarNormalization[pillarTag];
      console.log('   Normalized pillar tag to:', pillarTag);
    }
    
    // Validate pillar tag
    const validPillars = ['STRATEGY', 'FINANCE', 'MARKETING', 'SALES', 'OPERATIONS', 'CULTURE', 'CUSTOMER_CENTRICITY', 'EXIT_STRATEGY'];
    if (!validPillars.includes(pillarTag)) {
      return res.status(400).json({ 
        error: 'Invalid pillar tag',
        message: `The pillar "${req.params.pillarTag}" is not valid. Valid pillars are: ${validPillars.join(', ')}`
      });
    }

    const pillarInfo = {
      STRATEGY: { name: 'Strategy', description: 'Assess your strategic planning and vision' },
      FINANCE: { name: 'Finance', description: 'Evaluate your financial health and management' },
      MARKETING: { name: 'Marketing', description: 'Measure your marketing effectiveness' },
      SALES: { name: 'Sales', description: 'Analyze your sales processes and performance' },
      OPERATIONS: { name: 'Operations', description: 'Review your operational efficiency' },
      CULTURE: { name: 'Culture', description: 'Examine your organizational culture' },
      CUSTOMER_CENTRICITY: { name: 'Customer Experience', description: 'Assess customer satisfaction and experience' },
      EXIT_STRATEGY: { name: 'Exit Strategy', description: 'Evaluate your exit planning and strategy' }
    };

    // Use raw SQL to avoid Prisma schema issues
    try {
      // First get the quiz template - try case-insensitive search
      let templates = await prisma.$queryRaw`
        SELECT id, name, description 
        FROM quiz_templates 
        WHERE LOWER(name) = LOWER('10X Business Health Quiz')
        LIMIT 1
      `;
      
      // If not found, try exact match
      if (!Array.isArray(templates) || templates.length === 0) {
        templates = await prisma.$queryRaw`
          SELECT id, name, description 
          FROM quiz_templates 
          WHERE name = '10X Business Health Quiz'
          LIMIT 1
        `;
      }
      
      // If still not found, try any template
      if (!Array.isArray(templates) || templates.length === 0) {
        templates = await prisma.$queryRaw`
          SELECT id, name, description 
          FROM quiz_templates 
          LIMIT 1
        `;
      }
      
      if (!Array.isArray(templates) || templates.length === 0) {
        console.log('⚠️ No quiz template found in database');
        return res.status(404).json({ 
          error: 'Quiz template not found',
          message: 'The quiz template has not been created yet. Please set up the quiz in the admin panel first.'
        });
      }

      const template = templates[0];
      console.log('✅ Found quiz template:', template.name, 'ID:', template.id);

      // Get questions for this specific pillar - try multiple approaches
      let questions = [];
      
      // First try: exact match (uppercase)
      try {
        questions = await prisma.$queryRaw`
          SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
          FROM quiz_questions
          WHERE quiz_id = ${template.id}
          AND pillar_tag = ${pillarTag}
          ORDER BY "order" ASC
        `;
        console.log(`   Exact match query returned ${Array.isArray(questions) ? questions.length : 0} questions`);
      } catch (exactError) {
        console.log('   Exact match query failed, trying case-insensitive');
      }
      
      // Second try: case-insensitive comparison
      if (!Array.isArray(questions) || questions.length === 0) {
        try {
          questions = await prisma.$queryRaw`
            SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
            FROM quiz_questions
            WHERE quiz_id = ${template.id}
            AND UPPER(TRIM(pillar_tag)) = UPPER(TRIM(${pillarTag}))
            ORDER BY "order" ASC
          `;
          console.log(`   Case-insensitive query returned ${Array.isArray(questions) ? questions.length : 0} questions`);
        } catch (ciError) {
          console.log('   Case-insensitive query failed:', ciError.message);
        }
      }
      
      // Third try: Get all questions and filter in JavaScript (fallback)
      if (!Array.isArray(questions) || questions.length === 0) {
        try {
          const allQuestions = await prisma.$queryRaw`
            SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
            FROM quiz_questions
            WHERE quiz_id = ${template.id}
            ORDER BY "order" ASC
          `;
          if (Array.isArray(allQuestions)) {
            questions = allQuestions.filter(q => 
              q.pillarTag && q.pillarTag.toUpperCase().trim() === pillarTag.toUpperCase().trim()
            );
            console.log(`   JavaScript filter found ${questions.length} questions from ${allQuestions.length} total`);
          }
        } catch (fallbackError) {
          console.log('   Fallback query failed:', fallbackError.message);
        }
      }

      console.log(`   Questions found for ${pillarTag}:`, Array.isArray(questions) ? questions.length : 0);
      console.log(`   Template ID used: ${template.id}`);

      if (!Array.isArray(questions) || questions.length === 0) {
        // Log all available pillar tags for debugging
        const allQuestions = await prisma.$queryRaw`
          SELECT DISTINCT pillar_tag
          FROM quiz_questions
          WHERE quiz_id = ${template.id}
        `;
        console.log('   Available pillar tags in database:', allQuestions.map(q => q.pillar_tag));
        
        return res.status(404).json({
          error: 'No questions found',
          message: `No questions have been configured for the ${pillarInfo[pillarTag].name} pillar yet. Please add questions in the admin panel.`
        });
      }

      res.json({
        id: template.id,
        name: `${pillarInfo[pillarTag].name} Pillar Quiz`,
        description: pillarInfo[pillarTag].description,
        pillarTag: pillarTag,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          pillarTag: q.pillarTag,
          weight: q.weight,
          order: q.order,
          options: q.options
        }))
      });
    } catch (sqlError) {
      console.error('❌ SQL error fetching pillar quiz:', sqlError);
      console.error('   Error code:', sqlError.code);
      console.error('   Error message:', sqlError.message);
      console.error('   Error stack:', sqlError.stack);
      
      // If table doesn't exist, return helpful error
      if (sqlError.code === '42P01' || sqlError.message?.includes('does not exist')) {
        console.log('⚠️ Quiz tables do not exist');
        return res.status(404).json({
          error: 'Quiz not configured',
          message: 'The quiz tables have not been created yet. Please contact an administrator to set up the database schema.'
        });
      }
      
      // For other SQL errors, return a more helpful message
      return res.status(500).json({
        error: 'Database error',
        message: 'An error occurred while fetching the quiz. Please try again or contact support.',
        details: process.env.NODE_ENV === 'development' ? sqlError.message : undefined
      });
    }
  } catch (error) {
    console.error('❌ Get pillar quiz error:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to get pillar quiz',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/quiz/pillar/:pillarTag/submit
// Submit individual pillar quiz
// =============================================
router.post('/quiz/pillar/:pillarTag/submit', authenticate, async (req, res) => {
  try {
    let { pillarTag } = req.params;
    pillarTag = pillarTag.toUpperCase();
    const { answers } = req.body;

    console.log('📝 Submitting pillar quiz for:', pillarTag);
    console.log('   User ID:', req.user?.id);
    console.log('   Answers count:', answers?.length);

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Normalize common typos
    const pillarNormalization = {
      'MARKETTING': 'MARKETING',
      'MARKETTNG': 'MARKETING',
      'MARKETIN': 'MARKETING',
      'CUSTOMER_CENTRICITY': 'CUSTOMER_CENTRICITY',
      'CUSTOMERCENTRICITY': 'CUSTOMER_CENTRICITY',
      'CUSTOMER_CENTRIC': 'CUSTOMER_CENTRICITY',
      'EXIT_STRATEGY': 'EXIT_STRATEGY',
      'EXITSTRATEGY': 'EXIT_STRATEGY'
    };
    
    if (pillarNormalization[pillarTag]) {
      pillarTag = pillarNormalization[pillarTag];
      console.log('   Normalized pillar tag to:', pillarTag);
    }

    // Get quiz template and questions for this pillar using raw SQL
    let templates = await prisma.$queryRaw`
      SELECT id, name, description 
      FROM quiz_templates 
      WHERE LOWER(name) = LOWER('10X Business Health Quiz')
      LIMIT 1
    `;
    
    if (!Array.isArray(templates) || templates.length === 0) {
      templates = await prisma.$queryRaw`
        SELECT id, name, description 
        FROM quiz_templates 
        LIMIT 1
      `;
    }
    
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(404).json({ error: 'Quiz template not found' });
    }
    
    const quizTemplate = templates[0];
    console.log('✅ Found quiz template:', quizTemplate.name, 'ID:', quizTemplate.id);
    
    // Get questions for this pillar - try multiple approaches
    let questions = [];
    
    // Try exact match first
    try {
      questions = await prisma.$queryRaw`
        SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
        FROM quiz_questions
        WHERE quiz_id = ${quizTemplate.id}
        AND pillar_tag = ${pillarTag}
      `;
      console.log(`   Exact match found ${Array.isArray(questions) ? questions.length : 0} questions`);
    } catch (exactError) {
      console.log('   Exact match failed, trying case-insensitive');
    }
    
    // Try case-insensitive
    if (!Array.isArray(questions) || questions.length === 0) {
      try {
        questions = await prisma.$queryRaw`
          SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
          FROM quiz_questions
          WHERE quiz_id = ${quizTemplate.id}
          AND UPPER(TRIM(pillar_tag)) = UPPER(TRIM(${pillarTag}))
        `;
        console.log(`   Case-insensitive found ${Array.isArray(questions) ? questions.length : 0} questions`);
      } catch (ciError) {
        console.log('   Case-insensitive failed, trying fallback');
      }
    }
    
    // Fallback: get all and filter
    if (!Array.isArray(questions) || questions.length === 0) {
      try {
        const allQuestions = await prisma.$queryRaw`
          SELECT id, text, type, pillar_tag as "pillarTag", weight, "order", options
          FROM quiz_questions
          WHERE quiz_id = ${quizTemplate.id}
        `;
        if (Array.isArray(allQuestions)) {
          questions = allQuestions.filter(q => 
            q.pillarTag && q.pillarTag.toUpperCase().trim() === pillarTag.toUpperCase().trim()
          );
          console.log(`   Fallback filter found ${questions.length} questions from ${allQuestions.length} total`);
        }
      } catch (fallbackError) {
        console.error('   All query methods failed:', fallbackError.message);
      }
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(404).json({ 
        error: 'No questions found',
        message: `No questions found for ${pillarTag} pillar. Please ensure questions are configured in the admin panel.`
      });
    }
    
    // Convert to format expected by rest of code
    quizTemplate.questions = questions;

    // Create question map
    const questionMap = new Map();
    quizTemplate.questions.forEach(q => {
      questionMap.set(q.id, q);
    });

    // Calculate score for this pillar only
    let pillarTotal = 0;
    let pillarMax = 0;

    answers.forEach(({ questionId, answer }) => {
      const question = questionMap.get(parseInt(questionId));
      if (!question) return;

      let score = 0;
      const maxScore = 10;

      if (question.type === 'SCALE') {
        score = Math.max(0, Math.min(10, parseFloat(answer) || 0));
      } else if (question.type === 'MULTIPLE_CHOICE') {
        const options = question.options || [];
        const optionIndex = parseInt(answer);
        if (optionIndex >= 0 && optionIndex < options.length) {
          score = ((optionIndex + 1) / options.length) * 10;
        }
      } else if (question.type === 'OPEN') {
        score = 5;
      }

      const weightedScore = score * question.weight;
      const weightedMax = maxScore * question.weight;

      pillarTotal += weightedScore;
      pillarMax += weightedMax;
    });

    const pillarScore = pillarMax > 0 ? Math.round((pillarTotal / pillarMax) * 100) : 0;

    // Get user's primary coach using raw SQL
    const users = await prisma.$queryRaw`
      SELECT primary_coach_id as "primaryCoachId"
      FROM users
      WHERE id = ${req.user.id}
      LIMIT 1
    `;
    const primaryCoachId = users && users.length > 0 ? users[0].primaryCoachId : null;

    // Create scores object with only this pillar
    const scoresJson = { [pillarTag]: pillarScore };
    const scoresJsonString = JSON.stringify(scoresJson);
    const answersJsonString = JSON.stringify(answers);

    console.log('   Saving quiz result...');
    console.log('   Scores JSON:', scoresJsonString);
    console.log('   Primary Coach ID:', primaryCoachId);

    // Save result with only this pillar's score using raw SQL
    // Use parameterized query to avoid SQL injection and handle JSON properly
    let result;
    try {
      result = await prisma.$queryRaw`
        INSERT INTO quiz_results (user_id, quiz_id, coach_id, scores_json, total_score, answers_json, created_at)
        VALUES (
          ${req.user.id}, 
          ${quizTemplate.id}, 
          ${primaryCoachId}, 
          ${scoresJsonString}::jsonb, 
          ${pillarScore}, 
          ${answersJsonString}::jsonb, 
          NOW()
        )
        RETURNING id, user_id as "userId", quiz_id as "quizId", coach_id as "coachId", scores_json as "scoresJson", total_score as "totalScore", answers_json as "answersJson", created_at as "createdAt"
      `;
    } catch (insertError) {
      console.error('❌ Error inserting quiz result:', insertError);
      console.error('   Error code:', insertError.code);
      console.error('   Error message:', insertError.message);
      
      // If table doesn't exist, return helpful error
      if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
        return res.status(404).json({
          error: 'Quiz results table not found',
          message: 'The quiz results table has not been created yet. Please contact an administrator to set up the database schema.'
        });
      }
      
      // If JSON casting fails, try without explicit cast
      if (insertError.message?.includes('jsonb') || insertError.message?.includes('JSON')) {
        try {
          result = await prisma.$queryRaw`
            INSERT INTO quiz_results (user_id, quiz_id, coach_id, scores_json, total_score, answers_json, created_at)
            VALUES (
              ${req.user.id}, 
              ${quizTemplate.id}, 
              ${primaryCoachId}, 
              ${scoresJsonString}, 
              ${pillarScore}, 
              ${answersJsonString}, 
              NOW()
            )
            RETURNING id, user_id as "userId", quiz_id as "quizId", coach_id as "coachId", scores_json as "scoresJson", total_score as "totalScore", answers_json as "answersJson", created_at as "createdAt"
          `;
          console.log('✅ Insert succeeded without explicit JSON cast');
        } catch (retryError) {
          console.error('❌ Retry insert also failed:', retryError);
          throw retryError;
        }
      } else {
        throw insertError;
      }
    }
    
    if (!Array.isArray(result) || result.length === 0) {
      return res.status(500).json({ error: 'Failed to save quiz result' });
    }
    
    const quizResult = result[0];
    console.log('✅ Quiz result saved with ID:', quizResult.id);

    res.json({
      success: true,
      resultId: quizResult.id,
      pillarScores: { [pillarTag]: pillarScore }, // Return as object to match full quiz format
      overallScore: pillarScore, // For single pillar, overall = pillar score
      pillarTag: pillarTag, // Keep for reference
      createdAt: quizResult.createdAt
    });
  } catch (error) {
    console.error('❌ Submit pillar quiz error:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to submit pillar quiz',
      message: error.message || 'An error occurred while submitting the quiz. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================
// POST /api/quiz/results/:resultId/send-email
// Send quiz results to client via email
// =============================================
router.post('/quiz/results/:resultId/send-email', authenticate, async (req, res) => {
  try {
    const { resultId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    // Get quiz result using raw SQL
    const results = await prisma.$queryRaw`
      SELECT 
        qr.id, qr.user_id as "userId", qr.quiz_id as "quizId",
        qr.scores_json as "scoresJson", qr.total_score as "totalScore", 
        qr.created_at as "createdAt",
        u.name as "user.name", u.email as "user.email", u.business_name as "user.businessName",
        qt.id as "quiz.id", qt.name as "quiz.name"
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      LEFT JOIN quiz_templates qt ON qr.quiz_id = qt.id
      WHERE qr.id = ${parseInt(resultId)}
      LIMIT 1
    `;
    
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }
    
    const resultData = results[0];
    const result = {
      id: resultData.id,
      userId: resultData.userId,
      quizId: resultData.quizId,
      scoresJson: resultData.scoresJson,
      totalScore: resultData.totalScore,
      createdAt: resultData.createdAt,
      user: {
        name: resultData['user.name'],
        email: resultData['user.email'],
        businessName: resultData['user.businessName']
      },
      quiz: resultData['quiz.id'] ? {
        id: resultData['quiz.id'],
        name: resultData['quiz.name']
      } : null
    };

    // Check if user owns this result
    if (result.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Send email with quiz results
    try {
      const scores = result.scoresJson || {};
      await sendQuizResultsEmail({
        to: email,
        userName: result.user.name || 'User',
        businessName: result.user.businessName || null,
        overallScore: result.totalScore,
        pillarScores: scores,
        quizDate: result.createdAt,
        resultId: result.id
      });

      // Mark as sent in database using raw SQL
      await prisma.$executeRaw`
        UPDATE quiz_results
        SET email_sent = true, email_sent_at = NOW()
        WHERE id = ${parseInt(resultId)}
      `;

      res.json({
        success: true,
        message: 'Quiz results sent successfully',
        email: email
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      console.error('Error stack:', emailError.stack);
      
      // If SMTP is not configured, return helpful error
      if (emailError.message && emailError.message.includes('SMTP configuration')) {
        return res.status(500).json({ 
          error: 'Email service is not configured. Please contact the administrator.',
          details: emailError.message
        });
      }
      
      // Check for common SMTP errors
      if (emailError.code === 'EAUTH' || emailError.code === 'EENVELOPE') {
        return res.status(500).json({ 
          error: 'Email authentication failed. Please check SMTP credentials.',
          details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
        });
      }
      
      if (emailError.code === 'ECONNECTION' || emailError.code === 'ETIMEDOUT') {
        return res.status(500).json({ 
          error: 'Could not connect to email server. Please check SMTP settings.',
          details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to send email. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? emailError.message : undefined,
        code: emailError.code || 'UNKNOWN'
      });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// =============================================
// GET /api/quiz/results/:resultId/export
// Export quiz results as PDF/JSON
// =============================================
router.get('/quiz/results/:resultId/export', authenticate, async (req, res) => {
  try {
    const { resultId } = req.params;
    const { format = 'json' } = req.query;

    // Get quiz result using raw SQL
    const results = await prisma.$queryRaw`
      SELECT 
        qr.id, qr.user_id as "userId", qr.quiz_id as "quizId", qr.coach_id as "coachId",
        qr.scores_json as "scoresJson", qr.total_score as "totalScore", 
        qr.answers_json as "answersJson", qr.created_at as "createdAt",
        u.name as "user.name", u.email as "user.email", u.business_name as "user.businessName",
        qt.id as "quiz.id", qt.name as "quiz.name", qt.description as "quiz.description",
        c.id as "coach.id", c.name as "coach.name", c.role as "coach.role"
      FROM quiz_results qr
      LEFT JOIN users u ON qr.user_id = u.id
      LEFT JOIN quiz_templates qt ON qr.quiz_id = qt.id
      LEFT JOIN coaches c ON qr.coach_id = c.id
      WHERE qr.id = ${parseInt(resultId)}
      LIMIT 1
    `;
    
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(404).json({ error: 'Quiz result not found' });
    }
    
    const resultData = results[0];
    const result = {
      id: resultData.id,
      userId: resultData.userId,
      quizId: resultData.quizId,
      coachId: resultData.coachId,
      scoresJson: resultData.scoresJson,
      totalScore: resultData.totalScore,
      answersJson: resultData.answersJson,
      createdAt: resultData.createdAt,
      user: {
        name: resultData['user.name'],
        email: resultData['user.email'],
        businessName: resultData['user.businessName']
      },
      quiz: resultData['quiz.id'] ? {
        id: resultData['quiz.id'],
        name: resultData['quiz.name'],
        description: resultData['quiz.description']
      } : null,
      coach: resultData['coach.id'] ? {
        id: resultData['coach.id'],
        name: resultData['coach.name'],
        role: resultData['coach.role']
      } : null
    };

    // Check if user owns this result
    if (result.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (format === 'json') {
      res.json(result);
    } else if (format === 'pdf') {
      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="quiz-results-${resultId}.pdf"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // PDF Content
      const scores = result.scoresJson || {};
      const pillarNames = {
        STRATEGY: 'Strategy',
        FINANCE: 'Finance',
        MARKETING: 'Marketing',
        SALES: 'Sales',
        OPERATIONS: 'Operations',
        CULTURE: 'Culture',
        CUSTOMER_CENTRICITY: 'Customer Experience',
        EXIT_STRATEGY: 'Exit Strategy'
      };
      
      // Header
      doc.fontSize(24).text('10X Business Health Quiz Results', { align: 'center' });
      doc.moveDown();
      
      // User Info
      doc.fontSize(14).text(`Name: ${result.user.name || 'N/A'}`, { align: 'left' });
      if (result.user.businessName) {
        doc.text(`Business: ${result.user.businessName}`, { align: 'left' });
      }
      doc.text(`Date: ${new Date(result.createdAt).toLocaleDateString()}`, { align: 'left' });
      doc.moveDown();
      
      // Overall Score
      doc.fontSize(18).fillColor('#3b82f6').text('Overall Score', { align: 'left' });
      doc.fontSize(36).fillColor('#1e40af').text(`${Math.round(result.totalScore)}%`, { align: 'left' });
      doc.fillColor('black');
      doc.moveDown();
      
      // Pillar Scores
      doc.fontSize(18).text('Pillar Scores', { align: 'left' });
      doc.moveDown(0.5);
      
      Object.entries(scores).forEach(([pillar, score]) => {
        const pillarName = pillarNames[pillar] || pillar;
        const scoreNum = Math.round(score);
        
        // Color based on score
        if (scoreNum >= 80) {
          doc.fillColor('#22c55e'); // Green
        } else if (scoreNum >= 60) {
          doc.fillColor('#f59e0b'); // Orange
        } else {
          doc.fillColor('#ef4444'); // Red
        }
        
        doc.fontSize(12).text(`${pillarName}: ${scoreNum}%`, { align: 'left' });
        doc.fillColor('black');
      });
      
      doc.moveDown();
      
      // Footer
      doc.fontSize(10).fillColor('#6b7280').text(
        `Generated on ${new Date().toLocaleString()}`,
        { align: 'center' }
      );
      
      // Finalize PDF
      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use "json" or "pdf"' });
    }
  } catch (error) {
    console.error('Export quiz result error:', error);
    res.status(500).json({ error: 'Failed to export quiz result' });
  }
});

// =============================================
// ADMIN ROUTES - Quiz Management
// =============================================

// =============================================
// GET /api/admin/quiz/questions
// Get all quiz questions organized by pillar (admin only)
// =============================================
router.get('/manage-quiz-questions', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('📋 Admin: Fetching quiz questions...');
    
    // Try to get pillars using raw SQL
    let pillars = [];
    try {
      const pillarResults = await prisma.$queryRaw`
        SELECT id, tag, name, icon, color, description, active, "order"
        FROM pillars
        WHERE active = true
        ORDER BY "order" ASC, name ASC
      `;
      if (Array.isArray(pillarResults)) {
        pillars = pillarResults;
      }
    } catch (pillarError) {
      console.warn('⚠️ Pillars table may not exist yet:', pillarError.message);
      // Return default pillars if table doesn't exist
      pillars = [
        { id: 1, tag: 'STRATEGY', name: 'Strategy', icon: '🎯', color: '#3b82f6', description: 'Strategic planning and vision', active: true, order: 0 },
        { id: 2, tag: 'FINANCE', name: 'Finance', icon: '💰', color: '#10b981', description: 'Financial health and management', active: true, order: 1 },
        { id: 3, tag: 'MARKETING', name: 'Marketing', icon: '📢', color: '#f59e0b', description: 'Marketing effectiveness', active: true, order: 2 },
        { id: 4, tag: 'SALES', name: 'Sales', icon: '💼', color: '#ef4444', description: 'Sales processes and performance', active: true, order: 3 },
        { id: 5, tag: 'OPERATIONS', name: 'Operations', icon: '⚙️', color: '#8b5cf6', description: 'Operational efficiency', active: true, order: 4 },
        { id: 6, tag: 'CULTURE', name: 'Culture', icon: '👥', color: '#ec4899', description: 'Organizational culture', active: true, order: 5 },
        { id: 7, tag: 'CUSTOMER_CENTRICITY', name: 'Customer Experience', icon: '❤️', color: '#06b6d4', description: 'Customer satisfaction and experience', active: true, order: 6 },
        { id: 8, tag: 'EXIT_STRATEGY', name: 'Exit Strategy', icon: '🚀', color: '#6366f1', description: 'Exit planning and strategy', active: true, order: 7 }
      ];
    }

    // Get quiz template and questions using raw SQL
    let quizTemplate = null;
    let questions = [];
    
    try {
      const templates = await prisma.$queryRaw`
        SELECT id, name, description
        FROM quiz_templates
        WHERE name = '10X Business Health Quiz'
        LIMIT 1
      `;
      
      if (Array.isArray(templates) && templates.length > 0) {
        quizTemplate = templates[0];
        
        // Get questions for this quiz - ordered by pillar order (STRATEGY first)
        const questionResults = await prisma.$queryRaw`
          SELECT q.id, q.text, q.type, q.pillar_tag as "pillarTag", q.weight, q."order", q.options,
                 COALESCE(p."order", 
                   CASE q.pillar_tag
                     WHEN 'STRATEGY' THEN 0
                     WHEN 'FINANCE' THEN 1
                     WHEN 'MARKETING' THEN 2
                     WHEN 'SALES' THEN 3
                     WHEN 'OPERATIONS' THEN 4
                     WHEN 'CULTURE' THEN 5
                     WHEN 'CUSTOMER_CENTRICITY' THEN 6
                     WHEN 'EXIT_STRATEGY' THEN 7
                     ELSE 99
                   END
                 ) as pillar_order
          FROM quiz_questions q
          LEFT JOIN pillars p ON q.pillar_tag = p.tag
          WHERE q.quiz_id = ${quizTemplate.id}
          ORDER BY pillar_order ASC, q."order" ASC
        `;
        
        if (Array.isArray(questionResults)) {
          questions = questionResults;
        }
      }
    } catch (sqlError) {
      console.warn('⚠️ Quiz tables may not exist yet:', sqlError.message);
      // Return empty quiz structure
      return res.json({
        quizId: null,
        quizName: '10X Business Health Quiz',
        questionsByPillar: {},
        pillars: pillars
      });
    }

    // Organize questions by pillar
    const questionsByPillar = {};
    questions.forEach(q => {
      const pillarTag = q.pillarTag || q.pillar_tag;
      if (!questionsByPillar[pillarTag]) {
        questionsByPillar[pillarTag] = [];
      }
      questionsByPillar[pillarTag].push({
        id: q.id,
        text: q.text,
        type: q.type,
        pillarTag: pillarTag,
        weight: q.weight,
        order: q.order,
        options: q.options
      });
    });

    res.json({
      quizId: quizTemplate?.id || null,
      quizName: quizTemplate?.name || '10X Business Health Quiz',
      questionsByPillar,
      pillars: pillars
    });
  } catch (error) {
    console.error('❌ Get admin quiz questions error:', error);
    console.error('   Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Return default structure on error
    const defaultPillars = [
      { id: 1, tag: 'STRATEGY', name: 'Strategy', icon: '🎯', color: '#3b82f6', description: 'Strategic planning and vision', active: true, order: 0 },
      { id: 2, tag: 'FINANCE', name: 'Finance', icon: '💰', color: '#10b981', description: 'Financial health and management', active: true, order: 1 },
      { id: 3, tag: 'MARKETING', name: 'Marketing', icon: '📢', color: '#f59e0b', description: 'Marketing effectiveness', active: true, order: 2 },
      { id: 4, tag: 'SALES', name: 'Sales', icon: '💼', color: '#ef4444', description: 'Sales processes and performance', active: true, order: 3 },
      { id: 5, tag: 'OPERATIONS', name: 'Operations', icon: '⚙️', color: '#8b5cf6', description: 'Operational efficiency', active: true, order: 4 },
      { id: 6, tag: 'CULTURE', name: 'Culture', icon: '👥', color: '#ec4899', description: 'Organizational culture', active: true, order: 5 },
      { id: 7, tag: 'CUSTOMER_CENTRICITY', name: 'Customer Experience', icon: '❤️', color: '#06b6d4', description: 'Customer satisfaction and experience', active: true, order: 6 },
      { id: 8, tag: 'EXIT_STRATEGY', name: 'Exit Strategy', icon: '🚀', color: '#6366f1', description: 'Exit planning and strategy', active: true, order: 7 }
    ];

    res.json({
      quizId: null,
      quizName: '10X Business Health Quiz',
      questionsByPillar: {},
      pillars: defaultPillars
    });
  }
});

// =============================================
// POST /api/admin/quiz/questions
// Create a new quiz question (admin only)
// =============================================
router.post('/manage-quiz-questions', authenticate, requireAdmin, async (req, res) => {
  try {
    const { text, type, pillarTag, weight, order, options } = req.body;

    if (!text || !type || !pillarTag) {
      return res.status(400).json({ error: 'Text, type, and pillarTag are required' });
    }

    // Validate pillar tag format (allow any valid format, not just hardcoded list)
    const tagRegex = /^[A-Z_]+$/;
    if (!tagRegex.test(pillarTag.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid pillar tag format. Must be uppercase letters and underscores only.' });
    }

    // Validate question type
    const validTypes = ['SCALE', 'MULTIPLE_CHOICE', 'OPEN'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }

    // Get or create quiz template
    let quizTemplate = await prisma.quizTemplate.findUnique({
      where: { name: '10X Business Health Quiz' }
    });

    if (!quizTemplate) {
      quizTemplate = await prisma.quizTemplate.create({
        data: {
          name: '10X Business Health Quiz',
          description: 'Comprehensive assessment of your business across 8 key pillars'
        }
      });
    }

    // Get max order for this pillar if order not provided
    let questionOrder = order;
    if (questionOrder === undefined || questionOrder === null) {
      const maxOrder = await prisma.quizQuestion.findFirst({
        where: {
          quizId: quizTemplate.id,
          pillarTag: pillarTag
        },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      questionOrder = maxOrder ? maxOrder.order + 1 : 0;
    }

    // Create question
    const question = await prisma.quizQuestion.create({
      data: {
        quizId: quizTemplate.id,
        text,
        type,
        pillarTag,
        weight: weight || 1.0,
        order: questionOrder,
        options: options || null
      }
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Create quiz question error:', error);
    res.status(500).json({ error: 'Failed to create quiz question' });
  }
});

// =============================================
// PUT /api/admin/quiz/questions/:id
// Update a quiz question (admin only)
// =============================================
router.put('/manage-quiz-questions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const { text, type, pillarTag, weight, order, options } = req.body;

    // Check if question exists
    const existingQuestion = await prisma.quizQuestion.findUnique({
      where: { id: questionId }
    });

    if (!existingQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Validate pillar tag if provided - check format
    if (pillarTag) {
      const tagRegex = /^[A-Z_]+$/;
      if (!tagRegex.test(pillarTag.toUpperCase())) {
        return res.status(400).json({ error: 'Invalid pillar tag format. Must be uppercase letters and underscores only.' });
      }
    }

    // Validate question type if provided
    if (type) {
      const validTypes = ['SCALE', 'MULTIPLE_CHOICE', 'OPEN'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid question type' });
      }
    }

    // Update question
    const updatedQuestion = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...(text && { text }),
        ...(type && { type }),
        ...(pillarTag && { pillarTag }),
        ...(weight !== undefined && { weight }),
        ...(order !== undefined && { order }),
        ...(options !== undefined && { options })
      }
    });

    res.json(updatedQuestion);
  } catch (error) {
    console.error('Update quiz question error:', error);
    res.status(500).json({ error: 'Failed to update quiz question' });
  }
});

// =============================================
// DELETE /api/admin/quiz/questions/:id
// Delete a quiz question (admin only)
// =============================================
router.delete('/manage-quiz-questions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);

    // Check if question exists
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Delete question
    await prisma.quizQuestion.delete({
      where: { id: questionId }
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete quiz question error:', error);
    res.status(500).json({ error: 'Failed to delete quiz question' });
  }
});

// =============================================
// ADMIN ROUTES - Pillar Management
// =============================================

// =============================================
// GET /api/admin/pillars
// Get all pillars (admin only)
// =============================================
router.get('/manage-pillars', authenticate, requireAdmin, async (req, res) => {
  try {
    // Use raw SQL to avoid Prisma schema issues
    try {
      const pillars = await prisma.$queryRaw`
        SELECT id, tag, name, icon, color, description, active, "order"
        FROM pillars
        ORDER BY "order" ASC, name ASC
      `;
      
      if (Array.isArray(pillars)) {
        return res.json(pillars);
      }
      
      // Return default pillars if table doesn't exist
      return res.json([
        { id: 1, tag: 'STRATEGY', name: 'Strategy', icon: '🎯', color: '#3b82f6', description: 'Strategic planning and vision', active: true, order: 0 },
        { id: 2, tag: 'FINANCE', name: 'Finance', icon: '💰', color: '#10b981', description: 'Financial health and management', active: true, order: 1 },
        { id: 3, tag: 'MARKETING', name: 'Marketing', icon: '📢', color: '#f59e0b', description: 'Marketing effectiveness', active: true, order: 2 },
        { id: 4, tag: 'SALES', name: 'Sales', icon: '💼', color: '#ef4444', description: 'Sales processes and performance', active: true, order: 3 },
        { id: 5, tag: 'OPERATIONS', name: 'Operations', icon: '⚙️', color: '#8b5cf6', description: 'Operational efficiency', active: true, order: 4 },
        { id: 6, tag: 'CULTURE', name: 'Culture', icon: '👥', color: '#ec4899', description: 'Organizational culture', active: true, order: 5 },
        { id: 7, tag: 'CUSTOMER_CENTRICITY', name: 'Customer Experience', icon: '❤️', color: '#06b6d4', description: 'Customer satisfaction and experience', active: true, order: 6 },
        { id: 8, tag: 'EXIT_STRATEGY', name: 'Exit Strategy', icon: '🚀', color: '#6366f1', description: 'Exit planning and strategy', active: true, order: 7 }
      ]);
    } catch (sqlError) {
      console.warn('⚠️ Pillars table may not exist yet:', sqlError.message);
      // Return default pillars if table doesn't exist
      return res.json([
        { id: 1, tag: 'STRATEGY', name: 'Strategy', icon: '🎯', color: '#3b82f6', description: 'Strategic planning and vision', active: true, order: 0 },
        { id: 2, tag: 'FINANCE', name: 'Finance', icon: '💰', color: '#10b981', description: 'Financial health and management', active: true, order: 1 },
        { id: 3, tag: 'MARKETING', name: 'Marketing', icon: '📢', color: '#f59e0b', description: 'Marketing effectiveness', active: true, order: 2 },
        { id: 4, tag: 'SALES', name: 'Sales', icon: '💼', color: '#ef4444', description: 'Sales processes and performance', active: true, order: 3 },
        { id: 5, tag: 'OPERATIONS', name: 'Operations', icon: '⚙️', color: '#8b5cf6', description: 'Operational efficiency', active: true, order: 4 },
        { id: 6, tag: 'CULTURE', name: 'Culture', icon: '👥', color: '#ec4899', description: 'Organizational culture', active: true, order: 5 },
        { id: 7, tag: 'CUSTOMER_CENTRICITY', name: 'Customer Experience', icon: '❤️', color: '#06b6d4', description: 'Customer satisfaction and experience', active: true, order: 6 },
        { id: 8, tag: 'EXIT_STRATEGY', name: 'Exit Strategy', icon: '🚀', color: '#6366f1', description: 'Exit planning and strategy', active: true, order: 7 }
      ]);
    }
  } catch (error) {
    console.error('❌ Get pillars error:', error);
    res.status(500).json({ error: 'Failed to get pillars', details: error.message });
  }
});

// =============================================
// POST /api/admin/pillars
// Create a new pillar (admin only)
// =============================================
router.post('/manage-pillars', authenticate, requireAdmin, async (req, res) => {
  try {
    const { tag, name, icon, color, description, order } = req.body;

    if (!tag || !name) {
      return res.status(400).json({ error: 'Tag and name are required' });
    }

    // Validate tag format (uppercase, no spaces)
    const tagRegex = /^[A-Z_]+$/;
    if (!tagRegex.test(tag)) {
      return res.status(400).json({ error: 'Tag must be uppercase letters and underscores only (e.g., CUSTOM_PILLAR)' });
    }

    // Check if tag already exists
    const existing = await prisma.pillar.findUnique({
      where: { tag }
    });

    if (existing) {
      return res.status(400).json({ error: 'Pillar tag already exists' });
    }

    // Get max order if not provided
    let pillarOrder = order;
    if (pillarOrder === undefined || pillarOrder === null) {
      const maxOrder = await prisma.pillar.findFirst({
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      pillarOrder = maxOrder ? maxOrder.order + 1 : 0;
    }

    const pillar = await prisma.pillar.create({
      data: {
        tag: tag.toUpperCase(),
        name,
        icon: icon || '📋',
        color: color || '#6b7280',
        description,
        order: pillarOrder
      }
    });

    res.status(201).json(pillar);
  } catch (error) {
    console.error('Create pillar error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Pillar tag already exists' });
    }
    res.status(500).json({ error: 'Failed to create pillar' });
  }
});

// =============================================
// PUT /api/admin/pillars/:id
// Update a pillar (admin only)
// =============================================
router.put('/manage-pillars/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const pillarId = parseInt(req.params.id);
    const { name, icon, color, description, active, order } = req.body;

    // Check if pillar exists
    const existing = await prisma.pillar.findUnique({
      where: { id: pillarId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Pillar not found' });
    }

    const updatedPillar = await prisma.pillar.update({
      where: { id: pillarId },
      data: {
        ...(name && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active }),
        ...(order !== undefined && { order })
      }
    });

    res.json(updatedPillar);
  } catch (error) {
    console.error('Update pillar error:', error);
    res.status(500).json({ error: 'Failed to update pillar' });
  }
});

// =============================================
// DELETE /api/admin/pillars/:id
// Delete a pillar (admin only)
// =============================================
router.delete('/manage-pillars/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const pillarId = parseInt(req.params.id);

    // Check if pillar exists
    const pillar = await prisma.pillar.findUnique({
      where: { id: pillarId },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!pillar) {
      return res.status(404).json({ error: 'Pillar not found' });
    }

    // Check if pillar has questions
    if (pillar._count.questions > 0) {
      return res.status(400).json({ 
        error: `Cannot delete pillar. It has ${pillar._count.questions} question(s). Please delete or reassign questions first.` 
      });
    }

    await prisma.pillar.delete({
      where: { id: pillarId }
    });

    res.json({ message: 'Pillar deleted successfully' });
  } catch (error) {
    console.error('Delete pillar error:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete pillar. It is referenced by questions.' });
    }
    res.status(500).json({ error: 'Failed to delete pillar' });
  }
});

module.exports = router;


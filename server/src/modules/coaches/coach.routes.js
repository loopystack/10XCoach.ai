const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const { authenticate, requireAdmin, optionalAuth } = require('../../middleware/auth.middleware');

// Configure multer for file uploads
const coachesDir = path.join(__dirname, '../../../coaches');
if (!fs.existsSync(coachesDir)) {
  fs.mkdirSync(coachesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coachesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: coach-name-timestamp.extension
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);
    const coachName = req.body.coachName || 'coach';
    const sanitizedCoachName = coachName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    cb(null, `${sanitizedCoachName}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  }
});

// =============================================
// GET /api/coaches
// Get all active coaches (public)
// =============================================
router.get('/coaches', optionalAuth, async (req, res) => {
  try {
    const { active, role } = req.query;

    const where = {};
    
    // Non-admin users only see active coaches
    if (!req.user || req.user.role !== 'ADMIN') {
      where.active = true;
    } else if (active !== undefined) {
      where.active = active === 'true';
    }

    if (role) {
      where.role = role;
    }

    const coaches = await prisma.coach.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialty: true,
        description: true,
        tagline: true,
        avatar: true,
        active: true,
        personaJson: req.user?.role === 'ADMIN',
        voiceId: req.user?.role === 'ADMIN',
        model: req.user?.role === 'ADMIN',
        temperature: req.user?.role === 'ADMIN',
        maxTokens: req.user?.role === 'ADMIN',
        createdAt: true,
        _count: req.user?.role === 'ADMIN' ? {
          select: {
            primaryUsers: true,
            sessions: true
          }
        } : false
      },
      orderBy: { id: 'asc' }
    });

    res.json(coaches);
  } catch (error) {
    console.error('Get coaches error:', error);
    res.status(500).json({ error: 'Failed to get coaches' });
  }
});

// =============================================
// GET /api/coaches/:id
// Get coach by ID
// =============================================
router.get('/coaches/:id', optionalAuth, async (req, res) => {
  try {
    const coach = await prisma.coach.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialty: true,
        description: true,
        tagline: true,
        avatar: true,
        active: true,
        personaJson: req.user?.role === 'ADMIN',
        voiceId: req.user?.role === 'ADMIN',
        model: req.user?.role === 'ADMIN',
        temperature: req.user?.role === 'ADMIN',
        maxTokens: req.user?.role === 'ADMIN',
        createdAt: true
      }
    });

    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    // Non-admin can't view inactive coaches
    if (!coach.active && (!req.user || req.user.role !== 'ADMIN')) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    res.json(coach);
  } catch (error) {
    console.error('Get coach error:', error);
    res.status(500).json({ error: 'Failed to get coach' });
  }
});

// =============================================
// POST /api/coaches/upload-photo
// Upload coach photo (admin only)
// =============================================
router.post('/coaches/upload-photo', authenticate, requireAdmin, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the file path relative to the static directory
    const filePath = `/coaches/${req.file.filename}`;
    res.json({ 
      success: true, 
      filePath: filePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload photo' });
  }
});

// =============================================
// POST /api/coaches
// Create new coach (admin only)
// =============================================
router.post('/coaches', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      specialty,
      description,
      tagline,
      avatar,
      personaJson,
      voiceId,
      model,
      temperature,
      maxTokens,
      active
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const coach = await prisma.coach.create({
      data: {
        name,
        email,
        role: role || 'STRATEGY',
        specialty,
        description,
        tagline,
        avatar,
        personaJson,
        voiceId,
        model: model || 'gpt-4',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000,
        active: active !== false
      }
    });

    res.status(201).json(coach);
  } catch (error) {
    console.error('Create coach error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create coach' });
  }
});

// =============================================
// PUT /api/coaches/:id
// Update coach (admin only)
// =============================================
router.put('/coaches/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      specialty,
      description,
      tagline,
      avatar,
      personaJson,
      voiceId,
      model,
      temperature,
      maxTokens,
      active
    } = req.body;

    const coach = await prisma.coach.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(role && { role }),
        ...(specialty !== undefined && { specialty }),
        ...(description !== undefined && { description }),
        ...(tagline !== undefined && { tagline }),
        ...(avatar !== undefined && { avatar }),
        ...(personaJson !== undefined && { personaJson }),
        ...(voiceId !== undefined && { voiceId }),
        ...(model !== undefined && { model }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(active !== undefined && { active })
      }
    });

    res.json(coach);
  } catch (error) {
    console.error('Update coach error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

// =============================================
// DELETE /api/coaches/:id
// Delete coach (admin only)
// =============================================
router.delete('/coaches/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.coach.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Coach deleted successfully' });
  } catch (error) {
    console.error('Delete coach error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Coach not found' });
    }
    res.status(500).json({ error: 'Failed to delete coach' });
  }
});

// =============================================
// POST /api/coach/recommend
// Get coach recommendation based on quiz results
// =============================================
const coachRouting = require('./coachRouting');

router.post('/coach/recommend', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { quiz_result_id } = req.body; // Optional: specific quiz result ID

    // Get recommendation
    const recommendation = await coachRouting.recommendCoach(userId, quiz_result_id);

    // Save the primary coach assignment
    const assignment = await prisma.coachAssignment.create({
      data: {
        userId: userId,
        coachId: recommendation.primaryCoach.coachId,
        reason: recommendation.primaryCoach.reason,
        quizResultId: recommendation.quizResultId,
        priority: 'PRIMARY'
      }
    });

    // Save secondary coach assignments
    const secondaryAssignments = await Promise.all(
      recommendation.secondaryCoaches.map(sec => 
        prisma.coachAssignment.create({
          data: {
            userId: userId,
            coachId: sec.coachId,
            reason: sec.reason,
            quizResultId: recommendation.quizResultId,
            priority: 'SECONDARY'
          }
        })
      )
    );

    res.json({
      success: true,
      primaryCoach: recommendation.primaryCoach,
      secondaryCoaches: recommendation.secondaryCoaches,
      explanation: recommendation.explanation,
      assignmentId: assignment.id,
      quizResultId: recommendation.quizResultId
    });
  } catch (error) {
    console.error('Coach recommend error:', error);
    res.status(500).json({ 
      error: 'Failed to recommend coach',
      message: error.message 
    });
  }
});

// =============================================
// GET /api/coaches/:id/quiz-results
// Get quiz results for coach's users
// =============================================
router.get('/coaches/:id/quiz-results', authenticate, async (req, res) => {
  try {
    const coachId = parseInt(req.params.id);

    // Check if user is the coach or admin
    if (req.user.role !== 'ADMIN' && req.user.id !== coachId) {
      // Check if user is assigned to this coach
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { primaryCoachId: true }
      });
      
      if (user?.primaryCoachId !== coachId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const results = await prisma.quizResult.findMany({
      where: {
        coachId: coachId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            businessName: true
          }
        },
        quiz: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(results);
  } catch (error) {
    console.error('Get coach quiz results error:', error);
    res.status(500).json({ error: 'Failed to get quiz results' });
  }
});

module.exports = router;


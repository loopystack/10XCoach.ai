const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticate, requireAdmin } = require('../../middleware/auth.middleware');

// =============================================
// GET /api/sessions
// Get user's sessions or all sessions (admin)
// =============================================
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { coachId, status, limit } = req.query;

    const where = {};
    
    // Non-admin users can only see their own sessions
    if (req.user.role !== 'ADMIN') {
      where.userId = req.user.id;
    }

    if (coachId) where.coachId = parseInt(coachId);
    if (status) where.status = status;

    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        duration: true,
        status: true,
        summary: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        coach: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        },
        _count: {
          select: {
            actionSteps: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: limit ? parseInt(limit) : undefined
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// =============================================
// GET /api/sessions/:id
// Get session by ID
// =============================================
router.get('/sessions/:id', authenticate, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        coach: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        },
        actionSteps: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Non-admin can only view their own sessions
    if (req.user.role !== 'ADMIN' && session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// =============================================
// POST /api/sessions
// Create new session
// =============================================
router.post('/sessions', authenticate, async (req, res) => {
  try {
    const { coachId, startTime, endTime, duration, transcript, summary, status, userId } = req.body;

    if (!coachId) {
      return res.status(400).json({ error: 'Coach ID is required' });
    }

    // Use provided userId or authenticated user's id
    const finalUserId = userId || req.user.id;

    // Verify coach exists (don't check active status for saved sessions)
    const coach = await prisma.coach.findUnique({
      where: { id: parseInt(coachId) }
    });

    if (!coach) {
      return res.status(400).json({ error: 'Coach not found' });
    }

    // Handle duration - convert to number if string, round to 2 decimals
    let durationMinutes = duration;
    if (durationMinutes !== undefined && durationMinutes !== null) {
      if (typeof durationMinutes === 'string') {
        durationMinutes = parseFloat(durationMinutes);
      }
      if (typeof durationMinutes === 'number') {
        durationMinutes = Math.round(durationMinutes * 100) / 100; // Round to 2 decimals
      }
    }

    const session = await prisma.session.create({
      data: {
        userId: finalUserId,
        coachId: parseInt(coachId),
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : (status === 'COMPLETED' ? new Date() : null),
        duration: durationMinutes,
        transcriptRef: transcript && transcript !== '[]' && transcript !== 'null' && transcript.trim().length > 0 ? transcript : null,
        summary: summary || null,
        status: (status || 'SCHEDULED').toUpperCase()
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Session created:', {
      id: session.id,
      userId: session.userId,
      coachId: session.coachId,
      duration: session.duration,
      status: session.status,
      hasTranscript: !!session.transcriptRef
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message });
  }
});

// =============================================
// PUT /api/sessions/:id
// Update session
// =============================================
router.put('/sessions/:id', authenticate, async (req, res) => {
  try {
    const { status, endTime, duration, summary, transcriptRef, notesRef } = req.body;

    // Verify ownership or admin
    const existing = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.user.role !== 'ADMIN' && existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prisma schema: duration is Int minutes. Coerce strings/floats safely.
    let durationMinutes = duration;
    if (durationMinutes !== undefined && durationMinutes !== null) {
      if (typeof durationMinutes === 'string') {
        const parsed = parseFloat(durationMinutes);
        durationMinutes = Number.isFinite(parsed) ? parsed : undefined;
      }
      if (typeof durationMinutes === 'number') {
        // Round to nearest minute, minimum 1 if provided
        durationMinutes = Math.max(1, Math.round(durationMinutes));
      }
    }

    const session = await prisma.session.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(status && { status }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(durationMinutes !== undefined && { duration: durationMinutes }),
        ...(summary !== undefined && { summary }),
        ...(transcriptRef !== undefined && { transcriptRef }),
        ...(notesRef !== undefined && { notesRef })
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Update user's lastSession
    await prisma.user.update({
      where: { id: existing.userId },
      data: { lastSession: new Date() }
    });

    res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// =============================================
// DELETE /api/sessions/:id
// Delete session (admin only)
// =============================================
router.delete('/sessions/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.session.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// =============================================
// ACTION STEPS ROUTES
// =============================================

// GET /api/action-steps
router.get('/action-steps', authenticate, async (req, res) => {
  try {
    const { status, sessionId } = req.query;

    const where = {};
    
    if (req.user.role !== 'ADMIN') {
      where.userId = req.user.id;
    }

    if (status) where.status = status;
    if (sessionId) where.sessionId = parseInt(sessionId);

    const actionSteps = await prisma.actionStep.findMany({
      where,
      include: {
        session: {
          select: {
            id: true,
            startTime: true,
            coach: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' }
      ]
    });

    res.json(actionSteps);
  } catch (error) {
    console.error('Get action steps error:', error);
    res.status(500).json({ error: 'Failed to get action steps' });
  }
});

// POST /api/action-steps
router.post('/action-steps', authenticate, async (req, res) => {
  try {
    const { sessionId, description, dueDate, priority } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const actionStep = await prisma.actionStep.create({
      data: {
        userId: req.user.id,
        sessionId: sessionId ? parseInt(sessionId) : null,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        status: 'PENDING'
      }
    });

    res.status(201).json(actionStep);
  } catch (error) {
    console.error('Create action step error:', error);
    res.status(500).json({ error: 'Failed to create action step' });
  }
});

// PUT /api/action-steps/:id
router.put('/action-steps/:id', authenticate, async (req, res) => {
  try {
    const { description, dueDate, status, priority } = req.body;

    // Verify ownership
    const existing = await prisma.actionStep.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Action step not found' });
    }

    if (req.user.role !== 'ADMIN' && existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const actionStep = await prisma.actionStep.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    });

    res.json(actionStep);
  } catch (error) {
    console.error('Update action step error:', error);
    res.status(500).json({ error: 'Failed to update action step' });
  }
});

// DELETE /api/action-steps/:id
router.delete('/action-steps/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.actionStep.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Action step not found' });
    }

    if (req.user.role !== 'ADMIN' && existing.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.actionStep.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Action step deleted successfully' });
  } catch (error) {
    console.error('Delete action step error:', error);
    res.status(500).json({ error: 'Failed to delete action step' });
  }
});

module.exports = router;


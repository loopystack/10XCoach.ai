/**
 * Legacy API Routes
 * These routes maintain backwards compatibility with the existing frontend
 * while we migrate to the new Prisma-based system
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticate, optionalAuth } = require('../../middleware/auth.middleware');
const { requireAccess } = require('../../middleware/access.middleware');

// =============================================
// QUIZZES ENDPOINTS (Legacy)
// =============================================
router.get('/quizzes', authenticate, async (req, res) => {
  try {
    const { coachId } = req.query;
    
    const where = {};
    
    // CRITICAL: Filter by userId for non-admin users to prevent data leakage
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COACH_ADMIN') {
      where.userId = req.user.id;
    }
    
    if (coachId) where.coachId = parseInt(coachId);

    // Fetch from QuizResult (new system) instead of Quiz (old system)
    let quizResults = [];
    try {
      quizResults = await prisma.quizResult.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          coach: { select: { id: true, name: true } },
          quiz: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching quiz results:', error.message);
      if (error.code === 'P1001' || error.message.includes('Authentication')) {
        return res.status(500).json({ 
          error: 'Database connection failed. Please check your PostgreSQL credentials in server/.env' 
        });
      }
      return res.status(500).json({ error: 'Failed to fetch quizzes' });
    }

    // Transform to legacy format expected by dashboard
    res.json(quizResults.map(qr => ({
      id: qr.id,
      userId: qr.userId,
      userName: qr.user?.name,
      coachId: qr.coachId,
      coachName: qr.coach?.name,
      score: Math.round(qr.totalScore),
      date: qr.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
      quiz_date: qr.createdAt.toISOString().split('T')[0],
      completed: true,
      totalScore: qr.totalScore,
      createdAt: qr.createdAt
    })));
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

router.get('/quizzes/stats', authenticate, async (req, res) => {
  try {
    // Build where clause - filter by userId for non-admin users
    const where = {};
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COACH_ADMIN') {
      where.userId = req.user.id;
    }
    
    // Get stats from QuizResult table (new quiz system)
    const total = await prisma.quizResult.count({ where });
    
    const avgScore = await prisma.quizResult.aggregate({
      where,
      _avg: { totalScore: true }
    });
    
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonth = await prisma.quizResult.count({
      where: {
        ...where,
        createdAt: {
          gte: startOfMonth
        }
      }
    });

    res.json({
      total,
      averageScore: Math.round(avgScore._avg.totalScore || 0),
      thisMonth
    });
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    res.status(500).json({ error: 'Failed to fetch quiz stats' });
  }
});

router.post('/quizzes', async (req, res) => {
  try {
    const { user_id, coach_id, score, completed } = req.body;
    
    const quiz = await prisma.quiz.create({
      data: {
        userId: parseInt(user_id),
        coachId: parseInt(coach_id),
        score: parseInt(score),
        completed: completed || false
      }
    });

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// =============================================
// HUDDLES ENDPOINTS (Legacy)
// =============================================
router.get('/huddles', authenticate, async (req, res) => {
  try {
    const { coachId } = req.query;
    
    const where = {};
    
    // CRITICAL: Filter by userId for non-admin users to prevent data leakage
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COACH_ADMIN') {
      where.userId = req.user.id;
    }
    
    if (coachId) where.coachId = parseInt(coachId);

    let huddles = [];
    try {
      huddles = await prisma.huddle.findMany({
        where,
        include: {
          coach: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } }
        },
        orderBy: { huddleDate: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching huddles:', error.message);
      if (error.code === 'P1001' || error.message.includes('Authentication')) {
        return res.status(500).json({ 
          error: 'Database connection failed. Please check your PostgreSQL credentials in server/.env' 
        });
      }
      return res.status(500).json({ error: 'Failed to fetch huddles' });
    }

    // Transform to legacy format
    res.json(huddles.map(h => ({
      ...h,
      coach_name: h.coach?.name,
      huddle_date: h.huddleDate,
      has_short_agenda: h.hasShortAgenda,
      has_notetaker: h.hasNotetaker,
      has_action_steps: h.hasActionSteps
    })));
  } catch (error) {
    console.error('Error fetching huddles:', error);
    res.status(500).json({ error: 'Failed to fetch huddles' });
  }
});

router.get('/huddles/stats', async (req, res) => {
  try {
    const total = await prisma.huddle.count();
    
    const compliant = await prisma.huddle.count({
      where: {
        hasShortAgenda: true,
        hasNotetaker: true,
        hasActionSteps: true
      }
    });

    res.json({
      total,
      compliant,
      non_compliant: total - compliant
    });
  } catch (error) {
    console.error('Error fetching huddle stats:', error);
    res.status(500).json({ error: 'Failed to fetch huddle stats' });
  }
});

router.post('/huddles', authenticate, requireAccess, async (req, res) => {
  try {
    const { title, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, status, huddle_date } = req.body;
    
    // Convert status to uppercase enum value for Prisma
    let statusValue = (status || 'scheduled').toUpperCase();
    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(statusValue)) {
      statusValue = 'SCHEDULED';
    }
    
    // Handle huddle_date - Prisma expects DateTime
    let huddleDate;
    if (huddle_date) {
      // If it's just a date string (YYYY-MM-DD), convert to DateTime
      if (huddle_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        huddleDate = new Date(huddle_date + 'T00:00:00');
      } else {
        huddleDate = new Date(huddle_date);
      }
    } else {
      huddleDate = new Date();
    }
    
    const huddle = await prisma.huddle.create({
      data: {
        title,
        huddleDate,
        coachId: parseInt(coach_id),
        userId: parseInt(user_id),
        hasShortAgenda: has_short_agenda || false,
        hasNotetaker: has_notetaker || false,
        hasActionSteps: has_action_steps || false,
        status: statusValue
      }
    });

    res.status(201).json(huddle);
  } catch (error) {
    console.error('Error creating huddle:', error);
    res.status(500).json({ error: 'Failed to create huddle', details: error.message });
  }
});

router.put('/huddles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, coach_id, user_id, has_short_agenda, has_notetaker, has_action_steps, status, huddle_date } = req.body;
    
    // Convert status to uppercase enum value for Prisma
    let statusValue = (status || 'scheduled').toUpperCase();
    if (!['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(statusValue)) {
      statusValue = 'SCHEDULED';
    }
    
    // Handle huddle_date - Prisma expects DateTime
    let huddleDate;
    if (huddle_date) {
      // If it's just a date string (YYYY-MM-DD), convert to DateTime
      if (huddle_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        huddleDate = new Date(huddle_date + 'T00:00:00');
      } else {
        huddleDate = new Date(huddle_date);
      }
    } else {
      huddleDate = new Date();
    }
    
    const huddle = await prisma.huddle.update({
      where: { id: parseInt(id) },
      data: {
        title,
        huddleDate,
        coachId: parseInt(coach_id),
        userId: parseInt(user_id),
        hasShortAgenda: has_short_agenda || false,
        hasNotetaker: has_notetaker || false,
        hasActionSteps: has_action_steps || false,
        status: statusValue
      }
    });

    res.json(huddle);
  } catch (error) {
    console.error('Error updating huddle:', error);
    res.status(500).json({ error: 'Failed to update huddle', details: error.message });
  }
});

router.delete('/huddles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.huddle.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Huddle deleted successfully' });
  } catch (error) {
    console.error('Error deleting huddle:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Huddle not found' });
    }
    res.status(500).json({ error: 'Failed to delete huddle', details: error.message });
  }
});

// =============================================
// NOTES ENDPOINTS (Legacy)
// =============================================
router.get('/notes', authenticate, async (req, res) => {
  try {
    const { coachId } = req.query;
    
    const where = {};
    
    // CRITICAL: Filter by userId for non-admin users to prevent data leakage
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COACH_ADMIN') {
      where.userId = req.user.id;
    }
    
    if (coachId) where.coachId = parseInt(coachId);

    const notes = await prisma.note.findMany({
      where,
      include: {
        coach: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { sessionDate: 'desc' }
    });

    // Transform to legacy format
    res.json(notes.map(n => ({
      ...n,
      coach_name: n.coach?.name,
      client_name: n.user?.name,
      session_date: n.sessionDate
    })));
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.post('/notes', authenticate, requireAccess, async (req, res) => {
  try {
    const { coach_id, user_id, content, sent, session_date } = req.body;
    
    const note = await prisma.note.create({
      data: {
        coachId: parseInt(coach_id),
        userId: parseInt(user_id),
        content,
        sent: sent || false,
        sessionDate: session_date ? new Date(session_date) : new Date()
      },
      include: {
        coach: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      }
    });

    // Transform to legacy format
    res.status(201).json({
      ...note,
      coach_name: note.coach?.name,
      client_name: note.user?.name,
      session_date: note.sessionDate
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { coach_id, user_id, content, sent, session_date } = req.body;
    
    const updateData = {};
    if (coach_id !== undefined) updateData.coachId = parseInt(coach_id);
    if (user_id !== undefined) updateData.userId = parseInt(user_id);
    if (content !== undefined) updateData.content = content;
    if (sent !== undefined) updateData.sent = sent;
    if (session_date !== undefined) updateData.sessionDate = new Date(session_date);
    
    const note = await prisma.note.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        coach: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      }
    });

    // Transform to legacy format
    res.json({
      ...note,
      coach_name: note.coach?.name,
      client_name: note.user?.name,
      session_date: note.sessionDate
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Note not found' });
    }
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /api/notes/:id] Attempting to delete note with id: ${id}`);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid note ID' });
    }
    
    const note = await prisma.note.delete({
      where: { id: parseInt(id) },
      include: {
        coach: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      }
    });
    
    console.log(`[DELETE /api/notes/:id] Successfully deleted note with id: ${id}`);
    
    // Transform to legacy format
    res.json({ 
      message: 'Note deleted successfully',
      note: {
        ...note,
        coach_name: note.coach?.name,
        client_name: note.user?.name,
        session_date: note.sessionDate
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      console.log(`[DELETE /api/notes/:id] Note with id ${req.params.id} not found`);
      return res.status(404).json({ error: 'Note not found' });
    }
    console.error('[DELETE /api/notes/:id] Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note', details: error.message });
  }
});

// =============================================
// TODOS ENDPOINTS (Legacy)
// =============================================
router.get('/todos', authenticate, async (req, res) => {
  try {
    // Build where clause - filter by userId for non-admin users
    const where = {};
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COACH_ADMIN') {
      where.userId = req.user.id;
    }
    
    let todos = [];
    try {
      todos = await prisma.todo.findMany({
        where,
        orderBy: { dueDate: 'asc' }
      });
    } catch (error) {
      console.error('Error fetching todos:', error.message);
      if (error.code === 'P1001' || error.message.includes('Authentication')) {
        return res.status(500).json({ 
          error: 'Database connection failed. Please check your PostgreSQL credentials in server/.env' 
        });
      }
      return res.status(500).json({ error: 'Failed to fetch todos' });
    }

    // Transform to legacy format
    res.json(todos.map(t => ({
      ...t,
      user_id: t.userId,
      assigned_to: t.assignedTo,
      due_date: t.dueDate,
      created_at: t.createdAt,
      updated_at: t.updatedAt
    })));
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.post('/todos', authenticate, requireAccess, async (req, res) => {
  try {
    const { title, description, user_id, assigned_to, due_date, status, priority } = req.body;
    
    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        userId: parseInt(user_id),
        assignedTo: assigned_to,
        dueDate: due_date ? new Date(due_date) : null,
        status: status || 'PENDING',
        priority: priority?.toUpperCase() || 'MEDIUM'
      }
    });

    res.status(201).json(todo);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

router.put('/todos/:id', async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, status, priority } = req.body;
    
    const todo = await prisma.todo.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(assigned_to !== undefined && { assignedTo: assigned_to }),
        ...(due_date !== undefined && { dueDate: due_date ? new Date(due_date) : null }),
        ...(status && { status: status.toUpperCase() }),
        ...(priority && { priority: priority.toUpperCase() })
      }
    });

    res.json(todo);
  } catch (error) {
    console.error('Error updating todo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

router.delete('/todos/:id', async (req, res) => {
  try {
    await prisma.todo.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// =============================================
// DASHBOARD STATS ENDPOINT (Legacy)
// =============================================
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const { coachId } = req.query;
    
    // Build where clauses for filtering by coach AND user
    const quizWhere = {};
    const huddleWhere = {};
    const noteWhere = {};
    const todoWhere = {};
    
    // CRITICAL: Filter by userId for non-admin users to prevent data leakage
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'COACH_ADMIN') {
      quizWhere.userId = req.user.id;
      huddleWhere.userId = req.user.id;
      noteWhere.userId = req.user.id;
      todoWhere.userId = req.user.id;
    }
    
    if (coachId) {
      const coachIdNum = parseInt(coachId);
      quizWhere.coachId = coachIdNum;
      huddleWhere.coachId = coachIdNum;
      noteWhere.coachId = coachIdNum;
      // For todos, we need to check if they're related to sessions with this coach
      // For now, we'll get all todos (can be refined later)
    }

    let quizCount = 0, huddleCount = 0, noteCount = 0, todoStats = [];
    let todoByStatus = { pending: 0, completed: 0, in_progress: 0 };

    try {
      [quizCount, huddleCount, noteCount, todoStats] = await Promise.all([
        prisma.quizResult.count({ where: quizWhere }).catch(() => 0),
        prisma.huddle.count({ where: huddleWhere }).catch(() => 0),
        prisma.note.count({ where: noteWhere }).catch(() => 0),
        prisma.todo.groupBy({
          by: ['status'],
          _count: { id: true },
          where: todoWhere
        }).catch(() => [])
      ]);

      todoByStatus = todoStats.reduce((acc, item) => {
        acc[item.status.toLowerCase()] = item._count.id;
        return acc;
      }, { pending: 0, completed: 0, in_progress: 0 });
    } catch (error) {
      console.error('Database query error (non-critical):', error.message);
      // Return zeros instead of failing - allows server to start
    }

    res.json({
      total_quizzes: quizCount,
      total_huddles: huddleCount,
      total_notes: noteCount,
      total_todos: Object.values(todoByStatus).reduce((a, b) => a + b, 0),
      completed_todos: todoByStatus.completed || 0,
      pending_todos: todoByStatus.pending || 0
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;


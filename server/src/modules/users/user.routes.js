const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticate, requireAdmin } = require('../../middleware/auth.middleware');

// =============================================
// GET /api/me
// Alias for /api/auth/me - Get current user
// =============================================
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        businessName: true,
        industry: true,
        lastLogin: true,
        lastSession: true,
        createdAt: true,
        primaryCoach: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        }
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// =============================================
// GET /api/users/admins
// Get all admin users (no auth required - for notes page dropdown)
// =============================================
router.get('/users/admins', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`✅ Found ${users.length} admin users:`, users.map(u => u.name));
    res.json(users);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to get admin users' });
  }
});

// =============================================
// GET /api/users
// Get all users (admin only)
// =============================================
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const { plan, status, search } = req.query;

    const where = {};
    if (plan) where.plan = plan;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        businessName: true,
        industry: true,
        lastLogin: true,
        lastSession: true,
        createdAt: true,
        primaryCoach: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// =============================================
// GET /api/users/:id
// Get user by ID (admin only)
// =============================================
router.get('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        businessName: true,
        industry: true,
        lastLogin: true,
        lastSession: true,
        createdAt: true,
        primaryCoach: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true
          }
        },
        _count: {
          select: {
            sessions: true,
            quizzes: true,
            huddles: true,
            actionSteps: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// =============================================
// PUT /api/users/:id
// Update user (admin only)
// =============================================
router.put('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, plan, status, businessName, industry, primaryCoachId } = req.body;
    const userId = parseInt(req.params.id);

    // Check if trying to update Daniel Rosario's role
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (existingUser && existingUser.email?.toLowerCase() === 'danrosario0604@gmail.com' && role) {
      return res.status(400).json({ error: 'Cannot change role for Daniel Rosario. This user always has admin access.' });
    }

    // Validate role if provided
    if (role && !['USER', 'ADMIN'].includes(role.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid role. Must be USER or ADMIN.' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role.toUpperCase();
    if (plan) updateData.plan = plan;
    if (status) updateData.status = status;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (industry !== undefined) updateData.industry = industry;
    if (primaryCoachId !== undefined) updateData.primaryCoachId = primaryCoachId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        status: true,
        businessName: true,
        industry: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// =============================================
// DELETE /api/users/:id
// Delete user (admin only)
// =============================================
router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;

